const express = require('express');
const router = express.Router();

const flightController = require('../controllers/flightController');
const passengerController = require('../controllers/passengerController');
const bookingController = require('../controllers/bookingController');
const airportController = require('../controllers/airportController');

// Flight Routes
router.get('/flights', flightController.getFlights);
router.get('/flights/:flightId/seats', flightController.getSeats);

// Airport Routes
router.get('/airports', airportController.getAirports);

// Passenger Routes
router.post('/passenger', passengerController.createPassenger);

// Booking Routes
router.post('/booking', bookingController.createBooking);
router.post('/booking/hold', bookingController.holdSeat);

// Payment Routes
router.post('/payment', bookingController.createPayment);

module.exports = router;
