#!/usr/bin/env python
"""
Test script to send a WhatsApp message to a coordinator via Twilio.
Tests the coordinator notification WhatsApp integration.

Usage:
    # Set environment variables first (GitHub Secrets)
    export TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    export TWILIO_AUTH_TOKEN="your_auth_token_here"
    export TWILIO_WHATSAPP_FROM="whatsapp:+14155552671"
    export NEW_REGISTER_SID="HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"  (optional)
    
    # Then run test with YOUR phone number
    python test_whatsapp_coordinator.py --phone "054-2652949"
    python test_whatsapp_coordinator.py --phone "0542652949"
    python test_whatsapp_coordinator.py --phone "+972542652949"

Environment Variables Required (GitHub Secrets):
    TWILIO_ACCOUNT_SID - Twilio account SID
    TWILIO_AUTH_TOKEN - Twilio auth token
    TWILIO_WHATSAPP_FROM - Twilio WhatsApp number
    NEW_REGISTER_SID - Twilio template SID (optional)
"""

import os
import sys
import django
import argparse
from datetime import datetime

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'childsmile.settings')
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'childsmile'))

django.setup()

from childsmile_app.whatsapp_utils import send_coordinator_notification_whatsapp
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
        'NEW_REGISTER_SID': os.getenv('NEW_REGISTER_SID'),
    }
    
    all_present = True
    for key, value in credentials.items():
        if value:
            masked = value[:6] + '*' * (len(value) - 10) + value[-4:] if len(value) > 10 else '*' * len(value)
            print_success(f"{key}: {masked}")
        else:
            print_error(f"{key}: NOT SET")
            all_present = False
    
    if not all_present:
        print_error("\n⚠️  Some credentials are missing!")
        print_info("Set these environment variables first:")
        print("")
        print("  export TWILIO_ACCOUNT_SID=\"ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx\"")
        print("  export TWILIO_AUTH_TOKEN=\"your_auth_token_here\"")
        print("  export TWILIO_WHATSAPP_FROM=\"whatsapp:+14155552671\"")
        print("  export NEW_REGISTER_SID=\"HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx\"  (optional)")
        print("")
        print("Then run:")
        print("  python test_whatsapp_coordinator.py --phone \"054-YOUR-NUMBER\"")
        return False
    
    print_success("All credentials present!")
    return True


def test_whatsapp(phone_number, use_template_only=False):
    """Test sending WhatsApp message to coordinator"""
    print_section(f"Testing WhatsApp Send to {phone_number}")
    
    # Sample coordinator and user data
    coordinator_data = {
        'coordinator_name': 'ליאם הגבר',
        'coordinator_phone': phone_number,
    }
    
    user_data = {
        'user_name': 'בדיקה מגניבה',
        'user_email': 'moshe.levi@example.com',
        'user_age': '28',
        'user_gender': True,  # Female
        'user_phone': '050-1234567',
        'user_city': 'תל אביב',
        'user_wants_tutor': True,
        'created_at': datetime.now().strftime('%d/%m/%Y %H:%M'),
    }
    
    print_info(f"Coordinator: {coordinator_data['coordinator_name']}")
    print_info(f"Test User: {user_data['user_name']}")
    print_info(f"Test Email: {user_data['user_email']}")
    
    # Send the WhatsApp message
    print_section("Sending WhatsApp Message")
    
    try:
        result = send_coordinator_notification_whatsapp(
            coordinator_phone=coordinator_data['coordinator_phone'],
            coordinator_name=coordinator_data['coordinator_name'],
            user_name=user_data['user_name'],
            user_email=user_data['user_email'],
            user_age=user_data['user_age'],
            user_gender=user_data['user_gender'],
            user_phone=user_data['user_phone'],
            user_city=user_data['user_city'],
            user_wants_tutor=user_data['user_wants_tutor'],
            created_at=user_data['created_at']
        )
        
        # Display results
        print_section("Results")
        
        if result.get('success'):
            print_success(f"WhatsApp message sent successfully!")
            print_info(f"Message SID: {result.get('message_sid')}")
            print_info(f"Status: {result.get('status')}")
            print_info(f"Phone: {result.get('phone')}")
            
            print_section("Next Steps")
            print_info("✓ Check your WhatsApp for the message")
            print_info("✓ Verify the coordinator information displays correctly")
            print_info("✓ If successful, the integration is ready for production!")
            
            return True
        else:
            print_error(f"Failed to send WhatsApp message")
            print_info(f"Error: {result.get('error')}")
            if result.get('details'):
                print_info(f"Details: {result.get('details')}")
            print_info(f"Phone: {result.get('phone')}")
            
            print_section("Troubleshooting")
            print_info("• Verify phone number is in correct format (e.g., 054-2652949)")
            print_info("• Check Twilio credentials in GitHub Secrets")
            print_info("• Ensure NEW_REGISTER_SID is set for template mode")
            print_info("• Check that the phone number has WhatsApp enabled")
            
            return False
    
    except Exception as e:
        print_error(f"Exception occurred: {str(e)}")
        api_logger.error(f"Test WhatsApp exception: {str(e)}", exc_info=True)
        return False


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description='Test WhatsApp coordinator notification',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Setup (one time):
  export TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  export TWILIO_AUTH_TOKEN="your_auth_token_here"
  export TWILIO_WHATSAPP_FROM="whatsapp:+14155552671"
  export NEW_REGISTER_SID="HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

Run with YOUR phone number (Israeli format):
  python test_whatsapp_coordinator.py --phone "054-2652949"
  python test_whatsapp_coordinator.py --phone "0542652949"
  python test_whatsapp_coordinator.py --phone "+972542652949"
        """
    )
    
    parser.add_argument(
        '--phone',
        required=True,
        help='YOUR phone number to receive test message (e.g., "054-2652949")'
    )
    
    args = parser.parse_args()
    
    # Print header
    print_header("WhatsApp Coordinator Notification Test")
    print_info(f"Sending test message to YOUR number: {args.phone}")
    
    # Check credentials
    if not check_credentials():
        print_error("\nCannot proceed without credentials")
        sys.exit(1)
    
    # Test WhatsApp
    success = test_whatsapp(args.phone, use_template_only=False)
    
    # Print footer
    print_header("Test Complete")
    if success:
        print_success("✅ WhatsApp test PASSED - Integration is working!")
    else:
        print_error("❌ WhatsApp test FAILED - Check errors above")
    
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
