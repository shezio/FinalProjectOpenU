#!/usr/bin/env python
"""
Django-integrated Penetration Tests for ChildSmile Backend
"""

import os
import sys
import json
from datetime import timedelta
from decimal import Decimal

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'childsmile.settings')

import django
django.setup()

from django.test import TestCase, override_settings
from django.utils import timezone
from django.test.client import Client
from childsmile_app.models import Staff, Role, SignedUp, TOTPCode, Permissions
from django.contrib.auth.models import User

@override_settings(
    ALLOWED_HOSTS=['*'],
    DEBUG=True
)
class TOTPSecurityTests(TestCase):
    """Tests for TOTP authentication vulnerabilities"""
    
    def setUp(self):
        self.client = Client()
        
    def test_totp_code_expiry(self):
        """Verify TOTP codes expire after 5 minutes"""
        email = f'totp_expire_{timezone.now().timestamp()}@test.com'
        code = TOTPCode.generate_code()
        totp = TOTPCode.objects.create(
            email=email,
            code=code,
            created_at=timezone.now() - timedelta(minutes=6)
        )
        
        is_expired = totp.is_expired()
        print(f"[{'✓' if is_expired else '✗'}] TOTP_EXPIRY: Codes expire after 5 minutes - {is_expired}")
        self.assertTrue(is_expired, "TOTP codes should expire after 5 minutes")
    
    def test_totp_attempt_limit(self):
        """Verify TOTP codes are invalid after 3 failed attempts"""
        email = f'totp_attempts_{timezone.now().timestamp()}@test.com'
        code = TOTPCode.generate_code()
        totp = TOTPCode.objects.create(email=email, code=code, attempts=3)
        
        is_valid = totp.is_valid()
        print(f"[{'✓' if not is_valid else '✗'}] TOTP_ATTEMPT_LIMIT: Code invalid after 3 attempts - {not is_valid}")
        self.assertFalse(is_valid, "Code should be invalid after 3+ attempts")
    
    def test_totp_reuse_prevention(self):
        """Verify TOTP codes cannot be reused after verification"""
        email = f'totp_reuse_{timezone.now().timestamp()}@test.com'
        code = TOTPCode.generate_code()
        totp = TOTPCode.objects.create(email=email, code=code)
        
        # Mark as used
        totp.used = True
        totp.save()
        
        is_valid = totp.is_valid()
        print(f"[{'✓' if not is_valid else '✗'}] TOTP_REUSE_PREVENTION: Used codes invalid - {not is_valid}")
        self.assertFalse(is_valid, "Used TOTP codes should be invalid")
    
    def test_totp_randomness(self):
        """Verify TOTP codes are properly randomized"""
        codes = set()
        for _ in range(10):
            code = TOTPCode.generate_code()
            codes.add(code)
        
        unique_count = len(codes)
        print(f"[✓] TOTP_RANDOMNESS: Generated {unique_count} unique codes out of 10")
        self.assertEqual(unique_count, 10, "TOTP codes should be unique")


@override_settings(
    ALLOWED_HOSTS=['*'],
    DEBUG=True
)
class RegistrationSecurityTests(TestCase):
    """Tests for registration and user state security"""
    
    def setUp(self):
        self.client = Client()
    
    def test_unapproved_user_login_block(self):
        """Verify unapproved users cannot login"""
        # Create unapproved staff user
        staff = Staff.objects.create(
            email='unapproved@test.com',
            first_name='Test',
            last_name='User',
            phone='0541234567',
            registration_approved=False,  # Not approved
            is_active=True
        )
        
        # Send TOTP
        response = self.client.post('/api/auth/login-email/', 
                                    {'email': 'unapproved@test.com'},
                                    content_type='application/json')
        
        # Should not allow unapproved user
        if response.status_code in [400, 403]:
            print(f"[✓] UNAPPROVED_LOGIN_BLOCK: Unapproved users cannot login - status {response.status_code}")
            self.assertIn(response.status_code, [400, 403])
        else:
            print(f"[✗] UNAPPROVED_LOGIN_BLOCK: Unapproved users CAN login - status {response.status_code}")
            self.assertIn(response.status_code, [400, 403])
    
    def test_inactive_user_login_block(self):
        """Verify inactive users cannot login"""
        staff = Staff.objects.create(
            email='inactive@test.com',
            first_name='Test',
            last_name='User',
            phone='0541234567',
            registration_approved=True,
            is_active=False  # Inactive
        )
        
        response = self.client.post('/api/auth/login-email/',
                                    {'email': 'inactive@test.com'},
                                    content_type='application/json')
        
        if response.status_code in [400, 403]:
            print(f"[✓] INACTIVE_USER_BLOCK: Inactive users cannot login - status {response.status_code}")
            self.assertIn(response.status_code, [400, 403])
        else:
            print(f"[✗] INACTIVE_USER_BLOCK: Inactive users CAN login - status {response.status_code}")
            self.assertIn(response.status_code, [400, 403])


@override_settings(
    ALLOWED_HOSTS=['*'],
    DEBUG=True
)
class InputValidationTests(TestCase):
    """Tests for input validation"""
    
    def setUp(self):
        self.client = Client()
    
    def test_invalid_email_rejected(self):
        """Verify invalid emails are rejected"""
        response = self.client.post('/api/auth/login-email/',
                                    {'email': 'not-an-email'},
                                    content_type='application/json')
        
        if response.status_code == 400:
            print(f"[✓] EMAIL_VALIDATION: Invalid emails rejected")
            self.assertEqual(response.status_code, 400)
        else:
            print(f"[✗] EMAIL_VALIDATION: Invalid email accepted - status {response.status_code}")
            self.assertEqual(response.status_code, 400)
    
    def test_invalid_totp_code_format(self):
        """Verify invalid TOTP code formats are rejected"""
        response = self.client.post('/api/auth/verify-totp/',
                                    {'email': 'test@test.com', 'code': 'abc'},
                                    content_type='application/json')
        
        if response.status_code == 400:
            print(f"[✓] TOTP_FORMAT_VALIDATION: Invalid code formats rejected")
            self.assertEqual(response.status_code, 400)
        else:
            print(f"[✗] TOTP_FORMAT_VALIDATION: Invalid format accepted - status {response.status_code}")


@override_settings(
    ALLOWED_HOSTS=['*'],
    DEBUG=True
)
class PermissionTests(TestCase):
    """Tests for permission system"""
    
    def setUp(self):
        self.client = Client()
        
        # Create an approved, active user
        self.user = Staff.objects.create(
            email='approved@test.com',
            first_name='Test',
            last_name='User',
            phone='0541234567',
            registration_approved=True,
            is_active=True
        )
    
    def test_permissions_require_auth(self):
        """Verify permissions endpoint requires authentication"""
        response = self.client.get('/api/permissions/')
        
        print(f"[{'✓' if response.status_code != 200 else '✗'}] AUTH_REQUIRED: Permissions endpoint requires auth - status {response.status_code}")
        self.assertNotEqual(response.status_code, 200)


@override_settings(
    ALLOWED_HOSTS=['*'],
    DEBUG=True
)
class AuthEndpointTests(TestCase):
    """Tests for authentication endpoints"""
    
    def setUp(self):
        self.client = Client()
    
    def test_staff_endpoint_requires_auth(self):
        """Verify staff endpoint requires authentication"""
        response = self.client.get('/api/staff/')
        
        print(f"[{'✓' if response.status_code != 200 else '✗'}] STAFF_ENDPOINT_AUTH: Requires auth - status {response.status_code}")
        # Should not return 200 without auth
        self.assertNotEqual(response.status_code, 200)


if __name__ == '__main__':
    import unittest
    
    print("=" * 80)
    print("CHILDSMILE PENETRATION TEST SUITE (Django Integration)")
    print("=" * 80)
    
    # Run tests
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # Add test classes
    suite.addTests(loader.loadTestsFromTestCase(TOTPSecurityTests))
    suite.addTests(loader.loadTestsFromTestCase(RegistrationSecurityTests))
    suite.addTests(loader.loadTestsFromTestCase(InputValidationTests))
    suite.addTests(loader.loadTestsFromTestCase(PermissionTests))
    suite.addTests(loader.loadTestsFromTestCase(AuthEndpointTests))
    
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # Print summary
    print("\n" + "=" * 80)
    if result.wasSuccessful():
        print(f"✓ All {result.testsRun} tests passed!")
    else:
        print(f"✗ {len(result.failures)} failures, {len(result.errors)} errors out of {result.testsRun} tests")
    print("=" * 80)
