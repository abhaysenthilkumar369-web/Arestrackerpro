from flask import Flask, jsonify, request
from flask_cors import CORS
from skyfield.api import Topos, load

app = Flask(__name__)
# Enable CORS for frontend to communicate with backend
CORS(app)

# Load Skyfield timescale once to avoid overhead
ts = load.timescale()
stations_url = 'https://celestrak.org/NORAD/elements/stations.txt'

@app.route('/health', methods=['GET'])
def health_check():
    """Simple health check endpoint to verify backend is running."""
    return jsonify({
        "status": "healthy",
        "service": "Ares Tracker Pro Backend",
        "version": "1.0"
    }), 200

@app.route('/api/predict_pass', methods=['POST'])
def predict_pass():
    """
    Returns the next overhead pass for the given lat/lon using
    actual orbital mechanics based on NASA/Celestrak TLE data.
    """
    try:
        data = request.get_json()
        user_lat = float(data.get('lat'))
        user_lon = float(data.get('lon'))
        
        satellites = load.tle_file(stations_url)
        by_name = {sat.name: sat for sat in satellites}
        iss = by_name.get('ISS (ZARYA)')
        
        if not iss:
            return jsonify({"error": "ISS TLE data unavailable"}), 500

        user_topos = Topos(latitude_degrees=user_lat, longitude_degrees=user_lon)
        t0 = ts.now()
        t1 = ts.utc(t0.utc.year, t0.utc.month, t0.utc.day + 2) # Check next 2 days
        
        # Find passes over the topology (at least 10 degrees above horizon)
        t, events = iss.find_events(user_topos, t0, t1, altitude_degrees=10.0)
        
        # events: 0 = rise, 1 = culminate (peak), 2 = set
        for ti, event in zip(t, events):
            if event == 1: # We care about the culmination (peak altitude)
                peak_time = ti.utc_datetime()
                return jsonify({
                    "peak_time": peak_time.isoformat(),
                    "timestamp": peak_time.timestamp()
                }), 200
                
        return jsonify({"message": "No passes found in the next 48 hours.", "timestamp": 0}), 404

    except Exception as e:
        return jsonify({"error": str(e)}), 400

if __name__ == '__main__':
    # Run server locally. In production, use Waitress/Gunicorn.
    app.run(host='0.0.0.0', port=5000, debug=True)
