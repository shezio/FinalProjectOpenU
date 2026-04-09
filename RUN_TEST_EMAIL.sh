#!/bin/bash
# ============================================================================
# HOW TO RUN THE TEST COORDINATOR EMAIL SCRIPT
# ============================================================================

# Option 1: Using the project's virtual environment (RECOMMENDED)
# ============================================================================

cd /Users/shlomosmac/Applications/dev/FinalProjectOpenU

# Activate the venv
source childsmile/myenv/bin/activate

# Run the test script
python test_coordinator_email.py

# Deactivate when done
deactivate


# ============================================================================
# What the script does:
# ============================================================================
# 1. Uses the EXACT HTML from coordinator_utils.py (lines 125-195)
# 2. Sends a test email to: shlezi0@gmail.com (change TEST_EMAIL in the script)
# 3. Uses your Django email backend (same as production)
# 4. Shows success/failure and debugging info

# ============================================================================
# To customize the test email:
# ============================================================================
# Edit test_coordinator_email.py and change these variables:
#   TEST_EMAIL = "your-address@example.com"
#   COORDINATOR_NAME = "שם הקואורדינטור"
#   USER_FULL_NAME = "שם המשתמש"
#   USER_EMAIL = "user@example.com"
#   USER_ID = "123456789"
#   USER_AGE = "28"
#   USER_GENDER = "זכר" or "נקבה"
#   USER_PHONE = "054-2652949"
#   USER_CITY = "תל אביב"
#   USER_WANTS_TUTOR = True or False
#   CREATED_AT = "09/04/2026 בשעה 14:30"

# Then run:
#   python test_coordinator_email.py
