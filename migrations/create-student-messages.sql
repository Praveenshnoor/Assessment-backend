-- Student Messages Table Migration
-- For chatbot support contact feature

-- ============================================
-- STUDENT MESSAGES TABLE
-- Stores support messages from students through chatbot
-- ============================================

CREATE TABLE IF NOT EXISTS student_messages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) DEFAULT 'Anonymous',
    email VARCHAR(255),
    message TEXT NOT NULL,
    topic VARCHAR(100) DEFAULT 'General',
    image_path VARCHAR(500),
    status VARCHAR(20) DEFAULT 'unread', -- unread, read, archived
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMPTZ
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_student_messages_status ON student_messages(status);
CREATE INDEX IF NOT EXISTS idx_student_messages_created_at ON student_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_student_messages_topic ON student_messages(topic);

-- Comment on table
COMMENT ON TABLE student_messages IS 'Stores support messages from students via the chatbot contact feature';
COMMENT ON COLUMN student_messages.status IS 'Message status: unread, read, archived';
COMMENT ON COLUMN student_messages.image_path IS 'Relative path to uploaded screenshot image';
