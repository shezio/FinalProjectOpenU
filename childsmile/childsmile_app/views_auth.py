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
import json
import traceback


@csrf_exempt
@api_view(["POST"])
@ratelimit(key='ip', rate='5/m', method='POST', block=True)
def login_email(request):
    """
    Send TOTP code to email address
    """
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
        
        # Invalidate any existing codes for this email
        TOTPCode.objects.filter(email=email, used=False).update(used=True)
        
        # Generate new TOTP code
        code = TOTPCode.generate_code()
        totp_record = TOTPCode.objects.create(email=email, code=code)
        
        # Send email
        subject = "Your Login Code - Child's Smile"
        message = f"""
        Hello,
        
        Your login code is: {code}
        
        This code will expire in 5 minutes.
        
        If you didn't request this code, please ignore this email.
        
        Best regards,
        Child's Smile Team
        """
        
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [email],
            fail_silently=False,
        )
        
        print(f"DEBUG: Sent TOTP code {code} to {email}")
        
        return JsonResponse({
            "message": "Login code sent to your email",
            "email": email
        })
        
    except Exception as e:
        print(f"ERROR in login_email: {str(e)}")
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
    Verify TOTP code and create session
    """
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
            return JsonResponse({"error": "Email and code are required"}, status=400)
        
        # Find TOTP record
        totp_record = TOTPCode.objects.filter(
            email=email,
            code=code,
            used=False
        ).order_by('-created_at').first()
        
        if not totp_record:
            log_api_action(
                request=request,
                action='USER_LOGIN_FAILED',
                success=False,
                error_message="Invalid or expired code",
                status_code=400,
                additional_data={'attempted_email': email}
            )
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
            return JsonResponse({"error": "Code has expired or too many attempts"}, status=400)
        
        totp_record.attempts += 1
        totp_record.save()
        
        if totp_record.code != code:
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
                return JsonResponse({"error": "Too many failed attempts"}, status=429)
            
            log_api_action(
                request=request,
                action='USER_LOGIN_FAILED',
                success=False,
                error_message="Invalid code",
                status_code=400,
                additional_data={'attempted_email': email}
            )
            return JsonResponse({"error": "Invalid code"}, status=400)
        
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
            return JsonResponse({"error": "Staff member not found"}, status=404)
        
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
        
        return JsonResponse({
            "message": "Login successful!",
            "user_id": staff_user.staff_id,
            "username": staff_user.username,
            "email": staff_user.email
        })
        
    except Exception as e:
        print(f"ERROR in verify_totp: {str(e)}")
        print(f"DEBUG: Full traceback: {traceback.format_exc()}")
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
    print(f"DEBUG: request.user: {request.user}")
    print(f"DEBUG: request.user.is_authenticated: {request.user.is_authenticated}")
    print(f"DEBUG: request.session.keys(): {list(request.session.keys())}")
    print(f"DEBUG: _auth_user_id: {request.session.get('_auth_user_id')}")
    
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
            print(f"DEBUG: Found Django user from session: {django_user}")
            print(f"DEBUG: Django user email: '{django_user.email}'")
            print(f"DEBUG: Django user username: '{django_user.username}'")
        except User.DoesNotExist:
            print(f"DEBUG: Django user with ID {user_id_from_session} not found")
    
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
        return JsonResponse({"error": "Not authenticated"}, status=401)
    
    print(f"DEBUG: About to search for Staff with email: '{django_user.email}'")
    
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
        return JsonResponse({"error": str(e)}, status=500)
