// Run: node backend/migrations/run-normalize-job-statuses.js
const { query } = require('../config/db');

async function run() {
    try {
        console.log('Normalizing legacy job application statuses...');

        const result = await query(`
            UPDATE job_applications
            SET status = 'assessment_assigned',
                updated_at = CURRENT_TIMESTAMP
            WHERE status IN ('submitted', 'screening', 'assessment_completed')
              AND status NOT IN ('shortlisted', 'rejected')
        `);

        console.log(`Updated ${result.rowCount} row(s) to 'assessment_assigned'.`);

        const counts = await query(`
            SELECT status, COUNT(*) AS count
            FROM job_applications
            GROUP BY status
            ORDER BY count DESC
        `);

        console.log('\nCurrent status distribution:');
        counts.rows.forEach(r => console.log(`  ${r.status}: ${r.count}`));

        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

run();
