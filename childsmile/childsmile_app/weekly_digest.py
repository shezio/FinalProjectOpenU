"""
Weekly digest email - sent every Sunday at 8:00 AM Israel time to ALL active staff.

Sections:
  1. Open tasks per staff member
  2. Overdue tasks
  3. Families still waiting for a tutor
  4. New families registered this week
  5. What changed in the system this week (git log since last Sunday)

Scheduling: Controlled via WEEKLY_DIGEST_TIME env var (e.g. "08:00").
            Set WEEKLY_DIGEST_DAY to a day-of-week number (0=Mon … 6=Sun, default 6).
            If WEEKLY_DIGEST_TIME is not set, the feature is disabled.
"""

import os
import subprocess
import datetime
import json
import threading
import urllib.request
import urllib.parse
import pytz

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

from .models import Children, Tasks, Staff, Role
from .logger import api_logger

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

ISRAEL_TZ = pytz.timezone("Asia/Jerusalem")

TUTORING_STATUSES_REQUIRING_TUTOR = {
    "למצוא_חונך",
    "למצוא_חונך_אין_באיזור_שלו",
    "למצוא_חונך_בעדיפות_גבוה",
    "שידוך_בסימן_שאלה",
}

# ---------------------------------------------------------------------------
# Recipient filtering — only coordinators and admins
# ---------------------------------------------------------------------------

def _is_coordinator_or_admin(staff_member):
    """Return True if the staff member has at least one coordinator/admin role."""
    roles = staff_member.roles.values_list("role_name", flat=True)
    for r in roles:
        rl = r.lower()
        if "coordinator" in rl or "admin" in rl:
            return True
    return False


def _get_digest_recipients():
    """Return queryset of active Staff who are coordinators or admins."""
    coordinator_or_admin_roles = Role.objects.filter(
        role_name__icontains="coordinator"
    ) | Role.objects.filter(
        role_name__icontains="admin"
    )
    return (
        Staff.objects
        .filter(is_active=True, roles__in=coordinator_or_admin_roles)
        .exclude(email="")
        .distinct()
    )


# ---------------------------------------------------------------------------
# Commit message → Hebrew translation
# ---------------------------------------------------------------------------

# Order matters — more specific patterns first
_COMMIT_TRANSLATIONS = [
    # Families / reports
    (["duplicate report", "families duplicate", "כפילויות"], "דוח כפילויות משפחות"),
    (["missing data report", "missing data"], "דוח נתונים חסרים במשפחות"),
    (["families missing"], "דוח נתונים חסרים במשפחות"),
    (["per location report", "families per location"], "דוח משפחות לפי מיקום"),
    (["waiting for tutorship", "waiting tutor"], "דוח משפחות הממתינות לחונכות"),
    (["new families report", "new-families"], "דוח משפחות חדשות"),
    (["families export", "all families"], "דוח משפחות כללי"),
    (["tutorship stats", "tutorship_stats"], "דוח סטטיסטיקות חונכות"),
    (["pending tutor", "pending_tutor"], "דוח חונכים ממתינים"),
    (["active tutor", "active_tutor"], "דוח חונכויות פעילות"),
    (["possible match", "tutorship match"], "דוח התאמות חניך-חונך"),
    (["volunteer feedback", "volunteer-feedback"], "דוח משוב מתנדבים"),
    (["tutor feedback", "tutor-feedback"], "דוח משוב חונכים"),
    (["irs report", "volunteers irs"], "דוח מתנדבים לרשות המסים"),
    (["roles spread", "roles_spread"], "דוח התפלגות הרשאות"),
    (["report"], "שיפורי דוחות"),
    # Tasks
    (["monthly review task", "monthly review"], "יצירת משימות ביקורת חודשית"),
    (["review task", "review talk"], "שיפור תהליך ביקורת חודשית"),
    (["assign task", "assigned task"], "תיקון שיוך משימות"),
    (["approval task", "registration task"], "שיפור תהליך אישור הרשמה"),
    (["create task", "task creation"], "יצירת משימות"),
    (["task"], "שיפור מערכת המשימות"),
    # Auth / TOTP / login
    (["totp", "2fa", "two factor"], "שיפור אימות דו-שלבי"),
    (["login", "logout", "session"], "שיפור תהליך כניסה למערכת"),
    (["google", "oauth", "sso"], "שיפור כניסה עם גוגל"),
    (["password", "reset pass"], "שיפור איפוס סיסמה"),
    (["register", "registration", "signup"], "שיפור תהליך ההרשמה"),
    # WhatsApp / notifications
    (["whatsapp fix", "fix whatsapp"], "תיקון שליחת הודעות וואטסאפ"),
    (["whatsapp"], "שיפור שליחת הודעות וואטסאפ"),
    (["email notif", "email notification"], "שיפור התראות אימייל"),
    (["admin notif", "admin notification"], "שיפור התראות למנהל מערכת"),
    (["coordinator notif", "coordinator notification"], "שיפור התראות לרכזים"),
    (["notif", "notification"], "שיפור מערכת ההתראות"),
    # Tutorships
    (["tutorship activation", "tutorship_activation"], "שיפור הפעלת חונכויות"),
    (["tutorship"], "שיפור מערכת החונכויות"),
    # Volunteers / tutors
    (["volunteer"], "שיפור ניהול מתנדבים"),
    (["tutor"], "שיפור ניהול חונכים"),
    # Families
    (["create family", "add family", "new family"], "הוספת משפחה חדשה"),
    (["update family", "edit family"], "עדכון פרטי משפחה"),
    (["family"], "שיפור ניהול משפחות"),
    # Staff / system management
    (["system management", "sys mgmt", "mgmt error"], "תיקון ניהול מערכת"),
    (["staff profile", "staff phone", "staff role"], "שיפור פרופיל עובד"),
    (["staff"], "שיפור ניהול עובדים"),
    (["alumni", "bogrim"], "שיפור ניהול בוגרים"),
    # UI / frontend
    (["reviewer page", "reviewer"], "שיפור דף סקירה"),
    (["dashboard"], "שיפור לוח הבקרה"),
    (["pagination"], "שיפור עימוד"),
    (["ui ", "ux ", "design", "style", "css"], "שיפורי ממשק משתמש"),
    (["font", "badge", "filter", "modal"], "שיפורי ממשק משתמש"),
    # Bugs / fixes
    (["fix assign"], "תיקון שיוך"),
    (["fix phone"], "תיקון שדה טלפון"),
    (["fix mgmt", "fix management"], "תיקון ניהול מערכת"),
    (["fix"], "תיקון באג"),
    (["bug", "hotfix", "patch"], "תיקון באג"),
    (["error", "exception"], "תיקון שגיאה"),
    # Versions / deploy
    (["version", "deploy", "release"], "עדכון גרסה"),
    (["migration", "db ", "database"], "עדכון בסיס נתונים"),
    # Generic improvements
    (["performance", "optimize", "speed"], "שיפורי ביצועים"),
    (["security", "permission", "auth"], "שיפורי אבטחה"),
    (["cleanup", "clean up", "refactor"], "ניקוי וארגון קוד"),
    (["add ", "new ", "creat"], "הוספת יכולת חדשה"),
    (["update", "upd "], "עדכון"),
    (["remove", "delete", "drop"], "הסרת רכיב"),
]


def _translate_commit(msg: str) -> str:
    """
    Translate an English (or mixed) git commit message to a Hebrew description.
    1. Try the local keyword table first (zero cost, instant).
    2. If no pattern matches, try Google Translate's free endpoint via stdlib urllib
       in a background thread with a 3-second hard timeout.
    3. If that also fails (network error, timeout, blocked) — return original text.
    The digest NEVER blocks or fails because of a translation attempt.
    """
    ml = msg.lower()
    for keywords, hebrew in _COMMIT_TRANSLATIONS:
        if any(kw in ml for kw in keywords):
            return hebrew

    # --- stdlib Google Translate fallback (no pip install needed) ---
    result = [msg[:80]]   # default: original text, truncated

    try:
        def _do_translate():
            try:
                params = urllib.parse.urlencode({
                    "client": "gtx",
                    "sl": "auto",
                    "tl": "he",
                    "dt": "t",
                    "q": msg[:200],
                })
                url = f"https://translate.googleapis.com/translate_a/single?{params}"
                req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
                with urllib.request.urlopen(req, timeout=3) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
                    translated = "".join(part[0] for part in data[0] if part[0])
                    if translated:
                        result[0] = translated
            except Exception:
                pass   # silently keep the original

        t = threading.Thread(target=_do_translate, daemon=True)
        t.start()
        t.join(timeout=3)   # hard 3-second wall-clock limit
    except Exception:
        pass   # if threading itself fails — just return original text

    return result[0]


def _week_range():
    """Return (start_of_week, end_of_week) in Israel tz as aware datetimes."""
    now_il = timezone.now().astimezone(ISRAEL_TZ)
    # Go back 7 days for the "this week" window
    week_start = now_il - datetime.timedelta(days=7)
    return week_start, now_il


# ---------------------------------------------------------------------------
# File-path → Hebrew feature mapping
# Order matters — more specific patterns first
# ---------------------------------------------------------------------------

_FILE_FEATURE_MAP = [
    # Reports — specific first
    (["families_duplicate", "duplicate_report"],        "דוח כפילויות משפחות"),
    (["families_missing", "missing_data_report"],       "דוח נתונים חסרים במשפחות"),
    (["families_per_location", "location_report"],      "דוח משפחות לפי מיקום"),
    (["waiting_tutor", "waiting_for_tutor"],            "דוח משפחות ממתינות לחונך"),
    (["new_families_report"],                           "דוח משפחות חדשות"),
    (["tutorship_stats"],                               "דוח סטטיסטיקות חונכות"),
    (["pending_tutor"],                                 "דוח חונכים ממתינים"),
    (["active_tutor"],                                  "דוח חונכויות פעילות"),
    (["possible_match", "tutorship_match"],             "דוח התאמות חניך-חונך"),
    (["volunteer_feedback"],                            "דוח משוב מתנדבים"),
    (["tutor_feedback"],                                "דוח משוב חונכים"),
    (["irs_report", "volunteers_irs"],                  "דוח מתנדבים לרשות המסים"),
    (["roles_spread"],                                  "דוח התפלגות הרשאות"),
    (["report_pages/", "reports.js", "reports.css"],    "שיפורי עמוד הדוחות"),
    # Reviewer / monthly review
    (["reviewer", "review_task", "monthly_review"],     "עמוד ביקורת חודשית"),
    # Weekly digest
    (["weekly_digest"],                                 "סיכום שבועי אוטומטי"),
    # WhatsApp / notifications
    (["whatsapp_utils", "whatsapp"],                    "שליחת הודעות WhatsApp"),
    (["coordinator_utils"],                             "כלי עזר לרכזים"),
    (["admin_notification"],                            "התראות מנהל מערכת"),
    (["coordinator_notification"],                      "התראות לרכזים"),
    (["email"],                                         "שיפור הודעות אימייל"),
    # Auth / login
    (["totp", "two_factor"],                            "אימות דו-שלבי"),
    (["login", "logout"],                               "תהליך כניסה למערכת"),
    (["oauth", "google_auth", "sso"],                   "כניסה עם גוגל"),
    (["password", "reset_pass"],                        "איפוס סיסמה"),
    (["register", "registration", "signup"],            "תהליך הרשמה"),
    # Tutorships
    (["tutorship_activation"],                          "הפעלת חונכויות"),
    (["tutorship"],                                     "מערכת חונכויות"),
    # Families / children
    (["family_views", "families"],                      "ניהול משפחות"),
    (["children"],                                      "ניהול ילדים"),
    # Volunteers / staff
    (["volunteer"],                                     "ניהול מתנדבים"),
    (["staff_views", "staff_profile", "staff"],         "ניהול עובדים"),
    # DB / migrations
    (["migration", "0001_", "0002_", "0003_"],          "מיגרציה של בסיס הנתונים"),
    (["models.py"],                                     "עדכון מבנה בסיס הנתונים"),
    ([".sql"],                                          "שינוי בסיס הנתונים"),
    # Scheduler
    (["scheduler"],                                     "מתזמן משימות אוטומטי"),
    # Frontend routing / app shell
    (["app.js", "app.jsx", "app.tsx"],                  "ניתוב ראשי של האפליקציה"),
    (["dashboard"],                                     "לוח בקרה"),
    # Settings / config
    (["settings.py", "settings.js", "config"],         "הגדרות מערכת"),
    # URLs
    (["urls.py"],                                       "ניתוב שרת (URLs)"),
]


def _file_path_to_feature(path: str) -> str | None:
    """Map a changed file path to a Hebrew feature description, or None if unknown."""
    pl = path.lower()
    for patterns, hebrew in _FILE_FEATURE_MAP:
        if any(p in pl for p in patterns):
            return hebrew
    return None


def _git_changes_this_week():
    """
    For each commit this week, collect the list of changed file paths and map
    them to feature-level Hebrew descriptions.  Groups by date, deduplicates,
    returns newest-first.  No low-level code details are ever shown.
    """
    try:
        repo_root = os.path.dirname(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        )
        week_start, _ = _week_range()
        since = week_start.strftime("%Y-%m-%d")

        # One git call: commit hash + date + list of changed files
        log_result = subprocess.run(
            [
                "git", "log", f"--since={since}",
                "--format=%H|||%ad",
                "--date=format:%d/%m/%Y",
                "--name-only",
            ],
            capture_output=True, text=True, cwd=repo_root, timeout=15,
        )

        by_date = {}   # date_str -> set of Hebrew feature descriptions
        current_date = None

        for raw_line in log_result.stdout.splitlines():
            line = raw_line.strip()
            if not line:
                continue
            if "|||" in line:
                # Header line: "HASH|||DD/MM/YYYY"
                parts = line.split("|||", 1)
                current_date = parts[1].strip() if len(parts) == 2 else None
                continue
            if current_date is None:
                continue
            # Otherwise it's a changed file path for the current commit
            feature = _file_path_to_feature(line)
            if feature:
                by_date.setdefault(current_date, set()).add(feature)

        if not by_date:
            return []

        # Merge all features across all days into one deduplicated sorted list
        all_features: set = set()
        for features in by_date.values():
            all_features.update(features)
        return sorted(all_features)

    except Exception as e:
        api_logger.warning(f"weekly_digest: could not analyse git changes: {e}")
        return []


def build_digest_data():
    today = timezone.now().date()
    week_start, _ = _week_range()

    # Coordinators only (non-admin roles) — for the tasks section
    # Admins are excluded from the tasks display per NPO feedback
    coordinator_role_ids = (
        Role.objects.filter(role_name__icontains="coordinator")
        .exclude(role_name__icontains="admin")
        .values_list("id", flat=True)
    )
    coordinator_staff_ids = (
        Staff.objects.filter(roles__in=coordinator_role_ids, is_active=True)
        .distinct()
        .values_list("staff_id", flat=True)
    )

    # 1. Open tasks — only for coordinators (not admins)
    open_tasks = (
        Tasks.objects
        .filter(status__in=["לא הושלמה", "Pending"], assigned_to__staff_id__in=coordinator_staff_ids)
        .select_related("assigned_to", "task_type")
        .order_by("assigned_to__first_name", "due_date")
    )

    tasks_by_staff = {}
    for t in open_tasks:
        staff = t.assigned_to
        key = staff.staff_id
        if key not in tasks_by_staff:
            tasks_by_staff[key] = {
                "name": f"{staff.first_name} {staff.last_name}",
                "email": staff.email,
                "open": [],
                "overdue": [],
            }
        entry = {
            "id": t.task_id,
            "type": t.task_type.task_type if t.task_type else "",
            "description": (t.description or "")[:80],
            "due": t.due_date.strftime("%d/%m/%Y") if t.due_date else "—",
        }
        if t.due_date and t.due_date < today:
            tasks_by_staff[key]["overdue"].append(entry)
        else:
            tasks_by_staff[key]["open"].append(entry)

    # 2. Total overdue count (coordinators only)
    total_overdue = Tasks.objects.filter(
        status__in=["לא הושלמה", "Pending"],
        due_date__lt=today,
        assigned_to__staff_id__in=coordinator_staff_ids,
    ).count()

    # 3. Families waiting for tutor
    waiting_families = Children.objects.filter(
        tutoring_status__in=TUTORING_STATUSES_REQUIRING_TUTOR
    ).values("child_id", "childfirstname", "childsurname", "city", "tutoring_status", "registrationdate").order_by("registrationdate")

    # 4. New families this week
    new_families = Children.objects.filter(
        registrationdate__gte=week_start
    ).values("child_id", "childfirstname", "childsurname", "city", "tutoring_status", "registrationdate").order_by("-registrationdate")

    # 5. New volunteers this week (no admins in this list)
    new_volunteers = Staff.objects.filter(
        created_at__gte=week_start
    ).exclude(
        roles__in=Role.objects.filter(role_name__icontains="admin")
    ).distinct().values("staff_id", "first_name", "last_name", "email", "created_at").order_by("-created_at")

    # 6. Completed REVIEW tasks this week — only tasks of type containing "ביקורת"/"review"
    completed_tasks = (
        Tasks.objects
        .filter(
            status="הושלמה",
            updated_at__gte=week_start,
            task_type__task_type__icontains="ביקורת",
        )
        .select_related("assigned_to", "task_type")
    )
    completed_by_staff = {}
    for t in completed_tasks:
        if not t.assigned_to:
            continue
        key = t.assigned_to.staff_id
        if key not in completed_by_staff:
            completed_by_staff[key] = {
                "name": f"{t.assigned_to.first_name} {t.assigned_to.last_name}",
                "count": 0,
            }
        completed_by_staff[key]["count"] += 1
    total_completed = sum(v["count"] for v in completed_by_staff.values())

    # 7. Git changes
    git_changes = _git_changes_this_week()

    return {
        "generated_at": timezone.now().astimezone(ISRAEL_TZ).strftime("%d/%m/%Y %H:%M"),
        "week_start": week_start.strftime("%d/%m/%Y"),
        "tasks_by_staff": tasks_by_staff,
        "total_open_tasks": open_tasks.count(),
        "total_overdue": total_overdue,
        "waiting_families": list(waiting_families),
        "waiting_families_count": waiting_families.count(),
        "new_families": list(new_families),
        "new_volunteers": list(new_volunteers),
        "completed_by_staff": completed_by_staff,
        "total_completed": total_completed,
        "git_changes": git_changes,
    }


# ---------------------------------------------------------------------------
# HTML builder
# ---------------------------------------------------------------------------

# ── inline-style tokens for easy reuse ──────────────────────────────────────
_C_PRIMARY  = "#7c5cbf"      # purple header
_C_BLUE     = "#2196F3"      # info accent
_C_GREEN    = "#43a047"      # positive accent
_C_ORANGE   = "#f57c00"      # warning accent
_C_RED      = "#e53935"      # danger
_C_BGLIGHT  = "#f8f5ff"
_C_BGROW    = "#f5f5f5"
_C_BORDER   = "#e2d9f3"
_FONT       = "Arial, Helvetica, sans-serif"

def _td_cell(label, value, accent=None):
    color = accent or "#555"
    return f"""
    <tr>
      <td style="padding:8px 12px;background:#f9f9f9;border-bottom:1px solid {_C_BORDER};text-align:right;direction:rtl;font-family:{_FONT};font-size:14px;">
        <span style="font-weight:700;color:#333;">{label}:&nbsp;</span><span style="color:{color};">{value}</span>
      </td>
    </tr>"""


def _section_header(title, bg_color, emoji=""):
    return f"""
    <tr>
      <td style="background:{bg_color};color:#fff;padding:12px 20px;font-family:{_FONT};font-size:16px;font-weight:700;text-align:right;direction:rtl;">
        {emoji}&nbsp;{title}
      </td>
    </tr>"""


def _small_table_header(*cols):
    ths = "".join(
        f'<td style="background:{_C_PRIMARY};color:#fff;padding:8px 10px;font-family:{_FONT};font-size:13px;font-weight:700;text-align:right;border:1px solid {_C_BORDER};">{c}</td>'
        for c in cols
    )
    return f"<tr>{ths}</tr>"


def _small_table_row(*cells, bg="#fff"):
    tds = "".join(
        f'<td style="padding:7px 10px;font-family:{_FONT};font-size:13px;color:#333;text-align:right;border:1px solid {_C_BORDER};background:{bg};">{c}</td>'
        for c in cells
    )
    return f"<tr>{tds}</tr>"


def _badge(text, color):
    return f'<span style="display:inline-block;padding:2px 10px;border-radius:10px;font-size:12px;font-weight:700;background:{color}20;color:{color};font-family:{_FONT};">{text}</span>'


def build_digest_html(data):
    generated   = data["generated_at"]
    week_start  = data["week_start"]
    total_open  = data["total_open_tasks"]
    total_over  = data["total_overdue"]
    wait_count  = data["waiting_families_count"]
    tasks_staff = data["tasks_by_staff"]
    git_changes = data["git_changes"]
    new_fams    = data["new_families"]
    new_vols    = data["new_volunteers"]
    completed_by_staff = data["completed_by_staff"]
    total_completed    = data["total_completed"]

    # ── KPI bar ─────────────────────────────────────────────────────────────
    kpi_html = f"""
    <tr>
      <td style="background:#fff;padding:20px 20px 10px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="33%" style="text-align:center;padding:10px;">
              <div style="font-size:36px;font-weight:900;color:{_C_ORANGE};font-family:{_FONT};">{total_open}</div>
              <div style="font-size:13px;color:#777;font-family:{_FONT};">משימות פתוחות</div>
            </td>
            <td width="33%" style="text-align:center;padding:10px;border-right:2px solid {_C_BORDER};border-left:2px solid {_C_BORDER};">
              <div style="font-size:36px;font-weight:900;color:{_C_RED};font-family:{_FONT};">{total_over}</div>
              <div style="font-size:13px;color:#777;font-family:{_FONT};">משימות באיחור</div>
            </td>
            <td width="33%" style="text-align:center;padding:10px;">
              <div style="font-size:36px;font-weight:900;color:{_C_BLUE};font-family:{_FONT};">{wait_count}</div>
              <div style="font-size:13px;color:#777;font-family:{_FONT};">משפחות ממתינות לחונך</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>"""

    # ── Open / Overdue tasks per staff ───────────────────────────────────────
    tasks_rows = ""
    for sid, info in sorted(tasks_staff.items(), key=lambda x: -len(x[1]["overdue"])):
        overdue_count = len(info["overdue"])
        open_count    = len(info["open"])
        if not overdue_count and not open_count:
            continue
        name_badge = (
            _badge(f"⚠️ {overdue_count} באיחור", _C_RED) if overdue_count else ""
        )
        tasks_rows += f"""
        <tr>
          <td style="padding:6px 12px;font-family:{_FONT};font-size:14px;font-weight:700;color:#333;text-align:right;border-bottom:1px solid {_C_BORDER};">
            {info['name']} &nbsp; {name_badge}
          </td>
          <td style="padding:6px 12px;font-family:{_FONT};font-size:14px;color:#555;text-align:center;border-bottom:1px solid {_C_BORDER};">
            {open_count}
          </td>
          <td style="padding:6px 12px;font-family:{_FONT};font-size:14px;color:{_C_RED if overdue_count else '#555'};font-weight:{'700' if overdue_count else '400'};text-align:center;border-bottom:1px solid {_C_BORDER};">
            {overdue_count}
          </td>
        </tr>"""
        # Show up to 3 overdue tasks inline
        for t in info["overdue"][:3]:
            tasks_rows += f"""
        <tr style="background:#fff8f8;">
          <td colspan="3" style="padding:4px 28px;font-family:{_FONT};font-size:12px;color:{_C_RED};text-align:right;border-bottom:1px solid #fde;direction:rtl;">
            &nbsp;&nbsp;↳ [{t['type']}] {t['description']} — מועד סיום המשימה חלף: {t['due']}
          </td>
        </tr>"""
        if len(info["overdue"]) > 3:
            tasks_rows += f"""
        <tr style="background:#fff8f8;">
          <td colspan="3" style="padding:4px 28px;font-family:{_FONT};font-size:12px;color:{_C_RED};text-align:right;border-bottom:1px solid #fde;">
            &nbsp;&nbsp;ועוד {len(info['overdue'])-3} משימות באיחור נוספות...
          </td>
        </tr>"""

    tasks_section = f"""
    <tr><td style="padding:0 0 2px 0;">
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      {_section_header('משימות פתוחות לפי רכז', _C_ORANGE, '📋')}
      <tr style="background:{_C_BGLIGHT};">
        <td style="padding:6px 12px;font-family:{_FONT};font-size:13px;font-weight:700;color:{_C_PRIMARY};text-align:right;">רכז/ת</td>
        <td style="padding:6px 12px;font-family:{_FONT};font-size:13px;font-weight:700;color:{_C_PRIMARY};text-align:center;">פתוחות</td>
        <td style="padding:6px 12px;font-family:{_FONT};font-size:13px;font-weight:700;color:{_C_RED};text-align:center;">באיחור</td>
      </tr>
      {tasks_rows if tasks_rows else '<tr><td colspan="3" style="padding:14px;text-align:center;color:#aaa;font-family:Arial;font-size:14px;">✅ אין משימות פתוחות</td></tr>'}
    </table>
    </td></tr>"""

    # ── Waiting families ────────────────────────────────────────────────────
    wait_rows = ""
    tutoring_labels = {
        "למצוא_חונך": "צריך חונך",
        "למצוא_חונך_אין_באיזור_שלו": "אין חונך באיזור",
        "למצוא_חונך_בעדיפות_גבוה": "עדיפות גבוהה",
        "שידוך_בסימן_שאלה": "שידוך בספק",
    }
    for i, f in enumerate(data["waiting_families"][:15]):
        bg = "#fff" if i % 2 == 0 else _C_BGROW
        reg = f["registrationdate"]
        reg_str = reg.strftime("%d/%m/%Y") if hasattr(reg, "strftime") else str(reg)[:10]
        status_label = tutoring_labels.get(f["tutoring_status"], f["tutoring_status"])
        wait_rows += _small_table_row(
            f"{f['childfirstname']} {f['childsurname']}",
            f["city"] or "—",
            _badge(status_label, _C_BLUE),
            reg_str,
            bg=bg,
        )
    if data["waiting_families_count"] > 15:
        wait_rows += f"""<tr><td colspan="4" style="text-align:center;padding:8px;font-size:13px;color:#888;font-family:{_FONT};">...ועוד {data['waiting_families_count']-15} משפחות</td></tr>"""

    waiting_section = f"""
    <tr><td style="padding:0 0 2px 0;">
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      {_section_header(f'משפחות הממתינות לחונך ({data["waiting_families_count"]})', _C_BLUE, '👨‍👩‍👧')}
      {_small_table_header('שם ילד', 'עיר', 'סטטוס', 'תאריך רישום')}
      {wait_rows if wait_rows else '<tr><td colspan="4" style="padding:14px;text-align:center;color:#aaa;font-family:Arial;font-size:14px;">✅ אין משפחות ממתינות</td></tr>'}
    </table>
    </td></tr>"""

    # ── New families this week ───────────────────────────────────────────────
    new_fam_rows = ""
    for i, f in enumerate(new_fams[:10]):
        bg = "#fff" if i % 2 == 0 else _C_BGROW
        reg = f["registrationdate"]
        reg_str = reg.strftime("%d/%m/%Y") if hasattr(reg, "strftime") else str(reg)[:10]
        new_fam_rows += _small_table_row(
            f"{f['childfirstname']} {f['childsurname']}",
            f["city"] or "—",
            reg_str,
            bg=bg,
        )

    new_fam_section = f"""
    <tr><td style="padding:0 0 2px 0;">
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      {_section_header(f'משפחות חדשות השבוע ({len(new_fams)})', _C_GREEN, '🆕')}
      {_small_table_header('שם ילד', 'עיר', 'תאריך הוספה') if new_fams else ''}
      {new_fam_rows if new_fam_rows else '<tr><td colspan="3" style="padding:14px;text-align:center;color:#aaa;font-family:Arial;font-size:14px;">לא נוספו משפחות חדשות השבוע</td></tr>'}
    </table>
    </td></tr>"""

    # ── New volunteers this week ─────────────────────────────────────────────
    new_vol_rows = ""
    for i, s in enumerate(new_vols[:10]):
        bg = "#fff" if i % 2 == 0 else _C_BGROW
        created = s["created_at"]
        created_str = created.strftime("%d/%m/%Y") if hasattr(created, "strftime") else str(created)[:10]
        new_vol_rows += _small_table_row(
            f"{s['first_name']} {s['last_name']}",
            s["email"],
            created_str,
            bg=bg,
        )

    new_vol_section = f"""
    <tr><td style="padding:0 0 2px 0;">
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      {_section_header(f'מתנדבים חדשים השבוע ({len(new_vols)})', _C_GREEN, '👤')}
      {_small_table_header('שם', 'אימייל', 'תאריך הצטרפות') if new_vols else ''}
      {new_vol_rows if new_vol_rows else '<tr><td colspan="3" style="padding:14px;text-align:center;color:#aaa;font-family:Arial;font-size:14px;">לא נרשמו מתנדבים חדשים השבוע</td></tr>'}
    </table>
    </td></tr>"""

    # ── Completed tasks this week ────────────────────────────────────────────
    completed_rows = ""
    for sid, info in sorted(completed_by_staff.items(), key=lambda x: -x[1]["count"]):
        completed_rows += _small_table_row(
            info["name"],
            f"{info['count']} שיחות ביקורת",
        )

    completed_section = f"""
    <tr><td style="padding:0 0 2px 0;">
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      {_section_header(f'שיחות ביקורת שהושלמו השבוע ({total_completed})', _C_GREEN, '✅')}
      {_small_table_header('רכז/ת', 'שיחות ביקורת שהושלמו') if completed_by_staff else ''}
      {completed_rows if completed_rows else '<tr><td colspan="2" style="padding:14px;text-align:center;color:#aaa;font-family:Arial;font-size:14px;">לא הושלמו שיחות ביקורת השבוע</td></tr>'}
    </table>
    </td></tr>"""

    # ── Git changes section ──────────────────────────────────────────────────
    # git_changes is a flat sorted list of Hebrew feature descriptions for the week
    git_rows = ""
    for desc in git_changes:
        git_rows += f"""
        <tr>
          <td style="padding:6px 20px;font-family:{_FONT};font-size:13px;color:#444;text-align:right;border-bottom:1px solid {_C_BORDER};direction:rtl;">
            • {desc}
          </td>
        </tr>"""

    git_section = f"""
    <tr><td style="padding:0 0 2px 0;">
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      {_section_header('שינויים במערכת השבוע', _C_PRIMARY, '⚙️')}
      {git_rows if git_rows else '<tr><td colspan="2" style="padding:14px;text-align:center;color:#aaa;font-family:Arial;font-size:14px;">לא בוצעו שינויים קוד השבוע</td></tr>'}
    </table>
    </td></tr>"""

    # ── Assemble full email ──────────────────────────────────────────────────
    html = f"""<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <title>סיכום שבועי – חיוך של ילד</title>
</head>
<body dir="rtl" style="margin:0;padding:0;background:#ede9f7;direction:rtl;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <!--[if mso]><center><table width="600"><tr><td><![endif]-->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ede9f7;min-width:320px;">
    <tr>
      <td align="center" style="padding:24px 12px;">

        <!-- CARD -->
        <table width="600" cellpadding="0" cellspacing="0" border="0"
               style="background:#fff;border-radius:12px;overflow:hidden;
                      box-shadow:0 4px 20px rgba(0,0,0,0.10);max-width:600px;width:100%;">

          <!-- LOGO / HEADER -->
          <tr>
            <td style="background:linear-gradient(135deg,{_C_PRIMARY} 0%,#5a3d8c 100%);
                        padding:28px 24px;text-align:center;">
              <div style="font-family:{_FONT};font-size:26px;font-weight:900;
                           color:#fff;letter-spacing:-0.5px;">
                😊 חיוך של ילד
              </div>
              <div style="font-family:{_FONT};font-size:15px;color:rgba(255,255,255,0.85);
                           margin-top:6px;">
                סיכום שבועי &nbsp;|&nbsp; {week_start} – {generated[:10]}
              </div>
            </td>
          </tr>

          <!-- INTRO -->
          <tr>
            <td style="background:#fff;padding:20px 24px 12px 24px;
                        font-family:{_FONT};font-size:15px;color:#444;
                        text-align:right;direction:rtl;line-height:1.6;">
              שלום,<br>
              להלן סיכום השבועי של פעילות המערכת. הדוח נוצר אוטומטית ב-{generated}.
            </td>
          </tr>

          <!-- DIVIDER -->
          <tr><td style="padding:0 24px;"><hr style="border:none;border-top:2px solid {_C_BORDER};margin:0;"></td></tr>

          <!-- KPI ROW -->
          {kpi_html}

          <!-- DIVIDER -->
          <tr><td style="padding:0 24px;"><hr style="border:none;border-top:2px solid {_C_BORDER};margin:4px 0;"></td></tr>

          <!-- SPACER -->
          <tr><td style="height:8px;"></td></tr>

          <!-- SECTIONS (each wrapped in a padded cell) -->
          <tr><td style="padding:0 0 16px 0;">
            <table width="100%" cellpadding="0" cellspacing="8">
              {tasks_section}
              <tr><td style="height:4px;"></td></tr>
              {completed_section}
              <tr><td style="height:4px;"></td></tr>
              {waiting_section}
              <tr><td style="height:4px;"></td></tr>
              {new_fam_section}
              <tr><td style="height:4px;"></td></tr>
              {new_vol_section}
              <tr><td style="height:4px;"></td></tr>
              {git_section}
            </table>
          </td></tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:{_C_BGLIGHT};padding:18px 24px;
                        text-align:center;font-family:{_FONT};
                        font-size:12px;color:#999;border-top:2px solid {_C_BORDER};">
              זוהי הודעה אוטומטית — נשלחה מדי שבוע על ידי מערכת חיוך של ילד.<br>
              אנא אל תשיב לאימייל זה.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
  <!--[if mso]></td></tr></table></center><![endif]-->
</body>
</html>"""

    return html


# ---------------------------------------------------------------------------
# Send
# ---------------------------------------------------------------------------

def send_weekly_digest():
    """
    Build and send the weekly digest to all active staff members.
    Returns a dict with stats.
    """
    try:
        data = build_digest_data()
        html = build_digest_html(data)
        subject = f"📋 סיכום שבועי – חיוך של ילד | {data['week_start']} – {data['generated_at'][:10]}"

        recipients = _get_digest_recipients()
        emails = list(recipients.values_list("email", flat=True))

        if not emails:
            api_logger.warning("weekly_digest: no coordinator/admin emails found — nothing sent")
            return {"sent": 0, "skipped": 0, "error": None}

        api_logger.info(f"weekly_digest: sending to {len(emails)} coordinators/admins: {emails}")

        sent = 0
        failed = 0
        for email in emails:
            try:
                send_mail(
                    subject=subject,
                    message="",        # plain-text fallback (empty — HTML only)
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[email],
                    fail_silently=False,
                    html_message=html,
                )
                sent += 1
            except Exception as e:
                api_logger.error(f"weekly_digest: failed to send to {email}: {e}")
                failed += 1

        api_logger.info(f"✅ weekly_digest sent to {sent} staff members ({failed} failed)")
        return {"sent": sent, "failed": failed, "error": None}

    except Exception as e:
        api_logger.error(f"❌ weekly_digest: unexpected error: {e}")
        return {"sent": 0, "failed": 0, "error": str(e)}
