-- ============================================================
-- Add "Reviewer" role with Tasks CRUD + Children UPDATE/VIEW
-- Run this on Azure DB after local testing
-- ============================================================

-- 1. Insert the new role (skip if already exists)
INSERT INTO childsmile_app_role (role_name)
SELECT 'Reviewer'
WHERE NOT EXISTS (
    SELECT 1 FROM childsmile_app_role WHERE role_name = 'Reviewer'
);

-- 2. Grant Tasks CRUD
INSERT INTO childsmile_app_permissions (role_id, resource, action)
SELECT r.id, 'childsmile_app_tasks', 'CREATE'
FROM childsmile_app_role r
WHERE r.role_name = 'Reviewer'
  AND NOT EXISTS (
      SELECT 1 FROM childsmile_app_permissions p
      WHERE p.role_id = r.id AND p.resource = 'childsmile_app_tasks' AND p.action = 'CREATE'
  );

INSERT INTO childsmile_app_permissions (role_id, resource, action)
SELECT r.id, 'childsmile_app_tasks', 'UPDATE'
FROM childsmile_app_role r
WHERE r.role_name = 'Reviewer'
  AND NOT EXISTS (
      SELECT 1 FROM childsmile_app_permissions p
      WHERE p.role_id = r.id AND p.resource = 'childsmile_app_tasks' AND p.action = 'UPDATE'
  );

INSERT INTO childsmile_app_permissions (role_id, resource, action)
SELECT r.id, 'childsmile_app_tasks', 'DELETE'
FROM childsmile_app_role r
WHERE r.role_name = 'Reviewer'
  AND NOT EXISTS (
      SELECT 1 FROM childsmile_app_permissions p
      WHERE p.role_id = r.id AND p.resource = 'childsmile_app_tasks' AND p.action = 'DELETE'
  );

INSERT INTO childsmile_app_permissions (role_id, resource, action)
SELECT r.id, 'childsmile_app_tasks', 'VIEW'
FROM childsmile_app_role r
WHERE r.role_name = 'Reviewer'
  AND NOT EXISTS (
      SELECT 1 FROM childsmile_app_permissions p
      WHERE p.role_id = r.id AND p.resource = 'childsmile_app_tasks' AND p.action = 'VIEW'
  );

-- 3. Grant Children UPDATE and VIEW (no DELETE, no CREATE)
INSERT INTO childsmile_app_permissions (role_id, resource, action)
SELECT r.id, 'childsmile_app_children', 'UPDATE'
FROM childsmile_app_role r
WHERE r.role_name = 'Reviewer'
  AND NOT EXISTS (
      SELECT 1 FROM childsmile_app_permissions p
      WHERE p.role_id = r.id AND p.resource = 'childsmile_app_children' AND p.action = 'UPDATE'
  );

INSERT INTO childsmile_app_permissions (role_id, resource, action)
SELECT r.id, 'childsmile_app_children', 'VIEW'
FROM childsmile_app_role r
WHERE r.role_name = 'Reviewer'
  AND NOT EXISTS (
      SELECT 1 FROM childsmile_app_permissions p
      WHERE p.role_id = r.id AND p.resource = 'childsmile_app_children' AND p.action = 'VIEW'
  );

-- 4. Verify
SELECT r.role_name, p.resource, p.action
FROM childsmile_app_permissions p
JOIN childsmile_app_role r ON r.id = p.role_id
WHERE r.role_name = 'Reviewer'
ORDER BY p.resource, p.action;
