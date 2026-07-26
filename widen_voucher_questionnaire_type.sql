-- ============================================================
-- Widen voucher distribution questionnaire_type to allow the new
-- 'עמותה וכללי' (both organization + general) value.
-- The old column was VARCHAR(10); 'עמותה וכללי' is 11 chars.
-- Execute directly on the database cluster.
-- No Django migration required (same convention as add_vouchers_table.sql).
-- Idempotent — safe to run more than once.
-- ============================================================

ALTER TABLE childsmile_app_voucherdistribution
    ALTER COLUMN questionnaire_type TYPE VARCHAR(20);
