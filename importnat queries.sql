--UPDATE public.childsmile_app_possiblematches pm
SET child_gender = c.gender
FROM public.childsmile_app_children c
WHERE pm.child_id = c.child_id

--UPDATE public.childsmile_app_possiblematches pm
set child_id=352232129
where match_id=2

select * from childsmile_app_children where schild_id) like '%29%';

--UPDATE public.childsmile_app_possiblematches pm
SET tutor_gender = s.gender
FROM public.childsmile_app_tutors t
JOIN public.childsmile_app_signedup s ON t.id_id = s.id
WHERE pm.tutor_id = t.id_id;

SELECT unnest(enum_range(NULL::tutorship_status));

select * from childsmile_app_possiblematches;

select * from childsmile_app_possiblematches;
select * from childsmile_app_pending_tutor;
select * from childsmile_app_tutors;
select * from childsmile_app_tutorships;
select * from childsmile_app_tutor_feedback;
select * from childsmile_app_general_v_feedback;
select * from childsmile_app_tasks;
select * from childsmile_app_general_volunteer;

SELECT id, '1000000' || id AS new_id
FROM childsmile_app_signedup
WHERE LENGTH(id::text) = 2;


-- Update the parent table
UPDATE childsmile_app_signedup
SET id = ('10000000' || id::text)::bigint
WHERE LENGTH(id::text) = 1;

-- Update the child table
UPDATE childsmile_app_pending_tutor
SET id_id = ('10000000' || id_id::text)::bigint
WHERE LENGTH(id_id::text) = 1;

-- Update the child table
UPDATE childsmile_app_tasks
SET related_tutor_id = ('10000000' || related_tutor_id ::text)::bigint
WHERE LENGTH(related_tutor_id::text) = 1;

-- Update the child table
UPDATE childsmile_app_tutor_feedback
SET tutor_id = ('10000000' || tutor_id ::text)::bigint
WHERE LENGTH(tutor_id::text) = 1;

-- Update the child table
UPDATE childsmile_app_general_v_feedback
SET volunteer_id = ('10000000' || volunteer_id ::text)::bigint
WHERE LENGTH(volunteer_id::text) = 1;

-- Update the child table
UPDATE childsmile_app_tutorships
SET tutor_id = ('10000000' || tutor_id ::text)::bigint
WHERE LENGTH(tutor_id::text) = 1;



UPDATE childsmile_app_tutors
SET id_id = ('10000000' || id_id::text)::bigint
WHERE LENGTH(id_id::text) = 1;

-- Update the child table
UPDATE childsmile_app_general_volunteer
SET id_id = ('10000000' || id_id::text)::bigint
WHERE LENGTH(id_id::text) = 1;





