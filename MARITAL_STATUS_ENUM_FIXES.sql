-- Marital Status Enum Fixes for Families Import
-- February 12, 2026
-- Run these commands in PostgreSQL before importing families

-- Add 4 new enum values to marital_status type
-- (These values were found in the Excel data and are missing from the system)

ALTER TYPE marital_status ADD VALUE 'חד הורי' AFTER 'גרושים';
ALTER TYPE marital_status ADD VALUE 'ידועים בציבור' AFTER 'חד הורי';
ALTER TYPE marital_status ADD VALUE 'אלמנה' AFTER 'ידועים בציבור';
ALTER TYPE marital_status ADD VALUE 'רווק/ה' AFTER 'אלמנה';

-- Verify: All 7 values now exist (was 3, added 4)
SELECT unnest(enum_range(NULL::marital_status)) AS marital_status_values ORDER BY marital_status_values;


-- Expected output:
-- marital_status_values
-- אין
-- אלמנה
-- גרושים
-- חד הורי
-- ידועים בציבור
-- נשואים
-- רווק/ה


--also run 
ALTER TABLE childsmile_app_children ADD COLUMN need_review BOOLEAN DEFAULT TRUE;
--and
UPDATE childsmile_app_children SET need_review = TRUE;