-- Migration: Fix timezone handling for datetime columns
-- This converts TIMESTAMP columns to TIMESTAMPTZ to properly handle timezones

-- First, check current data
SELECT id, title, start_datetime, end_datetime, 
       start_datetime AT TIME ZONE 'UTC' as start_utc,
       NOW() AT TIME ZONE 'UTC' as now_utc
FROM tests 
WHERE start_datetime IS NOT NULL
LIMIT 5;

-- Convert start_datetime to TIMESTAMPTZ
-- Assuming existing times are in Asia/Kolkata timezone
ALTER TABLE tests
ALTER COLUMN start_datetime TYPE TIMESTAMPTZ
USING start_datetime AT TIME ZONE 'Asia/Kolkata';

-- Convert end_datetime to TIMESTAMPTZ
ALTER TABLE tests
ALTER COLUMN end_datetime TYPE TIMESTAMPTZ
USING end_datetime AT TIME ZONE 'Asia/Kolkata';

-- Verify the conversion
SELECT id, title, start_datetime, end_datetime
FROM tests 
WHERE start_datetime IS NOT NULL
LIMIT 5;
