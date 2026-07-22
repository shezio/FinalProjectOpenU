Updated todo list

Here's a practical smoke-test checklist covering all the flows from this session. No need to be exhaustive — just confirm each line behaves as described.

## A. Public Activity Questionnaire (`/activity-questionnaire/<roundId>`, no login)
- [x] Open a link for an **open** round → form renders with the round name.
- [x] Open a link for a **closed** round (or bad id) → "הטופס אינו זמין" message.
- [x] Toggle **יום כיף ↔ ביקור בית** → type-specific fields swap (limitations/favorites vs siblings/address/preferred-days/safe-room).
- [x] Submit empty → errors on all required fields: type, **date**, child name, gender, age, city, phone (+ full address for house visit).
- [x] **Date (new):** clear it → "שדה חובה"; a real date clears the error; label shows `*`.
- [x] Phone: type letters/dashes → blocked to digits only; wrong length → "מספר טלפון לא תקין".
- [x] `ממ״ד` safe-room **switch** toggles כן/לא (house visit).
- [x] Valid submit → success screen → the request shows up on the coordinator board (status "ממתין לשיבוץ").
- [ ] **Mobile:** single column, logo/inputs/toggle/switch/errors readable.

## B. Coordinator Board (`/activity-board`, admin/coordinator only)
- [x] As coordinator/admin → sidebar shows **ימי כיף וביקורי בית** (🎈).
- [x] As a **pure volunteer** → board NOT in sidebar; typing `/activity-board` directly → "אין הרשאה".
- [x] Rounds: **create**, **edit**, **delete** (deletes its requests too). Round modal is the narrow one.
- [x] Open a round → requests list; **search** + filter by type/status; pagination arrows work.
- [x] Edit (✏️) → modal shows **read-only submission summary** + **multi-select team picker** listing all tutors+volunteers.
- [x] Pick several volunteers → status auto-flips to "משובץ"; save → table cell shows names + count.
- [x] Remove everyone from the team → save; set status to "הושלם"/"בוטל" manually → respected.
- [x] **Delete** a request works. Confirm there is **no "+ בקשה חדשה"** button (board is assignment-only).

## C. Volunteer Signup (`/activity-signup`, volunteer)
- [x] As volunteer → sidebar shows **שיבוץ לפעילויות** (🙋); board NOT shown.
- [x] **פעילויות פנויות** tab → de-identified cards (city/age/gender/type/date), no names/phones.
- [x] **Join** ("אני משתבץ/ת") → success → item moves to **הפעילויות שלי**, leaves the available list.
- [x] Mine tab → full contact details + **team list** + **בטל שיבוץ** button.
- [x] **Leave** → removed → reappears in available; if it was the last volunteer, status returns to "open".
- [x] Second volunteer joins the same activity → both appear in each other's team ("see who's already on it"); no capacity cap.
- [x] After a self-assign, coordinator gets a task ("שיבוץ מתנדב לפעילות") — needs that task type seeded.
- [ ] **Mobile:** cards single column; join/leave buttons + team chips readable.

## D. End-to-end
- [x] Public submit → board (open) → volunteer joins (available→mine) → coordinator sees team → volunteer leaves → back to open.
- [ ] Close the round → its activities disappear from volunteers' available list; self-assign attempt returns an error.

## E. Earlier bug fixes / prod tasks
- [ ] **Ongoing Expenses report:** open "דוח לפי תקופה", pick a period, drill in, export Excel + PDF.
- [ ] **Petty Cash:** per-payer chips show in the totals bar; Excel export has the per-payer sum-up block at the bottom.
- [ ] **Refunds:** גבריאלה appears in the approver dropdown; "לסקירה כללית" button is visible **only** to admin/Viewer.
- [ ] **Finance pages** (petty cash / ongoing / financial aid / vouchers): non-admin gets no data / no-permission screen.

**Prereqs to have set before testing:** run add_activity_assignments.sql (done), re-run add_activity_tables.sql if the "שיבוץ מתנדב לפעילות" task type isn't seeded, and (optional) set `ACTIVITY_SELF_ASSIGN_SID` for the prod WhatsApp on self-assign.