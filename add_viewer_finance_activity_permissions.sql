-- ============================================================
-- Grant the read-only "Viewer" role access to the FINANCE + FUN-DAYS
-- (activity) pages that shipped AFTER the Viewer role was last synced.
--
-- WHY THIS IS NEEDED
--   The Viewer role is meant to "SEE everything, CHANGE nothing". The
--   frontend page gate for these admin pages uses hasAllPermissions([...])
--   (PettyCash.js / OngoingExpenses.js / FinancialAid.js / Vouchers.js /
--   FinanceOverview.js / ActivityBoard.js) — so WITHOUT the (resource, action)
--   rows below, a Viewer gets a "no permission" screen and cannot even open
--   the page. These modules were added after the last add_viewer_role.sql run,
--   so the Viewer never received their permissions.
--
--   The actual read-only behavior is ALREADY enforced on the backend: every
--   authenticated write endpoint in those modules carries @block_viewer_writes,
--   which logs the attempt and returns a fake HTTP 200/201 WITHOUT changing any
--   data. is_admin() also treats Viewer as an admin, so the GET endpoints work.
--   This script only opens the DOORS (the frontend gate); it does NOT let a
--   Viewer actually write anything.
--
--   Equivalent to re-running add_viewer_role.sql (which copies the FULL union of
--   every (resource, action) onto Viewer). This file is the SAME grant, scoped
--   to just the new finance + activity resources so it is explicit and reviewable.
--
--   NOTE: childsmile_app_expenserefund (Refunds) is intentionally omitted — the
--   Refunds page is gated by ROLE (System Administrator | Viewer), not by
--   hasAllPermissions, so the Viewer already sees it.
--
-- Safe to run multiple times (idempotent — NOT EXISTS guard).
-- ============================================================

INSERT INTO childsmile_app_permissions (role_id, resource, action)
SELECT r.id, res.resource, a.action
FROM childsmile_app_role r
CROSS JOIN (VALUES
    ('childsmile_app_pettycashexpense'),    -- קופה קטנה (Petty Cash) + Finance Overview
    ('childsmile_app_ongoingexpense'),       -- הוצאות קבועות (Ongoing Expenses) + Finance Overview
    ('childsmile_app_financialaid'),         -- סיוע כספי (Financial Aid) + Finance Overview
    ('childsmile_app_voucherdistribution'),  -- חלוקת תלושים (Vouchers; recipients share this resource)
    ('childsmile_app_activityround'),        -- ימי כיף / ביקורי בית — מחזורי בקשות (Activity rounds)
    ('childsmile_app_activityrequest')       -- ימי כיף / ביקורי בית — בקשות (Activity requests / board)
) AS res(resource)
CROSS JOIN (VALUES ('VIEW'), ('CREATE'), ('UPDATE'), ('DELETE')) AS a(action)
WHERE r.role_name = 'Viewer'
  AND NOT EXISTS (
      SELECT 1
      FROM childsmile_app_permissions p
      WHERE p.role_id = r.id
        AND p.resource = res.resource
        AND p.action = a.action
  );

-- Verify what the Viewer now has for these resources
SELECT r.role_name, p.resource, p.action
FROM childsmile_app_permissions p
JOIN childsmile_app_role r ON r.id = p.role_id
WHERE r.role_name = 'Viewer'
  AND p.resource IN (
      'childsmile_app_pettycashexpense',
      'childsmile_app_ongoingexpense',
      'childsmile_app_financialaid',
      'childsmile_app_voucherdistribution',
      'childsmile_app_activityround',
      'childsmile_app_activityrequest'
  )
ORDER BY p.resource, p.action;
