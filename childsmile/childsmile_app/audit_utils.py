# childsmile/childsmile_app/audit_utils.py
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

def generate_audit_description(user_email, username, action, timestamp, user_roles, success, error_message, 
                              entity_type=None, entity_ids=None, report_name=None, additional_data=None):
    """Generate human-readable description for audit log"""
    
    # Format timestamp to dd/mm/yyyy HH:MM:SS
    timestamp_formatted = timestamp.strftime('%d/%m/%Y %H:%M:%S')
    
    # Format roles
    roles_text = ', '.join(user_roles) if user_roles else 'No roles'
    
    # Success/failure text
    success_text = "successful" if success else "failure"
    
    # **ENHANCED DESCRIPTIONS FOR SPECIFIC ACTIONS**
    if action == 'TOTP_VERIFICATION_SUCCESS' and additional_data:
        user_full_name = additional_data.get('user_full_name', f'{username}')
        attempts_used = additional_data.get('code_attempts_used', 1)
        verification_method = additional_data.get('verification_method', 'TOTP')
        
        description = f"User {user_full_name} ({user_email}) successfully verified their identity using {verification_method} on {timestamp_formatted}. "
        description += f"The verification required {attempts_used} attempt(s). "
        description += f"User roles: [{roles_text}]. This is a security verification step before login completion."
        
    elif action == 'USER_LOGIN_SUCCESS' and additional_data:
        user_full_name = additional_data.get('user_full_name', f'{username}')
        login_method = additional_data.get('login_method', 'Unknown')
        session_duration = additional_data.get('session_duration_hours', 24)
        
        description = f"User {user_full_name} ({user_email}) successfully logged into the system on {timestamp_formatted} using {login_method}. "
        description += f"Session duration: {session_duration} hours. User roles: [{roles_text}]. "
        description += f"Login process completed successfully."
    
    elif action == 'GOOGLE_LOGIN_FAILED' and additional_data:
        attempted_email = additional_data.get('attempted_email', user_email)
        login_method = additional_data.get('login_method', 'Google OAuth')
        
        if attempted_email and attempted_email != 'anonymous':
            if username and username != 'anonymous':
                description = f"User {username} ({attempted_email}) failed to log in using {login_method} on {timestamp_formatted}. "
            else:
                description = f"Entity with email {attempted_email} attempted to log in using {login_method} on {timestamp_formatted}. "
            
            description += f"Login failed with error: {error_message or 'Unknown error'}. "
            description += f"This could indicate an unauthorized access attempt or non-existent user."
        else:
            description = f"Anonymous entity attempted Google login on {timestamp_formatted}. "
            description += f"Login failed with error: {error_message or 'Unknown error'}."
    
    elif action == 'GOOGLE_LOGIN_SUCCESS' and additional_data:
        user_full_name = additional_data.get('user_full_name', f'{username}')
        login_method = additional_data.get('login_method', 'Google OAuth')
        
        description = f"User {user_full_name} ({user_email}) successfully logged into the system on {timestamp_formatted} using {login_method}. "
        description += f"User roles: [{roles_text}]. Google OAuth authentication completed successfully."
    
    # **NEW: ENHANCED USER REGISTRATION SUCCESS**
    elif action == 'USER_REGISTRATION_SUCCESS' and additional_data:
        registration_email = additional_data.get('email', user_email)
        registered_username = additional_data.get('username', 'Unknown')
        registration_type = additional_data.get('registration_type', 'unknown')
        
        # Use the actual registration data instead of anonymous
        description = f"New user {registered_username} with email {registration_email} successfully registered in the system on {timestamp_formatted}. "
        description += f"Registration type: {registration_type.replace('_', ' ').title()}. "
        
        if entity_type and entity_ids:
            description += f"Created {entity_type} record with ID: {', '.join(map(str, entity_ids))}. "
        
        description += f"Account creation completed successfully."
    
    # **NEW: ENHANCED USER REGISTRATION FAILED**
    elif action == 'USER_REGISTRATION_FAILED' and additional_data:
        attempted_email = additional_data.get('attempted_email', user_email)
        
        if attempted_email and attempted_email != 'anonymous':
            description = f"Registration attempt for email {attempted_email} failed on {timestamp_formatted}. "
        else:
            description = f"Anonymous registration attempt failed on {timestamp_formatted}. "
        
        description += f"Registration failed with error: {error_message or 'Unknown error'}. "
        description += f"This could indicate duplicate email, invalid data, or system error."
    
    # **NEW: ENHANCED STAFF CREATION SUCCESS/FAILED**
    elif action == 'CREATE_STAFF_SUCCESS' and additional_data:
        staff_email = additional_data.get('created_staff_email', 'Unknown')
        assigned_roles = additional_data.get('assigned_roles', [])
        step = additional_data.get('step', 'completed')
        
        if step == 'totp_sent':
            description = f"Admin {username} ({user_email}) initiated staff account creation for {staff_email} on {timestamp_formatted}. "
            description += f"Verification code sent to new staff member. "
            description += f"Target roles: [{', '.join(assigned_roles)}]. "
            description += f"Admin roles: [{roles_text}]."
        else:
            description = f"Admin {username} ({user_email}) successfully created staff account for {staff_email} on {timestamp_formatted}. "
            description += f"Assigned roles: [{', '.join(assigned_roles)}]. "
            description += f"Admin roles: [{roles_text}]. "
            
            if entity_type and entity_ids:
                description += f"Created {entity_type} record with ID: {', '.join(map(str, entity_ids))}."
    
    elif action == 'CREATE_STAFF_FAILED' and additional_data:
        target_email = additional_data.get('target_email', additional_data.get('attempted_email', 'Unknown'))
        
        description = f"Admin {username or 'Unknown'} ({user_email}) failed to create staff account for {target_email} on {timestamp_formatted}. "
        description += f"Creation failed with error: {error_message or 'Unknown error'}. "
        description += f"Admin roles: [{roles_text}]."
    
    # **ENHANCED VOLUNTEER/TUTOR CREATION**
    elif action in ['CREATE_VOLUNTEER_SUCCESS', 'CREATE_PENDING_TUTOR_SUCCESS'] and additional_data:
        volunteer_email = additional_data.get('volunteer_email', additional_data.get('tutor_email', 'Unknown'))
        first_name = additional_data.get('first_name', 'Unknown')
        surname = additional_data.get('surname', 'Unknown')
        
        entity_name = 'Volunteer' if 'VOLUNTEER' in action else 'Pending Tutor'
        
        description = f"New {entity_name} {first_name} {surname} ({volunteer_email}) was successfully created on {timestamp_formatted}. "
        
        if entity_type and entity_ids:
            description += f"Created {entity_type} record with ID: {', '.join(map(str, entity_ids))}. "
        
        description += f"{entity_name} account setup completed successfully."
    
    elif action in ['CREATE_VOLUNTEER_FAILED', 'CREATE_PENDING_TUTOR_FAILED'] and additional_data:
        attempted_email = additional_data.get('attempted_email', 'Unknown')
        entity_name = 'Volunteer' if 'VOLUNTEER' in action else 'Pending Tutor'
        
        description = f"Failed to create {entity_name} account for email {attempted_email} on {timestamp_formatted}. "
        description += f"Creation failed with error: {error_message or 'Unknown error'}."
        
    elif action.startswith('EXPORT_REPORT_') and additional_data:
        report_name_detail = additional_data.get('report_name', report_name or 'Unknown Report')
        export_format = additional_data.get('export_format', 'Unknown')
        record_count = additional_data.get('record_count', 0)
        contains_pii = additional_data.get('contains_pii', False)
        
        description = f"User {username} ({user_email}) {success_text}ly exported report '{report_name_detail}' in {export_format} format on {timestamp_formatted}. "
        description += f"Export contained {record_count} records. "
        description += f"Contains personal data: {'Yes' if contains_pii else 'No'}. "
        description += f"User roles: [{roles_text}]."
        
        if not success and error_message:
            description += f" Export failed with error: {error_message}."
    
    # **FALLBACK TO ORIGINAL FORMAT FOR COMPATIBILITY**
    else:
        # Base description (original format for backward compatibility)
        description = f"User {username} with email {user_email} performed action {action} on {timestamp_formatted}. The user had the following roles: [{roles_text}]. The action was {success_text}."
        
        # Add error message if failure
        if not success and error_message:
            description += f" The error message was: {error_message}."
        
        # Add entity information if available
        if entity_type and entity_ids:
            entity_text = f"{entity_type} (IDs: {', '.join(map(str, entity_ids))})"
            description += f" Affected entity: {entity_text}."
        
        # Add report name if applicable
        if report_name:
            description += f" Report: {report_name}."
    
    return description

def log_api_action(
    request,
    action,
    affected_tables=None,
    entity_type=None,
    entity_ids=None,
    report_name=None,  
    status_code=200,
    success=True,
    error_message=None,
    additional_data=None
):
    """
    Log an API action to the audit log - ENHANCED with better descriptions
    """
    try:
        # Get user information
        user_email, username, user_roles, user_permissions = get_user_info(request)
        
        # **ENHANCED: Handle special cases for registration and other anonymous actions**
        attempted_email = None
        if additional_data:
            attempted_email = additional_data.get('attempted_email') or additional_data.get('email')
        
        # Handle different scenarios for anonymous users
        if not user_email:
            if action in ['USER_REGISTRATION_SUCCESS', 'USER_REGISTRATION_FAILED'] and attempted_email:
                # For registration, use the registration email as the user_email for audit
                user_email = attempted_email
                username = ""  # Empty string for new registrations
            elif attempted_email and attempted_email != 'unknown':
                # For other failed attempts (like login failures)
                user_email = attempted_email
                username = ""
            else:
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
        
        # **ENHANCED DESCRIPTION GENERATION**
        description = generate_audit_description(
            user_email=user_email,
            username=username,
            action=action,
            timestamp=timezone.now(),
            user_roles=user_roles,
            success=success,
            error_message=error_message,
            entity_type=entity_type,
            entity_ids=entity_ids,
            report_name=report_name,
            additional_data=safe_additional_data
        )
        
        # Create audit log entry
        with transaction.atomic():
            AuditLog.objects.create(
                user_email=user_email,  # This will now contain the registration email
                username=username,      # This will be empty string for registrations
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
                additional_data=safe_additional_data,
                description=description,  # Enhanced description
                report_name=report_name   
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