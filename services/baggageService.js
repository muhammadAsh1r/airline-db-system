const db = require('../config/db');

const addBaggage = async (passengerId, weight, cost) => {
    const query = `
        INSERT INTO baggage (passenger_id, weight_selected, extra_cost)
        VALUES ($1, $2, $3)
        RETURNING *;
    `;
    const { rows } = await db.query(query, [passengerId, weight, cost]);
    return rows[0];
};

const getBaggageByPassenger = async (passengerId) => {
    const query = 'SELECT * FROM baggage WHERE passenger_id = $1';
    const { rows } = await db.query(query, [passengerId]);
    return rows[0];
};

module.exports = { addBaggage, getBaggageByPassenger };
