# childsmile/childsmile_app/audit_views.py
from django.http import JsonResponse, HttpResponse
from django.core.paginator import Paginator
from rest_framework.decorators import api_view
from django.db.models import Q, Count
from django.utils.dateparse import parse_datetime
from django.utils import timezone
from datetime import timedelta
from .models import AuditLog, Staff
from .audit_utils import is_admin, log_api_action
from .logger import api_logger
import csv
import json

@api_view(['GET'])
def get_audit_logs(request):
    api_logger.info("get_audit_logs called")
    """
    API endpoint for admin to view audit logs with filtering and pagination
    Query parameters:
    - page: Page number
    - page_size: Number of records per page
    - user_email: Filter by user email
    - action: Filter by action
    - start_date: Filter from date (ISO format)
    - end_date: Filter to date (ISO format)
    - entity_type: Filter by entity type
    - success: Filter by success status (true/false)
    """
    try:
        # Check permissions
        user_id = request.session.get("user_id")
        if not user_id:
            return JsonResponse({"error": "Authentication required"}, status=401)
        
        # Only admins can view audit logs
        staff = Staff.objects.get(staff_id=user_id)
        if not is_admin(staff):
            return JsonResponse({"error": "Admin permission required"}, status=403)
        
        # Start with all logs
        queryset = AuditLog.objects.all()
        
        # Apply filters
        user_email = request.GET.get('user_email')
        if user_email:
            queryset = queryset.filter(user_email__icontains=user_email)
        
        action = request.GET.get('action')
        if action:
            queryset = queryset.filter(action__icontains=action)
        
        start_date = request.GET.get('start_date')
        if start_date:
            start_date = parse_datetime(start_date)
            if start_date:
                queryset = queryset.filter(timestamp__gte=start_date)
        
        end_date = request.GET.get('end_date')
        if end_date:
            end_date = parse_datetime(end_date)
            if end_date:
                queryset = queryset.filter(timestamp__lte=end_date)
        
        entity_type = request.GET.get('entity_type')
        if entity_type:
            queryset = queryset.filter(entity_type=entity_type)
        
        success = request.GET.get('success')
        if success is not None:
            success_bool = success.lower() == 'true'
            queryset = queryset.filter(success=success_bool)
        
        # Pagination
        page = int(request.GET.get('page', 1))
        page_size = min(int(request.GET.get('page_size', 50)), 100)  # Max 100 records
        
        paginator = Paginator(queryset, page_size)
        page_obj = paginator.get_page(page)
        
        # Serialize results
        logs = []
        for log in page_obj:
            logs.append({
                'audit_id': log.audit_id,
                'user_email': log.user_email,
                'username': log.username,
                'timestamp': log.timestamp.isoformat(),
                'action': log.action,
                'endpoint': log.endpoint,
                'method': log.method,
                'affected_tables': log.affected_tables,
                'user_roles': log.user_roles,
                'entity_type': log.entity_type,
                'entity_ids': log.entity_ids,
                'ip_address': log.ip_address,
                'status_code': log.status_code,
                'success': log.success,
                'error_message': log.error_message,
            })
        
        return JsonResponse({
            'logs': logs,
            'pagination': {
                'page': page,
                'page_size': page_size,
                'total_pages': paginator.num_pages,
                'total_count': paginator.count,
                'has_next': page_obj.has_next(),
                'has_previous': page_obj.has_previous(),
            }
        })
        
    except Exception as e:
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

@api_view(['GET'])
def export_audit_logs(request):
    api_logger.info("export_audit_logs called")
    """
    API endpoint for admin to export audit logs as CSV
    Same filtering options as get_audit_logs
    """
    try:
        # Check permissions
        user_id = request.session.get("user_id")
        if not user_id:
            return JsonResponse({"error": "Authentication required"}, status=401)
        
        staff = Staff.objects.get(staff_id=user_id)
        if not is_admin(staff):
            return JsonResponse({"error": "Admin permission required"}, status=403)
        
        # Start with all logs
        queryset = AuditLog.objects.all()
        
        # Apply same filters as get_audit_logs
        user_email = request.GET.get('user_email')
        if user_email:
            queryset = queryset.filter(user_email__icontains=user_email)
        
        action = request.GET.get('action')
        if action:
            queryset = queryset.filter(action__icontains=action)
        
        start_date = request.GET.get('start_date')
        if start_date:
            start_date = parse_datetime(start_date)
            if start_date:
                queryset = queryset.filter(timestamp__gte=start_date)
        
        end_date = request.GET.get('end_date')
        if end_date:
            end_date = parse_datetime(end_date)
            if end_date:
                queryset = queryset.filter(timestamp__lte=end_date)
        
        entity_type = request.GET.get('entity_type')
        if entity_type:
            queryset = queryset.filter(entity_type=entity_type)
        
        success = request.GET.get('success')
        if success is not None:
            success_bool = success.lower() == 'true'
            queryset = queryset.filter(success=success_bool)
        
        # Limit export to prevent massive files
        max_export = 10000
        if queryset.count() > max_export:
            return JsonResponse({
                "error": f"Export limited to {max_export} records. Please apply filters to reduce the dataset."
            }, status=400)
        
        # Create CSV response
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="audit_logs_{timezone.now().strftime("%Y%m%d_%H%M%S")}.csv"'
        
        writer = csv.writer(response)
        
        # Write header
        writer.writerow([
            'Audit ID', 'User Email', 'Username', 'Timestamp', 'Action', 
            'Endpoint', 'Method', 'Affected Tables', 'User Roles', 
            'Entity Type', 'Entity IDs', 'IP Address', 'Status Code', 
            'Success', 'Error Message'
        ])
        
        # Write data
        for log in queryset.order_by('-timestamp'):
            writer.writerow([
                log.audit_id,
                log.user_email,
                log.username,
                log.timestamp.isoformat(),
                log.action,
                log.endpoint,
                log.method,
                ', '.join(log.affected_tables),
                ', '.join(log.user_roles),
                log.entity_type or '',
                ', '.join(map(str, log.entity_ids)),
                log.ip_address or '',
                log.status_code or '',
                'Yes' if log.success else 'No',
                log.error_message or ''
            ])
        
        return response
        
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