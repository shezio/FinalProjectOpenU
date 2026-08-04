from django.contrib import admin
from django.contrib.auth.models import Group, User

# ---------------------------------------------------------------------------
# SECURITY — the Django admin site intentionally exposes NOTHING.
#
# /admin/ is a parallel CRUD surface that bypasses this application's entire
# authorization model: the custom Staff/role permissions, the is_admin gate,
# the TOTP step-up, and audit logging. Registering models such as Role,
# Permissions or Staff here would let anyone holding a Django auth_user with
# is_staff/superuser grant themselves permissions or edit roles directly
# ("administer themselves") with none of the app-level guardrails.
#
# We therefore register NO application models here, and also strip Django's
# built-in User/Group admin so /admin/ cannot be used to mint a new superuser
# either. All administration happens through the application's own screens and
# APIs (System Management, and the planned Access Management screen).
#
# ⚠️  Do NOT register models here without a security review.
# ---------------------------------------------------------------------------

# Remove Django's default auth admin. Guarded broadly so a missing registration
# (load-order dependent) can never break app startup.
for _model in (Group, User):
    try:
        admin.site.unregister(_model)
    except Exception:
        pass