const { pool } = require('./config/db');

async function checkAdminAccounts() {
  try {
    const result = await pool.query('SELECT id, email, full_name, created_at FROM admins ORDER BY created_at DESC LIMIT 5;');
    
    console.log('👤 Admin Accounts in Database:');
    console.log('================================');
    
    if (result.rows.length === 0) {
      console.log('❌ No admin accounts found!');
      console.log('\nYou need to create an admin account first.');
      console.log('Run: node create-admin.js');
    } else {
      console.log(`✅ Found ${result.rows.length} admin account(s):\n`);
      result.rows.forEach((admin, idx) => {
        console.log(`${idx + 1}. Email: ${admin.email}`);
        console.log(`   Name: ${admin.full_name || 'Not set'}`);
        console.log(`   ID: ${admin.id}`);
        console.log(`   Created: ${admin.created_at}`);
        console.log('');
      });
      
      console.log('📌 To log in:');
      console.log('   1. Go to http://localhost:5173/admin/login');
      console.log('   2. Use one of the email addresses above');
      console.log('   3. Use the password you set during account creation');
    }
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

checkAdminAccounts();
