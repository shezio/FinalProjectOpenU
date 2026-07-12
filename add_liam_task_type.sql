-- =============================================================
-- Add "משימת ליאם" (Liam task) task type
--   + remove the obsolete feedback tasks (4 feedback task types)
--
-- Run this directly in the database (not a Django migration).
--
-- What this does:
--   1. Adds a new "משימת ליאם" task type. It mirrors the dev task
--      type ("משימת פיתוח") — a free-form task Liam keeps for his own
--      work — but has NO notifications attached to it.
--   2. Removes the obsolete feedback tasks AND their task types. Feedback is
--      now filled through the unified Feedbacks screen, so both the feedback
--      task rows and the feedback task TYPES themselves are dead weight.
--      Four feedback task types are covered:
--        משוב חונך               (tutor feedback)
--        סקירת משוב חונך         (tutor feedback review)
--        משוב מתנדב כללי         (general volunteer feedback)
--        סקירת משוב מתנדב כללי   (general volunteer feedback review)
--      Task rows are deleted first, then the types — the only FK into
--      task_types is childsmile_app_tasks.task_type_id.
-- =============================================================

BEGIN;

-- 1. Add the "משימת ליאם" task type (idempotent).
INSERT INTO childsmile_app_task_types (task_type, resource, action)
VALUES ('משימת ליאם', 'childsmile_app_tasks', 'CREATE')
ON CONFLICT (task_type) DO NOTHING;

-- 2a. Count the feedback tasks about to be deleted (expected: 4).
SELECT COUNT(*) AS feedback_tasks_to_delete
FROM childsmile_app_tasks
WHERE task_type_id IN (
    SELECT id FROM childsmile_app_task_types
    WHERE task_type IN (
        'משוב חונך',
        'סקירת משוב חונך',
        'משוב מתנדב כללי',
        'סקירת משוב מתנדב כללי'
    )
);

-- 2b. Delete the feedback tasks (task rows only).
DELETE FROM childsmile_app_tasks
WHERE task_type_id IN (
    SELECT id FROM childsmile_app_task_types
    WHERE task_type IN (
        'משוב חונך',
        'סקירת משוב חונך',
        'משוב מתנדב כללי',
        'סקירת משוב מתנדב כללי'
    )
);

-- 2c. Verify: should return 0 after deletion.
SELECT COUNT(*) AS feedback_tasks_remaining
FROM childsmile_app_tasks
WHERE task_type_id IN (
    SELECT id FROM childsmile_app_task_types
    WHERE task_type IN (
        'משוב חונך',
        'סקירת משוב חונך',
        'משוב מתנדב כללי',
        'סקירת משוב מתנדב כללי'
    )
);

-- 3a. Count the feedback task TYPES about to be deleted (expected: 4).
SELECT COUNT(*) AS feedback_task_types_to_delete
FROM childsmile_app_task_types
WHERE task_type IN (
    'משוב חונך',
    'סקירת משוב חונך',
    'משוב מתנדב כללי',
    'סקירת משוב מתנדב כללי'
);

-- 3b. Delete the feedback task types themselves (safe now that their tasks
--     are gone — task_type_id is the only FK into this table).
DELETE FROM childsmile_app_task_types
WHERE task_type IN (
    'משוב חונך',
    'סקירת משוב חונך',
    'משוב מתנדב כללי',
    'סקירת משוב מתנדב כללי'
);

-- 3c. Verify: should return 0 after deletion.
SELECT COUNT(*) AS feedback_task_types_remaining
FROM childsmile_app_task_types
WHERE task_type IN (
    'משוב חונך',
    'סקירת משוב חונך',
    'משוב מתנדב כללי',
    'סקירת משוב מתנדב כללי'
);

COMMIT;
