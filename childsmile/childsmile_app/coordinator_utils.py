"""
Coordinator notification utilities - handles email notifications to different coordinator types.
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
)
from .logger import api_logger


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
    - User details (name, ID, email, age, gender, phone, city, tutor interest)
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
                user_id = user_info.get("ID", "לא זמין")
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
                
                # Send individual emails with personalized coordinator name
                for staff_member in approval_staff:
                    coordinator_name = f"{staff_member.first_name} {staff_member.last_name}"
                    
                    message = f"""<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
    <meta charset="UTF-8">
    <style>
        * {{ direction: rtl; unicode-bidi: embed; }}
        body {{ direction: rtl; text-align: right; font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; }}
        .header {{ background-color: #4CAF50; color: white; padding: 20px; border-radius: 5px 5px 0 0; text-align: center; display: flex; align-items: center; justify-content: center; gap: 15px; }}
        .header h2 {{ margin: 0; font-size: 20px; }}
        .header img {{ max-width: 60px; height: auto; }}
        .content {{ background-color: white; padding: 20px; border: 1px solid #ddd; direction: rtl; }}
        .section-title {{ font-weight: bold; margin-top: 20px; margin-bottom: 10px; border-bottom: 2px solid #4CAF50; padding-bottom: 5px; text-align: right; direction: rtl; }}
        .field {{ margin: 8px 0; direction: rtl; text-align: right; display: flex; justify-content: flex-end; align-items: center; flex-direction: row-reverse; }}
        .field-label {{ font-weight: bold; color: #333; margin-left: 10px; }}
        .field-value {{ color: #555; }}
        .footer {{ background-color: #f0f0f0; padding: 15px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 5px 5px; direction: rtl; }}
        .divider {{ border-top: 1px solid #4CAF50; margin: 15px 0; }}
        p {{ margin: 10px 0; text-align: right; direction: rtl; unicode-bidi: embed; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div>
                <h2>משימה חדשה: אישור הרשמה ראשוני</h2>
            </div>
        </div>
        <div class="content">
            <p style="text-align: right; direction: rtl; unicode-bidi: embed;">שלום {coordinator_name},</p>
            
            <p style="text-align: right; direction: rtl; unicode-bidi: embed;">קיים משתמש חדש הממתין לאישורך לרישום במערכת חיוך של ילד.</p>
            
            <div class="divider"></div>
            
            <div class="section-title" style="text-align: right; direction: rtl; unicode-bidi: embed;">פרטי המשתמש החדש:</div>
            
            <div class="field">
                <span class="field-label">שם מלא:</span>
                <span class="field-value">{user_full_name}</span>
            </div>
            <div class="field">
                <span class="field-label">דואר אלקטרוני:</span>
                <span class="field-value">{user_email_display}</span>
            </div>
            <div class="field">
                <span class="field-label">תעודת זהות:</span>
                <span class="field-value">{user_id}</span>
            </div>
            <div class="field">
                <span class="field-label">גיל:</span>
                <span class="field-value">{user_age}</span>
            </div>
            <div class="field">
                <span class="field-label">מין:</span>
                <span class="field-value">{user_gender}</span>
            </div>
            <div class="field">
                <span class="field-label">טלפון:</span>
                <span class="field-value">{user_phone}</span>
            </div>
            <div class="field">
                <span class="field-label">עיר מגורים:</span>
                <span class="field-value">{user_city}</span>
            </div>
            <div class="field">
                <span class="field-label">מעוניין להיות חונך:</span>
                <span class="field-value">{user_wants_tutor}</span>
            </div>
            <div class="field">
                <span class="field-label">תאריך הרשמה:</span>
                <span class="field-value">{created_at}</span>
            </div>
            
            <div class="divider"></div>
            
            <p style="text-align: right; font-weight: bold; color: #333; direction: rtl; unicode-bidi: embed;">אנא בדוק את פרטי המשתמש במערכת וקבע הערות/תנאים אם יש צורך.</p>
            <p style="text-align: right; font-weight: bold; color: #333; direction: rtl; unicode-bidi: embed;">לאחר מכן אשר או דחה את ההרשמה כנדרש.</p>
        </div>
        <div class="footer">
            <p style="text-align: center; margin: 0; direction: rtl; unicode-bidi: embed;">בברכה,</p>
            <p style="text-align: center; margin: 0; direction: rtl; unicode-bidi: embed;">צוות חיוך של ילד</p>
        </div>
    </div>
</body>
</html>"""

                    send_mail(
                        subject,
                        message,
                        settings.DEFAULT_FROM_EMAIL,
                        [staff_member.email],
                        fail_silently=True,
                        html_message=message
                    )
                api_logger.info(f"Registration approval notification sent to {len(approval_staff)} Volunteer Coordinators for user {user_email}")
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
    - Child demographics (name, ID, age, gender, city, phone)
    - Medical information (diagnosis, hospital)
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
        child_diagnosis = child.medical_diagnosis if child.medical_diagnosis else "לא ידוע"
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
    <style>
        * {{ direction: rtl; unicode-bidi: embed; }}
        body {{ direction: rtl; text-align: right; font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; }}
        .header {{ background-color: #2196F3; color: white; padding: 20px; border-radius: 5px 5px 0 0; text-align: center; display: flex; align-items: center; justify-content: center; gap: 15px; }}
        .header h2 {{ margin: 0; font-size: 20px; }}
        .content {{ background-color: white; padding: 20px; border: 1px solid #ddd; direction: rtl; }}
        .section-title {{ font-weight: bold; margin-top: 20px; margin-bottom: 10px; border-bottom: 2px solid #2196F3; padding-bottom: 5px; text-align: right; direction: rtl; }}
        .field {{ margin: 8px 0; direction: rtl; text-align: right; display: flex; justify-content: flex-end; align-items: center; flex-direction: row-reverse; }}
        .field-label {{ font-weight: bold; color: #333; margin-left: 10px; }}
        .field-value {{ color: #555; }}
        .footer {{ background-color: #f0f0f0; padding: 15px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 5px 5px; direction: rtl; }}
        .divider {{ border-top: 1px solid #2196F3; margin: 15px 0; }}
        p {{ margin: 10px 0; text-align: right; direction: rtl; unicode-bidi: embed; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div>
                <h2>משפחה חדשה ממתינה לחונך</h2>
            </div>
        </div>
        <div class="content">
            <p style="text-align: right; direction: rtl; unicode-bidi: embed;">שלום {coordinator_name},</p>
            
            <p style="text-align: right; direction: rtl; unicode-bidi: embed;">משפחה חדשה נוספה למערכת והם ממתינים לחונך מתאים.</p>
            
            <div class="divider"></div>
            
            <div class="section-title" style="text-align: right; direction: rtl; unicode-bidi: embed;">פרטי הילד:</div>
            
            <div class="field">
                <span class="field-label">שם מלא:</span>
                <span class="field-value">{child_full_name}</span>
            </div>
            <div class="field">
                <span class="field-label">תעודת זהות:</span>
                <span class="field-value">{child_id}</span>
            </div>
            <div class="field">
                <span class="field-label">גיל:</span>
                <span class="field-value">{child_age} שנים</span>
            </div>
            <div class="field">
                <span class="field-label">מין:</span>
                <span class="field-value">{child_gender}</span>
            </div>
            <div class="field">
                <span class="field-label">עיר מגורים:</span>
                <span class="field-value">{child_city}</span>
            </div>
            <div class="field">
                <span class="field-label">טלפון הורים:</span>
                <span class="field-value">{parent_phone}</span>
            </div>
            
            <div class="divider"></div>
            
            <div class="section-title" style="text-align: right; direction: rtl; unicode-bidi: embed;">מידע רפואי:</div>
            
            <div class="field">
                <span class="field-label">אבחנה:</span>
                <span class="field-value">{child_diagnosis}</span>
            </div>
            <div class="field">
                <span class="field-label">בית חולים/מוסד:</span>
                <span class="field-value">{child_hospital}</span>
            </div>
            
            <div class="divider"></div>
            
            <div class="section-title" style="text-align: right; direction: rtl; unicode-bidi: embed;">פרטי החונכות:</div>
            
            <div class="field">
                <span class="field-label">סטטוס חונכות:</span>
                <span class="field-value">{tutoring_status_display}</span>
            </div>
            <div class="field">
                <span class="field-label">תאריך הוספה:</span>
                <span class="field-value">{registration_date}</span>
            </div>
            
            <div class="divider"></div>
            
            <p style="text-align: right; font-weight: bold; color: #333; direction: rtl; unicode-bidi: embed;">אנא בדוק את פרטי המשפחה וצור קשר עם חונך מתאים.</p>
        </div>
        <div class="footer">
            <p style="text-align: center; margin: 0; direction: rtl; unicode-bidi: embed;">בברכה,</p>
            <p style="text-align: center; margin: 0; direction: rtl; unicode-bidi: embed;">צוות חיוך של ילד</p>
        </div>
    </div>
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
        
        api_logger.info(f"Family notification email sent to {coordinators.count()} Tutored Families Coordinators for child {child_id}")
        
    except Exception as e:
        api_logger.error(f"ERROR: An error occurred while notifying tutored families coordinators: {str(e)}")
