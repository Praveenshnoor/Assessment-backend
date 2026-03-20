-- ============================================================
-- STEP 1: Diagnose current status distribution
-- ============================================================
SELECT status, COUNT(*) AS count
FROM job_applications
GROUP BY status
ORDER BY count DESC;

-- ============================================================
-- STEP 2: Fix wrongly-rejected students who passed and are not flagged
-- Root cause: violations were counted across ALL jobs, not just this one
-- A student is only "flagged" if they have >5 violations on THIS job's tests
-- ============================================================
UPDATE job_applications ja
SET status = 'shortlisted',
    passed_assessment = true,
    updated_at = CURRENT_TIMESTAMP
WHERE ja.status = 'rejected'
  AND ja.passed_assessment = true
  AND (
      SELECT COUNT(*)
      FROM proctoring_violations pv
      WHERE pv.student_id = ja.student_id::varchar
        AND pv.test_id IN (
            SELECT test_id FROM job_opening_tests WHERE job_opening_id = ja.job_opening_id
        )
  ) <= 5;

-- ============================================================
-- STEP 3: Fix applications stuck at assessment_completed
-- Uses per-job violation count (not global)
-- ============================================================
UPDATE job_applications ja
SET status = CASE
    WHEN ja.passed_assessment = true
         AND (
             SELECT COUNT(*)
             FROM proctoring_violations pv
             WHERE pv.student_id = ja.student_id::varchar
               AND pv.test_id IN (
                   SELECT test_id FROM job_opening_tests WHERE job_opening_id = ja.job_opening_id
               )
         ) <= 5
    THEN 'shortlisted'
    ELSE 'rejected'
END,
updated_at = CURRENT_TIMESTAMP
WHERE ja.status = 'assessment_completed'
  AND ja.passed_assessment IS NOT NULL;

-- ============================================================
-- STEP 4: Normalize remaining legacy statuses → assessment_assigned
-- ============================================================
UPDATE job_applications
SET status = 'assessment_assigned',
    updated_at = CURRENT_TIMESTAMP
WHERE status IN ('submitted', 'screening');

-- ============================================================
-- STEP 5: Verify final state
-- ============================================================
SELECT status, COUNT(*) AS count
FROM job_applications
GROUP BY status
ORDER BY count DESC;
