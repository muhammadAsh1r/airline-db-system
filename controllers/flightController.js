const flightService = require('../services/flightService');

const getFlights = async (req, res) => {
    try {
        const { from, to, date, class: seatClass } = req.query;
        if (!from || !to) {
            return res.status(400).json({ error: 'Source and Destination are required' });
        }
        const flights = await flightService.getFlights(from, to, date, seatClass);
        res.json(flights);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const getSeats = async (req, res) => {
    try {
        const flightId = req.params.flightId || req.params.flight_id;
        const { session_id: sessionId } = req.query;
        const seats = await flightService.getSeats(flightId, sessionId || null);
        res.json(seats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const getFlight = async (req, res) => {
    try {
        const { flightId } = req.params;
        const flight = await flightService.getFlight(flightId);
        if (!flight) return res.status(404).json({ error: 'Flight not found' });
        res.json(flight);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getFlights, getSeats, getFlight };
