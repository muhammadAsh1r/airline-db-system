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
        const { flight_id } = req.params;
        const seats = await flightService.getSeats(flight_id);
        res.json(seats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getFlights, getSeats };
