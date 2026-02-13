const { pool } = require('./config/db');

const testRegistration = async () => {
    const client = await pool.connect();
    try {
        console.log('🔌 Testing registration functionality...');

        // Test if we can insert a student with all fields
        const testData = {
            firebase_uid: 'test_uid_' + Date.now(),
            full_name: 'Test Student',
            email: 'test' + Date.now() + '@example.com',
            roll_number: 'TEST' + Date.now(),
            institute: 'test university',
            phone: '1234567890',
            address: 'Test Address',
            course: 'Test Course',
            specialization: 'Test Specialization'
        };

        const result = await client.query(
            `INSERT INTO students (firebase_uid, full_name, email, roll_number, institute, phone, address, course, specialization) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
             RETURNING id, firebase_uid, full_name, email, roll_number, institute, phone, address, course, specialization, created_at`,
            [testData.firebase_uid, testData.full_name, testData.email, testData.roll_number, 
             testData.institute, testData.phone, testData.address, testData.course, testData.specialization]
        );

        console.log('✅ Registration test successful!');
        console.log('Student created:', result.rows[0]);

        // Clean up test data
        await client.query('DELETE FROM students WHERE firebase_uid = $1', [testData.firebase_uid]);
        console.log('✅ Test data cleaned up');

    } catch (error) {
        console.error('❌ Registration test failed:', error);
        console.error('Error details:', error.message);
        
        if (error.code === '42703') {
            console.log('');
            console.log('🔧 This error indicates missing columns in the students table.');
            console.log('Please run: node fix-database-schema.js');
        }
    } finally {
        client.release();
    }
};

testRegistration()
    .then(() => {
        console.log('Test completed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Test failed:', error);
        process.exit(1);
    });