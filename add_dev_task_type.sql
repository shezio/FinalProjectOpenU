-- Add "dev task" task type
-- Run this directly in the database (not a Django migration)

INSERT INTO childsmile_app_task_types (task_type, resource, action)
VALUES ('משימת פיתוח', 'childsmile_app_tasks', 'CREATE')
ON CONFLICT (task_type) DO NOTHING;
