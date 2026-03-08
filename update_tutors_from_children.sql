-- Update tutor relationship_status and tutee_wellness from child's marital_status and current_medical_state
-- This script updates all tutors based on their tutee in each tutorship pair
-- For EVERY tutorship record, update the tutor's fields from the child they are paired with

-- Script to populate relationship_status and tutee_wellness for all tutors based on their tutees
-- relationship_status gets the child's marital_status
-- tutee_wellness gets the child's current_medical_state

BEGIN;

-- Update tutors based on their tutee in each tutorship pair
UPDATE childsmile_app_tutors tutor
SET 
    relationship_status = COALESCE(child.marital_status, ''),
    tutee_wellness = COALESCE(child.current_medical_state, '')
FROM childsmile_app_tutorships tutorship
INNER JOIN childsmile_app_children child ON child.child_id = tutorship.child_id
WHERE tutorship.tutor_id = tutor.id_id;

-- Summary of what was updated
SELECT 
    COUNT(*) as total_tutorships_processed,
    COUNT(DISTINCT tutor.id_id) as tutors_updated,
    COUNT(DISTINCT tutorship.child_id) as children_involved
FROM childsmile_app_tutors tutor
INNER JOIN childsmile_app_tutorships tutorship ON tutorship.tutor_id = tutor.id_id;

COMMIT;
