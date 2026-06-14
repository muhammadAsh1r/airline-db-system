const baggageService = require('../services/baggageService');

const addBaggage = async (req, res) => {
    try {
        const { passenger_id, weight, cost } = req.body;
        const baggage = await baggageService.addBaggage(passenger_id, weight, cost);
        res.status(201).json(baggage);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { addBaggage };
