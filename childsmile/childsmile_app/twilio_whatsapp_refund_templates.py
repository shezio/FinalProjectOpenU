"""
WhatsApp Templates for Expense Refund (החזרי הוצאות) Notifications via Twilio

These templates are used to notify:
1. Liam (admin) when a new refund request is submitted.
2. The volunteer when their request status changes (any transition).

REFUND NOTIFICATION FLOW:
1. Volunteer submits request → Notify Liam: "New refund request from [Name] for [Amount]"
2. Admin changes status     → Notify Volunteer: Status update including amounts / comments

META-APPROVED TEMPLATE FORMAT:
  All variable slots use positional markers {{1}}, {{2}}, … (NOT named markers).
  Named markers ({{name}}, {{amount}}, etc.) are NOT accepted by Meta for approval.
  Template SIDs are stored in environment variables:
    REFUND_NEW_REQUEST_SID        – Template 1
    REFUND_STATUS_UPDATE_SID      – Template 2
"""

# ──────────────────────────────────────────────────────────────────────────────
# Template 1: NEW REFUND REQUEST (Admin notification → Liam)
# Sent to Liam when a volunteer submits a new expense refund request.
#
# Meta-approved body (submit exactly this to Meta):
#   💰 בקשת החזר הוצאות חדשה
#
#   שלום ליאם,
#
#   ישנה בקשת החזר חדשה לטיפול:
#   👤 שם: {{1}}
#   💵 סכום מבוקש: {{2}} ₪
#
#   פרטים נוספים ואפשרות לאישור/דחייה זמינים במסך הניהול.
#   🔗 היכנס למערכת לטיפול בבקשה.
#
# Variables:  {{1}} = volunteer_full_name,  {{2}} = requested_amount
# Env var:    REFUND_NEW_REQUEST_SID
# ──────────────────────────────────────────────────────────────────────────────
REFUND_NEW_REQUEST_TEMPLATE_NAME = "refund_new_request_admin"

# Fallback plain-text (used when SID env var is not set)
REFUND_NEW_REQUEST_FALLBACK = """💰 בקשת החזר הוצאות חדשה

שלום ליאם,

ישנה בקשת החזר חדשה לטיפול:
👤 שם: {volunteer_full_name}
💵 סכום מבוקש: {requested_amount} ₪

פרטים נוספים ואפשרות לאישור/דחייה זמינים במסך הניהול.
🔗 היכנס למערכת לטיפול בבקשה."""

# ──────────────────────────────────────────────────────────────────────────────
# Template 2: REFUND STATUS UPDATE (Volunteer notification)
# Sent to the volunteer whenever an admin changes the status of their request.
# Used for ALL status transitions: approved, partially_approved, paid, cancelled.
#
# Meta-approved body (submit exactly this to Meta):
#   📋 עדכון בקשת החזר הוצאות
#
#   שלום {{1}},
#
#   הבקשה שלך {{2}}
#
#   {{3}}
#   בשאלות ניתן לפנות לצוות הניהול.
#
# Variables:
#   {{1}} = volunteer_full_name
#   {{2}} = status_female  (e.g. "אושרה ✅")
#   {{3}} = details block  (approved amount + admin comment, or empty string "—")
# Env var:    REFUND_STATUS_UPDATE_SID
# ──────────────────────────────────────────────────────────────────────────────
REFUND_STATUS_UPDATE_TEMPLATE_NAME = "refund_status_update_volunteer"

# Fallback plain-text (used when SID env var is not set)
REFUND_STATUS_UPDATE_FALLBACK = """📋 עדכון בקשת החזר הוצאות

שלום {volunteer_full_name},

הבקשה שלך {status_female}

{details}בשאלות ניתן לפנות לצוות הניהול."""

# Status → female conjugation map (בקשה = feminine noun)
REFUND_STATUS_FEMALE_MAP = {
    'ממתין':       'ממתינה לטיפול',
    'אושר':        'אושרה ✅',
    'אושר חלקית': 'אושרה חלקית ✅',
    'שולם':        'שולמה 💸',
    'בוטל/נדחה':  'נדחתה ❌',
}
