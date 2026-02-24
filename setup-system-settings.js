const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'mcq_portal',
    password: process.env.DB_PASSWORD || 'tiger',
    port: process.env.DB_PORT || 5432,
});

async function runMigration() {
    try {
        console.log('Connecting to database...');

        // Create system_settings table
        const createTableQuery = `
      CREATE TABLE IF NOT EXISTS system_settings (
          id SERIAL PRIMARY KEY,
          retry_timer_minutes INTEGER DEFAULT 5,
          maintenance_mode BOOLEAN DEFAULT false,
          maintenance_message TEXT DEFAULT 'The system is currently undergoing scheduled maintenance. Please check back later.',
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
        await pool.query(createTableQuery);
        console.log('system_settings table created or already exists.');

        // Seed default data
        const seedQuery = `
      INSERT INTO system_settings (id, retry_timer_minutes, maintenance_mode)
      VALUES (1, 5, false)
      ON CONFLICT (id) DO NOTHING;
    `;
        await pool.query(seedQuery);
        console.log('Default settings seeded.');

    } catch (error) {
        console.error('Error running migration:', error);
    } finally {
        await pool.end();
        console.log('Database connection closed.');
    }
}

runMigration();
