const bcrypt = require('bcryptjs');

const generateHashes = async () => {
    const password = '12345678';
    const saltRounds = 10;

    try {
        console.log('🔐 Generating bcrypt hashes for password:', password);
        console.log('');

        // Generate hash for hr@shnoor.com
        const hash1 = await bcrypt.hash(password, saltRounds);
        console.log('Hash for hr@shnoor.com:');
        console.log(hash1);
        console.log('');

        // Generate hash for vivek@shnoor.com
        const hash2 = await bcrypt.hash(password, saltRounds);
        console.log('Hash for vivek@shnoor.com:');
        console.log(hash2);
        console.log('');

        console.log('📋 SQL Commands:');
        console.log('');
        console.log(`INSERT INTO admins (email, password_hash, full_name) VALUES ('hr@shnoor.com', '${hash1}', 'HR Admin');`);
        console.log('');
        console.log(`INSERT INTO admins (email, password_hash, full_name) VALUES ('vivek@shnoor.com', '${hash2}', 'Vivek Admin');`);
        console.log('');

    } catch (error) {
        console.error('Error generating hashes:', error);
    }
};

generateHashes();