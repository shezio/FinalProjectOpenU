#!/bin/bash

# WhatsApp Family Notification Test Script
# Tests sending WhatsApp messages about new families to verify the integration works
#
# Usage:
#   ./test_whatsapp_family.sh "054-2652949"
#   ./test_whatsapp_family.sh "0542652949"
#   ./test_whatsapp_family.sh "+972542652949"

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

PHONE_NUMBER=$1

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo -e "${BLUE}"
echo "=================================================="
echo "  WhatsApp Family Notification Test"
echo "=================================================="
echo -e "${NC}"

echo -e "${GREEN}Starting test...${NC}"
echo "Phone: $PHONE_NUMBER"
echo ""

# Check if we're in a virtual environment
if [ -z "$VIRTUAL_ENV" ]; then
    echo -e "${YELLOW}⚠️  No virtual environment detected${NC}"
    echo "Checking for .venv..."
    
    if [ -d "$SCRIPT_DIR/childsmile/myenv" ]; then
        echo -e "${GREEN}Found virtual environment at childsmile/myenv${NC}"
        source "$SCRIPT_DIR/childsmile/myenv/bin/activate"
        echo -e "${GREEN}✅ Activated virtual environment${NC}"
    elif [ -d "$SCRIPT_DIR/venv" ]; then
        echo -e "${GREEN}Found virtual environment at venv${NC}"
        source "$SCRIPT_DIR/venv/bin/activate"
        echo -e "${GREEN}✅ Activated virtual environment${NC}"
    else
        echo -e "${YELLOW}⚠️  Could not find virtual environment${NC}"
        echo "If using venv, activate it first:"
        echo "  source childsmile/myenv/bin/activate"
    fi
else
    echo -e "${GREEN}✅ Virtual environment already active: $VIRTUAL_ENV${NC}"
fi

echo ""
echo -e "${BLUE}Running test script...${NC}"
echo ""

# Run the Python test script
cd "$SCRIPT_DIR"
python test_whatsapp_family.py --phone "$PHONE_NUMBER"

TEST_RESULT=$?

echo ""
if [ $TEST_RESULT -eq 0 ]; then
    echo -e "${GREEN}=================================================="
    echo "  ✅ Test Completed Successfully"
    echo "=================================================="
    echo -e "${NC}"
else
    echo -e "${RED}=================================================="
    echo "  ❌ Test Failed"
    echo "=================================================="
    echo -e "${NC}"
fi

exit $TEST_RESULT
