#!/usr/bin/env python
"""
Test script to send a TOTP login code to a staff member via WhatsApp.
Tests the TOTP login WhatsApp integration.

Usage:
    # Set environment variables first (GitHub Secrets)
    export TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    export TWILIO_AUTH_TOKEN="your_auth_token_here"
    export TWILIO_WHATSAPP_FROM="whatsapp:+14155552671"
    export TWILIO_AUTH_TEMPLATE_SID="HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"  (optional)
    
    # Then run test with YOUR phone number
    python test_whatsapp_totp.py --phone "054-2652949"
    python test_whatsapp_totp.py --phone "0542652949"
    python test_whatsapp_totp.py --phone "+972542652949"

Environment Variables Required (GitHub Secrets):
    TWILIO_ACCOUNT_SID - Twilio account SID
    TWILIO_AUTH_TOKEN - Twilio auth token
    TWILIO_WHATSAPP_FROM - Twilio WhatsApp number
    TWILIO_AUTH_TEMPLATE_SID - Twilio Authentication template SID (optional)
"""

import os
import sys
import django
import argparse
from datetime import datetime
import random
import string

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'childsmile.settings')
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'childsmile'))

django.setup()

from childsmile_app.whatsapp_utils import send_totp_login_code_whatsapp
from childsmile_app.logger import api_logger


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
        'TWILIO_AUTH_TEMPLATE_SID': os.getenv('TWILIO_AUTH_TEMPLATE_SID'),
    }
    
    all_present = True
    for key, value in credentials.items():
        if value:
            masked = value[:6] + '*' * (len(value) - 10) + value[-4:] if len(value) > 10 else '*' * len(value)
            print_success(f"{key}: {masked}")
        else:
            if key == 'TWILIO_AUTH_TEMPLATE_SID':
                print_info(f"{key}: NOT SET (optional - will use plain text fallback)")
            else:
                print_error(f"{key}: NOT SET")
                all_present = False
    
    if not all_present:
        print_error("\n⚠️  Some required credentials are missing!")
        print_info("Set these environment variables first:")
        print("")
        print("  export TWILIO_ACCOUNT_SID=\"ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx\"")
        print("  export TWILIO_AUTH_TOKEN=\"your_auth_token_here\"")
        print("  export TWILIO_WHATSAPP_FROM=\"whatsapp:+14155552671\"")
        print("  export TWILIO_AUTH_TEMPLATE_SID=\"HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx\"  (optional)")
        print("")
        print("Then run:")
        print("  python test_whatsapp_totp.py --phone \"054-YOUR-NUMBER\"")
        return False
    
    print_success("All required credentials present!")
    return True


def generate_test_totp_code():
    """Generate a random 6-digit TOTP code for testing"""
    return ''.join(random.choices(string.digits, k=6))


def test_whatsapp(phone_number):
    """Test sending WhatsApp TOTP login code"""
    print_section(f"Testing WhatsApp TOTP Send to {phone_number}")
    
    # Sample staff data
    staff_data = {
        'staff_name': 'ירון כהן',
        'staff_phone': phone_number,
        'totp_code': generate_test_totp_code(),
    }
    
    print_info(f"Staff Name: {staff_data['staff_name']}")
    print_info(f"TOTP Code: {staff_data['totp_code']}")
    print_info(f"Expiration: 5 minutes")
    
    # Send the WhatsApp message
    print_section("Sending WhatsApp TOTP Code")
    
    try:
        result = send_totp_login_code_whatsapp(
            staff_phone=staff_data['staff_phone'],
            staff_name=staff_data['staff_name'],
            totp_code=staff_data['totp_code']
        )
        
        # Display results
        print_section("Results")
        
        if result.get('success'):
            print_success(f"WhatsApp TOTP code sent successfully!")
            print_info(f"Message SID: {result.get('message_sid')}")
            print_info(f"Status: {result.get('status')}")
            print_info(f"Phone: {result.get('phone')}")
            
            print_section("Next Steps")
            print_info("✓ Check your WhatsApp for the TOTP code")
            print_info("✓ Verify the code displays correctly (6 digits)")
            print_info("✓ Verify the expiration message (5 minutes)")
            print_info("✓ If successful, the integration is ready for production!")
            
            return True
        else:
            print_error(f"Failed to send WhatsApp TOTP code")
            print_info(f"Error: {result.get('error')}")
            if result.get('details'):
                print_info(f"Details: {result.get('details')}")
            print_info(f"Phone: {result.get('phone')}")
            
            print_section("Troubleshooting")
            print_info("• Verify phone number is in correct format (e.g., 054-2652949)")
            print_info("• Check Twilio credentials in GitHub Secrets")
            print_info("• Ensure LOGIN_CODE_SID is set for template mode")
            print_info("• Check that the phone number has WhatsApp enabled")
            
            return False
    
    except Exception as e:
        print_error(f"Exception occurred: {str(e)}")
        api_logger.error(f"Test WhatsApp TOTP exception: {str(e)}", exc_info=True)
        return False


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description='Test WhatsApp TOTP login code notification',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Setup (one time):
  export TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  export TWILIO_AUTH_TOKEN="your_auth_token_here"
  export TWILIO_WHATSAPP_FROM="whatsapp:+14155552671"
  export TWILIO_AUTH_TEMPLATE_SID="HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

Run with YOUR phone number (Israeli format):
  python test_whatsapp_totp.py --phone "054-2652949"
  python test_whatsapp_totp.py --phone "0542652949"
  python test_whatsapp_totp.py --phone "+972542652949"
        """
    )
    
    parser.add_argument(
        '--phone',
        required=True,
        help='YOUR phone number to receive test message (e.g., "054-2652949")'
    )
    
    args = parser.parse_args()
    
    # Print header
    print_header("WhatsApp TOTP Login Code Test")
    print_info(f"Sending test TOTP code to YOUR number: {args.phone}")
    
    # Check credentials
    if not check_credentials():
        print_error("\nCannot proceed without credentials")
        sys.exit(1)
    
    # Test WhatsApp
    success = test_whatsapp(args.phone)
    
    # Print footer
    print_header("Test Complete")
    if success:
        print_success("✅ WhatsApp TOTP test PASSED - Integration is working!")
    else:
        print_error("❌ WhatsApp TOTP test FAILED - Check errors above")
    
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
