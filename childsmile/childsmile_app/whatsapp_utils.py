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
            # All values MUST be strings — Twilio rejects integers/None (error 21656)
            safe_variables = {k: str(v) if v is not None else "" for k, v in (template_variables or {}).items()}
            variables_json = json.dumps(safe_variables)
            api_logger.debug(f"📤 WhatsApp template payload — SID={template_sid} vars={variables_json} to={clean_phone}")
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
            api_logger.debug(f"WhatsApp message sent successfully to {clean_phone} (SID: {data.get('sid')})")
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
    
    api_logger.debug(f"WhatsApp bulk send completed: {results['successful']}/{results['total']} successful")
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
    # user_gender is already a Hebrew string ("נקבה"/"זכר") — pass through as-is
    user_wants_tutor_str = "כן" if user_wants_tutor else "לא"
    user_gender_str = user_gender  # already formatted by caller
    
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
        # Using Twilio content template with 9 variables
        template_variables = {
            "1": coordinator_name,
            "2": child_name,
            "3": str(child_age),
            "4": child_gender,
            "5": child_city,
            "6": parent_phone,
            "7": child_hospital,
            "8": tutoring_status,
            "9": registration_date
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


def send_family_left_tutorship_whatsapp(coordinator_phone, coordinator_name, child_name, child_age, child_gender, parent_phone, child_city, child_hospital, tutoring_status, registration_date):
    """
    Send a WhatsApp notification to a Tutored Families Coordinator when a family
    has left the tutorship queue (status changed away from one requiring a tutor).
    Uses Twilio content template (NEW_FAMILY_LEFT_TUT_SID) with 9 variables.

    Template variables:
    1. Coordinator name
    2. Child full name
    3. Age (years)
    4. Gender
    5. City
    6. Parent phone
    7. Hospital
    8. New tutoring status
    9. Registration date

    Args:
        coordinator_phone (str): Coordinator's phone number
        coordinator_name (str): Coordinator's full name
        child_name (str): Child's full name
        child_age (int/str): Child's age
        child_gender (str): Child's gender (Hebrew)
        parent_phone (str): Parent contact phone
        child_city (str): City where child lives
        child_hospital (str): Treating hospital/institution
        tutoring_status (str): New tutoring status (Hebrew display)
        registration_date (str): Date family was registered

    Returns:
        dict: Response from send_whatsapp_message
    """
    left_template_sid = os.getenv('NEW_FAMILY_LEFT_TUT_SID')

    if left_template_sid:
        template_variables = {
            "1": coordinator_name,
            "2": child_name,
            "3": str(child_age),
            "4": child_gender,
            "5": child_city,
            "6": parent_phone,
            "7": child_hospital,
            "8": tutoring_status,
            "9": registration_date
        }
        return send_whatsapp_message(
            coordinator_phone,
            message_body=None,
            use_template=True,
            template_sid=left_template_sid,
            template_variables=template_variables
        )
    else:
        # Fallback plain text
        message = f"""משפחה עזבה את החונכות

שלום {coordinator_name},

משפחה עזבה את החונכות והם לא ממתינים יותר לחונך.

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

לידיעתך"""
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
    api_logger.debug(f"🔵 send_coordinator_notification_whatsapp_family_with_age_unit CALLED")
    api_logger.debug(f"   phone={coordinator_phone}, name={coordinator_name}, child={child_name}")
    
    # Get template SID from env var (NEW_FAMILY_ADMIN_SID)
    family_template_sid = os.getenv('NEW_FAMILY_ADMIN_SID')
    api_logger.debug(f"🔵 Template SID from env: {family_template_sid}")
    
    # Create combined age display string: "7 שנים" or "5 חודשים"
    age_display = f"{str(age_number)} {age_unit}"
    api_logger.debug(f"🔵 Age display: {age_display}")

    if family_template_sid:
        api_logger.debug(f"🔵 Using Twilio template SID: {family_template_sid}")
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
        api_logger.debug(f"🔵 Template variables: {template_variables}")
        result = send_whatsapp_message(
            coordinator_phone,
            message_body=None,
            use_template=True,
            template_sid=family_template_sid,
            template_variables=template_variables
        )
        api_logger.debug(f"🔵 send_whatsapp_message returned: {result}")
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


# ============================================================================
# MEETING REMINDER WHATSAPP
# ============================================================================

# Twilio content template SIDs for meeting reminders.
# Set these env vars once your templates are approved by Meta in Twilio console.
# If env var is not set, falls back to plain freeform text (sandbox only).
import os

# Scheduler-based reminders (7 days, 2 days, same day before meeting)
MEETING_TEMPLATE_SID_WEEK       = os.getenv('TWILIO_MEETING_TEMPLATE_WEEK')
MEETING_TEMPLATE_SID_TWO_DAYS   = os.getenv('TWILIO_MEETING_TEMPLATE_TWO_DAYS')
MEETING_TEMPLATE_SID_SAME_DAY   = os.getenv('TWILIO_MEETING_TEMPLATE_SAME_DAY')

# Instant event notifications (on create, update, cancel)
MEETING_TEMPLATE_SID_CREATED    = os.getenv('TWILIO_MEETING_TEMPLATE_CREATED')
MEETING_TEMPLATE_SID_UPDATED    = os.getenv('TWILIO_MEETING_TEMPLATE_UPDATED')
MEETING_TEMPLATE_SID_CANCELLED  = os.getenv('TWILIO_MEETING_TEMPLATE_CANCELLED')


def send_meeting_reminder_whatsapp(phones, reminder_type, meeting_title, date_str, location, urgency):
    """
    Send a meeting reminder WhatsApp message to a list of phones.

    Uses an approved Twilio content template when the matching env var is set.
    Falls back to plain freeform text (works only in Twilio sandbox) when not set.

    Template variables:
        {{1}} = date_str      (e.g. "יום שני 05/05/2026 בשעה 10:00")
        {{2}} = location      (e.g. "חדר ישיבות 2")
        {{3}} = meeting_title (e.g. "פגישת צוות חודשית")

    Args:
        phones (list):         Phone numbers of invitees.
        reminder_type (str):   'week_before' | 'two_days_before' | 'same_day'
        meeting_title (str):   Meeting title as entered in the UI.
        date_str (str):        Formatted date+time string.
        location (str):        Meeting location.
        urgency (str):         Optional closing note (used only in freeform fallback).

    Returns:
        dict: {"total": N, "successful": N, "failed": N, "results": [...]}
    """
    if not phones:
        return {"total": 0, "successful": 0, "failed": 0, "results": []}

    template_sid_map = {
        'week_before':      MEETING_TEMPLATE_SID_WEEK,
        'two_days_before':  MEETING_TEMPLATE_SID_TWO_DAYS,
        'same_day':         MEETING_TEMPLATE_SID_SAME_DAY,
    }
    template_sid = template_sid_map.get(reminder_type)

    if template_sid:
        # For same_day template, {{1}} is time-only ("10:00") since template says "🗓 שעה: {{1}}"
        # For week/two_days templates, {{1}} is the full date+time string
        var1 = date_str
        if reminder_type == 'same_day':
            # Extract HH:MM from the end of date_str ("יום שני 30/04/2026 בשעה 10:00" → "10:00")
            try:
                var1 = date_str.split('בשעה')[-1].strip()
            except Exception:
                var1 = date_str  # fallback to full string if parsing fails

        return send_whatsapp_to_multiple(
            phones,
            message_body=None,
            use_template=True,
            template_sid=template_sid,
            template_variables={
                "1": var1,
                "2": location,
                "3": meeting_title,
            }
        )
    else:
        api_logger.warning(
            f"meeting_reminder_whatsapp: no template SID for '{reminder_type}' "
            f"(set TWILIO_MEETING_TEMPLATE_WEEK / _TWO_DAYS / _SAME_DAY). "
            f"Falling back to freeform text (sandbox only)."
        )
        freeform = (
            f"📅 *{meeting_title}*\n\n"
            f"🗓 {date_str}\n"
            f"📍 מיקום: {location}\n"
            f"{(urgency + chr(10)) if urgency else ''}"
            f"\nמערכת חיוך של ילד"
        )
        return send_whatsapp_to_multiple(phones, message_body=freeform)


def send_meeting_event_notification_whatsapp(phones, event_type, meeting_title, date_str, location, urgency):
    """
    Send an instant meeting event notification (create/update/cancel) via WhatsApp.
    
    Uses approved Twilio content templates when available.
    Falls back to plain freeform text (sandbox only) when templates not set.

    Template variables (same pattern as send_meeting_reminder_whatsapp):
        {{1}} = date_str      (e.g., "יום שני 05/05/2026 בשעה 10:00")
        {{2}} = location      (e.g., "חדר ישיבות 2")
        {{3}} = meeting_title (e.g., "פגישת צוות חודשית")

    Args:
        phones (list):         Phone numbers of recipients.
        event_type (str):      'created' | 'updated' | 'cancelled'
        meeting_title (str):   Meeting title.
        date_str (str):        Formatted date+time string.
        location (str):        Meeting location.
        urgency (str):         Optional closing message.

    Returns:
        dict: {"total": N, "successful": N, "failed": N, "results": [...]}
    """
    if not phones:
        return {"total": 0, "successful": 0, "failed": 0, "results": []}

    template_sid_map = {
        'created':   MEETING_TEMPLATE_SID_CREATED,
        'updated':   MEETING_TEMPLATE_SID_UPDATED,
        'cancelled': MEETING_TEMPLATE_SID_CANCELLED,
    }
    template_sid = template_sid_map.get(event_type)

    if template_sid:
        return send_whatsapp_to_multiple(
            phones,
            message_body=None,
            use_template=True,
            template_sid=template_sid,
            template_variables={
                "1": date_str,
                "2": location,
                "3": meeting_title,
            }
        )
    else:
        api_logger.warning(
            f"meeting_event_notification_whatsapp: no template SID for '{event_type}' "
            f"(set TWILIO_MEETING_TEMPLATE_CREATED / _UPDATED / _CANCELLED). "
            f"Falling back to freeform text (sandbox only)."
        )
        # Create freeform message based on event type
        if event_type == 'created':
            header = "פגישה חדשה :"
        elif event_type == 'updated':
            header = "עדכון פגישה :"
        elif event_type == 'cancelled':
            header = "ביטול פגישה :"
        else:
            header = "עדכון פגישה :"

        freeform = (
            f"{header} {meeting_title}\n\n"
            f"🗓 {date_str} מועד הפגישה:\n"
            f"📍 מיקום: {location}\n"
            f"\nמערכת חיוך של ילד"
        )
        return send_whatsapp_to_multiple(phones, message_body=freeform)


def send_admin_approval_task_notification_whatsapp(liam_phone, user_name, user_phone, created_at):
    """
    Send a WhatsApp notification to Liam (System Admin) about a new admin approval task.
    Uses Twilio content template (NEW_REGISTER_FINAL_SID) with user information.
    
    Template variables:
    1. User name
    2. User phone
    3. Registration date
    
    Args:
        liam_phone (str): Liam's phone number (any format, auto-formatted)
        user_name (str): Full name of the user who needs admin approval
        user_email (str): Email of the user who needs admin approval (used for logging only)
        user_phone (str): Phone of the user
        created_at (str): Registration date/time
    
    Returns:
        dict: Response from send_whatsapp_message with success/error status
    """
    # Get template SID from GitHub Secrets (NEW_REGISTER_FINAL_SID)
    admin_template_sid = os.getenv('NEW_REGISTER_FINAL_SID')
    
    if admin_template_sid:
        # Using Twilio content template with 3 variables
        template_variables = {
            "1": user_name,
            "2": user_phone,
            "3": created_at
        }
        return send_whatsapp_message(
            liam_phone,
            message_body=None,
            use_template=True,
            template_sid=admin_template_sid,
            template_variables=template_variables
        )
    else:
        # Fallback to plain text if template SID not configured
        message = f"""משימה חדשה: אישור הרשמה סופי

שלום ליאם,

קיים משתמש חדש הממתין לאישורך הסופי:
פרטי המשתמש:
👤 שם מלא: {user_name}
📱 טלפון: {user_phone}
🕐 תאריך הרשמה: {created_at}

אנא בדוק שהמתנדב הצטרף לקבוצת הווטספ הכללית
ולאחר מכן אשר או דחה את ההרשמה כנדרש."""
        
        return send_whatsapp_message(
            liam_phone,
            message_body=message,
            use_template=False
        )


# ============================================================================
# EXPENSE REFUND WHATSAPP NOTIFICATIONS
# ============================================================================

def send_refund_new_request_to_admin_whatsapp(admin_phone, volunteer_full_name, requested_amount):
    """
    Notify admin (Liam) about a new expense refund request.

    Called from refund_views.py → create_refund() after the record is saved.

    Template: refund_new_request_admin (REFUND_NEW_REQUEST_SID)
    Variables:
    1. Volunteer full name
    2. Requested amount (₪)

    Args:
        admin_phone (str): Admin's (Liam's) phone number
        volunteer_full_name (str): Full name of the volunteer who submitted
        requested_amount (str|Decimal): Requested reimbursement amount in ₪

    Returns:
        dict: send_whatsapp_message result
    """
    template_sid = os.getenv('REFUND_NEW_REQUEST_SID')

    if not template_sid:
        api_logger.warning("REFUND_NEW_REQUEST_SID not configured — skipping WhatsApp notify for new refund")
        return {"success": False, "error": "REFUND_NEW_REQUEST_SID not configured"}

    template_variables = {
        "1": str(volunteer_full_name),
        "2": str(requested_amount),
    }
    api_logger.info(f"Sending new refund request WhatsApp to admin: {admin_phone}")
    return send_whatsapp_message(
        admin_phone,
        message_body=None,
        use_template=True,
        template_sid=template_sid,
        template_variables=template_variables
    )


def send_refund_status_update_to_volunteer_whatsapp(volunteer_phone, volunteer_full_name, new_status,
                                                     approved_amount=None, admin_comment=None):
    """
    Notify a volunteer that the status of their refund request was updated.

    Called from refund_views.py → update_refund() whenever `status` changes.
    Single util handles ALL status transitions (approved / partially_approved / paid / cancelled).

    Template: refund_status_update_volunteer (REFUND_STATUS_UPDATE_SID)
    Variables:
    1. Volunteer full name
    2. Status (female conjugation, e.g. "אושרה ✅")
    3. Details block (approved amount + admin comment, or "—")

    Args:
        volunteer_phone (str): Volunteer's phone number
        volunteer_full_name (str): Volunteer's full name
        new_status (str): New Hebrew status string (e.g. 'אושר', 'שולם', 'בוטל/נדחה')
        approved_amount (str|Decimal|None): Approved amount if partially approved or paid
        admin_comment (str|None): Admin's comment / rejection reason

    Returns:
        dict: send_whatsapp_message result
    """
    template_sid = os.getenv('REFUND_STATUS_UPDATE_SID')

    if not template_sid:
        api_logger.warning("REFUND_STATUS_UPDATE_SID not configured — skipping WhatsApp notify for refund status update")
        return {"success": False, "error": "REFUND_STATUS_UPDATE_SID not configured"}

    status_female_map = {
        'ממתין':       'ממתינה לטיפול',
        'אושר':        'אושרה ✅',
        'אושר חלקית': 'אושרה חלקית ✅',
        'שולם':        'שולמה 💸',
        'בוטל/נדחה':  'נדחתה ❌',
    }
    status_female = status_female_map.get(new_status, new_status)

    details_parts = []
    if approved_amount is not None:
        details_parts.append(f"סכום מאושר: {approved_amount} ₪")
    if admin_comment:
        details_parts.append(f"הערת המנהל: {admin_comment}")
    details = " | ".join(details_parts) if details_parts else "—"

    template_variables = {
        "1": str(volunteer_full_name),
        "2": str(status_female),
        "3": details,
    }
    api_logger.info(f"Sending refund status update WhatsApp to volunteer: {volunteer_phone}")
    return send_whatsapp_message(
        volunteer_phone,
        message_body=None,
        use_template=True,
        template_sid=template_sid,
        template_variables=template_variables
    )


# ============================================================================
# REFUND PAYMENT NOTIFICATION — notify אורי פלזנר to process payment
# ============================================================================

def send_refund_payment_required_whatsapp(uri_phone, volunteer_full_name, approved_amount,
                                           payment_phone, refund_method, approved_by, status):
    """
    Notify אורי פלזנר that a refund was approved and payment needs to be processed.

    Triggered when a refund status changes to 'אושר' or 'אושר חלקית'.
    Called from refund_views.py → update_refund() alongside the volunteer notification.

    Template: refund_payment_required (REFUND_PAYMENT_REQUIRED_SID)
    Variables:
        1. volunteer_full_name  — name of the person to pay
        2. approved_amount      — amount to pay (₪)
        3. payment_details      — phone number (for ביט/פייבוקס) or "העברה בנקאית" with note
        4. refund_method        — payment method (ביט / פייבוקס / העברה בנקאית / etc.)
        5. approved_by          — coordinator who approved
        6. status_display       — 'אושרה' or 'אושרה חלקית' (mapped from raw status)

    Args:
        uri_phone (str): אורי פלזנר's phone number
        volunteer_full_name (str): Full name of the volunteer to be paid
        approved_amount (str|Decimal): Approved payment amount in ₪
        payment_phone (str|None): Volunteer's payment phone (ביט/פייבוקס), or None
        refund_method (str|None): Payment method chosen (e.g. 'ביט', 'פייבוקס', 'העברה בנקאית')
        approved_by (str|None): Name of the coordinator who approved the request
        status (str): New status — 'אושר' or 'אושר חלקית'

    Returns:
        dict: send_whatsapp_message result
    """
    template_sid = os.getenv('REFUND_PAYMENT_REQUIRED_SID')

    if not template_sid:
        api_logger.warning("REFUND_PAYMENT_REQUIRED_SID not configured — skipping WhatsApp notify for payment")
        return {"success": False, "error": "REFUND_PAYMENT_REQUIRED_SID not configured"}

    # In non-prod environments, redirect to שלמה בונצל instead of אורי פלזנר
    from django.conf import settings
    api_logger.info(f"send_refund_payment_required_whatsapp: IS_PROD={settings.IS_PROD}")
    if not settings.IS_PROD:
        try:
            from .models import Staff
            shlomo = Staff.objects.filter(email='shlezi0@gmail.com').first()
            if shlomo and shlomo.staff_phone:
                api_logger.info(f"Non-prod: redirecting Uri payment WhatsApp to שלמה בונצל ({shlomo.staff_phone})")
                uri_phone = shlomo.staff_phone
            else:
                api_logger.warning("Non-prod: שלמה בונצל (shlezi0@gmail.com) not found or has no phone — using original uri_phone")
        except Exception as e:
            api_logger.warning(f"Non-prod redirect lookup failed: {e} — using original uri_phone")

    # Build payment_details: phone for digital wallets, note for bank transfer
    if refund_method in ('ביט', 'פייבוקס') and payment_phone:
        payment_details = f"{payment_phone}"
    elif refund_method == 'העברה בנקאית':
        payment_details = f"העברה בנקאית — פנה ל-{volunteer_full_name} לפרטי חשבון"
    elif payment_phone:
        payment_details = f"{payment_phone}"
    else:
        payment_details = "פרטי תשלום לא זמינים — פנה למבקש"

    status_display_map = {
        'אושר':        'אושרה',
        'אושר חלקית': 'אושרה חלקית',
    }
    status_display = status_display_map.get(status, status)

    template_variables = {
        "1": str(volunteer_full_name),
        "2": str(approved_amount),
        "3": payment_details,
        "4": str(refund_method or "לא צוין"),
        "5": str(approved_by or "לא צוין"),
        "6": status_display,
    }
    api_logger.info(f"Sending refund payment required WhatsApp to Uri: {uri_phone}")
    return send_whatsapp_message(
        uri_phone,
        message_body=None,
        use_template=True,
        template_sid=template_sid,
        template_variables=template_variables
    )


# ============================================================================
# DEV TASK WHATSAPP NOTIFICATIONS
# ============================================================================

def _flatten_task_description(text):
    """
    Convert rich-text explanation to a plain comma-separated string for WhatsApp templates.
    Strips all markdown prefixes ([ ], [x], -, *, 1.) and joins non-empty lines with ", ".
    """
    import re
    lines = []
    for line in str(text).splitlines():
        line = line.strip()
        if not line:
            continue
        # Strip any checkbox/bullet/numbered list prefix
        line = re.sub(r'^\[x\]\s*', '', line, flags=re.IGNORECASE)
        line = re.sub(r'^\[ \]\s*', '', line)
        line = re.sub(r'^[-*]\s+', '', line)
        line = re.sub(r'^\d+\.\s+', '', line)
        line = line.strip()
        if line:
            lines.append(line)
    return ', '.join(lines)


def send_dev_task_assigned_whatsapp(assignee_phone, task_description):
    """
    Notify Shlomo that a new dev task has been assigned by Liam.
    Template: DEV_TASK_ASSIGNED_SID — variable {{1}} must be a single-line string.
    """
    template_sid = os.getenv('DEV_TASK_ASSIGNED_SID')

    if not template_sid:
        api_logger.warning("DEV_TASK_ASSIGNED_SID not configured — skipping WhatsApp notify for dev task assignment")
        return {"success": False, "error": "DEV_TASK_ASSIGNED_SID not configured"}

    return send_whatsapp_message(
        assignee_phone,
        message_body=None,
        use_template=True,
        template_sid=template_sid,
        template_variables={"1": _flatten_task_description(task_description)}
    )


def send_dev_task_completed_whatsapp(liam_phone, task_description):
    """
    Notify Liam that Shlomo completed a dev task.
    Template: DEV_TASK_COMPLETED_SID — variable {{1}} must be a single-line string.
    """
    template_sid = os.getenv('DEV_TASK_COMPLETED_SID')

    if not template_sid:
        api_logger.warning("DEV_TASK_COMPLETED_SID not configured — skipping WhatsApp notify for dev task completion")
        return {"success": False, "error": "DEV_TASK_COMPLETED_SID not configured"}

    return send_whatsapp_message(
        liam_phone,
        message_body=None,
        use_template=True,
        template_sid=template_sid,
        template_variables={"1": _flatten_task_description(task_description)}
    )


# ============================================================================
# SECURITY BREACH ALERT WHATSAPP NOTIFICATIONS
# ============================================================================

_BREACH_ALERT_COOLDOWN_SECONDS = 300  # 5 minutes — one alert per (IP, endpoint) window


def _is_expired_session(request):
    """
    Return True if the request carries a sessionid cookie but no valid session.
    This means a real (authenticated) user whose session just expired —
    NOT an outsider with no cookie at all.
    We don't alert on expired sessions — only on requests with no cookie
    (bots / scanners / actual unauthorised clients).
    """
    from django.conf import settings
    cookie_name = getattr(settings, 'SESSION_COOKIE_NAME', 'sessionid')
    return cookie_name in request.COOKIES


def send_security_breach_alert_whatsapp(endpoint, ip_address, timestamp=None):
    """
    Send a security breach alert WhatsApp to ALL System Administrators.

    Called whenever an UNAUTHORIZED_ACCESS_ATTEMPT is logged on a sensitive
    endpoint (/api/children/, /api/audit-logs/, /api/staff/, etc.).

    Rate-limited: one alert per (IP + endpoint) per 5 minutes so a hammering
    attacker cannot flood admins or exhaust server resources.

    Args:
        endpoint (str): The API endpoint that was accessed without auth.
        ip_address (str): The IP address of the requester.
        timestamp (str): Human-readable timestamp (defaults to now if None).

    Returns:
        dict: Bulk send summary {"total": N, "successful": N, "failed": N, ...}
              or None if suppressed by cooldown.
    """
    from django.core.cache import cache
    from django.utils import timezone
    from .models import Staff

    # --- cooldown check ---
    cache_key = f"breach_alert:{ip_address}:{endpoint}"
    if cache.get(cache_key):
        api_logger.debug(
            f"Security breach alert suppressed (cooldown active) "
            f"— ip={ip_address} endpoint={endpoint}"
        )
        return None
    cache.set(cache_key, True, timeout=_BREACH_ALERT_COOLDOWN_SECONDS)

    if timestamp is None:
        timestamp = timezone.now().strftime('%d/%m/%Y %H:%M:%S')

    # Check SID before hitting the DB — no point querying if we can't send
    template_sid = os.getenv('SECURITY_BREACH_ALERT_SID')
    if not template_sid:
        api_logger.error(
            f"SECURITY_BREACH_ALERT_SID not configured — breach alert NOT sent "
            f"(endpoint={endpoint} ip={ip_address})"
        )
        return None

    # Fetch all active System Administrator phone numbers from the DB
    try:
        admins = Staff.objects.filter(
            roles__role_name='System Administrator',
            is_active=True
        ).exclude(staff_phone__isnull=True).exclude(staff_phone='').distinct()
        admin_phones = [a.staff_phone for a in admins]
    except Exception as e:
        api_logger.error(f"Security alert: failed to fetch admin phones: {e}")
        admin_phones = []

    if not admin_phones:
        api_logger.error(
            f"Security alert: no admin phones found — "
            f"breach attempt on {endpoint} from {ip_address} at {timestamp}"
        )
        return {"total": 0, "successful": 0, "failed": 0, "results": []}

    api_logger.warning(
        f"🚨 Sending security breach alert to {len(admin_phones)} admin(s) "
        f"— endpoint={endpoint} ip={ip_address}"
    )
    # Template uses named variables {{endpoint}}, {{timestamp}}, {{ip_address}}
    # ContentVariables keys must match the variable names exactly
    return send_whatsapp_to_multiple(
        admin_phones,
        use_template=True,
        template_sid=template_sid,
        template_variables={
            "endpoint": endpoint,
            "timestamp": timestamp,
            # \u202a…\u202c = LTR embedding — prevents BiDi reordering of
            # the IP address digits/dots inside a Hebrew (RTL) WhatsApp bubble
            "ip_address": f"\u202a{ip_address}\u202c",
        }
    )
