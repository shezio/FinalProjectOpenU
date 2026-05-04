-- Create CoordinatorChatMessage table for admin-coordinator messaging
-- Run manually: psql -U postgres -d childsmile_prod < add_coordinator_chat_table.sql

-- Drop existing objects if they exist (for safety/re-runs)
DROP INDEX IF EXISTS idx_coordinator_chat_coordinator_created CASCADE;
DROP INDEX IF EXISTS idx_coordinator_chat_is_read CASCADE;
DROP TABLE IF EXISTS childsmile_app_coordinatorchatmessage CASCADE;

-- Create CoordinatorChatMessage table
CREATE TABLE IF NOT EXISTS childsmile_app_coordinatorchatmessage (
    id SERIAL PRIMARY KEY,
    coordinator_id INTEGER NOT NULL,
    sender_type VARCHAR(20) NOT NULL,
    sender_id INTEGER,
    message_text TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (coordinator_id) REFERENCES childsmile_app_staff(staff_id)
        ON DELETE CASCADE,
    CHECK (sender_type IN ('admin', 'coordinator'))
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_coordinator_chat_coordinator_created 
    ON childsmile_app_coordinatorchatmessage(coordinator_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_coordinator_chat_is_read 
    ON childsmile_app_coordinatorchatmessage(coordinator_id, is_read);
