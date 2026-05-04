-- Create CoordinatorProgressReport table
-- Run manually: psql -U postgres -d childsmile_prod < add_coordinator_progress_report_table.sql

-- Drop existing objects if they exist (for safety/re-runs)
DROP INDEX IF EXISTS idx_weekly_request_week CASCADE;
DROP INDEX IF EXISTS idx_coordinator_progress_reviewed CASCADE;
DROP INDEX IF EXISTS idx_coordinator_progress_coordinator CASCADE;
DROP INDEX IF EXISTS idx_coordinator_progress_week CASCADE;
DROP TABLE IF EXISTS childsmile_app_weeklycoordinatorrequest CASCADE;
DROP TABLE IF EXISTS childsmile_app_coordinatorprogressreport CASCADE;

-- Create CoordinatorProgressReport table
CREATE TABLE IF NOT EXISTS childsmile_app_coordinatorprogressreport (
    id SERIAL PRIMARY KEY,
    coordinator_id INTEGER NOT NULL,
    week_starting DATE NOT NULL,
    message_text TEXT NOT NULL,
    received_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_reviewed BOOLEAN DEFAULT FALSE,
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (coordinator_id) REFERENCES childsmile_app_staff(staff_id)
        ON DELETE CASCADE,
    UNIQUE (coordinator_id, week_starting)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_coordinator_progress_week 
    ON childsmile_app_coordinatorprogressreport(week_starting DESC);
CREATE INDEX IF NOT EXISTS idx_coordinator_progress_coordinator 
    ON childsmile_app_coordinatorprogressreport(coordinator_id);
CREATE INDEX IF NOT EXISTS idx_coordinator_progress_reviewed 
    ON childsmile_app_coordinatorprogressreport(is_reviewed);

-- Also create a table to track which coordinators were asked (for auditing)
CREATE TABLE IF NOT EXISTS childsmile_app_weeklycoordinatorrequest (
    id SERIAL PRIMARY KEY,
    coordinator_id INTEGER NOT NULL,
    week_starting DATE NOT NULL,
    request_sent_at TIMESTAMP WITH TIME ZONE NOT NULL,
    response_received BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (coordinator_id) REFERENCES childsmile_app_staff(staff_id)
        ON DELETE CASCADE,
    UNIQUE (coordinator_id, week_starting)
);

CREATE INDEX IF NOT EXISTS idx_weekly_request_week 
    ON childsmile_app_weeklycoordinatorrequest(week_starting DESC);
