const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const verifyAdmin = require('../middleware/verifyAdmin');
const { logger } = require('../config/logger');

// GET /api/settings/public - Get public system settings
router.get('/public', async (req, res) => {
    try {
        const result = await pool.query('SELECT retry_timer_minutes, maintenance_mode, maintenance_message FROM system_settings WHERE id = 1');
        if (result.rows.length === 0) {
            return res.status(200).json({
                success: true,
                settings: { retry_timer_minutes: 5, maintenance_mode: false, maintenance_message: '' }
            });
        }
        res.status(200).json({
            success: true,
            settings: result.rows[0]
        });
    } catch (error) {
        logger.error({ error: error.message }, 'Error fetching public settings');
        res.status(500).json({ success: false, message: 'Server error fetching settings' });
    }
});

// GET /api/settings - Get all settings (admin only)
router.get('/', verifyAdmin, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM system_settings WHERE id = 1');
        res.status(200).json({
            success: true,
            settings: result.rows[0] || { retry_timer_minutes: 5, maintenance_mode: false, maintenance_message: '' }
        });
    } catch (error) {
        logger.error({ error: error.message }, 'Error fetching all settings');
        res.status(500).json({ success: false, message: 'Server error fetching settings' });
    }
});

// PUT /api/settings - Update settings (admin only)
router.put('/', verifyAdmin, async (req, res) => {
    try {
        const { retry_timer_minutes, maintenance_mode, maintenance_message } = req.body;

        const result = await pool.query(
            `UPDATE system_settings 
             SET retry_timer_minutes = $1, 
                 maintenance_mode = $2, 
                 maintenance_message = $3, 
                 updated_at = CURRENT_TIMESTAMP 
             WHERE id = 1 
             RETURNING *`,
            [retry_timer_minutes, maintenance_mode, maintenance_message]
        );

        if (result.rows.length === 0) {
            // Need to insert if missing
            const insertResult = await pool.query(
                `INSERT INTO system_settings (id, retry_timer_minutes, maintenance_mode, maintenance_message) 
                 VALUES (1, $1, $2, $3) RETURNING *`,
                [retry_timer_minutes, maintenance_mode, maintenance_message]
            );
            return res.status(200).json({ success: true, settings: insertResult.rows[0], message: 'Settings updated successfully' });
        }

        res.status(200).json({
            success: true,
            settings: result.rows[0],
            message: 'Settings updated successfully'
        });
    } catch (error) {
        logger.error({ error: error.message }, 'Error updating settings');
        res.status(500).json({ success: false, message: 'Server error updating settings' });
    }
});

module.exports = router;
