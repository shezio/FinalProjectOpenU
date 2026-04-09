#!/usr/bin/env python3
"""
Test script to send a sample coordinator notification email with dummy data.
Useful for debugging HTML structure and email formatting issues.
"""

import os
import django
from django.conf import settings

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'childsmile.settings')
django.setup()

from django.core.mail import send_mail
import datetime

# ============================================================================
# CONFIGURATION - CHANGE THESE TO TEST
# ============================================================================

# Email address to send the test to
TEST_EMAIL = "talan7225@gmail.com"  # CHANGE THIS!

# Dummy coordinator data
COORDINATOR_NAME = "בדיקה חשובה"
USER_FULL_NAME = "שם המתנדב"
USER_EMAIL = "test2.user@example.com"
USER_ID = "123456789"
USER_AGE = "28"
USER_GENDER = "זכר"  # or "נקבה"
USER_PHONE = "054-2652949"
USER_CITY = "תל אביב"
USER_WANTS_TUTOR = True
CREATED_AT = "09/04/2026 בשעה 14:30"

# ============================================================================
# COMPOSE EMAIL
# ============================================================================

subject = f"משימה חדשה: אישור הרשמה ראשוני - {USER_FULL_NAME}"

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
                            <p dir="rtl" style="text-align: right; margin: 15px 0;">שלום {COORDINATOR_NAME},</p>
                            
                            <p dir="rtl" style="text-align: right; margin: 15px 0;">קיים משתמש חדש הממתין לאישורך לרישום במערכת חיוך של ילד.</p>
                            
                            <hr style="border: none; border-top: 2px solid #4CAF50; margin: 20px 0;">
                            
                            <p dir="rtl" style="text-align: right; font-weight: bold; margin: 15px 0; padding-bottom: 10px; border-bottom: 3px solid #4CAF50; color: #333;">פרטי המשתמש החדש:</p>
                            
                            <!-- FIELDS TABLE -->
                            <table width="100%" cellpadding="0" cellspacing="0" dir="rtl">
                                <tr>
                                    <td style="margin: 12px 0; padding: 10px; background-color: #f5f5f5; border-radius: 4px; text-align: right; direction: rtl;">
                                        <span style="font-weight: bold; color: #333; display: inline-block; margin-left: 10px;">שם מלא:</span><span style="color: #666; direction: ltr; unicode-bidi: embed;">{USER_FULL_NAME}</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="margin: 12px 0; padding: 10px; background-color: #f5f5f5; border-radius: 4px; text-align: right; direction: rtl;">
                                        <span style="font-weight: bold; color: #333; display: inline-block; margin-left: 10px;">דואר אלקטרוני:</span><span style="color: #666; direction: ltr; unicode-bidi: embed;">{USER_EMAIL}</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="margin: 12px 0; padding: 10px; background-color: #f5f5f5; border-radius: 4px; text-align: right; direction: rtl;">
                                        <span style="font-weight: bold; color: #333; display: inline-block; margin-left: 10px;">תעודת זהות:</span><span style="color: #666; direction: ltr; unicode-bidi: embed;">{USER_ID}</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="margin: 12px 0; padding: 10px; background-color: #f5f5f5; border-radius: 4px; text-align: right; direction: rtl;">
                                        <span style="font-weight: bold; color: #333; display: inline-block; margin-left: 10px;">גיל:</span><span style="color: #666; direction: ltr; unicode-bidi: embed;">{USER_AGE}</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="margin: 12px 0; padding: 10px; background-color: #f5f5f5; border-radius: 4px; text-align: right; direction: rtl;">
                                        <span style="font-weight: bold; color: #333; display: inline-block; margin-left: 10px;">מין:</span><span style="color: #666; direction: ltr; unicode-bidi: embed;">{USER_GENDER}</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="margin: 12px 0; padding: 10px; background-color: #f5f5f5; border-radius: 4px; text-align: right; direction: rtl;">
                                        <span style="font-weight: bold; color: #333; display: inline-block; margin-left: 10px;">טלפון:</span><span style="color: #666; direction: ltr; unicode-bidi: embed;">{USER_PHONE}</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="margin: 12px 0; padding: 10px; background-color: #f5f5f5; border-radius: 4px; text-align: right; direction: rtl;">
                                        <span style="font-weight: bold; color: #333; display: inline-block; margin-left: 10px;">עיר מגורים:</span><span style="color: #666; direction: ltr; unicode-bidi: embed;">{USER_CITY}</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="margin: 12px 0; padding: 10px; background-color: #f5f5f5; border-radius: 4px; text-align: right; direction: rtl;">
                                        <span style="font-weight: bold; color: #333; display: inline-block; margin-left: 10px;">מעוניין להיות חונך:</span><span style="color: #666; direction: ltr; unicode-bidi: embed;">{'כן' if USER_WANTS_TUTOR else 'לא'}</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="margin: 12px 0; padding: 10px; background-color: #f5f5f5; border-radius: 4px; text-align: right; direction: rtl;">
                                        <span style="font-weight: bold; color: #333; display: inline-block; margin-left: 10px;">תאריך הרשמה:</span><span style="color: #666; direction: ltr; unicode-bidi: embed;">{CREATED_AT}</span>
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

# ============================================================================
# SEND EMAIL
# ============================================================================

if __name__ == "__main__":
    print(f"📧 Sending test coordinator email to: {TEST_EMAIL}")
    print(f"Subject: {subject}")
    print(f"Coordinator: {COORDINATOR_NAME}")
    print(f"User: {USER_FULL_NAME}")
    print("-" * 80)
    
    try:
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [TEST_EMAIL],
            fail_silently=False,
            html_message=message
        )
        print("✅ Email sent successfully!")
        print(f"Check your inbox at: {TEST_EMAIL}")
    except Exception as e:
        print(f"❌ Error sending email: {str(e)}")
        print(f"\nDEBUG INFO:")
        print(f"DEFAULT_FROM_EMAIL: {settings.DEFAULT_FROM_EMAIL}")
        print(f"EMAIL_BACKEND: {settings.EMAIL_BACKEND if hasattr(settings, 'EMAIL_BACKEND') else 'Not configured'}")
