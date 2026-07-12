-- =============================================================================
-- HOTFIX: recreate the missing FINAL admin (Liam) registration-approval task
--         for a user who is stuck without access.
--
-- WHEN TO USE
--   A user completed the coordinator ("אישור הרשמה ראשוני") step but Liam never
--   got the final ("אישור הרשמה סופי") task, so they can't get access. Tell-tale
--   sign in the DB: their coordinator task has `user_info = {}` (empty).
--
-- ROOT CAUSE (fixed in code — see below; this script only RECOVERS stuck users)
--   Signup view is @transaction.atomic and spawned an async thread that re-read
--   Staff/SignedUp BEFORE the signup committed → both lookups missed → the task
--   was saved with an empty user_info → on completion there was no email to key
--   off, so the "create Liam's final task" branch was silently skipped.
--   Code fix: views_volunteer.py now defers via transaction.on_commit(...), and
--   coordinator_utils.create_tasks_for_admins seeds user_info with the caller's
--   name/email so it can never be empty. New signups are safe; this script is
--   only for users already stranded before the fix shipped.
--
-- HOW TO RUN (prod-safe, no Django shell needed)
--   1. Set the applicant's Israeli ID (= childsmile_app_signedup.id) below.
--   2. Run the VERIFY select and confirm it is the right person + they are still
--      registration_approved = f + liam_staff_id is populated.
--   3. Run the INSERT. It is guarded so it will NOT create a duplicate open task.
--   4. Re-run the VERIFY-TASK select to confirm the task now exists.
--   5. Tell Liam the task is on his board; when he marks it "הושלמה" the user gets
--      access. (Liam gets NO WhatsApp from this script — only from the app flow.)
-- =============================================================================

-- 1) >>> EDIT THIS LINE <<< the applicant's Israeli ID (childsmile_app_signedup.id)
\set israeli_id 000000000

-- 2) VERIFY who we are about to fix (must show the right person, registration_approved = f)
SELECT su.id                 AS israeli_id,
       su.first_name || ' ' || su.surname AS full_name,
       su.email,
       su.want_tutor,
       s.staff_id            AS applicant_staff_id,
       s.registration_approved,
       liam.staff_id         AS liam_staff_id,
       tt.id                 AS task_type_id
FROM childsmile_app_signedup su
LEFT JOIN childsmile_app_staff s ON lower(s.email) = lower(su.email)
CROSS JOIN (SELECT staff_id FROM childsmile_app_staff
            WHERE first_name = 'ליאם' AND last_name = 'אביבי') liam
CROSS JOIN (SELECT id FROM childsmile_app_task_types
            WHERE task_type = 'אישור הרשמה') tt
WHERE su.id = :israeli_id;

-- 3) CREATE Liam's final approval task.
--    Guarded by NOT EXISTS so re-running can't create a duplicate OPEN final task.
INSERT INTO childsmile_app_tasks
    (description, due_date, status, created_at, updated_at,
     assigned_to_id, task_type_id, user_info)
SELECT
    'אישור הרשמה סופי',
    (CURRENT_DATE + INTERVAL '3 days')::date,
    'לא הושלמה',
    NOW(), NOW(),
    (SELECT staff_id FROM childsmile_app_staff WHERE first_name = 'ליאם' AND last_name = 'אביבי'),
    (SELECT id FROM childsmile_app_task_types WHERE task_type = 'אישור הרשמה'),
    jsonb_build_object(
        'full_name',      su.first_name || ' ' || su.surname,
        'email',          su.email,
        'ID',             su.id,
        'age',            su.age,
        'gender',         su.gender,
        'phone',          su.phone,
        'city',           su.city,
        'want_tutor',     su.want_tutor,
        'approval_level', 'final_admin'
    )
FROM childsmile_app_signedup su
WHERE su.id = :israeli_id
  AND NOT EXISTS (
      SELECT 1
      FROM childsmile_app_tasks t
      JOIN childsmile_app_task_types tt2 ON tt2.id = t.task_type_id
      WHERE tt2.task_type = 'אישור הרשמה'
        AND t.description = 'אישור הרשמה סופי'
        AND t.user_info->>'email' = su.email
        AND t.status <> 'הושלמה'
  );

-- 4) VERIFY the task now exists (assigned to Liam, status "לא הושלמה")
SELECT t.task_id, t.description, t.status, t.assigned_to_id,
       t.user_info->>'email' AS user_email, t.user_info->>'approval_level' AS approval_level
FROM childsmile_app_tasks t
JOIN childsmile_app_signedup su ON su.email = t.user_info->>'email'
WHERE su.id = :israeli_id
  AND t.description = 'אישור הרשמה סופי';

-- ---------------------------------------------------------------------------
-- ALTERNATIVE (only if you want to SKIP Liam and grant access immediately):
-- UPDATE childsmile_app_staff s
-- SET registration_approved = true
-- FROM childsmile_app_signedup su
-- WHERE lower(s.email) = lower(su.email)
--   AND su.id = :israeli_id;
-- ---------------------------------------------------------------------------
