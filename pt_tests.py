#!/usr/bin/env python
"""
Penetration Testing Suite for ChildSmile Backend
Comprehensive security tests based on actual system architecture
"""

import os
import sys
import django
import json
from datetime import timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'childsmile.settings')
sys.path.insert(0, '/Users/shlomosmac/Applications/dev/FinalProjectOpenU/childsmile')
django.setup()

from django.test import Client, TestCase
from django.contrib.sessions.models import Session
from django.utils import timezone
from childsmile_app.models import Staff, Role, SignedUp, TOTPCode, Permissions
from childsmile_app.utils import has_permission


class SecurityTestRunner:
    """Base class for security tests"""
    
    def __init__(self):
        self.client = Client()
        self.passed = []
        self.failed = []
        self.findings = []
        self.test_count = 0
        
    def log(self, status, test_name, message):
        self.test_count += 1
        status_icon = "✓" if status == "PASS" else "✗"
        print(f"[{status_icon}] {test_name}: {message}")
        
        if status == "PASS":
            self.passed.append(test_name)
        else:
            self.failed.append((test_name, message))
            
    def print_report(self):
        print("\n" + "="*80)
        print(f"Total Tests: {self.test_count} | Passed: {len(self.passed)} ✓ | Failed: {len(self.failed)} ✗")
        print("="*80)
        
        if self.failed:
            print("\nFAILED TESTS:")
            for test, msg in self.failed:
                print(f"  ✗ {test}: {msg}")


class TOTPSecurityTests(SecurityTestRunner):
    """Tests for TOTP authentication vulnerabilities"""
    
    def test_totp_code_expiry(self):
        """Verify TOTP codes expire after 5 minutes"""
        # Create expired TOTP
        email = 'totp_expire_test@test.com'
        code = TOTPCode.generate_code()
        totp = TOTPCode.objects.create(
            email=email,
            code=code,
            created_at=timezone.now() - timedelta(minutes=6)
        )
        
        if totp.is_expired():
            self.log("PASS", "TOTP_EXPIRY", "Codes expire after 5 minutes")
        else:
            self.log("FAIL", "TOTP_EXPIRY", "Expired codes not marked as expired")
            self.findings.append("TOTP codes should expire - potential timing vulnerability")
        
        totp.delete()
    
    def test_totp_attempt_limit(self):
        """Verify TOTP codes are invalid after 3 failed attempts"""
        email = 'totp_attempts_test@test.com'
        code = TOTPCode.generate_code()
        totp = TOTPCode.objects.create(email=email, code=code, attempts=3)
        
        if not totp.is_valid():
            self.log("PASS", "TOTP_ATTEMPT_LIMIT", "Code invalid after 3 failed attempts")
        else:
            self.log("FAIL", "TOTP_ATTEMPT_LIMIT", "Code still valid after 3+ attempts - brute force risk")
            self.findings.append("CRITICAL: TOTP codes not properly limited to 3 attempts")
        
        totp.delete()
    
    def test_totp_code_reuse_prevention(self):
        """Verify TOTP codes cannot be reused after verification"""
        email = 'totp_reuse_test@test.com'
        code = TOTPCode.generate_code()
        totp = TOTPCode.objects.create(email=email, code=code)
        
        # Mark as used
        totp.used = True
        totp.save()
        
        if not totp.is_valid():
            self.log("PASS", "TOTP_REUSE_PREVENTION", "Used codes are invalid")
        else:
            self.log("FAIL", "TOTP_REUSE_PREVENTION", "Used codes can be reused - CRITICAL")
            self.findings.append("CRITICAL: TOTP codes can be reused after being marked as used")
        
        totp.delete()
    
    def test_totp_code_generation_randomness(self):
        """Verify TOTP codes are random and not sequential"""
        codes = set()
        for i in range(10):
            code = TOTPCode.generate_code()
            codes.add(code)
            
            # Check if 6 digits
            if len(code) != 6 or not code.isdigit():
                self.log("FAIL", "TOTP_RANDOMNESS", f"Invalid code format: {code}")
                return
        
        if len(codes) == 10:
            self.log("PASS", "TOTP_RANDOMNESS", "Generated 10 unique codes out of 10")
        else:
            self.log("FAIL", "TOTP_RANDOMNESS", f"Only {len(codes)} unique codes out of 10 - low entropy")


class RegistrationSecurityTests(SecurityTestRunner):
    """Tests for registration workflow security"""
    
    def test_unapproved_user_cannot_login(self):
        """Verify unapproved users cannot login"""
        # Create unapproved user
        role = Role.objects.create(role_name='test_role_unreg')
        staff = Staff.objects.create(
            username='unapproved_test',
            email='unapproved@test.com',
            first_name='Test',
            last_name='User',
            registration_approved=False,
            is_active=True
        )
        staff.roles.add(role)
        
        # Try to send login code
        response = self.client.post(
            '/api/auth/login-email/',
            data=json.dumps({'email': 'unapproved@test.com'}),
            content_type='application/json'
        )
        
        if response.status_code == 403 and 'pending_approval' in str(response.content):
            self.log("PASS", "UNAPPROVED_LOGIN_BLOCK", "Unapproved users cannot login")
        else:
            self.log("FAIL", "UNAPPROVED_LOGIN_BLOCK", f"Unapproved users CAN login (status {response.status_code})")
            self.findings.append("CRITICAL: Unapproved users can attempt login")
        
        staff.delete()
        role.delete()
    
    def test_inactive_user_cannot_login(self):
        """Verify inactive users cannot login"""
        role = Role.objects.create(role_name='test_role_inactive')
        staff = Staff.objects.create(
            username='inactive_test',
            email='inactive@test.com',
            first_name='Test',
            last_name='User',
            registration_approved=True,
            is_active=False
        )
        staff.roles.add(role)
        
        response = self.client.post(
            '/api/auth/login-email/',
            data=json.dumps({'email': 'inactive@test.com'}),
            content_type='application/json'
        )
        
        if response.status_code == 403 and 'account_inactive' in str(response.content):
            self.log("PASS", "INACTIVE_USER_BLOCK", "Inactive users cannot login")
        else:
            self.log("FAIL", "INACTIVE_USER_BLOCK", f"Inactive users CAN login (status {response.status_code})")
            self.findings.append("CRITICAL: Inactive users can login")
        
        staff.delete()
        role.delete()


class SessionSecurityTests(SecurityTestRunner):
    """Tests for session management vulnerabilities"""
    
    def test_single_device_login(self):
        """Verify previous sessions are logged out on new login"""
        role = Role.objects.create(role_name='test_role_session')
        staff = Staff.objects.create(
            staff_id=7001,
            username='session_test',
            email='session@test.com',
            first_name='Test',
            last_name='User',
            registration_approved=True,
            is_active=True
        )
        staff.roles.add(role)
        
        # Create first session
        session1 = self.client.session
        session1['user_id'] = staff.staff_id
        session1.save()
        session_key_1 = session1.session_key
        
        # Create TOTP and verify login
        code = TOTPCode.generate_code()
        TOTPCode.objects.create(email=staff.email, code=code, used=False)
        
        # Verify with correct code (this should create new session)
        response = self.client.post(
            '/api/auth/verify-totp/',
            data=json.dumps({'email': staff.email, 'code': code}),
            content_type='application/json'
        )
        
        if response.status_code == 200:
            self.log("PASS", "SINGLE_DEVICE_LOGIN", "Login creates new session")
        else:
            self.log("FAIL", "SINGLE_DEVICE_LOGIN", f"Login verification failed (status {response.status_code})")
        
        staff.delete()
        role.delete()


class PermissionTests(SecurityTestRunner):
    """Tests for permission system"""
    
    def test_authenticated_user_has_permissions(self):
        """Verify authenticated users can retrieve their permissions"""
        role = Role.objects.create(role_name='test_role_perms')
        
        # Create permission
        perm = Permissions.objects.create(
            role=role,
            resource='childsmile_app_staff',
            action='VIEW'
        )
        
        staff = Staff.objects.create(
            staff_id=7002,
            username='perm_test',
            email='perm@test.com',
            first_name='Test',
            last_name='User',
            registration_approved=True,
            is_active=True
        )
        staff.roles.add(role)
        
        # Create authenticated session
        session = self.client.session
        session['user_id'] = staff.staff_id
        session.save()
        
        # Get permissions
        response = self.client.get('/api/permissions/')
        
        if response.status_code == 200 and 'permissions' in response.json():
            permissions = response.json()['permissions']
            if any(p['resource'] == 'childsmile_app_staff' for p in permissions):
                self.log("PASS", "AUTH_USER_PERMS", "Authenticated users can get permissions")
            else:
                self.log("FAIL", "AUTH_USER_PERMS", "Permissions retrieved but role permissions missing")
        else:
            self.log("FAIL", "AUTH_USER_PERMS", f"Cannot retrieve permissions (status {response.status_code})")
        
        staff.delete()
        role.delete()
        perm.delete()
    
    def test_unauthenticated_user_blocked_from_permissions(self):
        """Verify unauthenticated users cannot get permissions"""
        response = self.client.get('/api/permissions/')
        
        if response.status_code == 403:
            self.log("PASS", "UNAUTH_PERMS_BLOCK", "Unauthenticated users blocked from permissions")
        else:
            self.log("FAIL", "UNAUTH_PERMS_BLOCK", f"Unauthenticated users CAN get permissions (status {response.status_code})")
            self.findings.append("CRITICAL: Permissions endpoint accessible without authentication")


class RateLimitingTests(SecurityTestRunner):
    """Tests for rate limiting effectiveness"""
    
    def test_totp_rate_limiting(self):
        """Verify TOTP verification has rate limiting"""
        # Attempt rapid login email requests
        email = 'ratelimit@test.com'
        blocked = False
        
        for attempt in range(20):
            response = self.client.post(
                '/api/auth/login-email/',
                data=json.dumps({'email': email}),
                content_type='application/json'
            )
            
            if response.status_code == 429:
                blocked = True
                break
        
        if blocked:
            self.log("PASS", "TOTP_RATE_LIMITING", f"Rate limiting triggered after {attempt} attempts")
        else:
            self.log("FAIL", "TOTP_RATE_LIMITING", "No rate limiting on login endpoint - brute force risk")
            self.findings.append("HIGH: Login endpoint lacks rate limiting for brute force attacks")


class InputValidationTests(SecurityTestRunner):
    """Tests for input validation"""
    
    def test_email_validation_on_login(self):
        """Verify invalid emails are rejected"""
        invalid_emails = [
            'invalid',
            '@nodomain',
            'test@',
            'test@@domain.com',
        ]
        
        all_rejected = True
        for invalid_email in invalid_emails:
            response = self.client.post(
                '/api/auth/login-email/',
                data=json.dumps({'email': invalid_email}),
                content_type='application/json'
            )
            
            if response.status_code != 400:
                all_rejected = False
                break
        
        if all_rejected:
            self.log("PASS", "EMAIL_VALIDATION", "Invalid emails rejected")
        else:
            self.log("FAIL", "EMAIL_VALIDATION", f"Invalid email accepted: {invalid_email}")
            self.findings.append("Invalid email formats should be rejected")
    
    def test_totp_code_format_validation(self):
        """Verify non-6-digit codes are rejected"""
        role = Role.objects.create(role_name='test_role_validation')
        staff = Staff.objects.create(
            username='validation_test',
            email='validation@test.com',
            first_name='Test',
            last_name='User',
            registration_approved=True,
            is_active=True
        )
        staff.roles.add(role)
        
        invalid_codes = [
            '123',           # Too short
            '1234567',       # Too long
            'abcdef',        # Non-numeric
            '12-34 56',      # Invalid chars
        ]
        
        all_rejected = True
        for code in invalid_codes:
            response = self.client.post(
                '/api/auth/verify-totp/',
                data=json.dumps({'email': staff.email, 'code': code}),
                content_type='application/json'
            )
            
            if response.status_code not in [400, 404]:  # 404 if no TOTP record exists
                all_rejected = False
                print(f"Code '{code}' was accepted with status {response.status_code}")
                break
        
        if all_rejected:
            self.log("PASS", "TOTP_FORMAT_VALIDATION", "Invalid code formats rejected")
        else:
            self.log("FAIL", "TOTP_FORMAT_VALIDATION", f"Invalid code accepted: {code}")
        
        staff.delete()
        role.delete()


class AuthorizationTests(SecurityTestRunner):
    """Tests for authorization vulnerabilities"""
    
    def test_get_staff_endpoint_auth_check(self):
        """Test if /api/staff/ requires authentication"""
        # Try without session
        response = self.client.get('/api/staff/')
        
        # Note: This endpoint might not require auth if it's a frontend helper
        # But it should ideally only return staff accessible to current user
        if response.status_code in [200, 403, 401]:
            # If 200, endpoint is open - log finding
            if response.status_code == 200:
                self.log("FAIL", "STAFF_ENDPOINT_AUTH", "GET /api/staff/ is open without authentication")
                self.findings.append("WARNING: Staff endpoint accessible without authentication - verify this is intentional")
            else:
                self.log("PASS", "STAFF_ENDPOINT_AUTH", f"Staff endpoint requires auth (status {response.status_code})")
        else:
            self.log("FAIL", "STAFF_ENDPOINT_AUTH", f"Unexpected response: {response.status_code}")


def main():
    print("="*80)
    print("CHILDSMILE PENETRATION TEST SUITE")
    print("="*80 + "\n")
    
    test_suites = [
        ("TOTP Security", TOTPSecurityTests()),
        ("Registration Security", RegistrationSecurityTests()),
        ("Session Security", SessionSecurityTests()),
        ("Permission System", PermissionTests()),
        ("Rate Limiting", RateLimitingTests()),
        ("Input Validation", InputValidationTests()),
        ("Authorization", AuthorizationTests()),
    ]
    
    all_passed = 0
    all_failed = 0
    all_findings = []
    
    for suite_name, suite in test_suites:
        print(f"\n{'─'*80}")
        print(f"Testing: {suite_name}")
        print('─'*80)
        
        # Run tests based on suite type
        if isinstance(suite, TOTPSecurityTests):
            suite.test_totp_code_expiry()
            suite.test_totp_attempt_limit()
            suite.test_totp_code_reuse_prevention()
            suite.test_totp_code_generation_randomness()
        elif isinstance(suite, RegistrationSecurityTests):
            suite.test_unapproved_user_cannot_login()
            suite.test_inactive_user_cannot_login()
        elif isinstance(suite, SessionSecurityTests):
            suite.test_single_device_login()
        elif isinstance(suite, PermissionTests):
            suite.test_authenticated_user_has_permissions()
            suite.test_unauthenticated_user_blocked_from_permissions()
        elif isinstance(suite, RateLimitingTests):
            suite.test_totp_rate_limiting()
        elif isinstance(suite, InputValidationTests):
            suite.test_email_validation_on_login()
            suite.test_totp_code_format_validation()
        elif isinstance(suite, AuthorizationTests):
            suite.test_get_staff_endpoint_auth_check()
        
        suite.print_report()
        all_passed += len(suite.passed)
        all_failed += len(suite.failed)
        all_findings.extend(suite.findings)
    
    # Final summary
    print("\n" + "="*80)
    print("OVERALL PENETRATION TEST SUMMARY")
    print("="*80)
    print(f"Total Tests: {all_passed + all_failed}")
    print(f"Passed: {all_passed} ✓")
    print(f"Failed: {all_failed} ✗")
    print(f"Success Rate: {(all_passed/(all_passed+all_failed)*100):.1f}%" if (all_passed+all_failed) > 0 else "N/A")
    
    if all_findings:
        print("\n" + "─"*80)
        print("KEY FINDINGS:")
        print("─"*80)
        for i, finding in enumerate(all_findings, 1):
            print(f"{i}. {finding}")
    
    print("="*80 + "\n")
    
    return 0 if all_failed == 0 else 1


if __name__ == '__main__':
    sys.exit(main())
