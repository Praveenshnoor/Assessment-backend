// Test script to check audio violations in database
const pool = require('./config/db');

async function testAudioViolations() {
    console.log('=== TESTING AUDIO VIOLATIONS ===\n');

    try {
        // 1. Check all violation types
        console.log('1. All violation types in database:');
        const allTypes = await pool.query(`
            SELECT 
                violation_type,
                COUNT(*) as count,
                COUNT(DISTINCT student_id) as unique_students
            FROM proctoring_violations
            GROUP BY violation_type
            ORDER BY count DESC
        `);
        console.table(allTypes.rows);

        // 2. Check audio violations specifically
        console.log('\n2. Audio violations breakdown:');
        const audioViolations = await pool.query(`
            SELECT 
                violation_type,
                severity,
                COUNT(*) as count
            FROM proctoring_violations
            WHERE violation_type IN ('loud_noise', 'voice_detected', 'microphone_silent')
            GROUP BY violation_type, severity
            ORDER BY violation_type
        `);
        
        if (audioViolations.rows.length === 0) {
            console.log('❌ NO AUDIO VIOLATIONS FOUND IN DATABASE');
        } else {
            console.table(audioViolations.rows);
        }

        // 3. Recent audio violations
        console.log('\n3. Recent audio violations (last 10):');
        const recentAudio = await pool.query(`
            SELECT 
                id,
                student_id,
                test_id,
                violation_type,
                severity,
                message,
                timestamp
            FROM proctoring_violations
            WHERE violation_type IN ('loud_noise', 'voice_detected', 'microphone_silent')
            ORDER BY timestamp DESC
            LIMIT 10
        `);
        
        if (recentAudio.rows.length === 0) {
            console.log('❌ NO RECENT AUDIO VIOLATIONS');
        } else {
            console.table(recentAudio.rows);
        }

        // 4. Total violations count
        console.log('\n4. Total violations in database:');
        const total = await pool.query('SELECT COUNT(*) as total FROM proctoring_violations');
        console.log(`Total violations: ${total.rows[0].total}`);

        // 5. Most recent violations of any type
        console.log('\n5. Most recent violations (any type):');
        const recent = await pool.query(`
            SELECT 
                id,
                student_id,
                test_id,
                violation_type,
                severity,
                timestamp
            FROM proctoring_violations
            ORDER BY timestamp DESC
            LIMIT 10
        `);
        console.table(recent.rows);

        // 6. Check if table structure is correct
        console.log('\n6. Table structure check:');
        const structure = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'proctoring_violations'
            ORDER BY ordinal_position
        `);
        console.table(structure.rows);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

testAudioViolations();
