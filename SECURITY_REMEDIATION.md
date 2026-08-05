# Security Remediation — from the 2026-08-04 codebase scan

**Handle:** 2026-08-05 (nothing below is a live emergency)
**Scope:** items *outside* the Access Management plan (`accessmgmtplan.md`). The Django-admin backdoor found the same night was already remediated (PR #511 — `amit_admin` disabled + admin registers nothing).

> **Overall verdict:** no actively-exploitable emergency. The codebase shows solid prior hardening (rate limiting, CSP, HSTS, `SameSite=Lax`, no hardcoded secrets). The items here are routine hygiene, prioritized.

> **📌 Status (2026-08-05): the agreed security work is DONE.** P1 fixed in Azure; P2 + P3 applied and **verified locally** — the only remaining step is merging `desktop` → `main` to deploy them. P4 declined; `Pillow` deferred (unused AI-video feature). After the merge, this track is closed for now.

## ✅ Agreed actions (decided 2026-08-05)

| Item | Decision |
|---|---|
| **P1** `SECRET_KEY` | ✅ **DONE** — strong `SECRET_KEY` App Setting set in Azure + verified (no longer the fallback); no code change. |
| **P2** dependency CVEs | ✅ **APPLIED + verified locally** — 10 packages bumped; deploys on merge to `main`. |
| **P3** AI-chat XSS (DOMPurify) | ✅ **APPLIED** — DOMPurify sanitization added; deploys on merge (moot only if the PO later retires the AI feature). |
| **P4** low / defensive | ⛔ **DECLINED / parked** — enum allow-list (safe today), `CSRF_COOKIE_SECURE` (HSTS already covers it), file-upload review (a note, not a finding). |

> Anything not listed above stays on hold pending Liam's input. This doc is updated **only** on what's explicitly agreed.

---

## P1 — Production `SECRET_KEY` is the public fallback (CONFIRMED) — ✅ DONE

- **Status: ✅ FIXED (2026-08-05)** — a fresh `SECRET_KEY` App Setting was added in Azure and verified after restart (`settings.SECRET_KEY[:6]` no longer returns `fallba`). Env-var only; no code change.
- **Finding:** [settings.py](childsmile/childsmile/settings.py#L30) — `SECRET_KEY = os.getenv("SECRET_KEY", "fallback-secret")`. A prod shell check (`settings.SECRET_KEY[:6]` → `fallba`) confirmed the `SECRET_KEY` env var was **not set** in Azure, so prod was running on the public string `"fallback-secret"`.
- **Actual exploitability here: LOW.** The usual `SECRET_KEY` attack vectors are all absent in this architecture:
  - DB-backed sessions → session cookie is a random key, **not** signed with `SECRET_KEY` (no session forgery).
  - Cookie-based CSRF uses a random per-cookie secret, **not** `SECRET_KEY` (no CSRF forgery).
  - Passwordless TOTP login + email verification off + **no `django.core.signing` usage anywhere** (no signed-token / password-reset forgery).
- **Why fix promptly anyway:** it's a known/public key in prod, and it becomes immediately exploitable the moment anyone adds signed URLs / magic links / signed-cookie sessions.
- **Agreed fix — Azure env var ONLY (no code change; ≈5 min, does NOT log users out; sessions are DB-keyed):**
  1. Generate a **fresh** key — in the Azure shell or locally — and never paste it into chat, a commit, or a log:
     `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"`
  2. Azure Portal → App Service **`child-smile-app`** → **Settings → Environment variables** → add application setting `SECRET_KEY=<generated>` → **Save** (restarts the app).
  3. Verify after restart: `python manage.py shell -c "from django.conf import settings; print(settings.SECRET_KEY[:6])"` → must NOT be `fallba`.
- **Declined (2026-08-05):** the code-level fail-loud hardening (raising if `SECRET_KEY` is unset in prod). `settings.py` is intentionally left untouched; can be revisited later if desired.
- **Note:** rotating invalidates in-flight CSRF tokens — a user mid-form may need one refresh. Negligible.
- **If the repo is public:** do this first thing (the fallback value is published).

---

## P2 — Outdated dependencies with known CVEs

| Package | Pinned | Issue | Target |
|---|---|---|---|
| `Django` | 5.1.1 | behind many 5.1.x security releases (DoS fixes, etc.) | latest 5.1.x |
| `urllib3` | 2.0.3 | CVE-2023-45803, CVE-2023-43804 (data leak on redirect) | ≥ 2.0.7 |
| `requests` | 2.31.0 | CVE-2024-35195 (`verify=False` persists across a Session) | ≥ 2.32.2 |
| `certifi` | 2023.11.17 | compromised root CA removed in 2024.7.4 | latest |

- **Status: ✅ APPROVED + APPLIED (2026-08-05).**
- **Audit:** ran `pip-audit` on both requirements files. The **root** `requirements.txt` is the deployed one; `childsmile/requirements.txt` is an unused leftover freeze (bumped in sync anyway). The audit flagged **more than the original 4** — user approved **Tier A+B+C**.
- **Applied (10 packages, in BOTH files, resolution verified via a `pip-audit` re-run):** `Django` 5.1.15 · `urllib3` 2.7.0 · `requests` 2.33.0 · `certifi` 2024.7.4 · `cryptography` 50.0.0 · `django-allauth` 65.14.1 · `PyJWT` 2.13.0 · `python-dotenv` 1.2.2 · `idna` 3.15 · `pytest` 9.0.3. Backups: `requirements.txt.bak-20260805`, `childsmile/requirements.txt.bak-20260805`. `version.txt` → `26.08.2.0`.
- **⚠️ Deferred — `Pillow` (left at 10.3.0):** its CVE fixes exist only in 12.x, but `python-pptx==0.6.21` + `moviepy==2.2.1` hard-cap it below 12 (a build-breaking conflict). Needs a coordinated video-stack upgrade — tied to the PO's decision on the AI-video feature. Tracked, not done.
- **Out of scope — transitive (`jinja2`, `click`, `filelock`):** Tier D, not pinned in the file; fix via parent upgrades later.
- **✅ Verified locally (2026-08-05):** installed the bumped versions locally and exercised the risk surface — Google + TOTP login, a finance refund approval that sent a WhatsApp (the `requests`/`urllib3`/`certifi`/`cryptography` TLS stack), and the audit log — all work on the new versions. `pytest` was skipped (not imported by the app; dev-only). **Remaining step: merge to `main`** (`version.txt` already `26.08.2.0`).

---

## P3 — AI chat renders model output as raw HTML (potential XSS)

- **Finding:** [AIChatBot.js](childsmile/frontend/src/components/AIChatBot.js#L283) and [AIVideoGenerator.js](childsmile/frontend/src/components/AIVideoGenerator.js#L146) use `dangerouslySetInnerHTML={{ __html: msg.text }}` on AI/chat text with no sanitization. Prompt-injection or malicious content in the model output could execute script in an admin/coordinator's browser.
- **Severity:** medium; audience is admin/coordinator-gated. Real-world impact depends on the **frontend host's CSP** (the Django `CspMiddleware` only covers API responses, not the SPA document) — verify the static-web-app CSP forbids inline script.
- **Fix:** sanitize before rendering — `DOMPurify.sanitize(msg.text)` (keeps formatting), or render as escaped text / via a markdown renderer that escapes HTML.
- **Status: ✅ APPROVED (2026-08-05)** — moot if the PO retires the AI feature (see `AI_CHATBOT_PRODUCT_REVIEW_HE.html`). Sanitize now as a safety net; revisit if the feature is removed.

---

## P4 — Low / defensive hardening

- **Status: ⛔ DECLINED / parked (2026-08-05)** — none is worth the change now (reasons per item below); no code touched.
- **Latent SQL f-string:** [utils.py `get_enum_values`](childsmile/childsmile_app/utils.py#L241) f-strings `enum_type` into raw SQL. Safe today (all callers pass hardcoded `"marital_status"`/`"tutoring_status"`/`"status"`), but add an **allow-list** of permitted enum-type names to prevent a future injection.
- **`CSRF_COOKIE_SECURE`:** not set → Django default `False`. Set `CSRF_COOKIE_SECURE = True` in prod (`SESSION_COOKIE_SECURE` + HSTS are already on).
- **Finance file uploads (Azure blob):** schedule a review of content-type/size limits and filename handling (not deep-audited in this scan).

---

## Already well-handled (no action needed)

- **No hardcoded secrets** in app code.
- **Rate limiting** (`@ratelimit key='ip' 5/m block=True`) on every auth/TOTP/registration/public endpoint → 6-digit TOTP brute-force mitigated.
- Raw SQL is **parameterized** (`is_admin`) or hardcoded-input; `subprocess` (weekly digest `git log`) uses **list args, no shell**.
- **CSP middleware**, **HSTS**, `SameSite=Lax`, `SESSION_COOKIE_SECURE`, `@block_viewer_writes` + the `check_viewer_guards.py` CI gate.
- **Django admin backdoor** closed (PR #511; `amit_admin` disabled).

---

## Not covered by `accessmgmtplan.md`

Everything above. The Access Management plan covers role/permission authorization, the anti-escalation firewall, and role-name XSS — it does **not** cover dependency CVEs, the `SECRET_KEY`, the AI-chat HTML rendering, or the P4 items. Keep these two tracks separate.
