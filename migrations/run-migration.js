const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

const runMigration = async (migrationFile) => {
    const client = await pool.connect();
    try {
        console.log(`🔌 Connected to database...`);
        console.log(`📄 Running migration: ${migrationFile}`);

        const filePath = path.join(__dirname, migrationFile);
        const sql = fs.readFileSync(filePath, 'utf8');

        await client.query(sql);

        console.log('✅ Migration completed successfully!');
    } catch (err) {
        console.error('❌ Migration failed:', err);
        throw err;
    } finally {
        client.release();
        pool.end();
    }
};

// Get migration file from command line argument
const migrationFile = process.argv[2];

if (!migrationFile) {
    console.error('❌ Please provide a migration file name');
    console.log('Usage: node run-migration.js <migration-file.sql>');
    process.exit(1);
}

runMigration(migrationFile);