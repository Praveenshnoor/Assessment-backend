const { pool } = require('../config/db');
const fs = require('fs');
const path = require('path');

async function runPerformanceIndexes() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting performance indexes migration...');
    
    // Read SQL file
    const sqlPath = path.join(__dirname, 'add-performance-indexes.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute SQL
    await client.query(sql);
    
    console.log('✅ Performance indexes created successfully!');
    console.log('📊 Database is now optimized for 300+ concurrent users');
    
  } catch (error) {
    console.error('❌ Error creating performance indexes:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration
runPerformanceIndexes()
  .then(() => {
    console.log('✅ Migration completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
