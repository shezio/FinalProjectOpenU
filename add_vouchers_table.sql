-- ============================================================
-- Vouchers (חלוקת תלושים) — Raw PostgreSQL DDL
-- Execute directly on the database cluster.
-- No Django migration required (same convention as every other finance module).
-- ============================================================

-- 1. Distributions (חלוקות)
-- ============================================================
CREATE TABLE IF NOT EXISTS childsmile_app_voucherdistribution (
    distribution_id     SERIAL PRIMARY KEY,
    name                 VARCHAR(255) NOT NULL,
    voucher_type         VARCHAR(30) NOT NULL,
    initial_amount       NUMERIC(12, 2) NOT NULL,
    start_date           DATE NULL,
    end_date             DATE NULL,
    is_completed         BOOLEAN NOT NULL DEFAULT FALSE,    
    questionnaire_type   VARCHAR(10) NOT NULL DEFAULT 'ללא',
    notes                TEXT NULL,
    created_at           TIMESTAMP NOT NULL,
    updated_at           TIMESTAMP NOT NULL,
    updated_by           VARCHAR(255) NULL
);

-- 2. Recipients (מקבלים) — one row per family per distribution
-- ============================================================
-- NOTE: no CHECK constraints — validation (e.g. required fields per
-- questionnaire_type) is enforced at the API layer, same convention as
-- every other module in this app.
CREATE TABLE IF NOT EXISTS childsmile_app_voucherrecipient (
    recipient_id           SERIAL PRIMARY KEY,
    distribution_id         INTEGER NOT NULL
                                REFERENCES childsmile_app_voucherdistribution(distribution_id) ON DELETE CASCADE,

    full_name               VARCHAR(255) NOT NULL,
    parent_id_number        VARCHAR(20) NULL,
    phone                   VARCHAR(20) NULL,
    child_name               VARCHAR(255) NULL,
    child_treatment_status   VARCHAR(50) NULL,
    child_id_number          VARCHAR(20) NULL,
    num_children_at_home     INTEGER NULL,
    city                     VARCHAR(255) NULL,
    street_address           VARCHAR(255) NULL,
    case_description         TEXT NULL,
    referral_source          VARCHAR(255) NULL,
    submitted_at             TIMESTAMP NULL,

    approved_amount          NUMERIC(10, 2) NULL,
    ready                    BOOLEAN NOT NULL DEFAULT FALSE,
    assigned_volunteer       VARCHAR(255) NULL,
    delivered                VARCHAR(20) NULL,
    notes                    TEXT NULL,

    linked_child_id          BIGINT NULL
                                REFERENCES childsmile_app_children(child_id) ON DELETE SET NULL,

    created_at               TIMESTAMP NOT NULL,
    updated_at               TIMESTAMP NOT NULL,
    updated_by               VARCHAR(255) NULL
);

-- 3. Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_voucherrecip_distribution
    ON childsmile_app_voucherrecipient (distribution_id);

CREATE INDEX IF NOT EXISTS idx_voucherrecip_child
    ON childsmile_app_voucherrecipient (linked_child_id);

CREATE INDEX IF NOT EXISTS idx_voucherdist_start_date
    ON childsmile_app_voucherdistribution (start_date DESC);

-- 4. Grant VIEW/CREATE/UPDATE/DELETE on vouchers to System Administrator only
--    (idempotent) — same technique as every other finance module. Viewer gets
--    the same access the same way — by re-running add_viewer_role.sql
--    afterward. Recipients are governed by this SAME 'childsmile_app_voucherdistribution'
--    resource (reached only through the distribution's own admin-only views) —
--    no separate permission row, same reasoning as PettyCash/FinancialAid.
--    NOTE: the public questionnaire submission endpoint
--    (submit_voucher_questionnaire) has NO permission check at all — it's a
--    public, unauthenticated endpoint (like volunteer/tutor registration).
-- ============================================================
INSERT INTO childsmile_app_permissions (role_id, resource, action)
SELECT r.id, 'childsmile_app_voucherdistribution', a.action
FROM childsmile_app_role r
CROSS JOIN (VALUES ('VIEW'), ('CREATE'), ('UPDATE'), ('DELETE')) AS a(action)
WHERE r.role_name = 'System Administrator'
  AND NOT EXISTS (
    SELECT 1 FROM childsmile_app_permissions p
    WHERE p.role_id = r.id
      AND p.resource = 'childsmile_app_voucherdistribution'
      AND p.action = a.action
  );

-- 5. Verify
-- ============================================================
SELECT r.role_name, p.resource, p.action
FROM childsmile_app_permissions p
JOIN childsmile_app_role r ON r.id = p.role_id
WHERE p.resource = 'childsmile_app_voucherdistribution'
ORDER BY r.role_name, p.action;
