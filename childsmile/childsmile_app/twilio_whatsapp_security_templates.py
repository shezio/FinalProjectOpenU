"""
WhatsApp Templates for Security Breach Alerts via Twilio

Sent to ALL System Administrators when an unauthenticated (or unauthorised)
request is detected on a sensitive API endpoint.

META-APPROVED TEMPLATE FORMAT:
  Variable slots use positional markers {{1}}, {{2}}, … (NOT named markers).
  Template SID stored in environment variable:
    SECURITY_BREACH_ALERT_SID   – breach alert template

──────────────────────────────────────────────────────────────────────────────
Template: SECURITY BREACH ALERT (All admins notification)
Sent to every System Administrator when an UNAUTHORIZED_ACCESS_ATTEMPT is
logged on a sensitive endpoint (/api/children/, /api/audit-logs/, etc.).

Meta-approved body (submit exactly this to Meta):
  🚨🔴 התראת אבטחה — ניסיון גישה חשוד

  זוהה ניסיון גישה לא מורשה למערכת חיוך של ילד.

  🌐 נקודת קצה: {{1}}
  🕐 זמן: {{2}}
  📍 כתובת IP: {{3}}

  ⚠️ אנא היכנס למערכת ובדוק את יומן הביקורת.
  אם מדובר בפעילות חשודה — פנה לצוות הטכני.

Variables:  {{1}} = endpoint,  {{2}} = timestamp,  {{3}} = ip_address
Env var:    SECURITY_BREACH_ALERT_SID
──────────────────────────────────────────────────────────────────────────────
"""

SECURITY_BREACH_ALERT_TEMPLATE_NAME = "security_breach_alert"

# Fallback plain-text (used when SECURITY_BREACH_ALERT_SID env var is not set)
SECURITY_BREACH_ALERT_FALLBACK = """🚨🔴 התראת אבטחה — ניסיון גישה חשוד

זוהה ניסיון גישה לא מורשה למערכת חיוך של ילד.

🌐 נקודת קצה: {endpoint}
🕐 זמן: {timestamp}
📍 כתובת IP: {ip_address}

⚠️ אנא היכנס למערכת ובדוק את יומן הביקורת.
אם מדובר בפעילות חשודה — פנה לצוות הטכני."""
