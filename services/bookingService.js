const db = require('../config/db');
const { logActivity } = require('./loggingService');

const holdSeat = async (flightId, seatId) => {
    // 1. Cleanup expired holds first
    await db.query(`
        DELETE FROM seat_reservations 
        WHERE status = 'Held' AND hold_expiry < CURRENT_TIMESTAMP
    `);

    try {
        // 2. Try to insert a new hold
        const query = `
            INSERT INTO seat_reservations (flight_id, seat_id, status)
            VALUES ($1, $2, 'Held')
            RETURNING *
        `;
        const { rows } = await db.query(query, [flightId, seatId]);
        return rows[0];
    } catch (err) {
        if (err.code === '23505') { // Unique violation
            throw new Error('Seat is already held or booked by someone else');
        }
        throw err;
    }
};

const createBooking = async (passengerId, flightId, seatId) => {
    const client = await db.pool.connect();
    
    await logActivity('booking_attempt', { passengerId, flightId, seatId });

    try {
        await client.query('BEGIN');

        // 1. Check and update reservation to link passenger
        const resCheck = await client.query(
            "UPDATE seat_reservations SET passenger_id = $1 WHERE flight_id = $2 AND seat_id = $3 AND status = 'Held' RETURNING *",
            [passengerId, flightId, seatId]
        );

        if (resCheck.rows.length === 0) {
            throw new Error('Seat hold not found or expired');
        }

        // 2. Insert booking
        const bookingQuery = `
            INSERT INTO booking (passenger_id, flight_id, seat_id, booking_status)
            VALUES ($1, $2, $3, 'Pending')
            RETURNING *
        `;
        const bookingResult = await client.query(bookingQuery, [passengerId, flightId, seatId]);
        const booking = bookingResult.rows[0];

        await client.query('COMMIT');
        return booking;

    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

const processPayment = async (bookingId, paymentMethod, amount) => {
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Insert Payment
        const paymentResult = await client.query(
            "INSERT INTO payment (booking_id, payment_method, amount, payment_status) VALUES ($1, $2, $3, 'Completed') RETURNING *",
            [bookingId, paymentMethod, amount]
        );

        // 2. Update Booking Status
        const bUpdate = await client.query(
            "UPDATE booking SET booking_status = 'Confirmed' WHERE booking_id = $1 RETURNING flight_id, seat_id",
            [bookingId]
        );
        const { flight_id, seat_id } = bUpdate.rows[0];

        // 3. Finalize Seat Reservation
        await client.query(
            "UPDATE seat_reservations SET status = 'Booked' WHERE flight_id = $1 AND seat_id = $2",
            [flight_id, seat_id]
        );

        // 4. Update core seat table
        await client.query("UPDATE seat SET seat_status = 'Booked' WHERE seat_id = $1", [seat_id]);

        await client.query('COMMIT');
        return paymentResult.rows[0];
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

module.exports = { createBooking, processPayment, holdSeat };
