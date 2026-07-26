-- ============================================================
-- Add muted_notifications to Staff — per-user WhatsApp notification mute prefs.
-- A JSON list of stable notification event keys the user has muted
-- (see notification_mute.MUTEABLE_WHATSAPP_NOTIFICATIONS). Empty list = receives
-- everything. Toggled per-user in the Edit User modal (System Management).
-- Execute directly on the database cluster.
-- No Django migration required (same convention as add_staff_profile_fields.sql).
-- Idempotent — safe to run more than once.
-- ============================================================

ALTER TABLE childsmile_app_staff
    ADD COLUMN IF NOT EXISTS muted_notifications JSONB NOT NULL DEFAULT '[]'::jsonb;
