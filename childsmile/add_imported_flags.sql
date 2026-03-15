-- Add is_t_imported column to tutors table
ALTER TABLE childsmile_app_tutors ADD COLUMN is_t_imported BOOLEAN DEFAULT FALSE;

-- Add is_c_imported column to children table  
ALTER TABLE childsmile_app_children ADD COLUMN is_c_imported BOOLEAN DEFAULT FALSE;

-- Create indexes for performance
CREATE INDEX idx_tutors_is_t_imported ON childsmile_app_tutors(is_t_imported);
CREATE INDEX idx_children_is_c_imported ON childsmile_app_children(is_c_imported);
