-- Performance Indexes for 300+ Concurrent Users
-- Run this migration to improve query performance

-- ============================================
-- STUDENTS TABLE INDEXES
-- ============================================

-- Index for student login (email lookup) - Already exists in schema
-- CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);

-- Index for student lookup by roll number - Already exists in schema
-- CREATE INDEX IF NOT EXISTS idx_students_roll_number ON students(roll_number);

-- Index for firebase UID lookup - Already exists in schema
-- CREATE INDEX IF NOT EXISTS idx_students_firebase_uid ON students(firebase_uid);

-- New: Index for created_at (for sorting/filtering)
CREATE INDEX IF NOT EXISTS idx_students_created_at ON students(created_at);

-- ============================================
-- TESTS TABLE INDEXES
-- ============================================

-- Index for test status queries
CREATE INDEX IF NOT EXISTS idx_tests_status ON tests(status);

-- Index for published tests
CREATE INDEX IF NOT EXISTS idx_tests_is_published ON tests(is_published);

-- Index for test date range queries
CREATE INDEX IF NOT EXISTS idx_tests_dates ON tests(start_datetime, end_datetime);

-- Composite index for active tests lookup
CREATE INDEX IF NOT EXISTS idx_tests_active ON tests(status, start_datetime, end_datetime) 
WHERE status = 'published';

-- Index for created_at
CREATE INDEX IF NOT EXISTS idx_tests_created_at ON tests(created_at);

-- ============================================
-- QUESTIONS TABLE INDEXES
-- ============================================

-- Index for test questions lookup - Already exists in schema
-- CREATE INDEX IF NOT EXISTS idx_questions_test_id ON questions(test_id);

-- ============================================
-- EXAM_PROGRESS TABLE INDEXES
-- ============================================

-- Index for student progress lookup
CREATE INDEX IF NOT EXISTS idx_exam_progress_student ON exam_progress(student_id);

-- Index for test progress lookup
CREATE INDEX IF NOT EXISTS idx_exam_progress_test ON exam_progress(test_id);

-- Composite index for student + test lookup - Already exists in schema
-- CREATE INDEX IF NOT EXISTS idx_exam_progress_student_test ON exam_progress(student_id, test_id);

-- Index for last_saved timestamp (if column exists)
-- Note: last_saved column may not exist in all database versions
-- CREATE INDEX IF NOT EXISTS idx_exam_progress_last_saved ON exam_progress(last_saved);

-- ============================================
-- TEST_ATTEMPTS TABLE INDEXES
-- ============================================

-- Index for student attempts lookup
CREATE INDEX IF NOT EXISTS idx_test_attempts_student ON test_attempts(student_id);

-- Index for test attempts lookup
CREATE INDEX IF NOT EXISTS idx_test_attempts_test ON test_attempts(test_id);

-- Composite index for student + test attempts
CREATE INDEX IF NOT EXISTS idx_test_attempts_student_test ON test_attempts(student_id, test_id);

-- Index for submission date queries
CREATE INDEX IF NOT EXISTS idx_test_attempts_submitted_at ON test_attempts(submitted_at);

-- Composite index for test results with date
CREATE INDEX IF NOT EXISTS idx_test_attempts_test_date ON test_attempts(test_id, submitted_at);

-- ============================================
-- RESULTS TABLE INDEXES
-- ============================================

-- Index for student results lookup - Already exists in schema
-- CREATE INDEX IF NOT EXISTS idx_results_student_id ON results(student_id);

-- Index for exam results lookup - Already exists in schema
-- CREATE INDEX IF NOT EXISTS idx_results_exam_id ON results(exam_id);

-- Composite index for student + exam results
CREATE INDEX IF NOT EXISTS idx_results_student_exam ON results(student_id, exam_id);

-- Index for created_at
CREATE INDEX IF NOT EXISTS idx_results_created_at ON results(created_at);

-- ============================================
-- STUDENT_RESPONSES TABLE INDEXES
-- ============================================

-- Index for student responses
CREATE INDEX IF NOT EXISTS idx_student_responses_student ON student_responses(student_id);

-- Index for test responses
CREATE INDEX IF NOT EXISTS idx_student_responses_test ON student_responses(test_id);

-- Index for question responses
CREATE INDEX IF NOT EXISTS idx_student_responses_question ON student_responses(question_id);

-- Composite index for student + test responses
CREATE INDEX IF NOT EXISTS idx_student_responses_student_test ON student_responses(student_id, test_id);

-- ============================================
-- EXAMS TABLE INDEXES
-- ============================================

-- Index for exam date
CREATE INDEX IF NOT EXISTS idx_exams_date ON exams(date);

-- Index for created_at
CREATE INDEX IF NOT EXISTS idx_exams_created_at ON exams(created_at);

-- ============================================
-- ANALYZE TABLES FOR QUERY PLANNER
-- ============================================

ANALYZE students;
ANALYZE tests;
ANALYZE questions;
ANALYZE exam_progress;
ANALYZE test_attempts;
ANALYZE results;
ANALYZE student_responses;
ANALYZE exams;
ANALYZE admins;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check all indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Check table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

COMMIT;
