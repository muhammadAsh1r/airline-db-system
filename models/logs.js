const mongoose = require('mongoose');

const SearchHistorySchema = new mongoose.Schema({
    from: String,
    to: String,
    timestamp: { type: Date, default: Date.now }
});

const ActivityLogSchema = new mongoose.Schema({
    action: String,
    details: Object,
    timestamp: { type: Date, default: Date.now }
});

const SystemLogSchema = new mongoose.Schema({
    level: { type: String, required: true }, // 'INFO', 'WARN', 'ERROR'
    message: { type: String, required: true },
    meta: { type: Object, default: {} },
    timestamp: { type: Date, default: Date.now }
});

const SearchHistory = mongoose.model('SearchHistory', SearchHistorySchema);
const ActivityLog = mongoose.model('ActivityLog', ActivityLogSchema);
const SystemLog = mongoose.model('SystemLog', SystemLogSchema);

module.exports = { SearchHistory, ActivityLog, SystemLog };

