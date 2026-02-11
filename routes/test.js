const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
// const { cache } = require('../config/redis'); // DISABLED: Redis
// const { cacheMiddleware } = require('../middleware/cache'); // DISABLED: Redis
const verifyAdmin = require('../middleware/verifyAdmin');

/**
 * GET /api/tests/check-name/:name
 * Check if a test name is available
 */
router.get('/check-name/:name', verifyAdmin, async (req, res) => {
    try {
        const { name } = req.params;
        
        const result = await pool.query(
            'SELECT id FROM tests WHERE LOWER(title) = LOWER($1)',
            [name]
        );
        
        res.json({
            success: true,
            available: result.rows.length === 0,
            message: result.rows.length === 0 
                ? 'Test name is available' 
                : 'Test name already exists'
        });
    } catch (error) {
        console.error('Error checking test name:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check test name',
            error: error.message
        });
    }
});

/**
 * GET /api/tests
 * Fetch all tests with question counts
 */
router.get('/', verifyAdmin, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                t.id,
                t.title,
                t.description,
                t.created_at,
                t.status,
                t.duration,
                t.max_attempts,
                t.start_datetime,
                t.end_datetime,
                COUNT(q.id) as question_count
            FROM tests t
            LEFT JOIN questions q ON t.id = q.test_id
            GROUP BY t.id, t.title, t.description, t.created_at, t.status, t.duration, t.max_attempts, t.start_datetime, t.end_datetime
            ORDER BY t.created_at DESC
        `);

        res.json({
            success: true,
            tests: result.rows
        });
    } catch (error) {
        console.error('Error fetching tests:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch tests',
            error: error.message
        });
    }
});

/**
 * PUT /api/tests/:id/status
 * Update test status (draft/published/archived)
 */
router.put('/:id/status', verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        // Validate status
        if (!['draft', 'published', 'archived'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Must be draft, published, or archived'
            });
        }

        const result = await pool.query(
            'UPDATE tests SET status = $1 WHERE id = $2 RETURNING *',
            [status, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Test not found'
            });
        }

        // Invalidate cache
        // await cache.delPattern('cache:*'); // DISABLED: Redis

        res.json({
            success: true,
            message: `Test status updated to ${status}`,
            test: result.rows[0]
        });
    } catch (error) {
        console.error('Error updating test status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update test status',
            error: error.message
        });
    }
});

/**
 * DELETE /api/tests/:id
 * Delete a test and all related data (questions, exams, results, progress, assignments)
 */
router.delete('/:id', verifyAdmin, async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        
        console.log(`[DELETE TEST] Starting deletion for test ID: ${id}`);
        
        await client.query('BEGIN');
        
        // Get test details first
        const testResult = await client.query('SELECT title FROM tests WHERE id = $1', [id]);
        
        if (testResult.rows.length === 0) {
            await client.query('ROLLBACK');
            console.log(`[DELETE TEST] Test not found: ${id}`);
            return res.status(404).json({
                success: false,
                message: 'Test not found'
            });
        }
        
        const testTitle = testResult.rows[0].title;
        console.log(`[DELETE TEST] Deleting test: ${testTitle}`);
        
        // Delete test assignments (CASCADE will handle this, but being explicit)
        const assignmentsDeleted = await client.query('DELETE FROM test_assignments WHERE test_id = $1', [id]);
        console.log(`[DELETE TEST] Deleted ${assignmentsDeleted.rowCount} test assignments`);
        
        // Find all exams with matching name
        const examsResult = await client.query('SELECT id FROM exams WHERE name = $1', [testTitle]);
        const examIds = examsResult.rows.map(row => row.id);
        console.log(`[DELETE TEST] Found ${examIds.length} related exams`);
        
        if (examIds.length > 0) {
            // Delete results for these exams
            const resultsDeleted = await client.query('DELETE FROM results WHERE exam_id = ANY($1)', [examIds]);
            console.log(`[DELETE TEST] Deleted ${resultsDeleted.rowCount} results`);
            
            // Delete the exams
            const examsDeleted = await client.query('DELETE FROM exams WHERE id = ANY($1)', [examIds]);
            console.log(`[DELETE TEST] Deleted ${examsDeleted.rowCount} exams`);
        }
        
        // Delete exam progress for this test
        const progressDeleted = await client.query('DELETE FROM exam_progress WHERE test_id = $1', [id]);
        console.log(`[DELETE TEST] Deleted ${progressDeleted.rowCount} exam progress records`);
        
        // Delete questions (CASCADE should handle this, but being explicit)
        const questionsDeleted = await client.query('DELETE FROM questions WHERE test_id = $1', [id]);
        console.log(`[DELETE TEST] Deleted ${questionsDeleted.rowCount} questions`);
        
        // Finally delete the test itself
        const testDeleted = await client.query('DELETE FROM tests WHERE id = $1', [id]);
        console.log(`[DELETE TEST] Deleted test: ${testDeleted.rowCount}`);
        
        await client.query('COMMIT');
        console.log(`[DELETE TEST] Successfully deleted test ID: ${id}`);

        // Invalidate cache
        // await cache.delPattern('cache:*'); // DISABLED: Redis

        res.json({
            success: true,
            message: 'Test and all related data deleted successfully'
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('[DELETE TEST] Error deleting test:', error);
        console.error('[DELETE TEST] Error stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Failed to delete test',
            error: error.message
        });
    } finally {
        client.release();
    }
});

/**
 * GET /api/tests/institutes
 * Fetch all institutes with their student counts
 */
router.get('/institutes', verifyAdmin, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                LOWER(institute) as institute,
                COUNT(*) as student_count,
                STRING_AGG(full_name, ', ') as student_names
            FROM students
            WHERE institute IS NOT NULL AND institute != ''
            GROUP BY LOWER(institute)
            ORDER BY LOWER(institute) ASC
        `);

        res.json({
            success: true,
            institutes: result.rows
        });
    } catch (error) {
        console.error('Error fetching institutes:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch institutes',
            error: error.message
        });
    }
});

/**
 * GET /api/tests/institutes/:instituteName/students
 * Fetch all students from a specific institute
 */
router.get('/institutes/:instituteName/students', verifyAdmin, async (req, res) => {
    try {
        const { instituteName } = req.params;
        
        const result = await pool.query(`
            SELECT 
                id,
                full_name,
                email,
                roll_number,
                institute,
                created_at
            FROM students
            WHERE LOWER(institute) = LOWER($1)
            ORDER BY full_name ASC
        `, [instituteName]);

        res.json({
            success: true,
            institute: instituteName,
            students: result.rows
        });
    } catch (error) {
        console.error('Error fetching students:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch students',
            error: error.message
        });
    }
});

/**
 * POST /api/tests/assign
 * Assign a test to specific students
 */
router.post('/assign', verifyAdmin, async (req, res) => {
    const client = await pool.connect();
    try {
        const { test_id, student_ids } = req.body;

        if (!test_id || !student_ids || !Array.isArray(student_ids) || student_ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'test_id and student_ids array are required'
            });
        }

        // Verify test exists
        const testCheck = await client.query('SELECT id FROM tests WHERE id = $1', [test_id]);
        
        if (testCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Test not found'
            });
        }

        await client.query('BEGIN');

        // Create test_assignments table if it doesn't exist
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

        // Insert assignments (on conflict, update assigned_at)
        const insertPromises = student_ids.map(student_id =>
            client.query(`
                INSERT INTO test_assignments (test_id, student_id, is_active)
                VALUES ($1, $2, true)
                ON CONFLICT (test_id, student_id) 
                DO UPDATE SET assigned_at = CURRENT_TIMESTAMP, is_active = true
            `, [test_id, student_id])
        );

        await Promise.all(insertPromises);
        await client.query('COMMIT');

        // Invalidate cache
        // await cache.delPattern('cache:*'); // DISABLED: Redis

        res.json({
            success: true,
            message: `Test assigned to ${student_ids.length} student(s)`,
            assigned_count: student_ids.length
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error assigning test:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to assign test',
            error: error.message
        });
    } finally {
        client.release();
    }
});

/**
 * GET /api/tests/:testId/assignments
 * Get all students assigned to a specific test
 */
router.get('/:testId/assignments', verifyAdmin, async (req, res) => {
    try {
        const { testId } = req.params;
        
        const result = await pool.query(`
            SELECT 
                s.id,
                s.full_name,
                s.email,
                s.roll_number,
                s.institute,
                ta.assigned_at,
                ta.is_active
            FROM test_assignments ta
            JOIN students s ON ta.student_id = s.id
            WHERE ta.test_id = $1 AND ta.is_active = true
            ORDER BY s.institute, s.full_name
        `, [testId]);

        res.json({
            success: true,
            test_id: parseInt(testId),
            assignments: result.rows
        });
    } catch (error) {
        console.error('Error fetching assignments:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch assignments',
            error: error.message
        });
    }
});

module.exports = router;