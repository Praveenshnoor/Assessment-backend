-- Add job_role column to tests table
ALTER TABLE tests 
ADD COLUMN IF NOT EXISTS job_role TEXT;

-- Update description column to remove character limit (if it has one)
ALTER TABLE tests 
ALTER COLUMN description TYPE TEXT;

-- Add comment to explain the columns
COMMENT ON COLUMN tests.job_role IS 'Job role/position for which this assessment is designed';
COMMENT ON COLUMN tests.description IS 'Detailed description of the test and job requirements (no character limit)';
