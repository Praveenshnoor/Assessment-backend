-- Add proctoring_sessions table for tracking live proctoring
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

-- Create indices for better query performance
CREATE INDEX IF NOT EXISTS idx_proctoring_student ON proctoring_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_proctoring_test ON proctoring_sessions(test_id);
CREATE INDEX IF NOT EXISTS idx_proctoring_status ON proctoring_sessions(connection_status);
