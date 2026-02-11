-- MCQ Exam Portal Database Schema
-- PostgreSQL Database

-- ============================================
-- 1. STUDENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS students (
    id SERIAL PRIMARY KEY,
    firebase_uid VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    roll_number VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for students
CREATE INDEX IF NOT EXISTS idx_students_firebase_uid ON students(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);
CREATE INDEX IF NOT EXISTS idx_students_roll_number ON students(roll_number);

-- ============================================
-- 2. ADMINS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 3. TESTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS tests (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    duration INTEGER DEFAULT 60, -- Duration in minutes
    max_attempts INTEGER DEFAULT 1, -- Number of attempts allowed
    start_datetime TIMESTAMP, -- Exam start date and time
    end_datetime TIMESTAMP, -- Exam end date and time
    status VARCHAR(20) DEFAULT 'draft', -- Test status: draft, published, archived
    is_published BOOLEAN DEFAULT false, -- Legacy field for backward compatibility
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 4. QUESTIONS TABLE
-- ============================================
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

-- Index for questions
CREATE INDEX IF NOT EXISTS idx_questions_test_id ON questions(test_id);

-- ============================================
-- 5. EXAMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS exams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    date DATE DEFAULT CURRENT_DATE,
    duration INTEGER DEFAULT 60,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 6. RESULTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS results (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    marks_obtained NUMERIC(10, 2) NOT NULL,
    total_marks NUMERIC(10, 2) NOT NULL,
    status VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for results
CREATE INDEX IF NOT EXISTS idx_results_student_id ON results(student_id);
CREATE INDEX IF NOT EXISTS idx_results_exam_id ON results(exam_id);

-- ============================================
-- 7. STUDENT RESPONSES TABLE
-- ============================================
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

-- ============================================
-- 8. TEST ATTEMPTS TABLE
-- ============================================
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

-- ============================================
-- 9. EXAM PROGRESS TABLE (for saving progress)
-- ============================================
CREATE TABLE IF NOT EXISTS exam_progress (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    test_id INTEGER NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
    answers JSONB,
    time_remaining INTEGER,
    tab_switch_count INTEGER DEFAULT 0,
    last_saved TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, test_id)
);

-- Indexes for exam_progress
CREATE INDEX IF NOT EXISTS idx_exam_progress_student_test ON exam_progress(student_id, test_id);

-- ============================================
-- SEED DEFAULT ADMIN
-- ============================================
-- Default admin credentials:
-- Email: admin@example.com
-- Password: admin123
-- Note: Password hash is for 'admin123' using bcrypt with salt rounds 10

INSERT INTO admins (email, password_hash, full_name)
VALUES (
    'admin@example.com',
    '$2a$10$YourHashedPasswordHere',
    'System Admin'
)
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- NOTES
-- ============================================
-- 1. The 'tests' table stores test templates created by admin
-- 2. The 'exams' table stores actual exam instances when students take tests
-- 3. Multiple students can take the same test, creating multiple exam records
-- 4. Results are linked to exams (not tests) to track individual attempts
-- 5. Questions are linked to tests (templates)
-- 6. exam_progress stores in-progress exam state for resume functionality


-- Add missing columns to exam_progress table
ALTER TABLE exam_progress 
ADD COLUMN IF NOT EXISTS current_question INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS marked_for_review INTEGER[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS visited_questions INTEGER[] DEFAULT '{0}',
ADD COLUMN IF NOT EXISTS warning_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Update the last_saved column to be updated automatically
CREATE OR REPLACE FUNCTION update_exam_progress_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_exam_progress_timestamp_trigger ON exam_progress;
CREATE TRIGGER update_exam_progress_timestamp_trigger
BEFORE UPDATE ON exam_progress
FOR EACH ROW
EXECUTE FUNCTION update_exam_progress_timestamp();


-- Add passing_percentage column to tests table
ALTER TABLE tests 
ADD COLUMN IF NOT EXISTS passing_percentage INTEGER DEFAULT 50;

-- Add comment
COMMENT ON COLUMN tests.passing_percentage IS 'Minimum percentage required to pass the test (default: 50)';
