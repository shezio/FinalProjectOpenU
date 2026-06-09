-- ============================================================
--  Notification Messages table
--  Run once on any environment; safe to re-run (IF NOT EXISTS).
--  To fully reset: the DROP below removes and recreates the table.
-- ============================================================

-- Drop first (cascades indexes; use only when you want a clean slate)
DROP TABLE IF EXISTS childsmile_app_notification_message CASCADE;

CREATE TABLE IF NOT EXISTS childsmile_app_notification_message (
    id              SERIAL PRIMARY KEY,
    message_type    VARCHAR(30)  NOT NULL DEFAULT 'manual'
                        CHECK (message_type IN (
                            'birthday_today',
                            'birthday_this_week',
                            'birthday_next_week',
                            'custom_auto',
                            'manual'
                        )),
    title           VARCHAR(255) NOT NULL,
    text            TEXT         NOT NULL,
    child_id        BIGINT       REFERENCES childsmile_app_children(child_id) ON DELETE CASCADE,
    is_auto         BOOLEAN      NOT NULL DEFAULT FALSE,
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by_id   INTEGER      REFERENCES childsmile_app_staff(staff_id) ON DELETE SET NULL
);

-- Index: fast lookup for active messages (used by panel API)
CREATE INDEX IF NOT EXISTS idx_notif_active_created
    ON childsmile_app_notification_message (is_active, created_at DESC);

-- Index: fast lookup by message_type (used by birthday refresh scheduler)
CREATE INDEX IF NOT EXISTS idx_notif_type
    ON childsmile_app_notification_message (message_type);

-- ── Permissions: System Administrator can do everything ──────
-- VIEW for all roles that already exist (run for each role_id you need)
-- Replace the role_ids below with your actual values if needed;
-- these INSERTs are idempotent due to ON CONFLICT DO NOTHING.

-- First, ensure the resource string is consistent with the Django app prefix.
-- The has_permission() helper looks for "childsmile_app_<resource>",
-- so we store "childsmile_app_notification_message" as resource.

INSERT INTO childsmile_app_permissions (role_id, resource, action)
SELECT r.id, 'childsmile_app_notification_message', act.action
FROM   childsmile_app_role r,
       (VALUES ('VIEW'), ('CREATE'), ('UPDATE'), ('DELETE')) AS act(action)
WHERE  r.role_name = 'System Administrator'
ON CONFLICT DO NOTHING;

-- VIEW permission for every other role
INSERT INTO childsmile_app_permissions (role_id, resource, action)
SELECT r.id, 'childsmile_app_notification_message', 'VIEW'
FROM   childsmile_app_role r
WHERE  r.role_name <> 'System Administrator'
ON CONFLICT DO NOTHING;

-- ============================================================
--  Seed: initial birthday notification rows
--
--  The table holds ONLY 1 row per birthday type — these are
--  TEMPLATE rows that show the message format.
--  Real per-child birthday messages are computed DYNAMICALLY
--  at API call time from the Children table; nothing is ever
--  inserted per child.
--
--  Re-running is safe: DELETE removes old placeholders first.
-- ============================================================

-- Remove ALL birthday rows (templates AND any per-child rows from old code versions)
DELETE FROM childsmile_app_notification_message
WHERE message_type IN ('birthday_today', 'birthday_this_week', 'birthday_next_week');

-- birthday_today template
INSERT INTO childsmile_app_notification_message
    (message_type, title, text, child_id, is_auto, is_active, created_by_id)
VALUES (
    'birthday_today',
    E'🎂 יום הולדת היום\n👦/👧 החניך/ה {שם}',
    E'🎉🎊🎂 מזל טוב! החניך/החניכה {שם הילד/ה} חוגג/ת היום יום הולדת {גיל}',
    NULL, TRUE, TRUE, NULL
);

-- birthday_this_week template
-- Note: when birthday is tomorrow Python generates "מחר ... \nבתאריך {תאריך}"
--       otherwise: "השבוע ביום {יום} בתאריך {תאריך}"
INSERT INTO childsmile_app_notification_message
    (message_type, title, text, child_id, is_auto, is_active, created_by_id)
VALUES (
    'birthday_this_week',
    E'🎂 יום הולדת השבוע\n👦/👧 החניך/ה {שם}',
    E'🎉🎊🎂 מזל טוב! החניך/החניכה {שם הילד/ה} יחגוג/תחגוג יום הולדת {גיל} השבוע ביום {יום בשבוע} בתאריך {תאריך}',
    NULL, TRUE, TRUE, NULL
);

-- birthday_next_week template
INSERT INTO childsmile_app_notification_message
    (message_type, title, text, child_id, is_auto, is_active, created_by_id)
VALUES (
    'birthday_next_week',
    E'🎂 יום הולדת השבוע הבא\n👦/👧 החניך/ה {שם}',
    E'🎉🎊🎂 מזל טוב! החניך/החניכה {שם הילד/ה} יחגוג/תחגוג יום הולדת {גיל} בשבוע הבא ביום {יום בשבוע} בתאריך {תאריך}',
    NULL, TRUE, TRUE, NULL
);
