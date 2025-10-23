import json
from django.utils import timezone
from django.db import transaction
from .models import AuditLog, Staff
from django.http import JsonResponse

def get_client_ip(request):
    """Get client IP address from request"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip

def get_user_info(request):
    """Extract user information from request"""
    user_id = request.session.get("user_id")
    if not user_id:
        return None, None, [], []
    
    try:
        staff = Staff.objects.get(staff_id=user_id)
        user_roles = [role.role_name for role in staff.roles.all()]
        
        # Simple permission check - you can enhance this based on your permission system
        user_permissions = []
        for role in staff.roles.all():
            if hasattr(role, 'permissions'):
                user_permissions.extend([perm.permission_name for perm in role.permissions.all()])
        
        return staff.email, staff.username, user_roles, user_permissions
    except Staff.DoesNotExist:
        return None, None, [], []

def is_admin(staff):
    """Check if staff member is admin"""
    admin_roles = ['Admin', 'System Administrator', 'SuperAdmin']
    user_roles = [role.role_name for role in staff.roles.all()]
    return any(role in admin_roles for role in user_roles)

def log_api_action(
    request,
    action,
    affected_tables=None,
    entity_type=None,
    entity_ids=None,
    status_code=200,
    success=True,
    error_message=None,
    additional_data=None
):
    """
    Log an API action to the audit log
    
    Args:
        request: Django request object
        action: Action performed (e.g., 'CREATE_STAFF', 'UPDATE_VOLUNTEER')
        affected_tables: List of database tables affected
        entity_type: Type of entity affected (e.g., 'Staff', 'Volunteer')
        entity_ids: List of entity IDs affected
        status_code: HTTP status code
        success: Whether the action was successful
        error_message: Error message if any
        additional_data: Additional context data
    """
    try:
        # Get user information
        user_email, username, user_roles, user_permissions = get_user_info(request)
        
        # If no user found, log as anonymous
        if not user_email:
            user_email = "anonymous"
            username = "anonymous"
            user_roles = []
            user_permissions = []
        
        # Prepare data
        affected_tables = affected_tables or []
        entity_ids = entity_ids or []
        additional_data = additional_data or {}
        
        # Don't log sensitive data
        safe_additional_data = {}
        if additional_data:
            for key, value in additional_data.items():
                # Skip sensitive fields
                if key.lower() not in ['password', 'token', 'secret', 'key']:
                    safe_additional_data[key] = value
        
        # Create audit log entry
        with transaction.atomic():
            AuditLog.objects.create(
                user_email=user_email,
                username=username,
                action=action,
                endpoint=request.path,
                method=request.method,
                affected_tables=affected_tables,
                user_roles=user_roles,
                permissions=user_permissions,
                entity_type=entity_type,
                entity_ids=entity_ids,
                ip_address=get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                status_code=status_code,
                success=success,
                error_message=error_message,
                additional_data=safe_additional_data
            )
    except Exception as e:
        # Log audit failures to Django logs but don't break the main operation
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to create audit log: {str(e)}")

def audit_decorator(action, affected_tables=None, entity_type=None):
    """
    Decorator to automatically log API actions
    
    Usage:
    @audit_decorator('CREATE_STAFF', ['childsmile_app_staff'], 'Staff')
    def create_staff_view(request):
        ...
    """
    def decorator(view_func):
        def wrapper(request, *args, **kwargs):
            try:
                # Execute the view
                response = view_func(request, *args, **kwargs)
                
                # Determine success and extract entity IDs from response
                success = True
                entity_ids = []
                error_message = None
                status_code = getattr(response, 'status_code', 200)
                
                if hasattr(response, 'content'):
                    try:
                        response_data = json.loads(response.content.decode())
                        if 'staff_id' in response_data:
                            entity_ids = [response_data['staff_id']]
                        elif 'id' in response_data:
                            entity_ids = [response_data['id']]
                        
                        if status_code >= 400:
                            success = False
                            error_message = response_data.get('error', 'Unknown error')
                    except:
                        pass
                
                # Log the action
                log_api_action(
                    request=request,
                    action=action,
                    affected_tables=affected_tables,
                    entity_type=entity_type,
                    entity_ids=entity_ids,
                    status_code=status_code,
                    success=success,
                    error_message=error_message
                )
                
                return response
                
            except Exception as e:
                # Log failed action
                log_api_action(
                    request=request,
                    action=action,
                    affected_tables=affected_tables,
                    entity_type=entity_type,
                    success=False,
                    error_message=str(e),
                    status_code=500
                )
                raise
        
        return wrapper
    return decorator