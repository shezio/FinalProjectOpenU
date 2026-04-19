"""
Coordinator notification utilities - handles email notifications to different coordinator types.
Also sends WhatsApp notifications alongside emails.
"""

import datetime
import threading
import time
from django.utils.timezone import now
from django.core.mail import send_mail
from django.conf import settings
from .models import (
    Role,
    Staff,
    SignedUp,
    Children,
    Task_Types,
    Tasks,
)
from .logger import api_logger
from datetime import timedelta
from .utils import create_task_internal

# Import WhatsApp utils if available (optional feature - graceful fallback)
from .whatsapp_utils import send_coordinator_notification_whatsapp, send_coordinator_notification_whatsapp_family, send_coordinator_notification_whatsapp_family_with_age_unit


# ============================================================================
# VOLUNTEER COORDINATOR EMAIL NOTIFICATIONS
# ============================================================================

def create_tasks_for_admins_async(staff_user_id, user_name, user_email):
    """
    Async wrapper to create registration approval tasks for all Volunteer Coordinators (first approval level)
    """
    thread = threading.Thread(
        target=create_tasks_for_admins,
        args=(staff_user_id, user_name, user_email),
        daemon=True
    )
    thread.start()


def create_tasks_for_admins(staff_user_id, user_name, user_email):
    """
    Send email notification to all Volunteer Coordinators about a new registration needing approval.
    This notifies them that a user has registered and is waiting for their approval.
    
    Email includes:
    - Personalized greeting with coordinator name
    - User details (name, email, age, gender, phone, city, tutor interest)
    - HTML formatted with RTL support for Hebrew
    - Green header (#4CAF50) for registration emails
    """
    try:
        # Fetch Volunteer Coordinator role ONLY (first approval level)
        coordinator_role = Role.objects.filter(role_name="Volunteer Coordinator").first()
        
        if not coordinator_role:
            api_logger.debug("Role 'Volunteer Coordinator' not found in the database.")
            return
        
        # Fetch all Volunteer Coordinators
        approval_staff = Staff.objects.filter(roles=coordinator_role).distinct()
        
        if not approval_staff.exists():
            api_logger.warning("No Volunteer Coordinators found in the database.")
            return

        api_logger.debug(f"Found {approval_staff.count()} Volunteer Coordinators for registration approval task (first level).")

        # Get the task type for registration approval
        task_type = Task_Types.objects.filter(task_type="אישור הרשמה").first()
        if not task_type:
            api_logger.error("Task type 'אישור הרשמה' not found in the database.")
            return

        # Get the staff user and SignedUp record to extract their data
        user_info = {}
        try:
            staff_user = Staff.objects.get(staff_id=staff_user_id)
            user_info = {
                "full_name": staff_user.first_name + " " + staff_user.last_name,
                "email": staff_user.email,
                "created_at": staff_user.created_at.isoformat() if staff_user.created_at else None,  # Convert to ISO string
            }
        except Staff.DoesNotExist:
            api_logger.error(f"Staff user with ID {staff_user_id} not found")
        
        # Also get SignedUp data if available
        try:
            signed_up = SignedUp.objects.get(email=user_email)
            user_info.update({
                "ID": signed_up.id,
                "age": signed_up.age,
                "gender": signed_up.gender,
                "phone": signed_up.phone,
                "city": signed_up.city,
                "want_tutor": signed_up.want_tutor
            })
        except SignedUp.DoesNotExist:
            api_logger.debug(f"SignedUp record not found for email {user_email}")

        # Send notification email to all Volunteer Coordinators with user details
        try:
            coordinator_emails = approval_staff.values_list('email', flat=True)
            if coordinator_emails:
                # Format user information for the email in a human-readable way
                user_full_name = user_info.get("full_name", "לא זמין")
                user_email_display = user_info.get("email", "לא זמין")
                user_age = user_info.get("age", "לא זמין")
                user_phone = user_info.get("phone", "לא זמין")
                user_city = user_info.get("city", "לא זמין")
                user_wants_tutor = "כן" if user_info.get("want_tutor") else "לא"
                user_gender = "נקבה" if user_info.get("gender") else "זכר"
                created_at = user_info.get("created_at", "לא זמין")
                
                # Format the datetime nicely
                if created_at and created_at != "לא זמין":
                    try:
                        dt = datetime.datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                        created_at = dt.strftime("%d/%m/%Y בשעה %H:%M")
                    except:
                        pass
                
                subject = f"משימה חדשה: אישור הרשמה ראשוני - {user_full_name}"
                
                # Send individual emails and WhatsApp messages with personalized coordinator name
                for staff_member in approval_staff:
                    coordinator_name = f"{staff_member.first_name} {staff_member.last_name}"
                    
                    message = f"""<!DOCTYPE html>
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
                        <td style="background: linear-gradient(to right, #4CAF50 0%, #45a049 100%); color: white; padding: 20px; text-align: center; font-size: 20px; font-weight: bold; border-radius: 8px 8px 0 0;">
                            משימה חדשה: אישור הרשמה ראשוני
                        </td>
                    </tr>
                    <!-- CONTENT -->
                    <tr>
                        <td style="background-color: white; padding: 30px; border-radius: 0;">
                            <p dir="rtl" style="text-align: right; margin: 15px 0;">שלום {coordinator_name},</p>
                            
                            <p dir="rtl" style="text-align: right; margin: 15px 0;">קיים משתמש חדש הממתין לאישורך לרישום במערכת חיוך של ילד.</p>
                            
                            <hr style="border: none; border-top: 2px solid #4CAF50; margin: 20px 0;">
                            
                            <p dir="rtl" style="text-align: right; font-weight: bold; margin: 15px 0; padding-bottom: 10px; border-bottom: 3px solid #4CAF50; color: #333;">פרטי המשתמש החדש:</p>
                            
                            <!-- FIELDS TABLE -->
                            <table width="100%" cellpadding="0" cellspacing="0" dir="rtl">
                                <tr>
                                    <td style="margin: 12px 0; padding: 10px; background-color: #f5f5f5; border-radius: 4px; text-align: right; direction: rtl;">
                                        <span style="font-weight: bold; color: #333; display: inline-block; margin-left: 10px;">שם מלא:</span><span style="color: #666; direction: ltr; unicode-bidi: embed;">{user_full_name}</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="margin: 12px 0; padding: 10px; background-color: #f5f5f5; border-radius: 4px; text-align: right; direction: rtl;">
                                        <span style="font-weight: bold; color: #333; display: inline-block; margin-left: 10px;">דואר אלקטרוני:</span><span style="color: #666; direction: ltr; unicode-bidi: embed;">{user_email_display}</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="margin: 12px 0; padding: 10px; background-color: #f5f5f5; border-radius: 4px; text-align: right; direction: rtl;">
                                        <span style="font-weight: bold; color: #333; display: inline-block; margin-left: 10px;">גיל:</span><span style="color: #666; direction: ltr; unicode-bidi: embed;">{user_age}</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="margin: 12px 0; padding: 10px; background-color: #f5f5f5; border-radius: 4px; text-align: right; direction: rtl;">
                                        <span style="font-weight: bold; color: #333; display: inline-block; margin-left: 10px;">מין:</span><span style="color: #666; direction: ltr; unicode-bidi: embed;">{user_gender}</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="margin: 12px 0; padding: 10px; background-color: #f5f5f5; border-radius: 4px; text-align: right; direction: rtl;">
                                        <span style="font-weight: bold; color: #333; display: inline-block; margin-left: 10px;">טלפון:</span><span style="color: #666; direction: ltr; unicode-bidi: embed;">{user_phone}</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="margin: 12px 0; padding: 10px; background-color: #f5f5f5; border-radius: 4px; text-align: right; direction: rtl;">
                                        <span style="font-weight: bold; color: #333; display: inline-block; margin-left: 10px;">עיר מגורים:</span><span style="color: #666; direction: ltr; unicode-bidi: embed;">{user_city}</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="margin: 12px 0; padding: 10px; background-color: #f5f5f5; border-radius: 4px; text-align: right; direction: rtl;">
                                        <span style="font-weight: bold; color: #333; display: inline-block; margin-left: 10px;">מעוניין להיות חונך:</span><span style="color: #666; direction: ltr; unicode-bidi: embed;">{user_wants_tutor}</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="margin: 12px 0; padding: 10px; background-color: #f5f5f5; border-radius: 4px; text-align: right; direction: rtl;">
                                        <span style="font-weight: bold; color: #333; display: inline-block; margin-left: 10px;">תאריך הרשמה:</span><span style="color: #666; direction: ltr; unicode-bidi: embed;">{created_at}</span>
                                    </td>
                                </tr>
                            </table>
                            
                            <hr style="border: none; border-top: 2px solid #4CAF50; margin: 20px 0;">
                            
                            <p dir="rtl" style="text-align: right; margin: 15px 0;"><strong style="color: #2e7d32;">אנא בדוק את פרטי המשתמש במערכת וקבע הערות/תנאים אם יש צורך.</strong></p>
                            <p dir="rtl" style="text-align: right; margin: 15px 0;"><strong style="color: #2e7d32;">לאחר מכן אשר או דחה את ההרשמה כנדרש.</strong></p>
                            
                            <hr style="border: none; border-top: 2px solid #4CAF50; margin: 20px 0;">
                            
                            <p dir="rtl" style="text-align: right; color: #666; font-size: 12px; margin: 15px 0;">בברכה,<br>צוות חיוך של ילד</p>
                        </td>
                    </tr>
                    <!-- FOOTER -->
                    <tr>
                        <td style="background-color: #f0f0f0; padding: 15px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px;">
                            <p dir="rtl" style="text-align: center; margin: 0;">זוהי הודעה אוטומטית - אנא אל תשיב לאימייל זה</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>"""

                    # Send email
                    send_mail(
                        subject,
                        message,
                        settings.DEFAULT_FROM_EMAIL,
                        [staff_member.email],
                        fail_silently=True,
                        html_message=message
                    )
                    
                    # Send WhatsApp message to coordinator
                    if staff_member.staff_phone:
                        try:
                            whatsapp_result = send_coordinator_notification_whatsapp(
                                coordinator_phone=staff_member.staff_phone,
                                coordinator_name=coordinator_name,
                                user_name=user_full_name,
                                user_email=user_email_display,
                                user_age=user_age,
                                user_gender=user_gender,
                                user_phone=user_phone,
                                user_city=user_city,
                                user_wants_tutor=user_info.get("want_tutor"),
                                created_at=created_at
                            )
                            if whatsapp_result.get("success"):
                                api_logger.info(f"WhatsApp notification sent to coordinator {staff_member.staff_id}: {whatsapp_result.get('message_sid')}")
                            else:
                                api_logger.warning(f"Failed to send WhatsApp to coordinator {staff_member.staff_id}: {whatsapp_result.get('error')}")
                        except Exception as wa_error:
                            api_logger.error(f"Error sending WhatsApp to coordinator {staff_member.staff_id}: {str(wa_error)}")
                    else:
                        api_logger.info(f"🔔 Coordinator {staff_member.staff_id} has no phone number - WhatsApp notification will NOT be sent")
                
                api_logger.info(f"Registration approval notifications (email + WhatsApp) sent to {len(approval_staff)} Volunteer Coordinators for user {user_email}")
                
                # Create approval task for each Volunteer Coordinator
                try:
                    for staff_member in approval_staff:
                        task_data = {
                            "description": "אישור הרשמה ראשוני",
                            "due_date": (now().date() + timedelta(days=3)).strftime("%Y-%m-%d"),
                            "status": "לא הושלמה",
                            "assigned_to": staff_member.staff_id,
                            "type": task_type.id,
                            "user_info": user_info,
                        }
                        api_logger.debug(f"DEBUG: Creating coordinator approval task for Volunteer Coordinator {staff_member.staff_id}: {task_data}")
                        try:
                            task = create_task_internal(task_data)
                            api_logger.info(f"Coordinator approval task created for {staff_member.staff_id}, task ID: {task.task_id}")
                        except Exception as task_error:
                            api_logger.error(f"ERROR: Error creating coordinator approval task: {str(task_error)}")
                except Exception as outer_error:
                    api_logger.error(f"Error creating approval tasks: {str(outer_error)}")
        except Exception as e:
            api_logger.error(f"Error sending registration approval notification email: {str(e)}")
    except Exception as e:
        api_logger.error(f"ERROR: An error occurred while creating coordinator approval tasks: {str(e)}")


# ============================================================================
# TUTORED FAMILIES COORDINATOR EMAIL NOTIFICATIONS
# ============================================================================

# Tutoring statuses that require a tutor - coordinators should be notified
TUTORING_STATUSES_REQUIRING_TUTOR = {
    'למצוא_חונך',                       # Find Tutor
    'יש_חונך',                          # Has Tutor
    'למצוא_חונך_אין_באיזור_שלו',      # Find Tutor No Area
    'למצוא_חונך_בעדיפות_גבוה',        # Find Tutor High Priority
    'שידוך_בסימן_שאלה',                # Match Questionable
}


def notify_tutored_families_coordinators_async(child_id):
    """
    Async wrapper for family notifications to Tutored Families Coordinators.
    Fires in background without blocking.
    """
    thread = threading.Thread(
        target=notify_tutored_families_coordinators,
        args=(child_id,),
        daemon=True
    )
    thread.start()


def notify_tutored_families_coordinators(child_id):
    """
    Send email notification to all Tutored Families Coordinators about a new family needing a tutor.
    
    Triggered when a family is added via create_family API with tutoring_status requiring a tutor.
    
    Email includes:
    - Child demographics (name, age, gender, city, phone)
    - Tutoring details (status, requirements, registration date)
    - HTML formatted with RTL support for Hebrew
    - Blue header (#2196F3) to differentiate from registration emails
    - Personalized greeting with coordinator name
    """
    try:
        # Fetch "Tutored Families Coordinator" role
        coordinator_role = Role.objects.filter(role_name="Tutored Families Coordinator").first()
        
        if not coordinator_role:
            api_logger.debug("Role 'Tutored Families Coordinator' not found in the database.")
            return
        
        # Fetch all Tutored Families Coordinators
        coordinators = Staff.objects.filter(roles=coordinator_role).distinct()
        
        if not coordinators.exists():
            api_logger.warning("No Tutored Families Coordinators found in the database.")
            return
        
        api_logger.debug(f"Found {coordinators.count()} Tutored Families Coordinators.")
        
        # Retrieve child data
        try:
            child = Children.objects.get(child_id=child_id)
        except Children.DoesNotExist:
            api_logger.error(f"Child with ID {child_id} not found")
            return
        
        # Check if child's tutoring status requires a tutor
        if child.tutoring_status not in TUTORING_STATUSES_REQUIRING_TUTOR:
            api_logger.debug(f"Child {child_id} tutoring status '{child.tutoring_status}' does not require tutor notification")
            return
        
        # Format child information
        from .utils import calculate_age_from_birth_date
        
        child_full_name = f"{child.childfirstname} {child.childsurname}"
        child_age = calculate_age_from_birth_date(child.date_of_birth)
        child_gender = "נקבה" if child.gender else "זכר"
        
        # Get parent phone numbers - prefer mother's phone, fallback to father's, then both if available
        parent_phone = None
        if child.mother_phone:
            parent_phone = str(child.mother_phone)
        elif child.father_phone:
            parent_phone = str(child.father_phone)
        else:
            # Try to combine both if available
            phones = []
            if child.father_phone:
                phones.append(f"אב: {child.father_phone}")
            if child.mother_phone:
                phones.append(f"אם: {child.mother_phone}")
            parent_phone = " | ".join(phones) if phones else "לא זמין"
        
        if not parent_phone or parent_phone == "לא זמין":
            parent_phone = "לא זמין"
        
        child_city = child.city if child.city else "לא זמין"
        child_hospital = child.treating_hospital if child.treating_hospital else "לא ידוע"
        
        # Format tutoring status in Hebrew
        tutoring_status_labels = {
            'למצוא_חונך': 'צריך למצוא חונך',
            'יש_חונך': 'יש חונך קיים',
            'למצוא_חונך_אין_באיזור_שלו': 'צריך חונך - אין באיזורו',
            'למצוא_חונך_בעדיפות_גבוה': 'צריך חונך - עדיפות גבוהה',
            'שידוך_בסימן_שאלה': 'שידוך בסימן שאלה',
        }
        tutoring_status_display = tutoring_status_labels.get(child.tutoring_status, child.tutoring_status)
        
        # Format registration date
        registration_date = child.registrationdate.strftime("%d/%m/%Y") if child.registrationdate else "לא זמין"
        
        subject = f"משפחה חדשה ממתינה לחונך - {child_full_name}"
        
        # Send individual emails to each coordinator
        for coordinator in coordinators:
            coordinator_name = f"{coordinator.first_name} {coordinator.last_name}"
            
            message = f"""<!DOCTYPE html>
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
                            משפחה חדשה ממתינה לחונך
                        </td>
                    </tr>
                    <!-- CONTENT -->
                    <tr>
                        <td style="background-color: white; padding: 30px;">
                            <p dir="rtl" style="text-align: right; margin: 15px 0;">שלום {coordinator_name},</p>
                            
                            <p dir="rtl" style="text-align: right; margin: 15px 0;">משפחה חדשה נוספה למערכת והם ממתינים לחונך מתאים.</p>
                            
                            <hr style="border: none; border-top: 2px solid #2196F3; margin: 20px 0;">
                            
                            <p dir="rtl" style="text-align: right; font-weight: bold; margin: 15px 0; padding-bottom: 10px; border-bottom: 3px solid #2196F3; color: #333;">פרטי הילד:</p>
                            
                            <!-- CHILD FIELDS TABLE -->
                            <table width="100%" cellpadding="0" cellspacing="0" dir="rtl">
                                <tr>
                                    <td style="margin: 12px 0; padding: 10px; background-color: #f5f5f5; border-radius: 4px; text-align: right; direction: rtl;">
                                        <span style="font-weight: bold; color: #333; display: inline-block; margin-left: 10px;">שם מלא:</span><span style="color: #666; direction: ltr; unicode-bidi: embed;">{child_full_name}</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="margin: 12px 0; padding: 10px; background-color: #f5f5f5; border-radius: 4px; text-align: right; direction: rtl;">
                                        <span style="font-weight: bold; color: #333; display: inline-block; margin-left: 10px;">גיל:</span><span style="color: #666; direction: ltr; unicode-bidi: embed;">{child_age} שנים</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="margin: 12px 0; padding: 10px; background-color: #f5f5f5; border-radius: 4px; text-align: right; direction: rtl;">
                                        <span style="font-weight: bold; color: #333; display: inline-block; margin-left: 10px;">מין:</span><span style="color: #666; direction: ltr; unicode-bidi: embed;">{child_gender}</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="margin: 12px 0; padding: 10px; background-color: #f5f5f5; border-radius: 4px; text-align: right; direction: rtl;">
                                        <span style="font-weight: bold; color: #333; display: inline-block; margin-left: 10px;">עיר מגורים:</span><span style="color: #666; direction: ltr; unicode-bidi: embed;">{child_city}</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="margin: 12px 0; padding: 10px; background-color: #f5f5f5; border-radius: 4px; text-align: right; direction: rtl;">
                                        <span style="font-weight: bold; color: #333; display: inline-block; margin-left: 10px;">טלפון הורים:</span><span style="color: #666; direction: ltr; unicode-bidi: embed;">{parent_phone}</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="margin: 12px 0; padding: 10px; background-color: #f5f5f5; border-radius: 4px; text-align: right; direction: rtl;">
                                        <span style="font-weight: bold; color: #333; display: inline-block; margin-left: 10px;">בית חולים/מוסד:</span><span style="color: #666; direction: ltr; unicode-bidi: embed;">{child_hospital}</span>
                                    </td>
                                </tr>
                            </table>
                            
                            <hr style="border: none; border-top: 2px solid #2196F3; margin: 20px 0;">
                            
                            <p dir="rtl" style="text-align: right; font-weight: bold; margin: 15px 0; padding-bottom: 10px; border-bottom: 3px solid #2196F3; color: #333;">פרטי החונכות:</p>
                            
                            <!-- TUTORING FIELDS TABLE -->
                            <table width="100%" cellpadding="0" cellspacing="0" dir="rtl">
                                <tr>
                                    <td style="margin: 12px 0; padding: 10px; background-color: #f5f5f5; border-radius: 4px; text-align: right; direction: rtl;">
                                        <span style="font-weight: bold; color: #333; display: inline-block; margin-left: 10px;">סטטוס חונכות:</span><span style="color: #666; direction: ltr; unicode-bidi: embed;">{tutoring_status_display}</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="margin: 12px 0; padding: 10px; background-color: #f5f5f5; border-radius: 4px; text-align: right; direction: rtl;">
                                        <span style="font-weight: bold; color: #333; display: inline-block; margin-left: 10px;">תאריך הוספה:</span><span style="color: #666; direction: ltr; unicode-bidi: embed;">{registration_date}</span>
                                    </td>
                                </tr>
                            </table>
                            
                            <hr style="border: none; border-top: 2px solid #2196F3; margin: 20px 0;">
                            
                            <p dir="rtl" style="text-align: right; margin: 15px 0;"><strong style="color: #1976D2;">אנא בדוק את פרטי המשפחה וצור קשר עם חונך מתאים.</strong></p>
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

            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [coordinator.email],
                fail_silently=True,
                html_message=message
            )
            
            # Send WhatsApp message to coordinator
            if coordinator.staff_phone:
                try:
                    whatsapp_result = send_coordinator_notification_whatsapp_family(
                        coordinator_phone=coordinator.staff_phone,
                        coordinator_name=coordinator_name,
                        child_name=child_full_name,
                        child_age=child_age,
                        child_gender=child_gender,
                        parent_phone=parent_phone,
                        child_city=child_city,
                        child_hospital=child_hospital,
                        tutoring_status=tutoring_status_display,
                        registration_date=registration_date
                    )
                    if whatsapp_result.get("success"):
                        api_logger.info(f"WhatsApp notification sent to Tutored Families Coordinator {coordinator.staff_id}: {whatsapp_result.get('message_sid')}")
                    else:
                        api_logger.warning(f"Failed to send WhatsApp to coordinator {coordinator.staff_id}: {whatsapp_result.get('error')}")
                except Exception as wa_error:
                    api_logger.error(f"Error sending WhatsApp to coordinator {coordinator.staff_id}: {str(wa_error)}")
            else:
                api_logger.info(f"🔔 Coordinator {coordinator.staff_id} has no phone number - WhatsApp notification will NOT be sent")
        
        api_logger.info(f"Family notification email sent to {coordinators.count()} Tutored Families Coordinators for child {child_id}")
        
    except Exception as e:
        api_logger.error(f"ERROR: An error occurred while notifying tutored families coordinators: {str(e)}")


# ============================================================================
# ADMIN NOTIFICATIONS FOR NEW FAMILIES
# ============================================================================

def notify_admins_of_new_family(child_id):
    """
    Send WhatsApp notification to all System Administrators about a new family,
    excluding the admin with email shlezi0@gmail.com.
    
    Uses Twilio content template (NEW_FAMILY_ADMIN_SID) with 9 variables:
    1. Admin name
    2. Child name
    3. Age display (e.g., "7 שנים" or "5 חודשים")
    4. Gender
    5. City
    6. Parent phone
    7. Hospital
    8. Tutoring status
    9. Registration date
    
    Args:
        child_id: The child ID of the newly created family
    """
    try:
        api_logger.info(f"🔵 notify_admins_of_new_family CALLED with child_id={child_id}")
        from .utils import calculate_age_from_birth_date
        from datetime import date
        
        # Fetch the child/family details
        child = Children.objects.get(child_id=child_id)
        child_name = f"{child.childfirstname} {child.childsurname}"
        api_logger.info(f"🔵 Child found: {child_name} (ID: {child_id})")
        
        # Calculate age in years and determine unit
        if child.date_of_birth:
            today = date.today()
            age_years = (
                today.year
                - child.date_of_birth.year
                - (
                    (today.month, today.day)
                    < (child.date_of_birth.month, child.date_of_birth.day)
                )
            )
            
            # If less than 1 year old, calculate months
            if age_years < 1:
                # Calculate months
                if today.month >= child.date_of_birth.month:
                    age_number = today.month - child.date_of_birth.month
                else:
                    age_number = 12 + today.month - child.date_of_birth.month
                age_unit = "חודשים"
            else:
                age_number = age_years
                age_unit = "שנים"
        else:
            age_number = "N/A"
            age_unit = ""
        
        child_gender = "נקבה" if child.gender else "זכר"
        parent_phone = child.father_phone or child.mother_phone or "לא זמין"
        child_city = child.city or "לא זמין"
        child_hospital = child.treating_hospital or "לא זמין"
        tutoring_status = child.tutoring_status or "לא זמין"
        registration_date = child.registrationdate.strftime("%d/%m/%Y") if child.registrationdate else "לא זמין"
        
        api_logger.info(f"Notifying system admins about new family: {child_name} (ID: {child_id})")
        
        # Get System Administrator role
        admin_role = Role.objects.filter(role_name="System Administrator").first()
        if not admin_role:
            api_logger.debug("Role 'System Administrator' not found in the database.")
            return
        
        # Get all System Admins EXCEPT shlezi0@gmail.com
        all_admins = Staff.objects.filter(roles=admin_role, is_active=True).distinct()
        api_logger.info(f"🔵 Found {all_admins.count()} total active System Administrators")
        
        # Filter out shlezi0@gmail.com (case-insensitive email check)
        admins_to_notify = [
            admin for admin in all_admins 
            if admin.email.lower() != 'shlezi0@gmail.com'
        ]
        api_logger.info(f"🔵 After filtering (excluding shlezi0@gmail.com): {len(admins_to_notify)} admins to notify")
        for admin in admins_to_notify:
            api_logger.info(f"   - Admin: {admin.username} ({admin.email}) - phone: {admin.staff_phone}")
        
        if not admins_to_notify:
            api_logger.debug("No System Administrators (excluding shlezi0@gmail.com) found to notify about new family.")
            return
        
        api_logger.info(f"🔵 Notifying {len(admins_to_notify)} system admins (excluding shlezi0@gmail.com) about new family")
        
        # Send WhatsApp to each admin SYNCHRONOUSLY
        api_logger.info(f"🔵 Proceeding with WhatsApp sends to {len(admins_to_notify)} admins")
        for admin in admins_to_notify:
            api_logger.info(f"🔵 Processing admin {admin.staff_id}: {admin.username}")
            if not admin.staff_phone:
                api_logger.debug(f"Admin {admin.staff_id} ({admin.username}) has no phone number - skipping WhatsApp")
                continue
            
            try:
                admin_name = f"{admin.first_name} {admin.last_name}"
                api_logger.info(f"🔵 Sending WhatsApp to {admin_name} at {admin.staff_phone}")
                
                # Send WhatsApp notification using template with age unit variable
                whatsapp_result = send_coordinator_notification_whatsapp_family_with_age_unit(
                    coordinator_phone=admin.staff_phone,
                    coordinator_name=admin_name,
                    child_name=child_name,
                    age_number=str(age_number),
                    age_unit=age_unit,
                    child_gender=child_gender,
                    parent_phone=parent_phone,
                    child_city=child_city,
                    child_hospital=child_hospital,
                    tutoring_status=tutoring_status,
                    registration_date=registration_date
                )
                
                if whatsapp_result.get("success"):
                    api_logger.info(f"✅ WhatsApp notification sent to admin {admin.staff_id} ({admin.username}): {whatsapp_result.get('message_sid')}")
                else:
                    api_logger.warning(f"❌ Failed to send WhatsApp to admin {admin.staff_id} ({admin.username}): {whatsapp_result.get('error')}")
                    
            except Exception as wa_error:
                api_logger.error(f"❌ Error sending WhatsApp to admin {admin.staff_id}: {str(wa_error)}")
            
    except Children.DoesNotExist:
        api_logger.error(f"Child with ID {child_id} not found for admin notification")
    except Exception as e:
        api_logger.error(f"ERROR: An error occurred while notifying admins of new family: {str(e)}")
