#!/usr/bin/env python
"""
Test script to send registration approval WhatsApp messages via Twilio.
Tests all three registration flow notifications: coordinator approval, final approval, and rejection.

Usage:
    # Set environment variables first (GitHub Secrets)
    export TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    export TWILIO_AUTH_TOKEN="your_auth_token_here"
    export TWILIO_WHATSAPP_FROM="whatsapp:+14155552671"
    export TWILIO_REGISTRATION_COORDINATOR_APPROVAL_SID="HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"  (optional)
    export TWILIO_REGISTRATION_FINAL_APPROVAL_SID="HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"  (optional)
    export TWILIO_REGISTRATION_REJECTED_SID="HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"  (optional)
    
    # Then run test with YOUR phone number
    python test_whatsapp_registration_approval.py --phone "054-2652949"
    python test_whatsapp_registration_approval.py --phone "0542652949"
    python test_whatsapp_registration_approval.py --phone "+972542652949"

Environment Variables Required (GitHub Secrets):
    TWILIO_ACCOUNT_SID - Twilio account SID
    TWILIO_AUTH_TOKEN - Twilio auth token
    TWILIO_WHATSAPP_FROM - Twilio WhatsApp number
    TWILIO_REGISTRATION_COORDINATOR_APPROVAL_SID - Template SID (optional)
    TWILIO_REGISTRATION_FINAL_APPROVAL_SID - Template SID (optional)
    TWILIO_REGISTRATION_REJECTED_SID - Template SID (optional)
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

from childsmile_app.whatsapp_utils import (
    send_registration_coordinator_approval_whatsapp,
    send_registration_final_approval_whatsapp,
    send_registration_rejection_whatsapp
)
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
    print_section("Checking Twilio Credentials")
    
    required = [
        'TWILIO_ACCOUNT_SID',
        'TWILIO_AUTH_TOKEN',
        'TWILIO_WHATSAPP_FROM'
    ]
    
    missing = []
    for var in required:
        if os.getenv(var):
            print_info(f"{var}: ✓ Set")
        else:
            print_error(f"{var}: ✗ Not set")
            missing.append(var)
    
    optional_templates = [
        'TWILIO_REGISTRATION_COORDINATOR_APPROVAL_SID',
        'TWILIO_REGISTRATION_FINAL_APPROVAL_SID',
        'TWILIO_REGISTRATION_REJECTED_SID'
    ]
    
    print_info("\nOptional Template SIDs (will use plain text if not set):")
    for var in optional_templates:
        status = "Set" if os.getenv(var) else "Not set (will use plain text)"
        print_info(f"  {var}: {status}")
    
    if missing:
        print_error(f"\nMissing required credentials: {', '.join(missing)}")
        return False
    
    return True


def test_coordinator_approval(phone_number):
    """Test sending coordinator approval WhatsApp"""
    print_section("Testing Coordinator Approval WhatsApp")
    
    volunteer_data = {
        'name': 'דוד לוי',
        'phone': phone_number,
    }
    
    print_info(f"Volunteer Name: {volunteer_data['name']}")
    print_info(f"Phone: {volunteer_data['phone']}")
    print_info(f"Template SID: {os.getenv('TWILIO_REGISTRATION_COORDINATOR_APPROVAL_SID', 'NOT SET (will use plain text fallback)')}")
    
    print_section("Sending Coordinator Approval WhatsApp")
    
    try:
        result = send_registration_coordinator_approval_whatsapp(
            volunteer_phone=volunteer_data['phone'],
            volunteer_name=volunteer_data['name']
        )
        
        print_section("Results")
        
        if result.get('success'):
            print_success(f"Coordinator approval WhatsApp sent successfully!")
            print_info(f"Message SID: {result.get('message_sid')}")
            print_info(f"Phone: {result.get('phone')}")
            print_info(f"Status: {result.get('status')}")
            
            print_section("Message Content")
            print("🎉 הרשמתך אושרה בשלב הראשון!")
            print(f"שלום {volunteer_data['name']},")
            print("תודה על הרשמתך לחיוך של ילד ✨")
            print("הרשמתך עברה את השלב הראשוני בהצלחה!")
            print("👥 השלב הבא - הצטרף לקבוצת הווטסאפ:")
            print("https://chat.whatsapp.com/B7UcLqApSTzCpppWR221DB")
            
            return True
        else:
            print_error(f"Failed to send coordinator approval WhatsApp")
            print_info(f"Error: {result.get('error')}")
            if result.get('details'):
                print_info(f"Details: {result.get('details')}")
            print_info(f"Phone: {result.get('phone')}")
            return False
            
    except Exception as e:
        print_error(f"Exception during coordinator approval test: {str(e)}")
        return False


def test_final_approval(phone_number):
    """Test sending final approval WhatsApp"""
    print_section("Testing Final Approval WhatsApp")
    
    volunteer_data = {
        'name': 'דוד לוי',
        'phone': phone_number,
    }
    
    print_info(f"Volunteer Name: {volunteer_data['name']}")
    print_info(f"Phone: {volunteer_data['phone']}")
    print_info(f"Template SID: {os.getenv('TWILIO_REGISTRATION_FINAL_APPROVAL_SID', 'NOT SET (will use plain text fallback)')}")
    
    print_section("Sending Final Approval WhatsApp")
    
    try:
        result = send_registration_final_approval_whatsapp(
            volunteer_phone=volunteer_data['phone'],
            volunteer_name=volunteer_data['name']
        )
        
        print_section("Results")
        
        if result.get('success'):
            print_success(f"Final approval WhatsApp sent successfully!")
            print_info(f"Message SID: {result.get('message_sid')}")
            print_info(f"Phone: {result.get('phone')}")
            print_info(f"Status: {result.get('status')}")
            
            print_section("Message Content")
            print("✅ הרשמתך אושרה סופית!")
            print(f"שלום {volunteer_data['name']},")
            print("ברכותינו! 🎉")
            print("הרשמתך בחיוך של ילד אושרה סופית!")
            print("עברת בהצלחה את כל שלבי התהליך ✨")
            print("🚀 תוכל להתחבר למערכת כעת")
            
            return True
        else:
            print_error(f"Failed to send final approval WhatsApp")
            print_info(f"Error: {result.get('error')}")
            if result.get('details'):
                print_info(f"Details: {result.get('details')}")
            print_info(f"Phone: {result.get('phone')}")
            return False
            
    except Exception as e:
        print_error(f"Exception during final approval test: {str(e)}")
        return False


def test_rejection(phone_number):
    """Test sending rejection WhatsApp"""
    print_section("Testing Registration Rejection WhatsApp")
    
    volunteer_data = {
        'name': 'דוד לוי',
        'phone': phone_number,
    }
    
    print_info(f"Volunteer Name: {volunteer_data['name']}")
    print_info(f"Phone: {volunteer_data['phone']}")
    print_info(f"Template SID: {os.getenv('TWILIO_REGISTRATION_REJECTED_SID', 'NOT SET (will use plain text fallback)')}")
    
    print_section("Sending Rejection WhatsApp")
    
    try:
        result = send_registration_rejection_whatsapp(
            volunteer_phone=volunteer_data['phone'],
            volunteer_name=volunteer_data['name']
        )
        
        print_section("Results")
        
        if result.get('success'):
            print_success(f"Rejection WhatsApp sent successfully!")
            print_info(f"Message SID: {result.get('message_sid')}")
            print_info(f"Phone: {result.get('phone')}")
            print_info(f"Status: {result.get('status')}")
            
            print_section("Message Content")
            print("הודעה בנוגע להרשמתך")
            print(f"שלום {volunteer_data['name']},")
            print("לצערנו, בקשת ההרשמה שלך בחיוך של ילד נדחתה.")
            print("אם יש לך שאלות, אנא צור קשר:")
            print("📱 +972 50-722-5027 (טל - רכזת מתנדבים)")
            
            return True
        else:
            print_error(f"Failed to send rejection WhatsApp")
            print_info(f"Error: {result.get('error')}")
            if result.get('details'):
                print_info(f"Details: {result.get('details')}")
            print_info(f"Phone: {result.get('phone')}")
            return False
            
    except Exception as e:
        print_error(f"Exception during rejection test: {str(e)}")
        return False


def main():
    """Main entry point"""
    print_header("WhatsApp Registration Approval Test")
    
    # Parse command line arguments
    parser = argparse.ArgumentParser(
        description='Test WhatsApp registration approval notifications',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python test_whatsapp_registration_approval.py --phone "054-2652949"
  python test_whatsapp_registration_approval.py --phone "0542652949"
  python test_whatsapp_registration_approval.py --phone "+972542652949"
        """
    )
    
    parser.add_argument(
        '--phone',
        required=True,
        help='YOUR phone number to receive test messages (e.g., "054-2652949")'
    )
    
    args = parser.parse_args()
    
    print_info(f"Sending test messages to YOUR number: {args.phone}")
    
    # Check credentials
    if not check_credentials():
        print_error("\nCannot proceed without credentials")
        sys.exit(1)
    
    # Test all three flows
    results = {}
    
    print("\n" + "=" * 70)
    print("  RUNNING ALL TESTS")
    print("=" * 70)
    
    results['coordinator_approval'] = test_coordinator_approval(args.phone)
    results['final_approval'] = test_final_approval(args.phone)
    results['rejection'] = test_rejection(args.phone)
    
    # Print summary
    print_header("Test Summary")
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    print_info(f"Tests Passed: {passed}/{total}")
    
    for test_name, result in results.items():
        status = "✅ PASSED" if result else "❌ FAILED"
        print_info(f"  {test_name.replace('_', ' ').title()}: {status}")
    
    print_header("Test Complete")
    if passed == total:
        print_success(f"✅ All WhatsApp registration tests PASSED - Integration is working!")
        sys.exit(0)
    else:
        print_error(f"❌ Some WhatsApp registration tests FAILED - Check errors above")
        sys.exit(1)


if __name__ == '__main__':
    main()
