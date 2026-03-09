const { pool } = require('./config/db');

async function createTable() {
    try {
        console.log('Creating institute_test_assignments table...');
        
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
        
        console.log('✅ Table created successfully');
        
        // Check current assignments
        const result = await pool.query('SELECT * FROM institute_test_assignments ORDER BY assigned_at DESC');
        console.log(`\nCurrent assignments: ${result.rows.length}`);
        if (result.rows.length > 0) {
            console.log(JSON.stringify(result.rows, null, 2));
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

createTable();