"""
Monthly Ongoing Expenses (הוצאות שוטפות) WhatsApp summary.

At the end of every month, sends a WhatsApp summary of that month's total
Ongoing Expenses to נעם ניזרי (checking both common spellings of "Noam" —
נעם / נועם — since the org is inconsistent about it) via the existing
Twilio WhatsApp bot. If no such staff member exists (or has no phone on
file), falls back to sending it to Liam (ליאם אביבי) instead — same Staff
lookup used for Liam elsewhere (e.g. refund_views.py::_get_liam_admin_phone).

Scheduling (see scheduler.py):
  - Runs on the LAST calendar day of every month — APScheduler
    CronTrigger(day='last', ...) already handles 28/29 (leap year) / 30 / 31
    correctly on its own; the function below ALSO re-verifies this via
    calendar.monthrange() as a defensive safety net before sending anything.
  - Time: MONTHLY_EXPENSES_SUMMARY_TIME env var (HH:MM, default disabled —
    feature does nothing unless this is set, same opt-in convention as
    MONTHLY_CREATOR_TIME / WEEKLY_DIGEST_TIME).
  - Template: TWILIO_MONTHLY_EXPENSES_SUMMARY_SID (Content SID) — REQUIRED. See
    TWILIO_MONTHLY_EXPENSES_SUMMARY_TEMPLATE.txt (repo root) for the exact
    template text to create in the Twilio Console. There is NO plain-text
    fallback: if the SID isn't configured, the send is skipped and logged as
    an error — set the SID before this job ever runs in production.

Manual trigger (see ongoing_expense_views.py::send_monthly_expenses_summary_now):
  - An admin-only "שליחת סיכום חודשי יזום" (send proactively) button on the Finance
    Overview page calls send_monthly_ongoing_expenses_summary(force=True), which
    bypasses ONLY the last-day-of-month check — the file lock, recipient lookup,
    and template SID requirement all still apply exactly as they do for the
    real monthly run.
"""

import os
import calendar
import fcntl
import tempfile

from django.utils import timezone
from django.db.models import Sum, Count, Q

from .logger import api_logger
from .models import Staff, OngoingExpense
from .whatsapp_utils import send_whatsapp_message

# File-based lock to prevent duplicate sends across processes (Django runserver spawns 2)
_LOCK_FILE = os.path.join(tempfile.gettempdir(), 'childsmile_monthly_expenses_summary.lock')

HEBREW_MONTHS = [
    'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
    'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
]


def _find_noam_nizri():
    """
    Look up the staff member נעם ניזרי — checking both common spellings of
    "Noam" (נעם / נועם). Exact first/last name match, same lookup style as
    _get_liam_admin_phone() in refund_views.py.
    """
    return Staff.objects.filter(
        Q(first_name='נעם', last_name='ניזרי') | Q(first_name='נועם', last_name='ניזרי')
    ).first()


def send_monthly_ongoing_expenses_summary(force=False):
    """
    Send the end-of-month Ongoing Expenses (הוצאות שוטפות) WhatsApp summary to
    נעם ניזרי. Called by the scheduler on the last day of every month.

    Safe to call more than once — it re-verifies today really is the last day
    of the month (leap-year aware) and uses a file lock so a duplicate
    scheduler tick (e.g. two Django worker processes) can't send it twice.

    Args:
        force: when True, skips the "today must be the last day of the month"
            check (used by the admin proactive-send button so it can be sent
            on demand without waiting for month-end). Everything else — file
            lock, recipient lookup, template SID requirement — still applies.

    Returns:
        dict: {"success": True, "message": str, "recipient": str, "phone": str,
        "total": float, "count": int, "month_label": str} on success, or
        {"success": False, "message": str} if nothing was sent.
    """
    today = timezone.now().date()

    # Defensive re-check: today must actually be the last day of THIS month.
    # calendar.monthrange(year, month) returns (weekday_of_first_day, days_in_month) —
    # days_in_month already accounts for 28/29 (leap year) / 30 / 31 correctly,
    # so no manual leap-year arithmetic is needed.
    last_day_of_month = calendar.monthrange(today.year, today.month)[1]
    if not force and today.day != last_day_of_month:
        msg = (
            f"היום ({today.day}) אינו היום האחרון בחודש ({last_day_of_month}) — הפעולה בוטלה."
        )
        api_logger.debug(f"[MONTHLY_EXPENSES_SUMMARY] Not the last day of the month "
                          f"(today={today.day}, last day={last_day_of_month}) — skipping")
        return {"success": False, "message": msg}

    # File lock: prevent duplicate sends (Django runserver spawns 2 processes)
    lock_fd = open(_LOCK_FILE, 'w')
    try:
        fcntl.flock(lock_fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except (IOError, OSError):
        api_logger.info("[MONTHLY_EXPENSES_SUMMARY] ⏭️ Another process is already sending, skipping")
        lock_fd.close()
        return {"success": False, "message": "כבר מתבצעת שליחה כרגע — נסה שוב בעוד רגע."}

    try:
        noam = _find_noam_nizri()
        recipient_phone = noam.staff_phone if (noam and noam.staff_phone) else None
        recipient_label = f"{noam.first_name} {noam.last_name}" if (noam and noam.staff_phone) else None

        if not recipient_phone:
            api_logger.warning(
                "[MONTHLY_EXPENSES_SUMMARY] נעם ניזרי / נועם ניזרי not found in Staff "
                "(or has no phone) — falling back to Liam"
            )
            # Reuse the existing Liam-phone lookup (DB + LIAM_ADMIN_PHONE env var
            # fallback) already implemented in refund_views.py — don't duplicate it.
            from .refund_views import _get_liam_admin_phone
            recipient_phone = _get_liam_admin_phone()
            recipient_label = "ליאם אביבי (גיבוי)" if recipient_phone else None

        if not recipient_phone:
            msg = "לא נמצא מספר טלפון עבור נעם ניזרי או ליאם אביבי (גיבוי) — לא ניתן לשלוח."
            api_logger.error(
                "[MONTHLY_EXPENSES_SUMMARY] Neither נעם ניזרי nor Liam (fallback) have a "
                "phone on file — skipping monthly expenses summary entirely"
            )
            return {"success": False, "message": msg}

        totals = OngoingExpense.objects.filter(
            expense_date__year=today.year,
            expense_date__month=today.month,
        ).aggregate(total=Sum('amount'), count=Count('ongoing_expense_id'))
        total_amount = totals['total'] or 0
        count = totals['count'] or 0  # kept for the server log line only, not sent in the message

        month_label = f"{HEBREW_MONTHS[today.month - 1]} {today.year}"

        template_sid = os.getenv('TWILIO_MONTHLY_EXPENSES_SUMMARY_SID', '').strip()
        if not template_sid:
            # No plain-text fallback here on purpose — a raw WhatsApp message
            # outside an approved template can violate Twilio/Meta policy.
            # Configuring TWILIO_MONTHLY_EXPENSES_SUMMARY_SID before this job
            # ever runs in production is a deployment requirement, not optional.
            msg = "לא הוגדר TWILIO_MONTHLY_EXPENSES_SUMMARY_SID — יש להגדיר אותו לפני השליחה."
            api_logger.error(
                "[MONTHLY_EXPENSES_SUMMARY] TWILIO_MONTHLY_EXPENSES_SUMMARY_SID not configured "
                "— skipping send (no fallback; set the SID before merging/deploying)"
            )
            return {"success": False, "message": msg}

        send_whatsapp_message(
            recipient_phone=recipient_phone,
            message_body="",
            use_template=True,
            template_sid=template_sid,
            template_variables={
                "1": month_label,
                "2": f"{total_amount:.2f}",
            },
        )

        api_logger.info(
            f"[MONTHLY_EXPENSES_SUMMARY] ✅ Sent {month_label} summary to "
            f"{recipient_label} ({recipient_phone}) — "
            f"total={total_amount:.2f}₪, count={count}"
        )
        return {
            "success": True,
            "message": f"סיכום ההוצאות השוטפות לחודש {month_label} נשלח בהצלחה אל {recipient_label} — סה\"כ {total_amount:.2f} ₪",
            "recipient": recipient_label,
            "phone": recipient_phone,
            "total": float(total_amount),
            "count": count,
            "month_label": month_label,
        }
    except Exception as e:
        api_logger.error(f"[MONTHLY_EXPENSES_SUMMARY] Error sending: {e}")
        return {"success": False, "message": str(e)}
    finally:
        fcntl.flock(lock_fd, fcntl.LOCK_UN)
        lock_fd.close()
