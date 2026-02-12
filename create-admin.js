/**
 * Script to create an admin user in the database
 * Run this with: node create-admin.js
 */

const bcrypt = require('bcryptjs');
const { pool } = require('./config/db');

async function createAdmin() {
    try {
        console.log('🔐 Creating admin user...');

        // Admin credentials
        const email = 'admin@shnoor.com';
        const password = 'Admin@123'; // Change this to your desired password
        const fullName = 'Shnoor Admin';

        // Hash the password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Insert admin into database
        const result = await pool.query(
            `INSERT INTO admins (email, password_hash, full_name)
             VALUES ($1, $2, $3)
             ON CONFLICT (email) 
             DO UPDATE SET password_hash = $2, full_name = $3
             RETURNING id, email, full_name`,
            [email, passwordHash, fullName]
        );

        console.log('✅ Admin user created successfully!');
        console.log('📧 Email:', result.rows[0].email);
        console.log('🔑 Password:', password);
        console.log('👤 Name:', result.rows[0].full_name);
        console.log('\n⚠️  Please change the password after first login!');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating admin:', error.message);
        process.exit(1);
    }
}

createAdmin();
