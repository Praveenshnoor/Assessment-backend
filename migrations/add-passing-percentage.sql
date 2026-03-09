-- Add passing_percentage column to tests table
ALTER TABLE tests 
ADD COLUMN IF NOT EXISTS passing_percentage INTEGER DEFAULT 50;

-- Add comment
COMMENT ON COLUMN tests.passing_percentage IS 'Minimum percentage required to pass the test (default: 50)';
