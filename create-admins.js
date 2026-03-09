const bcrypt = require('bcryptjs');
const { pool } = require('./config/db');

const createAdmins = async () => {
    const client = await pool.connect();
    try {
        console.log('🔌 Connected to database...');
        console.log('👤 Creating admin accounts...');

        // Admin accounts to create
        const admins = [
            {
                email: 'hr@shnoor.com',
                password: '12345678',
                full_name: 'HR Admin'
            },
            {
                email: 'vivek@shnoor.com',
                password: '12345678',
                full_name: 'Vivek Admin'
            }
        ];

        for (const admin of admins) {
            try {
                // Check if admin already exists
                const existingAdmin = await client.query(
                    'SELECT email FROM admins WHERE email = $1',
                    [admin.email]
                );

                if (existingAdmin.rows.length > 0) {
                    console.log(`⚠️  Admin ${admin.email} already exists, skipping...`);
                    continue;
                }

                // Hash the password
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(admin.password, salt);

                // Insert the admin
                const result = await client.query(
                    'INSERT INTO admins (email, password_hash, full_name) VALUES ($1, $2, $3) RETURNING id, email, full_name, created_at',
                    [admin.email, hashedPassword, admin.full_name]
                );

                console.log(`✅ Created admin: ${admin.email}`);
                console.log(`   - ID: ${result.rows[0].id}`);
                console.log(`   - Name: ${result.rows[0].full_name}`);
                console.log(`   - Created: ${result.rows[0].created_at}`);

            } catch (error) {
                console.error(`❌ Error creating admin ${admin.email}:`, error.message);
            }
        }

        console.log('');
        console.log('🎉 Admin creation completed!');
        console.log('');
        console.log('📋 Login Credentials:');
        console.log('1. Email: hr@shnoor.com');
        console.log('   Password: 12345678');
        console.log('');
        console.log('2. Email: vivek@shnoor.com');
        console.log('   Password: 12345678');
        console.log('');
        console.log('🔗 Admin Login URL: http://localhost:5173/admin/login');

    } catch (error) {
        console.error('❌ Error creating admins:', error);
        throw error;
    } finally {
        client.release();
    }
};

// Run the script
createAdmins()
    .then(() => {
        console.log('✅ Script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Script failed:', error);
        process.exit(1);
    });