-- ============================================================
-- Add "Viewer" (read-only) role
--
-- Purpose:
--   A user with this role sees the ENTIRE UI exactly like a full
--   admin would - every table, button and feature is enabled and
--   there are NO "no permission" screens or disabled controls.
--   To achieve that on the frontend, the Viewer role is granted the
--   FULL UNION of every (resource, action) permission that exists in
--   the system (VIEW/CREATE/UPDATE/DELETE on everything).
--
--   The backend enforces the real read-only behavior: every
--   POST/PUT/DELETE business endpoint silently logs the attempt and
--   returns HTTP 200 WITHOUT changing any data (see utils.py
--   viewer_readonly_response / is_viewer_user). GET requests work
--   normally, so the Viewer can see everything but change nothing.
--
-- Safe to run multiple times (idempotent).
-- ============================================================

-- 1. Create the Viewer role (skip if it already exists)
INSERT INTO childsmile_app_role (role_name)
SELECT 'Viewer'
WHERE NOT EXISTS (
    SELECT 1 FROM childsmile_app_role WHERE role_name = 'Viewer'
);

-- 2. Grant the Viewer role EVERY distinct (resource, action) permission
--    that exists anywhere in the system (the union across all roles).
--    This guarantees the frontend shows/enables absolutely everything.
INSERT INTO childsmile_app_permissions (role_id, resource, action)
SELECT viewer.id, perms.resource, perms.action
FROM childsmile_app_role viewer
CROSS JOIN (
    SELECT DISTINCT resource, action
    FROM childsmile_app_permissions
) AS perms
WHERE viewer.role_name = 'Viewer'
  AND NOT EXISTS (
      SELECT 1
      FROM childsmile_app_permissions p
      WHERE p.role_id = viewer.id
        AND p.resource = perms.resource
        AND p.action = perms.action
  );

-- 3. Verify the role and its permissions
SELECT r.id AS role_id, r.role_name, p.resource, p.action
FROM childsmile_app_permissions p
JOIN childsmile_app_role r ON r.id = p.role_id
WHERE r.role_name = 'Viewer'
ORDER BY p.resource, p.action;

-- 4. (Optional) How to assign the Viewer role to an existing staff member.
--    Replace <STAFF_ID> with the real childsmile_app_staff.staff_id.
--
-- INSERT INTO childsmile_app_staff_roles (staff_id, role_id)
-- SELECT <STAFF_ID>, r.id
-- FROM childsmile_app_role r
-- WHERE r.role_name = 'Viewer'
--   AND NOT EXISTS (
--       SELECT 1 FROM childsmile_app_staff_roles sr
--       WHERE sr.staff_id = <STAFF_ID> AND sr.role_id = r.id
--   );
