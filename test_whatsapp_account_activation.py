#!/usr/bin/env python
"""
Test suite for WhatsApp account activation notifications.
Tests sending WhatsApp messages when staff accounts are activated/reactivated.

Usage:
    python test_whatsapp_account_activation.py
    OR
    bash test_whatsapp_account_activation.sh
"""

import os
import sys
import django
from pathlib import Path

# Setup Django
sys.path.insert(0, str(Path(__file__).parent / "childsmile"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "childsmile.settings")
django.setup()

from childsmile_app.whatsapp_utils import send_account_activation_whatsapp
from childsmile_app.logger import api_logger


def check_credentials():
    """Check if Twilio credentials are configured."""
    account_sid = os.getenv('TWILIO_ACCOUNT_SID')
    auth_token = os.getenv('TWILIO_AUTH_TOKEN')
    twilio_from = os.getenv('TWILIO_WHATSAPP_FROM')
    activation_sid = os.getenv('TWILIO_ACCOUNT_ACTIVATION_SID')
    
    print("\n" + "=" * 70)
    print("CREDENTIAL CHECK")
    print("=" * 70)
    
    print(f"✓ TWILIO_ACCOUNT_SID: {'✅ Set' if account_sid else '❌ NOT SET'}")
    print(f"✓ TWILIO_AUTH_TOKEN: {'✅ Set' if auth_token else '❌ NOT SET'}")
    print(f"✓ TWILIO_WHATSAPP_FROM: {'✅ Set' if twilio_from else '❌ NOT SET'}")
    print(f"✓ TWILIO_ACCOUNT_ACTIVATION_SID: {'✅ Set (using template)' if activation_sid else '⚠️  NOT SET (will use plain text fallback)'}")
    
    all_required = all([account_sid, auth_token, twilio_from])
    return all_required


def test_send_account_activation_whatsapp(test_phone, test_name):
    """Test sending account activation WhatsApp message."""
    
    print("\n" + "=" * 70)
    print("TEST: Send Account Activation WhatsApp")
    print("=" * 70)
    
    # Validate that phone and name are provided
    if not test_phone:
        print("❌ CRITICAL ERROR: Phone number is REQUIRED for account activation test!")
        print("   This is a critical business message - cannot send without explicit phone number!")
        return False
    
    if not test_name:
        print("❌ CRITICAL ERROR: Staff name is REQUIRED for account activation test!")
        print("   This is a critical business message - cannot send without explicit staff name!")
        return False
    
    print(f"\nSending account activation WhatsApp:")
    print(f"  Phone: {test_phone}")
    print(f"  Name: {test_name}")
    
    try:
        result = send_account_activation_whatsapp(
            staff_phone=test_phone,
            staff_name=test_name
        )
        
        print(f"\n✓ Result:")
        print(f"  Success: {result.get('success')}")
        print(f"  Phone: {result.get('phone')}")
        
        if result.get('success'):
            print(f"  Message SID: {result.get('message_sid')}")
            print(f"  Status: {result.get('status')}")
            print("\n✅ Account activation WhatsApp sent successfully!")
            return True
        else:
            print(f"  Error: {result.get('error')}")
            print(f"  Details: {result.get('details', 'N/A')}")
            print("\n❌ Failed to send account activation WhatsApp")
            return False
            
    except Exception as e:
        print(f"\n❌ Exception occurred: {str(e)}")
        api_logger.error(f"Test failed: {str(e)}")
        return False


def main():
    """Run all tests."""
    import sys
    
    print("\n" + "=" * 70)
    print("WHATSAPP ACCOUNT ACTIVATION TEST SUITE")
    print("=" * 70)
    
    # Parse command line arguments - BOTH are REQUIRED
    if len(sys.argv) < 3:
        print("\n" + "❌ " * 15)
        print("CRITICAL ERROR: Missing required arguments!")
        print("❌ " * 15)
        print("\nUsage:")
        print("  python test_whatsapp_account_activation.py <phone> <name>")
        print("\nExample:")
        print("  python test_whatsapp_account_activation.py +972542652949 'John Doe'")
        print("\n⚠️  This test sends CRITICAL account activation messages.")
        print("   Phone number and staff name are REQUIRED to prevent accidental sends!")
        print("\n" + "❌ " * 15)
        return False
    
    test_phone = sys.argv[1]
    test_name = sys.argv[2]
    
    print(f"\n📱 Test Phone: {test_phone}")
    print(f"👤 Test Name: {test_name}")
    
    # Check credentials
    if not check_credentials():
        print("\n" + "⚠️  " * 10)
        print("MISSING REQUIRED CREDENTIALS!")
        print("Please set: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM")
        print("Optional: TWILIO_ACCOUNT_ACTIVATION_SID (for using Twilio templates)")
        print("⚠️  " * 10)
        return False
    
    # Run tests
    print("\n" + "=" * 70)
    print("RUNNING TESTS")
    print("=" * 70)
    
    test_results = []
    
    # Test 1: Send account activation WhatsApp
    test_results.append(("Account Activation WhatsApp", test_send_account_activation_whatsapp(test_phone, test_name)))
    
    # Summary
    print("\n" + "=" * 70)
    print("TEST SUMMARY")
    print("=" * 70)
    
    for test_name_label, passed in test_results:
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"{test_name_label}: {status}")
    
    all_passed = all(result for _, result in test_results)
    
    if all_passed:
        print("\n✅ All tests passed!")
        return True
    else:
        print("\n❌ Some tests failed!")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
