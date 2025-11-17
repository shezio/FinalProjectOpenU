from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from allauth.exceptions import ImmediateHttpResponse
from django.shortcuts import redirect
from django.contrib import messages
from django.urls import reverse
from .models import Staff
from django.contrib.auth.models import User
from .audit_utils import log_api_action
from django.conf import settings

class CustomSocialAccountAdapter(DefaultSocialAccountAdapter):
    
    def pre_social_login(self, request, sociallogin):
        """
        Check if the Google user's email is in our Staff table.
        If not, reject the login.
        If yes, link to existing Django User or create one.
        """
        # Get email from Google
        email = sociallogin.account.extra_data.get('email')
        google_name = sociallogin.account.extra_data.get('name', '')
            
        print(f"DEBUG: Email from Google: {email}")
        print(f"DEBUG: Extra data: {sociallogin.account.extra_data}")
        
        if not email:
            print("DEBUG: No email from Google - redirecting to React app")
            
            # Log failed Google login attempt - no email
            log_api_action(
                request=request,
                action='GOOGLE_LOGIN_FAILED',
                success=False,
                error_message="Unable to get email from Google account",
                status_code=400,
                additional_data={'failure_reason': 'no_email_from_google'}
            )
            
            # Redirect to React app instead of Django login page
            nomailurl = f"{settings.LOCAL_URL}?error=no_email" if not settings.IS_PROD else f"{settings.CLOUDFRONT_URL}?error=no_email"
            raise ImmediateHttpResponse(redirect(nomailurl))

        # Check if this email exists in our Staff table
        if not Staff.objects.filter(email=email).exists():
            print(f"DEBUG: Email {email} not found in Staff table - redirecting to React app")
            
            # Log failed Google login attempt - unauthorized email
            log_api_action(
                request=request,
                action='GOOGLE_LOGIN_FAILED',
                success=False,
                error_message=f"Access denied. Email {email} is not authorized to access this system",
                status_code=401,
                additional_data={
                    'attempted_email': email,
                    'failure_reason': 'email_not_authorized',
                    'google_name': google_name
                }
            )
            
            # Redirect to React app with error message instead of Django login page
            unauthurl = f"{settings.LOCAL_URL}?error=unauthorized&email={email}" if not settings.IS_PROD else f"{settings.CLOUDFRONT_URL}?error=unauthorized&email={email}"
            raise ImmediateHttpResponse(redirect(unauthurl))

        # **Continue with existing user creation logic**
        try:
            # Try to get existing Django User
            existing_user = User.objects.get(email=email)
            sociallogin.user = existing_user
            print(f"DEBUG: Found existing Django user: {existing_user.username}")
        except User.DoesNotExist:
            # Create Django User immediately
            staff_user = Staff.objects.get(email=email)
            
            # Create a unique username (in case email is too long)
            username = email
            if len(username) > 150:  # Django username max length
                username = email.split('@')[0][:150]
            
            # Ensure username is unique
            original_username = username
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f"{original_username}_{counter}"
                counter += 1
            
            django_user = User.objects.create_user(
                username=username,
                email=email,
                first_name=google_name.split(' ')[0] if google_name else staff_user.first_name,
                last_name=' '.join(google_name.split(' ')[1:]) if len(google_name.split(' ')) > 1 else staff_user.last_name,
            )
            
            # Set unusable password since we use TOTP/Google
            django_user.set_unusable_password()
            django_user.save()
            
            # Link this user to the social login
            sociallogin.user = django_user
            print(f"DEBUG: Created new Django user: {django_user.username} for email: {email}")
    
    def save_user(self, request, sociallogin, form=None):
        """
        User should already be created in pre_social_login, just return it.
        Also log successful Google login.
        """
        print(f"DEBUG: save_user called - returning existing user: {sociallogin.user}")
        
        # Log successful Google login
        try:
            staff_user = Staff.objects.get(email=sociallogin.user.email)
            log_api_action(
                request=request,
                action='GOOGLE_LOGIN_SUCCESS',
                entity_type='Staff',
                entity_ids=[staff_user.staff_id],
                success=True,
                additional_data={
                    'login_method': 'Google OAuth',
                    'google_email': sociallogin.user.email,
                    'staff_username': staff_user.username
                }
            )
        except Staff.DoesNotExist:
            print(f"ERROR: Staff not found for email {sociallogin.user.email} during Google login")
        
        return sociallogin.user
    
    def is_auto_signup_allowed(self, request, sociallogin):
        """
        Skip the signup form - we handle user creation in pre_social_login
        """
        return True
    
    def authentication_error(self, request, provider_id, error=None, exception=None, extra_context=None):
        """
        Handle authentication errors (including cancellation) by redirecting to React app
        """
        print(f"DEBUG: Google authentication error - provider: {provider_id}, error: {error}")
        
        # Log failed Google login attempt - authentication error
        log_api_action(
            request=request,
            action='GOOGLE_LOGIN_FAILED',
            success=False,
            error_message=f"Google authentication failed: {error}",
            status_code=400,
            additional_data={
                'failure_reason': 'authentication_error',
                'provider_id': provider_id,
                'error_details': str(error) if error else 'Unknown error'
            }
        )
        authfailurl = f"{settings.LOCAL_URL}?error=auth_failed" if not settings.IS_PROD else f"{settings.CLOUDFRONT_URL}?error=auth_failed"
        return redirect(authfailurl)

    def get_login_redirect_url(self, request):
        """
        Redirect successful logins to React app
        """
        return f"{settings.LOCAL_URL}/" if not settings.IS_PROD else f"{settings.CLOUDFRONT_URL}/"