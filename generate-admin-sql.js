const bcrypt = require('bcryptjs');

async function generateAdminSQL() {
    const email = 'admin@assessments.com';
    const password = '12345678';
    const fullName = 'System Administrator';
    
    // Generate bcrypt hash
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    
    console.log('\n=== ADMIN CREATION SQL ===\n');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('Hash:', hash);
    console.log('\n=== SQL QUERY ===\n');
    console.log(`INSERT INTO admins (email, password_hash, full_name)
VALUES (
    '${email}',
    '${hash}',
    '${fullName}'
)
ON CONFLICT (email) DO UPDATE 
SET password_hash = EXCLUDED.password_hash,
    full_name = EXCLUDED.full_name;`);
    console.log('\n=== VERIFICATION QUERY ===\n');
    console.log(`SELECT id, email, full_name, created_at FROM admins WHERE email = '${email}';`);
    console.log('\n');
}

generateAdminSQL().catch(console.error);
