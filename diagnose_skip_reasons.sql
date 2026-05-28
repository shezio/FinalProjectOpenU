-- Diagnose why monthly review tasks are being skipped for all 597 families
-- Run each section to identify the bottleneck

-- 1. How many families have need_review = TRUE vs FALSE?
SELECT 
    need_review,
    COUNT(*) AS count
FROM childsmile_app_children
GROUP BY need_review
ORDER BY need_review DESC;

-- 2. Of those with need_review=TRUE, how many are past the 90-day cutoff?
SELECT
    CASE
        WHEN last_review_talk_conducted IS NULL THEN 'never had a talk (qualifies)'
        WHEN last_review_talk_conducted <= CURRENT_DATE - INTERVAL '90 days' THEN 'talk >90d ago (qualifies)'
        ELSE 'talk within 90d (skip: recent_talk)'
    END AS talk_status,
    COUNT(*) AS count
FROM childsmile_app_children
WHERE need_review = TRUE
GROUP BY talk_status;

-- 3. Of those who qualify on talk date, do they have a responsible_coordinator?
SELECT
    CASE
        WHEN responsible_coordinator IS NULL OR responsible_coordinator = '' OR responsible_coordinator = 'ללא' 
            THEN 'no coordinator (skip: no_coordinator_id)'
        ELSE 'has coordinator'
    END AS coordinator_status,
    COUNT(*) AS count
FROM childsmile_app_children
WHERE need_review = TRUE
  AND (
    last_review_talk_conducted IS NULL
    OR last_review_talk_conducted <= CURRENT_DATE - INTERVAL '90 days'
  )
GROUP BY coordinator_status;

-- 4. Of those with a coordinator, does the coordinator have the right role (FC or TFC)?
SELECT
    c.child_id,
    c.childfirstname || ' ' || c.childsurname AS child_name,
    c.responsible_coordinator,
    s.staff_id,
    s.first_name || ' ' || s.last_name AS coordinator_name,
    array_agg(r.role_name) AS roles,
    BOOL_OR(r.role_name IN ('Families Coordinator', 'Tutored Families Coordinator')) AS has_correct_role
FROM childsmile_app_children c
JOIN childsmile_app_staff s ON s.staff_id::text = c.responsible_coordinator
LEFT JOIN childsmile_app_staff_roles sr ON sr.staff_id = s.staff_id
LEFT JOIN childsmile_app_role r ON r.id = sr.role_id
WHERE c.need_review = TRUE
  AND (c.last_review_talk_conducted IS NULL OR c.last_review_talk_conducted <= CURRENT_DATE - INTERVAL '90 days')
  AND c.responsible_coordinator IS NOT NULL
  AND c.responsible_coordinator != ''
  AND c.responsible_coordinator != 'ללא'
GROUP BY c.child_id, c.childfirstname, c.childsurname, c.responsible_coordinator, s.staff_id, s.first_name, s.last_name
HAVING NOT BOOL_OR(r.role_name IN ('Families Coordinator', 'Tutored Families Coordinator'));

-- 6. Of the 17 qualifying families, do they already have an open שיחת ביקורת task?
SELECT
    c.child_id,
    c.childfirstname || ' ' || c.childsurname AS child_name,
    c.last_review_talk_conducted,
    t.task_id AS existing_task_id,
    t.status AS task_status,
    t.due_date,
    t.assigned_to_id
FROM childsmile_app_children c
JOIN childsmile_app_tasks t ON t.related_child_id = c.child_id
JOIN childsmile_app_task_types tt ON tt.id = t.task_type_id AND tt.task_type = 'שיחת ביקורת'
WHERE c.need_review = TRUE
  AND (c.last_review_talk_conducted IS NULL OR c.last_review_talk_conducted <= CURRENT_DATE - INTERVAL '90 days')
  AND t.status IN ('לא הושלמה', 'בביצוע')
ORDER BY c.child_id;

-- 5. Summary: full funnel
SELECT
    COUNT(*) AS total_families,
    COUNT(*) FILTER (WHERE need_review = TRUE) AS need_review_true,
    COUNT(*) FILTER (WHERE need_review = TRUE AND (last_review_talk_conducted IS NULL OR last_review_talk_conducted <= CURRENT_DATE - INTERVAL '90 days')) AS past_cutoff,
    COUNT(*) FILTER (WHERE need_review = TRUE AND (last_review_talk_conducted IS NULL OR last_review_talk_conducted <= CURRENT_DATE - INTERVAL '90 days') AND responsible_coordinator IS NOT NULL AND responsible_coordinator != '' AND responsible_coordinator != 'ללא') AS has_coordinator
FROM childsmile_app_children;
