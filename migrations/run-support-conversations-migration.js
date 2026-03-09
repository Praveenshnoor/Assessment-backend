/**
 * Migration: Add Support Conversations Schema
 * Adds columns for two-way chat between students and admin
 */

const { pool } = require('../config/db');
const { logger } = require('../config/logger');

async function runMigration() {
    console.log('Running support conversations migration...');
    
    try {
        // Add student_id column
        await pool.query(`
            ALTER TABLE student_messages 
            ADD COLUMN IF NOT EXISTS student_id VARCHAR(100)
        `);
        console.log('✓ Added student_id column');

        // Add college column
        await pool.query(`
            ALTER TABLE student_messages 
            ADD COLUMN IF NOT EXISTS college VARCHAR(255)
        `);
        console.log('✓ Added college column');

        // Add conversation_id column
        await pool.query(`
            ALTER TABLE student_messages 
            ADD COLUMN IF NOT EXISTS conversation_id INTEGER
        `);
        console.log('✓ Added conversation_id column');

        // Add sender_type column with default 'student'
        await pool.query(`
            ALTER TABLE student_messages 
            ADD COLUMN IF NOT EXISTS sender_type VARCHAR(20) DEFAULT 'student'
        `);
        console.log('✓ Added sender_type column');

        // Add parent_message_id column
        await pool.query(`
            ALTER TABLE student_messages 
            ADD COLUMN IF NOT EXISTS parent_message_id INTEGER
        `);
        console.log('✓ Added parent_message_id column');

        // Create indexes
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_student_messages_student_id 
            ON student_messages(student_id)
        `);

        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_student_messages_college 
            ON student_messages(college)
        `);

        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_student_messages_conversation 
            ON student_messages(conversation_id)
        `);

        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_student_messages_sender 
            ON student_messages(sender_type)
        `);
        console.log('✓ Created indexes');

        // Update existing messages to have sender_type = 'student'
        await pool.query(`
            UPDATE student_messages 
            SET sender_type = 'student' 
            WHERE sender_type IS NULL
        `);
        console.log('✓ Updated existing messages');

        console.log('\n✅ Support conversations migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        logger.error({ err: error, event: 'support_conversations_migration_error' });
        process.exit(1);
    }
}

runMigration();
