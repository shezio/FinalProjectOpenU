SELECT description 
from public.audit_log
where timestamp >= now() - interval '1 hour'
--and description LIKE '%Failed%'
ORDER BY timestamp DESC
LIMIT 3;

select * from public.childsmile_app_signedup s , public.childsmile_app_staff st
 where s.email = st.email
order by st.created_at desc
 limit 3;


select * from public.childsmile_app_pending_tutor
 where pending_tutor_id=86;

select * from public.childsmile_app_staff



update public.childsmile_app_staff
set  email = 'childtest020@gmail.com'
where email = 'childtest021@gmail.com'

-- find me all roles that dont have permission 'DELETE' on childsmile_app.children
-- use childsmile_app_permission table
SELECT DISTINCT role_id, r.role_name
FROM public.childsmile_app_permissions
JOIN public.childsmile_app_role r ON r.id = public.childsmile_app_permissions.role_id
WHERE resource = 'childsmile_app_tasks'
AND role_id NOT IN (
    SELECT role_id
    FROM public.childsmile_app_permissions
    WHERE resource = 'childsmile_app_tasks'
    AND action = 'UPDATE'
);