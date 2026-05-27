-- ============================================================
-- Review Tasks Diagnostic Queries
-- Run on prod DB to check why שיחת ביקורת tasks are not created
-- ============================================================

-- NOTE: Also manually verify that MONTHLY_CREATOR_TIME=04:00
--       is set in Azure App Settings (cannot be checked from psql)

-- 1. How many families SHOULD have a review task created?
SELECT COUNT(*) AS families_needing_review
FROM childsmile_app_children
WHERE need_review = true
  AND (last_review_talk_conducted IS NULL
       OR last_review_talk_conducted <= CURRENT_DATE - INTERVAL '90 days');

-- 2. Which families qualify, and who is their coordinator + their role?
SELECT
    c.child_id,
    c.childfirstname,
    c.childsurname,
    c.last_review_talk_conducted,
    c.need_review,
    s.first_name || ' ' || s.last_name AS coordinator_name,
    string_agg(r.role_name, ', ') AS coordinator_roles
FROM childsmile_app_children c
LEFT JOIN childsmile_app_staff s ON s.staff_id::text = c.responsible_coordinator
LEFT JOIN childsmile_app_staff_roles sr ON sr.staff_id = s.staff_id
LEFT JOIN childsmile_app_role r ON r.id = sr.role_id
WHERE c.need_review = true
  AND (c.last_review_talk_conducted IS NULL
       OR c.last_review_talk_conducted <= CURRENT_DATE - INTERVAL '90 days')
GROUP BY c.child_id, c.childfirstname, c.childsurname,
         c.last_review_talk_conducted, c.need_review,
         s.first_name, s.last_name
ORDER BY c.last_review_talk_conducted ASC NULLS FIRST;

-- 3. Do existing incomplete review tasks already block creation?
SELECT
    c.child_id,
    c.childfirstname,
    c.childsurname,
    t.status,
    t.due_date
FROM childsmile_app_tasks t
JOIN childsmile_app_task_types tt ON tt.id = t.task_type_id
JOIN childsmile_app_children c ON c.child_id = t.related_child_id
WHERE tt.task_type = 'שיחת ביקורת'
  AND t.status IN ('לא הושלמה', 'בביצוע')
ORDER BY t.due_date;

-- 4. Families that qualify (query 1) but already have an incomplete task (query 3)
--    These will be SKIPPED by monthly_tasks.py - expected behaviour
SELECT
    c.child_id,
    c.childfirstname,
    c.childsurname,
    c.last_review_talk_conducted,
    t.status AS existing_task_status,
    t.due_date AS existing_task_due_date
FROM childsmile_app_children c
JOIN childsmile_app_tasks t ON t.related_child_id = c.child_id
JOIN childsmile_app_task_types tt ON tt.id = t.task_type_id
WHERE c.need_review = true
  AND (c.last_review_talk_conducted IS NULL
       OR c.last_review_talk_conducted <= CURRENT_DATE - INTERVAL '90 days')
  AND tt.task_type = 'שיחת ביקורת'
  AND t.status IN ('לא הושלמה', 'בביצוע');

-- 5. Families that qualify but have NO coordinator with the required role
--    These will also be SKIPPED - coordinator role problem
SELECT
    c.child_id,
    c.childfirstname,
    c.childsurname,
    c.responsible_coordinator,
    s.first_name || ' ' || s.last_name AS coordinator_name,
    string_agg(r.role_name, ', ') AS coordinator_roles
FROM childsmile_app_children c
LEFT JOIN childsmile_app_staff s ON s.staff_id::text = c.responsible_coordinator
LEFT JOIN childsmile_app_staff_roles sr ON sr.staff_id = s.staff_id
LEFT JOIN childsmile_app_role r ON r.id = sr.role_id
WHERE c.need_review = true
  AND (c.last_review_talk_conducted IS NULL
       OR c.last_review_talk_conducted <= CURRENT_DATE - INTERVAL '90 days')
GROUP BY c.child_id, c.childfirstname, c.childsurname,
         c.responsible_coordinator, s.first_name, s.last_name
HAVING string_agg(r.role_name, ', ') IS NULL
    OR (
        string_agg(r.role_name, ', ') NOT LIKE '%Families Coordinator%'
        AND string_agg(r.role_name, ', ') NOT LIKE '%Tutored Families Coordinator%'
    );
