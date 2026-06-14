const db = require('../config/db');

const createPassenger = async (data) => {
    const { 
        given_names, 
        surnames, 
        email, 
        phone_number, 
        passport_number, 
        nationality, 
        gender, 
        dob, 
        passport_expiry,
        type 
    } = data;
    
    const query = `
        INSERT INTO passenger (first_name, last_name, email, phone_number, passport_number, nationality, gender, dob, passport_expiry, passenger_type)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
    `;
    const params = [given_names, surnames, email, phone_number, passport_number, nationality, gender, dob, passport_expiry, type];
    const { rows } = await db.query(query, params);
    return rows[0];
};

module.exports = { createPassenger };
