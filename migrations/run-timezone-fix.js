const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Starting timezone column migration...');
    
    // Check current column types
    const typeCheck = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'tests' 
      AND column_name IN ('start_datetime', 'end_datetime')
    `);
    
    console.log('Current column types:', typeCheck.rows);
    
    // Show sample data before migration
    const beforeData = await client.query(`
      SELECT id, title, start_datetime, end_datetime
      FROM tests 
      WHERE start_datetime IS NOT NULL
      LIMIT 3
    `);
    
    console.log('\n📊 Sample data BEFORE migration:');
    console.table(beforeData.rows);
    
    // Run the migration
    console.log('\n🔄 Converting start_datetime to TIMESTAMPTZ...');
    await client.query(`
      ALTER TABLE tests
      ALTER COLUMN start_datetime TYPE TIMESTAMPTZ
      USING start_datetime AT TIME ZONE 'Asia/Kolkata'
    `);
    
    console.log('🔄 Converting end_datetime to TIMESTAMPTZ...');
    await client.query(`
      ALTER TABLE tests
      ALTER COLUMN end_datetime TYPE TIMESTAMPTZ
      USING end_datetime AT TIME ZONE 'Asia/Kolkata'
    `);
    
    // Verify the migration
    const afterTypeCheck = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'tests' 
      AND column_name IN ('start_datetime', 'end_datetime')
    `);
    
    console.log('\n✅ New column types:', afterTypeCheck.rows);
    
    // Show sample data after migration
    const afterData = await client.query(`
      SELECT id, title, start_datetime, end_datetime
      FROM tests 
      WHERE start_datetime IS NOT NULL
      LIMIT 3
    `);
    
    console.log('\n📊 Sample data AFTER migration:');
    console.table(afterData.rows);
    
    console.log('\n✅ Migration completed successfully!');
    console.log('📝 Note: All datetime values are now timezone-aware (TIMESTAMPTZ)');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(console.error);
