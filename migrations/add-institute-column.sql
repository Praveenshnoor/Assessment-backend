-- Migration: Add institute column to students table
-- Date: 2026-02-10
-- Description: Adds a mandatory institute/university field to the students table

-- Add institute column (allowing NULL initially for existing records)
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS institute VARCHAR(255);

-- Update existing records with a default value (you can customize this)
UPDATE students 
SET institute = 'Not Specified' 
WHERE institute IS NULL;

-- Make the column NOT NULL after setting defaults
ALTER TABLE students 
ALTER COLUMN institute SET NOT NULL;

-- Verify the change
SELECT COUNT(*) as total_students, 
       COUNT(institute) as students_with_institute 
FROM students;