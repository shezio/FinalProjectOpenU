#!/usr/bin/env python
"""
Test script to verify WhatsApp admin notifications for new families.
Tests sending notifications to all System Admins (except shlezi0@gmail.com) when a new family is created.

Usage:
    # Set environment variables first (GitHub Secrets)
    export TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    export TWILIO_AUTH_TOKEN="your_auth_token_here"
    export TWILIO_WHATSAPP_FROM="whatsapp:+14155552671"
    export NEW_FAMILY_ADMIN_SID="HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"  (optional)
    
    # Then run test
    python test_admin_notification.py

Environment Variables Required (GitHub Secrets):
    TWILIO_ACCOUNT_SID - Twilio account SID
    TWILIO_AUTH_TOKEN - Twilio auth token
    TWILIO_WHATSAPP_FROM - Twilio WhatsApp number
    NEW_FAMILY_ADMIN_SID - Twilio template SID (optional, 9 variables: name, child_name, age_display, gender, city, parent_phone, hospital, tutoring_status, registration_date)
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

from childsmile_app.whatsapp_utils import send_coordinator_notification_whatsapp_family_with_age_unit
from childsmile_app.models import Staff, Role


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
        'NEW_FAMILY_ADMIN_SID': os.getenv('NEW_FAMILY_ADMIN_SID'),
    }
    
    all_present = True
    for key, value in credentials.items():
        if value:
            masked = value[:6] + '*' * (len(value) - 10) + value[-4:] if len(value) > 10 else '*' * len(value)
            print_success(f"{key}: {masked}")
        else:
            if key == 'NEW_FAMILY_ADMIN_SID':
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
    """Verify we can connect to database and find System Admins"""
    print_section("Checking Database Connection")
    
    try:
        # Check System Admin role exists
        admin_role = Role.objects.filter(role_name="System Administrator").first()
        if not admin_role:
            print_error("System Administrator role not found in database")
            return False
        print_success(f"Found System Administrator role (ID: {admin_role.id})")
        
        # Check for system admins
        all_admins = Staff.objects.filter(roles=admin_role, is_active=True).distinct()
        if not all_admins.exists():
            print_error("No active System Administrators found in database")
            return False
        
        print_success(f"Found {all_admins.count()} active System Administrators")
        
        # Show admins and their status
        print_section("System Admins Status")
        for admin in all_admins:
            is_excluded = admin.email.lower() == 'shlezi0@gmail.com'
            will_notify = "❌ EXCLUDED" if is_excluded else "✅ WILL NOTIFY"
            phone_status = "📱 HAS PHONE" if admin.staff_phone else "❌ NO PHONE"
            
            print_info(f"{admin.username} ({admin.email})")
            print_info(f"  └─ {will_notify} | {phone_status}")
        
        return True
        
    except Exception as e:
        print_error(f"Database connection error: {str(e)}")
        return False


def create_test_family(phone_number):
    """Dummy values for testing - not used"""
    pass


def test_admin_notification(test_family):
    """Test sending admin notifications with dummy data"""
    print_section("Testing WhatsApp Utility")
    
    try:
        # Dummy family data for testing
        child_name = "בדיקה משפחה"
        age_number = "4"
        age_unit = "שנים"
        child_gender = "נקבה"
        parent_phone = "050-1234567"
        child_city = "תל אביב"
        child_hospital = "בית חולים רמב\"ם"
        tutoring_status = "צריך למצוא חונך"
        registration_date = "12/04/2026"
        
        print_info(f"Testing with dummy family data:")
        print_info(f"  Child: {child_name}")
        print_info(f"  Age: {age_number} {age_unit}")
        print_info(f"  City: {child_city}")
        
        # Get System Admins (excluding shlezi0@gmail.com)
        admin_role = Role.objects.filter(role_name="System Administrator").first()
        all_admins = Staff.objects.filter(roles=admin_role, is_active=True).distinct()
        
        admins_to_notify = [
            admin for admin in all_admins 
            if admin.email.lower() != 'shlezi0@gmail.com'
        ]
        
        if not admins_to_notify:
            print_error("No System Administrators (excluding shlezi0@gmail.com) found to notify")
            return False
        
        print_section("Sending WhatsApp Messages")
        print_info(f"Sending to {len(admins_to_notify)} admin(s)...\n")
        
        sent_count = 0
        failed_count = 0
        
        # Send WhatsApp to each admin using the utility directly
        for admin in admins_to_notify:
            if not admin.staff_phone:
                print_error(f"  {admin.username} ({admin.email}) - NO PHONE NUMBER (skipped)")
                continue
            
            try:
                admin_name = f"{admin.first_name} {admin.last_name}"
                
                # Send WhatsApp using the utility directly with dummy data
                whatsapp_result = send_coordinator_notification_whatsapp_family_with_age_unit(
                    coordinator_phone=admin.staff_phone,
                    coordinator_name=admin_name,
                    child_name=child_name,
                    age_number=age_number,
                    age_unit=age_unit,
                    child_gender=child_gender,
                    parent_phone=parent_phone,
                    child_city=child_city,
                    child_hospital=child_hospital,
                    tutoring_status=tutoring_status,
                    registration_date=registration_date
                )
                
                if whatsapp_result.get("success"):
                    print_success(f"  {admin.username} ({admin.email})")
                    print_info(f"    Phone: {admin.staff_phone}")
                    print_info(f"    Message SID: {whatsapp_result.get('message_sid')}")
                    sent_count += 1
                else:
                    print_error(f"  {admin.username} ({admin.email})")
                    print_info(f"    Error: {whatsapp_result.get('error')}")
                    failed_count += 1
                    
            except Exception as wa_error:
                print_error(f"  {admin.username} ({admin.email})")
                print_info(f"    Exception: {str(wa_error)}")
                failed_count += 1
        
        print_section("Summary")
        print_success(f"Successfully sent: {sent_count}")
        print_error(f"Failed: {failed_count}") if failed_count > 0 else None
        
        print_section("Excluded Admins")
        for admin in all_admins:
            if admin.email.lower() == 'shlezi0@gmail.com':
                print_error(f"  {admin.username} ({admin.email}) - EXCLUDED (shlezi0@gmail.com)")
        
        return sent_count > 0
        
    except Exception as e:
        print_error(f"Error testing WhatsApp utility: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def cleanup_test_family():
    """No cleanup needed - we use existing families from database"""
    pass


def main():
    """Main entry point"""
    print_header("WhatsApp Admin Notification Utility Test")
    
    # Check credentials
    if not check_credentials():
        sys.exit(1)
    
    # Check database
    if not check_database():
        sys.exit(1)
    
    # Test notification utility with dummy data
    if not test_admin_notification(None):
        sys.exit(1)
    
    print_header("Test Complete ✅")
    print("\n📋 Verification Checklist:")
    print("  1. ✅ Check WhatsApp on all admin phones (except shlezi0@gmail.com)")
    print("  2. ✅ Verify shlezi0@gmail.com did NOT receive message")
    print("  3. ✅ Verify other admins DID receive the message")
    print("  4. ✅ Verify message contains correct dummy data")
    print("  5. ✅ Verify age displays as '4 שנים'")


if __name__ == '__main__':
    main()
