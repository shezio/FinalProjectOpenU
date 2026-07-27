# Color Rebrand Plan — System → "A Child's Smile" (חיוך של ילד) NPO palette

> **Status:** Approved, ready for implementation.
> **Brand source:** live NPO site `https://achildssmile.org.il` → Elementor kit stylesheet
> `wp-content/uploads/elementor/css/post-41.css` (`elementor-kit-41`). These are the *exact*
> brand hex values, not guesses.
> **Companion file:** `COLOR_REBRAND_MOCKUP.html` (open in a browser to see before/after).

---

## ⭐ NEXT SESSION — START HERE
1. Open **`COLOR_REBRAND_MOCKUP.html`** in a browser to review the look (before indigo vs after brand).
2. Tweak the swap table below if any color feels off.
3. Execute the hex swap (Steps 1–6). Then run the verification grep + frontend build.

---

## User decisions (locked)
1. **Main gradient** → SKY-BLUE → TEAL (`#6EC1E4` → `#3BC1C8`).
2. **Approach** → DIRECT HEX SWAP ONLY (no CSS variables / design tokens).
3. **Scope** → EVERYTHING: frontend app + backend email/PDF/image generators + repo-root HTML docs + PWA.
4. **Status colors** → KEEP semantic green / red / amber; only rebrand the indigo/purple THEME.

### ⭐ COLOUR PHILOSOPHY (refined 2026-07-27, from the live site + user)
- **TEAL is the MAIN colour** (`#3BC1C8` / `#65BEC6`, with sky `#6EC1E4` as its lighter partner).
  ALL big surfaces — headers, sidebar, grid headers, primary buttons — are teal / sky.
- **PINK (`#ED3B97`) is a SEPARATOR / accent ONLY** — the lower edge of headers, heading
  underlines, dividers, and the occasional donate-style CTA. NEVER a main fill or a gradient
  stop on a large surface. (On achildssmile.org.il the teal hero carries only a thin pink
  underline; pink otherwise appears just on the “תרמו” donate button.)
- Therefore indigo/purple (incl. `#a855f7`) maps to **TEAL**, not pink. Pink is applied
  deliberately as separators — it is not a swap target for large surfaces.

---

## Exact brand palette (from the site)
| Swatch | Hex | Role on the NPO site |
|---|---|---|
| Sky blue | `#6EC1E4` | `--e-global-color-primary` (icons) |
| Teal | `#3BC1C8` | brand teal |
| Teal (header bar) | `#65BEC6` | header top-bar background |
| Hot pink / magenta | `#ED3B97` | signature "חיוך" wordmark |
| Pink (donate) | `#DB4B95` | donate button |
| Light pink | `#F8C3D0` | social-icon hover |
| Golden yellow | `#FCD20E` | "של ילד" wordmark |
| Orange | `#F26722` | nav hover / accent |
| Peach | `#FFBC7D` | page-transition |
| Navy (text) | `#143852` | body text (language switcher) |
| Secondary gray | `#54595F` | secondary text |
| Text gray | `#7A7A7A` | body text |
| White | `#FFFFFF` | backgrounds |

Fonts (FYI, **not** in scope): Fredoka (headings), Roboto (body), Roboto Slab.

---

## Current theme being replaced
- **No CSS variables anywhere** — ~900+ hardcoded hex across the codebase.
- Dominant theme = **indigo → purple**:
  - Signature gradient `linear-gradient(135deg, #667eea 0%, #764ba2 100%)` (headers, buttons, many pages).
  - Family: `#6366f1`, `#4f46e5`, `#4338ca`, `#7c3aed`, `#8b5cf6`, `#a855f7`, `#5b21b6`, `#764ba2`, `#667eea`.

---

## FINAL 1:1 swap table (current → brand)

### Theme gradient + blues
| Current | → Brand | Note |
|---|---|---|
| `#667eea` | `#6EC1E4` sky | gradient start / primary |
| `#764ba2` | `#3BC1C8` teal | gradient end |
| `#8f75ef` | `#6EC1E4` sky | reports gradient variant |
| `#183ee8` | `#6EC1E4` sky | tutorship_pending gradient start |

### Solid accents
| Current | → Brand | Note |
|---|---|---|
| `#6366f1` | `#3BC1C8` teal | primary solid accent (borders/icons/buttons) |
| `#8b5cf6` | `#6EC1E4` sky | gradient partner + charts |
| `#7c3aed` | `#3BC1C8` teal | action buttons / coordinator accent |
| `#a855f7` | `#3BC1C8` teal | was pink — now TEAL (pink is separator-only; see Colour Philosophy) |

### Dark accent TEXT (need contrast → brand navy)
| Current | → Brand |
|---|---|
| `#4f46e5` | `#143852` |
| `#4338ca` | `#143852` |
| `#5b21b6` | `#143852` |
| purple badge text `#4527a0` `#283593` `#7e22ce` `#5e35b1` `#6d28d9` `#5a3d8c` | `#143852` |

### Pale tints (backgrounds)
| Current | → Brand |
|---|---|
| indigo pales `#eef0ff` `#eef2ff` `#e0e7ff` `#f0f4ff` | `#E3F4FA` light sky |
| violet pales `#ede9fe` `#f5f3ff` `#f3e8ff` `#ddd6fe` `#ede7f6` `#e8eaf6` | `#EAF7F8` light teal |

### rgba equivalents (box-shadows) — must swap too
| Current | → Brand |
|---|---|
| `rgba(102,126,234,a)` [=`#667eea`] | `rgba(110,193,228,a)` |
| `rgba(118,75,162,a)` [=`#764ba2`] | `rgba(59,193,200,a)` |
| `rgba(99,102,241,a)` [=`#6366f1`] | `rgba(59,193,200,a)` |

### ⭐ Table / grid HEADERS → TEAL (override — added 2026-07-27)
EVERY table/grid column-header (`thead th` / `.*-data-grid th` / `.*-table th`) background → TEAL,
regardless of its current colour. Real headers are mostly solid green `#4CAF50` (feedbacks, audit-log,
reports `.data-grid th`, tutorships) or navy→blue `linear-gradient(#1a3a5c,#2a5298)` (reviewer);
Families/refunds/etc were indigo (already mapped to teal). Use SOLID `#3BC1C8` where the header was a
solid colour, or `linear-gradient(135deg,#3BC1C8,#6EC1E4)` where it was a gradient (matches the Families
grid). Also recolor that grid's green zebra/hover tints (`rgba(76,175,80,a)`→`rgba(59,193,200,a)`).
Applies on DESKTOP + MOBILE + report grids + PDF/Excel/image EXPORTS (see Exports below).

### KEEP — do NOT touch (semantic / categorical)
`#10b981` green, and `#4caf50` green ONLY as buttons/success/status/active/clock (NOT as a grid header —
those → teal) · `#ef4444` `#ff6b6b` red · `#f59e0b` `#ffa726` amber · `#3b82f6` blue (except table
headers → teal) · `#06b6d4` `#26c6da` cyan · `#14b8a6` teal-status.

### Charts (JS palettes)
In `DashboardCharts.js` and `export_utils.js` COLORS arrays: swap ONLY the indigo/purple entries
(`#667eea` `#764ba2` `#6366f1` `#8b5cf6` `#a78bfa` `#ab47bc` → sky / teal / `#65BEC6` / yellow — pink
only as an occasional accent, not a main series colour); keep the other hues for categorical contrast.

### ⭐ EXPORTS — PDF / Excel / image (headers → teal)
`components/export_utils.js`:
- jsPDF autotable `headStyles.fillColor`: `[76,175,80]` (green) AND `[59,130,246]` (blue) AND
  `[99,102,241]` (indigo) → `[59,193,200]` (teal #3BC1C8). (lines ~517,636,775,905,1068,1248,1431,
  1470,1919,2230,2359.)
- Excel/image header cell `color:"#4caf50"` (~117,257) → `#3BC1C8`; `ctx.fillStyle='#6366f1'`
  (~1795,1818,2123,2137) → `#3BC1C8`; COLORS arrays indigo/purple → teal/sky.
Backend PDF/image generators: `refund_views.py` reportlab header `HexColor('#6366f1')` → `#3BC1C8`;
`dashboard_services.py` PIL fills `#667EEA`→`#6EC1E4`, `#8B5CF6`→`#3BC1C8`, `#E0E7FF`→`#E3F4FA`.
Any other report PDF generator that sets a header fill → teal.

### PWA theme-color
`index.html` + `manifest.json` `#6366f1` → `#3BC1C8` (match new header). *(minor — recommended)*

### Login wordmark "חיוך של ילד" — restyle to match the official logo
The login screen renders `<span class="amit-title">{t("Amit's Smile")}</span>` where
`"Amit's Smile" = "חיוך של ילד"` (i18n.js L769). Today it is GREEN + 3‑D tilted:
`styles.css .login-main-content .amit-title { color:#1da821; transform:rotateX(-15deg) }`
(and `.login-main-content .curved-text { fill:#1da821 }`). **Restyle it to look like the brand
logo:** **teal letters** (`#3BC1C8` / `#65BEC6`) with a **single pink curved "smile" underline**
(`#ED3B97` / `#DB4B95`) beneath the wordmark — the exact "teal text + pink separator" rule.
Drop the green `#1da821` and (optionally) the `rotateX` tilt. Apply in **both** `styles.css`
and the mobile rule `mobile.css .login-main-content .amit-title`.

### ⚠️ mobile.css — MUST be in scope (do NOT skip)
`styles/mobile.css` is ONE big `@media(max-width:767px)` block and carries its OWN hardcoded
theme hex (e.g. `#6366f1` at ~L1430–1431 color/border-bottom) PLUS all the login-page mobile
rules (`.login-main-content .amit-title`, `.header`, etc.). Sweep it with the same swap table,
and apply the login-wordmark restyle here too.

---

## Full file list (by area)

**Frontend CSS (~28):** `components/AIChatBot.css`, `AIVideoGenerator.css`, `DashboardCharts.css`;
`pages/Dashboard.css`; `styles/{CelebrationEffect, CoordinatorChat, activityboard, activitysignup,
families, financeoverview, financialaid, meetingManagement, mobile, notificationMessages,
ongoingexpenses, pettycash, refunds, registration, reports, reviewer, systemManagement, tasks,
tut_vol_mgmt, tutorship_pending, tutorships, voucherquestionnaire, vouchers,
families_missing_data_report}.css` (+ `styles.css` / `common.css` if any theme hex is there).

**Frontend JS:** `components/DashboardCharts.js`, `components/export_utils.js` (2 COLORS arrays +
`ctx.fillStyle`), `pages/FinanceOverview.js` (`#8b5cf6`), `pages/SystemManagement.js` (~L1688 inline),
`pages/Tasks.js` (~L1166 inline).

**Frontend public / PWA:** `public/index.html` (theme-color), `public/manifest.json` (theme_color),
`public/DASHBOARD_INTERACTIVE_DEMO.html`, `PWA_CHANGES_REVIEW.html`.

**Backend Python (email / PDF / image generators):**
`childsmile_app/dashboard_services.py` (PIL fills `#667EEA` / `#8B5CF6` / `#E0E7FF`),
`meeting_notifications.py` (`#764ba2`), `task_views.py` (email HTML `#667eea` + `#f0f4ff`),
`refund_views.py` (reportlab `#6366f1`).

**Repo-root HTML docs (~13+):** `1/2/3-email-*.html`, `coordinator_approval_email.html`,
`admin_approval_email.html`, `AUTO_CHANGES_EDIT_FAMILY_HE.html`, `CITY_MATCHING_REPORT_HE.html`,
`EMAIL_CHECKLIST.html`, `prod deploy guide.html`, `SUMMARY_IMPORT_FIX_HE.html`, `USE_CASES_HE.html`,
`guide_coordinators_activities_he.html`, `missing_review_talks.html`, `tasks_with_notifications_mockup.html`.
*(grep both hex + rgba forms to catch all.)*

---

## Execution steps
1. **Frontend CSS** swap (per table) across all `styles/*.css` + `components/*.css` + `pages/*.css`.
   Include gradients (both directions) + rgba shadow equivalents.
2. **Frontend JS** swap: inline styles (SystemManagement / Tasks / FinanceOverview) + chart palettes
   (DashboardCharts.js, export_utils.js) — indigo/purple entries only.
3. **PWA**: `index.html` theme-color + `manifest.json` theme_color → `#3BC1C8`.
4. **Backend generators**: dashboard_services.py, meeting_notifications.py, task_views.py, refund_views.py.
5. **Repo-root HTML docs**: apply same table (hex + rgba).
6. **Verify**:
   - `grep` the whole repo for every old hex + rgba form → expect **0 matches** outside the KEEP list.
   - Build the frontend (`npm run build` in `childsmile/frontend`) → no errors.
   - Visual spot-check: Dashboard header/cards, a primary button, a status badge (still green/red/amber),
     one rendered email template, one exported PDF/dashboard image.

---

## Further considerations
1. **PWA/mobile theme-color** (status-bar tint) — recommend teal `#3BC1C8`; alt pink `#ED3B97` for more pop.
2. **Backend generators** produce branded emails/PDFs/dashboard images — included here (they fall under "emails").
3. **More vibrancy?** The swap is calm/blue-forward. Optionally accent primary CTAs in signature pink
   `#ED3B97` or headings with yellow `#FCD20E` underlines — say the word and it folds into the table.
