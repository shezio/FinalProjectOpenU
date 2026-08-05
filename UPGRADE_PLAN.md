# Dependency Upgrade Plan — split by urgency

**Date:** 2026-08-05 · **Mapped from the actual codebase.** Companion to `SECURITY_REMEDIATION.md`.

Split into two tiers:
- **Tier 1 — MUST DO (security):** the requirements security bumps we already applied → verify + deploy, fix whatever those bumps break, plus the one security hole still open.
- **Tier 2 — NICE TO HAVE (can wait ~a year):** getting off old versions for currency's sake — React 17→19, Django 5.2, latest everything, build toolchain. **Not** security-forced.

---

## Status at a glance

> **✅ TIER 1 IS DONE AND VERIFIED LOCALLY (2026-08-05).** Applied + tested; the only remaining step is the merge to `main` (which deploys it). Tier 2 is the "next year" work.

| Tier | What | Status |
|---|---|---|
| **1A** | Security dep bumps (Django 5.1.15, cryptography 50, requests, urllib3, certifi, allauth, PyJWT, …) | ✅ **Applied + verified locally** — deploys on merge |
| **1B** | Confirm nothing broke (login, finance + WhatsApp, audit log) | ✅ **Verified locally — all checks passed** |
| **1C** | Pillow CVE — still open, blocked by the video stack | ⏸ **Parked** (unused feature — a decision, not urgent) |
| **2** | React 19, Django 5.2, latest deps, build toolchain, apscheduler | 🟢 **~1 year, whenever** |

**Reassuring truth (confirmed):** the security bumps were chosen deliberately *within* their major version (or are transitive-only), so structural breakage was minimal — and local testing bore this out: Google + TOTP login, a finance approval with WhatsApp, and the audit log all work on the new versions. No code rewrites were needed.

---

# TIER 1 — MUST DO (security-driven) ✅ DONE (verified locally 2026-08-05)

## 1A. Security bumps applied ✅ + verified locally — pending merge

Applied to **both** `requirements.txt` (root = the deployed file) and `childsmile/requirements.txt`; verified clean by a `pip-audit` re-run + an import smoke test, then **confirmed live locally** (cryptography 50, allauth 65.14.1, requests 2.33 all running).

| Package | From → To | Type | Why (security) |
|---|---|---|---|
| Django | 5.1.1 → **5.1.15** | patch | Accumulated 5.1.x security releases (strip_tags DoS, IPv6 DoS, …) |
| cryptography | ~46 → **50.0.0** | **major** (transitive) | Transitive CVE fixes; no direct import in app code |
| urllib3 | 2.0.3 → **2.7.0** | minor (transitive) | CVE-2023-45803 / -43804 (redirect + cookie leak) |
| requests | 2.31.0 → **2.33.0** | minor | CVE-2024-35195 |
| certifi | 2023.11.17 → **2024.7.4** | data | Removed compromised GLOBALTRUST CA |
| django-allauth | → **65.14.1** | patch | Latest 65.x security/fixes |
| PyJWT | → **2.13.0** | patch (transitive) | Latest 2.x |
| python-dotenv | → **1.2.2** | minor | currency |
| idna | → **3.15** | patch | currency |
| pytest | ~8 → **9.0.3** | **major** (dev only) | currency |

**Status:** committed on `desktop`, **verified locally**, **not yet merged**. Merging to `main` deploys these + the **P3 DOMPurify** XSS fix (`AIChatBot.js`, `AIVideoGenerator.js`) — frontend build verified clean.

## 1B. What the security bumps can break — ✅ verified locally (2026-08-05)

Only **two** bumps crossed a major version; everything else is within-major or transitive. **All checks below passed locally on the new versions.**

| Bump | Break risk | Remediation |
|---|---|---|
| **pytest 8 → 9** | **Dev/CI only** — pytest 9 dropped deprecated hooks/config; the *test suite* may need small fixes. **Zero prod runtime impact** (pytest isn't imported by the app). | Run `pytest`; fix any pytest-9 collection/config errors. |
| **cryptography ~46 → 50** | Transitive (used by allauth / TLS). No direct import in app code; smoke test passed. | Runtime-verify: Google/allauth login, outbound HTTPS (`requests`), Azure blob upload. No code change expected. |
| **django-allauth 65.x patch** | Adapter/template tweaks possible; app uses `CustomSocialAccountAdapter`. | Verify the Google login flow end-to-end. |
| everything else (Django patch, urllib3/requests/certifi/idna/dotenv) | Within-major / transitive → no API breakage. | Verify-only. |

**Pre-deploy checklist — ✅ completed locally (2026-08-05):**
1. ✅ *Skipped* `pytest` — it isn't imported anywhere in the app, so it can't affect the running system (dev-only; zero prod impact).
2. ✅ `python manage.py check` + the system boots locally.
3. ✅ Login **TOTP** + **Google OAuth** — both work (covers cryptography 50 + allauth + PyJWT).
4. ✅ Finance refund flow — receipt saved + **approval WhatsApp received** (covers the Twilio/HTTP → requests/urllib3/certifi/cryptography TLS stack). *Locally files save to disk, not Azure blob; the blob path is prod-only and rides the same now-proven stack.*
5. ✅ Audit log renders.
6. ⏭ **Remaining step:** `version.txt` already `26.08.2.0` → merge to `main` → deploys P2 + P3.

## 1C. Open security item — NOT resolved (blocked)

- **Pillow — kept at 10.3.0** (the CVE fix is only in 12.x). It is **blocked**: `python-pptx==0.6.21` + `moviepy==2.2.1` both hard-cap Pillow `<12`. Bumping Pillow alone breaks the build.
- **Bounded risk today:** Pillow is used **only** by the admin-only, effectively-unused AI video pipeline (`dashboard_services.py`) — not by any public or hot path.
- **Two ways to close it (a decision, not just a bump):**
  - **(a) Retire the AI feature** (pending the PO — `AI_CHATBOT_PRODUCT_REVIEW_HE.html`) → delete `Pillow` / `python-pptx` / `moviepy` / `gTTS` → **the CVE disappears with the code.** Cheapest.
  - **(b) Upgrade the video stack** (Pillow 12 + `python-pptx` 1.x + a `moviepy` that allows Pillow 12) → the Tier-2 "video stack" work below, tested end-to-end.

---

# TIER 2 — NICE TO HAVE (version currency, can wait ~a year)

None of this is security-forced. It's purely getting off old versions. Do it when there's appetite — nothing here is urgent, and prod runs fine without it.

## Frontend — React 17 → 19

**Good news (verified):** no `defaultProps` on function components, no `findDOMNode`, no legacy lifecycles (`componentWillMount`…), no string refs, no `StrictMode` gotchas anywhere in `src/`. React 19 codemods barely apply. Only **two** true blockers — the root API and `react-beautiful-dnd` — and both are trivial.

| Item | Where (files) | Change | Risk |
|---|---|---|---|
| Root API | `src/index.js` (`ReactDOM.render`, ~L70) | → `createRoot(...).render(...)` | Low |
| Drag-and-drop | `src/pages/Tasks.js` (only file) | `react-beautiful-dnd` → **`@hello-pangea/dnd`** (drop-in, same API, 1 import) | Low |
| Charts | `src/components/DashboardCharts.js` (only file) | `chart.js` 3→4 + `react-chartjs-2` 3→5 (config/plugin API changes) | Medium |
| Maps | `src/pages/Tutorships.js` + `src/pages/report_pages/families_per_location_report.js` | `react-leaflet` 3→5 (`MapContainer`/`TileLayer`/`Marker`/`Popup`/`Polyline`) | **Higher** — plugin risk below |
| Toasts | `src/index.js` (`ToastContainer`) + ~40 files use `toast.*` | `react-toastify` 8→11 (`toast.*` API stable) | Low–Med |
| Other UI libs | various | `react-modal`, `react-select` 5.x, `react-slider`, `react-switch`, `react-icons`, `i18next`, `emoji-picker-react` → latest | Low |
| Build toolchain | `package.json` devDeps | `@babel/*` 7.13→7.2x, `babel-loader` 8→9, `webpack` 5.24→5.9x, `webpack-cli` 4→5, **`webpack-dev-server` 3→5** (mismatched with webpack 5 today), `css-loader` 5→7, `style-loader` 2→4 | Medium |

**Biggest frontend risk:** `leaflet-image` + `leaflet-easyprint` (map export) are **unmaintained** — verify against newer leaflet or replace with `html2canvas` (already a dependency). React 19 uses the automatic JSX runtime, so the babel/webpack bump must land together with the React bump.

## Backend — Django 5.1 → 5.2 + latest deps (Python stays 3.11)

**Good news (verified):** no Django-removed-API usage anywhere (`index_together`, `USE_L10N`, `NullBooleanField`, Postgres CI fields, `force_text`/`ugettext`, legacy `url()`, `get_storage_class`, `django.utils.timezone.utc` — none). The only `.utc` is stdlib `datetime.timezone.utc`. → Django 5.1→5.2 is smooth.

| Item | Where | Change / risk |
|---|---|---|
| Django | whole app | 5.1.15 → **5.2.x LTS** + DRF 3.15→3.16. Low risk. |
| DB driver | requirements | `psycopg2` **and** `psycopg` (3) both pinned → drop `psycopg2`. Low. |
| Other deps | requirements | `twilio`, `pandas`, `openpyxl`, `XlsxWriter`, `azure-storage-blob` → minor bumps. Low. |
| Scheduler | `scheduler.py` | apscheduler 3.10 → **stay 3.11.x**. 4.x is a full async rewrite → **defer even within Tier 2.** |
| react-router | frontend | **stay 6.x** (works with React 19). v7 optional. |

---

## What we deliberately keep (and why)
- **Python 3.11** — supported to 2027; no urgency, avoids a large blast radius.
- **apscheduler 3.11.x** — 4.x is a rewrite; 3.x is fine and has no CVE.
- **react-router-dom 6.x** — already works with React 19.
- **`SESSION_COOKIE_SAMESITE = "Lax"`** — load-bearing (changing it once broke Google OAuth). Do not touch.
