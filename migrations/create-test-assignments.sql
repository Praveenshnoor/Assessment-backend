-- Create test_assignments table
-- This table manages which tests are assigned to which students

CREATE TABLE IF NOT EXISTS test_assignments (
    id SERIAL PRIMARY KEY,
    test_id INTEGER REFERENCES tests(id) ON DELETE CASCADE,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(test_id, student_id)
);

-- Create indices for better query performance
CREATE INDEX IF NOT EXISTS idx_test_assignments_student ON test_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_test_assignments_test ON test_assignments(test_id);
CREATE INDEX IF NOT EXISTS idx_test_assignments_active ON test_assignments(is_active);

-- Add comment
COMMENT ON TABLE test_assignments IS 'Manages assignment of tests to students';
COMMENT ON COLUMN test_assignments.is_active IS 'Whether this assignment is currently active';
