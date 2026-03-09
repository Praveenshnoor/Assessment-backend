-- Migration: Add support for multiple job roles per test
-- This creates a new table to store multiple job roles and their descriptions for each test

-- Create test_job_roles table
CREATE TABLE IF NOT EXISTS test_job_roles (
    id SERIAL PRIMARY KEY,
    test_id INTEGER NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
    job_role VARCHAR(255) NOT NULL,
    job_description TEXT,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(test_id, job_role)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_test_job_roles_test_id ON test_job_roles(test_id);

-- Migrate existing data from tests table to test_job_roles table
-- Only migrate if job_role is not empty
INSERT INTO test_job_roles (test_id, job_role, job_description, is_default)
SELECT 
    id as test_id,
    job_role,
    description as job_description,
    true as is_default
FROM tests
WHERE job_role IS NOT NULL AND job_role != ''
ON CONFLICT (test_id, job_role) DO NOTHING;

-- Note: We keep the job_role and description columns in tests table for backward compatibility
-- They will now represent the default/primary job role
