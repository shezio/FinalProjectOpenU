# PT Remediation — Execution Plan (ptplan.md)

> **Purpose:** the actionable dev work only — no debate, no rationale (that lives in
> `PT_REMEDIATION_FINAL_EN.html`). Signed off with Liam on 2 Aug 2026; execute on the
> user's green light. Each task is self-contained so it can be handed to a subagent.
>
> **STATUS: DECISIONS FINAL — DO NOT write any app code until the user gives the green light to build.**
> Every item below is agreed (with Liam). Decisions are locked; execution is not — wait for "go".

## Ground rules (apply to every task)
- **⏸ WAIT for the user's green light before writing ANY app code.** Decisions are final; building is not authorized yet.
- **Use subagents** for the independent / parallelizable tasks (each task below is self-contained) — fan
  them out where it speeds things up; keep the SQL wait-gate (T6) and the `version.txt` bumps coordinated
  on the main thread.
- **⏸ SQL is USER-RUN, never the agent.** The agent authors every `.sql` file but does NOT execute it.
  Any task with a SQL step ends at a **WAIT gate**: the agent creates the script, then STOPS and waits
  for the user to run it and confirm before doing the dependent code/deploy step. (Applies to T6.)
- **version.txt:** any change under `childsmile/childsmile_app/**` MUST bump
  `childsmile/childsmile_app/version.txt` (else the deploy silently skips syncing).
  Frontend-only changes (`childsmile/frontend/**`) do NOT need it.
- **Two settings files** (`childsmile/childsmile/settings.py` + `childsmile/settings.py`)
  must stay in sync if either is touched.
- **Don't break existing flows** — especially Feedbacks/assignment dropdowns (see T6).
- **Verify .py edits** with a real syntax check (`python3 -m py_compile <file>`), not just
  the editor — Hebrew string literals can hide syntax errors.
- Hebrew UI strings: plain Hebrew literals (no `t()` unless the key already exists in i18n.js).

---

## CONFIRMED — approved, ready to build on go-ahead

### T1 · F8 — Restrict upload file types
- **Files:** `refund_views.py::get_receipt_upload_url`, `financial_aid_views.py::get_financial_aid_upload_url`
- **Do:** allow-list extensions `{pdf, jpg, jpeg, png}` (case-insensitive) before issuing the
  SAS; reject others with 400. Set `Content-Disposition: attachment` (+ correct `Content-Type`)
  on the stored blob so active content can't be served inline.
- **Verify:** upload-url for `receipt.exe`/`x.html` → 400; `receipt.pdf` → 200.
- **Bump version.txt.**

### T2 · F10 — Fix roles_spread_stats HTTP 500
- **File:** `report_views.py::roles_spread_stats` (~L580)
- **Do:** the `.values(name=F("role_name"), count=F("count"))` alias collides with the
  `annotate(count=Count(...))`. Rename: `annotate(cnt=Count("staff_members")).values(name=F("role_name"), count=F("cnt"))`.
- **Verify:** 200 for an admin session, 403 for anonymous.
- **Bump version.txt.**

### T3 · F13 — Revoke the disabled user's sessions on deactivate
- **File:** `utils.py::deactivate_staff` (~L1632). Pattern: `views_auth.py::logout_all_other_sessions` (~L22).
- **Do:** add `delete_all_sessions_for_user(staff_id)` that iterates non-expired
  `django_session` rows and deletes the ones whose decoded `user_id` == this staff — **all of
  them, no current-session exception**. Call it right after `is_active=False` is saved.
- **Scope guarantee:** touches ONLY the user being deactivated; no other sessions affected.
- **Also (ops):** re-verify in production that disabled users can't sign in (code gate already
  present in `login_email`, `verify_totp` ~L397, `google_login_success`).
- **Verify:** deactivated user's existing session → 401 on next request; a second active user
  is unaffected.
- **Bump version.txt.**

### T4 · F17 — Whitelist the public voucher submit fields
- **File:** `voucher_views.py::submit_voucher_questionnaire` (~L742)
- **Do:** before `_apply_recipient_fields`, drop privileged keys from the incoming data —
  `approved_amount, ready, delivered, assigned_volunteer, status, linked_child_id, recipient_id`
  — mirroring the activity path's `public_data` filter (`activity_views.py` ~L910). Keep only
  family-submitted fields.
- **Verify:** a public POST with `approved_amount`/`ready` set → those are ignored (row stays
  null/default); normal submit still works.
- **Bump version.txt.**

### T5 · F9a — Frontend security headers
- **File (new):** `childsmile/frontend/public/staticwebapp.config.json`
- **Do:** `globalHeaders` with `X-Frame-Options: DENY` + `X-Content-Type-Options: nosniff`.
  (Azure Static Web Apps serves the file from the build root; CRA copies `public/` there.)
- **Verify:** headers present on the deployed app; login / TOTP / Google sign-in all unaffected
  (confirmed: no iframes anywhere, Google login is a full-page redirect).
- Frontend-only → **no version.txt.**

---

## AGREED (final) — build on the user's green light

### T6 · F12 — Enforce read authorization (grant Reviewer staff:VIEW only, then gate)
- **Decision: data-minimization (Liam's preferred option).** Grant the Reviewer role ONLY `staff:VIEW`
  — NOT tutors/signedup. `/api/staff/` exposes names/phones/roles, NO national-IDs (those live only in
  the tutor/pending endpoints). Reviewer stays BLOCKED from `/api/tutors/` + `/api/get_pending_tutors/`.
- **Code-verified it doesn't break the Reviewer's page** (ReviewerPage.js): its loads are tasks (held),
  `get_complete_family_details` (children:VIEW held → family edit via children:UPDATE held), coordinators,
  settlements. The staff-assignee dropdown is ADMIN-ONLY (`if (isAdmin) fetchStaff()`, isAdmin = staff
  VIEW+UPDATE) so the narrow role never triggers it. The page makes NO tutors/pending-tutors call.
- **SQL evidence (Query C, 2026-08-02):** of all login-capable roles only `Reviewer` lacked `staff` VIEW;
  `Inactive` holds none (can't log in) but has leftover `expenserefund:VIEW` + 11 DUPLICATE
  `notification_message:VIEW` rows (cleaned in Step 1).
- **Step 1 — SQL (agent WRITES the file; USER RUNS it)** — new file `fix_role_permissions_pt.sql` (repo root):
  1. **grant Reviewer** `childsmile_app_staff` VIEW ONLY (by role_name, NOT EXISTS guard — mirror
     `add_reviewer_role.sql`). Do NOT grant tutors/signedup.
  2. **clean the `Inactive` role** — a disabled-user role must grant NOTHING:
     `DELETE FROM childsmile_app_permissions WHERE role_id = (SELECT id FROM childsmile_app_role
     WHERE role_name='Inactive');`. Hardens F13 — a lingering session on a disabled account carries zero perms.
- **⏸ WAIT GATE — stop here until the USER runs `fix_role_permissions_pt.sql` and confirms.**
  Deploying Step 2 before the grant runs would lock the Reviewer role out at login. Do NOT proceed until confirmed.
- **Step 2 — Backend gate (only AFTER the wait gate above):** add `has_permission(request, "<res>", "VIEW")`
  (pattern: `get_signedup` L360; auto-prefixes `childsmile_app_`) to: `get_children`(L201)→children,
  `get_tutors`(L234)→tutors, `get_pending_tutors`(L310)→signedup, `get_staff`(L151)→staff,
  `get_available_coordinators`(L839)→staff; `dashboard_views.py::get_coordinator_workload`(L679)→staff.
  *(Leave `report_views.py::families_tutorships_stats` — already gated.)*
- **`get_notification_templates`(L88):** re-run the Query-C check for `childsmile_app_notification_message`
  first — gate only after confirming the roles that use the Notifications page hold that VIEW.
- **Why this satisfies the reviewer:** enforcement now EXISTS on every read; a role/account WITHOUT the
  permission (a deactivated account, cleared grants) is blocked — closing the F13-amplified PII path. The
  narrow Reviewer role is authorized ONLY for the non-PII staff directory it needs, and is denied the
  national-ID endpoints entirely (data minimization).
- **Verify:** login works for every role incl. Reviewer; Reviewer → 403 on `/api/tutors/` + `/api/get_pending_tutors/`;
  Reviewer's tasks + family-edit + coordinator dropdown still work; dropdowns populate for all active roles.
- **Verify (Liam sign-off check):** confirm `get_staff` (`/api/staff/`) carries NO sensitive identifier —
  it returns id(staff_id auto-PK)/username/first_name/last_name/staff_phone/roles, NOT `staff_israel_id`
  (national-ID). Decide whether `staff_phone` should also be dropped from the response for roles without a
  privileged staff view (Reviewer only needs names for the coordinator dropdown, not phones).
- **Bump version.txt** (backend) + run the SQL.

### T7 · F9b — CSP in report-only mode (frontend)
- **File:** `childsmile/frontend/public/staticwebapp.config.json` (extend T5's `globalHeaders`)
- **Do:** add `Content-Security-Policy-Report-Only` allowing `self` + the API origin
  (`connect-src app.achildssmile.org.il`) + Google OAuth + Google Fonts. Report-only enforces
  nothing — observe violations, tune, and only later switch to an enforced `Content-Security-Policy`.
- **Verify:** no functional change anywhere (report-only never blocks); violations visible in
  browser console / report sink.

### T8 · F7 — Private storage + short-lived read-SAS links  (AGREED — receipts + aid)
- **Decision: AGREED.** Containers go Private; receipts + aid docs served via short-lived read-SAS.
  Accepted trade-off: **links become time-limited** (vs today's permanent public URLs).
- **Files:** `refund_views.py` (`get_receipt_upload_url` + refund-to-dict / `_refund_attachments_list`),
  `financial_aid_views.py` (upload + attachment serialization). **Infra:** set the
  `refund-receipts` and `financial-aid-docs` Azure containers to **Private**.
- **Do (backend):** add a read-SAS helper; on READ, return each receipt/doc URL as a short-lived
  **read** SAS (`BlobSasPermissions(read=True)`, ~1h expiry, regenerated on each data fetch) instead
  of the bare URL. Keep storing the BARE url in the DB; never return it bare.
- **Frontend:** the `<a href={file_url} target="_blank">` links (Refunds.js L731/L762, FinancialAid.js
  L406) keep working with **no frontend code change** — *iff the backend swaps `file_url` to the SAS url
  in its read response*. A SAS url opens in a new tab with no login (the SAS token IS the auth); the
  frontend just renders whatever `file_url` the API returns, so the bare→SAS switch happens in the
  backend serializer, not the UI.
- **UX caveat:** SAS expires → use ~1h + regenerate per fetch (or mint on-click) so a late click
  isn't a dead link.
- **⏸ USER/ops step (do LAST):** flip `refund-receipts` + `financial-aid-docs` to **Private** in Azure
  ONLY AFTER the read-SAS backend is deployed — privatising first breaks in-app file links in the gap.
- **Cleanup (ops):** delete the pentest marker blob
  `refund-receipts/refunds/660/20260730160603_SECURITY-TEST-please-delete.txt`.
- **Verify:** bare blob URL anonymously → 403; "open receipt in new tab" still works via SAS; a link
  older than the expiry → refreshed on next page load.
- **Bump version.txt** (backend) + infra step.

### T9 · F11 — Static guard-coverage check (fails the deploy, never the running app)
- **Decision: FIXED** (supersedes the earlier "docs-only / risk-accept"). Liam's point stands: a
  "remember to add the guard" fix for a "forgot the guard" bug (F6) is circular — enforcement must be mechanical.
- **File (new):** `check_viewer_guards.py` (repo root) — **stdlib `ast` ONLY. No Django import, no venv,
  no pip, no DB.** Parses the view modules as text: for every function whose `@api_view([...])` includes
  POST/PUT/PATCH/DELETE, assert `@block_viewer_writes` is also on it. Exit 1 (naming the offenders) on any
  violation. Keep an `ALLOWLIST` of exempt public/auth writes: submit_activity_request,
  submit_voucher_questionnaire, login_email, verify_totp, register_send_totp, register_verify_totp,
  google_login_success, logout, whatsapp_incoming, and the /api/audit-action/ logger.
- **Coverage (Liam sign-off check):** the scan must recognize EVERY way a write route is declared —
  `@api_view` with one OR multiple methods (e.g. `["GET","POST"]`), the `@conditional_csrf` wrapper, and
  decorator-order variations. When unsure, FAIL CLOSED (flag it) rather than silently skip. (This codebase
  is all function views — no DRF ViewSets/class-based — but the scan must not assume one fixed decorator shape.)
- **Wire it as a GATING job in the deploy workflow** (`.github/workflows/azure-deploy.yml`): a first
  `guard-check` job (ubuntu, `actions/checkout`, `python3 check_viewer_guards.py`) that the deploy job
  `needs:`. Fail → deploy job never runs → **production untouched (old version keeps serving)** → user
  gets a "build failed" notification. Runs in ~seconds; stdlib-only means none of the past Django-in-CI pain.
- **NOT a runtime/startup assertion** — deliberately: it must NEVER be able to crash the live app (no
  midnight pager). It fails BEFORE publish, not at Django boot.
- **Also document** the rule in the repo backend conventions (belt-and-suspenders for dev sessions).
- **Verify:** temporarily drop `@block_viewer_writes` from one write view → `python3 check_viewer_guards.py`
  exits 1 and names it; restore → exits 0. CI/infra only → no `version.txt` bump.

---

## NOT DOING (recorded so they don't resurface)
- **F5** CSRF server-side enforcement — SameSite=Lax mitigates; low ROI, real breakage risk.
- **F11** — moved OUT of here: now **FIXED via T9** (static guard-coverage check). Shim kept (Viewer UX)
  + mechanical enforcement added so a future unguarded write can't ship.
- **F14** refund submit-by-all — by design; approve/pay already admin-only (separation exists).
- **F15 / F16** public questionnaire id/oracle — questionnaires are public by design.
