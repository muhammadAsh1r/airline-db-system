const { SearchHistory, ActivityLog, SystemLog } = require('../models/logs');
const { isMongoReady } = require('../config/mongo');

const skipIfOffline = () => !isMongoReady();

const logSearch = async (from, to) => {
    if (skipIfOffline()) return;
    try {
        await SearchHistory.create({ from, to });
    } catch (err) {
        console.error('Background logSearch error:', err.message);
    }
};

const logActivity = async (action, details) => {
    if (skipIfOffline()) return;
    try {
        await ActivityLog.create({ action, details });
    } catch (err) {
        console.error('Background logActivity error:', err.message);
    }
};

const logSystem = async (level, message, meta = {}) => {
    if (skipIfOffline()) return;
    try {
        await SystemLog.create({ level, message, meta });
    } catch (err) {
        console.error('Background logSystem error:', err.message);
    }
};

module.exports = { logSearch, logActivity, logSystem };
