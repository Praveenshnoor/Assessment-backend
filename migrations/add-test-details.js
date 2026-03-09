const { pool } = require('../config/db');

async function addTestDetailsColumns() {
    const client = await pool.connect();
    try {
        console.log('Adding new columns to tests table...');

        // Add duration column
        await client.query(`
            ALTER TABLE tests 
            ADD COLUMN IF NOT EXISTS duration INTEGER DEFAULT 60
        `);
        console.log('✅ Added duration column');

        // Add max_attempts column
        await client.query(`
            ALTER TABLE tests 
            ADD COLUMN IF NOT EXISTS max_attempts INTEGER DEFAULT 1
        `);
        console.log('✅ Added max_attempts column');

        // Add start_datetime column
        await client.query(`
            ALTER TABLE tests 
            ADD COLUMN IF NOT EXISTS start_datetime TIMESTAMP
        `);
        console.log('✅ Added start_datetime column');

        // Add end_datetime column
        await client.query(`
            ALTER TABLE tests 
            ADD COLUMN IF NOT EXISTS end_datetime TIMESTAMP
        `);
        console.log('✅ Added end_datetime column');

        console.log('\n✅ Migration completed successfully!');
    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        client.release();
        pool.end();
    }
}

addTestDetailsColumns();
