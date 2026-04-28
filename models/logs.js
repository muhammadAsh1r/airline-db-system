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

const SearchHistory = mongoose.model('SearchHistory', SearchHistorySchema);
const ActivityLog = mongoose.model('ActivityLog', ActivityLogSchema);

module.exports = { SearchHistory, ActivityLog };
