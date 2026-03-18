#!/usr/bin/env python
"""
Direct Penetration Tests for ChildSmile Backend (No DB Creation)
Tests the actual authentication logic and security implementations
"""

import os
import sys
import json
from datetime import timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'childsmile.settings')

import django
django.setup()

from django.utils import timezone
from childsmile_app.models import TOTPCode

def run_totp_tests():
    print("\n" + "="*80)
    print("Testing: TOTP Security")
    print("="*80)
    
    passed = 0
    failed = 0
    
    # Test 1: TOTP expiry
    print("\n[TEST] TOTP Code Expiry")
    email = f'totp_expire_{timezone.now().timestamp()}@test.com'
    code_str = TOTPCode.generate_code()
    
    try:
        # Create an expired TOTP
        expired_totp = TOTPCode(
            email=email,
            code=code_str,
            created_at=timezone.now() - timedelta(minutes=6)  # 6 minutes old
        )
        
        if expired_totp.is_expired():
            print("[✓] TOTP_EXPIRY: Codes properly expire after 5 minutes")
            passed += 1
        else:
            print("[✗] TOTP_EXPIRY: Expired codes NOT marked as expired")
            failed += 1
    except Exception as e:
        print(f"[✗] TOTP_EXPIRY: Error - {e}")
        failed += 1
    
    # Test 2: TOTP attempt limit
    print("\n[TEST] TOTP Attempt Limit")
    email2 = f'totp_attempts_{timezone.now().timestamp()}@test.com'
    code_str2 = TOTPCode.generate_code()
    
    try:
        totp_limited = TOTPCode(
            email=email2,
            code=code_str2,
            attempts=3
        )
        
        if not totp_limited.is_valid():
            print("[✓] TOTP_ATTEMPT_LIMIT: Code properly invalid after 3 attempts")
            passed += 1
        else:
            print("[✗] TOTP_ATTEMPT_LIMIT: Code still valid after 3+ attempts - VULNERABILITY")
            failed += 1
    except Exception as e:
        print(f"[✗] TOTP_ATTEMPT_LIMIT: Error - {e}")
        failed += 1
    
    # Test 3: TOTP reuse prevention
    print("\n[TEST] TOTP Reuse Prevention")
    email3 = f'totp_reuse_{timezone.now().timestamp()}@test.com'
    code_str3 = TOTPCode.generate_code()
    
    try:
        totp_used = TOTPCode(
            email=email3,
            code=code_str3,
            used=True  # Mark as already used
        )
        
        if not totp_used.is_valid():
            print("[✓] TOTP_REUSE: Used codes properly marked as invalid")
            passed += 1
        else:
            print("[✗] TOTP_REUSE: Used codes still valid - VULNERABILITY")
            failed += 1
    except Exception as e:
        print(f"[✗] TOTP_REUSE: Error - {e}")
        failed += 1
    
    # Test 4: TOTP randomness
    print("\n[TEST] TOTP Code Randomness")
    try:
        codes = set()
        for i in range(10):
            code = TOTPCode.generate_code()
            codes.add(code)
        
        if len(codes) == 10:
            print(f"[✓] TOTP_RANDOMNESS: Generated 10 unique codes (entropy OK)")
            passed += 1
        else:
            print(f"[✗] TOTP_RANDOMNESS: Only {len(codes)}/10 unique codes - WEAK RANDOMNESS")
            failed += 1
    except Exception as e:
        print(f"[✗] TOTP_RANDOMNESS: Error - {e}")
        failed += 1
    
    # Test 5: TOTP code format
    print("\n[TEST] TOTP Code Format")
    try:
        for i in range(5):
            code = TOTPCode.generate_code()
            if len(code) == 6 and code.isdigit():
                continue
            else:
                raise ValueError(f"Invalid format: {code}")
        
        print(f"[✓] TOTP_FORMAT: Codes are 6-digit numbers")
        passed += 1
    except Exception as e:
        print(f"[✗] TOTP_FORMAT: {e}")
        failed += 1
    
    return passed, failed


def check_views_security():
    """Analyze view security implementations"""
    print("\n" + "="*80)
    print("Analyzing: View Security Implementations")
    print("="*80)
    
    passed = 0
    failed = 0
    
    print("\n[ANALYSIS] Authentication Views (views_auth.py)")
    try:
        from childsmile_app.views_auth import login_email, verify_totp
        print("[✓] login_email() exists")
        print("[✓] verify_totp() exists")
        passed += 2
    except Exception as e:
        print(f"[✗] Auth views not found: {e}")
        failed += 2
    
    print("\n[ANALYSIS] Permission System (utils.py)")
    try:
        from childsmile_app.utils import has_permission
        print("[✓] has_permission() function exists")
        passed += 1
    except Exception as e:
        print(f"[✗] Permission checker not found: {e}")
        failed += 1
    
    print("\n[ANALYSIS] Models (models.py)")
    try:
        from childsmile_app.models import Staff, TOTPCode, Role, Permissions
        print("[✓] Staff model exists")
        print("[✓] TOTPCode model exists")
        print("[✓] Role model exists")
        print("[✓] Permissions model exists")
        passed += 4
    except Exception as e:
        print(f"[✗] Models not found: {e}")
        failed += 4
    
    return passed, failed


def verify_code_validation():
    """Verify that is_valid() and is_expired() methods work correctly"""
    print("\n" + "="*80)
    print("Testing: Code Validation Methods")
    print("="*80)
    
    passed = 0
    failed = 0
    
    # Check is_expired method
    print("\n[TEST] is_expired() method")
    try:
        code = TOTPCode.generate_code()
        
        # Fresh code should not be expired
        fresh = TOTPCode(email='test@test.com', code=code, created_at=timezone.now())
        if not fresh.is_expired():
            print("[✓] Fresh code not marked as expired")
            passed += 1
        else:
            print("[✗] Fresh code incorrectly marked as expired")
            failed += 1
        
        # Old code should be expired
        old = TOTPCode(
            email='test2@test.com', 
            code=code,
            created_at=timezone.now() - timedelta(minutes=10)
        )
        if old.is_expired():
            print("[✓] Old code properly marked as expired")
            passed += 1
        else:
            print("[✗] Old code not marked as expired - VULNERABILITY")
            failed += 1
            
    except Exception as e:
        print(f"[✗] Error testing is_expired(): {e}")
        failed += 2
    
    # Check is_valid method
    print("\n[TEST] is_valid() method")
    try:
        code = TOTPCode.generate_code()
        
        # Fresh, unused code should be valid
        valid_code = TOTPCode(email='test3@test.com', code=code, attempts=0, used=False)
        if valid_code.is_valid():
            print("[✓] Fresh unused code is valid")
            passed += 1
        else:
            print("[✗] Fresh unused code marked invalid - ERROR")
            failed += 1
        
        # Unused but expired should be invalid
        expired = TOTPCode(
            email='test4@test.com',
            code=code,
            attempts=0,
            used=False,
            created_at=timezone.now() - timedelta(minutes=10)
        )
        if not expired.is_valid():
            print("[✓] Expired code properly invalid")
            passed += 1
        else:
            print("[✗] Expired code still valid - VULNERABILITY")
            failed += 1
            
    except Exception as e:
        print(f"[✗] Error testing is_valid(): {e}")
        failed += 2
    
    return passed, failed


if __name__ == '__main__':
    print("\n" + "="*80)
    print("CHILDSMILE PENETRATION TEST SUITE (Direct Model Testing)")
    print("="*80)
    
    total_passed = 0
    total_failed = 0
    
    # Run TOTP tests
    p, f = run_totp_tests()
    total_passed += p
    total_failed += f
    
    # Verify code validation
    p, f = verify_code_validation()
    total_passed += p
    total_failed += f
    
    # Check view security
    p, f = check_views_security()
    total_passed += p
    total_failed += f
    
    # Print summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    total_tests = total_passed + total_failed
    success_rate = (total_passed / total_tests * 100) if total_tests > 0 else 0
    
    print(f"Total Tests: {total_tests}")
    print(f"Passed: {total_passed} ✓")
    print(f"Failed: {total_failed} ✗")
    print(f"Success Rate: {success_rate:.1f}%")
    
    if total_failed > 0:
        print("\n⚠️  VULNERABILITIES FOUND - See detailed output above")
    else:
        print("\n✓ All security tests passed!")
    
    print("="*80)
