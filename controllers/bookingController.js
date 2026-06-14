const bookingService = require('../services/bookingService');

const createBooking = async (req, res) => {
    try {
        const { passenger_id, flight_id, seat_id, booking_reference } = req.body;
        const booking = await bookingService.createBooking(passenger_id, flight_id, seat_id, booking_reference);
        res.status(201).json(booking);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

const holdSeat = async (req, res) => {
    try {
        const { flight_id, seat_id, session_id } = req.body;
        const hold = await bookingService.holdSeat(flight_id, seat_id, session_id);
        res.status(201).json(hold);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

const releaseSeat = async (req, res) => {
    try {
        const { flight_id, seat_id, session_id } = req.body;
        const result = await bookingService.releaseSeat(flight_id, seat_id, session_id);
        res.status(200).json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

const releaseSessionHolds = async (req, res) => {
    try {
        const { session_id, flight_id } = req.body;
        const result = await bookingService.releaseSessionHolds(session_id, flight_id || null);
        res.status(200).json(result);
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

const confirmPayment = async (req, res) => {
    try {
        const { booking_reference, payment_method, amount, card_details } = req.body;
        const payment = await bookingService.processPaymentByReference(booking_reference, payment_method, amount, card_details);
        res.status(201).json(payment);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

const getBooking = async (req, res) => {
    try {
        const { reference } = req.params;
        const bookings = await bookingService.getBookingByReference(reference);
        if (bookings.length === 0) return res.status(404).json({ error: 'Booking not found' });
        res.json(bookings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const cancelBooking = async (req, res) => {
    try {
        const { booking_reference } = req.body;
        const result = await bookingService.cancelBooking(booking_reference);
        res.status(200).json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { 
    createBooking, 
    createPayment, 
    holdSeat,
    releaseSeat,
    releaseSessionHolds,
    confirmPayment, 
    getBooking,
    cancelBooking
};
