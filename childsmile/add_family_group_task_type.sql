-- Add new task type for "צירוף משפחה לקבוצה"
INSERT INTO childsmile_app_task_types (task_type, resource, action)
VALUES ('צירוף משפחה לקבוצה', 'childsmile_app_children', 'CREATE')
ON CONFLICT (task_type) DO NOTHING;
