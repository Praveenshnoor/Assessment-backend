const { pool } = require('../config/db');
const { logger } = require('../config/logger');

const checkMaintenance = async (req, res, next) => {
    try {
        const result = await pool.query('SELECT maintenance_mode, maintenance_message FROM system_settings WHERE id = 1');
        if (result.rows.length > 0 && result.rows[0].maintenance_mode) {
            return res.status(503).json({
                success: false,
                code: 'MAINTENANCE',
                message: result.rows[0].maintenance_message || 'The system is currently undergoing scheduled maintenance. Please check back later.'
            });
        }
        next();
    } catch (error) {
        logger.error({ error: error.message }, 'Error checking maintenance mode');
        // If fetching settings fails (e.g. database down), we proceed, 
        // as the actual route will likely fail and hit the Catch/Server Down logic anyway.
        next();
    }
};

module.exports = { checkMaintenance };