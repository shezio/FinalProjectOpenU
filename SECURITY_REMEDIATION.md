# Security Remediation — from the 2026-08-04 codebase scan

**Handle:** 2026-08-05 (nothing below is a live emergency)
**Scope:** items *outside* the Access Management plan (`accessmgmtplan.md`). The Django-admin backdoor found the same night was already remediated (PR #511 — `amit_admin` disabled + admin registers nothing).

> **Overall verdict:** no actively-exploitable emergency. The codebase shows solid prior hardening (rate limiting, CSP, HSTS, `SameSite=Lax`, no hardcoded secrets). The items here are routine hygiene, prioritized.

---

## P1 — Production `SECRET_KEY` is the public fallback (CONFIRMED)

- **Finding:** [settings.py](childsmile/childsmile/settings.py#L30) — `SECRET_KEY = os.getenv("SECRET_KEY", "fallback-secret")`. A prod shell check (`settings.SECRET_KEY[:6]` → `fallba`) confirms the `SECRET_KEY` env var is **not set** in Azure, so prod runs on the public string `"fallback-secret"`.
- **Actual exploitability here: LOW.** The usual `SECRET_KEY` attack vectors are all absent in this architecture:
  - DB-backed sessions → session cookie is a random key, **not** signed with `SECRET_KEY` (no session forgery).
  - Cookie-based CSRF uses a random per-cookie secret, **not** `SECRET_KEY` (no CSRF forgery).
  - Passwordless TOTP login + email verification off + **no `django.core.signing` usage anywhere** (no signed-token / password-reset forgery).
- **Why fix promptly anyway:** it's a known/public key in prod, and it becomes immediately exploitable the moment anyone adds signed URLs / magic links / signed-cookie sessions.
- **Fix (≈5 min, low-disruption — does NOT log users out; sessions are DB-keyed):**
  1. Generate a key:
     `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"`
  2. Azure Portal → App Service **`child-smile-app`** → **Settings → Environment variables** → add application setting `SECRET_KEY=<generated>` → **Save** (restarts the app).
  3. Harden the code so it can never silently fall back in prod:
     ```python
     SECRET_KEY = os.getenv("SECRET_KEY")
     if not SECRET_KEY:
         if IS_PROD:
             raise RuntimeError("SECRET_KEY env var must be set in production")
         SECRET_KEY = "dev-only-insecure-key"
     ```
     (backend change → bump `version.txt`.)
  4. Verify after restart: `python manage.py shell -c "from django.conf import settings; print(settings.SECRET_KEY[:6])"` → must NOT be `fallba`.
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

- **Authoritative + complete list:** run **`pip-audit`** (backend) and **`npm audit`** (frontend), and enable **GitHub Dependabot** on the repo.
- **Fix:** bump the versions, run the test suite (`pytest`), deploy. Backend change → bump `version.txt`.

---

## P3 — AI chat renders model output as raw HTML (potential XSS)

- **Finding:** [AIChatBot.js](childsmile/frontend/src/components/AIChatBot.js#L283) and [AIVideoGenerator.js](childsmile/frontend/src/components/AIVideoGenerator.js#L146) use `dangerouslySetInnerHTML={{ __html: msg.text }}` on AI/chat text with no sanitization. Prompt-injection or malicious content in the model output could execute script in an admin/coordinator's browser.
- **Severity:** medium; audience is admin/coordinator-gated. Real-world impact depends on the **frontend host's CSP** (the Django `CspMiddleware` only covers API responses, not the SPA document) — verify the static-web-app CSP forbids inline script.
- **Fix:** sanitize before rendering — `DOMPurify.sanitize(msg.text)` (keeps formatting), or render as escaped text / via a markdown renderer that escapes HTML.

---

## P4 — Low / defensive hardening

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
