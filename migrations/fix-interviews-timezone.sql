-- Fix interviews table timezone columns
-- Convert scheduled_time from TIMESTAMP to TIMESTAMPTZ

-- Check current data type
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'interviews' 
AND column_name = 'scheduled_time';

-- Convert scheduled_time to TIMESTAMPTZ
-- Assuming existing times are in Asia/Kolkata timezone
ALTER TABLE interviews
ALTER COLUMN scheduled_time TYPE TIMESTAMPTZ
USING scheduled_time AT TIME ZONE 'Asia/Kolkata';

-- Verify the conversion
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'interviews' 
AND column_name = 'scheduled_time';

-- Show sample data to verify
SELECT id, scheduled_time, status
FROM interviews 
WHERE scheduled_time IS NOT NULL
LIMIT 5;
