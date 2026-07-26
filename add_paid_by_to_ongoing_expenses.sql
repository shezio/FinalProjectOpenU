-- ============================================================
-- Add paid_by ("שולם על ידי" / who paid) to Ongoing Expenses (הוצאות שוטפות)
-- Mirrors childsmile_app_pettycashexpense.paid_by (free text, nullable).
-- Execute directly on the database cluster.
-- No Django migration required (same convention as add_ongoing_expenses_table.sql).
-- Idempotent — safe to run more than once.
-- ============================================================

ALTER TABLE childsmile_app_ongoingexpense
    ADD COLUMN IF NOT EXISTS paid_by VARCHAR(255) NULL;
