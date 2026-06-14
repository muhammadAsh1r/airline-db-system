const logsService = require('../services/logsService');

const mongoUnavailable = (res) =>
    res.status(503).json({
        error: 'MongoDB is not connected. Start mongod on port 27017.',
        code: 'MONGO_UNAVAILABLE'
    });

const handleMongoError = (err, res) => {
    if (err.code === 'MONGO_UNAVAILABLE') {
        return mongoUnavailable(res);
    }
    res.status(500).json({ error: err.message });
};

const getSearchHistory = async (req, res) => {
    try {
        const { limit, from, to } = req.query;
        const data = await logsService.getSearchHistory(limit, from, to);
        res.json(data);
    } catch (err) {
        handleMongoError(err, res);
    }
};

const getActivityLogs = async (req, res) => {
    try {
        const { limit, action } = req.query;
        const data = await logsService.getActivityLogs(limit, action);
        res.json(data);
    } catch (err) {
        handleMongoError(err, res);
    }
};

const getSystemLogs = async (req, res) => {
    try {
        const { limit, level } = req.query;
        const data = await logsService.getSystemLogs(limit, level);
        res.json(data);
    } catch (err) {
        handleMongoError(err, res);
    }
};

const clearLogs = async (req, res) => {
    try {
        const { type } = req.query;
        const result = await logsService.clearLogs(type);
        res.json(result);
    } catch (err) {
        handleMongoError(err, res);
    }
};

const getStats = async (req, res) => {
    try {
        const stats = await logsService.getLogsStats();
        res.json(stats);
    } catch (err) {
        handleMongoError(err, res);
    }
};

const getHealth = async (req, res) => {
    try {
        const stats = await logsService.getLogsStats();
        res.json({
            mongoConnected: stats.mongoConnected,
            message: stats.mongoConnected
                ? 'MongoDB is connected'
                : 'MongoDB is offline — start with: mongod --dbpath ./scratch/mongodb_data'
        });
    } catch (err) {
        handleMongoError(err, res);
    }
};

module.exports = {
    getSearchHistory,
    getActivityLogs,
    getSystemLogs,
    clearLogs,
    getStats,
    getHealth
};
