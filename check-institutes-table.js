const { pool } = require('./config/db');

async function checkInstitutesTable() {
  try {
    // Check if table exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'institutes'
      );
    `);
    
    console.log('Institutes table exists:', tableExists.rows[0].exists);
    
    if (tableExists.rows[0].exists) {
      // Count records
      const count = await pool.query('SELECT COUNT(*) FROM institutes;');
      console.log('Institute records:', count.rows[0].count);
      
      // Show sample data
      const sample = await pool.query('SELECT id, display_name, is_active FROM institutes LIMIT 5;');
      console.log('\nSample institutes:');
      sample.rows.forEach(inst => {
        console.log(`  - ${inst.display_name} (ID: ${inst.id}, Active: ${inst.is_active})`);
      });
    } else {
      console.log('❌ Institutes table does not exist!');
    }
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    await pool.end();
    process.exit(1);
  }
}

checkInstitutesTable();
