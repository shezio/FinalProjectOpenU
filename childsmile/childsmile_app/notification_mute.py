"""
Per-user WhatsApp notification mute preferences.

Single source of truth for WHICH WhatsApp notifications a user is allowed to
mute (per-user, toggled in the Edit User modal in System Management), plus the
helper used at every send site to decide whether to skip a recipient.

Muting is keyed per NOTIFICATION EVENT (a stable string `key`), NOT per Twilio
template SID — because one SID can back two distinct events (e.g. NEW_FAMILY_ADMIN_SID
is used both for "new family → Families Coordinator" and "new family → System Admins",
which are separately muteable). Security / OTP / account-lifecycle notifications are
intentionally NOT listed here and can never be muted.

Storage: Staff.muted_notifications — a JSON list of muted event keys.
"""

# Ordered list — this is also the display order in the Edit User modal.
# Each entry: key (stable id, stored), label (Hebrew, shown to admins), sid_env
# (the Twilio Content SID env var that backs it, for reference/documentation).
MUTEABLE_WHATSAPP_NOTIFICATIONS = [
    {"key": "new_volunteer_registration",     "label": "הרשמת מתנדב חדש (לרכז מתנדבים)",              "sid_env": "NEW_REGISTER_SID"},
    {"key": "activity_self_assign",           "label": "מתנדב שיבץ עצמו לפעילות (לרכזי מתנדבים)",       "sid_env": "ACTIVITY_SELF_ASSIGN_SID"},
    {"key": "review_followup",                "label": "שיחת ביקורת - המשך בירור (לרכז המשפחה)",       "sid_env": "REVIEW_FOLLOWUP_SID"},
    {"key": "new_family_needs_tutor",         "label": "משפחה חדשה ממתינה לחונך (לרכז משפחות בחונכות)", "sid_env": "NEW_FAMILY_SID"},
    {"key": "new_family_families_coordinator","label": "משפחה חדשה נוספה (לרכז משפחות)",               "sid_env": "NEW_FAMILY_ADMIN_SID"},
    {"key": "new_family_admins",              "label": "משפחה חדשה נוספה (למנהלי מערכת)",              "sid_env": "NEW_FAMILY_ADMIN_SID"},
    {"key": "family_left_tutorship",          "label": "משפחה עזבה חונכות (לרכז)",                     "sid_env": "NEW_FAMILY_LEFT_TUT_SID"},
    {"key": "meeting_reminder_week",          "label": "תזכורת פגישה - שבוע לפני",                     "sid_env": "TWILIO_MEETING_TEMPLATE_WEEK"},
    {"key": "meeting_reminder_two_days",      "label": "תזכורת פגישה - יומיים לפני",                   "sid_env": "TWILIO_MEETING_TEMPLATE_TWO_DAYS"},
    {"key": "meeting_reminder_same_day",      "label": "תזכורת פגישה - ביום הפגישה",                   "sid_env": "TWILIO_MEETING_TEMPLATE_SAME_DAY"},
    {"key": "meeting_created",                "label": "פגישה נוצרה",                                  "sid_env": "TWILIO_MEETING_TEMPLATE_CREATED"},
    {"key": "meeting_updated",                "label": "פגישה עודכנה",                                 "sid_env": "TWILIO_MEETING_TEMPLATE_UPDATED"},
    {"key": "meeting_cancelled",              "label": "פגישה בוטלה",                                  "sid_env": "TWILIO_MEETING_TEMPLATE_CANCELLED"},
    {"key": "registration_final_task",        "label": "משימת אישור הרשמה סופי (לליאם)",               "sid_env": "NEW_REGISTER_FINAL_SID"},
    {"key": "refund_new_request",             "label": "בקשת החזר הוצאות חדשה (למנהל)",                "sid_env": "REFUND_NEW_REQUEST_SID"},
    {"key": "refund_payment_required",        "label": "נדרש תשלום החזר הוצאות (לאורי)",               "sid_env": "REFUND_PAYMENT_REQUIRED_SID"},
    {"key": "refund_status_update",           "label": "עדכון סטטוס החזר הוצאות (למתנדב)",             "sid_env": "REFUND_STATUS_UPDATE_SID"},
    {"key": "admin_chat_message",             "label": "הודעת צ'אט ממנהל (לרכז)",                      "sid_env": "TWILIO_ADMIN_MESSAGE_SID"},
]

# Fast membership set of valid keys — anything not here is ignored on save.
MUTEABLE_KEYS = {n["key"] for n in MUTEABLE_WHATSAPP_NOTIFICATIONS}


def get_muted_notifications(staff):
    """Return the set of notification keys this staff member has muted."""
    if staff is None:
        return set()
    raw = getattr(staff, "muted_notifications", None) or []
    if isinstance(raw, (list, tuple, set)):
        return {str(k) for k in raw}
    return set()


def is_whatsapp_muted(staff, key):
    """
    True if `staff` has muted the notification identified by `key`.

    Safe to call with staff=None (e.g. a recipient identified only by phone with
    no Staff row) — returns False so the message still goes out. Only keys in
    MUTEABLE_KEYS can ever be muted; everything else (security/OTP/lifecycle) is
    always sent.
    """
    if staff is None or key not in MUTEABLE_KEYS:
        return False
    return key in get_muted_notifications(staff)


def sanitize_muted_notifications(keys):
    """Given raw user input (a list of keys), keep only valid muteable keys,
    de-duplicated and in registry order (stable, canonical storage)."""
    incoming = {str(k) for k in (keys or []) if str(k) in MUTEABLE_KEYS}
    return [n["key"] for n in MUTEABLE_WHATSAPP_NOTIFICATIONS if n["key"] in incoming]
