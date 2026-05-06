-- =============================================================
-- MIGRATION: Delete all "התאמת חניך" (Tutee Match) tasks
-- Run this ONCE before deploying the single-approval workflow code
--
-- What this does:
--   Deletes all existing "התאמת חניך" tasks from the system.
--   This is safe because:
--   1. Tutorships already exist and are independently managed
--   2. These tasks were just notifications/assignments, not dependencies
--   3. Related tutorships are NOT deleted (only the tasks)
--
-- NO TUTORSHIPS ARE AFFECTED. SAFE TO RUN.
-- =============================================================

BEGIN;

-- 1. Count how many "התאמת חניך" tasks exist (for verification)
SELECT COUNT(*) AS tutee_match_tasks_to_delete
FROM childsmile_app_tasks t
WHERE t.task_type_id = (
    SELECT id FROM childsmile_app_task_types 
    WHERE task_type = 'התאמת חניך'
);

-- 2. Delete all "התאמת חניך" tasks
DELETE FROM childsmile_app_tasks
WHERE task_type_id = (
    SELECT id FROM childsmile_app_task_types 
    WHERE task_type = 'התאמת חניך'
);

-- 3. Verify: should return 0 after deletion
SELECT COUNT(*) AS tutee_match_tasks_remaining
FROM childsmile_app_tasks t
WHERE t.task_type_id = (
    SELECT id FROM childsmile_app_task_types 
    WHERE task_type = 'התאמת חניך'
);

COMMIT;
