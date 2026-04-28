const db = require('../config/db');

const createPassenger = async (data) => {
    const { name, email, phone_number, passport_number, given_names, surnames, nationality, gender, dob, passport_expiry } = data;
    
    const query = `
        INSERT INTO passenger (name, email, phone_number, passport_number, given_names, surnames, nationality, gender, dob, passport_expiry)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (email) DO UPDATE SET 
            name = EXCLUDED.name,
            given_names = EXCLUDED.given_names,
            surnames = EXCLUDED.surnames,
            phone_number = EXCLUDED.phone_number,
            passport_number = EXCLUDED.passport_number,
            nationality = EXCLUDED.nationality,
            gender = EXCLUDED.gender,
            dob = EXCLUDED.dob,
            passport_expiry = EXCLUDED.passport_expiry
        RETURNING *
    `;
    const { rows } = await db.query(query, [name, email, phone_number, passport_number, given_names, surnames, nationality, gender, dob, passport_expiry]);
    return rows[0];
};

module.exports = { createPassenger };
