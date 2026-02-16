const express = require('express');
const router = express.Router();
const { query, pool } = require('../config/db');
const verifyToken = require('../middleware/verifyToken');

/**
 * POST /api/register
 * Register a new student in PostgreSQL after Firebase registration
 * Frontend should register user in Firebase first, then call this endpoint
 */
router.post('/register', verifyToken, async (req, res) => {
    const client = await pool.connect();
    try {
        const { full_name, email, roll_number, institute, phone, address, course, specialization, resume_link } = req.body;
        const firebase_uid = req.firebaseUid;

        if (!full_name || !email || !roll_number || !institute) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: full_name, email, roll_number, institute',
            });
        }

        const normalizedInstitute = institute.trim().toLowerCase();
        const displayInstitute = institute.trim();

        await client.query('BEGIN');

        // Ensure required columns exist in students table
        await client.query(`
            ALTER TABLE students ADD COLUMN IF NOT EXISTS institute VARCHAR(255);
        `);
        await client.query(`
            ALTER TABLE students ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
        `);
        await client.query(`
            ALTER TABLE students ADD COLUMN IF NOT EXISTS address TEXT;
        `);
        await client.query(`
            ALTER TABLE students ADD COLUMN IF NOT EXISTS course VARCHAR(100);
        `);
        await client.query(`
            ALTER TABLE students ADD COLUMN IF NOT EXISTS specialization VARCHAR(100);
        `);
        await client.query(`
            ALTER TABLE students ADD COLUMN IF NOT EXISTS resume_link VARCHAR(500);
        `);

        // Check if user already exists
        const existingUser = await client.query(
            'SELECT * FROM students WHERE firebase_uid = $1 OR email = $2 OR roll_number = $3',
            [firebase_uid, email, roll_number]
        );

        if (existingUser.rows.length > 0) {
            await client.query('ROLLBACK');
            const existing = existingUser.rows[0];

            if (existing.firebase_uid === firebase_uid) {
                return res.status(409).json({
                    success: false,
                    message: 'User already registered with this Firebase account',
                });
            }

            if (existing.email === email) {
                return res.status(409).json({
                    success: false,
                    message: 'Email already registered',
                });
            }

            if (existing.roll_number === roll_number) {
                return res.status(409).json({
                    success: false,
                    message: 'Roll number already registered',
                });
            }
        }

        // Create institutes table if it doesn't exist
        await client.query(`
            CREATE TABLE IF NOT EXISTS institutes (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                display_name VARCHAR(255) NOT NULL,
                created_by VARCHAR(255) DEFAULT 'admin',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT true
            )
        `);

        // Check if institute exists, if not create it
        const instituteCheck = await client.query(
            'SELECT name, display_name FROM institutes WHERE name = $1 AND is_active = true',
            [normalizedInstitute]
        );

        if (instituteCheck.rows.length === 0) {
            // Institute doesn't exist, create it
            await client.query(
                `INSERT INTO institutes (name, display_name, created_by) 
                 VALUES ($1, $2, 'student_registration')
                 ON CONFLICT (name) DO NOTHING`,
                [normalizedInstitute, displayInstitute]
            );
        }

        // Insert new student into database
        const result = await client.query(
            `INSERT INTO students (firebase_uid, full_name, email, roll_number, institute, phone, address, course, specialization, resume_link) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
             RETURNING id, firebase_uid, full_name, email, roll_number, institute, phone, address, course, specialization, resume_link, created_at`,
            [firebase_uid, full_name, email, roll_number, normalizedInstitute, phone || null, address || null, course || null, specialization || null, resume_link || null]
        );

        const newUser = result.rows[0];

        // Check if there are any test assignments for this institute and auto-assign them to the new student
        await client.query(`
            CREATE TABLE IF NOT EXISTS test_assignments (
                id SERIAL PRIMARY KEY,
                test_id INTEGER REFERENCES tests(id) ON DELETE CASCADE,
                student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
                assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT true,
                UNIQUE(test_id, student_id)
            )
        `);

        // Create institute_test_assignments table if it doesn't exist
        await client.query(`
            CREATE TABLE IF NOT EXISTS institute_test_assignments (
                id SERIAL PRIMARY KEY,
                institute_id INTEGER REFERENCES institutes(id) ON DELETE CASCADE,
                test_id INTEGER REFERENCES tests(id) ON DELETE CASCADE,
                assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT true,
                UNIQUE(institute_id, test_id)
            )
        `);

        // Check if the institute exists in the institutes table
        const instituteRecord = await client.query(
            'SELECT id FROM institutes WHERE name = $1 AND is_active = true',
            [normalizedInstitute]
        );

        let testsToAssign = [];

        // Method 1: Check for institute-level test assignments (new approach)
        if (instituteRecord.rows.length > 0) {
            const instituteId = instituteRecord.rows[0].id;
            const instituteTests = await client.query(
                `SELECT test_id
                 FROM institute_test_assignments
                 WHERE institute_id = $1 AND is_active = true`,
                [instituteId]
            );
            testsToAssign = instituteTests.rows.map(row => row.test_id);
        }

        // Method 2: Fallback - check if any student from the same institute has assignments (old approach)
        if (testsToAssign.length === 0) {
            const instituteTests = await client.query(
                `SELECT DISTINCT ta.test_id
                 FROM test_assignments ta
                 JOIN students s ON ta.student_id = s.id
                 WHERE LOWER(s.institute) = $1 AND ta.is_active = true`,
                [normalizedInstitute]
            );
            testsToAssign = instituteTests.rows.map(row => row.test_id);
        }

        // Auto-assign those tests to the new student
        if (testsToAssign.length > 0) {
            for (const testId of testsToAssign) {
                await client.query(
                    `INSERT INTO test_assignments (test_id, student_id, is_active)
                     VALUES ($1, $2, true)
                     ON CONFLICT (test_id, student_id) DO NOTHING`,
                    [testId, newUser.id]
                );
            }
        }

        await client.query('COMMIT');

        return res.status(201).json({
            success: true,
            message: 'Registration successful',
            user: {
                id: newUser.id,
                firebase_uid: newUser.firebase_uid,
                full_name: newUser.full_name,
                email: newUser.email,
                roll_number: newUser.roll_number,
                institute: newUser.institute,
                phone: newUser.phone,
                address: newUser.address,
                course: newUser.course,
                specialization: newUser.specialization,
                created_at: newUser.created_at,
            },
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Registration error:', error);

        // Handle database-specific errors
        if (error.code === '23505') { // Unique violation
            return res.status(409).json({
                success: false,
                message: 'User with this information already exists',
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Internal server error during registration',
            error: error.message,
        });
    } finally {
        client.release();
    }
});

/**
 * POST /api/login
 * Verify Firebase token and return student profile from PostgreSQL
 * Frontend should authenticate with Firebase first, then call this endpoint
 */
router.post('/login', verifyToken, async (req, res) => {
    try {
        const firebase_uid = req.firebaseUid; // From verifyToken middleware

        const result = await query(
            'SELECT id, firebase_uid, full_name, email, roll_number, institute, phone, address, course, specialization, created_at FROM students WHERE firebase_uid = $1',
            [firebase_uid]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Student profile not found. Please register first.',
            });
        }

        const student = result.rows[0];

        return res.status(200).json({
            success: true,
            message: 'Login successful',
            user: {
                id: student.id,
                firebase_uid: student.firebase_uid,
                full_name: student.full_name,
                email: student.email,
                roll_number: student.roll_number,
                institute: student.institute,
                phone: student.phone,
                address: student.address,
                course: student.course,
                specialization: student.specialization,
                created_at: student.created_at,
            },
        });
    } catch (error) {
        console.error('Login error:', error);

        return res.status(500).json({
            success: false,
            message: 'Internal server error during login',
            error: error.message,
        });
    }
});

/**
 * GET /api/profile
 * Get current user's profile (protected route example)
 */
router.get('/profile', verifyToken, async (req, res) => {
    try {
        const firebase_uid = req.firebaseUid;

        const result = await query(
            'SELECT id, firebase_uid, full_name, email, roll_number, institute, phone, address, course, specialization, created_at FROM students WHERE firebase_uid = $1',
            [firebase_uid]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Profile not found',
            });
        }

        return res.status(200).json({
            success: true,
            user: result.rows[0],
        });
    } catch (error) {
        console.error('Profile fetch error:', error);

        return res.status(500).json({
            success: false,
            message: 'Error fetching profile',
            error: error.message,
        });
    }
});

module.exports = router;
