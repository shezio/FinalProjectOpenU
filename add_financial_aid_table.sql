-- ============================================================
-- Financial Aid (סיוע כספי) — Raw PostgreSQL DDL
-- Execute directly on the database cluster.
-- No Django migration required (same convention as add_petty_cash_table.sql /
-- add_ongoing_expenses_table.sql).
-- ============================================================

-- 1. Create the financial aid table
-- ============================================================
-- NOTE: No CHECK constraints — all validation is enforced at the API layer.
-- NOTE: Timestamps are TIMESTAMP (no timezone), managed by Django ORM (auto_now_add / auto_now).
-- NOTE: linked_child_id is OPTIONAL — set only when staff links this aid record to an
--       existing registered family (Children). Most recipients are NOT registered
--       families (families have no login/user accounts at all — this table works the
--       same either way; family_name is always free text regardless of linked_child_id).
--       ON DELETE SET NULL (not CASCADE) so deleting the family record later doesn't
--       wipe this financial aid history row.
CREATE TABLE IF NOT EXISTS childsmile_app_financialaid (
    financial_aid_id    SERIAL PRIMARY KEY,
    family_name         VARCHAR(255) NOT NULL,
    aid_date            DATE NOT NULL,
    amount              NUMERIC(10, 2) NOT NULL,
    method              VARCHAR(30) NOT NULL,
    notes               TEXT NULL,
    linked_child_id     BIGINT NULL
                            REFERENCES childsmile_app_children(child_id) ON DELETE SET NULL,
    created_at          TIMESTAMP NOT NULL,
    updated_at          TIMESTAMP NOT NULL,
    updated_by          VARCHAR(255) NULL
);

-- 2. Create the financial aid attachments table (מכתב בקשה ומסמכים — multiple files per record)
-- ============================================================
CREATE TABLE IF NOT EXISTS childsmile_app_financialaidattachment (
    attachment_id       SERIAL PRIMARY KEY,
    financial_aid_id    INTEGER NOT NULL
                            REFERENCES childsmile_app_financialaid(financial_aid_id) ON DELETE CASCADE,
    file_url            VARCHAR(2048) NOT NULL,
    file_name           VARCHAR(255) NULL,
    uploaded_at         TIMESTAMP NOT NULL
);

-- 3. Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_financialaid_aid_date
    ON childsmile_app_financialaid (aid_date DESC);

CREATE INDEX IF NOT EXISTS idx_financialaid_child
    ON childsmile_app_financialaid (linked_child_id);

CREATE INDEX IF NOT EXISTS idx_financialaidattachment_financial_aid
    ON childsmile_app_financialaidattachment (financial_aid_id);

-- 4. Grant VIEW/CREATE/UPDATE/DELETE on financial aid to System Administrator only
--    (idempotent) — same technique as add_petty_cash_table.sql step 3 / and
--    add_expense_refunds_table.sql step 6 (admin-only grants list ONLY
--    'System Administrator' by name). Viewer gets the same access the same way
--    Refunds' / Petty Cash's admin-only actions do: by re-running
--    add_viewer_role.sql afterward, which copies the full union of
--    (resource, action) pairs — including these — onto Viewer.
--    NOTE: attachments (FinancialAidAttachment) are governed by this SAME
--    'childsmile_app_financialaid' resource — they're only ever reached through
--    a financial aid record's own admin-only views, so they don't need a
--    separate permission row (same reasoning as PettyCash's source_refund link).
-- ============================================================
INSERT INTO childsmile_app_permissions (role_id, resource, action)
SELECT r.id, 'childsmile_app_financialaid', a.action
FROM childsmile_app_role r
CROSS JOIN (VALUES ('VIEW'), ('CREATE'), ('UPDATE'), ('DELETE')) AS a(action)
WHERE r.role_name = 'System Administrator'
  AND NOT EXISTS (
    SELECT 1 FROM childsmile_app_permissions p
    WHERE p.role_id = r.id
      AND p.resource = 'childsmile_app_financialaid'
      AND p.action = a.action
  );

-- 5. Verify
-- ============================================================
SELECT r.role_name, p.resource, p.action
FROM childsmile_app_permissions p
JOIN childsmile_app_role r ON r.id = p.role_id
WHERE p.resource = 'childsmile_app_financialaid'
ORDER BY r.role_name, p.action;
