-- Check if audio violations are being stored in the database

-- 1. Check all violation types in the database
SELECT 
    violation_type,
    COUNT(*) as count,
    COUNT(DISTINCT student_id) as unique_students
FROM proctoring_violations
GROUP BY violation_type
ORDER BY count DESC;

-- 2. Check specifically for audio violations
SELECT 
    violation_type,
    severity,
    COUNT(*) as count
FROM proctoring_violations
WHERE violation_type IN ('loud_noise', 'voice_detected', 'microphone_silent')
GROUP BY violation_type, severity
ORDER BY violation_type;

-- 3. Get recent audio violations (last 100)
SELECT 
    id,
    student_id,
    test_id,
    violation_type,
    severity,
    message,
    timestamp
FROM proctoring_violations
WHERE violation_type IN ('loud_noise', 'voice_detected', 'microphone_silent')
ORDER BY timestamp DESC
LIMIT 100;

-- 4. Get all violations for a specific test (replace TEST_ID with actual test ID)
-- SELECT 
--     pv.student_id,
--     s.full_name as student_name,
--     COUNT(CASE WHEN pv.violation_type = 'loud_noise' THEN 1 END) as loud_noise_count,
--     COUNT(CASE WHEN pv.violation_type = 'voice_detected' THEN 1 END) as voice_detected_count,
--     COUNT(CASE WHEN pv.violation_type = 'microphone_silent' THEN 1 END) as microphone_silent_count,
--     COUNT(*) as total_violations
-- FROM proctoring_violations pv
-- LEFT JOIN students s ON pv.student_id = s.id::text
-- WHERE pv.test_id = TEST_ID
-- GROUP BY pv.student_id, s.full_name
-- ORDER BY total_violations DESC;

-- 5. Check if there are ANY violations at all
SELECT COUNT(*) as total_violations FROM proctoring_violations;

-- 6. Check the most recent violations of any type
SELECT 
    id,
    student_id,
    test_id,
    violation_type,
    severity,
    message,
    timestamp
FROM proctoring_violations
ORDER BY timestamp DESC
LIMIT 20;
