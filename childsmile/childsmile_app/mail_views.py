"""
Mail sending views - Send emails via UI with attachments
"""
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view
from django.core.mail import EmailMessage
from django.conf import settings
from django.db import DatabaseError, transaction
from .models import Staff
from .utils import conditional_csrf, is_admin
from .audit_utils import log_api_action
from .logger import api_logger
import json
import re
from django.core.exceptions import ValidationError

# Constants for mail sending
MAX_TOTAL_ATTACHMENT_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_ATTACHMENT_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.pdf', '.xls', '.xlsx']
ALLOWED_ATTACHMENT_MIMETYPES = [
    'image/png',
    'image/jpeg',
    'application/pdf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]
MAX_SUBJECT_LENGTH = 50
MAX_BODY_LENGTH = 250


def validate_email_addresses(to_addresses_str):
    """
    Validate email addresses from comma-separated string
    Returns tuple (is_valid, emails_list, error_message)
    """
    if not to_addresses_str or not to_addresses_str.strip():
        return False, [], "TO field is required"
    
    # Split by comma and strip whitespace
    emails = [email.strip() for email in to_addresses_str.split(',')]
    
    # Remove empty strings
    emails = [email for email in emails if email]
    
    if not emails:
        return False, [], "TO field is required"
    
    # Basic email regex validation
    email_pattern = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
    
    invalid_emails = []
    for email in emails:
        if not re.match(email_pattern, email):
            invalid_emails.append(email)
    
    if invalid_emails:
        return False, [], f"Invalid email addresses: {', '.join(invalid_emails)}"
    
    return True, emails, ""


def validate_subject(subject):
    """
    Validate subject field
    Returns tuple (is_valid, error_message)
    """
    if not subject or not subject.strip():
        return False, "Subject is required"
    
    if len(subject) > MAX_SUBJECT_LENGTH:
        return False, f"Subject must be maximum {MAX_SUBJECT_LENGTH} characters"
    
    return True, ""


def validate_body(body):
    """
    Validate body field
    Returns tuple (is_valid, error_message)
    """
    if not body or not body.strip():
        return False, "Body is required"
    
    if len(body) > MAX_BODY_LENGTH:
        return False, f"Body must be maximum {MAX_BODY_LENGTH} characters"
    
    return True, ""


def validate_attachments(files):
    """
    Validate attachment files
    Returns tuple (is_valid, total_size, error_message)
    """
    if not files:
        return True, 0, ""
    
    total_size = 0
    
    for file in files:
        # Check file extension
        file_name = file.name.lower()
        file_ext = None
        for ext in ALLOWED_ATTACHMENT_EXTENSIONS:
            if file_name.endswith(ext):
                file_ext = ext
                break
        
        if not file_ext:
            return False, 0, f"File '{file.name}' has invalid extension. Allowed: {', '.join(ALLOWED_ATTACHMENT_EXTENSIONS)}"
        
        # Check file size
        file_size = file.size
        total_size += file_size
        
        if file_size > MAX_TOTAL_ATTACHMENT_SIZE:
            return False, 0, f"Single file '{file.name}' exceeds {MAX_TOTAL_ATTACHMENT_SIZE / (1024 * 1024)}MB limit"
    
    # Check total size
    if total_size > MAX_TOTAL_ATTACHMENT_SIZE:
        return False, 0, f"Total attachment size ({total_size / (1024 * 1024):.2f}MB) exceeds {MAX_TOTAL_ATTACHMENT_SIZE / (1024 * 1024)}MB limit"
    
    return True, total_size, ""


@conditional_csrf
@api_view(["POST"])
def send_mail_via_ui(request):
    """
    Send email via UI with attachments
    Only accessible to admin users
    """
    api_logger.info("send_mail_via_ui called")
    
    user_id = request.session.get("user_id")
    if not user_id:
        log_api_action(
            request=request,
            action='SEND_MAIL_FAILED',
            success=False,
            error_message="Authentication credentials were not provided",
            status_code=403
        )
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."},
            status=403
        )
    
    try:
        user = Staff.objects.get(staff_id=user_id)
    except Staff.DoesNotExist:
        log_api_action(
            request=request,
            action='SEND_MAIL_FAILED',
            success=False,
            error_message="User not found",
            status_code=404
        )
        return JsonResponse({"error": "User not found"}, status=404)
    
    # Check if user is admin
    if not is_admin(user):
        log_api_action(
            request=request,
            action='SEND_MAIL_FAILED',
            success=False,
            error_message="You do not have permission to send emails",
            status_code=401,
            entity_type='Mail',
            additional_data={'user_email': user.email}
        )
        return JsonResponse(
            {"error": "You do not have permission to send emails."},
            status=401
        )
    
    try:
        # Get form data
        to_addresses_str = request.POST.get('to', '').strip()
        subject = request.POST.get('subject', '').strip()
        body = request.POST.get('body', '').strip()
        from_override = request.POST.get('from_override', '').strip()  # Not used, but allowed in form
        
        # Validate TO field
        is_valid, emails, error_msg = validate_email_addresses(to_addresses_str)
        if not is_valid:
            log_api_action(
                request=request,
                action='SEND_MAIL_FAILED',
                success=False,
                error_message=f"Invalid TO addresses: {error_msg}",
                status_code=400,
                entity_type='Mail',
                additional_data={'user_email': user.email}
            )
            return JsonResponse({"error": error_msg}, status=400)
        
        # Validate subject
        is_valid, error_msg = validate_subject(subject)
        if not is_valid:
            log_api_action(
                request=request,
                action='SEND_MAIL_FAILED',
                success=False,
                error_message=f"Invalid subject: {error_msg}",
                status_code=400,
                entity_type='Mail',
                additional_data={'user_email': user.email, 'recipient_count': len(emails)}
            )
            return JsonResponse({"error": error_msg}, status=400)
        
        # Validate body
        is_valid, error_msg = validate_body(body)
        if not is_valid:
            log_api_action(
                request=request,
                action='SEND_MAIL_FAILED',
                success=False,
                error_message=f"Invalid body: {error_msg}",
                status_code=400,
                entity_type='Mail',
                additional_data={'user_email': user.email, 'recipient_count': len(emails)}
            )
            return JsonResponse({"error": error_msg}, status=400)
        
        # Get attachments
        files = request.FILES.getlist('attachments')
        
        # Validate attachments
        is_valid, total_size, error_msg = validate_attachments(files)
        if not is_valid:
            log_api_action(
                request=request,
                action='SEND_MAIL_FAILED',
                success=False,
                error_message=f"Invalid attachments: {error_msg}",
                status_code=400,
                entity_type='Mail',
                additional_data={
                    'user_email': user.email,
                    'recipient_count': len(emails),
                    'attachment_count': len(files)
                }
            )
            return JsonResponse({"error": error_msg}, status=400)
        
        # Send email to each recipient using EmailMessage to support attachments
        for email in emails:
            try:
                # Format body as HTML
                html_body = f"""
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * {{ direction: rtl; unicode-bidi: embed; }}
        html, body {{ direction: rtl; }}
        body {{ text-align: right; font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; direction: rtl; }}
        .content {{ background-color: white; padding: 20px; border: 1px solid #ddd; border-radius: 5px; direction: rtl; text-align: right; }}
        .header {{ border-bottom: 2px solid #9333EA; padding-bottom: 10px; margin-bottom: 20px; direction: rtl; text-align: right; }}
        .subject {{ font-size: 18px; font-weight: bold; color: #333; margin-bottom: 10px; direction: rtl; text-align: right; }}
        .body-text {{ color: #555; white-space: pre-wrap; word-wrap: break-word; direction: rtl; text-align: right; unicode-bidi: embed; }}
        .footer {{ margin-top: 20px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 12px; color: #999; direction: rtl; text-align: right; }}
    </style>
</head>
<body dir="rtl">
    <div class="container">
        <div class="content">
            <div class="header">
                <div class="subject">{re.sub(r'<', '&lt;', re.sub(r'>', '&gt;', subject))}</div>
            </div>
            <div class="body-text">{re.sub(r'<', '&lt;', re.sub(r'>', '&gt;', body))}</div>
            <div class="footer">
                <p>בברכה,<br>צוות חיוך של ילד</p>
            </div>
        </div>
    </div>
</body>
</html>
"""
                
                # Create EmailMessage instance
                email_message = EmailMessage(
                    subject=subject,
                    body=html_body,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    to=[email],
                )
                
                # Set as HTML
                email_message.content_subtype = 'html'
                
                # Attach files
                for file in files:
                    email_message.attach(file.name, file.read(), file.content_type)
                
                # Send email
                email_message.send(fail_silently=False)
                
            except Exception as e:
                api_logger.error(f"Failed to send email to {email}: {str(e)}")
                log_api_action(
                    request=request,
                    action='SEND_MAIL_FAILED',
                    success=False,
                    error_message=f"Failed to send email to {email}: {str(e)}",
                    status_code=500,
                    entity_type='Mail',
                    additional_data={'user_email': user.email, 'recipient_email': email}
                )
                return JsonResponse(
                    {"error": f"Failed to send email to {email}. Please try again."},
                    status=500
                )
        
        log_api_action(
            request=request,
            action='SEND_MAIL_SUCCESS',
            success=True,
            status_code=200,
            entity_type='Mail',
            additional_data={
                'user_email': user.email,
                'recipient_count': len(emails),
                'subject': subject[:50],  # Store first 50 chars
                'attachment_count': len(files),
                'total_attachment_size_mb': total_size / (1024 * 1024)
            }
        )
        
        api_logger.info(
            f"Email sent successfully by {user.email} to {len(emails)} recipients "
            f"with {len(files)} attachments ({total_size / (1024 * 1024):.2f}MB)"
        )
        
        return JsonResponse({
            "message": "Email sent successfully",
            "recipients": len(emails),
            "attachments": len(files)
        }, status=200)
    
    except Exception as e:
        error_message = str(e)
        api_logger.error(f"Error in send_mail_via_ui: {error_message}", exc_info=True)
        log_api_action(
            request=request,
            action='SEND_MAIL_FAILED',
            success=False,
            error_message=f"Error sending email: {error_message}",
            status_code=500,
            entity_type='Mail',
            additional_data={'user_email': user.email}
        )
        return JsonResponse(
            {"error": "An error occurred while sending the email. Please try again."},
            status=500
        )

