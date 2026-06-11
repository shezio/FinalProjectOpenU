# Security Fix Revert Guide
## PT Fixes applied: 11 Jun 2026 (version 26.06.4.1)

Use this file if something breaks after deploying the PT security fixes.

---

## What was changed

| # | File | What changed |
|---|------|--------------|
| 1 | `childsmile_app/views_auth.py` | Unknown email → HTTP 200 generic message instead of 404 "Email not found" |
| 2 | `childsmile_app/views.py` | Added `if not user_id: return 403` to `get_children`, `get_staff`, `get_tutors`, `get_pending_tutors` |
| 3 | `childsmile_app/audit_views.py` | Added auth + admin check to `get_audit_logs` |
| 4 | `childsmile/settings.py` + `settings.py` | Added `CspMiddleware` class + HSTS + nosniff settings |

---

## Priority order if something breaks

1. **Server won't start** → revert both settings files (middleware entry + class)
2. **Login broken / stuck on TOTP screen** → revert `views_auth.py` only
3. **Pages return 403 when logged in** → revert `views.py` / `audit_views.py` auth guards

---

## Fix 1 — Login enumeration (views_auth.py)

**Symptom:** Frontend gets stuck after entering email / shows unexpected error.

Find the block in `childsmile_app/views_auth.py` (~line 100) and revert to:

```python
# REVERT TO THIS:
if not Staff.objects.filter(email__iexact=email).exists():
    log_api_action(
        request=request,
        action='USER_LOGIN_FAILED',
        success=False,
        error_message="Email not found in system",
        status_code=404,
        additional_data={'attempted_email': email}
    )
    return JsonResponse({"error": "Email not found in system"}, status=404)
```

---

## Fix 2 — API auth guards (views.py)

**Symptom:** Authenticated users get 403 on children / staff / tutors pages.

In `childsmile_app/views.py`, remove the 2-line guard from the top of each function:

```python
# REMOVE these 2 lines from get_children, get_staff, get_tutors, get_pending_tutors:
if not user_id:
    return JsonResponse({"detail": "Authentication credentials were not provided."}, status=403)
```

---

## Fix 3 — Audit log auth guard (audit_views.py)

**Symptom:** Audit log page broken for admins.

In `childsmile_app/audit_views.py`, revert `get_audit_logs` top to just:

```python
@api_view(['GET'])
def get_audit_logs(request):
    """
    Get all audit logs with translations
    UI will handle filtering, sorting, and pagination
    """
    api_logger.info("get_audit_logs called")

    try:
        # Get all audit logs, ordered by newest first
        ...
```

---

## Fix 4 — Settings / CSP / HSTS (both settings files)

**Symptom:** Server fails to start with `ModuleNotFoundError` or middleware import error.

### Step 1 — Remove CspMiddleware from MIDDLEWARE in both files:

`childsmile/childsmile/settings.py`:
```python
MIDDLEWARE = [
   "django.middleware.security.SecurityMiddleware",
    # REMOVE THIS LINE: "childsmile.settings.CspMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    ...
```

`childsmile/settings.py`:
```python
MIDDLEWARE = [
   "django.middleware.security.SecurityMiddleware",
    # REMOVE THIS LINE: "settings.CspMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    ...
```

### Step 2 — Remove the CspMiddleware class from the top of both files (lines 10–24):

```python
# REMOVE this entire block from both settings files:
class CspMiddleware:
    """Adds Content-Security-Policy to every API response (PT Finding #4)."""
    _CSP = "default-src 'none'; frame-ancestors 'none';"

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if "Content-Security-Policy" not in response:
            response["Content-Security-Policy"] = self._CSP
        return response
```

### Step 3 — If HTTPS redirect loops occur, also remove from both settings files:

```python
# REMOVE if causing redirect loops:
SECURE_HSTS_SECONDS = 31536000 if IS_PROD else 0
SECURE_HSTS_INCLUDE_SUBDOMAINS = IS_PROD
SECURE_HSTS_PRELOAD = IS_PROD
SECURE_CONTENT_TYPE_NOSNIFF = True
```

---

## Notes

- The API auth guards (Fix 2 & 3) are **lowest risk** — they only block unauthenticated requests.
  Logged-in users (TOTP or Google OAuth) are unaffected.
- HSTS (`SECURE_HSTS_SECONDS`) is **prod-only** (`IS_PROD` flag) — dev is unaffected.
- The enumeration fix (Fix 1) is purely a response-message change — no functional login impact expected.
