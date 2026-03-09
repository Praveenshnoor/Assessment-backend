-- Create institutes table for pre-creating institutes by admin
-- This allows admins to add institutes before students register

CREATE TABLE IF NOT EXISTS institutes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    created_by VARCHAR(255) DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_institutes_name ON institutes(LOWER(name));

-- Add a comment to the table
COMMENT ON TABLE institutes IS 'Stores institute/university names created by admin';
COMMENT ON COLUMN institutes.name IS 'Normalized lowercase institute name for matching';
COMMENT ON COLUMN institutes.display_name IS 'Original display name as entered by admin';

-- Insert any existing institutes from students table (if any)
INSERT INTO institutes (name, display_name, created_by, created_at)
SELECT DISTINCT 
    LOWER(institute) as name,
    MAX(institute) as display_name,
    'migration' as created_by,
    MIN(created_at) as created_at
FROM students
WHERE institute IS NOT NULL AND TRIM(institute) != ''
GROUP BY LOWER(institute)
ON CONFLICT (name) DO NOTHING;