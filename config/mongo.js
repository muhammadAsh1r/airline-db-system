const mongoose = require('mongoose');
require('dotenv').config();

const connectMongo = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB local');
    } catch (err) {
        console.error('MongoDB connection error:', err.message);
    }
};

module.exports = connectMongo;
