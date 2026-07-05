-- Drop the is_first_visit column from the tutor feedback table.
-- Run against the live PostgreSQL database.
-- Idempotent: safe to run more than once.

ALTER TABLE childsmile_app_tutor_feedback
    DROP COLUMN IF EXISTS is_first_visit;
