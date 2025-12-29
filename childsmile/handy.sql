--coreci2141@lovleo.com

-- update public.childsmile_app_staff
-- set  email = 'vifipo9384@keevle.com'
-- where email = 'coreci2141@lovleo.com'


--select * from public.childsmile_app_staff where email like '%020%' order by created_at desc

update public.childsmile_app_staff
set  email = 'childtest020@gmail.com'
where email = 'childtest021@gmail.com'

-- find me all roles that dont have permission 'DELETE' on childsmile_app.children
-- use childsmile_app_permission table
SELECT DISTINCT role_id, r.role_name
FROM public.childsmile_app_permissions
JOIN public.childsmile_app_role r ON r.id = public.childsmile_app_permissions.role_id
WHERE resource = 'childsmile_app_children'
AND role_id NOT IN (
    SELECT role_id
    FROM public.childsmile_app_permissions
    WHERE resource = 'childsmile_app_children'
    AND action = 'UPDATE'
);


-- Replace 'your_enum_name' with your actual enum name
SELECT UNNEST(enum_range(NULL::task_t)) AS enum_value;


-- get all tables names used by any API in BE and also any table used by auth or by audit
SELECT DISTINCT resource
FROM public.childsmile_app_permissions
WHERE resource IS NOT NULL
AND resource <> ''
ORDER BY resource;

-- get from the DB all tables that are not used by any API in BE and also not used by auth or by audit
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
AND tablename NOT IN (
    SELECT DISTINCT resource
    FROM public.childsmile_app_permissions
    WHERE resource IS NOT NULL
    AND resource <> ''
)
AND tablename NOT IN ('auth_user', 'auth_group', 'auth_permission', 'django_content_type', 'django_session', 'django_migrations', 'childsmile_app_auditlogentry')
ORDER BY tablename;