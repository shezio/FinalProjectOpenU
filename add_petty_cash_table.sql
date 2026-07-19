-- ============================================================
-- Petty Cash (קופה קטנה) — Raw PostgreSQL DDL
-- Execute directly on the database cluster.
-- No Django migration required (same convention as add_expense_refunds_table.sql).
-- ============================================================

-- 1. Create the petty cash table
-- ============================================================
-- NOTE: No CHECK constraints — all validation is enforced at the API layer.
-- NOTE: Timestamps are TIMESTAMP (no timezone), managed by Django ORM (auto_now_add / auto_now).
-- NOTE: source_refund_id is set automatically when this row was synced from a paid
--       Expense Refund (ExpenseRefund.status = 'שולם') — see refund_views.py
--       _sync_petty_cash_for_refund(). NULL for manually-entered rows.
CREATE TABLE IF NOT EXISTS childsmile_app_pettycashexpense (
    petty_cash_id      SERIAL PRIMARY KEY,
    expense_date       DATE NOT NULL,
    expense_name       VARCHAR(255) NOT NULL,
    amount             NUMERIC(10, 2) NOT NULL,
    paid_by            VARCHAR(255) NULL,
    notes              TEXT NULL,
    created_at         TIMESTAMP NOT NULL,
    updated_at         TIMESTAMP NOT NULL,
    updated_by         VARCHAR(255) NULL,
    source_refund_id   INTEGER NULL
                           REFERENCES childsmile_app_expenserefund(refund_id) ON DELETE CASCADE
);

-- 2. Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_pettycash_expense_date
    ON childsmile_app_pettycashexpense (expense_date DESC);

CREATE INDEX IF NOT EXISTS idx_pettycash_source_refund
    ON childsmile_app_pettycashexpense (source_refund_id);

-- 3. Grant VIEW/CREATE/UPDATE/DELETE on petty cash to System Administrator only
--    (idempotent) — same technique as add_expense_refunds_table.sql step 6
--    (its admin-only UPDATE/DELETE grant also lists ONLY 'System Administrator'
--    by name). Viewer gets the same access the same way Refunds' admin-only
--    actions do: by re-running add_viewer_role.sql afterward, which copies the
--    full union of (resource, action) pairs — including these — onto Viewer.
-- ============================================================
INSERT INTO childsmile_app_permissions (role_id, resource, action)
SELECT r.id, 'childsmile_app_pettycashexpense', a.action
FROM childsmile_app_role r
CROSS JOIN (VALUES ('VIEW'), ('CREATE'), ('UPDATE'), ('DELETE')) AS a(action)
WHERE r.role_name = 'System Administrator'
  AND NOT EXISTS (
    SELECT 1 FROM childsmile_app_permissions p
    WHERE p.role_id = r.id
      AND p.resource = 'childsmile_app_pettycashexpense'
      AND p.action = a.action
  );

-- 4. Verify
-- ============================================================
SELECT r.role_name, p.resource, p.action
FROM childsmile_app_permissions p
JOIN childsmile_app_role r ON r.id = p.role_id
WHERE p.resource = 'childsmile_app_pettycashexpense'
ORDER BY r.role_name, p.action;
