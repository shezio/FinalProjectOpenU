#!/bin/zsh
# Test script for WhatsApp account activation notifications
# Handles virtual environment activation and runs the test
# REQUIRED ARGUMENTS: phone number and staff name

set -e  # Exit on error

echo "=========================================="
echo "WhatsApp Account Activation Test"
echo "=========================================="

# Check if arguments are provided
if [ $# -lt 2 ]; then
    echo ""
    echo "❌ ERROR: Missing required arguments!"
    echo "=========================================="
    echo ""
    echo "Usage:"
    echo "  $0 <phone_number> <staff_name>"
    echo ""
    echo "Example:"
    echo "  $0 +972542652949 'John Doe'"
    echo ""
    echo "⚠️  This test sends CRITICAL account activation messages."
    echo "   Phone number and staff name are REQUIRED to prevent accidental sends!"
    echo ""
    echo "=========================================="
    exit 1
fi

PHONE="$1"
NAME="$2"

echo "📱 Test Phone: $PHONE"
echo "👤 Test Name: $NAME"
echo ""

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR/childsmile"

echo "Script directory: $SCRIPT_DIR"
echo "Project directory: $PROJECT_DIR"

# Find and activate virtual environment
VENV_PATHS=(
    "$PROJECT_DIR/.venv"
    "$PROJECT_DIR/venv"
    "$PROJECT_DIR/myenv"
    "$SCRIPT_DIR/.venv"
    "$SCRIPT_DIR/venv"
)

VENV_ACTIVATED=0
for venv_path in "${VENV_PATHS[@]}"; do
    if [ -d "$venv_path" ] && [ -f "$venv_path/bin/activate" ]; then
        echo "✓ Found virtual environment at: $venv_path"
        source "$venv_path/bin/activate"
        VENV_ACTIVATED=1
        echo "✓ Virtual environment activated"
        break
    fi
done

if [ $VENV_ACTIVATED -eq 0 ]; then
    echo "⚠️  Warning: No virtual environment found"
    echo "   Attempting to run with system Python..."
fi

# Check Python and Django
echo ""
echo "Checking environment..."
python --version
python -c "import django; print('✓ Django version:', django.VERSION)"

# Run the test with phone and name arguments
echo ""
echo "=========================================="
echo "Running Account Activation WhatsApp Tests"
echo "=========================================="
echo ""

cd "$PROJECT_DIR"
python "$SCRIPT_DIR/test_whatsapp_account_activation.py" "$PHONE" "$NAME"

TEST_RESULT=$?

echo ""
echo "=========================================="
if [ $TEST_RESULT -eq 0 ]; then
    echo "✅ All tests completed successfully!"
else
    echo "❌ Tests failed with exit code: $TEST_RESULT"
fi
echo "=========================================="

exit $TEST_RESULT
