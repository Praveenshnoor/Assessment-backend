const { pool } = require('./config/db');

async function checkInterviewsTable() {
  try {
    // Check if table exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'interviews'
      );
    `);
    
    console.log('Interviews table exists:', tableExists.rows[0].exists);
    
    if (tableExists.rows[0].exists) {
      // Count records
      const count = await pool.query('SELECT COUNT(*) FROM interviews;');
      console.log('Interview records:', count.rows[0].count);
      
      // Show table structure
      const columns = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'interviews'
        ORDER BY ordinal_position;
      `);
      console.log('\nTable structure:');
      columns.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type}`);
      });
    } else {
      console.log('❌ Interviews table does not exist!');
    }
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    await pool.end();
    process.exit(1);
  }
}

checkInterviewsTable();
