-- Add new columns to childsmile_app_children table
-- Direct SQL (NO MIGRATION) - February 16, 2026

ALTER TABLE childsmile_app_children 
ADD COLUMN IF NOT EXISTS is_in_frame TEXT NULL,
ADD COLUMN IF NOT EXISTS coordinator_comments TEXT NULL;

-- Verify the columns were added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'childsmile_app_children' 
AND column_name IN ('is_in_frame', 'coordinator_comments');
