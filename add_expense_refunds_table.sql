-- ============================================================
-- Expense Refunds (החזרי הוצאות) — Raw PostgreSQL DDL
-- Execute directly on the database cluster.
-- No Django migration required.
-- ============================================================

-- 1. Create the main refund table
-- ============================================================
-- NOTE: No CHECK constraints — all validation is enforced at the API layer.
-- NOTE: Timestamps are TIMESTAMP (no timezone), managed by Django ORM (auto_now_add / auto_now).
CREATE TABLE IF NOT EXISTS childsmile_app_expenserefund (
    refund_id          SERIAL PRIMARY KEY,
    staff_id           INTEGER NOT NULL
                           REFERENCES childsmile_app_staff(staff_id) ON DELETE CASCADE,
    staff_full_name    VARCHAR(255) NOT NULL,
    created_at         TIMESTAMP NOT NULL,
    updated_at         TIMESTAMP NOT NULL,
    expense_date       DATE NOT NULL,
    requested_amount   NUMERIC(10, 2) NOT NULL,
    approved_amount    NUMERIC(10, 2) NULL,
    description        TEXT NOT NULL,
    volunteer_comment  TEXT NULL,
    admin_comment      TEXT NULL,
    approved_by        VARCHAR(20) NULL,              -- validated by API: נעם/טל/נבו/אורי/ליאם
    file_url           VARCHAR(2048) NULL,             -- Azure Blob URL; nullable for historical import
    status             VARCHAR(30) NOT NULL DEFAULT 'ממתין',  -- validated by API
    refund_method      VARCHAR(30) NULL,              -- validated by API
    phone_number       VARCHAR(20) NULL,
    -- Tracks which staff username last modified this record
    updated_by         VARCHAR(255) NULL,
    -- Linked task (auto-created on submission)
    related_task_id    BIGINT NULL
                           REFERENCES childsmile_app_tasks(task_id) ON DELETE SET NULL
);

-- 2. Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_refund_staff_created
    ON childsmile_app_expenserefund (staff_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_refund_status_created
    ON childsmile_app_expenserefund (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_refund_expense_date
    ON childsmile_app_expenserefund (expense_date);

-- 3. Insert the new Task Type for refund tasks (idempotent)
-- ============================================================
INSERT INTO childsmile_app_task_types (task_type)
VALUES ('החזר הוצאות')
ON CONFLICT (task_type) DO NOTHING;

-- 4. Grant permissions (adjust role/user as needed for your cluster)
-- ============================================================
-- GRANT SELECT, INSERT, UPDATE, DELETE ON childsmile_app_expenserefund TO your_db_user;
-- GRANT USAGE, SELECT ON SEQUENCE childsmile_app_expenserefund_refund_id_seq TO your_db_user;

-- 5. Grant VIEW and CREATE permissions on expenserefund to ALL roles (idempotent, by name)
-- ============================================================
INSERT INTO childsmile_app_permissions (role_id, resource, action)
SELECT r.id, 'childsmile_app_expenserefund', a.action
FROM childsmile_app_role r
CROSS JOIN (VALUES ('VIEW'), ('CREATE')) AS a(action)
WHERE NOT EXISTS (
    SELECT 1 FROM childsmile_app_permissions p
    WHERE p.role_id = r.id
      AND p.resource = 'childsmile_app_expenserefund'
      AND p.action = a.action
);

-- 6. Grant UPDATE and DELETE on expenserefund to System Administrator only (idempotent)
-- ============================================================
INSERT INTO childsmile_app_permissions (role_id, resource, action)
SELECT r.id, 'childsmile_app_expenserefund', a.action
FROM childsmile_app_role r
CROSS JOIN (VALUES ('UPDATE'), ('DELETE')) AS a(action)
WHERE r.role_name = 'System Administrator'
  AND NOT EXISTS (
    SELECT 1 FROM childsmile_app_permissions p
    WHERE p.role_id = r.id
      AND p.resource = 'childsmile_app_expenserefund'
      AND p.action = a.action
  );

-- 7. Verify
-- ============================================================
SELECT r.role_name, p.resource, p.action
FROM childsmile_app_permissions p
JOIN childsmile_app_role r ON r.id = p.role_id
WHERE p.resource = 'childsmile_app_expenserefund'
ORDER BY r.role_name, p.action;

-- ============================================================
-- PATCH (run once if step 5 was already executed without CREATE)
-- Adds CREATE permission for all roles that don't have it yet.
-- ============================================================
INSERT INTO childsmile_app_permissions (role_id, resource, action)
SELECT r.id, 'childsmile_app_expenserefund', 'CREATE'
FROM childsmile_app_role r
WHERE NOT EXISTS (
    SELECT 1 FROM childsmile_app_permissions p
    WHERE p.role_id = r.id
      AND p.resource = 'childsmile_app_expenserefund'
      AND p.action = 'CREATE'
);
