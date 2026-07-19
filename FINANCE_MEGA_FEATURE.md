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
| 6 | חלוקת תלושים (Vouchers) | ⏳ Planned | — | Most complex: sub-tabs (summary/recipients/forms), public questionnaire, family linking by ת"ז. שורת כ-בקריה "בקרוב" במודול ה-Overview. |

---

## סקירה כללית (Overview) — built this pass ✅

100% frontend — no backend/DB changes, no new permission resource. Aggregates
the existing GET endpoints (`/api/refunds/`, `/api/petty-cash/`,
`/api/ongoing-expenses/`, `/api/financial-aid/` — the last one added when the
Financial Aid module was built, see its own section below) client-side;
Vouchers still shows as a **"בקרוב"** (Coming Soon) card — greyed out, not
clickable — until it's built.

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
  are clickable (`navigate()` to that module); Vouchers renders as a disabled
  "בקרוב" card (opacity 0.55, `cursor:not-allowed`, no hover, no onClick).
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

- Vouchers real card (still shows "בקרוב" until that module exists).
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

## Remaining modules — not started (rough spec from the concept file only, refine before building)

### חלוקת תלושים (Vouchers) — ⏳ Planned, most complex
- Three sub-views per the concept: סיכום חלוקות (distribution summary),
  רשימת מקבלים (recipient list, built from a questionnaire + team
  processing fields: סכום/מוכן/מתנדב/נמסר), השאלונים (two questionnaire
  variants: עמותה family vs. כללי/external family).
- Needs family-record auto-matching by ת"ז (child + parent), with manual
  linking fallback ("לא רשומה" when no match). This is a significant scope
  on its own — needs its own planning pass before implementation starts.
- REUSE from Financial Aid (don't reinvent): the family combo-picker (search
  existing family OR free-type a name, see FinancialAid.js's `familyPickerValue`
  / react-select `noOptionsMessage` "Use this name?" confirm pattern — itself
  borrowed from Feedbacks.js), the lightweight `get_family_options` endpoint
  (id/name/city only, NOT the heavy `get_complete_family_details`), and the
  multi-file Azure Blob upload pattern (`FinancialAidAttachment` junction
  table + per-file SAS upload loop) if recipient documents are needed here too.

---

## File manifest (Overview + Petty Cash + Ongoing Expenses + Financial Aid passes)

**Created:**
- `add_petty_cash_table.sql`
- `add_ongoing_expenses_table.sql`
- `add_financial_aid_table.sql`
- `childsmile/childsmile_app/petty_cash_views.py`
- `childsmile/childsmile_app/urls_petty_cash.py`
- `childsmile/childsmile_app/ongoing_expense_views.py`
- `childsmile/childsmile_app/urls_ongoing_expense.py`
- `childsmile/childsmile_app/financial_aid_views.py`
- `childsmile/childsmile_app/urls_financial_aid.py`
- `childsmile/frontend/src/pages/PettyCash.js`
- `childsmile/frontend/src/styles/pettycash.css`
- `childsmile/frontend/src/pages/OngoingExpenses.js`
- `childsmile/frontend/src/styles/ongoingexpenses.css`
- `childsmile/frontend/src/pages/FinancialAid.js`
- `childsmile/frontend/src/styles/financialaid.css`
- `childsmile/frontend/src/pages/FinanceOverview.js` (frontend-only, no backend)
- `childsmile/frontend/src/styles/financeoverview.css`
- `FINANCE_MEGA_FEATURE.md` (this file)

**Modified:**
- `childsmile/childsmile_app/models.py` (added `PettyCashExpense`, `OngoingExpense`,
  `FinancialAid`, `FinancialAidAttachment`)
- `childsmile/childsmile_app/refund_views.py` (Petty Cash sync automation)
- `childsmile/childsmile_app/urls.py` (registered `urls_petty_cash`,
  `urls_ongoing_expense`, `urls_financial_aid`)
- `childsmile/childsmile_app/version.txt` (bumped for these backend changes — see
  Ground Rules; MUST bump again for every future backend change in this doc)
- `add_audit_translations.sql` (Petty Cash + Ongoing Expenses + Financial Aid action codes)
- `childsmile/frontend/src/App.js` (routes)
- `childsmile/frontend/src/components/Sidebar.js` (nav entries, desktop-only)
- `childsmile/frontend/src/components/export_utils.js` (added
  `exportPettyCashToExcel` / `exportOngoingExpensesToExcel` /
  `exportFinanceOverviewToExcel` / `exportFinancialAidToExcel` — see Ground
  Rules' Excel-export rule)
- `childsmile/frontend/src/pages/Families.js` (Financial Aid history section
  in the family details modal)

## Deploy checklist

1. Run `add_petty_cash_table.sql`, `add_ongoing_expenses_table.sql`, and
   `add_financial_aid_table.sql` on the DB cluster (tables + indexes +
   `System Administrator` permissions).
2. Re-run `add_viewer_role.sql` so the `Viewer` role picks up the new
   `childsmile_app_pettycashexpense` / `childsmile_app_ongoingexpense` /
   `childsmile_app_financialaid` permissions too (same step needed any time
   a new admin-only resource is added — this is how Refunds' admin-only
   actions reached Viewer as well).
3. Run `add_audit_translations.sql` (idempotent — safe to run the whole
   file, or just the new blocks).
4. Restart Django (new views/urls/models).
5. Rebuild/redeploy the frontend.
6. Spot-check: log in as System Administrator → sidebar "כספים" section
   shows "סקירה כללית" (📊), "החזרי הוצאות" (💰), "קופה קטנה" (💵),
   "הוצאות שוטפות" (⛽) and "סיוע כספי" (🤝) → open each, add an entry. Then
   mark an existing refund as "שולם" in `/refunds` → confirm a linked row
   now appears in `/petty-cash` tagged "מהחזר #<id>". For Financial Aid:
   create a record linked to a registered family, then open that family's
   details in `/families` → confirm the aid history section shows it.
7. Set `AZURE_FINANCIAL_AID_CONTAINER` (or accept the `financial-aid-docs`
   default) alongside the existing `AZURE_STORAGE_*` env vars if file
   uploads are needed in PROD (same Azure Storage account as Refunds, just a
   different container).
8. **Before merging/pushing: confirm `childsmile/childsmile_app/version.txt`
   was bumped** (see Ground Rules) — otherwise the Azure deploy workflow will
   see no version change and SKIP deploying this backend change entirely.
   (The Overview page itself is frontend-only — no bump needed for it alone.)

