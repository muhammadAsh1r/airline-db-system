const db = require('../config/db');

const getAirports = async (req, res) => {
    try {
        const { rows } = await db.query('SELECT name, city, country, iata_code FROM airport ORDER BY country, city');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getAirports };
