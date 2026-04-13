"""
WhatsApp Templates for Registration Approval Notifications via Twilio

These templates are used to send registration approval status updates to volunteers
via WhatsApp, complementing the email notifications.

REGISTRATION APPROVAL FLOW:
1. Coordinator approves → Send WhatsApp with WhatsApp group link (uses COORDINATOR_APPROVAL template)
2. Admin final approval → Send WhatsApp confirmation (uses FINAL_APPROVAL template)

ACCOUNT ACTIVATION FLOW:
- Staff account is activated/reactivated → Send WhatsApp confirmation (uses ACCOUNT_ACTIVATION template)
"""

# Template 1: COORDINATOR TIER 1 APPROVAL
# Sent when coordinator approves the volunteer registration
# Message: Informs volunteer they've passed tier 1 and asks them to join WhatsApp group
COORDINATOR_APPROVAL_TEMPLATE_NAME = "registration_coordinator_approval"
COORDINATOR_APPROVAL_MESSAGE = """
🎉 הרשמתך אושרה בשלב הראשון!

שלום {{name}},

תודה על הרשמתך לחיוך של ילד ✨

הרשמתך עברה את השלב הראשוני בהצלחה! 

👥 השלב הבא - הצטרף לקבוצת הווטסאפ:
https://chat.whatsapp.com/B7UcLqApSTzCpppWR221DB

לאחר הצטרפות, צוות הניהול יבדוק את הפרטים ויסיים את האישור הסופי בקרוב ⏳

עם שאלות:
📱 +972 50-722-5027 (טל - רכזת מתנדבים)
"""

# Template 2: FINAL ADMIN TIER 2 APPROVAL
# Sent when admin gives final approval for volunteer registration
# Message: Confirms registration is complete and they can now access the system
FINAL_APPROVAL_TEMPLATE_NAME = "registration_final_approval"
FINAL_APPROVAL_MESSAGE = """
✅ הרשמתך אושרה סופית!

שלום {{name}},

ברכותינו! 🎉

הרשמתך בחיוך של ילד אושרה סופית!

עברת בהצלחה את כל שלבי התהליך ✨

🚀 תוכל להתחבר למערכת כעת

תודה שהצטרפת לקהילה שלנו! 
יחד אנחנו עושים הבדל בחיי הילדים 💚

עם שאלות:
📱 +972 50-722-5027 (טל - רכזת מתנדבים)
"""

# Template 3: REGISTRATION REJECTION
# Sent to volunteer when their registration is rejected
# Message: Informs them registration was rejected
REJECTION_TEMPLATE_NAME = "registration_rejected"
REJECTION_MESSAGE = """
הודעה בנוגע להרשמתך

שלום {{name}},

לצערנו, בקשת ההרשמה שלך בחיוך של ילד נדחתה.

אם יש לך שאלות, אנא צור קשר:
📱 +972 50-722-5027 (טל - רכזת מתנדבים)

תודה על הבנתך.
"""

# Template 4: ACCOUNT ACTIVATION
# Sent when staff account is activated or reactivated
# Message: Confirms account activation and system access
ACCOUNT_ACTIVATION_TEMPLATE_NAME = "account_activation"
ACCOUNT_ACTIVATION_MESSAGE = """
✅ חשבונך הופעל

שלום {{name}},

חשבונך בחיוך של ילד הופעל בהצלחה! 🎉

תוכל להתחבר למערכת כעת.

בברכה,
צוות חיוך של ילד
"""

# Environment variables needed for .env:
# TWILIO_REGISTRATION_COORDINATOR_APPROVAL_SID=whatsapp_template_sid_1
# TWILIO_REGISTRATION_FINAL_APPROVAL_SID=whatsapp_template_sid_2
# TWILIO_REGISTRATION_REJECTED_SID=whatsapp_template_sid_3
# TWILIO_ACCOUNT_ACTIVATION_SID=whatsapp_template_sid_4
