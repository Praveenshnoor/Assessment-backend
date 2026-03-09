const { pool } = require('./config/db');
const fs = require('fs');
const path = require('path');

async function createInterviewsTable() {
  try {
    console.log('Creating interviews table...');
    
    // Read SQL file
    const sqlFile = path.join(__dirname, 'migrations', 'create-interviews-table.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    // Execute SQL
    await pool.query(sql);
    
    console.log('✅ Interviews table created successfully!');
    
    // Verify
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'interviews'
      );
    `);
    
    console.log('Table exists:', result.rows[0].exists);
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error creating interviews table:', error.message);
    console.error('Stack:', error.stack);
    await pool.end();
    process.exit(1);
  }
}

createInterviewsTable();
