/**
 * run-job-board-migrations.js
 * Runs all database migrations required for the Job Board feature.
 * Usage: node run-job-board-migrations.js
 */

const { pool } = require('./config/db');

async function runMigrations() {
    const client = await pool.connect();
    console.log('✅ Connected to database');

    try {
        await client.query('BEGIN');

        // ── 1. passing_percentage column on tests ────────────────────────────
        console.log('\n[1/4] Adding passing_percentage to tests...');
        await client.query(`
            ALTER TABLE tests
            ADD COLUMN IF NOT EXISTS passing_percentage INTEGER DEFAULT 50;
        `);
        console.log('    ✅ Done');

        // ── 2. job_openings table ────────────────────────────────────────────
        console.log('[2/4] Creating job_openings tables...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS job_openings (
                id SERIAL PRIMARY KEY,
                company_name VARCHAR(255) NOT NULL,
                job_role VARCHAR(255) NOT NULL,
                job_description TEXT NOT NULL,
                registration_deadline TIMESTAMPTZ NOT NULL,
                eligibility_criteria TEXT NOT NULL,
                application_link VARCHAR(500),
                admin_id INTEGER REFERENCES admins(id) ON DELETE SET NULL,
                status VARCHAR(20) DEFAULT 'draft',
                is_published BOOLEAN DEFAULT false,
                published_at TIMESTAMPTZ,
                application_mode VARCHAR(20) DEFAULT 'external',
                min_cgpa DECIMAL(3,2),
                allowed_branches TEXT,
                max_active_backlogs INTEGER,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS job_notifications (
                id SERIAL PRIMARY KEY,
                job_opening_id INTEGER NOT NULL REFERENCES job_openings(id) ON DELETE CASCADE,
                student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
                email_status VARCHAR(20) DEFAULT 'sent',
                email_sent_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(job_opening_id, student_id)
            );

            CREATE INDEX IF NOT EXISTS idx_job_openings_status      ON job_openings(status);
            CREATE INDEX IF NOT EXISTS idx_job_openings_published   ON job_openings(is_published);
            CREATE INDEX IF NOT EXISTS idx_job_openings_deadline    ON job_openings(registration_deadline);
            CREATE INDEX IF NOT EXISTS idx_job_notifications_job    ON job_notifications(job_opening_id);
            CREATE INDEX IF NOT EXISTS idx_job_notifications_student ON job_notifications(student_id);
        `);
        console.log('    ✅ Done');

        // ── 3. job_applications & related tables ─────────────────────────────
        console.log('[3/4] Creating job_applications tables...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS job_applications (
                id SERIAL PRIMARY KEY,
                job_opening_id INTEGER NOT NULL REFERENCES job_openings(id) ON DELETE CASCADE,
                student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
                resume_url TEXT,
                cover_letter TEXT,
                status VARCHAR(50) DEFAULT 'submitted',
                is_eligible BOOLEAN DEFAULT true,
                eligibility_notes TEXT,
                test_assigned_at TIMESTAMPTZ,
                test_completed_at TIMESTAMPTZ,
                assessment_score DECIMAL(5,2),
                passed_assessment BOOLEAN,
                applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                reviewed_by INTEGER REFERENCES admins(id),
                reviewed_at TIMESTAMPTZ,
                UNIQUE(job_opening_id, student_id)
            );

            CREATE TABLE IF NOT EXISTS job_opening_tests (
                id SERIAL PRIMARY KEY,
                job_opening_id INTEGER NOT NULL REFERENCES job_openings(id) ON DELETE CASCADE,
                test_id INTEGER NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
                is_mandatory BOOLEAN DEFAULT true,
                weightage INTEGER DEFAULT 100,
                passing_criteria INTEGER DEFAULT 50,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(job_opening_id, test_id)
            );

            CREATE TABLE IF NOT EXISTS job_eligibility_rules (
                id SERIAL PRIMARY KEY,
                job_opening_id INTEGER NOT NULL REFERENCES job_openings(id) ON DELETE CASCADE,
                rule_type VARCHAR(50) NOT NULL,
                operator VARCHAR(20) NOT NULL,
                value TEXT NOT NULL,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_job_applications_student    ON job_applications(student_id);
            CREATE INDEX IF NOT EXISTS idx_job_applications_job        ON job_applications(job_opening_id);
            CREATE INDEX IF NOT EXISTS idx_job_applications_status     ON job_applications(status);
            CREATE INDEX IF NOT EXISTS idx_job_applications_applied_at ON job_applications(applied_at DESC);
            CREATE INDEX IF NOT EXISTS idx_job_opening_tests_job       ON job_opening_tests(job_opening_id);
            CREATE INDEX IF NOT EXISTS idx_job_opening_tests_test      ON job_opening_tests(test_id);
        `);
        console.log('    ✅ Done');

        // ── 4. test_attempts – add job_application_id column ─────────────────
        console.log('[4/4] Patching test_attempts for job application tracking...');
        await client.query(`
            DO $$
            BEGIN
                -- Create test_attempts if it doesn't exist yet
                CREATE TABLE IF NOT EXISTS test_attempts (
                    id SERIAL PRIMARY KEY,
                    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
                    test_id INTEGER NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
                    total_marks DECIMAL(8,2),
                    obtained_marks DECIMAL(8,2),
                    percentage DECIMAL(5,2),
                    job_application_id INTEGER REFERENCES job_applications(id) ON DELETE SET NULL,
                    submitted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
                );
            EXCEPTION WHEN duplicate_table THEN NULL;
            END$$;

            -- Add job_application_id if not present (already-existing table)
            ALTER TABLE test_attempts
            ADD COLUMN IF NOT EXISTS job_application_id INTEGER REFERENCES job_applications(id) ON DELETE SET NULL;

            CREATE INDEX IF NOT EXISTS idx_test_attempts_job_application ON test_attempts(job_application_id);

            -- Drop old unique constraint that would block re-taking for different applications
            ALTER TABLE test_attempts DROP CONSTRAINT IF EXISTS test_attempts_student_id_test_id_key;

            -- New unique constraint includes application
            DO $$
            BEGIN
                ALTER TABLE test_attempts
                ADD CONSTRAINT test_attempts_student_test_application_unique
                UNIQUE (student_id, test_id, job_application_id);
            EXCEPTION WHEN duplicate_table THEN NULL;
            END$$;
        `);
        console.log('    ✅ Done');

        await client.query('COMMIT');
        console.log('\n🎉 All job board migrations completed successfully!');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('\n❌ Migration failed — rolled back:', err.message);
        console.error(err.stack);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

runMigrations();
