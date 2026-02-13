const { pool } = require('./config/db');
const fs = require('fs');
const path = require('path');

/**
 * Migration runner to create institutes table
 * Run this script to set up the institutes table in your database
 */

async function runMigration() {
    const client = await pool.connect();
    
    try {
        console.log('🚀 Starting migration: Create institutes table...');
        
        await client.query('BEGIN');
        
        // Read and execute the migration SQL
        const migrationSQL = fs.readFileSync(
            path.join(__dirname, 'migrations', 'create-institutes-table.sql'),
            'utf8'
        );
        
        await client.query(migrationSQL);
        
        await client.query('COMMIT');
        
        console.log('✅ Migration completed successfully!');
        console.log('📊 Institutes table created');
        console.log('🔗 Existing institutes from students table imported');
        
        // Display created institutes
        const result = await client.query('SELECT * FROM institutes ORDER BY created_at DESC');
        console.log(`\n📋 Total institutes: ${result.rows.length}`);
        
        if (result.rows.length > 0) {
            console.log('\nInstitutes:');
            result.rows.forEach((inst, idx) => {
                console.log(`  ${idx + 1}. ${inst.display_name} (${inst.student_count || 0} students)`);
            });
        }
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', error.message);
        console.error(error);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

// Run the migration
runMigration();