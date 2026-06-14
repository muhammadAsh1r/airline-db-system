const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const connectMongo = require('./config/mongo');
const { connectRedis } = require('./config/redis');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.static('public')); // Serve frontend

// Routes
app.use('/api', apiRoutes);

// Catch-all for 404s
app.use((req, res) => {
    console.log(`404 Not Found: ${req.method} ${req.url}`);
    res.status(404).json({ error: `Route ${req.method} ${req.url} not found` });
});

// Initialize DB Connections and Start Server
const startServer = async () => {
    try {
        await connectMongo();
        await connectRedis();

        const db = require('./config/db');
        await db.query(`
            ALTER TABLE seat_reservations
            ADD COLUMN IF NOT EXISTS session_id VARCHAR(64)
        `);
        
        app.listen(PORT, () => {
            console.log(`SkyLink Backend running on http://localhost:${PORT}`);
            
            // Log server startup to MongoDB (loaded dynamically to avoid dependency issues during mongoose initialization)
            try {
                const { logSystem } = require('./services/loggingService');
                logSystem('INFO', `SkyLink Backend server started on port ${PORT}`, {
                    env: process.env.NODE_ENV || 'development',
                    port: PORT,
                    postgres: 'connected (pool initialized)',
                    mongodb: require('./config/mongo').isMongoReady() ? 'connected' : 'offline',
                    redis: 'connected'
                });
            } catch (logErr) {
                console.error('Error logging startup to MongoDB:', logErr.message);
            }

            // Generate recurring scheduled flights automatically for the next 30 days
            try {
                const scheduleService = require('./services/scheduleService');
                scheduleService.generateAllFlights().then(() => {
                    console.log('Seeded recurring flight loops generated successfully for the next 30 days');
                }).catch(err => {
                    console.error('Error generating scheduled flights on startup:', err.message);
                });
            } catch (schedErr) {
                console.error('Failed to load scheduleService on startup:', schedErr.message);
            }

            // Background task: Clean up expired seat holds and pending bookings every 30 seconds
            try {
                const { cleanupExpiredHolds } = require('./services/bookingService');
                setInterval(() => {
                    cleanupExpiredHolds().catch(err => {
                        console.error('Error running expired holds background cleanup:', err.message);
                    });
                }, 30000); // 30 seconds
            } catch (cleanupErr) {
                console.error('Failed to register expired holds background cleanup task:', cleanupErr.message);
            }
        });

    } catch (err) {
        console.error('Failed to start server:', err.message);
        process.exit(1);
    }
};

startServer();

