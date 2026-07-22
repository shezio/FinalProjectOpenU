-- ============================================================
-- Fun Days & House Visits — TEAM assignments (ימי כיף וביקורי בית)
-- Raw PostgreSQL DDL. Execute directly on the database cluster.
-- No Django migration required (same convention as the rest of the feature).
--
-- Adds childsmile_app_activityassignment — the join table making the
-- who-is-assigned relationship a real MANY-to-many: a fun day / house visit is
-- run by a TEAM of volunteers, and a volunteer can be on many activities.
--
-- RUN THIS **AFTER** add_activity_tables.sql (it references that table).
-- ============================================================

-- Fully re-runnable & non-destructive:
--   • CREATE TABLE / INDEX are IF NOT EXISTS (never drops — this table CAN hold
--     real data, unlike the guarded DROPs in add_activity_tables.sql);
--   • the backfill INSERT is idempotent (ON CONFLICT DO NOTHING).

-- 1. The join table (many volunteers <-> one activity request)
-- ============================================================
CREATE TABLE IF NOT EXISTS childsmile_app_activityassignment (
    assignment_id        SERIAL PRIMARY KEY,
    activity_request_id  INTEGER NOT NULL
                             REFERENCES childsmile_app_activityrequest(activity_request_id) ON DELETE CASCADE,
    staff_id             INTEGER NOT NULL
                             REFERENCES childsmile_app_staff(staff_id) ON DELETE CASCADE,
    volunteer_name       VARCHAR(255) NULL,          -- denormalized display name at assign time
    assigned_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_by           VARCHAR(255) NULL,
    CONSTRAINT uq_activityassignment_req_staff UNIQUE (activity_request_id, staff_id)
);

-- 2. Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_activityassign_req
    ON childsmile_app_activityassignment (activity_request_id);

CREATE INDEX IF NOT EXISTS idx_activityassign_staff
    ON childsmile_app_activityassignment (staff_id);

-- 3. Backfill — migrate any EXISTING single-assignee rows into the join table so
--    already-assigned activities keep their volunteer once the team model goes
--    live. Idempotent (skips rows already migrated). Only rows that have a real
--    system user (assigned_volunteer_staff_id) are migrated — a coordinator's
--    free-text-only name (no staff link) has nothing to point a join row at and
--    stays in the denormalized assigned_volunteer text.
-- ============================================================
INSERT INTO childsmile_app_activityassignment (activity_request_id, staff_id, volunteer_name, assigned_at, updated_by)
SELECT r.activity_request_id,
       r.assigned_volunteer_staff_id,
       COALESCE(r.assigned_volunteer, ''),
       COALESCE(r.updated_at, NOW()),
       'assignment_backfill'
FROM childsmile_app_activityrequest r
WHERE r.assigned_volunteer_staff_id IS NOT NULL
ON CONFLICT (activity_request_id, staff_id) DO NOTHING;

-- 4. Verify
-- ============================================================
SELECT a.activity_request_id, a.staff_id, a.volunteer_name, a.assigned_at
FROM childsmile_app_activityassignment a
ORDER BY a.activity_request_id, a.assigned_at;

-- NOTE: NO new permission rows. The volunteer self-assign / leave endpoints are
-- auth-only (any logged-in volunteer, de-identified data — the privacy boundary
-- is the endpoint, not a table permission). Coordinator team edits reuse the
-- EXISTING 'childsmile_app_activityrequest' resource permission (an assignment
-- belongs to a request), granted in add_activity_tables.sql.
