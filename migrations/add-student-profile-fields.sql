-- Add additional student profile fields
-- Run this migration in pgAdmin for your PostgreSQL database

ALTER TABLE students ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE students ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS college_name VARCHAR(255);
ALTER TABLE students ADD COLUMN IF NOT EXISTS course VARCHAR(100);
ALTER TABLE students ADD COLUMN IF NOT EXISTS specialization VARCHAR(100);

-- Verify the changes
SELECT column_name, data_type, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'students' 
AND column_name IN ('phone', 'address', 'college_name', 'course', 'specialization');
