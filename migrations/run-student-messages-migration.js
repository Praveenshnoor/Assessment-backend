/**
 * Run Student Messages Table Migration
 * Creates the student_messages table for chatbot support feature
 */

const { pool } = require('../config/db');

async function runMigration() {
    const client = await pool.connect();
    
    try {
        console.log('🚀 Starting student_messages table migration...\n');
        
        await client.query('BEGIN');
        
        // Create the table
        console.log('Creating student_messages table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS student_messages (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) DEFAULT 'Anonymous',
                email VARCHAR(255),
                message TEXT NOT NULL,
                topic VARCHAR(100) DEFAULT 'General',
                image_path VARCHAR(500),
                status VARCHAR(20) DEFAULT 'unread',
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                read_at TIMESTAMPTZ
            )
        `);
        
        // Create indexes
        console.log('Creating indexes...');
        await client.query('CREATE INDEX IF NOT EXISTS idx_student_messages_status ON student_messages(status)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_student_messages_created_at ON student_messages(created_at DESC)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_student_messages_topic ON student_messages(topic)');
        
        await client.query('COMMIT');
        
        console.log('\n✅ Migration completed successfully!');
        console.log('📋 Created table: student_messages');
        console.log('📋 Created indexes for status, created_at, and topic');
        
        // Verify the table exists
        const verifyResult = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'student_messages'
            ORDER BY ordinal_position
        `);
        
        console.log('\n📊 Table structure:');
        verifyResult.rows.forEach(row => {
            console.log(`   - ${row.column_name}: ${row.data_type}`);
        });
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Run if executed directly
if (require.main === module) {
    runMigration()
        .then(() => {
            console.log('\n🎉 Done!');
            process.exit(0);
        })
        .catch((err) => {
            console.error('\n💥 Error:', err);
            process.exit(1);
        });
}

module.exports = { runMigration };
