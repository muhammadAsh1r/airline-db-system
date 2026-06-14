const mongoose = require('mongoose');
require('dotenv').config();

let mongoReady = false;

const isMongoReady = () => mongoReady && mongoose.connection.readyState === 1;

const connectMongo = async () => {
    const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/skylink';

    mongoose.set('bufferCommands', false);

    mongoose.connection.on('connected', () => {
        mongoReady = true;
        console.log('Connected to MongoDB local');
    });

    mongoose.connection.on('disconnected', () => {
        mongoReady = false;
        console.warn('MongoDB disconnected');
    });

    mongoose.connection.on('error', (err) => {
        mongoReady = false;
        console.error('MongoDB connection error:', err.message);
    });

    try {
        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 4000,
            connectTimeoutMS: 4000
        });
        mongoReady = true;
    } catch (err) {
        mongoReady = false;
        console.error('MongoDB connection error:', err.message);
        console.error('Logs & analytics are disabled until MongoDB is running on port 27017.');
    }
};

module.exports = connectMongo;
module.exports.isMongoReady = isMongoReady;
