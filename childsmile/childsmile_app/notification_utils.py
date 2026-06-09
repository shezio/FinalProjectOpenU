"""
notification_utils.py

Birthday helper: computes today/next-week birthday virtual messages
at query time — no rows are inserted per child.

The table holds only 1 template row per birthday type.
At GET time, the API calls get_birthday_virtual_messages() which
returns a list of dicts (same shape as _serialize()) built live
from the Children table.

No caching — the query is a simple indexed filter on date_of_birth
(month + day) over the Children table.  On a typical installation
(hundreds of children) this is sub-millisecond and carries negligible
load.  Adding a process-level cache would actually hurt on multi-worker
deployments (gunicorn forks) because each worker would hold its own
stale copy anyway.  Plain DB reads are correct, simple, and cheap.
"""

from datetime import date, timedelta
from .logger import api_logger


def _get_this_israeli_week_remaining():
    """
    Return (tomorrow, this_saturday).
    "This week remaining" = tomorrow … this Saturday (inclusive).
    If today IS Saturday, tomorrow > this_saturday → empty range → caller skips.
    """
    today = date.today()
    hebrew_idx = (today.weekday() + 1) % 7    # Sun=0 … Sat=6
    this_saturday = today + timedelta(days=(6 - hebrew_idx))
    return today + timedelta(days=1), this_saturday


def _get_next_israeli_week():
    """
    Return (start, end) of the *next* Israeli week (Sun → Sat).
    Python weekday(): Mon=0 … Sun=6
    """
    today = date.today()
    weekday = today.weekday()            # Mon=0 … Sun=6
    days_until_sunday = (6 - weekday) % 7
    if days_until_sunday == 0:
        days_until_sunday = 7            # today is Sunday → jump to NEXT Sunday
    next_sunday   = today + timedelta(days=days_until_sunday)
    next_saturday = next_sunday + timedelta(days=6)
    return next_sunday, next_saturday


def _birthday_this_year(dob, year):
    try:
        return dob.replace(year=year)
    except ValueError:
        return dob.replace(year=year, day=28)   # Feb 29 on non-leap year


def _child_age(dob, ref):
    age = ref.year - dob.year
    if (ref.month, ref.day) < (dob.month, dob.day):
        age -= 1
    return age


HEBREW_DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']


def get_birthday_virtual_messages() -> list:
    """
    Return a list of virtual notification dicts for:
      - birthday_today      : birthday is today
      - birthday_this_week  : birthday is tomorrow … this Saturday (incl.)
                              special text when it's tomorrow
      - birthday_next_week  : birthday is next Sunday … next Saturday (incl.)

    Computed live on every call — no caching, no DB inserts.
    """
    from .models import Children

    today = date.today()
    week_start, week_end = _get_this_israeli_week_remaining()   # tomorrow … this Saturday
    next_sun,   next_sat = _get_next_israeli_week()              # next Sun … next Sat
    tomorrow = today + timedelta(days=1)

    children = Children.objects.filter(
        date_of_birth__isnull=False
    ).exclude(status__in=["ז״ל", "עזב"])

    results = []

    for child in children:
        dob  = child.date_of_birth
        name = f"{child.childfirstname} {child.childsurname}"
        gender_male = not child.gender   # False=Male per model definition
        child_emoji  = '👦' if gender_male else '👧'
        child_label  = 'החניך' if gender_male else 'החניכה'

        # try birthday in current year, fall back to next year for Dec/Jan boundary
        def bday_in_range(start, end):
            b = _birthday_this_year(dob, start.year)
            if start <= b <= end:
                return b
            b = _birthday_this_year(dob, end.year)
            if start <= b <= end:
                return b
            return None

        # ── today ──────────────────────────────────────────────────────────
        if dob.month == today.month and dob.day == today.day:
            age        = _child_age(dob, today)
            celebrates = 'חוגג' if gender_male else 'חוגגת'
            results.append({
                "id":           f"bday_today_{child.child_id}",
                "message_type": "birthday_today",
                "title":        f"🎂 יום הולדת היום\n{child_emoji} {child_label} {name}",
                "text":         f"🎉🎊🎂 מזל טוב! {child_label} {name} {celebrates} היום יום הולדת {age}",
                "child_id":     child.child_id,
                "child_name":   name,
                "is_auto":      True,
                "is_active":    True,
                "created_at":   None,
                "updated_at":   None,
                "created_by":   None,
                "virtual":      True,
            })
            continue

        # ── this week (tomorrow … this Saturday) ───────────────────────────
        if week_start <= week_end:   # skip if today is Saturday
            bday = bday_in_range(week_start, week_end)
            if bday:
                age_then  = _child_age(dob, bday)
                bday_disp = bday.strftime('%d/%m')
                hebrew_idx = (bday.weekday() + 1) % 7
                day_name   = HEBREW_DAYS[hebrew_idx]
                celebrates = 'יחגוג' if gender_male else 'תחגוג'
                if bday == tomorrow:
                    title = f"🎂 יום הולדת מחר\n{child_emoji} {child_label} {name}"
                    text  = f"🎉🎊🎂 מזל טוב! {child_label} {name} {celebrates} מחר יום הולדת {age_then} בתאריך {bday_disp}"
                else:
                    title = f"🎂 יום הולדת השבוע\n{child_emoji} {child_label} {name}"
                    text  = f"🎉🎊🎂 מזל טוב! {child_label} {name} {celebrates} יום הולדת {age_then} השבוע ביום {day_name} בתאריך {bday_disp}"
                results.append({
                    "id":           f"bday_week_{child.child_id}",
                    "message_type": "birthday_this_week",
                    "title":        title,
                    "text":         text,
                    "child_id":     child.child_id,
                    "child_name":   name,
                    "is_auto":      True,
                    "is_active":    True,
                    "created_at":   None,
                    "updated_at":   None,
                    "created_by":   None,
                    "virtual":      True,
                })
                continue

        # ── next Israeli week (next Sun … next Sat) ────────────────────────
        bday = bday_in_range(next_sun, next_sat)
        if bday:
            age_then  = _child_age(dob, bday)
            bday_disp = bday.strftime('%d/%m')
            hebrew_idx = (bday.weekday() + 1) % 7
            day_name   = HEBREW_DAYS[hebrew_idx]
            celebrates = 'יחגוג' if gender_male else 'תחגוג'
            results.append({
                "id":           f"bday_next_week_{child.child_id}",
                "message_type": "birthday_next_week",
                "title":        f"🎂 יום הולדת השבוע הבא\n{child_emoji} {child_label} {name}",
                "text":         f"🎉🎊🎂 מזל טוב! {child_label} {name} {celebrates} יום הולדת {age_then} בשבוע הבא ביום {day_name} בתאריך {bday_disp}",
                "child_id":     child.child_id,
                "child_name":   name,
                "is_auto":      True,
                "is_active":    True,
                "created_at":   None,
                "updated_at":   None,
                "created_by":   None,
                "virtual":      True,
            })

    api_logger.info(
        f"🔔 Birthday virtual messages computed: "
        f"today={sum(1 for r in results if r['message_type']=='birthday_today')} "
        f"this_week={sum(1 for r in results if r['message_type']=='birthday_this_week')} "
        f"next_week={sum(1 for r in results if r['message_type']=='birthday_next_week')}"
    )
    return results
