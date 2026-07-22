-- ============================================================
-- Remove the "שיבוץ מתנדב לפעילות" task type + all its tasks
-- ============================================================
-- The self-assign flow no longer creates an in-system coordinator task (only a
-- WhatsApp notification is sent). This drops the leftover task type and every
-- task that was created under it.
--
-- Run order matters: delete the tasks FIRST, then the type. Tasks.task_type is a
-- FK to childsmile_app_task_types(id); the DB constraint may not cascade, so the
-- type can't be removed while tasks still reference it.
--
-- Fully re-runnable (plain DELETEs — no-ops once the rows are gone).
--
-- NOTE: add_activity_tables.sql still contains the (idempotent) INSERT for this
-- task type. Re-running that file would re-create the *type* row — but since the
-- code no longer creates tasks, it would just sit unused. Re-run THIS file after
-- it if that happens.
-- ============================================================
SELECT id, task_type FROM childsmile_app_task_types
WHERE task_type = 'שיבוץ מתנדב לפעילות';

SELECT COUNT(*) AS leftover_tasks
FROM childsmile_app_tasks t
JOIN childsmile_app_task_types tt ON tt.id = t.task_type_id
WHERE tt.task_type = 'שיבוץ מתנדב לפעילות';
-- 1. Delete every task of this type
-- ============================================================
DELETE FROM childsmile_app_tasks
WHERE task_type_id IN (
    SELECT id FROM childsmile_app_task_types
    WHERE task_type = 'שיבוץ מתנדב לפעילות'
);

-- 2. Delete the task type itself
-- ============================================================
DELETE FROM childsmile_app_task_types
WHERE task_type = 'שיבוץ מתנדב לפעילות';

-- 3. Verify — both queries should return 0 rows
-- ============================================================
SELECT id, task_type FROM childsmile_app_task_types
WHERE task_type = 'שיבוץ מתנדב לפעילות';

SELECT COUNT(*) AS leftover_tasks
FROM childsmile_app_tasks t
JOIN childsmile_app_task_types tt ON tt.id = t.task_type_id
WHERE tt.task_type = 'שיבוץ מתנדב לפעילות';
