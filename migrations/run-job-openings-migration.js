// migrations/run-job-openings-migration.js
// Run with: node migrations/run-job-openings-migration.js

const { pool } = require('../config/db');

// Execute statements individually so pool.on('connect') queries don't collide
const statements = [
    `CREATE TABLE IF NOT EXISTS job_openings (
        id SERIAL PRIMARY KEY,
        company_name VARCHAR(255) NOT NULL,
        job_role VARCHAR(255) NOT NULL,
        job_description TEXT NOT NULL,
        registration_deadline TIMESTAMPTZ NOT NULL,
        eligibility_criteria TEXT NOT NULL,
        application_link VARCHAR(500) NOT NULL,
        admin_id INTEGER REFERENCES admins(id) ON DELETE SET NULL,
        status VARCHAR(20) DEFAULT 'draft',
        is_published BOOLEAN DEFAULT false,
        published_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS job_notifications (
        id SERIAL PRIMARY KEY,
        job_opening_id INTEGER NOT NULL REFERENCES job_openings(id) ON DELETE CASCADE,
        student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        email_status VARCHAR(20) DEFAULT 'sent',
        email_sent_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(job_opening_id, student_id)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_job_openings_status      ON job_openings(status)`,
    `CREATE INDEX IF NOT EXISTS idx_job_openings_published   ON job_openings(is_published)`,
    `CREATE INDEX IF NOT EXISTS idx_job_openings_deadline    ON job_openings(registration_deadline)`,
    `CREATE INDEX IF NOT EXISTS idx_job_notifications_job    ON job_notifications(job_opening_id)`,
    `CREATE INDEX IF NOT EXISTS idx_job_notifications_student ON job_notifications(student_id)`,
];

async function runMigration() {
    // Wait briefly to let pool.on('connect') queries settle
    await new Promise(resolve => setTimeout(resolve, 500));

    const client = await pool.connect();
    try {
        console.log('🚀 Running job openings migration...');
        for (const sql of statements) {
            await client.query(sql);
        }
        console.log('✅ Job openings migration completed successfully.');
        console.log('   ✓ job_openings table');
        console.log('   ✓ job_notifications table');
        console.log('   ✓ all indexes');
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration();

