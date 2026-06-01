-- ============================================================
-- ROLLBACK: Expense Refunds (החזרי הוצאות) — Raw PostgreSQL
-- Reverses everything in add_expense_refunds_table.sql
-- Execute directly on the database cluster.
-- ⚠️  WARNING: This permanently drops all refund data.
--     Run ONLY after confirming a backup exists.
-- ============================================================

-- 1. Remove all permissions for expenserefund (VIEW + CRUD)
-- ============================================================
DELETE FROM childsmile_app_permissions
WHERE resource = 'childsmile_app_expenserefund';

-- 2. Remove the Task Type added for refund tasks
-- ============================================================
DELETE FROM childsmile_app_task_types
WHERE task_type = 'החזר הוצאות';

-- 3. Drop indexes
-- ============================================================
DROP INDEX IF EXISTS idx_refund_staff_created;
DROP INDEX IF EXISTS idx_refund_status_created;
DROP INDEX IF EXISTS idx_refund_expense_date;

-- 4. Drop the main table (cascades FK references)
-- ============================================================
DROP TABLE IF EXISTS childsmile_app_expenserefund CASCADE;

-- Done.
-- ============================================================
