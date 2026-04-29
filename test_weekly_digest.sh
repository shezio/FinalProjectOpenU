#!/bin/bash
# ─────────────────────────────────────────────────────────────────
# test_weekly_digest.sh
# Send a real weekly digest email to yourself for local testing.
#
# Usage:
#   ./test_weekly_digest.sh                        # sends to YOUR_EMAIL below
#   ./test_weekly_digest.sh your@email.com         # override from CLI
#   ./test_weekly_digest.sh --dry-run              # just print HTML, no send
# ─────────────────────────────────────────────────────────────────

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DJANGO_DIR="$SCRIPT_DIR/childsmile"

# ── Default test recipient — change this to your email ──────────
DEFAULT_EMAIL="shlomosmac@gmail.com"

cd "$DJANGO_DIR"

# Activate virtualenv if present
if [ -f "myenv/bin/activate" ]; then
    source myenv/bin/activate
fi

ARG="${1:-}"

if [ "$ARG" = "--dry-run" ]; then
    echo "🔍 DRY RUN — building digest HTML (no email sent)..."
    python manage.py send_weekly_digest --dry-run | tee /tmp/digest_preview.html
    echo ""
    echo "📄 HTML saved to /tmp/digest_preview.html"
    echo "   Open with: open /tmp/digest_preview.html"
elif [ -n "$ARG" ]; then
    echo "📤 Sending test digest to: $ARG"
    python manage.py send_weekly_digest --to "$ARG"
else
    echo "📤 Sending test digest to: $DEFAULT_EMAIL"
    python manage.py send_weekly_digest --to "$DEFAULT_EMAIL"
fi
