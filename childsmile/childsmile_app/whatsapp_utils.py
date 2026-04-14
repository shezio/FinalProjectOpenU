"""
WhatsApp notification utilities - sends WhatsApp messages via Twilio API.
Provides generic functions for sending WhatsApp messages to single or multiple recipients.
"""

import os
import json
import requests
from .logger import api_logger


# ============================================================================
# GENERIC WHATSAPP UTILITIES
# ============================================================================

def send_whatsapp_message(recipient_phone, message_body, use_template=False, template_sid=None, template_variables=None):
    """
    Send a WhatsApp message to a single recipient via Twilio API.
    
    Args:
        recipient_phone (str): Recipient phone number (auto-formatted to whatsapp:+972...)
        message_body (str): Message text body (ignored if using template)
        use_template (bool): Whether to use a Twilio content template
        template_sid (str): Twilio content template SID (required if use_template=True)
        template_variables (dict): Variables to substitute in template (e.g., {"1": "name", "2": "status"})
    
    Returns:
        dict: Response with status and message SID, or error details
        Example: {"success": True, "message_sid": "SMxxx", "phone": "whatsapp:+972542652949"}
        Example: {"success": False, "error": "Invalid credentials", "phone": "whatsapp:+972542652949"}
    """
    try:
        # All WhatsApp credentials come from GitHub Secrets
        # These are NOT set in Azure - only stored in GitHub Secrets
        account_sid = os.getenv('TWILIO_ACCOUNT_SID')
        auth_token = os.getenv('TWILIO_AUTH_TOKEN')
        twilio_from = os.getenv('TWILIO_WHATSAPP_FROM')
        
        # Validate credentials
        if not all([account_sid, auth_token, twilio_from]):
            error_msg = "Missing Twilio credentials (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_WHATSAPP_FROM)"
            api_logger.error(f"WhatsApp Error: {error_msg}")
            return {"success": False, "error": error_msg, "phone": recipient_phone}
        
        # Clean and validate phone number (converts to whatsapp:+972... format)
        clean_phone = _clean_phone_number(recipient_phone)
        if not clean_phone:
            return {"success": False, "error": "Invalid phone number format", "phone": recipient_phone}
        
        url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json"
        
        # Build payload
        if use_template and template_sid:
            # Using Twilio content template
            variables_json = json.dumps(template_variables or {})
            payload = {
                "From": twilio_from,
                "To": clean_phone,
                "ContentSid": template_sid,
                "ContentVariables": variables_json
            }
        else:
            # Sending plain text message
            payload = {
                "From": twilio_from,
                "To": clean_phone,
                "Body": message_body
            }
        
        # Send request
        response = requests.post(url, data=payload, auth=(account_sid, auth_token), timeout=10)
        
        if response.status_code == 201:
            data = response.json()
            api_logger.info(f"WhatsApp message sent successfully to {clean_phone} (SID: {data.get('sid')})")
            return {
                "success": True,
                "message_sid": data.get('sid'),
                "phone": clean_phone,
                "status": data.get('status')
            }
        else:
            error_text = response.text
            api_logger.error(f"WhatsApp API error for {clean_phone}: {response.status_code} - {error_text}")
            return {
                "success": False,
                "error": f"Twilio API error {response.status_code}",
                "phone": clean_phone,
                "details": error_text
            }
    
    except requests.exceptions.Timeout:
        error_msg = "Twilio API request timeout"
        api_logger.error(f"WhatsApp Error for {recipient_phone}: {error_msg}")
        return {"success": False, "error": error_msg, "phone": recipient_phone}
    except requests.exceptions.RequestException as e:
        error_msg = f"Request error: {str(e)}"
        api_logger.error(f"WhatsApp Error for {recipient_phone}: {error_msg}")
        return {"success": False, "error": error_msg, "phone": recipient_phone}
    except Exception as e:
        error_msg = f"Unexpected error: {str(e)}"
        api_logger.error(f"WhatsApp Error for {recipient_phone}: {error_msg}")
        return {"success": False, "error": error_msg, "phone": recipient_phone}


def send_whatsapp_to_multiple(recipient_phones, message_body=None, use_template=False, template_sid=None, template_variables=None):
    """
    Send WhatsApp messages to multiple recipients.
    
    Args:
        recipient_phones (list): List of phone numbers (any format, auto-formatted)
        message_body (str): Message text body (for non-template messages)
        use_template (bool): Whether to use a Twilio content template
        template_sid (str): Twilio content template SID
        template_variables (dict): Variables for template
    
    Returns:
        dict: Summary of results
        Example: {
            "total": 3,
            "successful": 2,
            "failed": 1,
            "results": [
                {"success": True, "message_sid": "SMxxx", "phone": "whatsapp:+972542652949"},
                {"success": False, "error": "Invalid number", "phone": "invalid"}
            ]
        }
    """
    results = {
        "total": len(recipient_phones),
        "successful": 0,
        "failed": 0,
        "results": []
    }
    
    for phone in recipient_phones:
        result = send_whatsapp_message(
            phone,
            message_body,
            use_template=use_template,
            template_sid=template_sid,
            template_variables=template_variables
        )
        results["results"].append(result)
        
        if result.get("success"):
            results["successful"] += 1
        else:
            results["failed"] += 1
    
    api_logger.info(f"WhatsApp bulk send completed: {results['successful']}/{results['total']} successful")
    return results


def _clean_phone_number(phone):
    """
    Clean and validate phone number for Twilio WhatsApp.
    Converts formats like "054-2652949" to "whatsapp:+972542652949"
    
    Args:
        phone (str): Phone number in any format (e.g., "054-2652949", "0542652949", "972542652949")
    
    Returns:
        str: WhatsApp formatted phone or None if invalid (e.g., "whatsapp:+972542652949")
    """
    try:
        # Remove all non-alphanumeric characters except +
        clean = "".join(c for c in str(phone).strip() if c.isalnum() or c == '+')
        
        # Remove BiDi control characters (Hebrew)
        bidi_chars = [8206, 8207, 8234, 8235, 8236, 8237, 8238, 8239, 8294, 8295, 8296, 8297]
        clean = "".join(c for c in clean if ord(c) not in bidi_chars)
        
        # Handle Israeli numbers: convert 0xxx to 972x (remove leading 0, add 972)
        if clean.startswith('0'):
            # Israeli format like "054" -> "972 54"
            clean = '972' + clean[1:]
        elif not clean.startswith('972') and not clean.startswith('+'):
            # If it doesn't start with 972 or +, assume it's missing the country code
            if len(clean) >= 10:
                clean = '972' + clean
            else:
                return None
        
        # Remove + prefix if present (we'll add it back with whatsapp: prefix)
        if clean.startswith('+'):
            clean = clean[1:]
        
        # Ensure it starts with 972
        if not clean.startswith('972'):
            return None
        
        # Basic validation: should have at least 10 digits total (972 + 7 digits minimum)
        digits_only = ''.join(c for c in clean if c.isdigit())
        if len(digits_only) < 10:
            return None
        
        # Format as WhatsApp: whatsapp:+972...
        return f"whatsapp:+{clean}"
    except Exception as e:
        api_logger.error(f"Error cleaning phone number {phone}: {str(e)}")
        return None


# ============================================================================
# CONVENIENCE FUNCTIONS FOR SPECIFIC MESSAGES
# ============================================================================

def send_coordinator_notification_whatsapp(coordinator_phone, coordinator_name, user_name, user_email, user_age, user_gender, user_phone, user_city, user_wants_tutor, created_at):
    """
    Send a detailed WhatsApp notification to a volunteer coordinator about a new registration.
    Uses Twilio content template with user information - same as the email.
    
    Args:
        coordinator_phone (str): Coordinator's phone number (any format, e.g., "054-2652949")
        coordinator_name (str): Coordinator's full name
        user_name (str): New user's full name
        user_email (str): New user's email
        user_age (str): New user's age
        user_gender (str): New user's gender (M/F or Hebrew)
        user_phone (str): New user's phone number
        user_city (str): New user's city
        user_wants_tutor (bool): Whether user wants to be a tutor
        created_at (str): Registration date/time
    
    Returns:
        dict: Response from send_whatsapp_message
    """
    # Format user information for WhatsApp template
    user_wants_tutor_str = "כן" if user_wants_tutor else "לא"
    user_gender_str = "נקבה" if user_gender else "זכר"
    
    # Get template SID from GitHub Secrets (NEW_REGISTER_SID)
    coordinator_template_sid = os.getenv('NEW_REGISTER_SID')
    
    if coordinator_template_sid:
        # Using Twilio content template with 9 variables (ID removed for privacy)
        template_variables = {
            "1": coordinator_name,
            "2": user_name,
            "3": user_email,
            "4": user_age,
            "5": user_gender_str,
            "6": user_phone,
            "7": user_city,
            "8": user_wants_tutor_str,
            "9": created_at
        }
        return send_whatsapp_message(
            coordinator_phone,
            message_body=None,
            use_template=True,
            template_sid=coordinator_template_sid,
            template_variables=template_variables
        )
    else:
        # Fallback to plain text if template SID not configured
        message = f"""משימה חדשה: אישור הרשמה ראשוני

שלום {coordinator_name},

קיים משתמש חדש הממתין לאישורך:

📋 פרטי המשתמש:
👤 שם מלא: {user_name}
📧 דואר אלקטרוני: {user_email}
📅 גיל: {user_age}
👥 מין: {user_gender_str}
📱 טלפון: {user_phone}
📍 עיר מגורים: {user_city}
🎓 מעוניין להיות חונך: {user_wants_tutor_str}
🕐 תאריך הרשמה: {created_at}

אנא בדוק את פרטי המשתמש במערכת וקבע הערות/תנאים אם יש צורך.
לאחר מכן אשר או דחה את ההרשמה כנדרש."""
        
        return send_whatsapp_message(
            coordinator_phone,
            message_body=message,
            use_template=False
        )


def send_coordinator_notification_whatsapp_family(coordinator_phone, coordinator_name, child_name, child_age, child_gender, parent_phone, child_city, child_hospital, tutoring_status, registration_date):
    """
    Send a WhatsApp notification to a Tutored Families Coordinator about a new family needing a tutor.
    Uses Twilio content template with all family information.
    
    Args:
        coordinator_phone (str): Coordinator's phone number
        coordinator_name (str): Coordinator's full name
        child_name (str): Child's full name
        child_age (int): Child's age
        child_gender (str): Child's gender (Hebrew: "נקבה" or "זכר")
        parent_phone (str): Parent contact phone
        child_city (str): City where child lives
        child_hospital (str): Treating hospital/institution
        tutoring_status (str): Tutoring status
        registration_date (str): Date family was registered
    
    Returns:
        dict: Response from send_whatsapp_message
    """
    # Get template SID from environment variable (NEW_FAMILY_SID)
    family_template_sid = os.getenv('NEW_FAMILY_SID')
    
    if family_template_sid:
        # Using Twilio content template with 12 variables
        template_variables = {
            "1": coordinator_name,
            "2": child_name,
            "3": str(child_age),
            "4": child_gender,
            "5": parent_phone,
            "6": child_city,
            "7": child_hospital,
            "8": tutoring_status,
            "9": registration_date,
            "11": "משפחה חדשה ממתינה לחונך"  # Message type header
        }
        return send_whatsapp_message(
            coordinator_phone,
            message_body=None,
            use_template=True,
            template_sid=family_template_sid,
            template_variables=template_variables
        )
    else:
        # Fallback to plain text if template SID not configured
        message = f"""משפחה חדשה ממתינה לחונך

שלום {coordinator_name},

משפחה חדשה נוספה למערכת והם ממתינים לחונך מתאים.

👶 פרטי הילד:
👤 שם מלא: {child_name}
📅 גיל: {child_age} שנים
👥 מין: {child_gender}
📍 עיר: {child_city}
📱 טלפון הורים: {parent_phone}
🏢 בית חולים: {child_hospital}

🎓 פרטי החונכות:
📌 סטטוס: {tutoring_status}
📆 תאריך הרשמה: {registration_date}

אנא בדוק את פרטי המשפחה וצור קשר עם חונך מתאים."""
        
        return send_whatsapp_message(
            coordinator_phone,
            message_body=message,
            use_template=False
        )


def send_totp_login_code_whatsapp(staff_phone, totp_code):
    """
    Send TOTP login code to staff member via WhatsApp.
    Uses Twilio Authentication template (TOTP_LOGIN_SID) with security features.
    
    Template: "logintotp" (HXd035723708b47d63f0d85276e26ccc25)
    Content Type: Authentication
    WhatsApp Category: Authentication
    Variables:
    1. Code value (6 digits) - Twilio will add security header automatically
    
    Args:
        staff_phone (str): Staff member's phone number (any format)
        totp_code (str): 6-digit TOTP code
    
    Returns:
        dict: Response from send_whatsapp_message with success/error status
        
    Note: Twilio Authentication templates include:
    - Automatic security header: "[#] Your verification code is: {code}"
    - Copy button: "לחץ להעתקת הקוד" (Copy Code button)
    - Footer: "Code Expiration Time: 5 minutes"
    - Security recommendation to not share code
    """
    # Get template SID from environment variable (logintotp Twilio template)
    totp_template_sid = os.getenv('TOTP_LOGIN_SID')
    
    if totp_template_sid:
        # Using Twilio Authentication template with code variable
        # Twilio will auto-format: "[#] Your verification code is: {1}"
        # Plus copy button and expiration footer
        template_variables = {
            "1": totp_code
        }
        return send_whatsapp_message(
            staff_phone,
            message_body=None,
            use_template=True,
            template_sid=totp_template_sid,
            template_variables=template_variables
        )
    else:
        # Fallback to plain text if template SID not configured (rare in production)
        message = f"""קוד האימות שלך: {totp_code}

לאבטחתך, אל תשתף קוד זה עם אף אחד.
הקוד יפוג בעוד 5 דקות."""
        
        return send_whatsapp_message(
            staff_phone,
            message_body=message,
            use_template=False
        )


def send_totp_registration_code_whatsapp(registrant_phone, totp_code):
    """
    Send TOTP code to new registrant via WhatsApp during initial registration.
    Uses same Twilio Authentication template as login TOTP (TOTP_LOGIN_SID).
    
    This sends the verification code that a new user receives when they first register.
    Template: "logintotp" (set via TOTP_LOGIN_SID environment variable)
    
    Args:
        registrant_phone (str): New registrant's phone number (any format)
        totp_code (str): 6-digit TOTP code for initial registration verification
    
    Returns:
        dict: Response from send_whatsapp_message with success/error status
        
    Note: Uses same Twilio Authentication template as login for consistency:
    - Automatic security header: "[#] Your verification code is: {code}"
    - Copy button: "לחץ להעתקת הקוד" (Copy Code button)
    - Footer: "Code Expiration Time: 5 minutes"
    """
    # Get template SID from environment variable (same as login TOTP)
    totp_template_sid = os.getenv('TOTP_LOGIN_SID')
    
    if totp_template_sid:
        # Using Twilio Authentication template with code variable
        template_variables = {
            "1": totp_code
        }
        return send_whatsapp_message(
            registrant_phone,
            message_body=None,
            use_template=True,
            template_sid=totp_template_sid,
            template_variables=template_variables
        )
    else:
        # Fallback to plain text if template SID not configured
        message = f"""קוד האימות שלך: {totp_code}

לאבטחתך, אל תשתף קוד זה עם אף אחד.
הקוד יפוג בעוד 5 דקות."""
        
        return send_whatsapp_message(
            registrant_phone,
            message_body=message,
            use_template=False
        )


def send_coordinator_notification_whatsapp_family_with_age_unit(coordinator_phone, coordinator_name, child_name, age_number, age_unit, child_gender, parent_phone, child_city, child_hospital, tutoring_status, registration_date):
    """
    Send a WhatsApp notification to a System Admin about a new family with age display string.
    Uses Twilio content template with 9 variables (age combined into single display string).
    
    Template variables:
    1. Coordinator name
    2. Child name
    3. Age display (e.g., "7 שנים" or "5 חודשים")
    4. Gender
    5. City
    6. Parent phone
    7. Hospital
    8. Tutoring status
    9. Registration date
    
    Args:
        coordinator_phone (str): Admin's phone number
        coordinator_name (str): Admin's full name
        child_name (str): Child's full name
        age_number (str): Age as number (e.g., "3" or "8")
        age_unit (str): Age unit in Hebrew (חודשים or שנים)
        child_gender (str): Child's gender (Hebrew: "נקבה" or "זכר")
        parent_phone (str): Parent contact phone
        child_city (str): City where child lives
        child_hospital (str): Treating hospital/institution
        tutoring_status (str): Tutoring status
        registration_date (str): Date family was registered
    
    Returns:
        dict: Response from send_whatsapp_message
    """
    api_logger.info(f"🔵 send_coordinator_notification_whatsapp_family_with_age_unit CALLED")
    api_logger.info(f"   phone={coordinator_phone}, name={coordinator_name}, child={child_name}")
    
    # Get template SID from env var (NEW_FAMILY_ADMIN_SID)
    family_template_sid = os.getenv('NEW_FAMILY_ADMIN_SID')
    api_logger.info(f"🔵 Template SID from env: {family_template_sid}")
    
    # Create combined age display string: "7 שנים" or "5 חודשים"
    age_display = f"{str(age_number)} {age_unit}"
    api_logger.info(f"🔵 Age display: {age_display}")

    if family_template_sid:
        api_logger.info(f"🔵 Using Twilio template SID: {family_template_sid}")
        # Using Twilio content template with 9 variables (age combined in var 3)
        template_variables = {
            "1": coordinator_name,
            "2": child_name,
            "3": age_display,
            "4": child_gender,
            "5": child_city,
            "6": parent_phone,
            "7": child_hospital,
            "8": tutoring_status,
            "9": registration_date
        }
        api_logger.info(f"🔵 Template variables: {template_variables}")
        result = send_whatsapp_message(
            coordinator_phone,
            message_body=None,
            use_template=True,
            template_sid=family_template_sid,
            template_variables=template_variables
        )
        api_logger.info(f"🔵 send_whatsapp_message returned: {result}")
        return result
    else:
        api_logger.warning(f"❌ No template SID configured (NEW_FAMILY_ADMIN_SID env var not set)")
        message = f"""משפחה חדשה נוספה למערכת

שלום {coordinator_name},

משפחה חדשה נוספה למערכת.

👤 שם מלא: {child_name}
📅 גיל: {age_display}
👥 מין: {child_gender}
📍 עיר: {child_city}
📱 טלפון הורים: {parent_phone}
🏢 בית חולים: {child_hospital}

🎓 פרטי החונכות:
📌 סטטוס: {tutoring_status}
📆 תאריך הרשמה: {registration_date}"""
        
        return send_whatsapp_message(
            coordinator_phone,
            message_body=message,
            use_template=False
        )


# ============================================================================
# REGISTRATION APPROVAL NOTIFICATIONS
# ============================================================================

def send_registration_coordinator_approval_whatsapp(volunteer_phone, volunteer_name):
    """
    Send WhatsApp message when volunteer is approved by coordinator (Tier 1).
    Message includes WhatsApp group link for the volunteer community.
    
    Template: registration_coordinator_approval (TWILIO_REGISTRATION_COORDINATOR_APPROVAL_SID)
    Variables:
    1. Volunteer name
    
    Args:
        volunteer_phone (str): Volunteer's phone number (any format)
        volunteer_name (str): Volunteer's full name
    
    Returns:
        dict: Response from send_whatsapp_message with success/error status
    """
    coordinator_template_sid = os.getenv('TWILIO_REGISTRATION_COORDINATOR_APPROVAL_SID')
    
    if coordinator_template_sid:
        # Using Twilio content template with name variable
        template_variables = {
            "1": volunteer_name
        }
        return send_whatsapp_message(
            volunteer_phone,
            message_body=None,
            use_template=True,
            template_sid=coordinator_template_sid,
            template_variables=template_variables
        )
    else:
        # Fallback to plain text if template SID not configured
        message = f"""🎉 הרשמתך אושרה בשלב הראשון!

שלום {volunteer_name},

תודה על הרשמתך לחיוך של ילד ✨

הרשמתך עברה את השלב הראשוני בהצלחה! 

👥 השלב הבא - הצטרף לקבוצת הווטסאפ:
https://chat.whatsapp.com/B7UcLqApSTzCpppWR221DB

לאחר הצטרפות, צוות הניהול יבדוק את הפרטים ויסיים את האישור הסופי בקרוב ⏳

עם שאלות:
📱 +972 50-722-5027 (טל - רכזת מתנדבים)"""
        
        return send_whatsapp_message(
            volunteer_phone,
            message_body=message,
            use_template=False
        )


def send_registration_final_approval_whatsapp(volunteer_phone, volunteer_name):
    """
    Send WhatsApp message when volunteer gets final approval from admin (Tier 2).
    Message confirms full approval and system access.
    
    Template: registration_final_approval (TWILIO_REGISTRATION_FINAL_APPROVAL_SID)
    Variables:
    1. Volunteer name
    
    Args:
        volunteer_phone (str): Volunteer's phone number (any format)
        volunteer_name (str): Volunteer's full name
    
    Returns:
        dict: Response from send_whatsapp_message with success/error status
    """
    final_template_sid = os.getenv('TWILIO_REGISTRATION_FINAL_APPROVAL_SID')
    
    if final_template_sid:
        # Using Twilio content template with name variable
        template_variables = {
            "1": volunteer_name
        }
        return send_whatsapp_message(
            volunteer_phone,
            message_body=None,
            use_template=True,
            template_sid=final_template_sid,
            template_variables=template_variables
        )
    else:
        # Fallback to plain text if template SID not configured
        message = f"""✅ הרשמתך אושרה סופית!

שלום {volunteer_name},

ברכותינו! 🎉

הרשמתך בחיוך של ילד אושרה סופית!

עברת בהצלחה את כל שלבי התהליך ✨

🚀 תוכל להתחבר למערכת כעת

תודה שהצטרפת לקהילה שלנו! 
יחד אנחנו עושים הבדל בחיי הילדים 💚

עם שאלות:
📱 +972 50-722-5027 (טל - רכזת מתנדבים)"""
        
        return send_whatsapp_message(
            volunteer_phone,
            message_body=message,
            use_template=False
        )


def send_registration_rejection_whatsapp(volunteer_phone, volunteer_name):
    """
    Send WhatsApp message when volunteer's registration is rejected.
    Message informs them their application was rejected.
    
    Template: registration_rejected (TWILIO_REGISTRATION_REJECTED_SID)
    Variables:
    1. Volunteer name
    
    Args:
        volunteer_phone (str): Volunteer's phone number (any format)
        volunteer_name (str): Volunteer's full name
    
    Returns:
        dict: Response from send_whatsapp_message with success/error status
    """
    rejection_template_sid = os.getenv('TWILIO_REGISTRATION_REJECTED_SID')
    
    if rejection_template_sid:
        # Using Twilio content template with name variable
        template_variables = {
            "1": volunteer_name
        }
        return send_whatsapp_message(
            volunteer_phone,
            message_body=None,
            use_template=True,
            template_sid=rejection_template_sid,
            template_variables=template_variables
        )
    else:
        # Fallback to plain text if template SID not configured
        message = f"""הודעה בנוגע להרשמתך

שלום {volunteer_name},

לצערנו, בקשת ההרשמה שלך בחיוך של ילד נדחתה.

אם יש לך שאלות, אנא צור קשר:
📱 +972 50-722-5027 (טל - רכזת מתנדבים)

תודה על הבנתך."""
        
        return send_whatsapp_message(
            volunteer_phone,
            message_body=message,
            use_template=False
        )


def send_account_activation_whatsapp(staff_phone, staff_name):
    """
    Send WhatsApp message when staff account is activated/reactivated.
    Message confirms they can now access the system.
    
    Template: account_activation (TWILIO_ACCOUNT_ACTIVATION_SID)
    Variables:
    1. Staff name
    
    Args:
        staff_phone (str): Staff member's phone number (any format)
        staff_name (str): Staff member's full name
    
    Returns:
        dict: Response from send_whatsapp_message with success/error status
    """
    activation_template_sid = os.getenv('TWILIO_ACCOUNT_ACTIVATION_SID')
    
    if activation_template_sid:
        # Using Twilio content template with name variable
        template_variables = {
            "1": staff_name
        }
        return send_whatsapp_message(
            staff_phone,
            message_body=None,
            use_template=True,
            template_sid=activation_template_sid,
            template_variables=template_variables
        )
    else:
        # Fallback to plain text if template SID not configured
        message = f"""✅ חשבונך הופעל

שלום {staff_name},

חשבונך בחיוך של ילד הופעל בהצלחה! 🎉

תוכל להתחבר למערכת כעת.

בברכה,
צוות חיוך של ילד"""
        
        return send_whatsapp_message(
            staff_phone,
            message_body=message,
            use_template=False
        )
