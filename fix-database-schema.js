const { pool } = require('./config/db');

const fixDatabaseSchema = async () => {
    const client = await pool.connect();
    try {
        console.log('🔌 Connected to database...');
        console.log('📄 Fixing database schema...');

        // Add missing columns to students table
        await client.query(`
            ALTER TABLE students ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
        `);
        console.log('✅ Added phone column');

        await client.query(`
            ALTER TABLE students ADD COLUMN IF NOT EXISTS address TEXT;
        `);
        console.log('✅ Added address column');

        await client.query(`
            ALTER TABLE students ADD COLUMN IF NOT EXISTS college_name VARCHAR(255);
        `);
        console.log('✅ Added college_name column');

        await client.query(`
            ALTER TABLE students ADD COLUMN IF NOT EXISTS institute VARCHAR(255);
        `);
        console.log('✅ Added institute column');

        await client.query(`
            ALTER TABLE students ADD COLUMN IF NOT EXISTS course VARCHAR(100);
        `);
        console.log('✅ Added course column');

        await client.query(`
            ALTER TABLE students ADD COLUMN IF NOT EXISTS specialization VARCHAR(100);
        `);
        console.log('✅ Added specialization column');

        // Create institutes table if it doesn't exist
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
        console.log('✅ Created institutes table');

        // Create test_assignments table if it doesn't exist
        await client.query(`
            CREATE TABLE IF NOT EXISTS test_assignments (
                id SERIAL PRIMARY KEY,
                test_id INTEGER REFERENCES tests(id) ON DELETE CASCADE,
                student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
                assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT true,
                UNIQUE(test_id, student_id)
            );
        `);
        console.log('✅ Created test_assignments table');

        // Create institute_test_assignments table if it doesn't exist
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
        console.log('✅ Created institute_test_assignments table');

        console.log('🎉 Database schema fixed successfully!');
        console.log('');
        console.log('You can now:');
        console.log('1. Register new students');
        console.log('2. Use institute management features');
        console.log('3. Export student reports by institute');

    } catch (error) {
        console.error('❌ Error fixing database schema:', error);
        throw error;
    } finally {
        client.release();
    }
};

// Run the fix
fixDatabaseSchema()
    .then(() => {
        console.log('✅ Schema fix completed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Schema fix failed:', error);
        process.exit(1);
    });