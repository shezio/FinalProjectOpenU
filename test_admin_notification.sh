#!/bin/bash

# WhatsApp Admin Notification Test Script
# Tests sending WhatsApp messages to all System Admins (except בונצל) about new families
#
# Usage:
#   ./test_admin_notification.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "=================================================="
echo "  WhatsApp Admin Notification Test"
echo "=================================================="
echo -e "${NC}"

echo -e "${GREEN}Starting test...${NC}"
echo ""

# Check if we're in a virtual environment
if [ -z "$VIRTUAL_ENV" ]; then
    echo -e "${YELLOW}⚠️  No virtual environment detected${NC}"
    echo "Checking for .venv..."
    
    if [ -d "./childsmile/myenv" ]; then
        echo -e "${GREEN}Found virtual environment at childsmile/myenv${NC}"
        source "./childsmile/myenv/bin/activate"
        echo -e "${GREEN}✅ Activated virtual environment${NC}"
    elif [ -d "./venv" ]; then
        echo -e "${GREEN}Found virtual environment at venv${NC}"
        source "./venv/bin/activate"
        echo -e "${GREEN}✅ Activated virtual environment${NC}"
    else
        echo -e "${RED}❌ No virtual environment found!${NC}"
        echo "Create one with: python -m venv childsmile/myenv"
        exit 1
    fi
    echo ""
fi

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo -e "${GREEN}Running admin notification test...${NC}"
echo ""

# Run the Python test script
cd "$SCRIPT_DIR"

python test_admin_notification.py

# Capture the exit code
TEST_EXIT_CODE=$?

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}"
    echo "=================================================="
    echo "  ✅ Test completed successfully!"
    echo "=================================================="
    echo -e "${NC}"
    echo ""
    echo -e "${BLUE}📋 Next Steps:${NC}"
    echo "  1. Check WhatsApp on all admin phones"
    echo "  2. Verify shlezi0@gmail.com did NOT receive message"
    echo "  3. Verify other admins DID receive the message"
    echo "  4. Verify message format and content is correct"
    echo ""
    echo -e "${YELLOW}💡 Troubleshooting:${NC}"
    echo "  • If no messages received: Check Twilio credentials"
    echo "  • If wrong admin excluded: Check the username filter"
    echo "  • If admin has no phone: Add staff_phone to their profile"
    echo ""
else
    echo -e "${RED}"
    echo "=================================================="
    echo "  ❌ Test failed!"
    echo "=================================================="
    echo -e "${NC}"
    exit $TEST_EXIT_CODE
fi
