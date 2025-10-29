SELECT description 
from public.audit_log
where timestamp >= now() - interval '1 hour'
--and description LIKE '%Failed%'
ORDER BY timestamp DESC
LIMIT 2;

select * from public.childsmile_app_signedup s , public.childsmile_app_staff st
 where s.email = st.email
order by st.created_at desc
 limit 3;


select * from public.childsmile_app_staff where staff_id = 127;
    where email = 'vefoy72630@memeazon.com';