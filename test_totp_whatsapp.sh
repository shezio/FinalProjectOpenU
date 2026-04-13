#!/bin/bash

# WhatsApp TOTP Code Test Script
# Tests sending TOTP codes via WhatsApp to a phone number
#
# Usage:
#   ./test_totp_whatsapp.sh 0501234567              # Random 6-digit code
#   ./test_totp_whatsapp.sh 0501234567 654321       # Specific code

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "=================================================="
echo "  WhatsApp TOTP Code Test"
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

echo -e "${GREEN}Running TOTP test...${NC}"
echo ""

# Run the Python test script
cd "$SCRIPT_DIR"

python test_totp_whatsapp.py "$@"

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
    echo "  1. Check WhatsApp on the phone number"
    echo "  2. Verify you received the TOTP code message"
    echo "  3. Verify code matches what was sent"
    echo "  4. Verify message format is correct"
    echo ""
    echo -e "${YELLOW}💡 Troubleshooting:${NC}"
    echo "  • If no message received: Check Twilio credentials"
    echo "  • If phone format wrong: Try with country code +972..."
    echo "  • If template not used: Check TOTP_LOGIN_SID env var"
    echo ""
else
    echo -e "${RED}"
    echo "=================================================="
    echo "  ❌ Test failed!"
    echo "=================================================="
    echo -e "${NC}"
    exit $TEST_EXIT_CODE
fi
