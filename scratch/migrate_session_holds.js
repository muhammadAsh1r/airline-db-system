/**
 * Adds session_id column to seat_reservations for existing databases.
 * Run: node scratch/migrate_session_holds.js
 */
require('dotenv').config();
const db = require('../config/db');

async function migrate() {
    await db.query(`
        ALTER TABLE seat_reservations
        ADD COLUMN IF NOT EXISTS session_id VARCHAR(64)
    `);
    console.log('Added session_id column to seat_reservations (if missing).');
    process.exit(0);
}

migrate().catch((err) => {
    console.error('Migration failed:', err.message);
    process.exit(1);
});
