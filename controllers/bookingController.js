const bookingService = require('../services/bookingService');

const createBooking = async (req, res) => {
    try {
        const { passenger_id, flight_id, seat_id } = req.body;
        const booking = await bookingService.createBooking(passenger_id, flight_id, seat_id);
        res.status(201).json(booking);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

const holdSeat = async (req, res) => {
    try {
        const { flight_id, seat_id } = req.body;
        const hold = await bookingService.holdSeat(flight_id, seat_id);
        res.status(201).json(hold);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

const createPayment = async (req, res) => {
    try {
        const { booking_id, payment_method, amount } = req.body;
        const payment = await bookingService.processPayment(booking_id, payment_method, amount);
        res.status(201).json(payment);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { createBooking, createPayment, holdSeat };
