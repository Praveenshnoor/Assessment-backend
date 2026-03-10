const { pool } = require('../config/db');
const fs = require('fs').promises;
const path = require('path');

/**
 * Migration Script: Create forced_terminations table
 * Purpose: Enable admins to manually stop tests when cheating is detected
 */

async function runForcedTerminationsMigration() {
    const client = await pool.connect();
    try {
        console.log('🚀 Starting forced terminations table migration...');
        
        // Read SQL file
        const sqlFile = path.join(__dirname, 'create-forced-terminations.sql');
        const sql = await fs.readFile(sqlFile, 'utf8');
        
        // Execute migration
        await client.query(sql);
        
        console.log('✅ Forced terminations table created successfully!');
        console.log('✅ Results table updated with termination columns!');
        console.log('✅ Indexes created for optimal performance!');
        
        // Verify table creation
        const result = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'forced_terminations'
        `);
        
        if (result.rows.length > 0) {
            console.log('✅ Verification successful: forced_terminations table exists');
        } else {
            console.warn('⚠️ Warning: Table verification failed');
        }
        
    } catch (error) {
        console.error('❌ Error running forced terminations migration:', error.message);
        console.error('Stack trace:', error.stack);
        throw error;
    } finally {
        client.release();
    }
}

// Run migration if this file is executed directly
if (require.main === module) {
    runForcedTerminationsMigration()
        .then(() => {
            console.log('✅ Migration completed successfully');
            process.exit(0);
        })
        .catch(err => {
            console.error('❌ Migration failed:', err);
            process.exit(1);
        });
}

module.exports = { runForcedTerminationsMigration };
