const db = require('../config/db');
const { redisClient } = require('../config/redis');
const { logSearch } = require('./loggingService');

const getFlights = async (from, to, date, seatClass) => {
    const cacheKey = `flights:${from}:${to}:${date}:${seatClass || 'All'}`;
    
    // Log search to MongoDB
    await logSearch(from, to);

    // 1. Check Redis Cache
    try {
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
            console.log('Serving flights from Redis cache');
            return JSON.parse(cachedData);
        }
    } catch (err) {
        console.error('Redis error:', err.message);
    }

    // 2. Fetch from PostgreSQL
    console.log('Fetching flights from PostgreSQL');
    let query = `
        SELECT f.* FROM flight f
        WHERE f.departure_city ILIKE $1 AND f.arrival_city ILIKE $2
    `;
    const params = [from, to];

    if (date) {
        query += ` AND DATE(f.departure_time) = $${params.length + 1}`;
        params.push(date);
    }

    // If seatClass is specified, we might want to ensure the flight has such seats available
    // For simplicity, we just filter the flights. In a real system, we'd join with seats.
    
    const { rows } = await db.query(query, params);

    // 3. Store in Redis (Expire in 5 minutes)
    if (rows.length > 0) {
        try {
            await redisClient.setEx(cacheKey, 300, JSON.stringify(rows));
        } catch (err) {
            console.error('Redis set error:', err.message);
        }
    }

    return rows;
};

const getSeats = async (flightId) => {
    const query = `
        SELECT s.*, 
               sr.status as reservation_status,
               sr.hold_expiry
        FROM seat s
        LEFT JOIN seat_reservations sr ON s.seat_id = sr.seat_id AND s.flight_id = sr.flight_id
        WHERE s.flight_id = $1
        ORDER BY s.seat_number
    `;
    const { rows } = await db.query(query, [flightId]);
    
    // Logical status check: if Held but expired, it's actually Available
    return rows.map(s => {
        const now = new Date();
        const expiry = s.hold_expiry ? new Date(s.hold_expiry) : null;
        let status = s.seat_status; // Base status from seat table

        if (s.reservation_status === 'Booked') {
            status = 'Booked';
        } else if (s.reservation_status === 'Held' && expiry && expiry > now) {
            status = 'Held';
        } else if (s.seat_status === 'Booked') {
             status = 'Booked';
        } else {
            status = 'Available';
        }
        
        return { ...s, display_status: status };
    });
};

module.exports = { getFlights, getSeats };
