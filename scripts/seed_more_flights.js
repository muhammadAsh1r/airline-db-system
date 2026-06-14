const scheduleService = require('../services/scheduleService');

const moreSchedules = [
    {
        airline_name: 'PIA',
        departure_city: 'Karachi',
        arrival_city: 'Islamabad',
        departure_time_daily: '08:00:00',
        arrival_time_daily: '10:00:00',
        frequency: 'Daily',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '2026-12-31',
        seat_templates: [
            { seat_number: '1A', seat_class: 'Business' },
            { seat_number: '1B', seat_class: 'Business' },
            { seat_number: '10A', seat_class: 'Economy' },
            { seat_number: '10B', seat_class: 'Economy' },
            { seat_number: '10C', seat_class: 'Economy' }
        ]
    },
    {
        airline_name: 'Airblue',
        departure_city: 'Karachi',
        arrival_city: 'Islamabad',
        departure_time_daily: '12:00:00',
        arrival_time_daily: '14:00:00',
        frequency: 'Daily',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '2026-12-31',
        seat_templates: [
            { seat_number: '2A', seat_class: 'Economy' },
            { seat_number: '2B', seat_class: 'Economy' },
            { seat_number: '5A', seat_class: 'Economy' },
            { seat_number: '5B', seat_class: 'Economy' }
        ]
    },
    {
        airline_name: 'Serene Air',
        departure_city: 'Karachi',
        arrival_city: 'Islamabad',
        departure_time_daily: '16:00:00',
        arrival_time_daily: '18:00:00',
        frequency: 'Daily',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '2026-12-31',
        seat_templates: [
            { seat_number: '1A', seat_class: 'First' },
            { seat_number: '5A', seat_class: 'Business' },
            { seat_number: '15A', seat_class: 'Economy' }
        ]
    },
    {
        airline_name: 'AirSial',
        departure_city: 'Karachi',
        arrival_city: 'Islamabad',
        departure_time_daily: '20:00:00',
        arrival_time_daily: '22:00:00',
        frequency: 'Daily',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '2026-12-31',
        seat_templates: [
            { seat_number: '1A', seat_class: 'Economy' },
            { seat_number: '1B', seat_class: 'Economy' }
        ]
    }
];

const seed = async () => {
    console.log('--- Seeding More Karachi -> Islamabad Flights ---');
    try {
        for (const schedule of moreSchedules) {
            await scheduleService.createSchedule(schedule);
            console.log(`Created schedule for ${schedule.airline_name}`);
        }
        console.log('--- Seeding Completed ---');
        process.exit(0);
    } catch (err) {
        console.error('--- Seeding Failed ---');
        console.error(err);
        process.exit(1);
    }
};

seed();
