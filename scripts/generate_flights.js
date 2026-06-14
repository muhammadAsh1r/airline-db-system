const scheduleService = require('../services/scheduleService');

/**
 * Script to be run periodically (e.g. daily) to ensure 
 * flights are generated for the upcoming window.
 */
const run = async () => {
    console.log('--- Starting Flight Generation ---');
    try {
        await scheduleService.generateAllFlights();
        console.log('--- Flight Generation Completed Successfully ---');
        process.exit(0);
    } catch (err) {
        console.error('--- Flight Generation Failed ---');
        console.error(err);
        process.exit(1);
    }
};

run();
