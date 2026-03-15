-- Cleanup script for production tutors with "אין_חניך" status
-- This script sets tutee_wellness and relationship_status to NULL for all tutors 
-- who are NOT currently in an active tutorship (tutorship_status = "אין_חניך")
-- 
-- Context: These fields should only be populated while a tutor is actively tutoring.
-- This cleanup handles any historical data that may have been left behind.

-- Step 1: Identify and cleanup tutors with "אין_חניך" status
-- These tutors should not have active wellness or relationship data
UPDATE childsmile_app_tutors
SET 
    tutee_wellness = NULL,
    relationship_status = NULL,
    updated = CURRENT_TIMESTAMP
WHERE 
    tutorship_status = 'אין_חניך'
    AND (tutee_wellness IS NOT NULL OR relationship_status IS NOT NULL);

-- Step 2: Verify the cleanup
-- Run this query to see how many records were affected:
-- SELECT COUNT(*) as affected_tutors
-- FROM childsmile_app_tutors
-- WHERE 
--     tutorship_status = 'אין_חניך'
--     AND (tutee_wellness IS NOT NULL OR relationship_status IS NOT NULL);

-- Step 3: Additional safety check - ensure no tutors in "אין_חניך" status are still linked to active tutorships
-- This should return 0 rows (no conflicts):
-- SELECT t.id_id, t.tutor_email, t.tutorship_status, ts.id as tutorship_id
-- FROM childsmile_app_tutors t
-- LEFT JOIN childsmile_app_tutorships ts ON t.id_id = ts.tutor_id 
--     AND ts.tutorship_activation IN ('active', 'pending_first_approval')
-- WHERE t.tutorship_status = 'אין_חניך' AND ts.id IS NOT NULL;

-- Notes:
-- - This cleanup is safe to run even if tutor.is_t_imported = TRUE
-- - The delete_tutorship function now automatically clears these fields
-- - Any new tutorships will set these fields appropriately
-- - For tutors with "יש_חניך" status (active tutorship), these fields are managed by the UI
