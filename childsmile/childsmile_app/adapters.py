from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from allauth.exceptions import ImmediateHttpResponse
from django.shortcuts import redirect
from django.contrib import messages
from django.urls import reverse
from .models import Staff

class CustomSocialAccountAdapter(DefaultSocialAccountAdapter):
    
    def pre_social_login(self, request, sociallogin):
        """
        Check if the Google user's email is in our Staff table.
        If not, reject the login.
        """
        # Get email from Google
        email = sociallogin.account.extra_data.get('email')
            
        print(f"DEBUG: Email from Google: {email}")
        print(f"DEBUG: Extra data: {sociallogin.account.extra_data}")
        
        if not email:
            messages.error(request, "Unable to get email from Google account.")
            raise ImmediateHttpResponse(redirect('/accounts/login/'))
        
        # Check if this email exists in our Staff table
        if not Staff.objects.filter(email=email).exists():
            messages.error(request, f"Access denied. Email {email} is not authorized to access this system.")
            raise ImmediateHttpResponse(redirect('/accounts/login/'))
    
    def save_user(self, request, sociallogin, form=None):
        """
        Create/link Django User based on email only.
        """
        email = sociallogin.account.extra_data.get('email')
        google_name = sociallogin.account.extra_data.get('name', '')
        
        try:
            # Find the existing staff member by email
            staff_user = Staff.objects.get(email=email)
            
            # Get or create the corresponding Django User
            from django.contrib.auth.models import User
            django_user, created = User.objects.get_or_create(
                email=email,  # Use email as unique identifier
                defaults={
                    'username': email,  # Use email as username
                    'first_name': google_name.split(' ')[0] if google_name else '',
                    'last_name': ' '.join(google_name.split(' ')[1:]) if len(google_name.split(' ')) > 1 else '',
                }
            )
            
            print(f"DEBUG: Created/found Django user: {django_user.username}")
            return django_user
            
        except Staff.DoesNotExist:
            messages.error(request, "Staff member not found.")
            raise ImmediateHttpResponse(redirect('/accounts/login/'))