const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const verifyAdmin = require('../middleware/verifyAdmin');

// Load env vars if not already loaded (though server.js usually does)
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key';

/**
 * POST /api/admin/login
 * Authenticate admin and return JWT
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required',
            });
        }

        // 1. Check if admin exists
        const result = await query(
            'SELECT * FROM admins WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials',
            });
        }

        const admin = result.rows[0];

        // 2. Validate password
        const isMatch = await bcrypt.compare(password, admin.password_hash);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials',
            });
        }

        // 3. Generate JWT
        const token = jwt.sign(
            { id: admin.id, email: admin.email, role: 'admin' },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        return res.json({
            success: true,
            message: 'Login successful',
            token,
            admin: {
                id: admin.id,
                email: admin.email,
                full_name: admin.full_name,
            },
        });

    } catch (error) {
        console.error('Admin login error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
        });
    }
});

/**
 * POST /api/admin/register
 * Create a new admin (Protected route)
 */
router.post('/register', verifyAdmin, async (req, res) => {
    try {
        const { email, password, full_name } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required',
            });
        }

        // Check availability
        const check = await query('SELECT * FROM admins WHERE email = $1', [email]);
        if (check.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Email already exists',
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        // Insert
        const result = await query(
            'INSERT INTO admins (email, password_hash, full_name) VALUES ($1, $2, $3) RETURNING id, email, full_name, created_at',
            [email, hash, full_name || null]
        );

        return res.status(201).json({
            success: true,
            message: 'Admin created successfully',
            admin: result.rows[0],
        });

    } catch (error) {
        console.error('Admin register error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
});

/**
 * GET /api/admin/me
 * Verify token and return admin info
 */
router.get('/me', verifyAdmin, (req, res) => {
    res.json({
        success: true,
        admin: req.admin,
    });
});

module.exports = router;
