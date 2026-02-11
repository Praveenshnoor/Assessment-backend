const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

const createTables = async () => {
    const client = await pool.connect();
    try {
        console.log('🔌 Connected to database...');

        // 1. Create Students Table
        console.log('Creating students table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS students (
                id SERIAL PRIMARY KEY,
                firebase_uid VARCHAR(255) UNIQUE NOT NULL,
                full_name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                roll_number VARCHAR(100) UNIQUE NOT NULL,
                institute VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Indices for students
        await client.query(`CREATE INDEX IF NOT EXISTS idx_students_firebase_uid ON students(firebase_uid);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);`);

        // 2. Create Admins Table
        console.log('Creating admins table...');
        // Note: Matching schema required by adminAuth.js (email, full_name, password_hash)
        await client.query(`
            CREATE TABLE IF NOT EXISTS admins (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                full_name VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 3. Create Tests Table
        console.log('Creating tests table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS tests (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 4. Create Questions Table
        console.log('Creating questions table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS questions (
                id SERIAL PRIMARY KEY,
                test_id INTEGER NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
                question_text TEXT NOT NULL,
                option_a TEXT NOT NULL,
                option_b TEXT NOT NULL,
                option_c TEXT,
                option_d TEXT,
                correct_option VARCHAR(1) NOT NULL,
                marks INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Create index on test_id for faster lookups
        await client.query(`CREATE INDEX IF NOT EXISTS idx_questions_test_id ON questions(test_id);`);

        // 5. Create Student Responses Table (for tracking student answers)
        console.log('Creating student_responses table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS student_responses (
                id SERIAL PRIMARY KEY,
                student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
                test_id INTEGER REFERENCES tests(id) ON DELETE CASCADE,
                question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
                selected_option VARCHAR(1),
                is_correct BOOLEAN,
                marks_obtained INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(student_id, question_id)
            );
        `);

        // 6. Create Test Attempts Table (to track overall test submissions)
        console.log('Creating test_attempts table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS test_attempts (
                id SERIAL PRIMARY KEY,
                student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
                test_id INTEGER REFERENCES tests(id) ON DELETE CASCADE,
                total_marks INTEGER DEFAULT 0,
                obtained_marks INTEGER DEFAULT 0,
                percentage DECIMAL(5,2),
                time_taken INTEGER,
                submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(student_id, test_id)
            );
        `);

        // 7. Create Test Assignments Table (for assigning tests to students)
        console.log('Creating test_assignments table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS test_assignments (
                id SERIAL PRIMARY KEY,
                test_id INTEGER REFERENCES tests(id) ON DELETE CASCADE,
                student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
                assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT true,
                UNIQUE(test_id, student_id)
            );
        `);

        // Create indices for test_assignments
        await client.query(`CREATE INDEX IF NOT EXISTS idx_test_assignments_student ON test_assignments(student_id);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_test_assignments_test ON test_assignments(test_id);`);

        // 8. Create Proctoring Sessions Table
    console.log('Creating proctoring_sessions table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS proctoring_sessions (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
        test_id INTEGER REFERENCES tests(id) ON DELETE CASCADE,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ended_at TIMESTAMP,
        duration_minutes INTEGER,
        connection_status VARCHAR(50) DEFAULT 'active',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create indices for proctoring_sessions
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_proctoring_student ON proctoring_sessions(student_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_proctoring_test ON proctoring_sessions(test_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_proctoring_status ON proctoring_sessions(connection_status);
    `);

    // 9. Seed Default Admin
        const defaultAdminEmail = 'admin@example.com';
        const defaultAdminPassword = 'admin123';
        const defaultAdminName = 'System Admin';

        const adminCheck = await client.query('SELECT * FROM admins WHERE email = $1', [defaultAdminEmail]);

        if (adminCheck.rows.length === 0) {
            console.log(`Seeding default admin (${defaultAdminEmail})...`);
            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash(defaultAdminPassword, salt);

            await client.query(
                'INSERT INTO admins (email, password_hash, full_name) VALUES ($1, $2, $3)',
                [defaultAdminEmail, hash, defaultAdminName]
            );
            console.log(`✅ Default admin created: ${defaultAdminEmail} / ${defaultAdminPassword}`);
        } else {
            console.log('ℹ️ Default admin already exists.');
        }

        console.log('✅ Database setup completed successfully!');

    } catch (err) {
        console.error('❌ Error creating tables:', err);
    } finally {
        client.release();
        pool.end();
    }
};

createTables();
