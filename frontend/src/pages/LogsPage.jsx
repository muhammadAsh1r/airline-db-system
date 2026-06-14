import React, { useState, useEffect } from 'react';
import { logsService } from '../services/api';
import { useToast } from '../context/ToastContext';
import '../styles/LogsPage.css';

const LogsPage = () => {
    const { showToast } = useToast();
    
    // Tab and Loading states
    const [activeTab, setActiveTab] = useState('analytics');
    const [loading, setLoading] = useState(true);
    
    // Data states
    const [stats, setStats] = useState({
        counts: { searches: 0, activities: 0, systemLogs: 0 },
        topRoutes: [],
        activityBreakdown: [],
        systemBreakdown: [],
        searchesOverTime: []
    });
    const [searchHistory, setSearchHistory] = useState([]);
    const [activityLogs, setActivityLogs] = useState([]);
    const [systemLogs, setSystemLogs] = useState([]);
    const [mongoConnected, setMongoConnected] = useState(true);
    
    // Filter states
    const [searchFrom, setSearchFrom] = useState('');
    const [searchTo, setSearchTo] = useState('');
    const [activityAction, setActivityAction] = useState('');
    const [systemLevel, setSystemLevel] = useState('');
    
    // Expansions state for JSON meta viewers
    const [expandedLogs, setExpandedLogs] = useState({});

    // Fetch dashboard stats (MongoDB aggregate calculations)
    const fetchStats = async () => {
        try {
            setLoading(true);
            const response = await logsService.getStats();
            setStats(response.data);
            setMongoConnected(response.data.mongoConnected !== false);
        } catch (err) {
            console.error('Failed to fetch stats:', err);
            setMongoConnected(false);
            if (err.response?.status !== 503) {
                showToast('Failed to load MongoDB analytics', 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    // Fetch search history logs from MongoDB
    const fetchSearchHistory = async () => {
        try {
            setLoading(true);
            const response = await logsService.getSearchHistory(100, searchFrom, searchTo);
            setSearchHistory(response.data);
        } catch (err) {
            console.error('Failed to fetch search history:', err);
            setMongoConnected(false);
            if (err.response?.status !== 503) {
                showToast('Failed to load search history from MongoDB', 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    // Fetch user activity logs from MongoDB
    const fetchActivityLogs = async () => {
        try {
            setLoading(true);
            const response = await logsService.getActivityLogs(100, activityAction);
            setActivityLogs(response.data);
        } catch (err) {
            console.error('Failed to fetch activity logs:', err);
            setMongoConnected(false);
            if (err.response?.status !== 503) {
                showToast('Failed to load activity logs from MongoDB', 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    // Fetch low-level system logs from MongoDB
    const fetchSystemLogs = async () => {
        try {
            setLoading(true);
            const response = await logsService.getSystemLogs(100, systemLevel);
            setSystemLogs(response.data);
        } catch (err) {
            console.error('Failed to fetch system logs:', err);
            setMongoConnected(false);
            if (err.response?.status !== 503) {
                showToast('Failed to load system logs from MongoDB', 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    // Trigger data fetching based on active tab
    useEffect(() => {
        if (activeTab === 'analytics') {
            fetchStats();
        } else if (activeTab === 'search') {
            fetchSearchHistory();
        } else if (activeTab === 'activity') {
            fetchActivityLogs();
        } else if (activeTab === 'system') {
            fetchSystemLogs();
        }
    }, [activeTab]);

    // Handle clearing MongoDB collections
    const handleClearLogs = async (type) => {
        const confirmMsg = `Are you sure you want to clear ${type === 'all' ? 'ALL' : type} logs from MongoDB? This cannot be undone.`;
        if (!window.confirm(confirmMsg)) return;

        try {
            setLoading(true);
            await logsService.clearLogs(type);
            showToast(`Cleared ${type} logs from NoSQL database successfully`, 'success');
            
            // Re-fetch active tab data
            if (activeTab === 'analytics') fetchStats();
            else if (activeTab === 'search') fetchSearchHistory();
            else if (activeTab === 'activity') fetchActivityLogs();
            else if (activeTab === 'system') fetchSystemLogs();
        } catch (err) {
            console.error('Failed to clear logs:', err);
            showToast('Error clearing logs in MongoDB', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Helper to format date strings
    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    // Helper to toggle detail expansion
    const toggleExpand = (id) => {
        setExpandedLogs(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    // Calculate dynamic system health indicator
    const getSystemHealth = () => {
        if (!mongoConnected) {
            return { label: 'Offline', color: 'red', desc: 'MongoDB is not running on port 27017.' };
        }
        const errorLogs = stats.systemBreakdown?.find(b => b.level === 'ERROR')?.count || 0;
        if (errorLogs === 0) return { label: 'Optimal', color: 'green', desc: 'No system errors detected.' };
        if (errorLogs < 5) return { label: 'Warning', color: 'orange', desc: 'Few system errors logged.' };
        return { label: 'Critical', color: 'red', desc: 'Multiple database or transaction failures!' };
    };

    const health = getSystemHealth();

    return (
        <div className="container">
            <div className="logs-dashboard">
                
                {/* Header */}
                <div className="logs-header">
                    <div>
                        <h1>NoSQL Logs & Analytics</h1>
                        <p>Real-time analytics and semi-structured database tracking powered by MongoDB & Mongoose</p>
                    </div>
                    <div className="logs-actions">
                        <select 
                            onChange={(e) => {
                                if (e.target.value) {
                                    handleClearLogs(e.target.value);
                                    e.target.value = ''; // Reset select
                                }
                            }}
                            className="btn btn-outline"
                            style={{ background: '#2c3e50', border: 'none', color: '#fff', padding: '10px 15px' }}
                            defaultValue=""
                        >
                            <option value="" disabled>🗑️ Clear MongoDB Logs</option>
                            <option value="search">Clear Search History Only</option>
                            <option value="activity">Clear Activity Logs Only</option>
                            <option value="system">Clear System Logs Only</option>
                            <option value="all">Clear All Logs</option>
                        </select>
                        <button onClick={() => {
                            if (activeTab === 'analytics') fetchStats();
                            else if (activeTab === 'search') fetchSearchHistory();
                            else if (activeTab === 'activity') fetchActivityLogs();
                            else if (activeTab === 'system') fetchSystemLogs();
                            showToast('Refreshed logs from MongoDB', 'success');
                        }} className="btn btn-outline">🔄 Refresh</button>
                    </div>
                </div>

                {!mongoConnected && (
                    <div style={{
                        background: '#fde7e9',
                        border: '1px solid #d13438',
                        borderRadius: '8px',
                        padding: '14px 18px',
                        marginBottom: '20px',
                        color: '#a4262c',
                        fontSize: '14px'
                    }}>
                        <strong>MongoDB is offline.</strong> Start it with:{' '}
                        <code style={{ background: '#fff', padding: '2px 6px', borderRadius: '4px' }}>
                            mongod --dbpath ./scratch/mongodb_data --bind_ip 127.0.0.1 --port 27017
                        </code>
                        {' '}then restart the backend and refresh this page.
                    </div>
                )}

                {/* Tabs Nav Bar */}
                <div className="tab-bar">
                    <button 
                        className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
                        onClick={() => setActiveTab('analytics')}
                    >
                        📊 MongoDB Analytics
                    </button>
                    <button 
                        className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`}
                        onClick={() => setActiveTab('search')}
                    >
                        🔍 Search Histories
                    </button>
                    <button 
                        className={`tab-btn ${activeTab === 'activity' ? 'active' : ''}`}
                        onClick={() => setActiveTab('activity')}
                    >
                        👤 User Activities
                    </button>
                    <button 
                        className={`tab-btn ${activeTab === 'system' ? 'active' : ''}`}
                        onClick={() => setActiveTab('system')}
                    >
                        💻 System Console
                    </button>
                </div>

                {/* Loading indicator */}
                {loading && (
                    <div style={{ textAlign: 'center', padding: '60px 0' }}>
                        <div className="spinner"></div>
                        <p style={{ color: 'var(--text-muted)' }}>Querying MongoDB local database...</p>
                    </div>
                )}

                {/* Tab Contents */}
                {!loading && activeTab === 'analytics' && (
                    <>
                        {/* Summary Stat Cards */}
                        <div className="stats-grid">
                            <div className="stat-card blue">
                                <div className="stat-icon">🔍</div>
                                <div className="stat-info">
                                    <span className="stat-label">Total Routes Searched</span>
                                    <span className="stat-value">{stats.counts?.searches || 0}</span>
                                </div>
                            </div>
                            <div className="stat-card green">
                                <div className="stat-icon">👤</div>
                                <div className="stat-info">
                                    <span className="stat-label">Total Activities</span>
                                    <span className="stat-value">{stats.counts?.activities || 0}</span>
                                </div>
                            </div>
                            <div className="stat-card orange">
                                <div className="stat-icon">💻</div>
                                <div className="stat-info">
                                    <span className="stat-label">System Logs Captured</span>
                                    <span className="stat-value">{stats.counts?.systemLogs || 0}</span>
                                </div>
                            </div>
                            <div className="stat-card red">
                                <div className="stat-icon">{health.color === 'green' ? '🟢' : health.color === 'orange' ? '🟡' : '🔴'}</div>
                                <div className="stat-info">
                                    <span className="stat-label">System Health</span>
                                    <span className="stat-value" style={{ color: `var(--${health.color === 'orange' ? 'warning' : health.color === 'green' ? 'success' : 'error'})` }}>
                                        {health.label}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Visual Aggregation details */}
                        <div className="analytics-section">
                            
                            {/* Aggregation 1: Popular routes */}
                            <div className="analytics-card">
                                <h3>🔥 Most Searched Routes (MongoDB Aggregation Pipeline)</h3>
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '15px' }}>
                                    Aggregated using <code>$group</code>, <code>$sort</code>, and <code>$limit</code> pipelines.
                                </p>
                                {stats.topRoutes?.length === 0 ? (
                                    <p style={{ textAlign: 'center', color: '#666', padding: '20px' }}>No search trends captured yet.</p>
                                ) : (
                                    stats.topRoutes?.map((route, i) => (
                                        <div key={i} className="route-list-item">
                                            <span className="route-name">{route.route}</span>
                                            <span className="route-count">{route.count} searches</span>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Aggregation 2: Log distribution */}
                            <div className="analytics-card">
                                <h3>📊 System & Activity Diagnostics</h3>
                                
                                <div style={{ marginBottom: '25px' }}>
                                    <h4 style={{ fontSize: '13px', color: '#333', marginBottom: '10px' }}>System Logs (by Level)</h4>
                                    {stats.systemBreakdown?.length === 0 ? (
                                        <p style={{ fontSize: '12px', color: '#666' }}>No diagnostic logs recorded.</p>
                                    ) : (
                                        stats.systemBreakdown?.map((level, i) => {
                                            const total = stats.counts?.systemLogs || 1;
                                            const pct = Math.round((level.count / total) * 100);
                                            const barColor = level.level === 'ERROR' ? 'var(--error)' : level.level === 'WARN' ? '#f57f17' : 'var(--success)';
                                            return (
                                                <div key={i} className="activity-bar-container">
                                                    <div className="activity-bar-label">
                                                        <span style={{ fontWeight: 600 }}>{level.level}</span>
                                                        <span>{level.count} ({pct}%)</span>
                                                    </div>
                                                    <div className="activity-bar-bg">
                                                        <div className="activity-bar-fill" style={{ width: `${pct}%`, background: barColor }}></div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>

                                <div>
                                    <h4 style={{ fontSize: '13px', color: '#333', marginBottom: '10px' }}>Activities (by Action)</h4>
                                    {stats.activityBreakdown?.length === 0 ? (
                                        <p style={{ fontSize: '12px', color: '#666' }}>No active bookings logged yet.</p>
                                    ) : (
                                        stats.activityBreakdown?.map((act, i) => {
                                            const total = stats.counts?.activities || 1;
                                            const pct = Math.round((act.count / total) * 100);
                                            return (
                                                <div key={i} className="activity-bar-container">
                                                    <div className="activity-bar-label">
                                                        <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{act.action.replace('_', ' ')}</span>
                                                        <span>{act.count}</span>
                                                    </div>
                                                    <div className="activity-bar-bg">
                                                        <div className="activity-bar-fill" style={{ width: `${pct}%`, background: 'var(--primary)' }}></div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* Tab 2: Search History */}
                {!loading && activeTab === 'search' && (
                    <>
                        <div className="filter-bar">
                            <span style={{ fontSize: '13px', fontWeight: 600, marginRight: '10px' }}>🔍 Query Filters:</span>
                            <div className="filter-group">
                                <label>From</label>
                                <input 
                                    type="text" 
                                    value={searchFrom} 
                                    onChange={(e) => setSearchFrom(e.target.value)} 
                                    placeholder="Search Origin..." 
                                />
                            </div>
                            <div className="filter-group">
                                <label>To</label>
                                <input 
                                    type="text" 
                                    value={searchTo} 
                                    onChange={(e) => setSearchTo(e.target.value)} 
                                    placeholder="Search Destination..." 
                                />
                            </div>
                            <button onClick={fetchSearchHistory} className="btn btn-primary" style={{ padding: '8px 15px' }}>Apply</button>
                            {(searchFrom || searchTo) && (
                                <button 
                                    onClick={() => {
                                        setSearchFrom('');
                                        setSearchTo('');
                                        // Delay to wait for state reset
                                        setTimeout(fetchSearchHistory, 50);
                                    }} 
                                    className="btn" 
                                    style={{ padding: '8px 15px', background: '#ccc', color: '#000' }}
                                >
                                    Clear
                                </button>
                            )}
                        </div>

                        {searchHistory.length === 0 ? (
                            <div className="no-logs-message">
                                <h3>No Search History Captured</h3>
                                <p style={{ marginTop: '10px' }}>Try searching flights from the home page first.</p>
                            </div>
                        ) : (
                            <div className="log-list">
                                {searchHistory.map((log) => (
                                    <div key={log._id} className="log-item" style={{ borderLeft: '4px solid var(--primary)' }}>
                                        <div className="log-item-header">
                                            <span style={{ fontWeight: 700, fontSize: '15px' }}>
                                                ✈️ {log.from} ➔ {log.to}
                                            </span>
                                            <span className="log-timestamp">{formatDate(log.timestamp)}</span>
                                        </div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                            MongoDB Document ID: <code style={{ color: '#0078d4' }}>{log._id}</code>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* Tab 3: User Activity Logs */}
                {!loading && activeTab === 'activity' && (
                    <>
                        <div className="filter-bar">
                            <span style={{ fontSize: '13px', fontWeight: 600, marginRight: '10px' }}>🔍 Query Filters:</span>
                            <div className="filter-group">
                                <label>Action Type</label>
                                <select 
                                    value={activityAction} 
                                    onChange={(e) => setActivityAction(e.target.value)}
                                >
                                    <option value="">All Actions</option>
                                    <option value="booking_attempt">Booking Attempt</option>
                                    <option value="passenger_register">Passenger Registration</option>
                                    <option value="payment_confirm">Payment Confirm</option>
                                </select>
                            </div>
                            <button onClick={fetchActivityLogs} className="btn btn-primary" style={{ padding: '8px 15px' }}>Apply</button>
                        </div>

                        {activityLogs.length === 0 ? (
                            <div className="no-logs-message">
                                <h3>No Activity Logs Captured</h3>
                                <p style={{ marginTop: '10px' }}>Try making flight bookings or registering passengers to populate this list.</p>
                            </div>
                        ) : (
                            <div className="log-list">
                                {activityLogs.map((log) => (
                                    <div key={log._id} className="log-item" style={{ borderLeft: '4px solid var(--success)' }}>
                                        <div className="log-item-header">
                                            <span style={{ fontWeight: 700, fontSize: '15px', textTransform: 'uppercase', color: 'var(--success)' }}>
                                                👤 {log.action.replace('_', ' ')}
                                            </span>
                                            <span className="log-timestamp">{formatDate(log.timestamp)}</span>
                                        </div>
                                        <div style={{ fontSize: '13px', color: 'var(--text-dark)' }}>
                                            Captured booking details dynamically in a flexible MongoDB schema.
                                        </div>
                                        
                                        <button 
                                            className="log-meta-btn"
                                            onClick={() => toggleExpand(log._id)}
                                        >
                                            {expandedLogs[log._id] ? '▼ Hide Metadata Document' : '▶ Expand MongoDB Object JSON'}
                                        </button>

                                        {expandedLogs[log._id] && (
                                            <pre className="log-meta-data">
                                                {JSON.stringify(log.details || {}, null, 2)}
                                            </pre>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* Tab 4: System Logs Terminal Dashboard */}
                {!loading && activeTab === 'system' && (
                    <>
                        <div className="filter-bar">
                            <span style={{ fontSize: '13px', fontWeight: 600, marginRight: '10px' }}>🔍 Query Filters:</span>
                            <div className="filter-group">
                                <label>Log Severity Level</label>
                                <select 
                                    value={systemLevel} 
                                    onChange={(e) => setSystemLevel(e.target.value)}
                                >
                                    <option value="">All Levels</option>
                                    <option value="INFO">INFO (Normal Events)</option>
                                    <option value="WARN">WARN (Conflicts/Warnings)</option>
                                    <option value="ERROR">ERROR (Server Failures)</option>
                                </select>
                            </div>
                            <button onClick={fetchSystemLogs} className="btn btn-primary" style={{ padding: '8px 15px' }}>Apply</button>
                        </div>

                        <div className="terminal-window">
                            <div className="terminal-header">
                                <div className="terminal-buttons">
                                    <span className="term-btn red"></span>
                                    <span className="term-btn yellow"></span>
                                    <span className="term-btn green"></span>
                                </div>
                                <span className="terminal-title">skylink-nosql-diagnostic-terminal - MongoDB Connection Active</span>
                                <span style={{ color: '#858585', fontSize: '11px' }}>Local Node server</span>
                            </div>
                            
                            <div className="terminal-body">
                                {systemLogs.length === 0 ? (
                                    <div style={{ color: '#858585', fontStyle: 'italic', textAlign: 'center', padding: '30px' }}>
                                        No system logs captured for the specified severity level.
                                    </div>
                                ) : (
                                    systemLogs.map((log) => {
                                        const lvl = log.level.toUpperCase();
                                        const typeClass = lvl === 'ERROR' ? 'error' : lvl === 'WARN' ? 'warn' : 'info';
                                        
                                        return (
                                            <div key={log._id} className={`terminal-line ${typeClass}`}>
                                                [{formatDate(log.timestamp)}] [{lvl}] {log.message}
                                                {log.meta && Object.keys(log.meta).length > 0 && (
                                                    <div style={{ paddingLeft: '20px', color: '#858585', fontSize: '12px' }}>
                                                        &gt;&gt; meta: {JSON.stringify(log.meta)}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </>
                )}

            </div>
        </div>
    );
};

export default LogsPage;
