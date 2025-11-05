"""
Authentication views - Login, TOTP verification, Google OAuth
"""
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view
from django_ratelimit.decorators import ratelimit
from django.core.mail import send_mail
from django.conf import settings
from .models import Staff, TOTPCode
from .audit_utils import log_api_action
from .logger import api_logger
import json
import traceback


@csrf_exempt
@api_view(["POST"])
@ratelimit(key='ip', rate='5/m', method='POST', block=True)
def login_email(request):
    """
    Send TOTP code to email address
    """
    api_logger.info("login_email called")
    try:
        data = json.loads(request.body)
        email = data.get('email', '').strip().lower()
        
        if not email:
            log_api_action(
                request=request,
                action='USER_LOGIN_FAILED',
                success=False,
                error_message="Email is required",
                status_code=400,
                additional_data={'attempted_email': 'missing'}
            )
            user_id = request.session.get("user_id", "unknown")
            api_logger.warning(f"User {user_id} attempted to log in without providing an email.")
            return JsonResponse({"error": "Email is required"}, status=400)
        
        # Validate email format (basic)
        if '@' not in email or '.' not in email.split('@')[1]:
            log_api_action(
                request=request,
                action='USER_LOGIN_FAILED',
                success=False,
                error_message="Invalid email format",
                status_code=400,
                additional_data={'attempted_email': email}
            )
            return JsonResponse({"error": "Invalid email format"}, status=400)
        
        # ✅ GUEST ACCOUNT - Always send 000000
        if email == 'guest@childsmile.guest':
            api_logger.info(f"Guest account login attempt: {email}")
            return JsonResponse({
                "message": "Login code sent to your email",
                "email": email,
                "is_guest": True
            })
        
        # Check if email exists in Staff table
        if not Staff.objects.filter(email=email).exists():
            log_api_action(
                request=request,
                action='USER_LOGIN_FAILED',
                success=False,
                error_message="Email not found in system",
                status_code=404,
                additional_data={'attempted_email': email}
            )
            return JsonResponse({"error": "Email not found in system"}, status=404)
        
        # CHECK IF USER IS APPROVED FOR REGISTRATION
        staff_user = Staff.objects.get(email=email)
        if not staff_user.registration_approved:
            log_api_action(
                request=request,
                action='USER_LOGIN_FAILED',
                success=False,
                error_message="Registration not yet approved by administrator",
                status_code=403,
                additional_data={
                    'attempted_email': email,
                    'reason': 'registration_not_approved'
                }
            )
            api_logger.warning(f"TOTP send attempt by non-approved user {staff_user.staff_id} ({email})")
            return JsonResponse({
                "error": "הרשמתך בהמתנה לאישור מנהל המערכת. אנא המתן לאישור.",
                "pending_approval": True
            }, status=403)
        
        # Invalidate any existing codes for this email
        TOTPCode.objects.filter(email=email, used=False).update(used=True)
        
        # Generate new TOTP code
        code = TOTPCode.generate_code()
        totp_record = TOTPCode.objects.create(email=email, code=code)
        
        # Send email
        subject = "קוד הכניסה שלך - חיוך של ילד"
        message = f"""
        שלום,
        
        קוד הכניסה שלך הוא: {code}
        
        הקוד יפוג בעוד 5 דקות.
        
        אם לא ביקשת קוד זה, אנא התעלם מהודעה זו.
        
        בברכה,
        צוות חיוך של ילד
        """
        
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [email],
            fail_silently=False,
        )
        
        api_logger.debug(f"Sent TOTP code {code} to {email}")
        
        return JsonResponse({
            "message": "Login code sent to your email",
            "email": email
        })
        
    except Exception as e:
        api_logger.error(f"Error in login_email: {str(e)}")
        log_api_action(
            request=request,
            action='TOTP_SEND_FAILED',
            success=False,
            error_message=str(e),
            status_code=500,
            additional_data={'attempted_email': data.get('email', 'unknown') if 'data' in locals() else 'unknown'}
        )
        return JsonResponse({"error": "Failed to send login code"}, status=500)


@csrf_exempt
@api_view(["POST"])
@ratelimit(key='ip', rate='10/m', method='POST', block=True)
def verify_totp(request):
    """
    Verify TOTP code from email
    """
    api_logger.info("verify_totp called")
    try:
        data = json.loads(request.body)
        email = data.get('email', '').strip().lower()
        code = data.get('code', '').strip()
        
        if not email or not code:
            log_api_action(
                request=request,
                action='USER_LOGIN_FAILED',
                success=False,
                error_message="Email and code are required",
                status_code=400,
                additional_data={'attempted_email': email or 'missing'}
            )
            user_id = request.session.get("user_id", "unknown")
            # if we have code and not email, warn no email, if we have no code but email we warn no code - if none both - we warn both
            if code and not email:
                api_logger.warning(f"User {user_id} attempted to verify TOTP without providing an email.")
            elif email and not code:
                api_logger.warning(f"User {user_id} attempted to verify TOTP without providing a code using email {email}.")
            else:
                api_logger.warning(f"User {user_id} attempted to verify TOTP without providing email and code.")
            return JsonResponse({"error": "Email and code are required"}, status=400)
        
        # ✅ GUEST ACCOUNT - Accept only 000000
        if email == 'guest@childsmile.guest':
            if code != '000000':
                api_logger.warning(f"Invalid guest code attempt: {code}")
                return JsonResponse({"error": "Invalid or expired code"}, status=400)

            try:
                staff_user = Staff.objects.get(email=email)
            except Staff.DoesNotExist:
                api_logger.warning(f"Guest staff not found")
                return JsonResponse({"error": "Staff member not found"}, status=404)
            
            # Create session
            request.session.create()
            request.session["user_id"] = staff_user.staff_id
            request.session["username"] = staff_user.username
            request.session["is_guest"] = True
            request.session.set_expiry(86400)
            
            api_logger.info(f"Guest user logged in successfully")
            return JsonResponse({
                "message": "Login successful!",
                "user_id": staff_user.staff_id,
                "username": staff_user.username,
                "email": staff_user.email,
                "is_guest": True
            })
        
        # Find ANY active TOTP record for this email (regardless of code submitted)
        totp_record = TOTPCode.objects.filter(
            email=email,
            used=False
        ).order_by('-created_at').first()
        
        if not totp_record:
            # Check if there's an expired record (used=True) for this email with correct code
            expired_record = TOTPCode.objects.filter(
                email=email,
                code=code,
                used=True
            ).order_by('-created_at').first()
            
            if expired_record and expired_record.attempts >= 3:
                # Correct code used AFTER max attempts - BRUTE FORCE ATTACK
                api_logger.critical(f"BRUTE FORCE ATTACK DETECTED: Correct TOTP code used after {expired_record.attempts} failed attempts for {email}")
            
            log_api_action(
                request=request,
                action='USER_LOGIN_FAILED',
                success=False,
                error_message="Invalid or expired code",
                status_code=400,
                additional_data={'attempted_email': email}
            )
            api_logger.warning(f"Invalid or expired TOTP code attempt for {email}")
            return JsonResponse({"error": "Invalid or expired code"}, status=400)
        
        if not totp_record.is_valid():
            log_api_action(
                request=request,
                action='USER_LOGIN_FAILED',
                success=False,
                error_message="Code has expired or too many attempts",
                status_code=400,
                additional_data={'attempted_email': email}
            )
            api_logger.warning(f"TOTP code expired for {email}")
            return JsonResponse({"error": "Code has expired or too many attempts"}, status=400)
        
        # Check if code submitted is correct
        if totp_record.code != code:
            # Wrong code - increment attempts
            totp_record.attempts += 1
            totp_record.save()
            
            if totp_record.attempts >= 3:
                # Max attempts reached on wrong codes - expire the code to prevent further attempts
                totp_record.used = True
                totp_record.save()
                log_api_action(
                    request=request,
                    action='USER_LOGIN_FAILED',
                    success=False,
                    error_message="Too many failed attempts",
                    status_code=429,
                    additional_data={'attempted_email': email}
                )
                api_logger.critical(f"BRUTE FORCE ATTEMPT: Too many failed TOTP attempts for {email} - code expired")
                return JsonResponse({"error": "Too many failed attempts"}, status=429)
            
            log_api_action(
                request=request,
                action='USER_LOGIN_FAILED',
                success=False,
                error_message="Invalid or expired code",
                status_code=400,
                additional_data={'attempted_email': email}
            )
            api_logger.warning(f"Invalid TOTP code attempt #{totp_record.attempts} for {email}")
            return JsonResponse({"error": "Invalid or expired code"}, status=400)
        
        # ✅ Correct code submitted
        # Check if attempts already exceeded (brute force with correct code after max failed attempts)
        if totp_record.attempts >= 3:
            totp_record.used = True
            totp_record.save()
            log_api_action(
                request=request,
                action='USER_LOGIN_FAILED',
                success=False,
                error_message="Too many failed attempts",
                status_code=429,
                additional_data={'attempted_email': email}
            )
            api_logger.critical(f"BRUTE FORCE ATTACK DETECTED: Correct TOTP code used after {totp_record.attempts} failed attempts for {email}")
            return JsonResponse({"error": "Too many failed attempts"}, status=429)
        
        # Mark code as used
        totp_record.used = True
        totp_record.save()
        
        # Find Staff member
        try:
            staff_user = Staff.objects.get(email=email)
        except Staff.DoesNotExist:
            log_api_action(
                request=request,
                action='USER_LOGIN_FAILED',
                success=False,
                error_message="Staff member not found",
                status_code=404,
                additional_data={'attempted_email': email}
            )
            api_logger.warning(f"User {user_id} attempted to log in without providing a staff email.")
            return JsonResponse({"error": "Staff member not found"}, status=404)
        
        # CHECK IF USER IS APPROVED FOR REGISTRATION
        if not staff_user.registration_approved:
            log_api_action(
                request=request,
                action='USER_LOGIN_FAILED',
                success=False,
                error_message="Registration not yet approved by administrator",
                status_code=403,
                additional_data={
                    'attempted_email': email,
                    'reason': 'registration_not_approved'
                }
            )
            api_logger.warning(f"Login attempt by non-approved user {staff_user.staff_id} ({email})")
            return JsonResponse({
                "error": "הרשמתך בהמתנה לאישור מנהל המערכת. אנא המתן לאישור.",
                "pending_approval": True
            }, status=403)
        
        # **ENHANCED TOTP VERIFICATION SUCCESS**
        log_api_action(
            request=request,
            action='TOTP_VERIFICATION_SUCCESS',
            success=True,
            entity_type='Authentication',
            entity_ids=[staff_user.staff_id],
            additional_data={
                'verified_email': email,
                'verification_method': 'TOTP_EMAIL',
                'code_attempts_used': totp_record.attempts,
                'user_full_name': f"{staff_user.first_name} {staff_user.last_name}",
                'user_roles': [role.role_name for role in staff_user.roles.all()],
                'security_event': True,
                'login_step': 'totp_verification_completed'
            }
        )
        
        api_logger.info(f"TOTP verification successful for user {staff_user.staff_id} ({email})")

        # Create session
        request.session.create()
        request.session["user_id"] = staff_user.staff_id
        request.session["username"] = staff_user.username
        request.session.set_expiry(86400)
        
        # **ENHANCED USER LOGIN SUCCESS**
        log_api_action(
            request=request,
            action='USER_LOGIN_SUCCESS',
            entity_type='Staff',
            entity_ids=[staff_user.staff_id],
            success=True,
            additional_data={
                'login_method': 'TOTP_EMAIL',
                'verified_email': email,
                'totp_attempts': totp_record.attempts,
                'user_full_name': f"{staff_user.first_name} {staff_user.last_name}",
                'user_roles': [role.role_name for role in staff_user.roles.all()],
                'session_duration_hours': 24,
                'login_step': 'session_created'
            }
        )
        api_logger.info(f"User {staff_user.staff_id} logged in successfully via TOTP.")
        return JsonResponse({
            "message": "Login successful!",
            "user_id": staff_user.staff_id,
            "username": staff_user.username,
            "email": staff_user.email
        })
        
    except Exception as e:
        api_logger.error(f"Error in verify_totp: {str(e)}")
        api_logger.error(f"Full traceback: {traceback.format_exc()}")
        log_api_action(
            request=request,
            action='USER_LOGIN_FAILED',
            success=False,
            error_message=str(e),
            status_code=500
        )
        return JsonResponse({"error": "Verification failed"}, status=500)


@csrf_exempt
@api_view(["POST"])
def google_login_success(request):
    """
    Setup session for Google OAuth user
    """
    api_logger.info("google_login_success called in views_auth.py")
    api_logger.debug(f"request.user: {request.user}")
    api_logger.debug(f"request.user.is_authenticated: {request.user.is_authenticated}")
    api_logger.debug(f"request.session.keys(): {list(request.session.keys())}")
    api_logger.debug(f"_auth_user_id: {request.session.get('_auth_user_id')}")
    
    # Try to get Django User from session
    django_user = None
    user_id_from_session = request.session.get('_auth_user_id')
    
    if request.user.is_authenticated:
        django_user = request.user
    elif user_id_from_session:
        # Manually get the user from session
        from django.contrib.auth.models import User
        try:
            django_user = User.objects.get(id=user_id_from_session)
            api_logger.debug(f"Found Django user from session: {django_user}")
            api_logger.debug(f"Django user email: '{django_user.email}'")
            api_logger.debug(f"Django user username: '{django_user.username}'")
        except User.DoesNotExist:
            api_logger.debug(f"Django user with ID {user_id_from_session} not found")
    
    if not django_user:
        log_api_action(
            request=request,
            action='GOOGLE_LOGIN_FAILED',
            success=False,
            error_message="Not authenticated - no Django user found",
            status_code=401,
            additional_data={
                'login_method': 'Google OAuth',
                'attempted_email': 'unknown',
                'failure_reason': 'no_django_user'
            }
        )
        user_id = request.session.get("user_id", "unknown")
        api_logger.warning(f"User {user_id} not authenticated - no Django user found")
        return JsonResponse({"error": "Not authenticated"}, status=401)
    
    api_logger.debug(f"About to search for Staff with email: '{django_user.email}'")
    
    try:
        # Find the Staff record by email
        staff_user = Staff.objects.get(email=django_user.email)
        
        # Create session
        request.session.flush()
        request.session.create()
        request.session["user_id"] = staff_user.staff_id
        request.session["username"] = staff_user.username
        request.session.set_expiry(86400)
        
        # **ENHANCED GOOGLE LOGIN SUCCESS**
        log_api_action(
            request=request,
            action='GOOGLE_LOGIN_SUCCESS',
            entity_type='Staff',
            entity_ids=[staff_user.staff_id],
            success=True,
            additional_data={
                'login_method': 'Google OAuth',
                'user_full_name': f"{staff_user.first_name} {staff_user.last_name}",
                'user_roles': [role.role_name for role in staff_user.roles.all()],
                'google_email': django_user.email
            }
        )
        api_logger.info(f"User {staff_user.staff_id} logged in successfully via Google OAuth.")
        return JsonResponse({
            "message": "Google login successful!",
            "user_id": staff_user.staff_id,
            "username": staff_user.username,
            "email": staff_user.email
        })
        
    except Staff.DoesNotExist:
        # **ENHANCED GOOGLE LOGIN FAILED - WITH ATTEMPTED EMAIL**
        log_api_action(
            request=request,
            action='GOOGLE_LOGIN_FAILED',
            success=False,
            error_message=f"Access denied. Email {django_user.email} is not authorized to access this system",
            status_code=404,
            additional_data={
                'login_method': 'Google OAuth',
                'attempted_email': django_user.email,
                'failure_reason': 'email_not_found_in_system',
                'google_username': django_user.username if hasattr(django_user, 'username') else 'unknown'
            }
        )
        user_id = request.session.get("user_id", "unknown")
        api_logger.warning(f"User {user_id} Google login failed - no Django user found")
        return JsonResponse({"error": f"Access denied. Email {django_user.email} is not authorized to access this system"}, status=404)
        
    except Exception as e:
        # **ENHANCED GOOGLE LOGIN FAILED**
        attempted_email = django_user.email if django_user else 'unknown'
        log_api_action(
            request=request,
            action='GOOGLE_LOGIN_FAILED',
            success=False,
            error_message=str(e),
            status_code=500,
            additional_data={
                'login_method': 'Google OAuth',
                'attempted_email': attempted_email,
                'failure_reason': 'system_error'
            }
        )
        api_logger.exception(f"Error in google_login_success: {str(e)}")
        return JsonResponse({"error": str(e)}, status=500)
