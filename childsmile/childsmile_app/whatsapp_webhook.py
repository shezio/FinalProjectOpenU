"""
whatsapp_webhook.py - Incoming webhook handler for Twilio WhatsApp messages

Handles:
  - Incoming messages from coordinators (weekly progress updates)
  - Other incoming messages (for routing if needed later)
"""

import json
from django.http import JsonResponse
from rest_framework.decorators import api_view
from django.utils import timezone
from twilio.request_validator import RequestValidator
import os

from .logger import api_logger
from .weekly_coordinator_reports import handle_coordinator_response
from .utils import conditional_csrf


def validate_twilio_request(request):
    """Validate that request came from Twilio."""
    twilio_auth_token = os.getenv("TWILIO_AUTH_TOKEN", "")
    validator = RequestValidator(twilio_auth_token)
    
    # Get the POST parameters
    url = request.build_absolute_uri()
    post_params = request.POST.dict() if request.method == "POST" else {}
    
    # Validate
    signature = request.META.get("HTTP_X_TWILIO_SIGNATURE", "")
    is_valid = validator.validate(url, post_params, signature)
    
    return is_valid


@conditional_csrf
@api_view(["GET", "POST"])
def whatsapp_incoming(request):
    """
    GET: Health check / validation from Twilio
    POST: Receive incoming WhatsApp message from Twilio
    
    Twilio sends:
      - From: sender phone (e.g., +972512345678)
      - Body: message text
      - MessageSid: unique message ID
      - AccountSid: account ID
    """
    api_logger.info(f"[WHATSAPP_WEBHOOK] Received {request.method} request from {request.META.get('REMOTE_ADDR')}")
    
    # Allow GET for health checks (Twilio validation)
    if request.method == "GET":
        api_logger.info("[WHATSAPP_WEBHOOK] GET request (health check)")
        return JsonResponse({"status": "ok"}, status=200)
    
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    # Check if feature is enabled
    if not os.getenv('WEEKLY_COORDINATOR_REPORTS_ENABLED', 'true').lower() in ('true', '1', 'yes'):
        api_logger.debug("[WHATSAPP_WEBHOOK] Feature disabled (WEEKLY_COORDINATOR_REPORTS_ENABLED=false)")
        return JsonResponse({"status": "ok"}, status=200)  # Still return 200 to prevent Twilio retries

    # Validate Twilio signature
    if not validate_twilio_request(request):
        api_logger.warning(f"[WHATSAPP_WEBHOOK] Invalid signature from {request.POST.get('From')}")
        return JsonResponse({"error": "Invalid signature"}, status=403)

    try:
        sender_phone = request.POST.get("From", "").strip()
        message_body = request.POST.get("Body", "").strip()
        message_sid = request.POST.get("MessageSid", "")

        if not sender_phone or not message_body:
            api_logger.warning("[WHATSAPP_WEBHOOK] Missing From or Body in incoming message")
            return JsonResponse({"error": "Missing required fields"}, status=400)

        api_logger.info(
            f"[WHATSAPP_WEBHOOK] Received message from {sender_phone}: {message_body[:50]}..."
        )

        # Handle the response (store it)
        received_at = timezone.now()
        result = handle_coordinator_response(sender_phone, message_body, received_at)

        if result["success"]:
            api_logger.info(
                f"[WHATSAPP_WEBHOOK] Successfully stored response from {result['coordinator_name']}"
            )
        else:
            api_logger.warning(f"[WHATSAPP_WEBHOOK] Failed to handle response: {result['error']}")

        # Twilio expects 200 OK
        return JsonResponse({"success": True, "message_sid": message_sid}, status=200)

    except Exception as e:
        api_logger.error(f"[WHATSAPP_WEBHOOK] Exception handling incoming message: {e}")
        return JsonResponse({"error": "Internal error"}, status=500)
