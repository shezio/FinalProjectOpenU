-- ============================================================
-- Fix 1: Families with status 'עזב' or 'בריא' → is_in_group=false, why=status
-- PK column: child_id
-- ============================================================
UPDATE childsmile_app_children
SET is_in_group = FALSE,
    why_not_in_group = status
WHERE status IN ('עזב', 'בריא')
  AND (is_in_group = TRUE OR is_in_group IS NULL);

-- ============================================================
-- Fix 2: Inactive General Volunteers → is_in_group=false, why='עזב'
-- is_active lives on childsmile_app_staff (joined via staff_id)
-- PK column: id_id
-- ============================================================
UPDATE childsmile_app_general_volunteer gv
SET is_in_group = FALSE,
    why_not_in_group = 'עזב'
FROM childsmile_app_staff s
WHERE gv.staff_id = s.staff_id
  AND s.is_active = FALSE
  AND (gv.is_in_group = TRUE OR gv.is_in_group IS NULL);

-- ============================================================
-- Fix 3: Inactive Tutors → is_in_group=false, why='עזב'
-- is_active lives on childsmile_app_staff (joined via staff_id)
-- PK column: id_id
-- ============================================================
UPDATE childsmile_app_tutors t
SET is_in_group = FALSE,
    why_not_in_group = 'עזב'
FROM childsmile_app_staff s
WHERE t.staff_id = s.staff_id
  AND s.is_active = FALSE
  AND (t.is_in_group = TRUE OR t.is_in_group IS NULL);

-- ============================================================
-- Verify: Families
-- ============================================================
SELECT child_id, status, is_in_group, why_not_in_group
FROM childsmile_app_children
WHERE status IN ('עזב', 'בריא')
  AND is_in_group = FALSE
ORDER BY status;

-- ============================================================
-- Verify: General Volunteers (join with Staff for is_active)
-- ============================================================
SELECT gv.id_id, s.is_active, gv.is_in_group, gv.why_not_in_group
FROM childsmile_app_general_volunteer gv
JOIN childsmile_app_staff s ON gv.staff_id = s.staff_id
WHERE s.is_active = FALSE
  AND gv.is_in_group = FALSE;

-- ============================================================
-- Verify: Tutors (join with Staff for is_active)
-- ============================================================
SELECT t.id_id, s.is_active, t.is_in_group, t.why_not_in_group
FROM childsmile_app_tutors t
JOIN childsmile_app_staff s ON t.staff_id = s.staff_id
WHERE s.is_active = FALSE
  AND t.is_in_group = FALSE;
