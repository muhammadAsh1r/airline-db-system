const { SearchHistory, ActivityLog } = require('../models/logs');

const logSearch = async (from, to) => {
    try {
        const search = new SearchHistory({ from, to });
        await search.save();
    } catch (err) {
        console.error('Error logging search:', err.message);
    }
};

const logActivity = async (action, details) => {
    try {
        const log = new ActivityLog({ action, details });
        await log.save();
    } catch (err) {
        console.error('Error logging activity:', err.message);
    }
};

module.exports = { logSearch, logActivity };
