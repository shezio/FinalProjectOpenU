-- ============================================================
-- Ongoing Expenses (הוצאות שוטפות) — Raw PostgreSQL DDL
-- Execute directly on the database cluster.
-- No Django migration required (same convention as add_expense_refunds_table.sql
-- and add_petty_cash_table.sql).
-- ============================================================

-- 1. Create the ongoing expenses table
-- ============================================================
-- NOTE: No CHECK constraints — all validation is enforced at the API layer.
-- NOTE: Timestamps are TIMESTAMP (no timezone), managed by Django ORM (auto_now_add / auto_now).
-- NOTE: category is free text (not a fixed choice list) — the frontend offers
--       autocomplete suggestions from previously-used values, not enforced server-side.
CREATE TABLE IF NOT EXISTS childsmile_app_ongoingexpense (
    ongoing_expense_id  SERIAL PRIMARY KEY,
    expense_date        DATE NOT NULL,
    expense_name        VARCHAR(255) NOT NULL,
    category             VARCHAR(255) NULL,
    amount               NUMERIC(10, 2) NOT NULL,
    invoice_number       VARCHAR(100) NULL,
    notes                TEXT NULL,
    created_at           TIMESTAMP NOT NULL,
    updated_at           TIMESTAMP NOT NULL,
    updated_by           VARCHAR(255) NULL
);

-- 2. Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_ongoingexp_expense_date
    ON childsmile_app_ongoingexpense (expense_date DESC);

-- 3. Grant VIEW/CREATE/UPDATE/DELETE on ongoing expenses to System Administrator
--    only (idempotent) — same technique as add_expense_refunds_table.sql step 6
--    and add_petty_cash_table.sql step 3 (list ONLY 'System Administrator' by
--    name). Viewer gets the same access by re-running add_viewer_role.sql
--    afterward, which copies the full union of (resource, action) pairs onto Viewer.
-- ============================================================
INSERT INTO childsmile_app_permissions (role_id, resource, action)
SELECT r.id, 'childsmile_app_ongoingexpense', a.action
FROM childsmile_app_role r
CROSS JOIN (VALUES ('VIEW'), ('CREATE'), ('UPDATE'), ('DELETE')) AS a(action)
WHERE r.role_name = 'System Administrator'
  AND NOT EXISTS (
    SELECT 1 FROM childsmile_app_permissions p
    WHERE p.role_id = r.id
      AND p.resource = 'childsmile_app_ongoingexpense'
      AND p.action = a.action
  );

-- 4. Verify
-- ============================================================
SELECT r.role_name, p.resource, p.action
FROM childsmile_app_permissions p
JOIN childsmile_app_role r ON r.id = p.role_id
WHERE p.resource = 'childsmile_app_ongoingexpense'
ORDER BY r.role_name, p.action;
