-- Add audit columns to tests table
ALTER TABLE tests 
ADD COLUMN IF NOT EXISTS created_by VARCHAR(255) DEFAULT 'admin',
ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;

-- Update existing records to have created_by
UPDATE tests 
SET created_by = 'admin' 
WHERE created_by IS NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_tests_created_by ON tests(created_by);
CREATE INDEX IF NOT EXISTS idx_tests_updated_by ON tests(updated_by);
