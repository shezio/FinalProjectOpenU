"""
Staff management views - Create, update, delete staff members
"""
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view
from django_ratelimit.decorators import ratelimit
from django.core.mail import send_mail
from django.conf import settings
from django.db import DatabaseError, transaction
from .models import Staff, Role, TOTPCode, SignedUp, Tutors, Pending_Tutor, Tasks, Task_Types
from .utils import *
from .audit_utils import log_api_action
from .logger import api_logger
from .whatsapp_utils import send_totp_login_code_whatsapp
import json
import datetime
import traceback


@conditional_csrf
@api_view(["PUT"])
def update_staff_member(request, staff_id):
    """
    Update a staff member's details
    """
    api_logger.info(f"update_staff_member called for staff_id: {staff_id}")
    
    # AUTHENTICATION FIRST - fail fast if not authenticated
    user_id = request.session.get("user_id")
    if not user_id:
        log_api_action(
            request=request,
            action='UPDATE_STAFF_FAILED',
            success=False,
            error_message="Authentication credentials were not provided",
            status_code=403
        )
        return JsonResponse({"detail": "Authentication credentials were not provided."}, status=403)

    # Then check if user is admin - only then proceed
    try:
        user = Staff.objects.get(staff_id=user_id)
    except Staff.DoesNotExist:
        log_api_action(
            request=request,
            action='UPDATE_STAFF_FAILED',
            success=False,
            error_message="User not found",
            status_code=403
        )
        return JsonResponse({"detail": "User not found."}, status=403)
    
    if not is_admin(user):
        log_api_action(
            request=request,
            action='UPDATE_STAFF_FAILED',
            success=False,
            error_message="Admin access required",
            status_code=401
        )
        return JsonResponse({"error": "Admin access required."}, status=401)

    try:
        staff_member = Staff.objects.get(staff_id=staff_id)
        
        data = request.data
        
        # Store original values for audit
        original_username = staff_member.username
        original_email = staff_member.email.lower()  # Lowercase for case-insensitive comparison
        original_first_name = staff_member.first_name
        original_last_name = staff_member.last_name
        original_roles = list(staff_member.roles.values_list("role_name", flat=True))
        
        # Track what fields are being changed - BEFORE any updates
        field_changes = []
        
        if original_username != data.get("username", staff_member.username):
            field_changes.append(f"Username: '{original_username}' → '{data.get('username')}'")
        if original_email != data.get("email", staff_member.email):
            field_changes.append(f"Email: '{original_email}' → '{data.get('email')}'")
        if original_first_name != data.get("first_name", staff_member.first_name):
            field_changes.append(f"First Name: '{original_first_name}' → '{data.get('first_name')}'")
        if original_last_name != data.get("last_name", staff_member.last_name):
            field_changes.append(f"Last Name: '{original_last_name}' → '{data.get('last_name')}'")
        
        # Check role changes
        new_roles = set(data.get("roles", original_roles))
        if new_roles != set(original_roles):
            field_changes.append(f"Roles: [{', '.join(original_roles)}] → [{', '.join(new_roles)}]")

        # Validate required fields
        required_fields = ["username", "email", "first_name", "last_name"]
        missing_fields = [
            field for field in required_fields if not data.get(field, "").strip()
        ]
        if missing_fields:
            log_api_action(
                request=request,
                action='UPDATE_STAFF_FAILED',
                success=False,
                error_message=f"Missing or empty required fields: {', '.join(missing_fields)}",
                status_code=400,
                entity_type='Staff',
                entity_ids=[staff_id],
                additional_data={
                    'staff_email': staff_member.email,
                    'staff_full_name': f"{staff_member.first_name} {staff_member.last_name}",
                    'attempted_changes': field_changes,
                    'changes_count': len(field_changes)
                }
            )
            api_logger.debug(f"Missing or empty required fields: {', '.join(missing_fields)}")
            return JsonResponse(
                {
                    "error": f"Missing or empty required fields: {', '.join(missing_fields)}"
                },
                status=400,
            )

        # Check if username already exists - ALL EXISTING CHECKS STAY EXACTLY THE SAME
        if (
            Staff.objects.filter(username=data["username"])
            .exclude(staff_id=staff_id)
            .exists()
        ):
            log_api_action(
                request=request,
                action='UPDATE_STAFF_FAILED',
                success=False,
                error_message=f"Username '{data['username']}' already exists",
                status_code=400,
                entity_type='Staff',
                entity_ids=[staff_id],
                additional_data={
                    'staff_email': staff_member.email,
                    'staff_full_name': f"{staff_member.first_name} {staff_member.last_name}",
                    'attempted_changes': field_changes,
                    'changes_count': len(field_changes)
                }
            )
            return JsonResponse(
                {"error": f"Username '{data['username']}' already exists."}, status=400
            )

        # Check if email already exists (case-insensitive)
        if (
            Staff.objects.filter(email__iexact=data["email"])
            .exclude(staff_id=staff_id)
            .exists()
        ):
            log_api_action(
                request=request,
                action='UPDATE_STAFF_FAILED',
                success=False,
                error_message=f"Email '{data['email']}' already exists",
                status_code=400,
                entity_type='Staff',
                entity_ids=[staff_id],
                additional_data={
                    'staff_email': staff_member.email,
                    'staff_full_name': f"{staff_member.first_name} {staff_member.last_name}",
                    'attempted_changes': field_changes,
                    'changes_count': len(field_changes)
                }
            )
            api_logger.warning(f"Email '{data['email']}' already exists")
            return JsonResponse(
                {"error": f"Email '{data['email']}' already exists."}, status=400
            )

        # INACTIVE STAFF FEATURE: Handle deactivation/reactivation FIRST - prioritized before email changes
        # This ensures admins can't modify staff details if they're being deactivated
        
        # HANDLE SUSPENSION CLEARING (THAW)
        if request.data.get("clear_suspension"):
            # Clear the suspension for this user - grant access
            if staff_member.deactivation_reason == "suspended":
                staff_member.deactivation_reason = None
                staff_member.save()
                
                log_api_action(
                    request=request,
                    action='CLEAR_SUSPENSION',
                    success=True,
                    error_message=None,
                    status_code=200,
                    entity_type='Staff',
                    entity_ids=[staff_id],
                    additional_data={
                        'staff_email': staff_member.email,
                        'staff_full_name': f"{staff_member.first_name} {staff_member.last_name}",
                        'performed_by': f"{user.first_name} {user.last_name}"
                    }
                )
                
                api_logger.info(f"Suspension cleared for user {staff_id} ({staff_member.email})")
                return JsonResponse({
                    "message": "Access granted to user",
                    "success": True
                }, status=200)
            else:
                return JsonResponse({
                    "error": "User is not suspended"
                }, status=400)
        
        # HANDLE DEACTIVATION
        if request.data.get("is_active") == False and staff_member.is_active == True:
            # Staff member is being deactivated
            if is_admin(staff_member):
                # Two-step TOTP verification required for admin deactivation
                totp_code = request.data.get("totp_code", "").strip()
                
                if not totp_code:
                    # First call: send TOTP to admin's email
                    TOTPCode.objects.filter(email=staff_member.email, used=False).update(used=True)
                    code = TOTPCode.generate_code()
                    TOTPCode.objects.create(email=staff_member.email, code=code)
                    
                    # DEBUG: Print the code for deactivation testing
                    # print(f"[DEACTIVATION DEBUG] Verification code for {staff_member.email}: {code}")
                    
                    subject = "אישור כיבוי חשבון - חיוך של ילד"
                    html_message = f"""<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
</head>
<body dir="rtl" style="direction: rtl; text-align: right; font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5;">
        <tr>
            <td align="right" style="padding: 0;">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #f9f9f9; margin: 0 auto;">
                    <!-- HEADER -->
                    <tr>
                        <td style="background-color: #d32f2f; color: white; padding: 20px; text-align: center; font-size: 20px; font-weight: bold;">
                            אישור כיבוי חשבון
                        </td>
                    </tr>
                    <!-- CONTENT -->
                    <tr>
                        <td style="background-color: white; padding: 30px;">
                            <p dir="rtl" style="text-align: right; margin: 15px 0;">שלום,</p>
                            
                            <p dir="rtl" style="text-align: right; margin: 15px 0; color: #d32f2f; font-weight: bold;">בקשה לכיבוי חשבון במערכת חיוך של ילד.</p>
                            
                            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                            
                            <p dir="rtl" style="text-align: right; margin: 15px 0;">קוד האימות שלך הוא:</p>
                            
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
                                <tr>
                                    <td style="text-align: center; padding: 20px; background-color: #f0f0f0; border: 2px solid #d32f2f; border-radius: 8px;">
                                        <span style="font-size: 32px; font-weight: bold; color: #d32f2f; letter-spacing: 8px; direction: ltr; unicode-bidi: embed;">{code}</span>
                                    </td>
                                </tr>
                            </table>
                            
                            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                            
                            <p dir="rtl" style="text-align: right; margin: 15px 0; color: #d32f2f;">⏱ הקוד יפוג תוקף בעוד 5 דקות.</p>
                            
                            <p dir="rtl" style="text-align: right; margin: 15px 0;"><strong>⚠️ אם לא ביקשת זאת, אנא צור קשר עם מנהלי המערכת בדחיפות!</strong></p>
                        </td>
                    </tr>
                    <!-- FOOTER -->
                    <tr>
                        <td style="background-color: #f0f0f0; padding: 15px; text-align: center; font-size: 12px; color: #666;">
                            <p dir="rtl" style="text-align: center; margin: 0;">בברכה,</p>
                            <p dir="rtl" style="text-align: center; margin: 0;">צוות חיוך של ילד</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>"""
                    
                    try:
                        send_mail(subject, f"קוד האימות שלך: {code}", settings.DEFAULT_FROM_EMAIL, [staff_member.email], html_message=html_message)
                        
                        # Send TOTP code via WhatsApp if phone number available (deactivation)
                        if staff_member.staff_phone:
                            try:
                                whatsapp_result = send_totp_login_code_whatsapp(
                                    staff_phone=staff_member.staff_phone,
                                    totp_code=code
                                )
                                
                                if whatsapp_result.get("success"):
                                    api_logger.info(f"Deactivation TOTP code sent via WhatsApp to {staff_member.email}: {whatsapp_result.get('message_sid')}")
                                else:
                                    api_logger.warning(f"WhatsApp deactivation TOTP send failed for {staff_member.email}: {whatsapp_result.get('error')} - {whatsapp_result.get('details', '')}")
                            except Exception as wa_error:
                                api_logger.error(f"Error sending deactivation TOTP via WhatsApp to {staff_member.email}: {str(wa_error)}")
                        
                        return JsonResponse({
                            "message": "Verification code sent to your email",
                            "requires_verification": True
                        })
                    except Exception as e:
                        log_api_action(
                            request=request,
                            action='DEACTIVATE_STAFF_FAILED',
                            success=False,
                            error_message=f"Failed to send verification email: {str(e)}",
                            status_code=500,
                            entity_type='Staff',
                            entity_ids=[staff_id]
                        )
                        api_logger.error(f"Failed to send TOTP: {str(e)}")
                        return JsonResponse(
                            {"error": "Failed to send verification code"},
                            status=500
                        )
                
                else:
                    # Second call: verify TOTP code
                    totp_record = TOTPCode.objects.filter(
                        email=staff_member.email,
                        used=False
                    ).order_by('-created_at').first()
                    
                    if not totp_record:
                        log_api_action(
                            request=request,
                            action='DEACTIVATE_STAFF_FAILED',
                            success=False,
                            error_message="Invalid or expired code",
                            status_code=400,
                            entity_type='Staff',
                            entity_ids=[staff_id]
                        )
                        return JsonResponse(
                            {"error": "Invalid or expired code"},
                            status=400
                        )
                    
                    if not totp_record.is_valid():
                        log_api_action(
                            request=request,
                            action='DEACTIVATE_STAFF_FAILED',
                            success=False,
                            error_message="Code has expired or too many attempts",
                            status_code=400,
                            entity_type='Staff',
                            entity_ids=[staff_id]
                        )
                        return JsonResponse(
                            {"error": "Code has expired or too many attempts"},
                            status=400
                        )
                    
                    totp_record.attempts += 1
                    totp_record.save()
                    
                    if totp_record.code != totp_code:
                        if totp_record.attempts >= 3:
                            totp_record.used = True
                            totp_record.save()
                            log_api_action(
                                request=request,
                                action='DEACTIVATE_STAFF_FAILED',
                                success=False,
                                error_message="Too many failed attempts",
                                status_code=429,
                                entity_type='Staff',
                                entity_ids=[staff_id]
                            )
                            return JsonResponse(
                                {"error": "Too many failed attempts"},
                                status=429
                            )
                        
                        log_api_action(
                            request=request,
                            action='DEACTIVATE_STAFF_FAILED',
                            success=False,
                            error_message="Invalid code",
                            status_code=400,
                            entity_type='Staff',
                            entity_ids=[staff_id]
                        )
                        return JsonResponse(
                            {"error": "Invalid code"},
                            status=400
                        )
                    
                    # Mark TOTP as used - verified, continue to deactivation below
                    totp_record.used = True
                    totp_record.save()
            
            # Get deactivation reason
            deactivation_reason = request.data.get("deactivation_reason", "").strip()
            
            if not deactivation_reason:
                return JsonResponse(
                    {"error": "Deactivation reason required"},
                    status=400
                )
            
            if len(deactivation_reason) > 200:
                return JsonResponse(
                    {"error": "Reason must be 200 characters or less"},
                    status=400
                )
            
            try:
                deactivate_staff(staff_member, user, deactivation_reason, request)
                
                return JsonResponse({
                    "message": "Staff deactivated successfully",
                    "staff_id": staff_member.staff_id
                })
            except Exception as e:
                log_api_action(
                    request=request,
                    action='DEACTIVATE_STAFF_FAILED',
                    success=False,
                    error_message=str(e),
                    status_code=400,
                    additional_data={'staff_id': staff_id}
                )
                return JsonResponse(
                    {"error": str(e)},
                    status=400
                )
        
        # HANDLE REACTIVATION
        if request.data.get("is_active") == True and staff_member.is_active == False:
            # TOTP verification required for ALL users on reactivation
            totp_code = request.data.get("totp_code", "").strip()
            
            # Support optional email update during reactivation
            new_email = request.data.get("email", "").strip().lower() if request.data.get("email") else None
            
            if not totp_code:
                # First call: send TOTP to new email (if provided) or current email
                email_for_totp = new_email if new_email else staff_member.email
                
                # Clear old TOTP codes
                TOTPCode.objects.filter(email=email_for_totp, used=False).update(used=True)
                code = TOTPCode.generate_code()
                TOTPCode.objects.create(email=email_for_totp, code=code)
                
                # Store in session for verification step
                request.session['reactivation_new_email'] = new_email
                
                # DEBUG: Print the code for reactivation testing
                # print(f"[REACTIVATION DEBUG] Verification code for {email_for_totp}: {code}")
                
                subject = "אישור הפעלה של חשבון - חיוך של ילד"
                if new_email:
                    subject = "אישור הפעלה של חשבון ושינוי מייל - חיוך של ילד"
                
                html_message = f"""<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
</head>
<body dir="rtl" style="direction: rtl; text-align: right; font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5;">
        <tr>
            <td align="right" style="padding: 0;">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #f9f9f9; margin: 0 auto;">
                    <!-- HEADER -->
                    <tr>
                        <td style="background-color: #28a745; color: white; padding: 20px; text-align: center; font-size: 20px; font-weight: bold;">
                            אישור הפעלה של חשבון
                        </td>
                    </tr>
                    <!-- CONTENT -->
                    <tr>
                        <td style="background-color: white; padding: 30px;">
                            <p dir="rtl" style="text-align: right; margin: 15px 0;">שלום,</p>
                            
                            <p dir="rtl" style="text-align: right; margin: 15px 0;">בקשה להפעלה של חשבון במערכת חיוך של ילד{'ושינוי כתובת מייל' if new_email else ''}.</p>
                            
                            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                            
                            <p dir="rtl" style="text-align: right; margin: 15px 0;">קוד האימות שלך הוא:</p>
                            
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
                                <tr>
                                    <td style="text-align: center; padding: 20px; background-color: #f0f0f0; border: 2px solid #28a745; border-radius: 8px;">
                                        <span style="font-size: 32px; font-weight: bold; color: #28a745; letter-spacing: 8px; direction: ltr; unicode-bidi: embed;">{code}</span>
                                    </td>
                                </tr>
                            </table>
                            
                            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                            
                            <p dir="rtl" style="text-align: right; margin: 15px 0;">⏱ הקוד יפוג תוקף בעוד 5 דקות.</p>
                            
                            <p dir="rtl" style="text-align: right; margin: 15px 0;"><strong>⚠️ אם לא ביקשת זאת, אנא צור קשר עם מנהלי המערכת בדחיפות!</strong></p>
                        </td>
                    </tr>
                    <!-- FOOTER -->
                    <tr>
                        <td style="background-color: #f0f0f0; padding: 15px; text-align: center; font-size: 12px; color: #666;">
                            <p dir="rtl" style="text-align: center; margin: 0;">בברכה,</p>
                            <p dir="rtl" style="text-align: center; margin: 0;">צוות חיוך של ילד</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>"""
                
                try:
                    send_mail(subject, f"קוד האימות שלך: {code}", settings.DEFAULT_FROM_EMAIL, [email_for_totp], html_message=html_message)
                    
                    # Send TOTP code via WhatsApp if phone number available (reactivation)
                    if staff_member.staff_phone:
                        try:
                            whatsapp_result = send_totp_login_code_whatsapp(
                                staff_phone=staff_member.staff_phone,
                                totp_code=code
                            )
                            
                            if whatsapp_result.get("success"):
                                api_logger.info(f"Reactivation TOTP code sent via WhatsApp to {staff_member.email}: {whatsapp_result.get('message_sid')}")
                            else:
                                api_logger.warning(f"WhatsApp reactivation TOTP send failed for {staff_member.email}: {whatsapp_result.get('error')} - {whatsapp_result.get('details', '')}")
                        except Exception as wa_error:
                            api_logger.error(f"Error sending reactivation TOTP via WhatsApp to {staff_member.email}: {str(wa_error)}")
                    
                    return JsonResponse({
                        "message": "Verification code sent to your email",
                        "requires_verification": True,
                        "email": email_for_totp
                    })
                except Exception as e:
                    log_api_action(
                        request=request,
                        action='ACTIVATE_STAFF_FAILED',
                        success=False,
                        error_message=f"Failed to send verification email: {str(e)}",
                        status_code=500,
                        entity_type='Staff',
                        entity_ids=[staff_id]
                    )
                    api_logger.error(f"Failed to send TOTP: {str(e)}")
                    return JsonResponse(
                        {"error": "Failed to send verification code"},
                        status=500
                    )
            
            else:
                # Second call: verify TOTP code
                # Get the email TOTP was sent to (could be new email or original)
                email_for_verification = request.session.get('reactivation_new_email') or staff_member.email
                
                totp_record = TOTPCode.objects.filter(
                    email=email_for_verification,
                    used=False
                ).order_by('-created_at').first()
                
                if not totp_record:
                    log_api_action(
                        request=request,
                        action='ACTIVATE_STAFF_FAILED',
                        success=False,
                        error_message="Invalid or expired code",
                        status_code=400,
                        entity_type='Staff',
                        entity_ids=[staff_id]
                    )
                    return JsonResponse(
                        {"error": "Invalid or expired code"},
                        status=400
                    )
                
                if not totp_record.is_valid():
                    log_api_action(
                        request=request,
                        action='ACTIVATE_STAFF_FAILED',
                        success=False,
                        error_message="Code has expired or too many attempts",
                        status_code=400,
                        entity_type='Staff',
                        entity_ids=[staff_id]
                    )
                    return JsonResponse(
                        {"error": "Code has expired or too many attempts"},
                        status=400
                    )
                
                totp_record.attempts += 1
                totp_record.save()
                
                if totp_record.code != totp_code:
                    if totp_record.attempts >= 3:
                        totp_record.used = True
                        totp_record.save()
                        log_api_action(
                            request=request,
                            action='ACTIVATE_STAFF_FAILED',
                            success=False,
                            error_message="Too many failed attempts",
                            status_code=429,
                            entity_type='Staff',
                            entity_ids=[staff_id]
                        )
                        return JsonResponse(
                            {"error": "Too many failed attempts"},
                            status=429
                        )
                    
                    log_api_action(
                        request=request,
                        action='ACTIVATE_STAFF_FAILED',
                        success=False,
                        error_message="Invalid code",
                        status_code=400,
                        entity_type='Staff',
                        entity_ids=[staff_id]
                    )
                    return JsonResponse(
                        {"error": "Invalid code"},
                        status=400
                    )
                
                # Mark TOTP as used - verified, continue to reactivation below
                totp_record.used = True
                totp_record.save()
                
                # If a new email was provided, update it now
                new_email_from_session = request.session.get('reactivation_new_email')
                if new_email_from_session:
                    staff_member.email = new_email_from_session
                    staff_member.save()
                    api_logger.info(f"Email updated during reactivation for {staff_id}: {new_email_from_session}")
                    # Clean up session
                    if 'reactivation_new_email' in request.session:
                        del request.session['reactivation_new_email']
            
            try:
                activate_staff(staff_member, user, request)
                
                # Send activation confirmation email to the (possibly updated) email
                subject = "חשבונך הופעל - חיוך של ילד"
                html_message = f"""<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
</head>
<body dir="rtl" style="direction: rtl; text-align: right; font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5;">
        <tr>
            <td align="right" style="padding: 0;">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #f9f9f9; margin: 0 auto;">
                    <!-- HEADER -->
                    <tr>
                        <td style="background-color: #28a745; color: white; padding: 20px; text-align: center; font-size: 20px; font-weight: bold;">
                            חשבונך הופעל
                        </td>
                    </tr>
                    <!-- CONTENT -->
                    <tr>
                        <td style="background-color: white; padding: 30px;">
                            <p dir="rtl" style="text-align: right; margin: 15px 0;">שלום {staff_member.first_name},</p>
                            
                            <p dir="rtl" style="text-align: right; margin: 15px 0;">חשבונך בחיוך של ילד הופעל מחדש.</p>
                            
                            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                            
                            <p dir="rtl" style="text-align: right; margin: 15px 0; font-weight: bold; color: #28a745;">✅ תוכל להתחבר למערכת כעת.</p>
                        </td>
                    </tr>
                    <!-- FOOTER -->
                    <tr>
                        <td style="background-color: #f0f0f0; padding: 15px; text-align: center; font-size: 12px; color: #666;">
                            <p dir="rtl" style="text-align: center; margin: 0;">בברכה,</p>
                            <p dir="rtl" style="text-align: center; margin: 0;">צוות חיוך של ילד</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>"""
                message = f"""
                שלום {staff_member.first_name},
                
                חשבונך בחיוך של ילד הופעל מחדש.
                
                תוכל להתחבר למערכת כעת.
                
                בברכה,
                צוות חיוך של ילד
                """
                
                try:
                    send_mail(
                        subject,
                        message,
                        settings.DEFAULT_FROM_EMAIL,
                        [staff_member.email],
                        html_message=html_message,
                        fail_silently=False
                    )
                except Exception as e:
                    api_logger.error(f"Failed to send reactivation email: {str(e)}")
                
                # Send WhatsApp activation notification
                if staff_member.staff_phone:
                    try:
                        from .whatsapp_utils import send_account_activation_whatsapp
                        staff_name = f"{staff_member.first_name} {staff_member.last_name}".strip()
                        whatsapp_result = send_account_activation_whatsapp(
                            staff_phone=staff_member.staff_phone,
                            staff_name=staff_name
                        )
                        if whatsapp_result.get("success"):
                            api_logger.info(f"✅ Account activation WhatsApp sent to {staff_member.email} ({staff_member.staff_phone}): {whatsapp_result.get('message_sid')}")
                        else:
                            api_logger.warning(f"❌ Failed to send account activation WhatsApp to {staff_member.email}: {whatsapp_result.get('error')}")
                    except Exception as wa_error:
                        api_logger.error(f"❌ Error sending account activation WhatsApp to {staff_member.email}: {str(wa_error)}")
                else:
                    api_logger.info(f"🔔 No phone number available for {staff_member.email} - WhatsApp activation notification will NOT be sent")
                
                return JsonResponse({
                    "message": "Staff reactivated successfully",
                    "staff_id": staff_member.staff_id
                })
            except Exception as e:
                log_api_action(
                    request=request,
                    action='ACTIVATE_STAFF_FAILED',
                    success=False,
                    error_message=str(e),
                    status_code=400,
                    additional_data={'staff_id': staff_id}
                )
                return JsonResponse(
                    {"error": str(e)},
                    status=400
                )

        # IF EMAIL IS BEING CHANGED - Require TOTP verification
        new_email = data.get("email", "").strip().lower()
        if new_email and new_email != original_email:
            # Check if TOTP code was provided for verification
            totp_code = data.get("totp_code", "").strip()
            
            if not totp_code:
                # First call: send TOTP to new email
                request.session['pending_staff_update'] = {
                    'staff_id': staff_id,
                    'data': data,
                    'original_email': original_email
                }
                request.session['staff_update_new_email'] = new_email
                
                # Send TOTP to new email
                TOTPCode.objects.filter(email=new_email, used=False).update(used=True)
                code = TOTPCode.generate_code()
                TOTPCode.objects.create(email=new_email, code=code)
                
                subject = "אימות שינוי כתובת מייל - חיוך של ילד"
                html_message = f"""<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
</head>
<body dir="rtl" style="direction: rtl; text-align: right; font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5;">
        <tr>
            <td align="right" style="padding: 0;">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #f9f9f9; margin: 0 auto;">
                    <!-- HEADER -->
                    <tr>
                        <td style="background-color: #2196F3; color: white; padding: 20px; text-align: center; font-size: 20px; font-weight: bold;">
                            אימות שינוי כתובת מייל
                        </td>
                    </tr>
                    <!-- CONTENT -->
                    <tr>
                        <td style="background-color: white; padding: 30px;">
                            <p dir="rtl" style="text-align: right; margin: 15px 0;">שלום {data.get('first_name', staff_member.first_name)},</p>
                            
                            <p dir="rtl" style="text-align: right; margin: 15px 0;">מייל זה נשלח לשם אימות שינוי כתובת המייל שלך במערכת חיוך של ילד.</p>
                            
                            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                            
                            <p dir="rtl" style="text-align: right; margin: 15px 0;">קוד האימות שלך הוא:</p>
                            
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
                                <tr>
                                    <td style="text-align: center; padding: 20px; background-color: #f0f0f0; border: 2px solid #2196F3; border-radius: 8px;">
                                        <span style="font-size: 32px; font-weight: bold; color: #2196F3; letter-spacing: 8px; direction: ltr; unicode-bidi: embed;">{code}</span>
                                    </td>
                                </tr>
                            </table>
                            
                            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                            
                            <p dir="rtl" style="text-align: right; margin: 15px 0;">⏱ קוד זה יפוג תוך 5 דקות.</p>
                            
                            <p dir="rtl" style="text-align: right; margin: 15px 0;">אנא הזן את הקוד במערכת כדי לאמת ולהשלים את שינוי כתובת המייל.</p>
                        </td>
                    </tr>
                    <!-- FOOTER -->
                    <tr>
                        <td style="background-color: #f0f0f0; padding: 15px; text-align: center; font-size: 12px; color: #666;">
                            <p dir="rtl" style="text-align: center; margin: 0;">בברכה,</p>
                            <p dir="rtl" style="text-align: center; margin: 0;">צוות חיוך של ילד</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>"""
                message = f"""
                שלום {data.get('first_name', staff_member.first_name)},
                
                מייל זה נשלח לשם אימות שינוי כתובת המייל שלך במערכת חיוך של ילד.   

                קוד האימות שלך הוא: {code}

                קוד זה יפוג תוך 5 דקות.

                אנא הזן את הקוד במערכת כדי לאמת ולהשלים את שינוי כתובת המייל.

                בברכה,
                צוות חיוך של ילד
                """
                
                try:
                    send_mail(
                        subject,
                        message,
                        settings.DEFAULT_FROM_EMAIL,
                        [new_email],
                        html_message=html_message,
                        fail_silently=False,
                    )
                    
                    return JsonResponse({
                        "message": "Verification code sent to new email address",
                        "email": new_email,
                        "requires_verification": True
                    })
                    
                except Exception as email_error:
                    log_api_action(
                        request=request,
                        action='UPDATE_STAFF_FAILED',
                        success=False,
                        error_message=f"Failed to send verification email: {str(email_error)}",
                        status_code=500,
                        entity_type='Staff',
                        entity_ids=[staff_id],
                        additional_data={
                            'staff_email': staff_member.email,
                            'attempted_new_email': new_email
                        }
                    )
                    api_logger.error(f"Failed to send verification email: {str(email_error)}")
                    return JsonResponse({"error": "Failed to send verification email"}, status=500)
            else:
                # Second call: verify TOTP code
                totp_record = TOTPCode.objects.filter(
                    email=new_email,
                    used=False
                ).order_by('-created_at').first()
                
                if not totp_record:
                    log_api_action(
                        request=request,
                        action='UPDATE_STAFF_FAILED',
                        success=False,
                        error_message="Invalid or expired code",
                        status_code=400,
                        entity_type='Staff',
                        entity_ids=[staff_id],
                        additional_data={
                            'staff_email': staff_member.email,
                            'staff_full_name': f"{staff_member.first_name} {staff_member.last_name}",
                            'attempted_changes': field_changes,
                            'changes_count': len(field_changes)
                        }
                    )
                    api_logger.error(f"Invalid or expired code used for email change of {staff_member.email}")
                    return JsonResponse({"error": "Invalid or expired code"}, status=400)
                
                if not totp_record.is_valid():
                    log_api_action(
                        request=request,
                        action='UPDATE_STAFF_FAILED',
                        success=False,
                        error_message="Code has expired or too many attempts",
                        status_code=400,
                        entity_type='Staff',
                        entity_ids=[staff_id],
                        additional_data={
                            'staff_email': staff_member.email,
                            'staff_full_name': f"{staff_member.first_name} {staff_member.last_name}",
                            'attempted_changes': field_changes,
                            'changes_count': len(field_changes)
                        }
                    )
                    api_logger.error(f"Expired or too many attempts for code used in email change of {staff_member.email}")
                    return JsonResponse({"error": "Code has expired or too many attempts"}, status=400)
                
                totp_record.attempts += 1
                totp_record.save()
                
                if totp_record.code != totp_code:
                    if totp_record.attempts >= 3:
                        totp_record.used = True
                        totp_record.save()
                        log_api_action(
                            request=request,
                            action='UPDATE_STAFF_FAILED',
                            success=False,
                            error_message="Too many failed attempts",
                            status_code=429,
                            entity_type='Staff',
                            entity_ids=[staff_id],
                            additional_data={
                                'staff_email': staff_member.email,
                                'staff_full_name': f"{staff_member.first_name} {staff_member.last_name}",
                                'attempted_changes': field_changes,
                                'changes_count': len(field_changes)
                            }
                        )
                        api_logger.error(f"Too many failed attempts for code used in email change of {staff_member.email}")
                        return JsonResponse({"error": "Too many failed attempts"}, status=429)
                    
                    log_api_action(
                        request=request,
                        action='UPDATE_STAFF_FAILED',
                        success=False,
                        error_message="Invalid code",
                        status_code=400,
                        entity_type='Staff',
                        entity_ids=[staff_id],
                        additional_data={
                            'staff_email': staff_member.email,
                            'staff_full_name': f"{staff_member.first_name} {staff_member.last_name}",
                            'attempted_changes': field_changes,
                            'changes_count': len(field_changes)
                        }
                    )
                    api_logger.error(f"Invalid code used for email change of {staff_member.email}")
                    return JsonResponse({"error": "Invalid code"}, status=400)
                
                # Mark TOTP as used - verified, continue with update below
                totp_record.used = True
                totp_record.save()
                # Clean up session
                if 'pending_staff_update' in request.session:
                    del request.session['pending_staff_update']
                if 'staff_update_new_email' in request.session:
                    del request.session['staff_update_new_email']
        
        # Update roles if provided
        technical_coordinator_role = None
        original_roles_set = set(original_roles)
        new_roles_set = set(data.get("roles", original_roles))
        if "roles" in data:
            roles = data["roles"]
            if isinstance(roles, list):
                staff_member.roles.clear()
                for role_name in roles:
                    try:
                        role = Role.objects.get(role_name=role_name)
                        staff_member.roles.add(role)
                        if role_name == "Technical Coordinator":
                            technical_coordinator_role = role
                    except Role.DoesNotExist:
                        log_api_action(
                            request=request,
                            action='UPDATE_STAFF_FAILED',
                            success=False,
                            error_message=f"Role with name '{role_name}' does not exist",
                            status_code=400,
                            entity_type='Staff',
                            entity_ids=[staff_id],
                            additional_data={
                                'staff_email': staff_member.email,
                                'staff_full_name': f"{staff_member.first_name} {staff_member.last_name}",
                                'attempted_changes': field_changes,
                                'changes_count': len(field_changes)
                            }
                        )
                        api_logger.warning(f"Role with name '{role_name}' does not exist.")
                        return JsonResponse(
                            {"error": f"Role with name '{role_name}' does not exist."},
                            status=400,
                        )
            else:
                log_api_action(
                    request=request,
                    action='UPDATE_STAFF_FAILED',
                    success=False,
                    error_message="Roles should be provided as a list of role names",
                    status_code=400,
                    entity_type='Staff',
                    entity_ids=[staff_id],
                    additional_data={
                        'staff_email': staff_member.email,
                        'staff_full_name': f"{staff_member.first_name} {staff_member.last_name}",
                        'attempted_changes': field_changes,
                        'changes_count': len(field_changes)
                    }
                )
                api_logger.warning(f"Roles should be provided as a list of role names.")
                return JsonResponse(
                    {"error": "Roles should be provided as a list of role names."},
                    status=400,
                )

        # If Technical Coordinator role was removed, delete review tasks assigned to this staff member
        if "Technical Coordinator" not in new_roles_set:
            try:
                review_task_type = Task_Types.objects.get(task_type="שיחת ביקורת")
                review_tasks = Tasks.objects.filter(
                    assigned_to=staff_member,
                    task_type=review_task_type,
                    status__in=["לא הושלמה", "בביצוע"]
                )
                deleted_count = 0
                for task in review_tasks:
                    # Check if there is at least one other incomplete review task for the same child
                    other_tasks_exist = Tasks.objects.filter(
                        related_child=task.related_child,
                        task_type=review_task_type,
                        status__in=["לא הושלמה", "בביצוע"],
                        assigned_to=staff_member
                    ).exclude(assigned_to=staff_member).exists()
                    if other_tasks_exist:
                        task.delete()
                        deleted_count += 1
                api_logger.info(f"Deleted {deleted_count} review tasks for staff {staff_member.staff_id} after removing Technical Coordinator role (only if other tasks exist per child).")
            except Task_Types.DoesNotExist:
                api_logger.warning("Review task type 'שיחת ביקורת' not found when attempting to delete tasks.")

        # If user loses both Families Coordinator and Tutored Families Coordinator roles, delete their review tasks (per child, only if another exists)
        if not ("Families Coordinator" in new_roles_set or "Tutored Families Coordinator" in new_roles_set):
            try:
                review_task_type = Task_Types.objects.get(task_type="שיחת ביקורת")
                review_tasks = Tasks.objects.filter(
                    assigned_to=staff_member,
                    task_type=review_task_type,
                    status__in=["לא הושלמה", "בביצוע"]
                )
                deleted_count = 0
                for task in review_tasks:
                    # Only delete if another incomplete review task exists for this child
                    other_tasks_exist = Tasks.objects.filter(
                        related_child=task.related_child,
                        task_type=review_task_type,
                        status__in=["לא הושלמה", "בביצוע"],
                        assigned_to=staff_member
                    ).exclude(
                        assigned_to=staff_member
                    ).exists()
                    if other_tasks_exist:
                        task.delete()
                        deleted_count += 1
                api_logger.info(f"Deleted {deleted_count} review tasks for staff {staff_member.staff_id} after losing both Families Coordinator and Tutored Families Coordinator roles (only if other tasks exist per child).")
            except Task_Types.DoesNotExist:
                api_logger.warning("Review task type 'שיחת ביקורת' not found when attempting to delete tasks.")

        # Store original values for propagation BEFORE updating fields
        old_email = staff_member.email.lower() if staff_member.email else None
        old_phone = staff_member.staff_phone
        api_logger.debug(f"BEFORE UPDATE: staff_id={staff_id}, old_phone={old_phone}, old_email={old_email}")
        
        # Update fields
        staff_member.username = data.get("username", staff_member.username)
        staff_member.email = data.get("email", staff_member.email)
        staff_member.first_name = data.get("first_name", staff_member.first_name)
        staff_member.last_name = data.get("last_name", staff_member.last_name)
        
        # Handle staff_phone update
        if "staff_phone" in data:
            phone = data.get("staff_phone", "").strip()
            api_logger.debug(f"Phone update requested: staff_id={staff_id}, new_phone={phone}")
            if phone:
                is_valid, error_msg = validate_staff_phone(phone)
                if not is_valid:
                    log_api_action(
                        request=request,
                        action='UPDATE_STAFF_FAILED',
                        success=False,
                        error_message=error_msg,
                        status_code=400,
                        entity_type='Staff',
                        entity_ids=[staff_id]
                    )
                    return JsonResponse({"error": error_msg}, status=400)
            
            staff_member.staff_phone = phone if phone else None
            api_logger.debug(f"Phone set to: staff_id={staff_id}, staff_member.staff_phone={staff_member.staff_phone}")
        
        # Propagate email changes to related tables (case-insensitive comparison)
        # This handles cases where staff members were previously volunteers/tutors
        new_email = staff_member.email.lower() if staff_member.email else None
        if old_email and new_email and old_email != new_email:
            SignedUp.objects.filter(email__iexact=old_email).update(email=staff_member.email)
            Tutors.objects.filter(tutor_email__iexact=old_email).update(
                tutor_email=staff_member.email
            )
        
        # Propagate phone changes to SignedUp records by matching EMAIL
        # If a person was a volunteer first (has SignedUp record) and then became staff,
        # updating their phone in Staff should also update their SignedUp record
        # KEY: Match by EMAIL, not by old phone number!
        new_phone = staff_member.staff_phone
        staff_email = staff_member.email.lower() if staff_member.email else None
        
        api_logger.debug(f"Phone propagation check: old_phone={old_phone}, new_phone={new_phone}, staff_email={staff_email}, staff_id={staff_id}")
        
        if old_phone and new_phone and old_phone != new_phone and staff_email:
            # Match SignedUp records by email (case-insensitive)
            email_match_count = SignedUp.objects.filter(email__iexact=staff_email).count()
            api_logger.debug(f"Email match for '{staff_email}': {email_match_count} records")
            
            if email_match_count > 0:
                # Update SignedUp records with matching email
                updated_count = SignedUp.objects.filter(email__iexact=staff_email).update(phone=new_phone)
                api_logger.info(f"Phone propagation for staff {staff_id}: Updated {updated_count} SignedUp records (email match) for {staff_email} from {old_phone} to {new_phone}")
            else:
                api_logger.debug(f"Phone propagation for staff {staff_id}: No matching SignedUp records found for email {staff_email}")
        else:
            api_logger.debug(f"Phone propagation skipped: old_phone={old_phone}, new_phone={new_phone}, email={staff_email}")
        
        # Handle optional staff profile fields (for coordinators/managers reporting)
        if "staff_israel_id" in data:
            israel_id = data.get("staff_israel_id", "").strip()
            if israel_id:
                is_valid, error_msg = validate_staff_israel_id(israel_id)
                if not is_valid:
                    log_api_action(
                        request=request,
                        action='UPDATE_STAFF_FAILED',
                        success=False,
                        error_message=error_msg,
                        status_code=400,
                        entity_type='Staff',
                        entity_ids=[staff_id]
                    )
                    return JsonResponse({"error": error_msg}, status=400)
                
                # Check uniqueness (case-insensitive, excluding current staff)
                if Staff.objects.filter(staff_israel_id=israel_id).exclude(staff_id=staff_id).exists():
                    log_api_action(
                        request=request,
                        action='UPDATE_STAFF_FAILED',
                        success=False,
                        error_message="תעודת זהות זו כבר קיימת במערכת",
                        status_code=400,
                        entity_type='Staff',
                        entity_ids=[staff_id]
                    )
                    return JsonResponse({"error": "תעודת זהות זו כבר קיימת במערכת"}, status=400)
            
            staff_member.staff_israel_id = israel_id if israel_id else None
        
        if "staff_age" in data:
            age_val = data.get("staff_age")
            birth_date_val = data.get("staff_birth_date") or staff_member.staff_birth_date
            
            is_valid, error_msg, calculated_age = validate_staff_age(age_val, birth_date_val)
            if not is_valid:
                log_api_action(
                    request=request,
                    action='UPDATE_STAFF_FAILED',
                    success=False,
                    error_message=error_msg,
                    status_code=400,
                    entity_type='Staff',
                    entity_ids=[staff_id]
                )
                return JsonResponse({"error": error_msg}, status=400)
            
            # Age is auto-calculated from birth_date, don't set manually
            # if age_val:
            #     staff_member.staff_age = int(age_val)
            # elif birth_date_val and calculated_age:
            #     staff_member.staff_age = calculated_age
        
        if "staff_birth_date" in data:
            birth_date_str = data.get("staff_birth_date", "").strip()
            if birth_date_str:
                birth_date = parse_date_string(birth_date_str)
                if not birth_date:
                    log_api_action(
                        request=request,
                        action='UPDATE_STAFF_FAILED',
                        success=False,
                        error_message="תאריך לידה לא תקין. אנא השתמש בפורמט dd/mm/yyyy",
                        status_code=400,
                        entity_type='Staff',
                        entity_ids=[staff_id]
                    )
                    return JsonResponse(
                        {"error": "תאריך לידה לא תקין. אנא השתמש בפורמט dd/mm/yyyy"}, 
                        status=400
                    )
                
                # Validate age if birth_date is provided
                is_valid, error_msg, calculated_age = validate_staff_age(None, birth_date)
                if not is_valid:
                    log_api_action(
                        request=request,
                        action='UPDATE_STAFF_FAILED',
                        success=False,
                        error_message=error_msg,
                        status_code=400,
                        entity_type='Staff',
                        entity_ids=[staff_id]
                    )
                    return JsonResponse({"error": error_msg}, status=400)
                
                staff_member.staff_birth_date = birth_date
                # Auto-calculate and save age from birth_date
                if calculated_age:
                    staff_member.staff_age = calculated_age
            else:
                staff_member.staff_birth_date = None
        
        if "staff_gender" in data:
            gender_val = data.get("staff_gender")
            if gender_val is not None:
                # Convert to boolean: "male"/"זכר" → False, "female"/"נקבה" → True
                if isinstance(gender_val, bool):
                    staff_member.staff_gender = gender_val
                elif isinstance(gender_val, str):
                    gender_lower = gender_val.lower()
                    if gender_lower in ['female', 'נקבה', '1', 'true']:
                        staff_member.staff_gender = True
                    elif gender_lower in ['male', 'זכר', '0', 'false']:
                        staff_member.staff_gender = False
                    else:
                        log_api_action(
                            request=request,
                            action='UPDATE_STAFF_FAILED',
                            success=False,
                            error_message="מין לא תקין. יש להשתמש ב: male/זכר או female/נקבה",
                            status_code=400,
                            entity_type='Staff',
                            entity_ids=[staff_id]
                        )
                        return JsonResponse(
                            {"error": "מין לא תקין. יש להשתמש ב: male/זכר או female/נקבה"}, 
                            status=400
                        )
        
        if "staff_city" in data:
            city = data.get("staff_city", "").strip()
            staff_member.staff_city = city if city else None

        # Save the updated staff record
        try:
            api_logger.debug(f"BEFORE SAVE: staff_id={staff_id}, staff_phone={staff_member.staff_phone}, email={staff_member.email}")
            staff_member.save()
            api_logger.debug(f"AFTER SAVE: staff_id={staff_id}, staff_phone={staff_member.staff_phone}, email={staff_member.email}")
        except DatabaseError as db_error:
            log_api_action(
                request=request,
                action='UPDATE_STAFF_FAILED',
                success=False,
                error_message=f"Database error: {str(db_error)}",
                status_code=500,
                entity_type='Staff',
                entity_ids=[staff_id],
                additional_data={
                    'staff_email': staff_member.email,
                    'staff_full_name': f"{staff_member.first_name} {staff_member.last_name}",
                    'attempted_changes': field_changes,
                    'changes_count': len(field_changes)
                }
            )
            api_logger.error(f"Database error while updating staff member {staff_id}: {str(db_error)}")
            return JsonResponse(
                {"error": f"Database error: {str(db_error)}"}, status=500
            )

        # Log successful update
        log_api_action(
            request=request,
            action='UPDATE_STAFF_SUCCESS',
            affected_tables=['childsmile_app_staff', 'childsmile_app_staff_roles'],
            entity_type='Staff',
            entity_ids=[staff_member.staff_id],
            success=True,
            additional_data={
                'updated_staff_email': staff_member.email,
                'staff_full_name': f"{staff_member.first_name} {staff_member.last_name}",
                'updated_roles': data.get('roles', []),
                'field_changes': field_changes,
                'changes_count': len(field_changes)
            }
        )
        api_logger.info(f"Staff member {staff_id} updated successfully.")
        return JsonResponse(
            {
                "message": "Staff member updated successfully",
                "staff_id": staff_member.staff_id,
            },
            status=200,
        )
    except Exception as e:
        log_api_action(
            request=request,
            action='UPDATE_STAFF_FAILED',
            success=False,
            error_message=str(e),
            status_code=500,
            entity_type='Staff',
            entity_ids=[staff_id],
            additional_data={
                'staff_email': staff_member.email if 'staff_member' in locals() else 'Unknown',
                'staff_full_name': f"{staff_member.first_name} {staff_member.last_name}" if 'staff_member' in locals() else 'Unknown',
                'attempted_changes': field_changes if 'field_changes' in locals() else [],
                'changes_count': len(field_changes) if 'field_changes' in locals() else 0
            }
        )
        api_logger.error(f"Error while updating staff member {staff_id}: {str(e)}")
        return JsonResponse({"error": str(e)}, status=500)


@conditional_csrf
@api_view(["DELETE"])
def delete_staff_member(request, staff_id):
    api_logger.info(f"delete_staff_member called for staff_id: {staff_id}")
    """
    Delete a staff member
    """
    user_id = request.session.get("user_id")
    if not user_id:
        log_api_action(
            request=request,
            action='DELETE_STAFF_FAILED',
            success=False,
            error_message="Authentication credentials were not provided",
            status_code=403,
            entity_type='Staff',
            entity_ids=[staff_id],
            additional_data={
                'deleted_staff_email': 'Unknown - Not Found',
                'deleted_staff_full_name': 'Unknown - Not Found',
                'deleted_staff_id': staff_id,
                'deleted_staff_roles': []
            }
        )
        return JsonResponse({"detail": "Authentication credentials were not provided."}, status=403)

    user = Staff.objects.get(staff_id=user_id)
    
    # Fetch the staff member FIRST so we have their data for audit
    try:
        staff_member = Staff.objects.get(staff_id=staff_id)
    except Staff.DoesNotExist:
        log_api_action(
            request=request,
            action='DELETE_STAFF_FAILED',
            success=False,
            error_message="Staff member not found",
            status_code=404,
            entity_type='Staff',
            entity_ids=[staff_id],
            additional_data={
                'deleted_staff_email': 'Unknown - Not Found',
                'deleted_staff_full_name': 'Unknown - Not Found',
                'deleted_staff_id': staff_id,
                'deleted_staff_roles': []
            }
        )
        api_logger.warning(f"Staff member {staff_id} not found.")
        return JsonResponse({"error": "Staff member not found."}, status=404)

    # NOW check permission - with staff data available
    if not is_admin(user):
        deleted_email = staff_member.email
        deleted_full_name = f"{staff_member.first_name} {staff_member.last_name}"
        deleted_roles = [role.role_name for role in staff_member.roles.all()]
        
        log_api_action(
            request=request,
            action='DELETE_STAFF_FAILED',
            success=False,
            error_message="You do not have permission to delete staff",
            status_code=401,
            entity_type='Staff',
            entity_ids=[staff_id],
            additional_data={
                'deleted_staff_email': deleted_email,
                'deleted_staff_full_name': deleted_full_name,
                'deleted_staff_id': staff_id,
                'deleted_staff_roles': deleted_roles
            }
        )
        api_logger.critical(f"Unauthorized deletion attempt by {user.email} on staff member {staff_id}.")
        return JsonResponse({"error": "You do not have permission to delete staff."}, status=401)

    try:
        # Store info before deletion - MUST get roles before delete
        deleted_email = staff_member.email
        deleted_full_name = f"{staff_member.first_name} {staff_member.last_name}"
        deleted_roles = [role.role_name for role in staff_member.roles.all()]
        
        # Delete related data
        SignedUp.objects.filter(email=staff_member.email).delete()
        from .models import General_Volunteer
        General_Volunteer.objects.filter(staff=staff_member).delete()
        Pending_Tutor.objects.filter(id__email=staff_member.email).delete()
        Tutors.objects.filter(staff=staff_member).delete()
        from .models import Tutorships
        Tutorships.objects.filter(tutor__staff=staff_member).delete()
        Tasks.objects.filter(assigned_to=staff_member).delete()

        # Delete the staff record
        staff_member.delete()

        # Log successful deletion
        log_api_action(
            request=request,
            action='DELETE_STAFF_SUCCESS',
            affected_tables=['childsmile_app_staff', 'childsmile_app_signedup', 'childsmile_app_general_volunteer'],
            entity_type='Staff',
            entity_ids=[staff_id],
            success=True,
            additional_data={
                'deleted_staff_email': deleted_email,
                'deleted_staff_full_name': deleted_full_name,
                'deleted_staff_id': staff_id,
                'deleted_staff_roles': deleted_roles
            }
        )
        api_logger.info(f"Staff member {staff_id} and related data deleted successfully.")
        return JsonResponse({
            "message": "Staff member and related data deleted successfully",
            "staff_id": staff_id,
        }, status=200)
        
    except Exception as e:
        log_api_action(
            request=request,
            action='DELETE_STAFF_FAILED',
            success=False,
            error_message=str(e),
            status_code=500,
            entity_type='Staff',
            entity_ids=[staff_id],
            additional_data={
                'deleted_staff_email': staff_member.email if 'staff_member' in locals() else 'Unknown - Error',
                'deleted_staff_full_name': f"{staff_member.first_name} {staff_member.last_name}" if 'staff_member' in locals() else 'Unknown - Error',
                'deleted_staff_id': staff_id,
                'deleted_staff_roles': deleted_roles if 'deleted_roles' in locals() else []
            }
        )
        api_logger.error(f"Error while deleting staff member {staff_id}: {str(e)}")
        return JsonResponse({"error": str(e)}, status=500)


@conditional_csrf
@api_view(["POST"])
def create_staff_member(request):
    api_logger.info("create_staff_member called in views_staff.py")
    """
    Create a new staff member and assign roles.
    """
    user_id = request.session.get("user_id")
    if not user_id:
        log_api_action(
            request=request,
            action='CREATE_STAFF_FAILED',
            success=False,
            error_message="Authentication credentials were not provided",
            status_code=403
        )
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )

    user = Staff.objects.get(staff_id=user_id)
    if not is_admin(user):
        log_api_action(
            request=request,
            action='CREATE_STAFF_FAILED',
            success=False,
            error_message="You do not have permission to create a staff member",
            status_code=401
        )
        api_logger.critical(f"Unauthorized attempt by {user.email} to create a staff member.")
        return JsonResponse(
            {"error": "You do not have permission to create a staff member."},
            status=401,
        )

    try:
        data = request.data

        required_fields = ["username", "email", "first_name", "last_name"]
        missing_fields = [
            field for field in required_fields if not data.get(field, "").strip()
        ]
        if missing_fields:
            log_api_action(
                request=request,
                action='CREATE_STAFF_FAILED',
                success=False,
                error_message=f"Missing or empty required fields: {', '.join(missing_fields)}",
                status_code=400
            )
            api_logger.debug(f"Missing or empty required fields: {', '.join(missing_fields)}")
            return JsonResponse(
                {
                    "error": f"Missing or empty required fields: {', '.join(missing_fields)}"
                },
                status=400,
            )

        if Staff.objects.filter(username=data["username"]).exists():
            log_api_action(
                request=request,
                action='CREATE_STAFF_FAILED',
                success=False,
                error_message=f"Username '{data['username']}' already exists",
                status_code=400
            )
            api_logger.warning(f"Username '{data['username']}' already exists.")
            return JsonResponse(
                {"error": f"Username '{data['username']}' already exists."}, status=400
            )

        if Staff.objects.filter(email__iexact=data["email"]).exists():
            log_api_action(
                request=request,
                action='CREATE_STAFF_FAILED',
                success=False,
                error_message=f"Email '{data['email']}' already exists",
                status_code=400
            )
            api_logger.warning(f"Email '{data['email']}' already exists.")
            return JsonResponse(
                {"error": f"Email '{data['email']}' already exists."}, status=400
            )

        # Validate optional staff profile fields BEFORE creating
        staff_israel_id = data.get("staff_israel_id", "").strip() if data.get("staff_israel_id") else None
        if staff_israel_id:
            is_valid, error_msg = validate_staff_israel_id(staff_israel_id)
            if not is_valid:
                log_api_action(
                    request=request,
                    action='CREATE_STAFF_FAILED',
                    success=False,
                    error_message=error_msg,
                    status_code=400
                )
                return JsonResponse({"error": error_msg}, status=400)
            
            if Staff.objects.filter(staff_israel_id=staff_israel_id).exists():
                log_api_action(
                    request=request,
                    action='CREATE_STAFF_FAILED',
                    success=False,
                    error_message="תעודת זהות זו כבר קיימת במערכת",
                    status_code=400
                )
                return JsonResponse({"error": "תעודת זהות זו כבר קיימת במערכת"}, status=400)
        
        # Validate age and birth date
        staff_age = data.get("staff_age")
        staff_birth_date_str = data.get("staff_birth_date")
        staff_birth_date = None
        calculated_age = None
        
        if staff_birth_date_str:
            staff_birth_date = parse_date_string(staff_birth_date_str)
            if not staff_birth_date:
                log_api_action(
                    request=request,
                    action='CREATE_STAFF_FAILED',
                    success=False,
                    error_message="תאריך לידה לא תקין. אנא השתמש בפורמט dd/mm/yyyy",
                    status_code=400
                )
                return JsonResponse(
                    {"error": "תאריך לידה לא תקין. אנא השתמש בפורמט dd/mm/yyyy"}, 
                    status=400
                )
            
            # Validate age from birth_date
            is_valid, error_msg, calculated_age = validate_staff_age(None, staff_birth_date)
            if not is_valid:
                log_api_action(
                    request=request,
                    action='CREATE_STAFF_FAILED',
                    success=False,
                    error_message=error_msg,
                    status_code=400
                )
                return JsonResponse({"error": error_msg}, status=400)
        else:
            # If no birth_date but age is provided, just validate it
            if staff_age:
                is_valid, error_msg, validated_age = validate_staff_age(staff_age, None)
                if not is_valid:
                    log_api_action(
                        request=request,
                        action='CREATE_STAFF_FAILED',
                        success=False,
                        error_message=error_msg,
                        status_code=400
                    )
                    return JsonResponse({"error": error_msg}, status=400)
        
        # Validate phone
        staff_phone = data.get("staff_phone", "").strip() if data.get("staff_phone") else None
        if staff_phone:
            is_valid, error_msg = validate_staff_phone(staff_phone)
            if not is_valid:
                log_api_action(
                    request=request,
                    action='CREATE_STAFF_FAILED',
                    success=False,
                    error_message=error_msg,
                    status_code=400
                )
                return JsonResponse({"error": error_msg}, status=400)
        
        # Validate city (optional, just trim whitespace)
        staff_city = data.get("staff_city", "").strip() if data.get("staff_city") else None
        
        # Validate gender
        staff_gender = None
        if "staff_gender" in data and data.get("staff_gender") is not None:
            gender_val = data.get("staff_gender")
            if isinstance(gender_val, bool):
                staff_gender = gender_val
            elif isinstance(gender_val, str):
                gender_lower = gender_val.lower()
                if gender_lower in ['female', 'נקבה', '1', 'true']:
                    staff_gender = True
                elif gender_lower in ['male', 'זכר', '0', 'false']:
                    staff_gender = False
                else:
                    log_api_action(
                        request=request,
                        action='CREATE_STAFF_FAILED',
                        success=False,
                        error_message="מין לא תקין. יש להשתמש ב: male/זכר או female/נקבה",
                        status_code=400
                    )
                    return JsonResponse(
                        {"error": "מין לא תקין. יש להשתמש ב: male/זכר או female/נקבה"}, 
                        status=400
                    )

        staff_member = Staff.objects.create(
            username=data["username"],
            email=data["email"],
            first_name=data["first_name"],
            last_name=data["last_name"],
            created_at=datetime.datetime.now(),
            staff_israel_id=staff_israel_id,
            staff_age=calculated_age,  # Auto-calculated from birth_date
            staff_birth_date=staff_birth_date,
            staff_gender=staff_gender,
            staff_phone=staff_phone,
            staff_city=staff_city,
        )

        roles = data["roles"]
        if isinstance(roles, list):
            if "General Volunteer" in roles or "Tutor" in roles:
                log_api_action(
                    request=request,
                    action='CREATE_STAFF_FAILED',
                    success=False,
                    error_message="Cannot create a user with 'General Volunteer' nor 'Tutor' roles via this flow",
                    status_code=400
                )
                api_logger.warning("Cannot create a user with 'General Volunteer' nor 'Tutor' roles via this flow.")
                return JsonResponse(
                    {
                        "error": "Cannot create a user with 'General Volunteer' nor 'Tutor' roles via this flow."
                    },
                    status=400,
                )
            staff_member.roles.clear()
            for role_name in roles:
                try:
                    role = Role.objects.get(role_name=role_name)
                    staff_member.roles.add(role)
                except Role.DoesNotExist:
                    log_api_action(
                        request=request,
                        action='CREATE_STAFF_FAILED',
                        success=False,
                        error_message=f"Role with name '{role_name}' does not exist",
                        status_code=400
                    )
                    api_logger.warning(f"Role with name '{role_name}' does not exist.")
                    return JsonResponse(
                        {"error": f"Role with name '{role_name}' does not exist."},
                        status=400,
                    )
        else:
            log_api_action(
                request=request,
                action='CREATE_STAFF_FAILED',
                success=False,
                error_message="Roles should be provided as a list of role names",
                status_code=400
            )
            api_logger.warning("Roles should be provided as a list of role names.")
            return JsonResponse(
                {"error": "Roles should be provided as a list of role names."},
                status=400,
            )
        
        log_api_action(
            request=request,
            action='CREATE_STAFF_SUCCESS',
            affected_tables=['childsmile_app_staff', 'childsmile_app_staff_roles'],
            entity_type='Staff',
            entity_ids=[staff_member.staff_id],
            success=True,
            additional_data={
                'created_staff_email': data["email"],
                'assigned_roles': roles,
                'step': 'completed'
            }
        )
        
        api_logger.debug(
            f"Staff member created successfully with ID {staff_member.staff_id}"
        )
        return JsonResponse(
            {
                "message": "Staff member created successfully",
                "staff_id": staff_member.staff_id,
            },
            status=201,
        )
    except Exception as e:
        api_logger.error(f"An error occurred while creating a staff member: {str(e)}")
        log_api_action(
            request=request,
            action='CREATE_STAFF_FAILED',
            success=False,
            error_message=str(e),
            status_code=500
        )
        return JsonResponse({"error": str(e)}, status=500)


def create_staff_member_internal(data, request=None):
    api_logger.debug("create_staff_member_internal called")
    """
    Internal function to create staff member
    """
    try:
        staff_member = Staff.objects.create(
            username=data["username"],
            email=data["email"],
            first_name=data["first_name"],
            last_name=data["last_name"],
            created_at=datetime.datetime.now(),
        )

        roles = data["roles"]
        if isinstance(roles, list):
            if "General Volunteer" in roles or "Tutor" in roles:
                if request:
                    log_api_action(
                        request=request,
                        action='CREATE_STAFF_FAILED',
                        success=False,
                        error_message="Cannot create user with 'General Volunteer' or 'Tutor' roles",
                        status_code=400
                    )
                    api_logger.warning("Cannot create user with 'General Volunteer' or 'Tutor' roles.")
                    return JsonResponse({
                        "error": "Cannot create user with 'General Volunteer' or 'Tutor' roles"
                    }, status=400)
            staff_member.roles.clear()
            for role_name in roles:
                try:
                    role = Role.objects.get(role_name=role_name)
                    staff_member.roles.add(role)
                except Role.DoesNotExist:
                    if request:
                        log_api_action(
                            request=request,
                            action='CREATE_STAFF_FAILED',
                            success=False,
                            error_message=f"Role '{role_name}' does not exist",
                            status_code=400
                        )
                    api_logger.warning(f"Role '{role_name}' does not exist.")
                    return JsonResponse({
                        "error": f"Role '{role_name}' does not exist"
                    }, status=400)

        if request:
            log_api_action(
                request=request,
                action='CREATE_STAFF_SUCCESS',
                affected_tables=['childsmile_app_staff', 'childsmile_app_staff_roles'],
                entity_type='Staff',
                entity_ids=[staff_member.staff_id],
                success=True,
                additional_data={
                    'created_staff_email': data["email"],
                    'assigned_roles': roles
                }
            )
        api_logger.info(f"Staff member created successfully with ID {staff_member.staff_id}")
        return JsonResponse({
            "message": "Staff member created successfully",
            "staff_id": staff_member.staff_id,
        }, status=201)

    except Exception as e:
        if request:
            log_api_action(
                request=request,
                action='CREATE_STAFF_FAILED',
                success=False,
                error_message=str(e),
                status_code=500
            )
        return JsonResponse({"error": str(e)}, status=500)


@conditional_csrf
@api_view(["POST"])
@ratelimit(key='ip', rate='5/m', method='POST', block=True)
def staff_creation_send_totp(request):
    """
    Send TOTP code for staff creation verification
    """
    api_logger.info("staff_creation_send_totp called")
    try:
        user_id = request.session.get("user_id")
        if not user_id:
            log_api_action(
                request=request,
                action='CREATE_STAFF_FAILED',
                success=False,
                error_message="Authentication required",
                status_code=403
            )
            return JsonResponse({"detail": "Authentication required"}, status=403)

        user = Staff.objects.get(staff_id=user_id)
        if not is_admin(user):
            log_api_action(
                request=request,
                action='CREATE_STAFF_FAILED',
                success=False,
                error_message="Admin permission required",
                status_code=401
            )
            api_logger.warning("Admin permission required")
            return JsonResponse({"error": "Admin permission required"}, status=401)

        data = request.data
        
        required_fields = ["username", "email", "first_name", "last_name"]
        missing_fields = [field for field in required_fields if not data.get(field, "").strip()]
        
        if not data.get("roles") or not isinstance(data.get("roles"), list) or len(data.get("roles")) == 0:
            missing_fields.append("roles")
            
        if missing_fields:
            log_api_action(
                request=request,
                action='CREATE_STAFF_FAILED',
                success=False,
                error_message=f"Missing or empty required fields: {', '.join(missing_fields)}",
                status_code=400
            )
            api_logger.debug(f"Missing or empty required fields: {', '.join(missing_fields)}")
            return JsonResponse({
                "error": f"Missing or empty required fields: {', '.join(missing_fields)}"
            }, status=400)

        email = data.get("email").strip().lower()
        username = data.get("username")
        first_name = data.get("first_name")
        last_name = data.get("last_name")
        roles = data.get("roles", [])
        
        if Staff.objects.filter(username=username).exists():
            log_api_action(
                request=request,
                action='CREATE_STAFF_FAILED',
                success=False,
                error_message=f"Username '{username}' already exists",
                status_code=400
            )
            api_logger.warning(f"Username '{username}' already exists.")
            return JsonResponse(
                {"error": f"Username '{username}' already exists."}, status=400
            )

        if Staff.objects.filter(email__iexact=email).exists():
            log_api_action(
                request=request,
                action='CREATE_STAFF_FAILED',
                success=False,
                error_message=f"Email '{email}' already exists",
                status_code=400,
                additional_data={'attempted_email': email}
            )
            api_logger.warning(f"Email '{email}' already exists.")
            return JsonResponse(
                {"error": f"Email '{email}' already exists."}, status=400
            )

        request.session['pending_staff_creation'] = data
        request.session['staff_creation_new_user_email'] = email

        TOTPCode.objects.filter(email=email, used=False).update(used=True)
        code = TOTPCode.generate_code()
        TOTPCode.objects.create(email=email, code=code)

        subject = "אימות יצירת חשבון סגל - חיוך של ילד"
        html_message = f"""<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
</head>
<body dir="rtl" style="direction: rtl; text-align: right; font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5;">
        <tr>
            <td align="right" style="padding: 0;">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #f9f9f9; margin: 0 auto;">
                    <!-- HEADER -->
                    <tr>
                        <td style="background-color: #2196F3; color: white; padding: 20px; text-align: center; font-size: 20px; font-weight: bold;">
                            קוד אימות יצירת חשבון
                        </td>
                    </tr>
                    <!-- CONTENT -->
                    <tr>
                        <td style="background-color: white; padding: 30px;">
                            <p dir="rtl" style="text-align: right; margin: 15px 0;">שלום {first_name},</p>
                            
                            <p dir="rtl" style="text-align: right; margin: 15px 0;">מנהל מערכת יוצר לך חשבון סגל.</p>
                            
                            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                            
                            <p dir="rtl" style="text-align: right; margin: 15px 0;">קוד האימות שלך הוא:</p>
                            
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
                                <tr>
                                    <td style="text-align: center; padding: 20px; background-color: #f0f0f0; border: 2px solid #2196F3; border-radius: 8px;">
                                        <span style="font-size: 32px; font-weight: bold; color: #2196F3; letter-spacing: 8px; direction: ltr; unicode-bidi: embed;">{code}</span>
                                    </td>
                                </tr>
                            </table>
                            
                            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                            
                            <p dir="rtl" style="text-align: right; margin: 15px 0;">⏱ הקוד יפוג בעוד 5 דקות.</p>
                            
                            <p dir="rtl" style="text-align: right; margin: 15px 0;">אנא מסור קוד זה למנהל המערכת כדי להשלים את יצירת החשבון.</p>
                        </td>
                    </tr>
                    <!-- FOOTER -->
                    <tr>
                        <td style="background-color: #f0f0f0; padding: 15px; text-align: center; font-size: 12px; color: #666;">
                            <p dir="rtl" style="text-align: center; margin: 0;">בברכה,</p>
                            <p dir="rtl" style="text-align: center; margin: 0;">צוות חיוך של ילד</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>"""
        message = f"""
        שלום {first_name},

        מנהל מערכת יוצר לך חשבון סגל.

        קוד האימות שלך הוא: {code}
        
        הקוד יפוג בעוד 5 דקות.
        
        אנא מסור קוד זה למנהל המערכת כדי להשלים את יצירת החשבון.
        
        בברכה,
        צוות חיוך של ילד
        """
        
        try:
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [email],
                html_message=html_message,
                fail_silently=False,
            )
            
            # Send TOTP code via WhatsApp if phone number available (staff creation)
            staff_phone = data.get("staff_phone", "").strip()
            if staff_phone:
                try:
                    whatsapp_result = send_totp_login_code_whatsapp(
                        staff_phone=staff_phone,
                        totp_code=code
                    )
                    
                    if whatsapp_result.get("success"):
                        api_logger.info(f"Staff creation TOTP code sent via WhatsApp to {email}: {whatsapp_result.get('message_sid')}")
                    else:
                        api_logger.warning(f"WhatsApp staff creation TOTP send failed for {email}: {whatsapp_result.get('error')} - {whatsapp_result.get('details', '')}")
                except Exception as wa_error:
                    api_logger.error(f"Error sending staff creation TOTP via WhatsApp to {email}: {str(wa_error)}")
            
            api_logger.debug(f"Sent staff creation TOTP code {code} to {email}")
            
            return JsonResponse({
                "message": "Verification code sent to the new staff member's email",
                "email": email
            })
            
        except Exception as email_error:
            log_api_action(
                request=request,
                action='CREATE_STAFF_FAILED',
                success=False,
                error_message=f"Failed to send verification email: {str(email_error)}",
                status_code=500,
                additional_data={
                    'attempted_email': email,
                    'attempted_username': username
                }
            )
            api_logger.error(f"Failed to send verification email to {email}: {str(email_error)}")
            return JsonResponse({"error": f"Failed to send verification email: {str(email_error)}"}, status=500)
        
    except Staff.DoesNotExist:
        log_api_action(
            request=request,
            action='CREATE_STAFF_FAILED',
            success=False,
            error_message="Authentication required - staff not found",
            status_code=403
        )
        api_logger.warning("Authentication required - staff not found")
        return JsonResponse({"error": "Authentication required"}, status=403)
    except Exception as e:
        api_logger.error(f"Error in staff_creation_send_totp: {str(e)}")
        api_logger.error(f"Full traceback: {traceback.format_exc()}")
        log_api_action(
            request=request,
            action='CREATE_STAFF_FAILED',
            success=False,
            error_message=str(e),
            status_code=500
        )
        return JsonResponse({"error": "Failed to send verification code"}, status=500)


@conditional_csrf
@api_view(["POST"])
@ratelimit(key='ip', rate='10/m', method='POST', block=True)
def staff_creation_verify_totp(request):
    api_logger.info("staff_creation_verify_totp called")
    """
    Verify TOTP and complete staff creation
    """
    try:
        api_logger.debug(f"staff_creation_verify_totp called")
        api_logger.debug(f"Request body: {request.body}")
        
        user_id = request.session.get("user_id")
        if not user_id:
            api_logger.debug(f"No user_id in session")
            log_api_action(
                request=request,
                action='CREATE_STAFF_FAILED',
                success=False,
                error_message="Authentication required",
                status_code=403
            )
            return JsonResponse({"detail": "Authentication required"}, status=403)

        user = Staff.objects.get(staff_id=user_id)
        if not is_admin(user):
            api_logger.debug(f"User {user_id} is not admin")
            log_api_action(
                request=request,
                action='CREATE_STAFF_FAILED',
                success=False,
                error_message="Admin permission required",
                status_code=401
            )
            api_logger.warning("Admin permission required")
            return JsonResponse({"error": "Admin permission required"}, status=401)

        data = json.loads(request.body)
        code = data.get('code', '').strip()
        
        email = request.session.get('staff_creation_new_user_email', '').strip().lower()
        
        api_logger.debug(f"Email from session: '{email}', code from request: '{code}'")
        api_logger.debug(f"Session keys: {list(request.session.keys())}")
        
        if not email or not code:
            api_logger.debug(f"Missing email or code - email: '{email}', code: '{code}'")
            log_api_action(
                request=request,
                action='CREATE_STAFF_FAILED',
                success=False,
                error_message="Invalid session or missing code",
                status_code=400
            )
            api_logger.warning("Invalid session or missing code")
            return JsonResponse({"error": "Invalid session or missing code"}, status=400)
        
        totp_record = TOTPCode.objects.filter(
            email=email,
            used=False
        ).order_by('-created_at').first()
        
        api_logger.debug(f"Found TOTP record: {totp_record}")
        if totp_record:
            api_logger.debug(f"TOTP code in DB: '{totp_record.code}', received: '{code}'")
            api_logger.debug(f"TOTP is_valid: {totp_record.is_valid()}")
        
        if not totp_record:
            api_logger.debug(f"No TOTP record found for email: {email}")
            log_api_action(
                request=request,
                action='CREATE_STAFF_FAILED',
                success=False,
                error_message="Invalid or expired code",
                status_code=400,
                additional_data={'attempted_email': email}
            )
            api_logger.warning("Invalid or expired code")
            return JsonResponse({"error": "Invalid or expired code"}, status=400)
            
        if not totp_record.is_valid():
            api_logger.debug(f"TOTP record is not valid")
            log_api_action(
                request=request,
                action='CREATE_STAFF_FAILED',
                success=False,
                error_message="Code has expired or too many attempts",
                status_code=400,
                additional_data={'attempted_email': email}
            )
            api_logger.warning("Code has expired or too many attempts")
            return JsonResponse({"error": "Code has expired or too many attempts"}, status=400)
        
        totp_record.attempts += 1
        totp_record.save()
        
        if totp_record.code != code:
            api_logger.debug(f"Code mismatch - DB: '{totp_record.code}', received: '{code}'")
            if totp_record.attempts >= 3:
                totp_record.used = True
                totp_record.save()
                log_api_action(
                    request=request,
                    action='CREATE_STAFF_FAILED',
                    success=False,
                    error_message="Too many failed attempts",
                    status_code=429,
                    additional_data={'attempted_email': email}
                )
                return JsonResponse({"error": "Too many failed attempts"}, status=429)
            
            log_api_action(
                request=request,
                action='CREATE_STAFF_FAILED',
                success=False,
                error_message="Invalid code",
                status_code=400,
                additional_data={'attempted_email': email}
            )
            return JsonResponse({"error": "Invalid code"}, status=400)
        
        totp_record.used = True
        totp_record.save()
        api_logger.debug(f"TOTP verification successful")
        
        staff_data = request.session.get('pending_staff_creation')
        api_logger.debug(f"Staff data from session: {staff_data}")
        
        if not staff_data:
            api_logger.debug(f"No staff data in session")
            log_api_action(
                request=request,
                action='CREATE_STAFF_FAILED',
                success=False,
                error_message="Staff creation session expired",
                status_code=400
            )
            api_logger.warning("Staff creation session expired")
            return JsonResponse({"error": "Staff creation session expired"}, status=400)
        
        api_logger.debug(f"About to create staff member")
        result = create_staff_member_internal(staff_data, request)
        
        if 'pending_staff_creation' in request.session:
            del request.session['pending_staff_creation']
        if 'staff_creation_new_user_email' in request.session:
            del request.session['staff_creation_new_user_email']
        
        api_logger.debug(f"Staff creation completed successfully")
        return result
        
    except Exception as e:
        api_logger.error(f"Error in staff_creation_verify_totp: {str(e)}")
        api_logger.error(f"Full traceback: {traceback.format_exc()}")
        log_api_action(
            request=request,
            action='CREATE_STAFF_FAILED',
            success=False,
            error_message=str(e),
            status_code=500
        )
        return JsonResponse({"error": "Staff creation failed"}, status=500)


@conditional_csrf
@api_view(["POST"])
def bulk_clear_suspension(request):
    """
    Bulk clear suspension for multiple staff members.
    Logs a single audit entry for all users instead of spamming the audit log.
    """
    api_logger.info("bulk_clear_suspension called")
    user_id = request.session.get("user_id")
    if not user_id:
        log_api_action(
            request=request,
            action='BULK_CLEAR_SUSPENSION_FAILED',
            success=False,
            error_message="Authentication credentials were not provided",
            status_code=403
        )
        return JsonResponse({"detail": "Authentication credentials were not provided."}, status=403)

    user = Staff.objects.get(staff_id=user_id)
    if not is_admin(user):
        log_api_action(
            request=request,
            action='BULK_CLEAR_SUSPENSION_FAILED',
            success=False,
            error_message="You do not have permission to perform this action",
            status_code=401
        )
        return JsonResponse({"error": "You do not have permission to perform this action."}, status=401)

    try:
        staff_ids = request.data.get("staff_ids", [])
        
        if not staff_ids or not isinstance(staff_ids, list):
            return JsonResponse({
                "error": "staff_ids must be provided as a non-empty list"
            }, status=400)
        
        # Get all staff members to clear
        staff_members = Staff.objects.filter(
            staff_id__in=staff_ids,
            is_active=True,
            deactivation_reason="suspended"
        )
        
        if not staff_members.exists():
            log_api_action(
                request=request,
                action='BULK_CLEAR_SUSPENSION_FAILED',
                success=False,
                error_message="No suspended users found in the provided list",
                status_code=400,
                entity_type='Staff',
                entity_ids=staff_ids
            )
            return JsonResponse({
                "error": "No suspended users found in the provided list"
            }, status=400)
        
        # Track which users were actually cleared
        cleared_users = []
        cleared_emails = []
        
        # Clear suspension for all matching staff members
        for staff_member in staff_members:
            staff_member.deactivation_reason = None
            staff_member.save()
            cleared_users.append(staff_member.staff_id)
            cleared_emails.append(staff_member.email)
        
        # Log ONE audit entry for all cleared users
        log_api_action(
            request=request,
            action='BULK_CLEAR_SUSPENSION',
            success=True,
            error_message=None,
            status_code=200,
            entity_type='Staff',
            entity_ids=cleared_users,
            additional_data={
                'cleared_count': len(cleared_users),
                'cleared_emails': cleared_emails,
                'cleared_staff_ids': cleared_users,
                'performed_by': f"{user.first_name} {user.last_name}",
                'performed_by_email': user.email
            }
        )
        
        api_logger.info(f"Bulk suspension cleared for {len(cleared_users)} users: {cleared_emails}")
        
        return JsonResponse({
            "message": f"Access granted to {len(cleared_users)} user(s)",
            "success": True,
            "cleared_count": len(cleared_users),
            "cleared_users": cleared_users
        }, status=200)
        
    except Exception as e:
        api_logger.error(f"Error in bulk_clear_suspension: {str(e)}")
        api_logger.error(f"Full traceback: {traceback.format_exc()}")
        log_api_action(
            request=request,
            action='BULK_CLEAR_SUSPENSION_FAILED',
            success=False,
            error_message=str(e),
            status_code=500,
            entity_type='Staff'
        )
        return JsonResponse({"error": str(e)}, status=500)


@conditional_csrf
@api_view(["GET"])
def get_staff_profile_data(request, email):
    """
    Get profile data for a staff member.
    For management staff: use Staff model fields
    For non-management staff (tutors, volunteers): use SignedUp model fields
    """
    api_logger.info(f"get_staff_profile_data called for email: {email}")
    
    try:
        # First get the staff member to check their roles
        staff = Staff.objects.filter(email__iexact=email).first()
        
        if not staff:
            api_logger.info(f"No staff member found for {email}")
            return JsonResponse({
                "message": "Staff member not found",
                "profile_data": None,
                "source": None
            }, status=200)
        
        # Check if user is management staff
        # Management roles: any role except Tutor and General Volunteer
        roles = [role.role_name for role in staff.roles.all()]
        is_management = not (len(roles) == 1 and roles[0] in ["Tutor", "General Volunteer"])
        
        if is_management:
            # For management staff, use Staff model
            birth_date = staff.staff_birth_date
            profile_data = {
                "staff_israel_id": staff.staff_israel_id,
                "staff_birth_date": birth_date.strftime("%d/%m/%Y") if birth_date else None,
                "staff_age": staff.staff_age,
                "staff_gender": staff.staff_gender,
                "staff_phone": staff.staff_phone,
                "staff_city": staff.staff_city,
            }
            api_logger.info(f"Management staff: fetched profile data from Staff model for {email}")
            
            return JsonResponse({
                "message": "Profile data retrieved successfully",
                "profile_data": profile_data,
                "source": "Staff"
            }, status=200)
        else:
            # For non-management staff, use SignedUp model - id field IS the Israeli ID
            signup = SignedUp.objects.filter(email__iexact=email).first()
            
            if signup:
                birth_date = getattr(signup, 'birth_date', None)
                profile_data = {
                    "staff_israel_id": signup.id,  # The 'id' field in SignedUp IS the Israeli ID
                    "staff_birth_date": birth_date.strftime("%d/%m/%Y") if birth_date else None,
                    "staff_age": getattr(signup, 'age', None),
                    "staff_gender": getattr(signup, 'gender', None),
                    "staff_phone": getattr(signup, 'phone', None),
                    "staff_city": getattr(signup, 'city', None),
                }
                api_logger.info(f"Non-management staff: fetched profile data from SignedUp model for {email}")
                
                return JsonResponse({
                    "message": "Profile data retrieved successfully",
                    "profile_data": profile_data,
                    "source": "SignedUp"
                }, status=200)
            else:
                api_logger.info(f"No SignedUp record found for non-management staff {email}")
                return JsonResponse({
                    "message": "No profile data found in SignedUp",
                    "profile_data": None,
                    "source": None
                }, status=200)
        
    except Exception as e:
        api_logger.error(f"Error in get_staff_profile_data: {str(e)}")
        api_logger.error(f"Full traceback: {traceback.format_exc()}")
        return JsonResponse({
            "error": str(e),
            "profile_data": None
        }, status=500)
