/**
 * Create Institutes Table - Emergency Migration
 * 
 * This script creates the institutes table if it doesn't exist
 * and migrates existing student data to populate it.
 * 
 * Usage: node create-institutes-table.js
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

const createInstitutesTable = async () => {
    const client = await pool.connect();
    try {
        console.log('🔌 Connected to database...');

        // 1. Create institutes table if it doesn't exist
        console.log('Creating institutes table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS institutes (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                display_name VARCHAR(255) NOT NULL,
                created_by VARCHAR(255) DEFAULT 'admin',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT true
            );
        `);

        // Create index for faster lookups
        await client.query(`CREATE INDEX IF NOT EXISTS idx_institutes_name ON institutes(LOWER(name));`);

        console.log('✅ Institutes table created successfully');

        // 2. Migrate existing institute data from students table
        console.log('Migrating existing institute data...');
        
        // Insert institutes from students.institute field
        await client.query(`
            INSERT INTO institutes (name, display_name, created_by, created_at)
            SELECT DISTINCT 
                LOWER(TRIM(institute)) as name,
                TRIM(institute) as display_name,
                'migration' as created_by,
                MIN(created_at) as created_at
            FROM students
            WHERE institute IS NOT NULL 
                AND TRIM(institute) != ''
                AND TRIM(institute) != 'not specified'
            GROUP BY LOWER(TRIM(institute)), TRIM(institute)
            ON CONFLICT (name) DO NOTHING;
        `);

        // Insert institutes from students.college_name field (if different from institute)
        await client.query(`
            INSERT INTO institutes (name, display_name, created_by, created_at)
            SELECT DISTINCT 
                LOWER(TRIM(college_name)) as name,
                TRIM(college_name) as display_name,
                'migration' as created_by,
                MIN(created_at) as created_at
            FROM students
            WHERE college_name IS NOT NULL 
                AND TRIM(college_name) != ''
                AND TRIM(college_name) != 'not specified'
                AND NOT EXISTS (
                    SELECT 1 FROM institutes 
                    WHERE name = LOWER(TRIM(college_name))
                )
            GROUP BY LOWER(TRIM(college_name)), TRIM(college_name)
            ON CONFLICT (name) DO NOTHING;
        `);

        // 3. Add default institutes
        console.log('Adding default institutes...');
        const defaultInstitutes = [
            { name: 'not specified', display_name: 'Not Specified' },
            { name: 'other', display_name: 'Other' }
        ];

        for (const institute of defaultInstitutes) {
            await client.query(`
                INSERT INTO institutes (name, display_name, created_by)
                VALUES ($1, $2, 'system')
                ON CONFLICT (name) DO NOTHING
            `, [institute.name, institute.display_name]);
        }

        // 4. Update students with missing institute data
        console.log('Updating students with missing institute data...');
        await client.query(`
            UPDATE students 
            SET institute = COALESCE(
                NULLIF(TRIM(institute), ''), 
                NULLIF(TRIM(college_name), ''), 
                'not specified'
            )
            WHERE institute IS NULL OR TRIM(institute) = ''
        `);

        // 5. Create institute_test_assignments table
        console.log('Creating institute_test_assignments table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS institute_test_assignments (
                id SERIAL PRIMARY KEY,
                institute_id INTEGER REFERENCES institutes(id) ON DELETE CASCADE,
                test_id INTEGER REFERENCES tests(id) ON DELETE CASCADE,
                assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT true,
                UNIQUE(institute_id, test_id)
            );
        `);

        await client.query(`CREATE INDEX IF NOT EXISTS idx_institute_test_assignments_institute ON institute_test_assignments(institute_id);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_institute_test_assignments_test ON institute_test_assignments(test_id);`);

        // 6. Verify the setup
        console.log('\n📊 Verification:');
        
        const instituteCount = await client.query('SELECT COUNT(*) as count FROM institutes');
        console.log(`   Institutes: ${instituteCount.rows[0].count}`);
        
        const studentCount = await client.query('SELECT COUNT(*) as count FROM students');
        console.log(`   Students: ${studentCount.rows[0].count}`);
        
        const studentsWithInstitute = await client.query(`
            SELECT COUNT(*) as count FROM students 
            WHERE institute IS NOT NULL AND TRIM(institute) != ''
        `);
        console.log(`   Students with institute: ${studentsWithInstitute.rows[0].count}`);

        // Show sample institutes
        const sampleInstitutes = await client.query(`
            SELECT name, display_name, created_by 
            FROM institutes 
            ORDER BY created_at 
            LIMIT 10
        `);
        
        console.log('\n📋 Sample institutes:');
        sampleInstitutes.rows.forEach(inst => {
            console.log(`   - ${inst.display_name} (${inst.name}) [${inst.created_by}]`);
        });

        console.log('\n✅ Institutes table setup completed successfully!');

    } catch (err) {
        console.error('❌ Error creating institutes table:', err);
        console.error('Error details:', err.message);
        throw err;
    } finally {
        client.release();
        pool.end();
    }
};

// Run the migration if this script is executed directly
if (require.main === module) {
    createInstitutesTable()
        .then(() => {
            console.log('\n🎉 Migration completed successfully!');
            process.exit(0);
        })
        .catch((err) => {
            console.error('\n💥 Migration failed:', err.message);
            process.exit(1);
        });
}

module.exports = { createInstitutesTable };