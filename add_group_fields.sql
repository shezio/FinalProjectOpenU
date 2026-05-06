-- Add group-related fields to children table
ALTER TABLE childsmile_app_children ADD COLUMN is_in_group BOOLEAN DEFAULT TRUE;
ALTER TABLE childsmile_app_children ADD COLUMN why_not_in_group VARCHAR(255) NULL;

-- Add group-related fields to general volunteer table
ALTER TABLE childsmile_app_general_volunteer ADD COLUMN is_in_group BOOLEAN DEFAULT TRUE;
ALTER TABLE childsmile_app_general_volunteer ADD COLUMN why_not_in_group VARCHAR(255) NULL;

-- Add group-related fields to tutors table
ALTER TABLE childsmile_app_tutors ADD COLUMN is_in_group BOOLEAN DEFAULT TRUE;
ALTER TABLE childsmile_app_tutors ADD COLUMN why_not_in_group VARCHAR(255) NULL;

-- Create indexes for faster filtering
CREATE INDEX idx_children_is_in_group ON childsmile_app_children(is_in_group);
CREATE INDEX idx_general_volunteer_is_in_group ON childsmile_app_general_volunteer(is_in_group);
CREATE INDEX idx_tutors_is_in_group ON childsmile_app_tutors(is_in_group);
