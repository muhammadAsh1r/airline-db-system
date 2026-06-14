const { SearchHistory, ActivityLog, SystemLog } = require('../models/logs');
const { isMongoReady } = require('../config/mongo');

const emptyStats = () => ({
    mongoConnected: false,
    counts: { searches: 0, activities: 0, systemLogs: 0 },
    topRoutes: [],
    activityBreakdown: [],
    systemBreakdown: [],
    searchesOverTime: []
});

const ensureMongo = () => {
    if (!isMongoReady()) {
        const err = new Error('MongoDB is not connected. Start mongod on port 27017.');
        err.code = 'MONGO_UNAVAILABLE';
        throw err;
    }
};
const getSearchHistory = async (limit = 100, fromCity = '', toCity = '') => {
    ensureMongo();
    const filter = {};
    if (fromCity) filter.from = { $regex: fromCity, $options: 'i' };
    if (toCity) filter.to = { $regex: toCity, $options: 'i' };

    return await SearchHistory.find(filter)
        .sort({ timestamp: -1 })
        .limit(parseInt(limit));
};

const getActivityLogs = async (limit = 100, action = '') => {
    ensureMongo();
    const filter = {};
    if (action) filter.action = action;
    
    return await ActivityLog.find(filter)
        .sort({ timestamp: -1 })
        .limit(parseInt(limit));
};

const getSystemLogs = async (limit = 100, level = '') => {
    ensureMongo();
    const filter = {};
    if (level) filter.level = level;
    
    return await SystemLog.find(filter)
        .sort({ timestamp: -1 })
        .limit(parseInt(limit));
};

const clearLogs = async (type = 'all') => {
    ensureMongo();
    if (type === 'search' || type === 'all') {
        await SearchHistory.deleteMany({});
    }
    if (type === 'activity' || type === 'all') {
        await ActivityLog.deleteMany({});
    }
    if (type === 'system' || type === 'all') {
        await SystemLog.deleteMany({});
    }
    return { message: `Cleared logs of type: ${type}` };
};

const getLogsStats = async () => {
    if (!isMongoReady()) {
        return emptyStats();
    }

    // 1. Total counts
    const totalSearches = await SearchHistory.countDocuments();
    const totalActivities = await ActivityLog.countDocuments();
    const totalSystemLogs = await SystemLog.countDocuments();

    // 2. MongoDB Aggregation: Top Searched Routes
    const topRoutes = await SearchHistory.aggregate([
        {
            $group: {
                _id: { from: "$from", to: "$to" },
                count: { $sum: 1 }
            }
        },
        { $sort: { count: -1 } },
        { $limit: 5 },
        {
            $project: {
                _id: 0,
                route: { $concat: ["$_id.from", " ➔ ", "$_id.to"] },
                from: "$_id.from",
                to: "$_id.to",
                count: "$count"
            }
        }
    ]);

    // 3. MongoDB Aggregation: Activity Types Breakdown
    const activityBreakdown = await ActivityLog.aggregate([
        {
            $group: {
                _id: "$action",
                count: { $sum: 1 }
            }
        },
        { $sort: { count: -1 } },
        {
            $project: {
                _id: 0,
                action: "$_id",
                count: "$count"
            }
        }
    ]);

    // 4. MongoDB Aggregation: System Log Levels Breakdown
    const systemBreakdown = await SystemLog.aggregate([
        {
            $group: {
                _id: "$level",
                count: { $sum: 1 }
            }
        },
        {
            $project: {
                _id: 0,
                level: "$_id",
                count: "$count"
            }
        }
    ]);

    // 5. MongoDB Aggregation: Search Counts Over Time (by Day)
    const searchesOverTime = await SearchHistory.aggregate([
        {
            $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
                count: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } },
        { $limit: 10 },
        {
            $project: {
                _id: 0,
                date: "$_id",
                count: "$count"
            }
        }
    ]);

    return {
        mongoConnected: true,
        counts: {
            searches: totalSearches,
            activities: totalActivities,
            systemLogs: totalSystemLogs
        },
        topRoutes,
        activityBreakdown,
        systemBreakdown,
        searchesOverTime
    };
};

module.exports = {
    getSearchHistory,
    getActivityLogs,
    getSystemLogs,
    clearLogs,
    getLogsStats,
    emptyStats
};
