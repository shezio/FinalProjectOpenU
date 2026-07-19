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
- **Every finance page must offer "ייצוא לאקסל" (Export to Excel).** Add a
  bespoke `export<Module>ToExcel(rows, t)` function to
  `frontend/src/components/export_utils.js` (client-side only, via the
  already-installed `xlsx` package — no backend endpoint needed) and a plain
  button in the page's own `-controls` bar calling it with the
  already-filtered/visible array (e.g. `filteredEntries`). Match the shape of
  `exportPettyCashToExcel` / `exportOngoingExpensesToExcel` /
  `exportFinanceOverviewToExcel` (added with Petty Cash / Ongoing Expenses /
  Overview): headers array + `XLSX.utils.aoa_to_sheet`, `!dir: 'rtl'`,
  auto-fit column widths, `toast.success(t('Exported to Excel successfully'))`
  on success, and the existing `auditExportSuccess`/`auditExportFailure`
  helpers already in that file (logs `EXPORT_REPORT_EXCEL_SUCCESS/FAILED` —
  translations already exist, no new SQL needed). **Do NOT** copy the
  `.selected`-checkbox-required pattern from the older `report_pages/*`
  exports (e.g. `exportToExcel` for tutors, `exportFeedbackToExcel`) — these
  finance pages are plain CRUD lists with no row-selection UI, so export
  whatever's currently filtered/shown, same no-selection shape as the
  pre-existing `exportRefundsReportToExcel`.
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
- **Dedicated "כספים" sidebar section** (`Sidebar.js`, `sectionKey="finance"`,
  💰 icon): Refunds + Petty Cash + Ongoing Expenses were pulled OUT of the
  generic "ניהול" (Management) section into their own section, mirroring the
  Families/Volunteers section pattern exactly (`hasFinanceSection = hasPermissionToRefunds
  || hasPermissionToPettyCash || hasPermissionToOngoingExpenses`). Future
  finance modules (Financial Aid, Vouchers) should be added HERE too, not to
  Management. Each item keeps its OWN pre-existing permission gate unchanged
  — so non-admins see exactly what they saw before (e.g. just "החזרי הוצאות"
  if that's the only one they have), just filed under a new section header;
  no permissions were added/removed for anyone.

## Modules

| # | Module | Status | Route | Notes |
|---|--------|--------|-------|-------|
| 1 | **סקירה כללית (Overview)** | ✅ **Done (this pass)** | `/finance-overview` | See full spec below. |
| 2 | חזרי הוצאות (Refunds) | ✅ Done (pre-existing) | `/refunds` | Untouched, EXCEPT one additive hook: marking a refund "שולם" now auto-syncs a linked Petty Cash row (see below). |
| 3 | **הוצאות שוטפות (Ongoing Expenses)** | ✅ **Done** | `/ongoing-expenses` | See full spec below. |
| 4 | **קופה קטנה (Petty Cash)** | ✅ Done | `/petty-cash` | See full spec below. |
| 5 | **סיוע כספי (Financial Aid)** | ✅ **Done** | `/financial-aid` | See full spec below. |
| 6 | **חלוקת תלושים (Vouchers)** | ✅ **Done** | `/vouchers` + public `/voucher-questionnaire/:distributionId` | See full spec below. |

---

## סקירה כללית (Overview) — built this pass ✅

100% frontend — no backend/DB changes, no new permission resource. Aggregates
the existing GET endpoints (`/api/refunds/`, `/api/petty-cash/`,
`/api/ongoing-expenses/`, `/api/financial-aid/`, `/api/vouchers/distributions/`
— the last two added when their respective modules were built, see their own
sections below) client-side.

### Key design decision: avoiding double-counting the Refunds→Petty Cash sync

A paid refund ('שולם') auto-creates a linked Petty Cash row (see the Petty Cash
section below). If the grand total just summed "all Refunds paid" +
"all Petty Cash rows", that money would be counted TWICE. Fix: the combined
total (KPI + monthly trend) only sums:
- Refunds with `status === 'שולם'` (their approved/requested amount)
- Petty Cash rows where `source_refund_id` is falsy (manually entered only)
- All Ongoing Expenses (no cross-module overlap there)

Each module's OWN breakdown card still shows its OWN full ledger total (e.g.
the Petty Cash card includes the auto-synced rows too, since that's an
accurate total for that ledger) — only the CROSS-module grand total and
monthly trend need the de-duplication.

### Permission

Admin-only (aggregates two admin-only modules). Page gate: `hasAllPermissions`
over a module-level `requiredPermissions` array requiring VIEW on BOTH
`childsmile_app_pettycashexpense` and `childsmile_app_ongoingexpense` — same
`hasAllPermissions`-style full-page gate as `SystemManagement.js`/`AuditLog.js`/
`PettyCash.js`/`OngoingExpenses.js`. Sidebar flag `hasPermissionToFinanceOverview`
follows Sidebar.js's own simpler per-file convention (`hasViewPermissionForTable`
checks on both resources, ANDed) rather than importing `hasAllPermissions` there.

### Content

- **KPI chips:** total combined spend, total transaction count, refunds
  pending count ("ready-to-act" indicator, amber when > 0 — same modifier
  convention as Refunds' `--pending` chip), "X מתוך 5" active-module count.
- **Module breakdown cards** (`.finance-overview-modcards` grid, NEW pattern
  — no prior card-grid precedent existed for a dashboard-style page, but
  colors/radius/shadows reuse the established violet-gradient theme):
  Refunds / Petty Cash / Ongoing Expenses / Financial Aid show real totals and
  are clickable (`navigate()` to that module) in a 2x2 grid; Vouchers (5th
  module, doesn't fit the 2x2 grid) gets its own real, clickable, full-width
  strip below (`.finance-overview-modcard--wide`) showing its distributed
  total + distribution/recipient counts, same click-to-navigate pattern.
- **Monthly trend bar chart:** reuses the codebase's EXISTING chart library
  (`chart.js` + `react-chartjs-2`, already used by `DashboardCharts.js` and
  several report pages) rather than hand-rolling CSS bars — same
  `ChartJS.register(...)` per-file pattern, same large-font `chartOptions`
  convention (16–18px vs. Dashboard's 20–24px, scaled down for a smaller panel).
  Shows the last 6 calendar months (fixed window, zero-filled) using the
  same de-duplicated dataset as the grand-total KPI.

### Files

- `childsmile/frontend/src/pages/FinanceOverview.js` (NEW)
- `childsmile/frontend/src/styles/financeoverview.css` (NEW)
- `childsmile/frontend/src/App.js` — import + `<Route path="/finance-overview">`
- `childsmile/frontend/src/components/Sidebar.js` — `hasPermissionToFinanceOverview`
  flag, placed FIRST in the "כספים" section (📊 icon, matches the concept file's
  own Overview-tab icon), desktop-only (omitted from mobile `allNavItems`).

### Explicitly NOT built

- Any backend aggregation endpoint (pure frontend computation over existing APIs).
- Report export (PDF/Excel) of the overview.

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
  itself uses for this tab — "הוצאות שוטפות" label), dedicated "כספים" (Finance)
  section, desktop-only (omitted from the mobile `allNavItems` array).

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
  flag (💵 icon, "קופה קטנה" label) added to the dedicated "כספים" (Finance)
  section (expanded + collapsed **desktop** JSX only — intentionally NOT added to
  the mobile `allNavItems` array, so it never appears in the mobile bottom
  nav, matching the Audit Log / Reports desktop-only convention).

### Explicitly NOT built (v1) — revisit later if needed

- Receipts/attachments, reimbursement/"owed money" tracking + KPI, unified
  tabbed Finance shell, month filter, report export (PDF/Excel).

---

## סיוע כספי (Financial Aid) — built this pass ✅

### Decisions locked in for v1 (confirmed with the user before building)

- **Permission tier: `System Administrator` only** — same convention as Petty
  Cash/Ongoing Expenses. The concept spec recommends a senior "הנהלה"
  (management/board) tier, but no such role exists in this system yet
  (`System Administrator` is the most senior tier). Not inventing a new role
  for this — revisit only if explicitly requested later.
- **Family linkage is OPTIONAL, via ONE combo-picker field, not two.** The
  concept spec lists `שם משפחה` (free text, required) and a separate
  `משפחה (תיק אישי)` link field (optional) — implemented as a SINGLE
  react-select field that either searches existing registered families or
  falls back to free-typing a name (exact same UX as Feedbacks.js's
  volunteer/tutor picker: search → pick, or type a name → "השתמש בשם זה?"
  confirm). Most recipients are NOT registered families (no login/user
  accounts at all) — the table works identically either way; `family_name`
  is always populated, `linked_child` is set only when a real family was
  picked from the dropdown.
- **"Syncs to the family's תיק אישי" = a read-only history section** added
  to the EXISTING family details modal in `Families.js` (NOT a new page, NOT
  writing into any `Children` field) — lazy-fetched by `child_id` when the
  modal opens, gated behind `childsmile_app_financialaid` VIEW permission.
- **Multiple file attachments** (מכתב בקשה ומסמכים) — unlike Refunds' single
  `file_url`, this needed a separate `FinancialAidAttachment` junction table
  (one FinancialAid record → many attachments), reusing the exact same Azure
  Blob SAS upload flow as Refunds (see below), looped once per file.
- **Lightweight family search endpoint** (`get_family_options`) was added
  instead of reusing `family_views.get_complete_family_details` — that
  endpoint returns 25+ fields per family for the full Families page, overkill
  for a simple search dropdown.

### Data model (`childsmile/childsmile_app/models.py`)

- `FinancialAid` — `financial_aid_id` PK, `family_name` (CharField, always
  required), `aid_date`, `amount`, `method` (TextChoices: העברה בנקאית /
  מזומן / אחר), `notes`, `linked_child` (ForeignKey → `Children`,
  `on_delete=SET_NULL`, nullable — SET_NULL not CASCADE so deleting a family
  record later doesn't wipe aid history), `created_at`/`updated_at` auto,
  `updated_by` CharField (same "who did this" convention as
  PettyCashExpense/OngoingExpense — no `created_by` field, per the
  established rule that this codebase only has 2 such patterns).
- `FinancialAidAttachment` — `attachment_id` PK, `financial_aid` FK
  (CASCADE), `file_url`, `file_name`, `uploaded_at`.

### Backend files

- `childsmile/childsmile_app/financial_aid_views.py` (NEW) — full CRUD
  (`get_financial_aid`, `create_financial_aid`, `update_financial_aid`,
  `delete_financial_aid`) + `delete_financial_aid_attachment` (remove one
  file without deleting the record) + Azure Blob upload trio
  (`get_financial_aid_upload_url` / `local_upload_financial_aid_file` /
  `serve_local_financial_aid_file`, mirroring `refund_views.py`'s exact SAS
  flow, own `AZURE_FINANCIAL_AID_CONTAINER` env var) + `get_family_options`
  (lightweight picker search) + `get_financial_aid_by_child` (feeds the
  Families.js history section). Every endpoint requires `is_admin(staff)` —
  including the upload-url endpoint, UNLIKE Refunds' equivalent (open to any
  authenticated user there because any volunteer can submit a refund
  request; here the whole module is admin-only).
- `childsmile/childsmile_app/urls_financial_aid.py` (NEW) — route
  definitions.
- `childsmile/childsmile_app/urls.py` — added
  `path("api/financial-aid/", include("childsmile_app.urls_financial_aid"))`.

### Raw SQL

- `add_financial_aid_table.sql` (NEW, repo root) — `CREATE TABLE
  childsmile_app_financialaid` + `childsmile_app_financialaidattachment` +
  indexes + idempotent permission grant (VIEW/CREATE/UPDATE/DELETE →
  `System Administrator` ONLY, by name) + verify query. Attachments are
  governed by the SAME `childsmile_app_financialaid` permission (no separate
  grant row — they're only ever reached through the parent record's own
  admin-only views). **Run this on the DB cluster**, then **re-run
  `add_viewer_role.sql`** so `Viewer` picks up the same access.
- `add_audit_translations.sql` — appended Hebrew labels for
  `VIEW_FINANCIAL_AID(_FAILED)`, `CREATE_FINANCIAL_AID(_FAILED)`,
  `UPDATE_FINANCIAL_AID(_FAILED)`, `DELETE_FINANCIAL_AID(_FAILED)`,
  `DELETE_FINANCIAL_AID_ATTACHMENT(_FAILED)`.

### Frontend files

- `childsmile/frontend/src/pages/FinancialAid.js` (NEW) — list + search +
  method filter + totals bar (סה"כ סיוע / מספר משפחות) + create/edit/delete
  modals + windowed pagination + family combo-picker + multi-file upload UI.
  Full-page "no-permission" fallback via `hasAllPermissions` over a
  module-level `requiredPermissions` array, same as PettyCash.js/AuditLog.js.
- `childsmile/frontend/src/styles/financialaid.css` (NEW) — same
  violet-gradient theme, `.financial-aid-*` classes. Reuses global classes
  from `tutorships.css`/`feedbacks.css` the same way other finance pages do.
- `childsmile/frontend/src/App.js` — import + `<Route path="/financial-aid">`.
- `childsmile/frontend/src/components/Sidebar.js` —
  `hasPermissionToFinancialAid` flag (🤝 icon, "סיוע כספי" label) added to
  the "כספים" section (desktop only, same as the other finance items).
- `childsmile/frontend/src/pages/Families.js` — added a read-only "Financial
  Aid history" section to the existing family details modal (see decisions
  above), gated by `hasViewPermissionForTable('financialaid')`.
- `childsmile/frontend/src/pages/FinanceOverview.js` — wired the real
  Financial Aid total/count into the KPI grid, monthly trend chart, combined
  Excel export, and its own modcard (replacing the "בקרוב" placeholder);
  `ACTIVE_MODULES` bumped 3 → 4.
- `childsmile/frontend/src/components/export_utils.js` —
  `exportFinancialAidToExcel` (same no-selection shape as the other finance
  exports).

### Explicitly NOT built (v1) — revisit later if needed

- Period/date-range filter beyond the method dropdown (matches the simpler
  precedent already set by Petty Cash/Ongoing Expenses, which also only have
  text search, not a full period filter despite the concept spec asking for
  one on every module).
- Automatic family-record matching (e.g. by ID number) — linking is always a
  manual pick from the combo-picker, never auto-detected.

---

---

## חלוקת תלושים (Vouchers) — built this pass ✅

### Decisions locked in for v1 (confirmed with the user before/during building)

- **Questionnaire = a BUILT-IN system form, not a Google Forms sync.** Public,
  unauthenticated submission page (`/voucher-questionnaire/:distributionId`) —
  same "action of a non-user" precedent as volunteer/tutor registration
  (`views_volunteer.py`'s public endpoints), NOT an integration with Google
  Forms. One single page component conditionally renders either questionnaire
  variant based on the distribution's `questionnaire_type`, rather than two
  separate page components.
- **Permission tier: `System Administrator` only**, all actions (view+write) —
  same convention as every other finance module.
- **Family linking = AUTO-MATCHED when possible, MANUAL fallback otherwise.**
  `Children.child_id` IS the real government ת"ז (imported directly from the
  "תעודת זהות ילד/ה" column during bulk import — see `family_views.py` /
  `sqlizeforphones.py` — NOT a meaningless internal PK, confirmed by the fact
  it's `BigIntegerField(primary_key=True)`, not `AutoField` like every other
  model's PK in this codebase). So the עמותה questionnaire's `child_id_number`
  is looked up directly against `Children`/`ChildrenLookup` and auto-links on
  a match (`voucher_views.py::_apply_recipient_fields`) — an admin's explicit
  manual pick (financial_aid-style combo-picker) always wins over an
  auto-match, and a link is never auto-cleared. Manual linking is the only
  option for כללי submissions (no ID field collected at all) or a missed/
  typo'd match.
- **Real Israeli ת"ז checksum** (standard Luhn-style algorithm — alternate
  ×1/×2 per digit after left-padding to 9 digits, subtract 9 from any
  product >9, valid iff the sum is divisible by 10) validates `parent_id_number`
  and `child_id_number` — both server-side (`voucher_views.py::_is_valid_israeli_id`)
  and mirrored in JS on both the public form and the admin recipient form.
  Replaces an earlier, weaker "just check it's 5-9 digits" version.
- **Driver tracking (מעקב נהגים) — CANCELLED, not built.** The concept/source
  spreadsheet has a dedicated "מעקב נהגים" tab, and this was initially planned
  as its own separate feature/view — the NPO confirmed it isn't needed at all.
  `assigned_volunteer` still exists as a plain field on `VoucherRecipient`
  (free text, same shape as `PettyCashExpense.paid_by`) — there's just no
  dedicated page/view built around it.
- **`is_completed`** ("דרכנו / לא דרכנו") is a real `BooleanField`, not a
  free-text notes column — matches the concept spec's own explicit
  improvement recommendation, same pattern as every other finance module's
  boolean-over-notes decisions.
- **CAPTCHA explicitly NOT added** to the public questionnaire — no such
  service/dependency exists anywhere in this codebase already; not
  introducing a brand-new external dependency for this alone. Hardening
  instead relies on rate limiting, honeypot, and full server-side validation
  (see Security section below).

### Data model (`childsmile/childsmile_app/models.py`)

- `VoucherDistribution` — `distribution_id` PK, `name`, `voucher_type`
  (TextChoices: רמי לוי / תו פלוס - קרפור / אחר), `initial_amount`,
  `start_date`/`end_date` (nullable), `is_completed` (bool), `questionnaire_type`
  (TextChoices: עמותה / כללי / ללא, default ללא), `notes`, timestamps,
  `updated_by`. `distributed_amount`/`remaining_amount` are NEVER stored —
  computed from the sum of that distribution's recipients' `approved_amount`
  (same don't-store-what-you-can-compute approach as every other finance
  module's totals).
- `VoucherRecipient` — `recipient_id` PK, `distribution` FK (CASCADE).
  Questionnaire fields (submitted by the family, or typed in by staff for
  `questionnaire_type='ללא'` internal-only lists): `full_name`,
  `parent_id_number`, `phone`, `child_name` (עמותה only), `child_treatment_status`
  (עמותה only — CharField with `choices=` MATCHING `Children.status` exactly,
  NOT invented values), `child_id_number` (עמותה only), `num_children_at_home`,
  `city`, `street_address` (both separate fields — spec improvement over the
  source spreadsheet's single combined address column), `case_description`,
  `referral_source` (כללי only), `submitted_at` (nullable — null for
  manually-added rows). Processing fields (added by staff afterward):
  `approved_amount`, `ready` (bool), `assigned_volunteer` (free text),
  `delivered` (TextChoices: כן / איסוף עצמי / לא), `notes`, `linked_child`
  (FK → `Children`, `SET_NULL`, auto-matched or manual — see Decisions above).
- `ChildrenLookup` (SECURITY HARDENING, shared with the rest of the codebase,
  not Vouchers-specific) — a `managed=False` model over a Postgres VIEW
  (`add_children_lookup_view.sql`) exposing ONLY `child_id`/`childfirstname`/
  `childsurname`/`city`/`status` from `Children` — no medical data, no phone
  numbers, no address, no coordinator notes. Used by `voucher_views.py`
  (genuine unauthenticated public surface) for the family-linking existence
  checks, `linked_child_name` labels, and comparing a recipient's
  self-reported `child_treatment_status` against the linked child's REAL
  `status` (exposed as `linked_child_status` — the admin UI flags a ⚠️
  mismatch, e.g. family reports "טיפולים" but the system already shows
  "ז״ל"/"עזב"). Deliberately **NOT** used in `financial_aid_views.py` — that
  module is 100% authenticated-admin-only with no public surface, so
  restricting its queries added complexity with no real security benefit
  there; it still queries `Children` directly.

### Backend files

- `childsmile/childsmile_app/voucher_views.py` (NEW) — admin CRUD for
  distributions (`get/create/update/delete_voucher_distribution`) and
  recipients (`get/create/update/delete_voucher_recipient`, with an optional
  `?distribution_id=` filter on the list endpoint), PLUS two PUBLIC
  unauthenticated endpoints: `get_voucher_distribution_public_info` (minimal
  info so the form knows which template to render — no amounts, no other
  recipients' data) and `submit_voucher_questionnaire` (the actual
  submission). Shared `_apply_recipient_fields`/`_validate_recipient_data`
  helpers used by ALL THREE write paths (public submit + admin create/update)
  for consistent validation and auto-matching everywhere, not just publicly.
- `childsmile/childsmile_app/urls_vouchers.py` (NEW) — route definitions
  under `distributions/*`, `recipients/*`, and `public/<distribution_id>/*`.
- `childsmile/childsmile_app/urls.py` — added
  `path("api/vouchers/", include("childsmile_app.urls_vouchers"))`.

### Security hardening (public endpoints — extra, since there's no session to act as a first barrier)

- `django_ratelimit` (already a dependency, same pattern as
  `register_send_totp`/login views): `5/min/IP` on the submit endpoint,
  `30/min/IP` on the info endpoint (slows distribution_id enumeration).
- `_validate_recipient_data()`: explicit server-side length caps per field
  (independent of DB column limits — turns an ugly 500 into a clean 400),
  Israeli phone format, REAL ת"ז checksum (not just a digit-count check —
  see Decisions above) for `parent_id_number`/`child_id_number`, an allow-list
  check for `child_treatment_status` (must match `Children.status`'s real
  values), and a 0-30 range check for `num_children_at_home`. Independent of
  whatever the React form validates client-side (a direct script/curl POST
  bypasses that entirely).
- Honeypot: a hidden `website` field — non-empty silently returns the SAME
  success response (doesn't tip off bots), logs a warning server-side.
- CSRF: relies on the exact same already-working mechanism as `/register`
  (`conditional_csrf` + `axiosConfig.js`'s cookie-read `X-CSRFToken` header) —
  no new CSRF plumbing invented.

### Raw SQL

- `add_vouchers_table.sql` (NEW, repo root) — `CREATE TABLE IF NOT EXISTS
  childsmile_app_voucherdistribution` + `childsmile_app_voucherrecipient`
  (with `linked_child_id BIGINT NULL REFERENCES childsmile_app_children(
  child_id) ON DELETE SET NULL`) + indexes + idempotent permission grant
  (VIEW/CREATE/UPDATE/DELETE → `System Administrator` ONLY, by name — same
  technique as every other module). **Run this on the DB cluster**, then
  **re-run `add_viewer_role.sql`**.
- `add_children_lookup_view.sql` (NEW, repo root, SECURITY HARDENING) —
  `CREATE OR REPLACE VIEW childsmile_app_children_lookup AS SELECT child_id,
  childfirstname, childsurname, city, status FROM childsmile_app_children`.
  **Run this on the DB cluster too** — without it, every voucher_views.py
  endpoint that touches `ChildrenLookup` will fail (the view won't exist).
- `add_audit_translations.sql` — appended Hebrew labels for
  `VIEW/CREATE/UPDATE/DELETE_VOUCHER_DISTRIBUTION(_FAILED)`,
  `VIEW/CREATE/UPDATE/DELETE_VOUCHER_RECIPIENT(_FAILED)`,
  `SUBMIT_VOUCHER_QUESTIONNAIRE(_FAILED)`.

### Frontend files

- `childsmile/frontend/src/pages/Vouchers.js` (NEW) — admin page, single
  master-detail component (NOT split into separate distributions/recipients
  files): a `view` state toggles between the distributions list and a
  drill-in recipients list per distribution. Distributions view: searchable/
  paginated table, create/edit/delete modals, "העתק קישור לשאלון" (copies
  `/voucher-questionnaire/:id` to the clipboard, only shown when
  `questionnaire_type !== 'ללא'`). Recipients view: totals bar, searchable/
  paginated table with a family-linking react-select (reusing Financial
  Aid's `get_family-options` endpoint — a SIMPLE picker here, not the
  search-or-freetext combo Financial Aid uses, since `full_name` is always
  independently collected), a ⚠️ status-mismatch badge when a linked
  recipient's self-reported `child_treatment_status` differs from the real
  `linked_child_status`, and real ת"ז-checksum validation on the ID fields.
- `childsmile/frontend/src/pages/VoucherQuestionnaire.js` (NEW) — the PUBLIC
  form itself, reached via `/voucher-questionnaire/:distributionId` (a
  top-level route, same "clean URL, unrelated to file location under
  `pages/`" pattern as every other route in this app — react-router paths are
  fully decoupled from where the `.js` file physically lives). Conditionally
  renders עמותה/כללי-specific fields, includes the hidden honeypot field,
  mirrors the server's exact validation (checksum, phone format, length
  caps) for instant feedback.
- `childsmile/frontend/src/styles/vouchers.css` + `voucherquestionnaire.css`
  (NEW) — the latter is a standalone public-form stylesheet (not reusing the
  authenticated-app chrome), honeypot visually hidden off-screen
  (`position:absolute; left:-9999px`) rather than `display:none`.
- `childsmile/frontend/src/App.js` — import + admin `<Route path="/vouchers">`
  + PUBLIC `<Route path="/voucher-questionnaire/:distributionId">` (no auth
  guard — none exists anywhere in this app's routing). `NO_BELL_PATHS`'s
  `showBell` logic extended with `!location.pathname.startsWith(
  '/voucher-questionnaire/')` since it's a dynamic path, not a static one the
  exact-match array can handle.
- `childsmile/frontend/src/components/Sidebar.js` —
  `hasPermissionToVouchers` flag (🎟️ icon, "חלוקת תלושים" label) added to the
  "כספים" section (desktop only, both expanded/collapsed variants).
- `childsmile/frontend/src/pages/FinanceOverview.js` — wired the real
  Vouchers distributed-total/recipient-count into the KPI grid, grand total,
  monthly trend chart (keyed by each distribution's `start_date`, since
  individual recipients have no reliable per-record date), combined Excel
  export, and its own real modcard (replacing the "בקרוב" placeholder);
  `ACTIVE_MODULES` bumped 4 → 5 (now `5 מתוך 5`).
- `childsmile/frontend/src/components/export_utils.js` —
  `exportVoucherDistributionsToExcel` + `exportVoucherRecipientsToExcel`
  (same no-selection shape as the other finance exports).

### Explicitly NOT built (v1) — revisit later if needed

- Driver tracking (מעקב נהגים) as its own dedicated page/view — CANCELLED per
  NPO request (see Decisions above).
- CAPTCHA on the public questionnaire (see Decisions above).
- A period/date-range filter beyond search (matches the simpler precedent
  already set by every other finance module).

---

## File manifest (Overview + Petty Cash + Ongoing Expenses + Financial Aid + Vouchers passes)

**Created:**
- `add_petty_cash_table.sql`
- `add_ongoing_expenses_table.sql`
- `add_financial_aid_table.sql`
- `add_vouchers_table.sql`
- `add_children_lookup_view.sql` (security hardening — restricted VIEW, see Vouchers section above)
- `childsmile/childsmile_app/petty_cash_views.py`
- `childsmile/childsmile_app/urls_petty_cash.py`
- `childsmile/childsmile_app/ongoing_expense_views.py`
- `childsmile/childsmile_app/urls_ongoing_expense.py`
- `childsmile/childsmile_app/financial_aid_views.py`
- `childsmile/childsmile_app/urls_financial_aid.py`
- `childsmile/childsmile_app/voucher_views.py`
- `childsmile/childsmile_app/urls_vouchers.py`
- `childsmile/frontend/src/pages/PettyCash.js`
- `childsmile/frontend/src/styles/pettycash.css`
- `childsmile/frontend/src/pages/OngoingExpenses.js`
- `childsmile/frontend/src/styles/ongoingexpenses.css`
- `childsmile/frontend/src/pages/FinancialAid.js`
- `childsmile/frontend/src/styles/financialaid.css`
- `childsmile/frontend/src/pages/Vouchers.js`
- `childsmile/frontend/src/pages/VoucherQuestionnaire.js` (PUBLIC form)
- `childsmile/frontend/src/styles/vouchers.css`
- `childsmile/frontend/src/styles/voucherquestionnaire.css`
- `childsmile/frontend/src/pages/FinanceOverview.js` (frontend-only, no backend)
- `childsmile/frontend/src/styles/financeoverview.css`
- `FINANCE_MEGA_FEATURE.md` (this file)

**Modified:**
- `childsmile/childsmile_app/models.py` (added `PettyCashExpense`, `OngoingExpense`,
  `FinancialAid`, `FinancialAidAttachment`, `VoucherDistribution`,
  `VoucherRecipient`, `ChildrenLookup`)
- `childsmile/childsmile_app/refund_views.py` (Petty Cash sync automation)
- `childsmile/childsmile_app/urls.py` (registered `urls_petty_cash`,
  `urls_ongoing_expense`, `urls_financial_aid`, `urls_vouchers`)
- `childsmile/childsmile_app/version.txt` (bumped repeatedly for these backend
  changes — see Ground Rules; MUST bump again for every future backend change)
- `add_audit_translations.sql` (Petty Cash + Ongoing Expenses + Financial Aid +
  Vouchers action codes)
- `childsmile/frontend/src/App.js` (routes, incl. the PUBLIC voucher-questionnaire
  route + `NO_BELL_PATHS`/`showBell` dynamic-path handling)
- `childsmile/frontend/src/components/Sidebar.js` (nav entries, desktop-only)
- `childsmile/frontend/src/components/export_utils.js` (added
  `exportPettyCashToExcel` / `exportOngoingExpensesToExcel` /
  `exportFinanceOverviewToExcel` / `exportFinancialAidToExcel` /
  `exportVoucherDistributionsToExcel` / `exportVoucherRecipientsToExcel` — see
  Ground Rules' Excel-export rule)
- `childsmile/frontend/src/pages/Families.js` (Financial Aid history section
  in the family details modal)

## Deploy checklist

1. Run `add_petty_cash_table.sql`, `add_ongoing_expenses_table.sql`,
   `add_financial_aid_table.sql`, `add_vouchers_table.sql`, and
   `add_children_lookup_view.sql` on the DB cluster (tables + view + indexes +
   `System Administrator` permissions).
2. Re-run `add_viewer_role.sql` so the `Viewer` role picks up the new
   `childsmile_app_pettycashexpense` / `childsmile_app_ongoingexpense` /
   `childsmile_app_financialaid` / `childsmile_app_voucherdistribution`
   permissions too (same step needed any time a new admin-only resource is
   added — this is how Refunds' admin-only actions reached Viewer as well).
3. Run `add_audit_translations.sql` (idempotent — safe to run the whole
   file, or just the new blocks).
4. Restart Django (new views/urls/models).
5. Rebuild/redeploy the frontend.
6. Spot-check: log in as System Administrator → sidebar "כספים" section
   shows "סקירה כללית" (📊), "החזרי הוצאות" (💰), "קופה קטנה" (💵),
   "הוצאות שוטפות" (⛽), "סיוע כספי" (🤝) and "חלוקת תלושים" (🎟️) → open
   each, add an entry. Then mark an existing refund as "שולם" in `/refunds`
   → confirm a linked row now appears in `/petty-cash` tagged "מהחזר #<id>".
   For Financial Aid: create a record linked to a registered family, then
   open that family's details in `/families` → confirm the aid history
   section shows it. For Vouchers: create a distribution with a
   questionnaire type, copy its public link, submit the form as an
   anonymous visitor (e.g. a private browser window), confirm the
   submission appears in `/vouchers`'s recipients view, and — if the child's
   ת"ז matches an existing registered child — confirm it auto-links.
7. Set `AZURE_FINANCIAL_AID_CONTAINER` (or accept the `financial-aid-docs`
   default) alongside the existing `AZURE_STORAGE_*` env vars if file
   uploads are needed in PROD (same Azure Storage account as Refunds, just a
   different container).
8. **Before merging/pushing: confirm `childsmile/childsmile_app/version.txt`
   was bumped** (see Ground Rules) — otherwise the Azure deploy workflow will
   see no version change and SKIP deploying this backend change entirely.
   (The Overview page itself is frontend-only — no bump needed for it alone.)

