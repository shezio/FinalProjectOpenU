-- ============================================================
-- Fun Days & House Visits (ימי כיף וביקורי בית) — Raw PostgreSQL DDL
-- Execute directly on the database cluster.
-- No Django migration required (same convention as vouchers / every finance module).
--
-- Two new tables:
--   childsmile_app_activityround    — a registration window (מחזור בקשות)
--   childsmile_app_activityrequest  — one family's fun-day/house-visit request
-- The post-activity report reuses the EXISTING feedback system (no new table) —
-- tracked here only via the feedback_received flag (Liam's Q3: minimum ONE
-- feedback per activity; extra volunteer feedbacks are a bonus).
-- ============================================================

-- ⚠️ FULLY RE-RUNNABLE. This whole file is safe to run again any time:
--   • the two DROPs below recreate the (currently EMPTY) tables so ANY schema
--     change actually applies on re-run — "create or replace";
--   • the permission INSERT is idempotent (… WHERE NOT EXISTS);
--   • the task-type INSERT is idempotent (ON CONFLICT DO NOTHING).
-- ⚠️ SAFE ONLY WHILE THERE IS NO REAL DATA. Once families/coordinators start
--    using this in prod, COMMENT OUT the two DROP lines below (the rest stays
--    safe to re-run on its own — it never touches existing rows).
DROP TABLE IF EXISTS childsmile_app_activityrequest CASCADE;
DROP TABLE IF EXISTS childsmile_app_activityround CASCADE;

-- 1. Rounds (מחזורי בקשות)
-- ============================================================
CREATE TABLE IF NOT EXISTS childsmile_app_activityround (
    activity_round_id   SERIAL PRIMARY KEY,
    name                 VARCHAR(255) NOT NULL,          -- "שם המחזור"
    status               VARCHAR(10) NOT NULL DEFAULT 'open',  -- open / closed
    start_date           DATE NULL,
    end_date             DATE NULL,
    notes                TEXT NULL,
    created_at           TIMESTAMP NOT NULL,
    updated_at           TIMESTAMP NOT NULL,
    updated_by           VARCHAR(255) NULL
);

-- 2. Requests (בקשות פעילות) — one row per family per activity
-- ============================================================
-- NOTE: no CHECK constraints — validation (required fields per activity_type,
-- length caps, etc.) is enforced at the API layer, same convention as every
-- other module in this app. Variant-specific columns are simply left NULL for
-- the other activity_type (fun_day vs house_visit).
CREATE TABLE IF NOT EXISTS childsmile_app_activityrequest (
    activity_request_id  SERIAL PRIMARY KEY,
    round_id              INTEGER NOT NULL
                              REFERENCES childsmile_app_activityround(activity_round_id) ON DELETE CASCADE,
    activity_type         VARCHAR(15) NOT NULL,          -- fun_day / house_visit
    requested_date        DATE NULL,                     -- "תאריך מבוקש"

    -- Family-submitted detail fields (shared) --------------------------------
    child_name            VARCHAR(255) NOT NULL,         -- "שם מלא של המטופל/ת"
    child_gender          VARCHAR(20) NULL,              -- "מגדר" (free text: זכר/נקבה/בן/בת)
    child_age             VARCHAR(10) NULL,              -- "גיל" (CharField — source has half-years, e.g. "7.5")
    parent_name           VARCHAR(255) NULL,             -- "שם הורה"
    parent_phone          VARCHAR(20) NULL,              -- "טלפון הורה"
    city                  VARCHAR(255) NULL,             -- "עיר מגורים"
    treating_hospital     VARCHAR(255) NULL,             -- "בית חולים מטפל"
    notes                 TEXT NULL,                     -- "הערות / הארות"

    -- Fun-day-only ------------------------------------------------------------
    limitations           TEXT NULL,                     -- "מגבלות שכדאי לדעת"
    favorite_activities   TEXT NULL,                     -- "פעילויות אהובות על הילד/ה"

    -- House-visit-only --------------------------------------------------------
    num_siblings          INTEGER NULL,                  -- "מספר אחים"
    full_address          VARCHAR(255) NULL,             -- "כתובת מלאה"
    preferred_days        VARCHAR(255) NULL,             -- "ימים מועדפים בשבוע"
    has_safe_room         BOOLEAN NULL,                  -- "יש מרחב מוגן קרוב (ממ״ד)"

    -- Processing / tracking ---------------------------------------------------
    assigned_volunteer          VARCHAR(255) NULL,       -- "מתנדב משובץ" (free-text display name)
    assigned_volunteer_staff_id INTEGER NULL
                              REFERENCES childsmile_app_staff(staff_id) ON DELETE SET NULL,
    status                VARCHAR(15) NOT NULL DEFAULT 'open',  -- open / assigned / completed / cancelled
    linked_child_id       BIGINT NULL
                              REFERENCES childsmile_app_children(child_id) ON DELETE SET NULL,
    feedback_received     BOOLEAN NOT NULL DEFAULT FALSE,  -- Q3: at least one report received
    submitted_at          TIMESTAMP NULL,                -- "חותמת זמן" (NULL for manually-added rows)

    created_at            TIMESTAMP NOT NULL,
    updated_at            TIMESTAMP NOT NULL,
    updated_by            VARCHAR(255) NULL
);

-- 3. Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_activityreq_round
    ON childsmile_app_activityrequest (round_id);

CREATE INDEX IF NOT EXISTS idx_activityreq_status
    ON childsmile_app_activityrequest (status);

CREATE INDEX IF NOT EXISTS idx_activityreq_type
    ON childsmile_app_activityrequest (activity_type);

CREATE INDEX IF NOT EXISTS idx_activityround_start_date
    ON childsmile_app_activityround (start_date DESC);

-- 4. Grant VIEW/CREATE/UPDATE/DELETE on BOTH resources to System Administrator
--    AND Volunteer Coordinator (Liam's Q4). Idempotent — same technique as every
--    other module. Viewer gets the same access by re-running add_viewer_role.sql
--    afterward.
--    NOTE: the PUBLIC questionnaire submission endpoint (submit_activity_request)
--    has NO permission check at all — it's a public, unauthenticated endpoint
--    (same precedent as the voucher questionnaire / volunteer registration).
--    NOTE: General Volunteers get NO permission row here — the volunteer-facing
--    signup list is a SEPARATE, auth-gated, DE-IDENTIFIED endpoint (city/age/
--    gender/type/date only), so the privacy boundary is enforced at the endpoint,
--    not via table permissions.
-- ============================================================
INSERT INTO childsmile_app_permissions (role_id, resource, action)
SELECT r.id, res.resource, a.action
FROM childsmile_app_role r
CROSS JOIN (VALUES
    ('childsmile_app_activityround'),
    ('childsmile_app_activityrequest')
) AS res(resource)
CROSS JOIN (VALUES ('VIEW'), ('CREATE'), ('UPDATE'), ('DELETE')) AS a(action)
WHERE r.role_name IN ('System Administrator', 'Volunteer Coordinator')
  AND NOT EXISTS (
    SELECT 1 FROM childsmile_app_permissions p
    WHERE p.role_id = r.id
      AND p.resource = res.resource
      AND p.action = a.action
  );

-- 5. Verify
-- ============================================================
SELECT r.role_name, p.resource, p.action
FROM childsmile_app_permissions p
JOIN childsmile_app_role r ON r.id = p.role_id
WHERE p.resource IN ('childsmile_app_activityround', 'childsmile_app_activityrequest')
ORDER BY r.role_name, p.resource, p.action;

-- 6. Task type for the coordinator notification created when a VOLUNTEER
--    self-assigns to an activity (idempotent — same pattern as add_liam_task_type.sql).
--    Safe to re-run this whole file; every statement is idempotent.
--    NOTE: self-assign works even before this runs — the notification code is
--    non-fatal (it just logs & skips if the task type is missing).
-- ============================================================
INSERT INTO childsmile_app_task_types (task_type, resource, action)
VALUES ('שיבוץ מתנדב לפעילות', 'childsmile_app_tasks', 'CREATE')
ON CONFLICT (task_type) DO NOTHING;
