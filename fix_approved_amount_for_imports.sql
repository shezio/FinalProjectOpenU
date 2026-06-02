-- Fix: set approved_amount = requested_amount for all admin-imported refund rows
-- Targets rows that were bulk-imported (status='שולם', approved_amount IS NULL)
-- Safe to run multiple times (WHERE approved_amount IS NULL prevents double-writing)

UPDATE childsmile_app_expenserefund
SET
    approved_amount = requested_amount,
    updated_at      = NOW()
WHERE
    status           = 'שולם'
    AND approved_amount IS NULL
    AND updated_by      = 'admin_import';

-- Verify
SELECT
    refund_id,
    staff_full_name,
    expense_date,
    requested_amount,
    approved_amount,
    status,
    refund_method
FROM childsmile_app_expenserefund
WHERE status = 'שולם' and approved_amount IS NULL and updated_by = 'admin_import'
ORDER BY expense_date;
