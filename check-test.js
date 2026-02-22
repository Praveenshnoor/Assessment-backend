const { pool } = require('./config/db');

async function checkTest() {
    try {
        // Get recent tests
        const testsResult = await pool.query('SELECT id, title FROM tests ORDER BY id DESC LIMIT 5');
        console.log('\n=== Recent Tests ===');
        testsResult.rows.forEach(t => {
            console.log(`  Test ID ${t.id}: ${t.title}`);
        });

        // Check coding questions
        const codingResult = await pool.query('SELECT * FROM coding_questions');
        console.log(`\n=== Coding Questions ===`);
        console.log(`Total coding questions: ${codingResult.rows.length}`);
        
        if (codingResult.rows.length > 0) {
            codingResult.rows.forEach(q => {
                console.log(`  - Test ${q.test_id}: ${q.title}`);
            });
        } else {
            console.log('  No coding questions found in database');
        }

        await pool.end();
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

checkTest();
