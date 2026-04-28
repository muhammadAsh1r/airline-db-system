const passengerService = require('../services/passengerService');

const createPassenger = async (req, res) => {
    try {
        const passenger = await passengerService.createPassenger(req.body);
        res.status(201).json(passenger);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { createPassenger };
