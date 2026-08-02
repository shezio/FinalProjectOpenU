-- ============================================================
-- fix_role_permissions_pt.sql
-- PT remediation — run ONCE, BEFORE deploying the F12 read-authorization gate.
--
--   1. F12 (data-minimization): grant the "Reviewer" role  staff:VIEW ONLY  — it needs the staff
--      directory for login + the coordinator dropdown on its page. It is deliberately NOT granted
--      tutors/signedup VIEW: the Reviewer page never calls those endpoints, so once the gate is on
--      it stays blocked from the tutor national-ID endpoints (per the pentest sign-off).
--
--   2. F13 hardening: clean the "Inactive" role — a disabled ("עזב") user's role must grant NOTHING,
--      yet it currently holds leftover expenserefund:VIEW + duplicate notification_message:VIEW rows.
--
-- Idempotent: safe to re-run. (Uses role_name, NOT EXISTS guard — mirrors add_reviewer_role.sql.)
-- ============================================================

-- 1. Grant Reviewer  staff:VIEW  (only if it does not already have it)
INSERT INTO childsmile_app_permissions (role_id, resource, action)
SELECT r.id, 'childsmile_app_staff', 'VIEW'
FROM childsmile_app_role r
WHERE r.role_name = 'Reviewer'
  AND NOT EXISTS (
      SELECT 1 FROM childsmile_app_permissions p
      WHERE p.role_id = r.id
        AND p.resource = 'childsmile_app_staff'
        AND p.action = 'VIEW'
  );

-- 2. Remove ALL permissions from the Inactive role (disabled users must carry zero permissions)
DELETE FROM childsmile_app_permissions
WHERE role_id = (SELECT id FROM childsmile_app_role WHERE role_name = 'Inactive');

-- 3. Verify — Reviewer should show exactly childsmile_app_staff/VIEW (plus its existing
--    children/tasks grants); Inactive should return NO rows.
SELECT r.role_name, p.resource, p.action
FROM childsmile_app_permissions p
JOIN childsmile_app_role r ON r.id = p.role_id
WHERE r.role_name IN ('Reviewer', 'Inactive')
ORDER BY r.role_name, p.resource, p.action;
