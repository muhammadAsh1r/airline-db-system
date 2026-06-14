const db = require('../config/db');
const { logActivity, logSystem } = require('./loggingService');

const cleanupExpiredHoldsQuery = () => db.query(`
    DELETE FROM seat_reservations
    WHERE status = 'Held' AND hold_expiry < CURRENT_TIMESTAMP AND passenger_id IS NULL
`);

const holdSeat = async (flightId, seatId, sessionId) => {
    if (!sessionId) {
        throw new Error('Session ID is required to hold a seat');
    }

    await cleanupExpiredHoldsQuery();

    const { rows: existingRows } = await db.query(
        `SELECT * FROM seat_reservations WHERE flight_id = $1 AND seat_id = $2`,
        [flightId, seatId]
    );

    if (existingRows.length > 0) {
        const existing = existingRows[0];

        if (existing.status === 'Booked') {
            throw new Error('Seat is already booked');
        }

        if (existing.status === 'Held') {
            const expiry = new Date(existing.hold_expiry);
            if (expiry > new Date()) {
                if (existing.session_id === sessionId) {
                    const { rows } = await db.query(
                        `UPDATE seat_reservations
                         SET hold_expiry = CURRENT_TIMESTAMP + INTERVAL '10 minutes'
                         WHERE reservation_id = $1
                         RETURNING *`,
                        [existing.reservation_id]
                    );
                    logSystem('INFO', 'Seat hold renewed', { flightId, seatId, sessionId });
                    return rows[0];
                }
                throw new Error('Seat is temporarily held by another passenger');
            }

            await db.query(
                `DELETE FROM seat_reservations WHERE reservation_id = $1`,
                [existing.reservation_id]
            );
        }
    }

    try {
        const { rows } = await db.query(
            `INSERT INTO seat_reservations (flight_id, seat_id, status, session_id)
             VALUES ($1, $2, 'Held', $3)
             RETURNING *`,
            [flightId, seatId, sessionId]
        );
        logSystem('INFO', 'Seat hold created successfully', { flightId, seatId, sessionId, reservationId: rows[0].reservation_id });
        return rows[0];
    } catch (err) {
        if (err.code === '23505') {
            logSystem('WARN', 'Seat hold conflict: seat already held or booked', { flightId, seatId, sessionId });
            throw new Error('Seat is already held or booked by someone else');
        }
        logSystem('ERROR', `Seat hold transaction failed: ${err.message}`, { flightId, seatId, sessionId });
        throw err;
    }
};

const releaseSeat = async (flightId, seatId, sessionId) => {
    if (!sessionId) {
        throw new Error('Session ID is required to release a seat');
    }

    const { rowCount } = await db.query(
        `DELETE FROM seat_reservations
         WHERE flight_id = $1 AND seat_id = $2 AND session_id = $3
           AND status = 'Held' AND passenger_id IS NULL`,
        [flightId, seatId, sessionId]
    );

    if (rowCount > 0) {
        logSystem('INFO', 'Seat hold released', { flightId, seatId, sessionId });
    }

    return { released: rowCount > 0 };
};

const releaseSessionHolds = async (sessionId, flightId = null) => {
    if (!sessionId) {
        throw new Error('Session ID is required');
    }

    let result;
    if (flightId) {
        result = await db.query(
            `DELETE FROM seat_reservations
             WHERE session_id = $1 AND flight_id = $2 AND status = 'Held' AND passenger_id IS NULL`,
            [sessionId, flightId]
        );
    } else {
        result = await db.query(
            `DELETE FROM seat_reservations
             WHERE session_id = $1 AND status = 'Held' AND passenger_id IS NULL`,
            [sessionId]
        );
    }

    if (result.rowCount > 0) {
        logSystem('INFO', 'Session seat holds released', { sessionId, flightId, count: result.rowCount });
    }

    return { released: result.rowCount };
};

const createBooking = async (passengerId, flightId, seatId, bookingReference) => {
    const client = await db.pool.connect();
    
    await logActivity('booking_attempt', { passengerId, flightId, seatId });

    try {
        await client.query('BEGIN');

        // 1. Check and update reservation to link passenger (Skip if no seat - e.g. infants)
        if (seatId) {
            const resCheck = await client.query(
                "UPDATE seat_reservations SET passenger_id = $1 WHERE flight_id = $2 AND seat_id = $3 AND status = 'Held' RETURNING *",
                [passengerId, flightId, seatId]
            );

            if (resCheck.rows.length === 0) {
                logSystem('WARN', `Booking attempt failed: seat hold expired or not found`, { passengerId, flightId, seatId });
                throw new Error('Seat hold not found or expired');
            }
        }

        // 2. Insert booking
        const bookingQuery = `
            INSERT INTO booking (passenger_id, flight_id, seat_id, booking_reference, booking_status)
            VALUES ($1, $2, $3, $4, 'Pending')
            RETURNING *
        `;
        const bookingResult = await client.query(bookingQuery, [passengerId, flightId, seatId, bookingReference]);
        const booking = bookingResult.rows[0];

        await client.query('COMMIT');
        logSystem('INFO', `Booking created successfully in pending state`, { bookingReference, passengerId, flightId, bookingId: booking.booking_id });
        return booking;

    } catch (err) {
        await client.query('ROLLBACK');
        logSystem('ERROR', `Booking creation failed: ${err.message}`, { passengerId, flightId, seatId, bookingReference });
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
        if (seat_id) {
            await client.query(
                "UPDATE seat_reservations SET status = 'Booked' WHERE flight_id = $1 AND seat_id = $2",
                [flight_id, seat_id]
            );

            // 4. Update core seat table
            await client.query("UPDATE seat SET seat_status = 'Booked' WHERE seat_id = $1", [seat_id]);
        }

        await client.query('COMMIT');
        logSystem('INFO', `Payment completed and booking confirmed`, { bookingId, amount, paymentMethod });
        return paymentResult.rows[0];
    } catch (err) {
        await client.query('ROLLBACK');
        logSystem('ERROR', `Payment failed`, { bookingId, amount, paymentMethod, error: err.message });
        throw err;
    } finally {
        client.release();
    }
};

const processPaymentByReference = async (bookingReference, paymentMethod, amount, cardDetails) => {
    // Mock Payment Validation for University Project
    if (paymentMethod === 'Credit Card' && cardDetails) {
        if (cardDetails.number !== '4242424242424242') {
            logSystem('WARN', `Payment validation rejected: invalid card number`, { bookingReference, paymentMethod });
            throw new Error('Invalid card number. Use 4242 4242 4242 4242 for testing.');
        }
    }

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Get all bookings for this reference
        const { rows: bookings } = await client.query(
            "SELECT booking_id, flight_id, seat_id FROM booking WHERE booking_reference = $1",
            [bookingReference]
        );

        if (bookings.length === 0) throw new Error('No bookings found for this reference');

        // 2. Insert one payment record for the primary booking
        const paymentResult = await client.query(
            "INSERT INTO payment (booking_id, payment_method, amount, payment_status) VALUES ($1, $2, $3, 'Completed') RETURNING *",
            [bookings[0].booking_id, paymentMethod, amount]
        );

        // 3. Update all bookings, reservations, and seats
        for (const b of bookings) {
            await client.query(
                "UPDATE booking SET booking_status = 'Confirmed' WHERE booking_id = $1",
                [b.booking_id]
            );

            if (b.seat_id) {
                await client.query(
                    "UPDATE seat_reservations SET status = 'Booked' WHERE flight_id = $1 AND seat_id = $2",
                    [b.flight_id, b.seat_id]
                );
                await client.query("UPDATE seat SET seat_status = 'Booked' WHERE seat_id = $1", [b.seat_id]);
            }
        }

        await client.query('COMMIT');
        logSystem('INFO', `Payment completed and booking reference confirmed`, { bookingReference, amount, paymentMethod, bookingsCount: bookings.length });
        return paymentResult.rows[0];
    } catch (err) {
        await client.query('ROLLBACK');
        logSystem('ERROR', `Payment by reference failed`, { bookingReference, amount, paymentMethod, error: err.message });
        throw err;
    } finally {
        client.release();
    }
};


const getBookingByReference = async (reference) => {
    const query = `
        SELECT 
            b.booking_id, 
            b.booking_reference, 
            b.booking_status,
            p.first_name, 
            p.last_name, 
            p.passport_number,
            f.airline_name, 
            f.departure_city, 
            f.arrival_city, 
            f.departure_time, 
            f.arrival_time,
            s.seat_number, 
            s.seat_class
        FROM booking b
        JOIN passenger p ON b.passenger_id = p.passenger_id
        JOIN flight f ON b.flight_id = f.flight_id
        LEFT JOIN seat s ON b.seat_id = s.seat_id
        WHERE b.booking_reference = $1
    `;
    const { rows } = await db.query(query, [reference]);
    return rows;
};

const cancelBooking = async (bookingReference) => {
    if (!bookingReference) return { success: false };
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        
        // 1. Get the seat IDs and flight ID associated with this booking
        const { rows: bookings } = await client.query(
            "SELECT flight_id, seat_id FROM booking WHERE booking_reference = $1",
            [bookingReference]
        );

        if (bookings.length > 0) {
            const flightId = bookings[0].flight_id;
            const seatIds = bookings.map(b => b.seat_id).filter(id => id !== null);

            // 2. Delete holds
            if (seatIds.length > 0) {
                await client.query(
                    "DELETE FROM seat_reservations WHERE flight_id = $1 AND seat_id = ANY($2::int[]) AND status = 'Held'",
                    [flightId, seatIds]
                );
            }
        }

        // 3. Delete bookings
        await client.query(
            "DELETE FROM booking WHERE booking_reference = $1 AND booking_status = 'Pending'",
            [bookingReference]
        );

        await client.query('COMMIT');
        logSystem('INFO', `Pending booking cancelled and seats released successfully`, { bookingReference });
        return { success: true };
    } catch (err) {
        await client.query('ROLLBACK');
        logSystem('ERROR', `Failed to cancel pending booking: ${err.message}`, { bookingReference });
        throw err;
    } finally {
        client.release();
    }
};

const cleanupExpiredHolds = async () => {
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Find all expired held seat reservations
        const expiredQuery = `
            SELECT flight_id, seat_id FROM seat_reservations
            WHERE status = 'Held' AND hold_expiry < CURRENT_TIMESTAMP
        `;
        const { rows: expired } = await client.query(expiredQuery);

        if (expired.length > 0) {
            const flightIds = expired.map(e => e.flight_id);
            const seatIds = expired.map(e => e.seat_id);

            // 2. Delete the associated seat reservations
            await client.query(`
                DELETE FROM seat_reservations
                WHERE status = 'Held' AND hold_expiry < CURRENT_TIMESTAMP
            `);

            // 3. Delete the associated Pending bookings
            await client.query(`
                DELETE FROM booking
                WHERE booking_status = 'Pending' AND flight_id = ANY($1::int[]) AND seat_id = ANY($2::int[])
            `, [flightIds, seatIds]);

            logSystem('INFO', `Cleaned up ${expired.length} expired seat holds and associated pending bookings`, { count: expired.length });
        }

        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        logSystem('ERROR', `Failed to cleanup expired seat holds: ${err.message}`);
    } finally {
        client.release();
    }
};

module.exports = { 
    createBooking, 
    processPayment, 
    processPaymentByReference, 
    holdSeat,
    releaseSeat,
    releaseSessionHolds,
    getBookingByReference,
    cancelBooking,
    cleanupExpiredHolds
};
