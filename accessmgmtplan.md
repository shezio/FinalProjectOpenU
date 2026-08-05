# Access Management + System-Wide Permission Model — Final Build Spec (Both PT Rounds Resolved)

**Feature:** Admin-only "Access Management" screen + APIs to edit `role`/`permissions`, **plus** a system-wide
migration to permission-based authorization that makes custom roles first-class, behind a hard anti-escalation firewall.
**Reviewed by:** Liam Avivi — **two** static-PT rounds, all findings folded in.
**Written:** 2026-08-03 · **Updated:** 2026-08-04 (post-Round-2) · **Status:** Final design — **NO CODE YET**
**System:** A Child's Smile · Backend 26.07.2x.x (Django DB-backed sessions, passwordless TOTP login, allauth Google OAuth)

---

## 0. Status

Two static-PT rounds are complete. Round 1 hardened the screen; Round 2 moved the risk to the **~50-gate migration** and
the **firewall**, and surfaced a **live Django-admin backdoor** to the crown-jewel tables. Every finding is resolved
below. This document is the definitive build spec — **still no code written.**

---

## 1. Decisions locked in

| # | Topic | Decision |
|---|---|---|
| D1 | Screen | Desktop-only, admin-only. Roles×4 checkbox matrix per resource. |
| D2 | Save mechanic | **Per-cell deltas** (`+add`/`−remove`); server applies only explicit cells. |
| D3 | Operations | Grant/revoke perms + create + rename + delete **custom** roles. |
| D4 | Reversibility | **No DB restore, ever.** Keep the confirm-modal preview + audit before-snapshot (forensic / manual re-grant only). |
| D5 | Permission-immutable roles | System Administrator, Viewer, Inactive, caller's **own** roles. |
| D6 | Rename/Delete-immutable roles | **All ~11 seed roles** (delete blocked regardless of assignment). |
| D7 | Re-auth | Fresh emailed TOTP before every access write — **Access-Management-scoped** (`purpose='access_save'`). |
| D8 | Firewall | `is_admin` name-based; non-grantable **`ADMIN_DEFINING`** set; **config is code-constant**; invariants bind **admins too**. |
| D9 | Custom roles | First-class via **permission-based** authorization (the migration). |
| D10 | `is_admin` usage | Unified into **decorators** (`@admin_only`, `@admin_or_permission`) across the system. |
| D11 | Coordinator routing | **Permission-ized** via new **capability** resources (seeded for back-compat). |
| D12 | Bilingual names | New **`role_name_translations`** table (`name_he`, `name_en`); matrix shows both columns; no live `i18n.js` edits. |
| D13 | Reserved names | Reject the ~11 seed names (bilingual) — UI **and** backend, for any API — **on `role_name` AND both translation fields**. |
| D14 | Freshness | Kill affected sessions on **any permission removal** (generic event); additions lazy. No auth change. |
| D15 | CSRF / SameSite | **No SameSite change.** CSRF already enforced in prod (`@conditional_csrf`=`csrf_protect` + `X-CSRFToken`). |
| D16 | DRF viewsets | **Delete** the unused `/roles/`, `/permissions/`, `/staff/` ModelViewSets. |
| D17 | SQL | **No re-running** existing SQL. All schema/seed in **new** files. |
| D18 | CI guard | Extend `check_viewer_guards.py`: decorator **presence + order + declared coverage**. |
| D19 | Phasing | **One delivery, all-or-nothing cutover. No shadow phase.** |
| D20 | Migration safety | **Skip DRF deny-by-default** (doesn't fit custom auth); rely on **hardened Django admin + CI guard + negative per-gate tests**. |
| D21 | Django admin | ✅ **DONE — shipped separately** (PR #511, `version.txt` 26.08.1.0): `admin.py` registers nothing + strips built-in User/Group admin; `amit_admin` disabled in prod. **Not part of this build.** |
| D22 | v1 hardening | High-impact grant warning; rate-limit + invalidate codes; Viewer read-only banner; TOTP step-up on the assignment screen (distinct purpose). |

---

## 2. Ground truth — verified facts

1. **Data model.** `Role(id, role_name UNIQUE)`; `Permissions(permission_id, role FK ON DELETE CASCADE, resource, action)`; `Staff.roles` M2M. Permission = `(role, resource, action)`; `action ∈ {VIEW,CREATE,UPDATE,DELETE}`.
2. **`is_admin(user)` is ROLE-NAME based** (`role_name IN ('System Administrator','Viewer')`, fresh DB). Editing permission rows cannot mint an admin — **the firewall's backbone.**
3. **`has_permission` reads the SESSION cache** (loaded at login); `is_admin`/`is_viewer_user` hit the DB fresh.
4. **`TOTPCode`** (email/code[6]/created_at/used/attempts; 5-min, 3-try) — **no `purpose` field today** (we add one, additively).
5. **`conditional_csrf` = `csrf_protect` in prod / `csrf_exempt` in dev**; the SPA sends `X-CSRFToken` in prod. → **CSRF already enforced in prod.**
6. **`SESSION_COOKIE_SAMESITE = "Lax"` (prod)** — load-bearing (changing it broke Google OAuth once) → untouched.
7. **`@block_viewer_writes`** + `check_viewer_guards.py` (AST, deploy-blocking) enforce Viewer read-only on writes.
8. **~11 seed roles referenced by exact English name**; **role names are English in DB, Hebrew in UI via `i18n.js`**.
9. **Deactivation strips roles + kills sessions** (verify at build).
10. **Authz is hybrid:** most data access is permission-based already; **~50 `is_admin` gates** + **~15 coordinator name-lookups** are name-based (the migration targets).
11. **⚠️ DRF is deliberately auth-less:** `DEFAULT_AUTHENTICATION_CLASSES = []`, `DEFAULT_PERMISSION_CLASSES = []` — the app uses **custom session auth** (`session['user_id']`), so `request.user` is always `AnonymousUser`. → a DRF `IsAuthenticated`/deny-by-default default would 403 *everyone*; it does not fit here (see §6.4).
12. **✅ Django admin backdoor — FOUND LIVE & CLOSED (shipped, PR #511).** `admin.py` had registered `Role`/`Permissions`/`Staff` (+ PII) with `/admin/` routed → full CRUD around the firewall. A live prod check found one dormant superuser (`amit_admin`, last login 2025-10-12); it was disabled and `admin.py` now registers nothing + strips the built-in User/Group admin. Historical context only — already remediated, **not part of this build** (see §11).
13. **OAuth is independent of Django admin:** allauth at `/accounts/` + `CustomSocialAccountAdapter`; post-login redirect `LOGIN_REDIRECT_URL = FRONTEND_URL + "/#/google-success"`. `/admin/` is not in the OAuth flow or the redirect. No websocket consumers; management commands are ops-CLI only.

---

## 3. Architecture — one delivery, seven parts

- **A. Screen + APIs** — Access Management UI + `/api/access/*`.
- **B. Firewall** — triple-layer anti-escalation, config code-constant, binds admins.
- **C. Authz migration** — ~50 `is_admin` gates → decorators; safety via CI guard + negative tests + Django-admin hardening.
- **D. Capability permissions** — ~15 coordinator name-lookups → grantable capability resources (seeded).
- **E. Frontend** — page, routing, nav, and name-flag → permission-flag conversion.
- **F. DB/SQL** — new files only.
- **G. CI guard** — extend `check_viewer_guards.py` (presence + order + coverage).

---

## 4. The firewall (B) — triple-layer, code-constant, binds admins

**Metric:** not a *count* of permissions ("as many as admin") — a Finance Manager legitimately has many; a role with
only `role`+`permissions` CRUD is a full admin with two. The danger is a **specific admin-defining set.**

**`ADMIN_DEFINING` (non-grantable)** = any action on `role`, `permissions`, **and** `staff` CREATE/UPDATE/DELETE
(staff writes = role assignment = admin-minting). `staff` VIEW stays grantable.

- **Layer 1** — admin-defining **surfaces** (this screen, System Management / staff writes) stay gated by `is_admin` name-based only; never permission-ized.
- **Layer 2** — the admin-defining **set** is non-grantable: the matrix hides it, and save/create/rename hard-reject any change that would grant it, for **every caller including a System Administrator**.
- **Layer 3** — `is_admin` name-based ⇒ a stray admin-defining perm is **inert** (no gate honors it).

**Config is code-constant (Liam R2 #2).** `ADMIN_DEFINING`, `RESERVED_ROLE_NAMES`, and the `is_admin` role-name set are
**code constants deployed with the app** — never readable/editable via any API, DB-config table, or admin screen. Changing
them requires a code deploy (covered by review + the CI guard). Immutability matters more than completeness.

**Absolute invariants (bind admins too).** Via any API, no one — not even a System Administrator — can modify the System
Administrator role's permissions, grant any `ADMIN_DEFINING` permission, or create/rename a role into a reserved or
admin-equivalent name. Admin-minting remains only the controlled **assignment** path (System Management, TOTP-gated + audited).

**UX preserved.** Everything outside `ADMIN_DEFINING` is grantable, so an admin can build a **"Finance Manager"** custom
role (finance resources) that reaches finance and nothing admin-defining.

---

## 5. The screen + APIs (A)

### 5.1 UI (desktop-only, admin-only)
- Whole-page `is_admin` gate. Resource selector → one row per role × 4 action checkboxes. Names in **two columns (Hebrew + English)**.
- Local edits until Save. Locked rows: permission-immutable roles. Locked resources: `ADMIN_DEFINING`.
- **Save:** compute deltas → **server-computed preview** → **TOTP step-up** → **confirm modal listing every REMOVED permission (red)** → submit → reload. **No restore button** (D4).
- **High-impact grant warning:** granting a permission that unlocks a sensitive area shows a "this unlocks: …" notice.
- Viewer sees a real **read-only banner** (no fake-success); writes are backend no-ops.

### 5.2 APIs (`/api/access/*`, `@admin_only`, writes audited + TOTP-gated + `@block_viewer_writes` + `@conditional_csrf`)
`GET /overview` · `POST /step-up/send` · `POST /permissions/preview` (dry-run diff, no mutation) · `POST /permissions/save` · `POST /roles` · `PUT /roles/<id>` · `DELETE /roles/<id>`.

### 5.3 `permissions/save` — the dangerous path (per-cell deltas)
- Payload: `{ deltas:[{role_id, resource, action, op:add|remove}], totp_code }`.
- Reject the **whole** save (atomic, nothing applied) if any delta targets a permission-immutable role, an `ADMIN_DEFINING` resource, an unknown resource/action, a duplicate cell, or a non-existent `role_id`.
- Removes = exactly the `op:remove` cells — **never** `current − desired`, **never** a blanket delete-by-role.
- One `transaction.atomic`; one audit row with full `added[]+removed[]` + before-snapshot; empty deltas = true no-op (no TOTP consumed); payload size capped; **every removal fires the generic freshness event (§9).**

---

## 6. Authz migration (C) + migration safety

### 6.1 Decorators (D10)
- **`@admin_only`** — authenticate → `is_admin` (name) → 403/401 + audit. Admin-defining surfaces + access endpoints.
- **`@admin_or_permission(resource, action)`** — authenticate → (`is_admin` OR `has_permission`) → 403/401 + audit. Every other admin-only module gate.
- Replaces ~50 inline `if not is_admin(...)` blocks (deliberately overriding the old "don't DRY" convention).
- **Order:** `@conditional_csrf → @api_view → @admin_or_permission/@admin_only → @block_viewer_writes → def`.
- Bespoke gates (e.g. Refunds' non-admin own-data) keep custom logic + are allow-listed in the CI guard. Background jobs use a Staff-object permission helper (fresh, not session-cached).

### 6.2 What becomes permission-based
**Grantable → `@admin_or_permission`:** Finance (all), Dashboard, Meetings, Coordinator Chat/Reports, Notifications, Reports, Audit-view. **Stays `@admin_only`:** the access screen + System Management / staff writes.

### 6.3 Migration safety (D19, D20) — no shadow, no deny-by-default
- **All-or-nothing cutover.** No shadow/observation phase (user decision).
- **Deny-by-default is skipped** — it does not fit this app (§6.4). Instead, three concrete safety nets:
  1. **Hardened Django admin (§11)** — closes the real parallel mutation surface Liam's "blind spot" concern was about.
  2. **CI guard (§14)** — deterministic, deploy-blocking; checks decorator **presence + order + declared coverage**. This — not "the AI won't forget" — is what guarantees no gate is missed on the `@api_view` surface.
  3. **Negative per-gate tests (§17)** — every migrated gate asserts **both** "intended role in" **and** "unauthorized role denied", and the `(resource, action)` mapping is verified (a typo maps a gate to a perm nobody has = lockout, or everyone has = opened).

### 6.4 Why not DRF deny-by-default
`DEFAULT_AUTHENTICATION_CLASSES = []` ⇒ `request.user` is always `AnonymousUser`, so a DRF `IsAuthenticated`/deny default
would 403 valid sessions too. Making it work would need a custom DRF auth shim over the existing session (touches the auth
path) — and it still would not cover Django admin. The Django-admin hardening + CI guard address the actual risk more directly.

---

## 7. Capability permissions (D)

- ~15 name-lookups (coordinator notifications, auto-assignment, review-task creation, digests) use a role **name** as a capability proxy with no permission behind it.
- Add ~5 grantable **capability resources** (not admin-defining): `volunteer_coordination`, `families_coordination`, `tutored_families_coordination`, `review_task_assignee`, `coordinator_digest_recipient`.
- **Seed onto existing named roles for exact back-compat**, then rewrite routing to "roles holding capability C". Custom roles can then be granted these.
- **Golden-master back-compat (Liam R2 #6):** capture today's routing output per role and assert byte-identical after seeding.
- **Deploy order:** seed capabilities **before** switching routing to read them, same migration/transaction, idempotent — else a window drops notifications.
- **Confirm pure-routing:** verify none of the ~5 capabilities also gate a sensitive data read; if one does, it's a data-grant and gets the high-impact treatment.

---

## 8. TOTP hardening (D7) — Access-Management-only
- Additive, backward-compatible **`purpose` column** on `totp_codes` (default/nullable). Existing flows (login, registration-before-user-exists, staff-creation, email-change) create/validate without it → **unchanged**.
- Access step-up: issue `purpose='access_save'`; validate by **session user's email + purpose** (never a payload email); **invalidate prior unused codes**; rate-limited send.
- **The assignment-screen step-up uses a DISTINCT purpose** (e.g. `role_assign`) — never `access_save` (Liam R2 build-confirm).

## 9. Freshness (D14) — generic removal event
- Hang the session-kill off a **generic "permission-row-removed" event**, so **every** removal path triggers it — screen save, capability revoke, role delete (CASCADE), etc. — and none can be forgotten. Additions stay lazy (next login). No Redis, no `security_version`.

## 10. CSRF & SameSite (D15)
- **SameSite unchanged.** CSRF already enforced in prod via `@conditional_csrf` = `csrf_protect` + frontend `X-CSRFToken`. New endpoints inherit real token-based CSRF by using `@conditional_csrf`. Build-confirm the new `/api/access/*` endpoints carry it and the SPA sends the header on them.

## 11. Django admin hardening (D21) — ✅ DONE (shipped separately, PR #511)
- **Not part of this build.** Found live and remediated ahead of the access-management work; documented here only for the audit trail.
- **What was found:** `/admin/` was routed and `admin.py` registered `Role`, `Permissions`, `Staff` (+ PII) → full CRUD around the firewall. A live prod check found exactly one Django superuser, `amit_admin` (is_superuser/is_staff, dormant since 2025-10-12).
- **What shipped:** (1) `amit_admin` disabled in prod (`is_active/is_staff/is_superuser = False`) — immediate key removed; (2) `childsmile_app/admin.py` now registers **no** models and **unregisters** the built-in `User`/`Group` admin (broadly guarded so it can't break startup), so `/admin/` exposes nothing and cannot mint a superuser; `django.contrib.admin` + the `/admin/` route are kept (OAuth-safe — `/admin/` is nowhere in the allauth `/accounts/` flow or the `/#/google-success` redirect). `version.txt` → 26.08.1.0.
- **Verified:** OAuth-created `auth.User` rows are `is_staff=False` (data-confirmed); `amit_admin` was the only staff/superuser and is now disabled.

## 12. Reserved names, i18n, XSS
- **`RESERVED_ROLE_NAMES`** = the ~11 seed names, **bilingual**. Reject on create/rename — UI ("system reserved name") **and** backend (any caller) — applied to **`role_name` AND `name_he`/`name_en`** (Liam R2 #3: block impersonation via the translation fields).
- **Normalization (RN4):** NFKC + Unicode case-fold + trim/collapse-whitespace + strip bidi/RTL marks + strip Hebrew niqqud — applied identically to input, the reserved list, and the translations, on create and any translation edit.
- **Bilingual names:** new `role_name_translations` table (`name_he`, `name_en`); seeds prepopulated; `role_name` stays the canonical key (custom = typed English or `newroleN` fallback). Matrix shows both columns.
- **XSS/charset:** both name fields — Hebrew + Latin letters, digits, space, hyphen; reject HTML/control chars; escape on every render surface (matrix, Audit Log, emails, exports, non-React).

## 13. DB / SQL (F) — new files only (D17)
- `add_role_name_translations_table.sql` (+ seed prepopulation) · `add_totp_purpose_column.sql` · `add_coordinator_capability_permissions.sql` (~5 resources + back-compat seed grants) · `grant_viewer_new_access_resources.sql` (Viewer parity, idempotent — not a re-run) · `add_access_management_audit_translations.sql` (`CREATE_ROLE`/`UPDATE_ROLE`/`DELETE_ROLE`/`SAVE_ROLE_PERMISSIONS` + failures) · new admin-grant file if needed. Bump `version.txt` (month = **08**).

## 14. CI guard (G) — extend `check_viewer_guards.py` (D18)
- Keep the `@block_viewer_writes`-on-writes assertion.
- **New:** every admin-gated endpoint uses `@admin_only`/`@admin_or_permission` (flag surviving raw inline `is_admin`/ungated writes); **assert decorator ORDER, not just presence**; **declare the coverage model** (what it scans — `@api_view` — and that anything outside it, e.g. Django admin, is handled by §11). Fails the deploy `guard-check`, with an allow-list for bespoke/public endpoints.

---

## 15. Liam findings → resolutions (both rounds)

| Round / finding | Resolution |
|---|---|
| R1 #1 DRF viewsets | Deleted (D16). |
| R1 #2 Freshness | Session-kill on removal; generic event (D14, §9). |
| R1 #3 TOTP purpose/session-bind/invalidate | Done, access-scoped; assignment uses a distinct purpose (§8). |
| R1 #4 Per-cell deltas | Adopted (D2, §5.3). |
| R1 #5 Protect all seed roles | Done, incl. delete regardless of assignment (D6). |
| R1 #6 Role-name XSS | Charset + escape everywhere (§12). |
| R1 #7 Admin-minting via assignment | TOTP step-up on the assignment screen (D22). |
| R1 #8 Disable strips roles | Already; build-confirm (§2.9). |
| R1 8.9 CSRF | Already enforced; no SameSite change (§10). |
| **R2 #1 Fail-closed migration** | Django-admin hardening + CI guard (order+coverage) + negative tests; **no** shadow, **no** DRF deny-by-default (doesn't fit; §6.3–6.4). |
| **R2 #2 Firewall config immutable** | Code-constants, never runtime-mutable (§4). |
| **R2 #3 Reserved names on translations** | Applied to `name_he`/`name_en` too (§12). |
| **R2 #4 CI guard order + coverage** | Asserted (§14). |
| **R2 #5 Negative per-gate tests** | In the test plan (§17). |
| **R2 #6 Capability seeding** | Golden-master + seed-before-switch + pure-routing (§7). |
| **R2 #7 Restore re-validates** | **N/A — no restore** (D4). |
| **R2 #8 Freshness generic event** | Done (§9). |
| **R2 (new) Django admin backdoor** | ✅ **Shipped separately** (PR #511, v26.08.1.0): `amit_admin` disabled + admin registers nothing. Not part of this build (§11). |

---

## 16. Static-PT scenario catalog

Round-1 (A/P/D/T/R/F/C/I/M) + Round-2 (FW firewall, MG migration, CAP capabilities, RN reserved names) all carry, updated
by the resolutions above. **DA — Django admin (✅ already shipped, PR #511):** DA1: CRUD `Role`/`Permissions`/`Staff` via `/admin/`
⇒ no models registered ⇒ nothing to edit. DA2: an OAuth-created `auth.User` is not `is_staff` ⇒ can't reach `/admin/` (data-confirmed).
DA3: the only superuser was `amit_admin`, now disabled. Firewall FW1–FW6 hold given code-constant config (§4). Migration MG2 now
backed by the CI guard + the (already-shipped) Django-admin fix rather than deny-by-default.

## 17. Verification / test plan
1. Python `ast`/`py_compile` on all new/edited `.py`.
2. `check_viewer_guards.py` (extended) exits 0 — presence + **order** + coverage.
3. **Negative + positive per-gate tests** for every converted `is_admin` gate; verify each `(resource, action)` mapping.
4. Firewall: no `ADMIN_DEFINING` grantable; System Administrator perms immutable; reserved names rejected (UI + API, all three name fields); enforced for an admin caller too; config is code-only.
5. Django admin (✅ already shipped, PR #511 — not this build): `/admin/` exposes no models; `amit_admin` disabled; OAuth users `is_staff=False` (verified).
6. Screen: per-cell delta save inserts/deletes exactly the deltas, scoped + atomic; preview matches applied; empty save no-op; **no restore path exists.**
7. Custom "Finance Manager" reaches finance and nothing else; capability grant/revoke changes routing; **golden-master back-compat** byte-identical after seeding.
8. Freshness: any permission removal (save, capability revoke, role delete) kills affected sessions; additions lazy.
9. Viewer read-only; audit shows every action + diff + snapshot.
10. `version.txt` bumped; all **new** SQL applied (no re-runs).
11. Build-confirms: disable strips the admin role; `/api/access/*` carry `@conditional_csrf` + `X-CSRFToken`; assignment step-up uses a distinct TOTP purpose. (The Django-admin / superuser item is already done — PR #511.)

## 18. Out of scope / accepted risks
- **No DB restore** — recovery from a mistaken removal is a manual re-grant via the screen using the audit snapshot (accepted).
- **No shadow phase** — hard cutover; the CI guard + negative tests are the safety net (accepted).
- **DRF deny-by-default skipped** — doesn't fit custom session auth; the real blind spot (Django admin) is closed directly (documented risk-acceptance).
- No change to authentication, sessions, or the trust model beyond the additive TOTP `purpose` column. No Redis/JWT/PASETO/`security_version`.
- Assignment of the real System Administrator role stays on System Management (TOTP-gated) — the single admin-minting path.
- Mobile UI (desktop-only). Role soft-delete (guarded hard-delete + snapshot instead).

## 19. Build-time confirmations (must verify during implementation)
1. `deactivate_staff` removes the `System Administrator` role (not just adds `Inactive`).
2. The new `/api/access/*` endpoints carry `@conditional_csrf`, and the SPA sends `X-CSRFToken` on them.
3. The assignment-screen step-up uses a TOTP `purpose` distinct from `access_save`.
4. ✅ DONE (PR #511): OAuth-created `auth.User` rows are `is_staff=False` (data-confirmed) and the only superuser (`amit_admin`) is disabled.
5. None of the ~5 capability resources gate a sensitive data read (pure routing).
