-- Add staff profile fields for coordinators and managers
-- These fields store demographic information for better reporting
-- Run this manually - NO migration needed

ALTER TABLE childsmile_app_staff 
ADD COLUMN staff_israel_id VARCHAR(20) NULL DEFAULT NULL UNIQUE,
ADD COLUMN staff_age INT NULL DEFAULT NULL,
ADD COLUMN staff_birth_date DATE NULL DEFAULT NULL,
ADD COLUMN staff_gender BOOLEAN NULL DEFAULT NULL,
ADD COLUMN staff_phone VARCHAR(20) NULL DEFAULT NULL,
ADD COLUMN staff_city VARCHAR(255) NULL DEFAULT NULL;

-- Add index on israel_id for faster lookups
CREATE INDEX idx_staff_israel_id ON childsmile_app_staff(staff_israel_id);
