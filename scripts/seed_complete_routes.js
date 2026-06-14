/**
 * Seeds daily flight schedules for every airport pair (both directions).
 * Run: node scripts/seed_complete_routes.js
 */
require('dotenv').config();
const db = require('../config/db');
const scheduleService = require('../services/scheduleService');

const CITIES = ['Karachi', 'Lahore', 'Islamabad', 'Dubai', 'London', 'New York'];
const PK_CITIES = new Set(['Karachi', 'Lahore', 'Islamabad']);

const SEAT_TEMPLATES = [
    { seat_number: '1A', seat_class: 'First' },
    { seat_number: '1B', seat_class: 'First' },
    { seat_number: '2A', seat_class: 'Business' },
    { seat_number: '2B', seat_class: 'Business' },
    { seat_number: '2C', seat_class: 'Business' },
    { seat_number: '2D', seat_class: 'Business' },
    { seat_number: '10A', seat_class: 'Economy' },
    { seat_number: '10B', seat_class: 'Economy' },
    { seat_number: '10C', seat_class: 'Economy' },
    { seat_number: '10D', seat_class: 'Economy' },
    { seat_number: '10E', seat_class: 'Economy' },
    { seat_number: '10F', seat_class: 'Economy' },
    { seat_number: '11A', seat_class: 'Economy' },
    { seat_number: '11B', seat_class: 'Economy' },
    { seat_number: '11C', seat_class: 'Economy' },
    { seat_number: '11D', seat_class: 'Economy' },
    { seat_number: '11E', seat_class: 'Economy' },
    { seat_number: '11F', seat_class: 'Economy' },
    { seat_number: '12A', seat_class: 'Economy' },
    { seat_number: '12B', seat_class: 'Economy' },
    { seat_number: '12C', seat_class: 'Economy' },
    { seat_number: '12D', seat_class: 'Economy' },
    { seat_number: '12E', seat_class: 'Economy' },
    { seat_number: '12F', seat_class: 'Economy' }
];

const DURATION_HOURS = {
    'Karachi|Lahore': 2,
    'Lahore|Karachi': 2,
    'Karachi|Islamabad': 2,
    'Islamabad|Karachi': 2,
    'Lahore|Islamabad': 1.25,
    'Islamabad|Lahore': 1.25,
    'Karachi|Dubai': 2.17,
    'Dubai|Karachi': 2.17,
    'Lahore|Dubai': 3.5,
    'Dubai|Lahore': 3.5,
    'Islamabad|Dubai': 3.25,
    'Dubai|Islamabad': 3.25,
    'Dubai|London': 7,
    'London|Dubai': 7,
    'Dubai|New York': 14,
    'New York|Dubai': 14,
    'London|New York': 8,
    'New York|London': 8,
    'Karachi|London': 8,
    'London|Karachi': 8,
    'Karachi|New York': 16,
    'New York|Karachi': 16,
    'Lahore|London': 7.5,
    'London|Lahore': 7.5,
    'Lahore|New York': 15,
    'New York|Lahore': 15,
    'Islamabad|London': 7.5,
    'London|Islamabad': 7.5,
    'Islamabad|New York': 15.5,
    'New York|Islamabad': 15.5
};

function getDuration(from, to) {
    return DURATION_HOURS[`${from}|${to}`] || 10;
}

function getAirlines(from, to) {
    const fromPk = PK_CITIES.has(from);
    const toPk = PK_CITIES.has(to);

    if (fromPk && toPk) {
        return ['PIA', 'Airblue', 'Serene Air'];
    }
    if ((fromPk && to === 'Dubai') || (toPk && from === 'Dubai')) {
        return ['Emirates', 'FlyDubai', 'PIA'];
    }
    if (from === 'Dubai' || to === 'Dubai') {
        return ['Emirates', 'British Airways'];
    }
    if (from === 'London' || to === 'London') {
        if (from === 'New York' || to === 'New York') {
            return ['British Airways', 'Virgin Atlantic'];
        }
        return ['British Airways', 'PIA', 'Emirates'];
    }
    if (from === 'New York' || to === 'New York') {
        return ['Emirates', 'PIA', 'British Airways'];
    }
    return ['PIA', 'Emirates'];
}

function addHoursToTime(timeStr, hours) {
    const [h, m, s] = timeStr.split(':').map(Number);
    const totalMinutes = h * 60 + m + Math.round(hours * 60);
    const newH = Math.floor(totalMinutes / 60) % 24;
    const newM = totalMinutes % 60;
    return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}:${String(s || 0).padStart(2, '0')}`;
}

function buildAllSchedules() {
    const schedules = [];
    const departureSlots = ['06:00:00', '10:00:00', '14:00:00', '18:00:00'];

    for (const from of CITIES) {
        for (const to of CITIES) {
            if (from === to) continue;

            const airlines = getAirlines(from, to);
            const duration = getDuration(from, to);
            const flightCount = PK_CITIES.has(from) && PK_CITIES.has(to) ? 3 : 2;

            for (let i = 0; i < flightCount; i++) {
                const airline = airlines[i % airlines.length];
                const departure_time_daily = departureSlots[i % departureSlots.length];
                const arrival_time_daily = addHoursToTime(departure_time_daily, duration);

                schedules.push({
                    airline_name: airline,
                    departure_city: from,
                    arrival_city: to,
                    departure_time_daily,
                    arrival_time_daily,
                    frequency: 'Daily',
                    day_of_week: null,
                    start_date: '2026-01-01',
                    end_date: '2027-12-31',
                    seat_templates: SEAT_TEMPLATES
                });
            }
        }
    }

    return schedules;
}

async function scheduleExists(schedule) {
    const { rows } = await db.query(
        `SELECT schedule_id FROM flight_schedule
         WHERE departure_city = $1 AND arrival_city = $2
           AND airline_name = $3 AND departure_time_daily = $4
           AND frequency = 'Daily'`,
        [schedule.departure_city, schedule.arrival_city, schedule.airline_name, schedule.departure_time_daily]
    );
    return rows.length > 0;
}

async function deactivateSparseSchedules() {
    const { rowCount } = await db.query(
        `UPDATE flight_schedule SET is_active = FALSE
         WHERE frequency IN ('Weekly', 'Monthly')`
    );
    console.log(`Deactivated ${rowCount} weekly/monthly schedules (replaced by daily flights).`);
}

async function seed() {
    console.log('--- Seeding complete daily routes for all airports ---');
    const schedules = buildAllSchedules();
    console.log(`Generated ${schedules.length} schedule definitions (${CITIES.length} airports, all pairs).`);

    await deactivateSparseSchedules();

    let created = 0;
    let skipped = 0;

    for (const schedule of schedules) {
        if (await scheduleExists(schedule)) {
            skipped++;
            continue;
        }
        await scheduleService.createSchedule(schedule);
        created++;
        console.log(`  + ${schedule.airline_name}: ${schedule.departure_city} → ${schedule.arrival_city} @ ${schedule.departure_time_daily}`);
    }

    console.log(`\nCreated ${created} new schedules, skipped ${skipped} existing.`);
    console.log('Regenerating flights for the next 30 days...');
    await scheduleService.generateAllFlights();
    console.log('--- Complete route seeding finished ---');
}

if (require.main === module) {
    seed()
        .then(() => process.exit(0))
        .catch((err) => {
            console.error('Seeding failed:', err);
            process.exit(1);
        });
}

module.exports = { buildAllSchedules, CITIES, SEAT_TEMPLATES };
