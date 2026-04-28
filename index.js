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

// Initialize DB Connections and Start Server
const startServer = async () => {
    try {
        await connectMongo();
        await connectRedis();
        
        app.listen(PORT, () => {
            console.log(`SkyLink Backend running on http://localhost:${PORT}`);
        });
    } catch (err) {
        console.error('Failed to start server:', err.message);
        process.exit(1);
    }
};

startServer();
