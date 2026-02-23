/**
 * Migration: Ensure all required columns exist in students table
 * Run this ONCE during deployment, not on every registration
 * 
 * Usage: node migrations/ensure-student-columns.js
 */

const { pool } = require('../config/db');

async function ensureStudentColumns() {
    const client = await pool.connect();
    try {
        console.log('🔧 Starting student table column migration...');

        await client.query('BEGIN');

        // Add all required columns if they don't exist
        console.log('Adding institute column...');
        await client.query(`
            ALTER TABLE students ADD COLUMN IF NOT EXISTS institute VARCHAR(255);
        `);

        console.log('Adding phone column...');
        await client.query(`
            ALTER TABLE students ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
        `);

        console.log('Adding address column...');
        await client.query(`
            ALTER TABLE students ADD COLUMN IF NOT EXISTS address TEXT;
        `);

        console.log('Adding course column...');
        await client.query(`
            ALTER TABLE students ADD COLUMN IF NOT EXISTS course VARCHAR(100);
        `);

        console.log('Adding specialization column...');
        await client.query(`
            ALTER TABLE students ADD COLUMN IF NOT EXISTS specialization VARCHAR(100);
        `);

        console.log('Adding resume_link column...');
        await client.query(`
            ALTER TABLE students ADD COLUMN IF NOT EXISTS resume_link VARCHAR(500);
        `);

        // Create institutes table if it doesn't exist
        console.log('Creating institutes table...');
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

        // Create test_assignments table if it doesn't exist
        console.log('Creating test_assignments table...');
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
        console.log('Creating institute_test_assignments table...');
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

        await client.query('COMMIT');

        console.log('✅ Student table migration completed successfully!');
        console.log('All required columns and tables are now in place.');
        process.exit(0); // Exit successfully
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', error);
        console.error('Error details:', error.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

// Run migration
ensureStudentColumns();
