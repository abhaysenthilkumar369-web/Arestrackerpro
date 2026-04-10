const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

/*
========================================
ARES TRACKER PRO API
========================================
Endpoints:
1. GET /api/tracker
   -> Basic API welcome message

2. GET /api/tracker/iss
   -> Fetch live ISS location

3. GET /api/tracker/satellite
   -> Return sample satellite data

4. GET /api/tracker/health
   -> Check whether API is running
========================================
*/

// Home route
app.get("/api/tracker", (req, res) => {
    res.json({
        success: true,
        message: "Welcome to Ares Tracker Pro API 🚀",
        endpoints: {
            home: "/api/tracker",
            iss: "/api/tracker/iss",
            satellite: "/api/tracker/satellite",
            health: "/api/tracker/health"
        }
    });
});

// Health check route
app.get("/api/tracker/health", (req, res) => {
    res.json({
        success: true,
        message: "API is running successfully",
        time: new Date()
    });
});

// Live ISS location route
app.get("/api/tracker/iss", async (req, res) => {
    try {
        const response = await axios.get("http://api.open-notify.org/iss-now.json");

        const data = response.data;

        res.json({
            success: true,
            source: "Open Notify ISS API",
            timestamp: data.timestamp,
            iss_position: {
                latitude: data.iss_position.latitude,
                longitude: data.iss_position.longitude
            },
            message: "Live ISS location fetched successfully"
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch ISS location",
            error: error.message
        });
    }
});

// Sample satellite data route
app.get("/api/tracker/satellite", (req, res) => {
    const satelliteData = {
        success: true,
        data: {
            name: "ARES-X",
            type: "Research Satellite",
            altitude: "420 km",
            velocity: "7.66 km/s",
            orbit: "Low Earth Orbit",
            status: "Active",
            visibility: "Visible",
            latitude: "12.9716 N",
            longitude: "77.5946 E",
            timestamp: new Date()
        }
    };

    res.json(satelliteData);
});

// 404 route
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Route not found"
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Ares Tracker Pro API is running on http://localhost:${PORT}`);
});
