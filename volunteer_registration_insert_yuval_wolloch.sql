-- Manual INSERT for volunteer registration: יובל וולוך
-- Registration Date: 2026-03-02 11:34:00
-- This backfills a missing task that wasn't created due to prior bug

-- DELETE any existing incorrect/duplicate tasks for this volunteer
DELETE FROM childsmile_app_tasks WHERE user_info->>'ID' = '333307197';

-- INSERT task for EVERY Volunteer Coordinator
INSERT INTO childsmile_app_tasks 
(description, due_date, status, assigned_to_id, task_type_id, user_info, created_at, updated_at)
SELECT 
'אישור הרשמה ראשוני',
'2026-03-05',
'לא הושלמה',
s.staff_id,
16,
'{"ID": 333307197, "full_name": "יובל וולוך", "email": "yuvalwolloch4@gmail.com", "age": 17, "gender": true, "phone": "054-5811273", "city": "פתח תקווה", "want_tutor": false, "created_at": "2026-03-02T11:34:00"}',
'2026-03-02 11:34:00',
'2026-03-02 11:34:00'
FROM childsmile_app_staff s
INNER JOIN childsmile_app_staff_roles sr ON s.staff_id = sr.staff_id
INNER JOIN childsmile_app_role r ON sr.role_id = r.id
WHERE r.role_name = 'Volunteer Coordinator';

-- Verification query - check if tasks were created
-- SELECT COUNT(*) as task_count, 'יובל וולוך' as volunteer_name FROM childsmile_app_tasks WHERE user_info->>'ID' = '333307197';
