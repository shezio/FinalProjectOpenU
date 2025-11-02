-- SELECT id,
--        role_name
-- FROM public.childsmile_app_role
-- LIMIT 1000;

INSERT INTO public.childsmile_app_role (id, role_name)
VALUES
    ((select max(id) + 1 from public.childsmile_app_role), 'Guest');

    SELECT* FROM public.childsmile_app_role WHERE role_name = 'Guest' LIMIT 1;


INSERT INTO public.childsmile_app_permissions (role_id, resource, action)
VALUES 
(17, 'audit_log', 'VIEW'),
(17, 'totp_codes', 'VIEW'),
(17, 'childsmile_app_children', 'VIEW'),
(17, 'childsmile_app_feedback', 'VIEW'),
(17, 'childsmile_app_general_v_feedback', 'VIEW'),
(17, 'childsmile_app_general_volunteer', 'VIEW'),
(17, 'childsmile_app_healthy', 'VIEW'),
(17, 'childsmile_app_matures', 'VIEW'),
(17, 'childsmile_app_pending_tutor', 'VIEW'),
(17, 'childsmile_app_permissions', 'VIEW'),
(17, 'childsmile_app_possible_matches', 'VIEW'),
(17, 'childsmile_app_possiblematches', 'VIEW'),
(17, 'childsmile_app_role', 'VIEW'),
(17, 'childsmile_app_signedup', 'VIEW'),
(17, 'childsmile_app_staff', 'VIEW'),
(17, 'childsmile_app_task_types', 'VIEW'),
(17, 'childsmile_app_tasks', 'VIEW'),
(17, 'childsmile_app_tutor_feedback', 'VIEW'),
(17, 'childsmile_app_tutors', 'VIEW'),
(17, 'childsmile_app_tutorships', 'VIEW'),
(17, 'initial_family_data', 'VIEW');

-- insert into staff table a guest user with role_id 17
INSERT INTO public.childsmile_app_staff (staff_id,
       username,
       email,
       first_name,
       last_name,
       created_at,
       roles
   )
   VALUES (
       (SELECT COALESCE(MAX(staff_id), 0) + 1 FROM public.childsmile_app_staff),
       'guest_demo',
       'guest@childsmile.guest',
       'Guest',
       'Demo',
       NOW(),
       ARRAY[17]
   );