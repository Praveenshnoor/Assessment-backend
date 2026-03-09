const { pool } = require('../config/db');

async function addTestStatus() {
    const client = await pool.connect();
    try {
        console.log('Adding status column to tests table...');

        // Add status column
        await client.query(`
            ALTER TABLE tests 
            ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'draft'
        `);
        console.log('✅ Added status column (values: draft, published, archived)');

        // Add is_published column for backward compatibility
        await client.query(`
            ALTER TABLE tests 
            ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false
        `);
        console.log('✅ Added is_published column');

        console.log('\n✅ Migration completed successfully!');
    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        client.release();
        pool.end();
    }
}

addTestStatus();
