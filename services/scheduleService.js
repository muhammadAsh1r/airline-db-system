const db = require('../config/db');

/**
 * Creates a new flight schedule along with its seat templates.
 */
const createSchedule = async (scheduleData) => {
    const {
        airline_name,
        departure_city,
        arrival_city,
        departure_time_daily,
        arrival_time_daily,
        frequency,
        day_of_week,
        start_date,
        end_date,
        seat_templates
    } = scheduleData;

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Insert schedule
        const scheduleQuery = `
            INSERT INTO flight_schedule 
            (airline_name, departure_city, arrival_city, departure_time_daily, arrival_time_daily, frequency, day_of_week, start_date, end_date)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING schedule_id
        `;
        const { rows } = await client.query(scheduleQuery, [
            airline_name, departure_city, arrival_city, departure_time_daily, arrival_time_daily, frequency, day_of_week, start_date, end_date
        ]);
        const scheduleId = rows[0].schedule_id;

        // 2. Insert seat templates
        if (seat_templates && seat_templates.length > 0) {
            const templateQuery = `
                INSERT INTO schedule_seat_template (schedule_id, seat_number, seat_class)
                VALUES ($1, $2, $3)
            `;
            for (const seat of seat_templates) {
                await client.query(templateQuery, [scheduleId, seat.seat_number, seat.seat_class]);
            }
        }

        await client.query('COMMIT');
        
        // 3. Generate initial flights (e.g., for the next 30 days)
        await generateFlightsFromSchedule(scheduleId, 30);

        return { scheduleId, ...scheduleData };
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

/**
 * Generates actual flight records for a given schedule within a window.
 */
const generateFlightsFromSchedule = async (scheduleId, daysAhead = 30) => {
    const { rows: schedules } = await db.query('SELECT * FROM flight_schedule WHERE schedule_id = $1', [scheduleId]);
    if (schedules.length === 0) throw new Error('Schedule not found');
    const schedule = schedules[0];

    const { rows: templates } = await db.query('SELECT * FROM schedule_seat_template WHERE schedule_id = $1', [scheduleId]);

    const startDate = new Date(Math.max(new Date(schedule.start_date), new Date()));
    const endDate = new Date(schedule.end_date);
    const horizonDate = new Date();
    horizonDate.setDate(horizonDate.getDate() + daysAhead);

    const generationEndDate = new Date(Math.min(endDate, horizonDate));

    let currentDate = new Date(startDate);
    while (currentDate <= generationEndDate) {
        let shouldGenerate = false;

        if (schedule.frequency === 'Daily') {
            shouldGenerate = true;
        } else if (schedule.frequency === 'Weekly') {
            if (currentDate.getDay() === schedule.day_of_week) {
                shouldGenerate = true;
            }
        } else if (schedule.frequency === 'Monthly') {
            // Match the same day of the month as the schedule's start_date
            const startDay = new Date(schedule.start_date).getDate();
            if (currentDate.getDate() === startDay) {
                shouldGenerate = true;
            }
        }


        if (shouldGenerate) {
            await createFlightInstance(schedule, currentDate, templates);
        }

        currentDate.setDate(currentDate.getDate() + 1);
    }
};

/**
 * Creates a single flight instance and its seats.
 */
const createFlightInstance = async (schedule, date, templates) => {
    const dateStr = date.toISOString().split('T')[0];
    const departure_time = `${dateStr} ${schedule.departure_time_daily}`;
    const arrival_time = `${dateStr} ${schedule.arrival_time_daily}`;

    // Check if flight already exists for this schedule and time
    const checkQuery = 'SELECT flight_id FROM flight WHERE schedule_id = $1 AND departure_time = $2';
    const { rows: existing } = await db.query(checkQuery, [schedule.schedule_id, departure_time]);
    
    if (existing.length > 0) return; // Already generated

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Insert Flight
        const flightQuery = `
            INSERT INTO flight (airline_name, departure_city, arrival_city, departure_time, arrival_time, schedule_id)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING flight_id
        `;
        const { rows: flightRows } = await client.query(flightQuery, [
            schedule.airline_name, schedule.departure_city, schedule.arrival_city, departure_time, arrival_time, schedule.schedule_id
        ]);
        const flightId = flightRows[0].flight_id;

        // 2. Insert Seats from templates
        if (templates && templates.length > 0) {
            const seatQuery = `
                INSERT INTO seat (flight_id, seat_number, seat_class, seat_status)
                VALUES ($1, $2, $3, 'Available')
            `;
            for (const t of templates) {
                await client.query(seatQuery, [flightId, t.seat_number, t.seat_class]);
            }
        }

        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(`Failed to generate flight for ${dateStr}:`, err.message);
    } finally {
        client.release();
    }
};

const getSchedules = async () => {
    const query = 'SELECT * FROM flight_schedule ORDER BY created_at DESC';
    const { rows } = await db.query(query);
    return rows;
};

const generateAllFlights = async () => {
    const { rows: schedules } = await db.query('SELECT schedule_id FROM flight_schedule WHERE is_active = TRUE');
    for (const s of schedules) {
        await generateFlightsFromSchedule(s.schedule_id, 30);
    }
};

module.exports = {
    createSchedule,
    generateFlightsFromSchedule,
    getSchedules,
    generateAllFlights
};
