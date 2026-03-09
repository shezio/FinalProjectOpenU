-- select all tasks on shlezi0@gmail.com
SELECT COUNT(*) as task_count
FROM childsmile_app_tasks
WHERE assigned_to_id IN (
    SELECT staff_id 
    FROM childsmile_app_staff 
    WHERE email = 'shlezi0@gmail.com'
);

--delete them
DELETE FROM childsmile_app_tasks
WHERE assigned_to_id IN (
    SELECT staff_id 
    FROM childsmile_app_staff 
    WHERE email = 'shlezi0@gmail.com'
);