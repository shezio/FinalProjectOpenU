-- Add new task type for "הסרת משפחה מקבוצה" (Remove family from group)
INSERT INTO childsmile_app_task_types (task_type, resource, action)
VALUES ('הסרת משפחה מקבוצה', 'childsmile_app_children', 'UPDATE')
ON CONFLICT (task_type) DO NOTHING;
