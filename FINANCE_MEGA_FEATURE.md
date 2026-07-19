# כספים — Finance Mega-Feature (Master Plan)

Master roadmap for unifying all money-related spreadsheets into the system, one
module at a time. Visual reference: attached concept file
`finance-section-concept.html` (kept for design reference only — describes an
eventual unified tabbed "כספים" shell with Overview + one tab per module).

**Status legend:** ✅ Done &nbsp;|&nbsp; 🚧 In progress &nbsp;|&nbsp; ⏳ Planned (not started)

## Ground rules (apply to every module below)

- **No Django migrations — raw SQL only.** Each module gets a repo-root
  `add_<module>_table.sql` with `CREATE TABLE IF NOT EXISTS`, indexes, and
  idempotent permission grants (`NOT EXISTS` guards, safe to re-run). The
  Django model still gets an explicit `class Meta: db_table = "..."` for the
  ORM to use, but there is intentionally **no migration file** for it — same
  convention already used for `ExpenseRefund` / `add_expense_refunds_table.sql`.
- **Fullstack per module:** Django model (`models.py`) + `<module>_views.py` +
  `urls_<module>.py` (included from `urls.py` under its own `/api/...` prefix)
  + React page (`pages/X.js`) + its own CSS (`styles/x.css`) + Sidebar entry +
  permission-grant SQL + audit-log action translations.
- **Desktop only.** New finance modules are NOT added to the mobile
  bottom-nav array in `Sidebar.js` and get no `mobile.css` rules — same
  convention as Audit Log / Reports (hidden entry points, no hard redirect
  guard on the page itself). **החזרי הוצאות (Refunds) already existed before
  this effort, already works on mobile, and is explicitly OUT OF SCOPE** —
  left untouched except for one additive integration hook (see Petty Cash
  section below, which the user explicitly requested).
- **Admin-only for now.** Every new module's permission-grant SQL lists ONLY
  `System Administrator` by name (exact same technique as
  `add_expense_refunds_table.sql` step 6, which does the same for Refunds'
  admin-only UPDATE/DELETE). `Viewer` gets the same access the same way it
  already does for Refunds: by re-running `add_viewer_role.sql` afterward,
  which copies the full union of `(resource, action)` pairs onto `Viewer`
  (`utils.is_admin()` already treats Viewer as admin for visibility once it
  has the grant; a Viewer's writes are silently no-op'd via
  `utils.block_viewer_writes` regardless). No coordinator/tutor/volunteer
  access until product decides otherwise.
- **Same design system as Refunds:** violet/indigo gradient theme, table +
  modal CRUD, `InnerPageHeader`, windowed pagination (max 3 buttons — see
  repo memory "Pagination convention"), audit logging via `log_api_action`
  with matching entries appended to `add_audit_translations.sql`, permission
  gate via `hasViewPermissionForTable('<resource>')` (checks
  `childsmile_app_<resource>` + `VIEW` in `localStorage.permissions`).
- **⚠️ BUMP `childsmile/childsmile_app/version.txt` for EVERY backend change**
  (new/changed model, view, urls file — anything under `childsmile/**`
  excluding the frontend). This file is NOT cosmetic: the Azure deploy
  workflow's startup command (`.github/workflows/azure-deploy.yml`) does
  `cmp -s <new>/version.txt <deployed>/version.txt` and **skips syncing the
  new code entirely if the two match** ("Deploy Versions match — Skipping").
  Forgetting to bump it means a backend change can be pushed/merged and the
  live server keeps running the OLD code with no error or warning. Convention
  observed in git history: `YY.MM.<feature-index>.<patch-index>` — bump the
  3rd number (reset 4th to 0) for a new logical feature/pass, bump the 4th
  for a small follow-up fix within the same feature (e.g. `26.07.2.1` →
  `26.07.3.0` for the Petty Cash + Ongoing Expenses pass).
- Each module ships as its **own standalone sidebar page** for now (like
  Refunds today) — the unified tabbed "כספים" shell from the concept file is
  a later nice-to-have, not being built yet (explicit user decision).

## Modules

| # | Module | Status | Route | Notes |
|---|--------|--------|-------|-------|
| 1 | סקירה כללית (Overview) | ⏳ Planned | — | Depends on all modules existing; read-only aggregation view. |
| 2 | החזרי הוצאות (Refunds) | ✅ Done (pre-existing) | `/refunds` | Untouched, EXCEPT one additive hook: marking a refund "שולם" now auto-syncs a linked Petty Cash row (see below). |
| 3 | **הוצאות שוטפות (Ongoing Expenses)** | ✅ **Done (this pass)** | `/ongoing-expenses` | See full spec below. |
| 4 | **קופה קטנה (Petty Cash)** | ✅ Done | `/petty-cash` | See full spec below. |
| 5 | סיוע כספי (Financial Aid) | ⏳ Planned | — | Concept columns: שם משפחה, תאריך סיוע, סכום, אופן ביצוע. |
| 6 | חלוקת תלושים (Vouchers) | ⏳ Planned | — | Most complex: sub-tabs (summary/recipients/forms), public questionnaire, family linking by ת"ז. |

---

## הוצאות שוטפות (Ongoing Expenses) — built this pass ✅

Same shape as Petty Cash — built right after it, using the corrected
conventions (see the checklist saved to repo memory after the Petty Cash
self-audit). Source spreadsheet: "הוצאות נעם 2026".

### Decisions locked in for v1

- Standalone sidebar page (same as Petty Cash), admin-only, desktop-only, no
  attachments, no task/WhatsApp notifications — all carried over unchanged
  from the Petty Cash ground rules (not re-confirmed per-module; see
  `FINANCE_MEGA_FEATURE.md` ground rules at the top).
- `category` (קטגוריה) is **free text**, not a fixed dropdown — but the
  frontend suggests previously-used values via a native HTML `<datalist>`
  (distinct, non-empty `category` values already in the fetched list, sorted
  he-locale). Explicit user decision: "free text but with autocompletion"
  rather than a fixed choice list + colored badge as the concept mockup showed.
  The category IS still rendered as a small badge in the table for readability
  (cosmetic only — no fixed color-per-category mapping, unlike
  Refunds'/Petty Cash's real status/badge enums which map specific values to
  specific colors).
- No `paid_by` field (unlike Petty Cash) — the concept mockup doesn't show one
  for this module, and the source spreadsheet implies a single payer already.
- "חודש" (month) is NOT stored — derived from `expense_date` on the frontend
  when needed, same decision as Petty Cash.

### Data model — `OngoingExpense` (`childsmile/childsmile_app/models.py`)

- Table `childsmile_app_ongoingexpense`, PK `ongoing_expense_id`.
- `expense_date` DATE · `expense_name` VARCHAR(255) · `category` VARCHAR(255)
  NULL (free text) · `amount` NUMERIC(10,2) · `invoice_number` VARCHAR(100)
  NULL · `notes` TEXT NULL.
- `created_at`/`updated_at` auto; `updated_by` username string (NOT a
  `created_by` field — same lesson learned from the Petty Cash self-audit:
  `ExpenseRefund`/`PettyCashExpense` only have `updated_by`).
- No FK to any other finance table (no cross-module automation for this one).

### Backend files

- `childsmile/childsmile_app/models.py` — `OngoingExpense` model.
- `childsmile/childsmile_app/ongoing_expense_views.py` (NEW) —
  `get_ongoing_expenses`, `create_ongoing_expense`, `update_ongoing_expense`,
  `delete_ongoing_expense`. Admin-only via the plain `_get_authenticated_user`
  + inline `is_admin(staff)` check repeated per view (NOT a combined helper
  — matches `refund_views.py`'s/`petty_cash_views.py`'s exact shape).
- `childsmile/childsmile_app/urls_ongoing_expense.py` (NEW) — routes.
- `childsmile/childsmile_app/urls.py` — added
  `path("api/ongoing-expenses/", include("childsmile_app.urls_ongoing_expense"))`.

### Raw SQL

- `add_ongoing_expenses_table.sql` (NEW, repo root) — `CREATE TABLE
  childsmile_app_ongoingexpense` + index + idempotent permission grant
  (VIEW/CREATE/UPDATE/DELETE → `System Administrator` ONLY, by name). **Run
  this on the DB cluster, then re-run `add_viewer_role.sql`** so `Viewer`
  picks up the same access — identical mechanism to Petty Cash.
- `add_audit_translations.sql` — appended Hebrew labels for
  `VIEW_ONGOING_EXPENSES(_FAILED)`, `CREATE_ONGOING_EXPENSE(_FAILED)`,
  `UPDATE_ONGOING_EXPENSE(_FAILED)`, `DELETE_ONGOING_EXPENSE(_FAILED)`.

### Frontend files

- `childsmile/frontend/src/pages/OngoingExpenses.js` (NEW) — list + search +
  totals bar (סה"כ / עסקאות / הגבוהה ביותר) + create/edit/delete modals +
  windowed pagination + category `<datalist>` autocomplete. Same
  `hasAllPermissions(requiredPermissions)` full-page gate as `PettyCash.js`.
- `childsmile/frontend/src/styles/ongoingexpenses.css` (NEW) — same
  violet-gradient theme, scoped under `.ongoing-expense-*`.
- `childsmile/frontend/src/App.js` — import + `<Route path="/ongoing-expenses">`.
- `childsmile/frontend/src/components/Sidebar.js` —
  `hasPermissionToOngoingExpenses` flag (⛽ icon — same one the concept file
  itself uses for this tab — "הוצאות שוטפות" label), Management section,
  desktop-only (omitted from the mobile `allNavItems` array).

### Explicitly NOT built (v1)

- Fixed category list/enum + color-per-category mapping, month filter,
  receipts/attachments, report export.

---

## קופה קטנה (Petty Cash) — built this pass ✅

### Decisions locked in for v1 (confirmed with the user before building)

- Standalone sidebar page, not the unified tabbed shell.
- `paid_by` is **free text** — no dropdown, no reimbursement/"owed money"
  tracking, no "להחזיר" KPI (unlike what the concept mockup implied).
- **No receipt/attachment upload** (unlike Refunds' Azure Blob flow).
- **No task-board entry, no WhatsApp notification** on create/edit/delete —
  this is a silent admin ledger, not a request/approval workflow.
- Admin-only (System Administrator by grant; Viewer via re-running `add_viewer_role.sql`).

### Data model — `PettyCashExpense` (`childsmile/childsmile_app/models.py`)

- Table `childsmile_app_pettycashexpense`, PK `petty_cash_id`.
- `expense_date` DATE · `expense_name` VARCHAR(255) · `amount` NUMERIC(10,2).
- `paid_by` VARCHAR(255) NULL (free text) · `notes` TEXT NULL.
- `created_at`/`updated_at` auto; `updated_by` is a **username string, not an
  FK** — same convention as `ExpenseRefund.updated_by` (that model has no
  `created_by` either, so PettyCashExpense doesn't invent one — the codebase's
  only other "who created this" pattern, `created_by` as `FK(Staff)` on
  `StaffMeeting`/`NotificationMessage`, is a different shape and wasn't a fit
  here).
- `source_refund` → FK to `ExpenseRefund`, nullable, `ON DELETE CASCADE` —
  powers the automation below.

### Automation: Refunds → Petty Cash (avoids double data entry)

Per explicit request: when an expense refund is marked paid, it must not have
to be re-typed into the Petty Cash ledger by hand.

`refund_views.py::_sync_petty_cash_for_refund(refund, actor_username)` —
idempotent, called from both `create_refund` (defensive — the frontend never
actually creates a refund pre-paid) and `update_refund` (the real path, right
after `refund.save()`):

- `refund.status == 'שולם'` → create-or-update the ONE linked
  `PettyCashExpense` row (looked up by `source_refund=refund`):
  `expense_date` = today, `expense_name` = `"החזר הוצאות - <staff_full_name>"`,
  `amount` = `approved_amount or requested_amount`, `paid_by` =
  `"קופה קטנה"`, `notes` references the refund id.
- any other status → **delete** the linked row (payment corrected/undone),
  so Petty Cash never shows a stale "paid" entry for a refund that no longer is.
- Hard-deleting a refund cascades automatically (`on_delete=CASCADE`, both in
  Django and in the raw SQL FK) and removes the linked Petty Cash row too.
- Auto-linked rows stay fully editable/deletable in the Petty Cash UI — they
  are simply tagged with a "מהחזר #<id>" badge for traceability
  (`source_refund_id` in the API payload drives the badge).
- The sync never raises — a failure is logged and swallowed so it can never
  block the refund request/update itself (same "non-fatal" pattern as the
  Refunds→Tasks auto-creation).

**Open flag (explicit, revisit if wrong):** the sync fires for **any**
`refund_method` (Bit/Paybox/bank transfer/credit/cash), not just physical
cash. If bank-transferred refunds shouldn't count as "petty cash" outflow,
add a `refund_method`/`refund.refund_method not in (...)` filter in
`_sync_petty_cash_for_refund`.

### Backend files

- `childsmile/childsmile_app/models.py` — `PettyCashExpense` model (added
  right after `ExpenseRefund`).
- `childsmile/childsmile_app/petty_cash_views.py` (NEW) — `get_petty_cash`,
  `create_petty_cash`, `update_petty_cash`, `delete_petty_cash`. Every
  endpoint (including the list GET) requires `is_admin(staff)` — unlike
  Refunds there is no volunteer-visible branch at all. Mirrors
  `refund_views.py`'s exact `_get_authenticated_user` + inline
  `is_admin(staff)` check shape (no combined "auth+admin" helper was
  invented — refund_views.py always splits the two checks).
- `childsmile/childsmile_app/urls_petty_cash.py` (NEW) — route definitions.
- `childsmile/childsmile_app/urls.py` — added
  `path("api/petty-cash/", include("childsmile_app.urls_petty_cash"))`.
- `childsmile/childsmile_app/refund_views.py` — added `PettyCashExpense`
  import + `_sync_petty_cash_for_refund()` helper + 2 call sites
  (`create_refund`, `update_refund`).

### Raw SQL

- `add_petty_cash_table.sql` (NEW, repo root) — `CREATE TABLE
  childsmile_app_pettycashexpense` + indexes + idempotent permission grant
  (VIEW/CREATE/UPDATE/DELETE → `System Administrator` ONLY, by name — same
  technique as `add_expense_refunds_table.sql` step 6) + verify query. **Run
  this on the DB cluster**, then **re-run `add_viewer_role.sql`** so `Viewer`
  picks up the same access (no Django migration exists or is needed for it).
- `add_audit_translations.sql` — appended Hebrew labels for
  `VIEW_PETTY_CASH(_FAILED)`, `CREATE_PETTY_CASH(_FAILED)`,
  `UPDATE_PETTY_CASH(_FAILED)`, `DELETE_PETTY_CASH(_FAILED)`.

### Frontend files

- `childsmile/frontend/src/pages/PettyCash.js` (NEW) — list + search +
  totals bar (סה"כ / עסקאות) + create/edit/delete modals + windowed
  pagination. Full-page "no-permission" fallback gated by `hasAllPermissions`
  over a module-level `requiredPermissions` array (VIEW/CREATE/UPDATE/DELETE
  on `childsmile_app_pettycashexpense`) — the SAME pattern used verbatim by
  `SystemManagement.js`/`AuditLog.js` for their own admin-only page gates.
- `childsmile/frontend/src/styles/pettycash.css` (NEW) — same
  violet-gradient theme as `refunds.css`, scoped under `.pettycash-*`.
  Reuses GLOBAL classes actually defined in `tutorships.css`
  (`.tutorship-search-bar`, `.filter-chip*`, `.pagination`) with no explicit
  import — works because `App.js` eagerly imports every page (incl.
  Tutorships) at startup, so ALL page CSS ends up loaded globally the same
  way `Refunds.js` already relies on.
- `childsmile/frontend/src/App.js` — import + `<Route path="/petty-cash">`.
- `childsmile/frontend/src/components/Sidebar.js` — `hasPermissionToPettyCash`
  flag (💵 icon, "קופה קטנה" label) added to the Management section
  (expanded + collapsed **desktop** JSX only — intentionally NOT added to
  the mobile `allNavItems` array, so it never appears in the mobile bottom
  nav, matching the Audit Log / Reports desktop-only convention).

### Explicitly NOT built (v1) — revisit later if needed

- Receipts/attachments, reimbursement/"owed money" tracking + KPI, unified
  tabbed Finance shell, Overview aggregation tab, month filter, report
  export (PDF/Excel).

---

## Remaining modules — not started (rough spec from the concept file only, refine before building)

### סיוע כספי (Financial Aid) — ⏳ Planned
- Source: "רשימת נתמכים סיוע כספי" spreadsheet. Columns: שם משפחה, תאריך
  סיוע, סכום, אופן ביצוע (בנקאית/מזומן badge).
- Open question to confirm before building: should this link to an existing
  family record (like Refunds links to `Staff`), or stay free-text like
  Petty Cash? The concept mockup only shows free-text family names.

### חלוקת תלושים (Vouchers) — ⏳ Planned, most complex
- Three sub-views per the concept: סיכום חלוקות (distribution summary),
  רשימת מקבלים (recipient list, built from a questionnaire + team
  processing fields: סכום/מוכן/מתנדב/נמסר), השאלונים (two questionnaire
  variants: עמותה family vs. כללי/external family).
- Needs family-record auto-matching by ת"ז (child + parent), with manual
  linking fallback ("לא רשומה" when no match). This is a significant scope
  on its own — needs its own planning pass before implementation starts.

### סקירה כללית (Overview) — ⏳ Planned
- Aggregates KPIs across all modules (total spend, per-module breakdown,
  monthly trend bars). Build LAST, once the other modules exist — the
  concept file's dev note suggests "one DB table per module + a unified
  view for the overview", which still holds.

---

## File manifest (Petty Cash + Ongoing Expenses passes)

**Created:**
- `add_petty_cash_table.sql`
- `add_ongoing_expenses_table.sql`
- `childsmile/childsmile_app/petty_cash_views.py`
- `childsmile/childsmile_app/urls_petty_cash.py`
- `childsmile/childsmile_app/ongoing_expense_views.py`
- `childsmile/childsmile_app/urls_ongoing_expense.py`
- `childsmile/frontend/src/pages/PettyCash.js`
- `childsmile/frontend/src/styles/pettycash.css`
- `childsmile/frontend/src/pages/OngoingExpenses.js`
- `childsmile/frontend/src/styles/ongoingexpenses.css`
- `FINANCE_MEGA_FEATURE.md` (this file)

**Modified:**
- `childsmile/childsmile_app/models.py` (added `PettyCashExpense`, `OngoingExpense`)
- `childsmile/childsmile_app/refund_views.py` (Petty Cash sync automation)
- `childsmile/childsmile_app/urls.py` (registered `urls_petty_cash`, `urls_ongoing_expense`)
- `childsmile/childsmile_app/version.txt` (bumped for these backend changes — see
  Ground Rules; MUST bump again for every future backend change in this doc)
- `add_audit_translations.sql` (Petty Cash + Ongoing Expenses action codes)
- `childsmile/frontend/src/App.js` (routes)
- `childsmile/frontend/src/components/Sidebar.js` (nav entries, desktop-only)

## Deploy checklist

1. Run `add_petty_cash_table.sql` and `add_ongoing_expenses_table.sql` on the
   DB cluster (tables + indexes + `System Administrator` permissions).
2. Re-run `add_viewer_role.sql` so the `Viewer` role picks up the new
   `childsmile_app_pettycashexpense` / `childsmile_app_ongoingexpense`
   permissions too (same step needed any time a new admin-only resource is
   added — this is how Refunds' admin-only actions reached Viewer as well).
3. Run `add_audit_translations.sql` (idempotent — safe to run the whole
   file, or just the new Petty Cash / Ongoing Expenses blocks).
4. Restart Django (new views/urls/models).
5. Rebuild/redeploy the frontend.
6. Spot-check: log in as System Administrator → sidebar Management section
   shows "קופה קטנה" (💵) and "הוצאות שוטפות" (⛽) → open each, add an entry.
   Then mark an existing refund as "שולם" in `/refunds` → confirm a linked
   row now appears in `/petty-cash` tagged "מהחזר #<id>".
7. **Before merging/pushing: confirm `childsmile/childsmile_app/version.txt`
   was bumped** (see Ground Rules) — otherwise the Azure deploy workflow will
   see no version change and SKIP deploying this backend change entirely.

