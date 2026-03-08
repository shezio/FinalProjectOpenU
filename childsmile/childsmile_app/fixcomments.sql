-- Preview what will be updated for General_Volunteer (comments field)
SELECT count(gv.id_id)
FROM childsmile_app_general_volunteer gv
JOIN childsmile_app_signedup su ON gv.id_id = su.id
WHERE gv.comments IS NULL OR gv.comments = '';

-- Preview what will be updated for Tutors (preferences field - not comments!)
SELECT count(t.id_id)
FROM childsmile_app_tutors t
JOIN childsmile_app_signedup su ON t.id_id = su.id
WHERE t.preferences IS NULL OR t.preferences = '';

-- Now perform the updates:

-- Update General_Volunteer comments field
UPDATE childsmile_app_general_volunteer gv
SET comments = su.comment
FROM childsmile_app_signedup su
WHERE gv.id_id = su.id
AND (gv.comments IS NULL OR gv.comments = '');

-- Update Tutors preferences field (NOT comments - Tutors uses preferences!)
UPDATE childsmile_app_tutors t
SET preferences = su.comment
FROM childsmile_app_signedup su
WHERE t.id_id = su.id
AND (t.preferences IS NULL OR t.preferences = '');

-- NOTE: Pending_Tutor does NOT have a comments or preferences field in the model
-- It only has: pending_tutor_id, id (FK to SignedUp), pending_status
-- So no update needed for Pending_Tutor table