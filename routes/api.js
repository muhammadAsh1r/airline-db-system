const express = require('express');
const router = express.Router();

router.use((req, res, next) => {
    console.log(`API Router Request: ${req.method} ${req.url}`);
    next();
});

const flightController = require('../controllers/flightController');
const passengerController = require('../controllers/passengerController');
const bookingController = require('../controllers/bookingController');
const airportController = require('../controllers/airportController');
const scheduleController = require('../controllers/scheduleController');

// Flight Routes
router.get('/flights', flightController.getFlights);
router.get('/flights/:flightId', flightController.getFlight);
router.get('/flights/:flightId/seats', flightController.getSeats);

// Schedule Routes
router.post('/schedules', scheduleController.createSchedule);
router.get('/schedules', scheduleController.getSchedules);
router.post('/schedules/generate', scheduleController.triggerGeneration);

// Airport Routes
router.get('/airports', airportController.getAirports);

// Passenger Routes
router.post('/passenger', passengerController.createPassenger);

// Booking Routes (specific paths before /booking/:reference)
router.post('/booking/hold', bookingController.holdSeat);
router.post('/booking/release', bookingController.releaseSeat);
router.post('/booking/release-session', bookingController.releaseSessionHolds);
router.post('/booking/cancel', bookingController.cancelBooking);
router.post('/booking', bookingController.createBooking);
router.get('/booking/:reference', bookingController.getBooking);

// Payment Routes
router.post('/payment/confirm', bookingController.confirmPayment);
router.post('/payment', bookingController.createPayment);

const baggageController = require('../controllers/baggageController');
const logsController = require('../controllers/logsController');

// ... (other routes) ...

// Baggage Routes
router.post('/baggage', baggageController.addBaggage);

// NoSQL Logs & Analytics Routes (MongoDB)
router.get('/logs/search-history', logsController.getSearchHistory);
router.get('/logs/activity', logsController.getActivityLogs);
router.get('/logs/system', logsController.getSystemLogs);
router.get('/logs/stats', logsController.getStats);
router.get('/logs/health', logsController.getHealth);
router.delete('/logs/clear', logsController.clearLogs);

module.exports = router;

