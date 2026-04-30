-- Create StaffMeeting table for staff meeting management feature
-- Run this on prod DB before deploying the meeting management feature

DROP TABLE IF EXISTS childsmile_app_staffmeeting;

CREATE TABLE childsmile_app_staffmeeting (
    id                        SERIAL PRIMARY KEY,
    title                     VARCHAR(255) NOT NULL DEFAULT 'פגישת צוות',
    meeting_date              DATE NOT NULL,
    meeting_time              TIME NOT NULL,
    location                  VARCHAR(255),
    notes                     TEXT,
    is_cancelled              BOOLEAN NOT NULL DEFAULT FALSE,
    created_by_id             INTEGER REFERENCES childsmile_app_staff(staff_id) ON DELETE SET NULL,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reminder_week_sent_at     TIMESTAMPTZ,
    reminder_two_days_sent_at TIMESTAMPTZ,
    reminder_same_day_sent_at TIMESTAMPTZ,
    invited_staff_ids         JSONB NOT NULL DEFAULT '[]',
    send_whatsapp             BOOLEAN NOT NULL DEFAULT TRUE
);
