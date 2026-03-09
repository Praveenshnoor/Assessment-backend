const { pool } = require('../config/db');

async function addIsMockTestColumn() {
    const client = await pool.connect();
    try {
        console.log('Adding is_mock_test column to tests table...');

        // Add is_mock_test column
        await client.query(`
            ALTER TABLE tests 
            ADD COLUMN IF NOT EXISTS is_mock_test BOOLEAN DEFAULT false
        `);
        console.log('✅ Added is_mock_test column (default: false)');

        // Add index for faster queries
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_tests_is_mock_test ON tests(is_mock_test)
        `);
        console.log('✅ Added index on is_mock_test column');

        // Add comment for documentation
        await client.query(`
            COMMENT ON COLUMN tests.is_mock_test IS 'Indicates if this is a mock/practice test (true) or real test (false)'
        `);
        console.log('✅ Added column documentation');

        console.log('\n✅ Migration completed successfully!');
        console.log('   Column: tests.is_mock_test (BOOLEAN, DEFAULT false)');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Run migration
addIsMockTestColumn();
