from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from allauth.exceptions import ImmediateHttpResponse
from django.shortcuts import redirect
from django.contrib import messages
from django.urls import reverse
from .models import Staff
from django.contrib.auth.models import User

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
            messages.error(request, "Unable to get email from Google account.")
            raise ImmediateHttpResponse(redirect('/accounts/login/'))
        
        # Check if this email exists in our Staff table
        if not Staff.objects.filter(email=email).exists():
            messages.error(request, f"Access denied. Email {email} is not authorized to access this system.")
            raise ImmediateHttpResponse(redirect('/accounts/login/'))
        
        # **NEW: Create Django User here to avoid signup form**
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
        User should already be created in pre_social_login, just return it
        """
        print(f"DEBUG: save_user called - returning existing user: {sociallogin.user}")
        return sociallogin.user
    
    def is_auto_signup_allowed(self, request, sociallogin):
        """
        Skip the signup form - we handle user creation in pre_social_login
        """
        return True