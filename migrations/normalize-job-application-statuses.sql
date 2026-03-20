-- Normalize legacy job application statuses
-- Converts: submitted, screening, assessment_completed → assessment_assigned
-- Only affects rows not already shortlisted or rejected
-- Safe to run on deployed data — idempotent

UPDATE job_applications
SET status = 'assessment_assigned',
    updated_at = CURRENT_TIMESTAMP
WHERE status IN ('submitted', 'screening', 'assessment_completed')
  AND status NOT IN ('shortlisted', 'rejected');

-- Verify result
SELECT status, COUNT(*) AS count
FROM job_applications
GROUP BY status
ORDER BY count DESC;
