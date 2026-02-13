const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const verifyAdmin = require('../middleware/verifyAdmin');

/**
 * GET /api/institutes
 * Fetch all institutes (admin only)
 */
router.get('/', verifyAdmin, async (req, res) => {
    try {
        console.log('=== GET /api/institutes called ===');
        
        // First create the institute_test_assignments table if it doesn't exist
        await pool.query(`
            CREATE TABLE IF NOT EXISTS institute_test_assignments (
                id SERIAL PRIMARY KEY,
                institute_id INTEGER REFERENCES institutes(id) ON DELETE CASCADE,
                test_id INTEGER REFERENCES tests(id) ON DELETE CASCADE,
                assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT true,
                UNIQUE(institute_id, test_id)
            )
        `);
        
        console.log('institute_test_assignments table ensured');

        // Auto-create missing institute records for existing students
        // Handle both 'institute' and 'college_name' fields for legacy data
        await pool.query(`
            INSERT INTO institutes (name, display_name, created_by)
            SELECT DISTINCT 
                LOWER(TRIM(institute_value)) as name,
                TRIM(institute_value) as display_name,
                'auto_migration' as created_by
            FROM (
                SELECT COALESCE(NULLIF(TRIM(s.institute), ''), NULLIF(TRIM(s.college_name), ''), 'Not Specified') as institute_value
                FROM students s
                WHERE (s.institute IS NOT NULL AND TRIM(s.institute) != '') 
                   OR (s.college_name IS NOT NULL AND TRIM(s.college_name) != '')
            ) AS combined_institutes
            WHERE NOT EXISTS (
                SELECT 1 FROM institutes i 
                WHERE i.name = LOWER(TRIM(institute_value))
            )
        `);

        console.log('Missing institutes auto-created from both institute and college_name fields');

        // Migrate college_name data to institute field for students who have college_name but no institute
        await pool.query(`
            UPDATE students 
            SET institute = COALESCE(NULLIF(TRIM(institute), ''), NULLIF(TRIM(college_name), ''), 'not specified')
            WHERE institute IS NULL OR TRIM(institute) = ''
        `);

        console.log('College data migrated to institute field');

        // Get all institutes (including auto-created ones) with student counts
        const result = await pool.query(`
            SELECT 
                i.id,
                i.name,
                i.display_name,
                i.created_at,
                i.is_active,
                COUNT(DISTINCT s.id) as student_count,
                COALESCE(
                    (
                        SELECT COUNT(DISTINCT ita.test_id)
                        FROM institute_test_assignments ita
                        WHERE ita.institute_id = i.id
                    ), 0
                ) + COALESCE(
                    (
                        SELECT COUNT(DISTINCT ta.test_id)
                        FROM test_assignments ta
                        JOIN students st ON ta.student_id = st.id
                        WHERE LOWER(st.institute) = i.name
                    ), 0
                ) as assigned_tests_count
            FROM institutes i
            LEFT JOIN students s ON LOWER(s.institute) = i.name
            WHERE i.is_active = true
            GROUP BY i.id, i.name, i.display_name, i.created_at, i.is_active
            ORDER BY i.created_at DESC
        `);

        console.log('Query executed successfully');
        console.log('Institutes found:', result.rows.length);
        console.log('Institutes data:', JSON.stringify(result.rows, null, 2));

        res.json({
            success: true,
            institutes: result.rows
        });
    } catch (error) {
        console.error('Error fetching institutes:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch institutes',
            error: error.message
        });
    }
});

/**
 * POST /api/institutes
 * Create a new institute (admin only)
 */
router.post('/', verifyAdmin, async (req, res) => {
    try {
        const { instituteName } = req.body;

        if (!instituteName || instituteName.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Institute name is required'
            });
        }

        const trimmedName = instituteName.trim();
        const normalizedName = trimmedName.toLowerCase();

        // Check if institute already exists
        const existingInstitute = await pool.query(
            'SELECT * FROM institutes WHERE name = $1',
            [normalizedName]
        );

        if (existingInstitute.rows.length > 0) {
            const institute = existingInstitute.rows[0];
            
            // If institute exists but is inactive, reactivate it
            if (!institute.is_active) {
                const result = await pool.query(
                    'UPDATE institutes SET is_active = true, display_name = $1 WHERE id = $2 RETURNING id, name, display_name, created_at, is_active',
                    [trimmedName, institute.id]
                );
                
                return res.status(200).json({
                    success: true,
                    message: 'Institute reactivated successfully',
                    institute: result.rows[0]
                });
            }
            
            // If active, return conflict error
            return res.status(409).json({
                success: false,
                message: 'Institute already exists',
                institute: institute
            });
        }

        // Insert new institute
        const result = await pool.query(`
            INSERT INTO institutes (name, display_name)
            VALUES ($1, $2)
            RETURNING id, name, display_name, created_at, is_active
        `, [normalizedName, trimmedName]);

        const newInstitute = result.rows[0];

        res.status(201).json({
            success: true,
            message: 'Institute created successfully',
            institute: newInstitute
        });
    } catch (error) {
        console.error('Error creating institute:', error);
        
        // Handle unique constraint violation
        if (error.code === '23505') {
            return res.status(409).json({
                success: false,
                message: 'Institute already exists'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to create institute',
            error: error.message
        });
    }
});

/**
 * GET /api/institutes/:instituteName/students
 * Get all students from a specific institute (admin only)
 */
router.get('/:instituteName/students', verifyAdmin, async (req, res) => {
    try {
        const { instituteName } = req.params;
        
        // Auto-create institute record if it doesn't exist but has students
        await pool.query(`
            INSERT INTO institutes (name, display_name, created_by)
            SELECT DISTINCT 
                LOWER(TRIM($1)) as name,
                TRIM($1) as display_name,
                'auto_migration' as created_by
            WHERE EXISTS (
                SELECT 1 FROM students s 
                WHERE LOWER(s.institute) = LOWER(TRIM($1))
            )
            AND NOT EXISTS (
                SELECT 1 FROM institutes i 
                WHERE i.name = LOWER(TRIM($1))
            )
        `, [instituteName]);
        
        const result = await pool.query(`
            SELECT 
                s.id,
                s.full_name,
                s.email,
                s.roll_number,
                s.institute,
                s.created_at,
                COUNT(DISTINCT ta.test_id) as assigned_tests_count
            FROM students s
            LEFT JOIN test_assignments ta ON s.id = ta.student_id
            WHERE LOWER(s.institute) = LOWER($1)
            GROUP BY s.id, s.full_name, s.email, s.roll_number, s.institute, s.created_at
            ORDER BY s.full_name ASC
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
 * POST /api/institutes/:instituteId/assign-test
 * Assign a test to an institute (admin only)
 * This creates an institute-level assignment that applies to all current and future students
 */
router.post('/:instituteId/assign-test', verifyAdmin, async (req, res) => {
    const client = await pool.connect();
    try {
        const { instituteId } = req.params;
        const { test_id } = req.body;

        if (!test_id) {
            return res.status(400).json({
                success: false,
                message: 'test_id is required'
            });
        }

        await client.query('BEGIN');

        // Verify institute exists
        const instituteResult = await client.query(
            'SELECT id, name FROM institutes WHERE id = $1 AND is_active = true',
            [instituteId]
        );

        if (instituteResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                message: 'Institute not found'
            });
        }

        const instituteName = instituteResult.rows[0].name;

        // Verify test exists
        const testCheck = await client.query('SELECT id, title FROM tests WHERE id = $1', [test_id]);
        if (testCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                message: 'Test not found'
            });
        }

        const testTitle = testCheck.rows[0].title;

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

        // Check if test is already assigned to this institute
        const existingAssignment = await client.query(
            'SELECT id FROM institute_test_assignments WHERE institute_id = $1 AND test_id = $2',
            [instituteId, test_id]
        );

        if (existingAssignment.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({
                success: false,
                message: `Test "${testTitle}" is already assigned to this institute`,
                already_assigned: true
            });
        }

        // Create the institute-level assignment
        await client.query(`
            INSERT INTO institute_test_assignments (institute_id, test_id)
            VALUES ($1, $2)
        `, [instituteId, test_id]);

        // Also assign to all existing students in this institute
        const studentsResult = await client.query(
            'SELECT id FROM students WHERE LOWER(institute) = $1',
            [instituteName]
        );

        let assignedToStudents = 0;
        if (studentsResult.rows.length > 0) {
            const studentIds = studentsResult.rows.map(row => row.id);

            // Create test_assignments table if not exists
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

            // Assign test to all existing students
            const insertPromises = studentIds.map(student_id =>
                client.query(`
                    INSERT INTO test_assignments (test_id, student_id)
                    VALUES ($1, $2)
                    ON CONFLICT (test_id, student_id) 
                    DO NOTHING
                `, [test_id, student_id])
            );

            await Promise.all(insertPromises);
            assignedToStudents = studentIds.length;
        }

        await client.query('COMMIT');

        res.json({
            success: true,
            message: assignedToStudents > 0 
                ? `Test "${testTitle}" assigned to institute and ${assignedToStudents} existing student(s). Future students will automatically receive this test.`
                : `Test "${testTitle}" assigned to institute. Students who register with this institute will automatically receive this test.`,
            assigned_count: assignedToStudents,
            institute_assignment: true
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error assigning test to institute:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to assign test to institute',
            error: error.message
        });
    } finally {
        client.release();
    }
});

/**
 * DELETE /api/institutes/:id
 * Soft delete an institute (admin only)
 * Note: This doesn't delete students, just marks institute as inactive
 */
router.delete('/:id', verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        // Soft delete the institute (allowed even with students)
        const result = await pool.query(
            'UPDATE institutes SET is_active = false WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Institute not found'
            });
        }

        res.json({
            success: true,
            message: 'Institute deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting institute:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete institute',
            error: error.message
        });
    }
});

/**
 * GET /api/institutes/:id/assigned-tests
 * Get all tests assigned to a specific institute (admin only)
 */
router.get('/:id/assigned-tests', verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        // Verify institute exists
        const instituteResult = await pool.query(
            'SELECT id, name, display_name FROM institutes WHERE id = $1 AND is_active = true',
            [id]
        );

        if (instituteResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Institute not found'
            });
        }

        const institute = instituteResult.rows[0];

        // Get all tests assigned to this institute (both institute-level and student-level)
        const result = await pool.query(`
            SELECT DISTINCT
                t.id,
                t.title,
                COUNT(DISTINCT q.id) as question_count,
                t.duration as duration_minutes,
                CASE 
                    WHEN ita.id IS NOT NULL THEN true 
                    ELSE false 
                END as is_institute_level
            FROM tests t
            LEFT JOIN institute_test_assignments ita 
                ON t.id = ita.test_id 
                AND ita.institute_id = $1
            LEFT JOIN students s ON LOWER(s.institute) = $2
            LEFT JOIN test_assignments ta 
                ON t.id = ta.test_id 
                AND s.id = ta.student_id
            LEFT JOIN questions q ON t.id = q.test_id
            WHERE (ita.id IS NOT NULL OR ta.id IS NOT NULL)
            GROUP BY t.id, t.title, t.duration, ita.id
            ORDER BY t.title ASC
        `, [id, institute.name]);

        res.json({
            success: true,
            institute: institute,
            tests: result.rows
        });
    } catch (error) {
        console.error('Error fetching assigned tests:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch assigned tests',
            error: error.message
        });
    }
});

/**
 * DELETE /api/institutes/:id/unassign-test/:testId
 * Unassign a test from an institute (admin only)
 * This removes both institute-level and student-level assignments
 */
router.delete('/:id/unassign-test/:testId', verifyAdmin, async (req, res) => {
    const client = await pool.connect();
    try {
        const { id, testId } = req.params;

        await client.query('BEGIN');

        // Verify institute exists
        const instituteResult = await client.query(
            'SELECT id, name, display_name FROM institutes WHERE id = $1 AND is_active = true',
            [id]
        );

        if (instituteResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                message: 'Institute not found'
            });
        }

        const instituteName = instituteResult.rows[0].name;

        // Remove institute-level assignment
        await client.query(
            'DELETE FROM institute_test_assignments WHERE institute_id = $1 AND test_id = $2',
            [id, testId]
        );

        // Remove student-level assignments for all students in this institute
        const deleteResult = await client.query(`
            DELETE FROM test_assignments 
            WHERE test_id = $1 
            AND student_id IN (
                SELECT id FROM students WHERE LOWER(institute) = $2
            )
        `, [testId, instituteName]);

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'Test unassigned successfully from institute',
            removed_student_assignments: deleteResult.rowCount
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error unassigning test:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to unassign test',
            error: error.message
        });
    } finally {
        client.release();
    }
});

module.exports = router;