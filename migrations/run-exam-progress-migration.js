const { pool } = require('../config/db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    try {
        console.log('Running exam_progress schema migration...');
        
        const migrationSQL = fs.readFileSync(
            path.join(__dirname, 'update-exam-progress-schema.sql'),
            'utf8'
        );
        
        await pool.query(migrationSQL);
        
        console.log('✅ Migration completed successfully!');
        console.log('Added columns:');
        console.log('  - current_question');
        console.log('  - marked_for_review');
        console.log('  - visited_questions');
        console.log('  - warning_count');
        console.log('  - updated_at');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
