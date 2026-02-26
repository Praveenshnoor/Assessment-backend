-- Create proctoring_messages table for real-time admin-student communication
-- This table stores messages sent from admins/proctors to students during live sessions

CREATE TABLE IF NOT EXISTS proctoring_messages (
    id SERIAL PRIMARY KEY,
    admin_id VARCHAR(255) NOT NULL,
    student_id VARCHAR(255) NOT NULL,
    test_id VARCHAR(255),
    message TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'warning'
        CHECK (message_type IN ('warning', 'instruction', 'alert', 'info')),
    priority VARCHAR(20) DEFAULT 'medium'
        CHECK (priority IN ('low', 'medium', 'high')),
    session_id VARCHAR(255),
    message_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_status BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_proctoring_messages_student_id ON proctoring_messages(student_id);
CREATE INDEX IF NOT EXISTS idx_proctoring_messages_admin_id ON proctoring_messages(admin_id);
CREATE INDEX IF NOT EXISTS idx_proctoring_messages_test_id ON proctoring_messages(test_id);
CREATE INDEX IF NOT EXISTS idx_proctoring_messages_session_id ON proctoring_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_proctoring_messages_message_timestamp ON proctoring_messages(message_timestamp);
CREATE INDEX IF NOT EXISTS idx_proctoring_messages_read_status ON proctoring_messages(read_status);

-- Add comments for documentation
COMMENT ON TABLE proctoring_messages IS 'Stores real-time messages sent from admins/proctors to students during live exam sessions';
COMMENT ON COLUMN proctoring_messages.admin_id IS 'ID of the admin/proctor who sent the message';
COMMENT ON COLUMN proctoring_messages.student_id IS 'ID of the student receiving the message';
COMMENT ON COLUMN proctoring_messages.test_id IS 'ID of the test/exam being taken';
COMMENT ON COLUMN proctoring_messages.message_type IS 'Type of message: warning, instruction, alert, info';
COMMENT ON COLUMN proctoring_messages.priority IS 'Priority level: low, medium, high - affects UI display';
COMMENT ON COLUMN proctoring_messages.session_id IS 'Session identifier for the specific exam attempt';
COMMENT ON COLUMN proctoring_messages.read_status IS 'Whether the student has acknowledged reading the message';
COMMENT ON COLUMN proctoring_messages.read_at IS 'Timestamp when the student acknowledged the message';

-- Create a function to update the updated_at column automatically
CREATE OR REPLACE FUNCTION update_proctoring_messages_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating updated_at column
DROP TRIGGER IF EXISTS update_proctoring_messages_timestamp_trigger ON proctoring_messages;
CREATE TRIGGER update_proctoring_messages_timestamp_trigger
BEFORE UPDATE ON proctoring_messages
FOR EACH ROW
EXECUTE FUNCTION update_proctoring_messages_timestamp();