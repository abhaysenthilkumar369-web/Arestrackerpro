// ===============================
// 🚀 ARES TRACKER PRO - FULL API
// ===============================

// Import required modules
const express = require("express");
const axios = require("axios");
const cors = require("cors");

// Initialize app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// ===============================
// 🌍 ROUTE 1: Get ISS Live Location
// ===============================
app.get("/api/tracker/iss", async (req, res) => {
    try {
        const response = await axios.get(
            "http://api.open-notify.org/iss-now.json"
        );

        const data = response.data;

        res.json({
            success: true,
            message: "ISS Live Location Fetched Successfully 🚀",
            timestamp: data.timestamp,
            latitude: data.iss_position.latitude,
            longitude: data.iss_position.longitude
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch ISS data ❌"
        });
    }
});

// ===============================
// 🛰️ ROUTE 2: Satellite Info (Custom)
// ===============================
app.get("/api/tracker/satellite", (req, res) => {
    try {
        const satellite = {
            name: "ARES-X",
            altitude: "420 km",
            velocity: "7.66 km/s",
            visibility: "Visible",
            latitude: "Randomized",
            longitude: "Randomized",
            timestamp: new Date()
        };

        res.json({
            success: true,
            message: "Satellite Data Retrieved 🛰️",
            data: satellite
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Satellite data error ❌"
        });
    }
});

// ===============================
// 📊 ROUTE 3: Tracking History (Mock)
// ===============================
app.get("/api/tracker/history", (req, res) => {
    try {
        const history = [
            { lat: 10.2, lon: 76.3, time: "10:00 AM" },
            { lat: 12.5, lon: 80.1, time: "10:05 AM" },
            { lat: 15.7, lon: 82.2, time: "10:10 AM" }
        ];

        res.json({
            success: true,
            message: "Tracking History 📊",
            data: history
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching history ❌"
        });
    }
});

// ===============================
// 🧠 ROUTE 4: Health Check
// ===============================
app.get("/", (req, res) => {
    res.send("🚀 Ares Tracker Pro API is running...");
});

// ===============================
// 🔥 SERVER START
// ===============================
const PORT = 5000;

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
