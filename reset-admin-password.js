const { pool } = require('./config/db');
const bcrypt = require('bcryptjs');

async function resetAdminPassword() {
  const newPassword = 'Admin@123'; // Change this to your desired password
  
  try {
    console.log('🔐 Resetting admin password...\n');
    
    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update the admin account
    const result = await pool.query(
      'UPDATE admins SET password_hash = $1 WHERE email = $2 RETURNING id, email, full_name;',
      [hashedPassword, 'admin@example.com']
    );
    
    if (result.rows.length === 0) {
      console.log('❌ Admin account not found!');
      await pool.end();
      return;
    }
    
    console.log('✅ Password reset successful!');
    console.log('\n📧 Email: admin@example.com');
    console.log('🔑 New Password: ' + newPassword);
    console.log('\n⚠️  IMPORTANT: Change this password after logging in!');
    console.log('\n🌐 Login at: http://localhost:5173/admin/login');
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

resetAdminPassword();
