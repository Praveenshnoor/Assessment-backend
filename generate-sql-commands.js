const bcrypt = require('bcryptjs');

const generateSQLCommands = async () => {
    const password = '12345678';
    const saltRounds = 10;

    try {
        console.log('🔐 Generating bcrypt hashes for password:', password);
        console.log('');

        // Generate hash for hr@shnoor.com
        const hash1 = await bcrypt.hash(password, saltRounds);
        
        // Generate hash for vivek@shnoor.com
        const hash2 = await bcrypt.hash(password, saltRounds);

        console.log('📋 COPY-PASTE THESE SQL COMMANDS:');
        console.log('');
        console.log('-- Delete existing incorrect admins');
        console.log("DELETE FROM admins WHERE email = 'hr@shnoor.com';");
        console.log("DELETE FROM admins WHERE email = 'vivek@shnoor.com';");
        console.log('');
        console.log('-- Create HR Admin with properly hashed password');
        console.log(`INSERT INTO admins (email, password_hash, full_name) VALUES ('hr@shnoor.com', '${hash1}', 'HR Admin');`);
        console.log('');
        console.log('-- Create Vivek Admin with properly hashed password');
        console.log(`INSERT INTO admins (email, password_hash, full_name) VALUES ('vivek@shnoor.com', '${hash2}', 'Vivek Admin');`);
        console.log('');
        console.log('-- Verify creation');
        console.log("SELECT id, email, full_name, created_at FROM admins WHERE email IN ('hr@shnoor.com', 'vivek@shnoor.com');");
        console.log('');
        console.log('✅ Login Credentials:');
        console.log('Email: hr@shnoor.com | Password: 12345678');
        console.log('Email: vivek@shnoor.com | Password: 12345678');

    } catch (error) {
        console.error('Error generating hashes:', error);
    }
};

generateSQLCommands();