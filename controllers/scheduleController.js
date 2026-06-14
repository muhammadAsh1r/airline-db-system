const scheduleService = require('../services/scheduleService');

const createSchedule = async (req, res) => {
    try {
        const schedule = await scheduleService.createSchedule(req.body);
        res.status(201).json({
            message: 'Schedule created and flights generated successfully',
            schedule
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const getSchedules = async (req, res) => {
    try {
        const schedules = await scheduleService.getSchedules();
        res.json(schedules);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const triggerGeneration = async (req, res) => {
    try {
        await scheduleService.generateAllFlights();
        res.json({ message: 'Flight generation triggered successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = {
    createSchedule,
    getSchedules,
    triggerGeneration
};
