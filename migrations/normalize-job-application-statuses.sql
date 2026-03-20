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
-- STEP 4: Fix students who completed all tests but status is still
-- assessment_assigned / submitted / screening
-- Uses COALESCE to handle NULL from bool_and (no rows = treat as failed)
-- ============================================================
UPDATE job_applications ja
SET status = CASE
    WHEN COALESCE(
        (
            SELECT bool_and(ta.percentage >= t.passing_percentage)
            FROM test_attempts ta
            INNER JOIN tests t ON ta.test_id = t.id
            WHERE ta.job_application_id = ja.id
              AND ta.student_id = ja.student_id
        ), false
    ) = true
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
passed_assessment = COALESCE(
    (
        SELECT bool_and(ta.percentage >= t.passing_percentage)
        FROM test_attempts ta
        INNER JOIN tests t ON ta.test_id = t.id
        WHERE ta.job_application_id = ja.id
          AND ta.student_id = ja.student_id
    ), false
),
assessment_score = (
    SELECT AVG(ta.percentage)
    FROM test_attempts ta
    WHERE ta.job_application_id = ja.id
      AND ta.student_id = ja.student_id
),
test_completed_at = CURRENT_TIMESTAMP,
updated_at = CURRENT_TIMESTAMP
WHERE ja.status IN ('assessment_assigned', 'submitted', 'screening')
  AND (
      -- Only update if student has completed ALL linked tests
      SELECT COUNT(DISTINCT ta.test_id)
      FROM test_attempts ta
      WHERE ta.job_application_id = ja.id
        AND ta.student_id = ja.student_id
  ) >= (
      SELECT COUNT(*)
      FROM job_opening_tests jot
      WHERE jot.job_opening_id = ja.job_opening_id
  )
  AND (
      SELECT COUNT(*)
      FROM job_opening_tests jot
      WHERE jot.job_opening_id = ja.job_opening_id
  ) > 0;

-- ============================================================
-- STEP 5: Normalize remaining legacy statuses → assessment_assigned
-- (students who haven't completed tests yet)
-- ============================================================
UPDATE job_applications
SET status = 'assessment_assigned',
    updated_at = CURRENT_TIMESTAMP
WHERE status IN ('submitted', 'screening');

-- ============================================================
-- STEP 6: Verify final state
-- ============================================================
SELECT status, COUNT(*) AS count
FROM job_applications
GROUP BY status
ORDER BY count DESC;

-- ============================================================
-- STEP 7: Sanity check — find any remaining mismatches
-- (students with completed test_attempts but non-terminal status)
-- ============================================================
SELECT ja.id, ja.student_id, ja.status, ja.passed_assessment,
       COUNT(ta.id) AS completed_attempts,
       (SELECT COUNT(*) FROM job_opening_tests jot WHERE jot.job_opening_id = ja.job_opening_id) AS total_tests
FROM job_applications ja
LEFT JOIN test_attempts ta ON ta.job_application_id = ja.id
WHERE ja.status = 'assessment_assigned'
GROUP BY ja.id, ja.student_id, ja.status, ja.passed_assessment
HAVING COUNT(ta.id) > 0;

-- ============================================================
-- STEP 8: Quick fix for the specific stuck student case —
-- find any assessment_assigned student who has attempts but
-- passed_assessment is NULL or wrong
-- ============================================================
SELECT 
    ja.id AS application_id,
    ja.student_id,
    ja.status,
    ja.passed_assessment,
    s.full_name,
    s.email,
    COUNT(ta.id) AS attempt_count,
    COALESCE(bool_and(ta.percentage >= t.passing_percentage), false) AS actually_passed,
    (
        SELECT COUNT(*) FROM proctoring_violations pv
        WHERE pv.student_id = ja.student_id::varchar
          AND pv.test_id IN (SELECT test_id FROM job_opening_tests WHERE job_opening_id = ja.job_opening_id)
    ) AS violation_count
FROM job_applications ja
INNER JOIN students s ON s.id = ja.student_id
LEFT JOIN test_attempts ta ON ta.job_application_id = ja.id
LEFT JOIN tests t ON ta.test_id = t.id
WHERE ja.status = 'assessment_assigned'
GROUP BY ja.id, ja.student_id, ja.status, ja.passed_assessment, s.full_name, s.email
HAVING COUNT(ta.id) > 0;
