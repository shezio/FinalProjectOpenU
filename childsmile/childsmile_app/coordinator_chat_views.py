"""
coordinator_chat_views.py - Coordinator messaging interface for admins

Endpoints:
  GET    /api/coordinator-chat/conversations/     - list all coordinator conversations
  GET    /api/coordinator-chat/<coordinator_id>/  - get conversation history with coordinator
  POST   /api/coordinator-chat/<coordinator_id>/  - send message to coordinator
  POST   /api/coordinator-chat/send-to-many/      - send message to multiple coordinators
  POST   /api/coordinator-chat/send-all/          - send message to all coordinators
  POST   /api/coordinator-chat/send-notification/ - send templated weekly notification
"""

import json
import os
from datetime import datetime, timedelta
from django.http import JsonResponse
from rest_framework.decorators import api_view
from django.utils import timezone
from django.db.models import Q

from .models import Staff, CoordinatorChatMessage, Role
from .audit_utils import is_admin
from .logger import api_logger
from .utils import conditional_csrf
from .whatsapp_utils import send_whatsapp_message


def _get_staff(request):
    user_id = request.session.get("user_id")
    if not user_id:
        return None
    try:
        return Staff.objects.get(staff_id=user_id)
    except Staff.DoesNotExist:
        return None


def _message_to_dict(msg):
    """Convert CoordinatorChatMessage to dict."""
    return {
        "id": msg.id,
        "coordinator_id": msg.coordinator.staff_id,
        "sender_type": msg.sender_type,
        "sender_id": msg.sender_id,
        "message_text": msg.message_text,
        "is_read": msg.is_read,
        "created_at": msg.created_at.isoformat(),
    }


@conditional_csrf
@api_view(["GET"])
def coordinator_conversations_list(request):
    """
    GET: List all coordinator conversations (grouped by coordinator)
    Shows latest message, unread count, coordinator info
    Any admin can access, messages are sent/received by ליאם אביבי
    """
    try:
        # Check feature flag
        if not os.getenv('WEEKLY_COORDINATOR_REPORTS_ENABLED', 'true').lower() in ('true', '1', 'yes'):
            return JsonResponse({
                "error": "Feature disabled",
                "message": "Coordinator chat feature is currently disabled"
            }, status=503)
        
        staff = _get_staff(request)
        if not staff:
            return JsonResponse({"error": "Unauthorized"}, status=401)
        if not is_admin(staff):
            return JsonResponse({"error": "Forbidden (admins only)"}, status=403)

        # Get all coordinators (even without messages yet) - for manual send UI
        # Include all staff with roles containing "Coordinator" (staff can be created from System Management, not just registration)
        # Exclude: דריה מקורה and דביר החמוד
        exclude_names = [
            ('דריה', 'מקורה'),
            ('דביר', 'החמוד'),
        ]
        
        all_coordinators = Staff.objects.filter(
            roles__role_name__icontains='Coordinator',
            is_active=True
        ).distinct().order_by('first_name', 'last_name')
        
        # Filter out excluded coordinators
        for first, last in exclude_names:
            all_coordinators = all_coordinators.exclude(first_name=first, last_name=last)

        coordinator_count = all_coordinators.count()
        api_logger.debug(f"[COORDINATOR_CHAT] Found {coordinator_count} coordinators with roles containing 'Coordinator'")
        
        # Debug: Log available role names in DB (DEBUG level only for security)
        all_roles = Role.objects.all().values_list('role_name', flat=True).distinct()
        api_logger.debug(f"[COORDINATOR_CHAT] All roles in DB: {list(all_roles)}")

        conversations = []
        for coordinator in all_coordinators:
            try:
                messages = CoordinatorChatMessage.objects.filter(
                    coordinator=coordinator
                ).order_by('-created_at')

                last_message = messages.first()
                unread_count = messages.filter(is_read=False, sender_type='coordinator').count()

                conversations.append({
                    "coordinator_id": coordinator.staff_id,
                    "coordinator_name": f"{coordinator.first_name} {coordinator.last_name}",
                    "coordinator_phone": coordinator.staff_phone or "",
                    "last_message": _message_to_dict(last_message) if last_message else None,
                    "unread_count": unread_count,
                    "total_messages": messages.count(),
                    "has_messages": messages.exists(),
                })
            except Exception as e:
                api_logger.error(f"[COORDINATOR_CHAT] Error processing coordinator {coordinator.staff_id}: {str(e)}")
                continue

        # Sort by unread count (desc) then by last message time (desc)
        try:
            conversations.sort(key=lambda x: (
                -x['unread_count'],
                -(datetime.fromisoformat(x['last_message']['created_at']).timestamp() if x['last_message'] and x['last_message'].get('created_at') else 0)
            ))
        except Exception as sort_error:
            api_logger.warning(f"[COORDINATOR_CHAT] Error sorting conversations: {str(sort_error)}")
            # Continue without sorting if there's an error

        return JsonResponse({
            "conversations": conversations,
            "total_coordinators": len(conversations),
            "total_unread": sum(c['unread_count'] for c in conversations),
        })
    except Exception as e:
        api_logger.error(f"[COORDINATOR_CHAT] Unexpected error in coordinator_conversations_list: {str(e)}", exc_info=True)
        return JsonResponse({"error": f"Server error: {str(e)}"}, status=500)


@conditional_csrf
@api_view(["GET"])
def coordinator_chat_history(request, coordinator_id):
    """
    GET: Get full chat history with specific coordinator
    Query params:
      - limit: max messages to return (default 100)
      - offset: pagination offset (default 0)
    Any admin can view, messages are sent/received by ליאם אביבי
    """
    # Check feature flag
    if not os.getenv('WEEKLY_COORDINATOR_REPORTS_ENABLED', 'true').lower() in ('true', '1', 'yes'):
        return JsonResponse({
            "error": "Feature disabled",
            "message": "Coordinator chat feature is currently disabled"
        }, status=503)
    
    staff = _get_staff(request)
    if not staff:
        return JsonResponse({"error": "Unauthorized"}, status=401)
    if not is_admin(staff):
        return JsonResponse({"error": "Forbidden (admins only)"}, status=403)

    # Get coordinator
    try:
        coordinator = Staff.objects.get(staff_id=coordinator_id)
    except Staff.DoesNotExist:
        return JsonResponse({"error": "Coordinator not found"}, status=404)

    # Get messages
    limit = int(request.GET.get('limit', 100))
    offset = int(request.GET.get('offset', 0))

    messages = CoordinatorChatMessage.objects.filter(
        coordinator=coordinator
    ).order_by('-created_at')[offset:offset+limit]

    # Mark coordinator messages as read
    unread_coordinator_msgs = CoordinatorChatMessage.objects.filter(
        coordinator=coordinator,
        sender_type='coordinator',
        is_read=False
    )
    unread_coordinator_msgs.update(is_read=True)

    # Get coordinator's role for background theming
    coordinator_role = coordinator.roles.filter(
        role_name__icontains='Coordinator'
    ).first()
    role_name = coordinator_role.role_name if coordinator_role else ""

    return JsonResponse({
        "coordinator": {
            "id": coordinator.staff_id,
            "name": f"{coordinator.first_name} {coordinator.last_name}",
            "phone": coordinator.staff_phone or "",
            "email": coordinator.email or "",
            "role": role_name,
        },
        "messages": [_message_to_dict(m) for m in reversed(messages)],
        "total_count": CoordinatorChatMessage.objects.filter(coordinator=coordinator).count(),
        "offset": offset,
        "limit": limit,
    })


@conditional_csrf
@api_view(["POST"])
def send_message_to_coordinator(request, coordinator_id):
    """
    POST: Send message to single coordinator via WhatsApp
    Body: {"message": "text to send"}
    Any admin can send, but message is always recorded as FROM ליאם אביבי
    """
    staff = _get_staff(request)
    if not staff:
        return JsonResponse({"error": "Unauthorized"}, status=401)
    if not is_admin(staff):
        return JsonResponse({"error": "Forbidden (admins only)"}, status=403)

    # Check feature flag
    if not os.getenv('WEEKLY_COORDINATOR_REPORTS_ENABLED', 'true').lower() in ('true', '1', 'yes'):
        return JsonResponse({
            "error": "Feature disabled",
            "message": "Weekly coordinator reports feature is currently disabled"
        }, status=503)

    try:
        coordinator = Staff.objects.get(staff_id=coordinator_id)
    except Staff.DoesNotExist:
        return JsonResponse({"error": "Coordinator not found"}, status=404)

    try:
        data = json.loads(request.body)
        message_text = data.get('message', '').strip()
        # Accept reply_to_id from frontend but don't store it (UI-only for now)
        reply_to_id = data.get('reply_to_id')

        if not message_text:
            return JsonResponse({"error": "Message cannot be empty"}, status=400)

        # Get ליאם אביבי (the official sender)
        liam = Staff.objects.filter(first_name="ליאם", last_name="אביבי").first()
        if not liam:
            return JsonResponse({"error": "System admin ליאם אביבי not found"}, status=500)

        # Store message in chat history (admin message) - always from ליאם אביבי
        admin_msg = CoordinatorChatMessage.objects.create(
            coordinator=coordinator,
            sender_type='admin',
            sender_id=liam.staff_id,  # Always ליאם אביבי
            message_text=message_text,
            is_read=True
        )

        # Send via WhatsApp using template (for consistency)
        template_sid = os.getenv('TWILIO_ADMIN_MESSAGE_SID')
        
        if template_sid:
            # Use template if available
            # {{1}} = coordinator name, {{2}} = message text
            result = send_whatsapp_message(
                recipient_phone=coordinator.staff_phone,
                message_body="",  # ignored when using template
                use_template=True,
                template_sid=template_sid,
                template_variables={
                    "1": f"{coordinator.first_name} {coordinator.last_name}",
                    "2": message_text
                }
            )
        else:
            # Fallback to plain text if template not configured
            api_logger.warning("[COORDINATOR_CHAT] TWILIO_ADMIN_MESSAGE_SID not configured, using plain text fallback")
            result = send_whatsapp_message(
                recipient_phone=coordinator.staff_phone,
                message_body=message_text,
                use_template=False
            )

        if not result['success']:
            api_logger.warning(f"[COORDINATOR_CHAT] Failed to send WhatsApp to {coordinator.username}: {result.get('error')}")
            return JsonResponse({
                "error": "Failed to send message",
                "details": result.get('error'),
                "message_id": admin_msg.id
            }, status=500)

        api_logger.info(
            f"[COORDINATOR_CHAT] Admin {staff.username} sent message to {coordinator.username} "
            f"(message_id={admin_msg.id}, whatsapp_sid={result.get('message_sid')}, recorded_from=ליאם אביבי)"
        )

        return JsonResponse({
            "success": True,
            "message_id": admin_msg.id,
            "whatsapp_sid": result.get('message_sid'),
            "message": _message_to_dict(admin_msg)
        })

    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)
    except Exception as e:
        api_logger.error(f"[COORDINATOR_CHAT] Error sending message: {e}")
        return JsonResponse({"error": "Internal error", "details": str(e)}, status=500)


@conditional_csrf
@api_view(["POST"])
def send_message_to_many(request):
    """
    POST: Send same message to multiple coordinators
    Body: {
      "message": "text to send",
      "coordinator_ids": [1, 2, 3]  // array of staff IDs
    }
    Any admin can send, but message is always recorded as FROM ליאם אביבי
    """
    staff = _get_staff(request)
    if not staff:
        return JsonResponse({"error": "Unauthorized"}, status=401)
    if not is_admin(staff):
        return JsonResponse({"error": "Forbidden (admins only)"}, status=403)

    # Check feature flag
    if not os.getenv('WEEKLY_COORDINATOR_REPORTS_ENABLED', 'true').lower() in ('true', '1', 'yes'):
        return JsonResponse({
            "error": "Feature disabled",
            "message": "Weekly coordinator reports feature is currently disabled"
        }, status=503)

    try:
        data = json.loads(request.body)
        message_text = data.get('message', '').strip()
        coordinator_ids = data.get('coordinator_ids', [])

        if not message_text:
            return JsonResponse({"error": "Message cannot be empty"}, status=400)
        if not coordinator_ids:
            return JsonResponse({"error": "No coordinators selected"}, status=400)

        coordinators = Staff.objects.filter(staff_id__in=coordinator_ids)
        if not coordinators.exists():
            return JsonResponse({"error": "No coordinators found"}, status=404)

        # Get ליאם אביבי (the official sender)
        liam = Staff.objects.filter(first_name="ליאם", last_name="אביבי").first()
        if not liam:
            return JsonResponse({"error": "System admin ליאם אביבי not found"}, status=500)

        results = {
            "sent": [],
            "failed": [],
        }

        for coordinator in coordinators:
            try:
                # Store message in chat history - always from ליאם אביבי
                admin_msg = CoordinatorChatMessage.objects.create(
                    coordinator=coordinator,
                    sender_type='admin',
                    sender_id=liam.staff_id,  # Always ליאם אביבי
                    message_text=message_text,
                    is_read=True
                )

                # Send via WhatsApp using template (for consistency)
                template_sid = os.getenv('TWILIO_ADMIN_MESSAGE_SID')
                
                if template_sid:
                    # {{1}} = coordinator name, {{2}} = message text
                    result = send_whatsapp_message(
                        recipient_phone=coordinator.staff_phone,
                        message_body="",
                        use_template=True,
                        template_sid=template_sid,
                        template_variables={
                            "1": f"{coordinator.first_name} {coordinator.last_name}",
                            "2": message_text
                        }
                    )
                else:
                    result = send_whatsapp_message(
                        recipient_phone=coordinator.staff_phone,
                        message_body=message_text,
                        use_template=False
                    )

                if result['success']:
                    results['sent'].append({
                        "coordinator_id": coordinator.staff_id,
                        "coordinator_name": f"{coordinator.first_name} {coordinator.last_name}",
                        "message_id": admin_msg.id,
                        "whatsapp_sid": result.get('message_sid')
                    })
                else:
                    results['failed'].append({
                        "coordinator_id": coordinator.staff_id,
                        "coordinator_name": f"{coordinator.first_name} {coordinator.last_name}",
                        "error": result.get('error')
                    })

            except Exception as e:
                api_logger.error(f"[COORDINATOR_CHAT] Error sending to {coordinator.username}: {e}")
                results['failed'].append({
                    "coordinator_id": coordinator.staff_id,
                    "coordinator_name": f"{coordinator.first_name} {coordinator.last_name}",
                    "error": str(e)
                })

        api_logger.info(
            f"[COORDINATOR_CHAT] Admin {staff.username} sent messages to {len(results['sent'])} coordinators "
            f"(success={len(results['sent'])}, failed={len(results['failed'])}, recorded_from=ליאם אביבי)"
        )

        return JsonResponse({
            "success": True,
            "total_coordinators": len(coordinators),
            "results": results
        })

    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)
    except Exception as e:
        api_logger.error(f"[COORDINATOR_CHAT] Error in send_to_many: {e}")
        return JsonResponse({"error": "Internal error", "details": str(e)}, status=500)


@conditional_csrf
@api_view(["DELETE"])
def delete_message(request, message_id):
    """
    DELETE: Delete a message from chat history
    Only admins can delete messages
    """
    staff = _get_staff(request)
    if not staff:
        return JsonResponse({"error": "Unauthorized"}, status=401)
    if not is_admin(staff):
        return JsonResponse({"error": "Forbidden (admins only)"}, status=403)

    # Check feature flag
    if not os.getenv('WEEKLY_COORDINATOR_REPORTS_ENABLED', 'true').lower() in ('true', '1', 'yes'):
        return JsonResponse({
            "error": "Feature disabled",
            "message": "Coordinator chat feature is currently disabled"
        }, status=503)

    try:
        message = CoordinatorChatMessage.objects.get(id=message_id)
        coordinator_name = f"{message.coordinator.first_name} {message.coordinator.last_name}"
        message.delete()
        
        api_logger.info(
            f"[COORDINATOR_CHAT] Admin {staff.username} deleted message {message_id} "
            f"from conversation with {coordinator_name}"
        )
        
        return JsonResponse({
            "success": True,
            "message_id": message_id,
            "message": "Message deleted"
        })
    except CoordinatorChatMessage.DoesNotExist:
        return JsonResponse({"error": "Message not found"}, status=404)
    except Exception as e:
        api_logger.error(f"[COORDINATOR_CHAT] Error deleting message {message_id}: {e}")
        return JsonResponse({"error": "Internal error", "details": str(e)}, status=500)


@conditional_csrf
@api_view(["POST"])
def send_message_to_all(request):
    """
    POST: Send message to all coordinators
    Body: {"message": "text to send"}
    Any admin can send, but message is always recorded as FROM ליאם אביבי
    """
    staff = _get_staff(request)
    if not staff:
        return JsonResponse({"error": "Unauthorized"}, status=401)
    if not is_admin(staff):
        return JsonResponse({"error": "Forbidden (admins only)"}, status=403)

    # Check feature flag
    if not os.getenv('WEEKLY_COORDINATOR_REPORTS_ENABLED', 'true').lower() in ('true', '1', 'yes'):
        return JsonResponse({
            "error": "Feature disabled",
            "message": "Weekly coordinator reports feature is currently disabled"
        }, status=503)

    try:
        data = json.loads(request.body)
        message_text = data.get('message', '').strip()

        if not message_text:
            return JsonResponse({"error": "Message cannot be empty"}, status=400)

        # Get all coordinators using role name icontains 'Coordinator'
        coordinators = Staff.objects.filter(
            roles__role_name__icontains='Coordinator',
            is_active=True,
            registration_approved=True
        ).distinct()

        if not coordinators.exists():
            return JsonResponse({"error": "No coordinators found"}, status=404)

        # Get ליאם אביבי (the official sender)
        liam = Staff.objects.filter(first_name="ליאם", last_name="אביבי").first()
        if not liam:
            return JsonResponse({"error": "System admin ליאם אביבי not found"}, status=500)

        results = {
            "sent": [],
            "failed": [],
        }

        for coordinator in coordinators:
            try:
                # Store message in chat history - always from ליאם אביבי
                admin_msg = CoordinatorChatMessage.objects.create(
                    coordinator=coordinator,
                    sender_type='admin',
                    sender_id=liam.staff_id,  # Always ליאם אביבי
                    message_text=message_text,
                    is_read=True
                )

                # Send via WhatsApp using template (for consistency)
                template_sid = os.getenv('TWILIO_ADMIN_MESSAGE_SID')
                
                if template_sid:
                    # {{1}} = coordinator name, {{2}} = message text
                    result = send_whatsapp_message(
                        recipient_phone=coordinator.staff_phone,
                        message_body="",
                        use_template=True,
                        template_sid=template_sid,
                        template_variables={
                            "1": f"{coordinator.first_name} {coordinator.last_name}",
                            "2": message_text
                        }
                    )
                else:
                    result = send_whatsapp_message(
                        recipient_phone=coordinator.staff_phone,
                        message_body=message_text,
                        use_template=False
                    )

                if result['success']:
                    results['sent'].append({
                        "coordinator_id": coordinator.staff_id,
                        "coordinator_name": f"{coordinator.first_name} {coordinator.last_name}",
                        "message_id": admin_msg.id,
                        "whatsapp_sid": result.get('message_sid')
                    })
                else:
                    results['failed'].append({
                        "coordinator_id": coordinator.staff_id,
                        "coordinator_name": f"{coordinator.first_name} {coordinator.last_name}",
                        "error": result.get('error')
                    })

            except Exception as e:
                api_logger.error(f"[COORDINATOR_CHAT] Error sending to {coordinator.username}: {e}")
                results['failed'].append({
                    "coordinator_id": coordinator.staff_id,
                    "coordinator_name": f"{coordinator.first_name} {coordinator.last_name}",
                    "error": str(e)
                })

        api_logger.info(
            f"[COORDINATOR_CHAT] Admin {staff.username} sent broadcast messages to all coordinators "
            f"(success={len(results['sent'])}, failed={len(results['failed'])}, total={len(coordinators)}, recorded_from=ליאם אביבי)"
        )

        return JsonResponse({
            "success": True,
            "total_coordinators": len(coordinators),
            "results": results
        })

    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)
    except Exception as e:
        api_logger.error(f"[COORDINATOR_CHAT] Error in send_to_all: {e}")
        return JsonResponse({"error": "Internal error", "details": str(e)}, status=500)
