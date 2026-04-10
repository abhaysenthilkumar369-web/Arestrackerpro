import { saveUserToFirebase } from './firebase.js';

// --- Haversine Formula for Distance Calculation ---
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
    const r = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    
    const phi1 = lat1 * Math.PI / 180;
    const phi2 = lat2 * Math.PI / 180;

    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(phi1) * Math.cos(phi2) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.asin(Math.sqrt(a));
    return r * c;
}

// --- Matrix Rain Effect ---
function setupMatrixRain() {
    const canvas = document.getElementById('matrixCanvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()_+';
    const fontSize = 14;
    const columns = canvas.width / fontSize;
    const drops = Array.from({length: columns}).fill(1);

    function draw() {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#11AA11'; // Dimmer matrix text
        ctx.font = fontSize + 'px Courier New';

        for (let i = 0; i < drops.length; i++) {
            const text = characters.charAt(Math.floor(Math.random() * characters.length));
            ctx.fillText(text, i * fontSize, drops[i] * fontSize);
            
            if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                drops[i] = 0;
            }
            drops[i]++;
        }
    }
    
    setInterval(draw, 33);

    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
}

// --- Core Application State & Logic ---
let map = null;
let issMarker = null;
let userMarker = null;

let userLat = null;
let userLon = null;

let fetchInterval = null;
let passTracking = false;
let alertTriggered = false;

// Countdown State
let nextPassTimestamp = null;
let countdownMode = 'NONE'; // 'API', 'LOCAL', 'NONE'
let passFetchStarted = false;
let distances = [];

// DOM Elements
const elIssLat = document.getElementById('iss-lat');
const elIssLon = document.getElementById('iss-lon');
const elDistance = document.getElementById('iss-distance');
const elPassStatus = document.getElementById('pass-status');
const elPassCountdown = document.getElementById('pass-countdown');
const systemFeed = document.getElementById('status-feed');
const alertAudio = document.getElementById('proximity-alert');

function logSystem(msg) {
    const p = document.createElement('p');
    p.innerText = `> ${msg}`;
    systemFeed.appendChild(p);
    systemFeed.scrollTop = systemFeed.scrollHeight;
}

function initMap() {
    if (!map) {
        logSystem("Initializing interactive map...");
        map = L.map('map', {
            // Map configuration for better mobile interactivity
            tap: true,
            dragging: true,
        }).setView([0, 0], 2);
        
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap contributors',
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(map);

        logSystem("Map initialized correctly.");
    }
}

async function fetchAccuratePassPrediction(lat, lon) {
    if (passFetchStarted) return;
    passFetchStarted = true;
    try {
        logSystem("Syncing with Celestrak/NASA TLE data...");
        const response = await fetch('http://localhost:5000/api/predict_pass', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lat, lon })
        });
        const data = await response.json();
        
        if (data.timestamp) {
            nextPassTimestamp = data.timestamp;
            countdownMode = 'API';
            elPassStatus.innerText = "LOCKED (API)";
            elPassStatus.style.color = "var(--text-main)";
            logSystem(`Pass Locked: ${new Date(data.timestamp * 1000).toLocaleString()}`);
        } else {
            logSystem("No visible TLE passes. Falling back to local radar prediction.");
            if (countdownMode !== 'LOCAL') countdownMode = 'NONE';
        }
    } catch (error) {
        logSystem("Backend offline. Using local radar prediction.");
        if (countdownMode !== 'LOCAL') countdownMode = 'NONE';
        passFetchStarted = false;
    }
}

function startCountdown() {
    setInterval(() => {
        if (countdownMode === 'NONE' || !nextPassTimestamp) {
            if (countdownMode === 'NONE') {
                elPassCountdown.innerText = "--:--:--";
                elPassStatus.innerText = "SEARCHING...";
                elPassStatus.style.color = "var(--text-dim)";
            }
            return;
        }

        const now = Date.now() / 1000;
        let diff = nextPassTimestamp - now;
        
        if (diff <= 0) {
            elPassCountdown.innerText = "PASSING NEARBY";
            if(diff > -600) { // Keep overhead for 10 minutes approx
                elPassStatus.innerText = "ACTIVE PASS";
                elPassStatus.style.color = "var(--text-glow)";
            } else {
                // Time has passed, reset state
                nextPassTimestamp = null;
                countdownMode = 'NONE';
                passFetchStarted = false;
                if (userLat) fetchAccuratePassPrediction(userLat, userLon);
            }
        } else {
            const h = Math.floor(diff / 3600);
            diff %= 3600;
            const m = Math.floor(diff / 60);
            const s = Math.floor(diff % 60);
            elPassCountdown.innerText = `T-${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
        }
    }, 1000);
}

function getUserLocation() {
    logSystem("Requesting User Geolocation...");
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                userLat = position.coords.latitude;
                userLon = position.coords.longitude;
                logSystem(`Location Locked: LAT ${userLat.toFixed(4)}, LON ${userLon.toFixed(4)}`);
                
                const icon = L.divIcon({className: 'user-marker-icon', iconSize: [15, 15], iconAnchor: [7.5, 7.5]});
                if (userMarker) {
                    userMarker.setLatLng([userLat, userLon]);
                } else {
                    userMarker = L.marker([userLat, userLon], {icon}).addTo(map);
                }
                
                saveUserToFirebase(userLat, userLon);

                // Fetch accurate TLE data countdown
                fetchAccuratePassPrediction(userLat, userLon);
            },
            (error) => {
                logSystem(`Geolocation Error: ${error.message}`);
            }
        );
    } else {
        logSystem("Geolocation is not supported by this browser.");
    }
}

function updateISSPosition(lat, lon) {
    elIssLat.innerText = lat.toFixed(4);
    elIssLon.innerText = lon.toFixed(4);

    const icon = L.divIcon({className: 'iss-marker-icon', iconSize: [20, 20], iconAnchor: [10, 10]});
    if (issMarker) {
        issMarker.setLatLng([lat, lon]);
    } else {
        issMarker = L.marker([lat, lon], {icon}).addTo(map);
    }
}

function handleProximityWarning(distance) {
    if (distance < 2000) {
        if (!passTracking) {
            passTracking = true;
            logSystem("WARNING: ISS entering 2000km range.");
        }
    } else {
        if (passTracking) {
            passTracking = false;
            logSystem("ISS exiting 2000km range.");
        }
    }
}

function triggerAlert() {
    if (!alertTriggered) {
        alertTriggered = true;
        logSystem("CRITICAL ALERT: ISS PROXIMITY < 800km");
        document.querySelector('.terminal-overlay').style.boxShadow = "0 0 30px red";
        document.querySelector('.terminal-overlay').style.borderColor = "red";
        
        alertAudio.play().catch(e => console.log("Audio play blocked by browser:", e));
        
        elDistance.style.color = "red";
        elDistance.style.fontWeight = "bold";

        setTimeout(() => {
            alertTriggered = false;
            document.querySelector('.terminal-overlay').style.boxShadow = "none";
            document.querySelector('.terminal-overlay').style.borderColor = "var(--border-color)";
            elDistance.style.color = "var(--text-main)";
            elDistance.style.fontWeight = "normal";
        }, 15000); 
    }
}

async function fetchISSData() {
    try {
        const response = await fetch('http://api.open-notify.org/iss-now.json');
        const data = await response.json();
        
        if (data.message === "success") {
            const lat = parseFloat(data.iss_position.latitude);
            const lon = parseFloat(data.iss_position.longitude);
            
            updateISSPosition(lat, lon);
            
            if (userLat !== null && userLon !== null) {
                const distance = calculateHaversineDistance(userLat, userLon, lat, lon);
                elDistance.innerText = `${distance.toFixed(2)} km`;
                handleProximityWarning(distance);

                // LOCAL COUNTDOWN PREDICTION FALLBACK
                distances.push(distance);
                if (distances.length > 5) distances.shift();

                // If API hasn't locked a time, we approximate based on speed
                if (countdownMode !== 'API' && distances.length >= 2) {
                    const currentDistance = distances[distances.length - 1];
                    const prevDistance = distances[distances.length - 2];
                    const rate = currentDistance - prevDistance; // km change per 5s
                    
                    // If moving closer
                    if (rate < 0) {
                        const secondsToPeak = Math.abs(currentDistance / (rate / 5));
                        // Sanity check: don't predict passes more than a few days out from simplistic math
                        if (secondsToPeak < 100000) { 
                            nextPassTimestamp = (Date.now() / 1000) + secondsToPeak;
                            countdownMode = 'LOCAL';
                            elPassStatus.innerText = "ESTIMATING (LOCAL RADAR)";
                            elPassStatus.style.color = "#FFD700"; // Yellow warning
                        }
                    } else if (countdownMode === 'LOCAL' && rate > 0) {
                        // Moving away
                        countdownMode = 'NONE';
                    }
                }

                if (distance < 800) {
                    triggerAlert();
                }
            }
        }
    } catch (error) {
        console.error("Error fetching ISS location:", error);
    }
}

// Initialization Sequence
document.addEventListener('DOMContentLoaded', () => {
    setupMatrixRain();
    initMap();
    getUserLocation();
    
    // Start empty countdown loop
    startCountdown();

    fetchISSData();
    if (fetchInterval) clearInterval(fetchInterval);
    fetchInterval = setInterval(fetchISSData, 5000);
});
