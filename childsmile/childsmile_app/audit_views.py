# childsmile/childsmile_app/audit_views.py
from django.http import JsonResponse, HttpResponse
from django.core.paginator import Paginator
from rest_framework.decorators import api_view
from django.db.models import Q, Count
from django.utils.dateparse import parse_datetime
from django.utils import timezone
from datetime import timedelta
from .models import AuditLog, Staff, AuditTranslation
from .audit_utils import is_admin, log_api_action
from .logger import api_logger
import csv
import json

@api_view(['GET'])
def get_audit_logs(request):
    """
    Get all audit logs with translations
    UI will handle filtering, sorting, and pagination
    """
    api_logger.info("get_audit_logs called")
    
    try:
        # Get all audit logs, ordered by newest first
        logs = AuditLog.objects.all().order_by('-timestamp')
        
        api_logger.debug(f"Fetching all audit logs, total count: {logs.count()}")
        
        # Get all action translations
        translations = {}
        for trans in AuditTranslation.objects.all():
            translations[trans.action] = trans.hebrew_translation
        
        # Format response
        logs_data = []
        for log in logs:
            logs_data.append({
                'id': log.audit_id,
                'user_email': log.user_email,
                'username': log.username,
                'timestamp': log.timestamp,
                'action': log.action,
                'endpoint': log.endpoint,
                'method': log.method,
                'resource': log.affected_tables,
                'user_roles': log.user_roles,
                'permissions': log.permissions,
                'entity_type': log.entity_type,
                'entity_ids': log.entity_ids,
                'ip_address': log.ip_address,
                'user_agent': log.user_agent,
                'status_code': log.status_code,
                'success': log.success,
                'error_message': log.error_message,
                'additional_data': log.additional_data,
                'report_name': log.report_name,
                'description': log.description,
            })
        
        api_logger.info(f"get_audit_logs returned {len(logs_data)} logs with {len(translations)} action translations")
        
        return JsonResponse({
            'audit_logs': logs_data,
            'total_count': len(logs_data),
            'action_translations': translations,  # Add translations to response
        }, status=200)
    
    except Exception as e:
        api_logger.error(f"Error in get_audit_logs: {str(e)}")
        return JsonResponse({"error": str(e)}, status=500)

@api_view(['GET'])
def get_audit_statistics(request):
    api_logger.info("get_audit_statistics called")
    """
    API endpoint for admin to view audit log statistics
    """
    try:
        # Check permissions
        user_id = request.session.get("user_id")
        if not user_id:
            return JsonResponse({"error": "Authentication required"}, status=401)
        
        staff = Staff.objects.get(staff_id=user_id)
        if not is_admin(staff):
            return JsonResponse({"error": "Admin permission required"}, status=403)
        
        # Total logs
        total_logs = AuditLog.objects.count()
        
        # Logs in last 24 hours
        yesterday = timezone.now() - timedelta(days=1)
        recent_logs = AuditLog.objects.filter(timestamp__gte=yesterday).count()
        
        # Failed actions in last 24 hours
        failed_recent = AuditLog.objects.filter(
            timestamp__gte=yesterday,
            success=False
        ).count()
        
        # Top actions
        top_actions = list(AuditLog.objects.values('action').annotate(
            count=Count('action')
        ).order_by('-count')[:10])
        
        # Top users
        top_users = list(AuditLog.objects.values('user_email').annotate(
            count=Count('user_email')
        ).order_by('-count')[:10])
        
        return JsonResponse({
            'total_logs': total_logs,
            'recent_logs': recent_logs,
            'failed_recent': failed_recent,
            'top_actions': top_actions,
            'top_users': top_users,
        })
        
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

from django.views.decorators.csrf import csrf_exempt

@csrf_exempt
@api_view(["POST"])
def audit_action(request):
    api_logger.info("audit_action called")
    """Generic audit endpoint for frontend actions (especially exports)"""
    user_id = request.session.get("user_id")
    if not user_id:
        return JsonResponse({"error": "Not authenticated"}, status=403)
    
    try:
        data = request.data
        
        # Extract report_name for the AuditLog model
        report_name = None
        if 'additional_data' in data and 'report_name' in data['additional_data']:
            report_name = data['additional_data']['report_name']
        
        log_api_action(
            request=request,
            action=data.get('action'),
            success=data.get('success', True),
            error_message=data.get('error_message'),
            status_code=data.get('status_code', 200),
            entity_type=data.get('entity_type', 'Export'),
            entity_ids=data.get('entity_ids', []),
            affected_tables=data.get('affected_tables', []),
            report_name=report_name,  # Pass to audit log
            additional_data=data.get('additional_data', {})
        )
        
        return JsonResponse({"status": "audit_logged"}, status=200)
        
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)