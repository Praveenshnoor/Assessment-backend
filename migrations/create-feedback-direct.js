const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function createFeedbackTable() {
    console.log('🚀 Creating feedback table...\n');

    const client = new Client({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT || 5432,
        ssl: false
    });

    try {
        await client.connect();
        console.log('✅ Connected to database');

        // Read the SQL file
        const sqlPath = path.join(__dirname, 'create-feedback-table.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Execute the SQL
        await client.query(sql);

        console.log('✅ Feedback table created successfully!');
        console.log('✅ Indexes created successfully!');
        console.log('✅ Constraints added successfully!');
        console.log('\n🎉 Migration completed!\n');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        if (error.code === '42P07') {
            console.log('ℹ️  Table already exists, skipping creation');
        } else {
            console.error('Full error:', error);
            process.exit(1);
        }
    } finally {
        await client.end();
    }
}

createFeedbackTable();
