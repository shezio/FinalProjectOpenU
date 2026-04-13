#!/bin/bash

# WhatsApp Registration Approval Test Script
# Tests sending all three registration approval flow messages via WhatsApp to verify the integration works
#
# Usage:
#   ./test_whatsapp_registration_approval.sh "054-YOUR-NUMBER"
#   ./test_whatsapp_registration_approval.sh "0541234567"
#   ./test_whatsapp_registration_approval.sh "+972541234567"

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if phone number is provided
if [ -z "$1" ]; then
    echo -e "${RED}❌ Error: Phone number required${NC}"
    echo -e "${BLUE}Usage: $0 <phone_number>${NC}"
    echo ""
    echo -e "${YELLOW}Examples:${NC}"
    echo "  $0 054-YOUR-NUMBER"
    echo "  $0 0541234567"
    echo "  $0 +972541234567"
    exit 1
fi

PHONE_NUMBER="$1"

echo -e "${BLUE}"
echo "=================================================="
echo "  WhatsApp Registration Approval Test"
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
    elif [ -d "./.venv" ]; then
        echo -e "${GREEN}Found virtual environment at .venv${NC}"
        source "./.venv/bin/activate"
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

echo -e "${GREEN}Running WhatsApp registration approval test...${NC}"
echo ""

# Run the Python test script
cd "$SCRIPT_DIR"

python test_whatsapp_registration_approval.py --phone "$PHONE_NUMBER"

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
    echo "  1. Check WhatsApp on the phone number: $PHONE_NUMBER"
    echo "  2. Verify you received 3 registration approval messages:"
    echo "     • Coordinator Approval (Tier 1)"
    echo "     • Final Admin Approval (Tier 2)"
    echo "     • Registration Rejection"
    echo ""
    echo -e "${YELLOW}💡 Message Types:${NC}"
    echo "  • Coordinator: WhatsApp group link invitation"
    echo "  • Final: System access confirmation"
    echo "  • Rejection: Registration denied notice"
    echo ""
else
    echo -e "${RED}"
    echo "=================================================="
    echo "  ❌ Test failed!"
    echo "=================================================="
    echo -e "${NC}"
    exit $TEST_EXIT_CODE
fi
