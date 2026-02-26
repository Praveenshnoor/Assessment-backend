const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

async function checkTables() {
    try {
        const result = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        `);
        
        console.log('Existing tables:');
        if (result.rows.length === 0) {
            console.log('  No tables found');
        } else {
            result.rows.forEach(row => {
                console.log(`  - ${row.table_name}`);
            });
        }
        
        // Check institutes table structure if it exists
        const instituteCheck = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'institutes' 
            AND table_schema = 'public'
            ORDER BY ordinal_position;
        `);
        
        if (instituteCheck.rows.length > 0) {
            console.log('\nInstitutes table columns:');
            instituteCheck.rows.forEach(row => {
                console.log(`  - ${row.column_name}: ${row.data_type}`);
            });
        }
        
        await pool.end();
    } catch (error) {
        console.error('Error checking database:', error.message);
        process.exit(1);
    }
}

checkTables();