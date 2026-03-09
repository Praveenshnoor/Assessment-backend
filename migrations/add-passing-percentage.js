const { pool } = require('../config/db');

async function addPassingPercentage() {
  const client = await pool.connect();
  try {
    console.log('Adding passing_percentage column to tests table...');
    
    await client.query(`
      ALTER TABLE tests 
      ADD COLUMN IF NOT EXISTS passing_percentage INTEGER DEFAULT 50;
    `);
    
    console.log('✅ Successfully added passing_percentage column');
    console.log('Default value: 50%');
    
  } catch (error) {
    console.error('❌ Error adding passing_percentage column:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addPassingPercentage()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
