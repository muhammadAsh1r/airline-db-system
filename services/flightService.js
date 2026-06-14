const db = require('../config/db');
const { redisClient } = require('../config/redis');
const { logSearch } = require('./loggingService');

const getFlights = async (from, to, date, seatClass) => {
    const cacheKey = `flights:${from}:${to}:${date}:${seatClass || 'All'}`;
    
    // Log search to MongoDB
    await logSearch(from, to);

    const todayStr = new Date().toISOString().split('T')[0];
    const isToday = (date === todayStr);

    // 1. Check Redis Cache (Only for future dates, as today's flights change by the hour)
    if (!isToday) {
        try {
            const cachedData = await redisClient.get(cacheKey);
            if (cachedData) {
                console.log('Serving flights from Redis cache');
                return JSON.parse(cachedData);
            }
        } catch (err) {
            console.error('Redis error:', err.message);
        }
    }

    // 2. Fetch from PostgreSQL
    console.log('Fetching flights from PostgreSQL');
    let query = `
        SELECT f.*, 
               (SELECT COUNT(*) FROM seat s 
                WHERE s.flight_id = f.flight_id 
                AND s.seat_class = $3 
                AND s.seat_status = 'Available'
               ) as available_seats
        FROM flight f
        WHERE f.departure_city ILIKE $1 AND f.arrival_city ILIKE $2
    `;
    const params = [from, to, seatClass || 'Economy'];

    if (date) {
        query += ` AND DATE(f.departure_time) = $${params.length + 1}`;
        params.push(date);
        
        if (isToday) {
            query += ` AND f.departure_time > $${params.length + 1}`;
            params.push(new Date());
        }
    }

    query += ` ORDER BY f.departure_time ASC`;

    const { rows } = await db.query(query, params);

    // 3. Store in Redis (Only for future dates)
    if (rows.length > 0 && !isToday) {
        try {
            await redisClient.setEx(cacheKey, 300, JSON.stringify(rows));
        } catch (err) {
            console.error('Redis set error:', err.message);
        }
    }

    return rows;
};

const getFlight = async (flightId) => {
    const query = 'SELECT * FROM flight WHERE flight_id = $1';
    const { rows } = await db.query(query, [flightId]);
    return rows[0];
};

const getSeats = async (flightId, sessionId = null) => {
    const query = `
        SELECT s.*, 
               sr.status as reservation_status,
               sr.hold_expiry,
               sr.session_id as hold_session_id
        FROM seat s
        LEFT JOIN seat_reservations sr ON s.seat_id = sr.seat_id AND s.flight_id = sr.flight_id
        WHERE s.flight_id = $1
        ORDER BY s.seat_number
    `;
    const { rows } = await db.query(query, [flightId]);
    
    const now = new Date();
    return rows.map(s => {
        const expiry = s.hold_expiry ? new Date(s.hold_expiry) : null;
        let display_status = 'Available';

        if (s.reservation_status === 'Booked' || s.seat_status === 'Booked') {
            display_status = 'Booked';
        } else if (s.reservation_status === 'Held' && expiry && expiry > now) {
            display_status = (sessionId && s.hold_session_id === sessionId) ? 'Yours' : 'Held';
        }

        return {
            ...s,
            display_status,
            is_mine: display_status === 'Yours',
            hold_expires_at: expiry && expiry > now ? expiry.toISOString() : null
        };
    });
};

module.exports = { getFlights, getFlight, getSeats };
