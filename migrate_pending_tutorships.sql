-- =============================================================
-- MIGRATION: Activate all legacy pending_first_approval tutorships
-- Run this ONCE against the production database after deploying
-- the single-approval tutorship code change.
--
-- What this does:
--   1. Sets tutorship_activation = 'active' for all pending records
--      that belong to ACTIVE staff members (staff.is_active = TRUE)
--   2. For INACTIVE staff, their tutorships should already be 'inactive'
--      (set by deactivate_staff). We leave those untouched.
--   3. Sets updated_at to now for activated records
--
-- NO ROWS ARE DELETED. NO SCHEMA CHANGES. Safe to run.
--
-- PrevTutorshipStatuses notes:
--   - These are linked via tutorship_id FK with ON DELETE CASCADE
--   - They are NOT affected by this migration (we only change activation status)
--   - Inactive staff: their tutorships were already converted to 'inactive'
--     by deactivate_staff(), which cascade-deleted the PrevTutorshipStatuses
--   - Active staff: PrevTutorshipStatuses remain linked and intact
-- =============================================================

BEGIN;

-- 1. Show how many records will be affected (for verification)
SELECT COUNT(*) AS pending_for_active_staff
FROM childsmile_app_tutorships t
JOIN childsmile_app_tutors tutor ON tutor.id_id = t.tutor_id
JOIN childsmile_app_staff staff ON staff.staff_id = tutor.staff_id
WHERE t.tutorship_activation = 'pending_first_approval'
  AND staff.is_active = TRUE;

-- 2. Show any unexpected pending records for INACTIVE staff (should be 0)
SELECT COUNT(*) AS pending_for_inactive_staff_should_be_zero
FROM childsmile_app_tutorships t
JOIN childsmile_app_tutors tutor ON tutor.id_id = t.tutor_id
JOIN childsmile_app_staff staff ON staff.staff_id = tutor.staff_id
WHERE t.tutorship_activation = 'pending_first_approval'
  AND staff.is_active = FALSE;

-- 3. Activate all pending tutorships for ACTIVE staff only
UPDATE childsmile_app_tutorships t
SET
    tutorship_activation = 'active',
    updated_at           = NOW()
FROM childsmile_app_tutors tutor
JOIN childsmile_app_staff staff ON staff.staff_id = tutor.staff_id
WHERE t.tutor_id = tutor.id_id
  AND t.tutorship_activation = 'pending_first_approval'
  AND staff.is_active = TRUE;

-- 4. Verify: should return 0 for active staff after migration
SELECT COUNT(*) AS remaining_pending_active_staff
FROM childsmile_app_tutorships t
JOIN childsmile_app_tutors tutor ON tutor.id_id = t.tutor_id
JOIN childsmile_app_staff staff ON staff.staff_id = tutor.staff_id
WHERE t.tutorship_activation = 'pending_first_approval'
  AND staff.is_active = TRUE;

COMMIT;
