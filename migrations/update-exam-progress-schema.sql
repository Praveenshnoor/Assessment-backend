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
