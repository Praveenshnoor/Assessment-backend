-- Student Support Conversations Migration
-- For two-way chat between students and admin

-- ============================================
-- SUPPORT CONVERSATIONS TABLE
-- Stores conversation threads between students and admin
-- ============================================

-- First, add columns to existing student_messages table if needed
ALTER TABLE student_messages 
ADD COLUMN IF NOT EXISTS student_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS college VARCHAR(255),
ADD COLUMN IF NOT EXISTS conversation_id INTEGER,
ADD COLUMN IF NOT EXISTS sender_type VARCHAR(20) DEFAULT 'student',
ADD COLUMN IF NOT EXISTS parent_message_id INTEGER REFERENCES student_messages(id);

-- Create index for faster student queries
CREATE INDEX IF NOT EXISTS idx_student_messages_student_id ON student_messages(student_id);
CREATE INDEX IF NOT EXISTS idx_student_messages_college ON student_messages(college);
CREATE INDEX IF NOT EXISTS idx_student_messages_conversation ON student_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_student_messages_sender ON student_messages(sender_type);

-- Comment on new columns
COMMENT ON COLUMN student_messages.student_id IS 'Student ID for authenticated student messages';
COMMENT ON COLUMN student_messages.college IS 'College/Institute name of the student';
COMMENT ON COLUMN student_messages.conversation_id IS 'Groups related messages in a conversation thread';
COMMENT ON COLUMN student_messages.sender_type IS 'Sender type: student or admin';
COMMENT ON COLUMN student_messages.parent_message_id IS 'Reference to parent message for threaded replies';
