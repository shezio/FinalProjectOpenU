#!/usr/bin/env python
"""
Test script to verify WhatsApp TOTP code sending.
Send a test TOTP code to a specific phone number.

Usage:
    # Set environment variables first (GitHub Secrets)
    export TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    export TWILIO_AUTH_TOKEN="your_auth_token_here"
    export TWILIO_WHATSAPP_FROM="whatsapp:+14155552671"
    export TOTP_LOGIN_SID="HXd035723708b47d63f0d85276e26ccc25"  (optional, Twilio template SID)
    
    # Then run test with phone number and optional TOTP code
    python test_totp_whatsapp.py 0501234567
    python test_totp_whatsapp.py 0501234567 654321
    python test_totp_whatsapp.py +972501234567
    python test_totp_whatsapp.py 0501234567 999999

Arguments:
    phone_number (required): Phone number to send TOTP to (e.g., 0501234567 or +972501234567)
    totp_code (optional): 6-digit TOTP code (default: random 6-digit number)

Template (Twilio Authentication):
    Uses: "logintotp" template (set via TOTP_LOGIN_SID environment variable)
    Message will show: [#] קוד האימות שלך הוא: {code}
    With copy button and 5-minute expiration
"""

import os
import sys
import django
import argparse
import random

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'childsmile.settings')
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'childsmile'))

django.setup()

from childsmile_app.whatsapp_utils import send_totp_login_code_whatsapp
from childsmile_app.models import Staff


def print_header(text):
    """Print a formatted header"""
    print("\n" + "=" * 70)
    print(f"  {text}")
    print("=" * 70)


def print_section(text):
    """Print a formatted section"""
    print(f"\n📌 {text}:")


def print_success(text):
    """Print success message"""
    print(f"✅ {text}")


def print_error(text):
    """Print error message"""
    print(f"❌ {text}")


def print_info(text):
    """Print info message"""
    print(f"ℹ️  {text}")


def check_credentials():
    """Verify Twilio credentials are configured via environment variables"""
    print_section("Checking Credentials")
    
    credentials = {
        'TWILIO_ACCOUNT_SID': os.getenv('TWILIO_ACCOUNT_SID'),
        'TWILIO_AUTH_TOKEN': os.getenv('TWILIO_AUTH_TOKEN'),
        'TWILIO_WHATSAPP_FROM': os.getenv('TWILIO_WHATSAPP_FROM'),
        'TOTP_LOGIN_SID': os.getenv('TOTP_LOGIN_SID'),
    }
    
    all_present = True
    for key, value in credentials.items():
        if value:
            masked = value[:6] + '*' * (len(value) - 10) + value[-4:] if len(value) > 10 else '*' * len(value)
            print_success(f"{key}: {masked}")
        else:
            if key == 'TOTP_LOGIN_SID':
                print_info(f"{key}: NOT SET (optional - will use plain text fallback)")
            else:
                print_error(f"{key}: NOT SET")
                all_present = False
    
    if not all_present:
        print_error("Missing required credentials!")
        print_info("Set them in GitHub Secrets or environment variables")
        return False
    
    return True


def check_database():
    """Verify we can connect to database and find Staff members with phones"""
    print_section("Checking Database Connection")
    
    try:
        # Check for staff members with phone numbers
        staff_with_phone = Staff.objects.filter(staff_phone__isnull=False).exclude(staff_phone__exact='').distinct()
        
        if not staff_with_phone.exists():
            print_error("No staff members with phone numbers found in database")
            return False
        
        print_success(f"Found {staff_with_phone.count()} staff members with phone numbers")
        
        # Show staff members status
        print_section("Staff Members Available for Testing")
        for staff in staff_with_phone:
            print_info(f"{staff.username} ({staff.email})")
            print_info(f"  └─ Phone: {staff.staff_phone}")
        
        return True
        
    except Exception as e:
        print_error(f"Database connection error: {str(e)}")
        return False


def main():
    """Main entry point"""
    print_header("WhatsApp TOTP Code Sending Test")
    
    # Parse command line arguments
    parser = argparse.ArgumentParser(
        description='Send a test TOTP code via WhatsApp',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python test_totp_whatsapp.py 0501234567              # Random 6-digit code
  python test_totp_whatsapp.py 0501234567 654321       # Specific code
  python test_totp_whatsapp.py +972501234567 999999    # With country code
        """
    )
    parser.add_argument('phone', help='Phone number to send TOTP to (e.g., 0501234567 or +972501234567)')
    parser.add_argument('code', nargs='?', default=None, help='6-digit TOTP code (default: random)')
    
    args = parser.parse_args()
    
    # Check credentials
    if not check_credentials():
        sys.exit(1)
    
    # Generate or validate TOTP code
    if args.code:
        totp_code = args.code
        # Validate it's 6 digits
        if not totp_code.isdigit() or len(totp_code) != 6:
            print_error("TOTP code must be 6 digits!")
            sys.exit(1)
    else:
        # Generate random 6-digit code
        totp_code = ''.join([str(random.randint(0, 9)) for _ in range(6)])
    
    # Send TOTP to the phone number
    print_section("Sending TOTP Code")
    print_info(f"Phone number: {args.phone}")
    print_info(f"TOTP code: {totp_code}")
    print_info(f"Template SID: {os.getenv('TOTP_LOGIN_SID', 'NOT SET (will use plain text fallback)')}")
    
    try:
        whatsapp_result = send_totp_login_code_whatsapp(
            staff_phone=args.phone,
            totp_code=totp_code
        )
        
        if whatsapp_result.get("success"):
            print_section("Success! ✅")
            print_success(f"Message sent successfully!")
            print_info(f"Message SID: {whatsapp_result.get('message_sid')}")
            print_info(f"Phone: {whatsapp_result.get('phone')}")
            print_info(f"Status: {whatsapp_result.get('status')}")
            print_header("Test Complete ✅")
            print("\n📋 Verification Checklist:")
            print("  1. ✅ Check WhatsApp on phone number")
            print("  2. ✅ Verify you received the TOTP code message")
            print("  3. ✅ Verify code is: " + totp_code)
            if os.getenv('TOTP_LOGIN_SID'):
                print("  4. ✅ Verify message shows: [#] קוד האימות שלך הוא: " + totp_code)
                print("  5. ✅ Verify copy button is present: 'לחץ להעתקת הקוד'")
            else:
                print("  4. ✅ Verify message shows fallback Hebrew text")
        else:
            print_section("Failed! ❌")
            print_error(f"Failed to send TOTP code!")
            print_error(f"Error: {whatsapp_result.get('error')}")
            if whatsapp_result.get('details'):
                print_info(f"Details: {whatsapp_result.get('details')}")
            sys.exit(1)
            
    except Exception as e:
        print_error(f"Error sending TOTP WhatsApp: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
