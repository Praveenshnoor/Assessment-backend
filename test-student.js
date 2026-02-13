const { pool } = require('./config/db');

async function testStudent() {
    try {
        const result = await pool.query(`
            INSERT INTO students (full_name, email, roll_number, institute, created_at, updated_at)
            VALUES ($1, $2, $3, $4, NOW(), NOW())
            RETURNING *
        `, ['Test Student', 'test@example.com', 'TS001', 'abc']);
        
        console.log('✅ Test student created:');
        console.log(result.rows[0]);
        process.exit();
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

testStudent();