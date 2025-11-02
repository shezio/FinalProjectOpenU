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
        
        description = f"Timestamp: {timestamp_formatted}\n"
        description += f"User: {user_full_name}\n"
        description += f"Email: {user_email}\n"
        description += f"Action: Verified identity\n"
        description += f"Method: {verification_method}\n"
        description += f"Attempts used: {attempts_used}\n"
        description += f"Timestamp: {timestamp_formatted}\n"
        description += f"Roles: {roles_text}\n"
        description += f"Type: Security verification"
        
    elif action == 'USER_LOGIN_SUCCESS' and additional_data:
        user_full_name = additional_data.get('user_full_name', f'{username}')
        login_method = additional_data.get('login_method', 'Unknown')
        session_duration = additional_data.get('session_duration_hours', 24)

        description = f"Timestamp: {timestamp_formatted}\n"
        description += f"User: {user_full_name}\n"
        description += f"Email: {user_email}\n"
        description += f"Action: Successfully logged in\n"
        description += f"Method: {login_method}\n"
        description += f"Session duration: {session_duration} hours\n"
        description += f"Timestamp: {timestamp_formatted}\n"
        description += f"Roles: {roles_text}"
    
    elif action == 'GOOGLE_LOGIN_FAILED' and additional_data:
        attempted_email = additional_data.get('attempted_email', user_email)
        login_method = additional_data.get('login_method', 'Google OAuth')

        description = f"Timestamp: {timestamp_formatted}\n" 
        if attempted_email and attempted_email != 'anonymous':
            description += f"User: {username}\n" if username and username != 'anonymous' else ''
            description += f"Email: {attempted_email}\n"
            description += f"Action: Login attempt failed\n"
            description += f"Method: {login_method}\n"
            description += f"Timestamp: {timestamp_formatted}\n"
            description += f"Error: {error_message or 'Unknown error'}"
        else:
            description = f"Action: Anonymous login attempt\n"
            description += f"Method: {login_method}\n"
            description += f"Timestamp: {timestamp_formatted}\n"
            description += f"Error: {error_message or 'Unknown error'}"
    
    elif action == 'GOOGLE_LOGIN_SUCCESS' and additional_data:
        user_full_name = additional_data.get('user_full_name', f'{username}')
        login_method = additional_data.get('login_method', 'Google OAuth')
        
        description = f"Timestamp: {timestamp_formatted}\n"
        description += f"User: {user_full_name}\n"
        description += f"Email: {user_email}\n"
        description += f"Action: Successfully logged in\n"
        description += f"Method: {login_method}\n"
        description += f"Timestamp: {timestamp_formatted}\n"
        description += f"Roles: {roles_text}\n"
        description += f"Status: OAuth verified"
    
    # **NEW: ENHANCED USER REGISTRATION SUCCESS**
    elif action == 'USER_REGISTRATION_SUCCESS' and additional_data:
        registration_email = additional_data.get('email', user_email)
        registered_username = additional_data.get('username', 'Unknown')
        registration_type = additional_data.get('registration_type', 'unknown')
        
        # Use the actual registration data instead of anonymous
        description = f"User: {registered_username}\n"
        description += f"Email: {registration_email}\n"
        description += f"Action: Successfully registered\n"
        description += f"Type: {registration_type.replace('_', ' ').title()}\n"
        description += f"Timestamp: {timestamp_formatted}\n"
        
        if entity_type and entity_ids:
            description += f"Entity: {entity_type} ID\n"
            description += f"Record ID: {', '.join(map(str, entity_ids))}\n"
        
        description += f"Status: Account created"
    
    # **NEW: ENHANCED USER REGISTRATION FAILED**
    elif action == 'USER_REGISTRATION_FAILED' and additional_data:
        attempted_email = additional_data.get('attempted_email', user_email)
        
        if attempted_email and attempted_email != 'anonymous':
            description = f"Email: {attempted_email}\n"
        else:
            description = f"Action: Anonymous registration\n"
        
        description += f"Status: Registration failed\n"
        description += f"Timestamp: {timestamp_formatted}\n"
        description += f"Error: {error_message or 'Unknown error'}"
    
    # **NEW: ENHANCED STAFF CREATION SUCCESS/FAILED**
    elif action == 'CREATE_STAFF_SUCCESS' and additional_data:
        staff_email = additional_data.get('created_staff_email', 'Unknown')
        assigned_roles = additional_data.get('assigned_roles', [])
        step = additional_data.get('step', 'completed')
        
        if step == 'totp_sent':
            description += f"Timestamp: {timestamp_formatted}\n"
            description = f"Admin: {username}\n"
            description += f"Email: {user_email}\n"
            description += f"Action: Created staff account\n"
            description += f"Target email: {staff_email}\n"
            description += f"Status: Verification code sent\n"
            description += f"Roles: {assigned_roles}\n"
            description += f"Admin roles: {roles_text}"
        else:
            description += f"Timestamp: {timestamp_formatted}\n"
            description = f"Admin: {username}\n"
            description += f"Email: {user_email}\n"
            description += f"Action: Created staff account\n"
            description += f"Target email: {staff_email}\n"
            description += f"Assigned roles: {assigned_roles}\n"
            description += f"Admin roles: {roles_text}\n"
            
            if entity_type and entity_ids:
                description += f"Record ID: {', '.join(map(str, entity_ids))}"
    
    elif action == 'CREATE_STAFF_FAILED' and additional_data:
        target_email = additional_data.get('target_email', additional_data.get('attempted_email', 'Unknown'))
        
        description = f"Timestamp: {timestamp_formatted}\n"
        description += f"Admin: {username or 'Unknown'}\n"
        description += f"Email: {user_email}\n"
        description += f"Action: Create staff failed\n"
        description += f"Target: {target_email}\n"
        description += f"Error: {error_message or 'Unknown error'}\n"
        description += f"Admin roles: {roles_text}"
    
    # **ENHANCED VOLUNTEER/TUTOR CREATION**
    elif action in ['CREATE_VOLUNTEER_SUCCESS', 'CREATE_PENDING_TUTOR_SUCCESS'] and additional_data:
        volunteer_email = additional_data.get('volunteer_email', additional_data.get('tutor_email', user_email))
        first_name = additional_data.get('first_name', 'Unknown')
        surname = additional_data.get('surname', 'Unknown')
        created_username = additional_data.get('username', username)
        
        entity_name = 'Volunteer' if 'VOLUNTEER' in action else 'Pending Tutor'
        
        description = f"New {entity_name}\n"
        description += f"{first_name} {surname}\n"
        description += f"Username: {created_username}\n"
        description += f"Email: {volunteer_email}\n"
        description += f"Created on: {timestamp_formatted}\n"
        
        if entity_type and entity_ids:
            description += f"Record ID: {', '.join(map(str, entity_ids))}\n"
        
        description += f"Account setup completed\n"
        description += f"during registration process"
    
    elif action in ['CREATE_VOLUNTEER_FAILED', 'CREATE_PENDING_TUTOR_FAILED'] and additional_data:
        attempted_email = additional_data.get('attempted_email', 'Unknown')
        entity_name = 'Volunteer' if 'VOLUNTEER' in action else 'Pending Tutor'
        
        description = f"Failed to create\n"
        description += f"{entity_name} account for\n"
        description += f"Email: {attempted_email}\n"
        description += f"Date: {timestamp_formatted}\n"
        description += f"Error: {error_message or 'Unknown error'}"
    
    elif action.startswith('EXPORT_REPORT_') and additional_data:
        report_name_detail = additional_data.get('report_name', report_name or 'Unknown Report')
        export_format = additional_data.get('export_format', 'Unknown')
        record_count = additional_data.get('record_count', 0)
        contains_pii = additional_data.get('contains_pii', False)
        
        description = f"Timestamp: {timestamp_formatted}\n"
        description += f"User: {username}\n"
        description += f"Email: {user_email}\n"
        description += f"Action: Exported report\n"
        description += f"Report: {report_name_detail}\n"
        description += f"Format: {export_format}\n"
        description += f"Records: {record_count}\n"
        description += f"Contains PII: {'Yes' if contains_pii else 'No'}\n"
        description += f"Roles: {roles_text}"
        
        if not success and error_message:
            description += f"\nError: {error_message}"
    
    # **NEW: ENHANCED FAMILY MANAGEMENT ACTIONS**
    elif action == 'CREATE_FAMILY_SUCCESS' and additional_data:
        family_name = additional_data.get('family_name', 'Unknown')
        family_city = additional_data.get('family_city', 'Unknown')

        description = f"Timestamp: {timestamp_formatted}\n"
        description += f"User: {username}\n"
        description += f"Email: {user_email}\n"
        description += f"Action: Created family\n"
        description += f"Family name: {family_name}\n"
        description += f"Location: {family_city}\n"
        description += f"Roles: {roles_text}"
        
        if entity_type and entity_ids:
            description += f"\nRecord ID: {', '.join(map(str, entity_ids))}"
    
    elif action == 'UPDATE_FAMILY_SUCCESS' and additional_data:
        updated_name = additional_data.get('updated_family_name', 'Unknown')
        original_name = additional_data.get('original_family_name', 'Unknown')
        family_city = additional_data.get('family_city', 'Unknown')
        field_changes = additional_data.get('field_changes', [])
        changes_count = additional_data.get('changes_count', 0)

        description = f"Timestamp: {timestamp_formatted}\n"
        description += f"User: {username}\n"
        description += f"Email: {user_email}\n"
        description += f"Action: Updated family\n"
        
        if updated_name != original_name:
            description += f"Family: {original_name} → {updated_name}\n"
        else:
            description += f"Family name: {updated_name}\n"
        
        description += f"Location: {family_city}\n"
        description += f"Changes: {changes_count} field(s)\n"
        
        if field_changes:
            for change in field_changes:
                description += f"  • {change}\n"
        
        description += f"Roles: {roles_text}"
        
        if entity_type and entity_ids:
            description += f"\nRecord ID: {', '.join(map(str, entity_ids))}"

    elif action == 'DELETE_FAMILY_SUCCESS' and additional_data:
        deleted_name = additional_data.get('deleted_family_name', 'Unknown')
        family_city = additional_data.get('family_city', 'Unknown')
        family_status = additional_data.get('family_status', 'Unknown')
        family_phone = additional_data.get('family_phone', 'Unknown')
        family_hospital = additional_data.get('family_hospital', 'Unknown')
        medical_diagnosis = additional_data.get('medical_diagnosis', 'Unknown')
        current_medical_state = additional_data.get('current_medical_state', 'Unknown')

        description = f"Timestamp: {timestamp_formatted}\n"
        description += f"User: {username}\n"
        description += f"Email: {user_email}\n"
        description += f"Action: Deleted family\n"
        description += f"Family: {deleted_name}\n"
        description += f"Location: {family_city}\n"
        description += f"Phone: {family_phone}\n"
        description += f"Hospital: {family_hospital}\n"
        description += f"Status: {family_status}\n"
        description += f"Diagnosis: {medical_diagnosis}\n"
        description += f"Medical state: {current_medical_state}\n"
        description += f"Roles: {roles_text}"
        
        if entity_type and entity_ids:
            description += f"\nRecord ID: {', '.join(map(str, entity_ids))}"

    # **ADD CREATE_FAMILY_FAILED**
    elif action == 'CREATE_FAMILY_FAILED' and additional_data:
        family_name = additional_data.get('family_name', 'Unknown')
        
        description = f"Timestamp: {timestamp_formatted}\n"
        description += f"User: {username}\n"
        description += f"Email: {user_email}\n"
        description += f"Action: Failed create family\n"
        description += f"Family: {family_name}\n"
        description += f"Error: {error_message or 'Unknown error'}\n"
        description += f"Roles: {roles_text}"
    
    # **ADD UPDATE_FAMILY_FAILED**
    elif action == 'UPDATE_FAMILY_FAILED' and additional_data:
        family_name = additional_data.get('family_name', 'Unknown')
        attempted_changes = additional_data.get('attempted_changes', [])
        changes_count = additional_data.get('changes_count', 0)

        description = f"Timestamp: {timestamp_formatted}\n"
        description += f"User: {username}\n"
        description += f"Email: {user_email}\n"
        description += f"Action: Failed update family\n"
        description += f"Family: {family_name}\n"
        description += f"Attempted changes: {changes_count}\n"
        
        if attempted_changes:
            for change in attempted_changes:
                description += f"  • {change}\n"
        
        description += f"Error: {error_message or 'Unknown error'}\n"
        description += f"Roles: {roles_text}"
        
        if entity_type and entity_ids:
            description += f"\nChild ID: {', '.join(map(str, entity_ids))}"
    
    # **ADD DELETE_FAMILY_FAILED**
    elif action == 'DELETE_FAMILY_FAILED' and additional_data:
        deleted_name = additional_data.get('deleted_family_name', 'Unknown')
        family_city = additional_data.get('family_city', 'Unknown')
        family_status = additional_data.get('family_status', 'Unknown')
        family_phone = additional_data.get('family_phone', 'Unknown')

        description = f"Timestamp: {timestamp_formatted}\n"
        description += f"User: {username}\n"
        description += f"Email: {user_email}\n"
        description += f"Action: Failed delete family\n"
        description += f"Family: {deleted_name}\n"
        description += f"Location: {family_city}\n"
        description += f"Phone: {family_phone}\n"
        description += f"Status: {family_status}\n"
        description += f"Error: {error_message or 'Unknown error'}\n"
        description += f"Roles: {roles_text}"
        
        if entity_type and entity_ids:
            description += f"\nChild ID: {', '.join(map(str, entity_ids))}"
    
    elif action == 'DELETE_INITIAL_FAMILY_SUCCESS' and additional_data:
        deleted_names = additional_data.get('deleted_family_names', 'Unknown')
        deleted_phones = additional_data.get('deleted_family_phones', 'Unknown')

        description = f"Timestamp: {timestamp_formatted}\n"
        description += f"User: {username}\n"
        description += f"Email: {user_email}\n"
        description += f"Action: Deleted initial family\n"
        description += f"Family names: {deleted_names}\n"
        description += f"Family phones: {deleted_phones}\n"
        description += f"Roles: {roles_text}"
        
        if entity_type and entity_ids:
            description += f"\nRecord ID: {', '.join(map(str, entity_ids))}"

    elif action == 'DELETE_INITIAL_FAMILY_FAILED' and additional_data:
        deleted_names = additional_data.get('deleted_family_names', 'Unknown')
        deleted_phones = additional_data.get('deleted_family_phones', 'Unknown')

        description = f"Timestamp: {timestamp_formatted}\n"
        description += f"User: {username}\n"
        description += f"Email: {user_email}\n"
        description += f"Action: Failed delete initial\n"
        description += f"Family names: {deleted_names}\n"
        description += f"Family phones: {deleted_phones}\n"
        description += f"Error: {error_message or 'Unknown error'}\n"
        description += f"Roles: {roles_text}"
        
        if entity_type and entity_ids:
            description += f"\nRecord ID: {', '.join(map(str, entity_ids))}"

    elif action == 'MARK_FAMILY_ADDED_SUCCESS' and additional_data:
        family_names = additional_data.get('family_names', 'Unknown')
        family_phones = additional_data.get('family_phones', 'Unknown')
        family_added_status = additional_data.get('family_added_status', False)
        
        description = f"Timestamp: {timestamp_formatted}\n"
        description += f"User: {username}\n"
        description += f"Email: {user_email}\n"
        description += f"Action: Marked family added\n"
        description += f"Family names: {family_names}\n"
        description += f"Family phones: {family_phones}\n"
        description += f"Status: {'Yes' if family_added_status else 'No'}\n"
        description += f"Roles: {roles_text}"
        
        if entity_type and entity_ids:
            description += f"\nRecord ID: {', '.join(map(str, entity_ids))}"

    elif action == 'MARK_FAMILY_ADDED_FAILED' and additional_data:
        family_names = additional_data.get('family_names', 'Unknown')
        family_phones = additional_data.get('family_phones', 'Unknown')

        description = f"Timestamp: {timestamp_formatted}\n"
        description += f"User: {username}\n"
        description += f"Email: {user_email}\n"
        description += f"Action: Failed mark family\n"
        description += f"Family names: {family_names}\n"
        description += f"Family phones: {family_phones}\n"
        description += f"Error: {error_message or 'Unknown error'}\n"
        description += f"Roles: {roles_text}"
        
        if entity_type and entity_ids:
            description += f"\nRecord ID: {', '.join(map(str, entity_ids))}"
    
    # **TASK OPERATION DESCRIPTIONS**
    elif action == 'CREATE_TASK_SUCCESS' and additional_data:
        task_type = additional_data.get('task_type', 'Unknown')
        assigned_to_id = additional_data.get('assigned_to_id')
        assigned_to_name = additional_data.get('assigned_to_name', 'Unassigned')

        description = f"Timestamp: {timestamp_formatted}\n"
        description += f"User: {username}\n"
        description += f"Email: {user_email}\n"
        description += f"Action: Created new task\n"
        description += f"Task type: {task_type}\n"
        
        if assigned_to_name and assigned_to_name != 'Unknown':
            description += f"Assigned to: {assigned_to_name}\n"
        else:
            description += f"Status: Currently unassigned\n"
        
        description += f"Roles: {roles_text}"
        
        if entity_type and entity_ids:
            description += f"\nRecord ID: {', '.join(map(str, entity_ids))}"

    elif action == 'CREATE_TASK_FAILED' and additional_data:
        task_type = additional_data.get('task_type', 'Unknown')
        attempted_assigned_to = additional_data.get('attempted_assigned_to')

        description = f"Timestamp: {timestamp_formatted}\n"
        description += f"User: {username}\n"
        description += f"Email: {user_email}\n"
        description += f"Action: Failed create task\n"
        description += f"Task type: {task_type}\n"
        
        if attempted_assigned_to:
            description += f"Attempted assign: {attempted_assigned_to}\n"
        
        description += f"Error: {error_message or 'Unknown error'}\n"
        description += f"Roles: {roles_text}"

    elif action == 'UPDATE_TASK_SUCCESS' and additional_data:
        task_type = additional_data.get('task_type', 'Unknown')
        old_status = additional_data.get('old_status', 'Unknown')
        new_status = additional_data.get('new_status', 'Unknown')
        assigned_to_name = additional_data.get('assigned_to_name', 'Unknown')
        field_changes = additional_data.get('field_changes', [])
        changes_count = additional_data.get('changes_count', 0)

        description = f"Timestamp: {timestamp_formatted}\n"
        description += f"User: {username}\n"
        description += f"Email: {user_email}\n"
        description += f"Action: Updated task\n"
        description += f"Task type: {task_type}\n"
        description += f"Changes: {changes_count} field(s)\n"
        
        if field_changes:
            for change in field_changes:
                description += f"  • {change}\n"

        if assigned_to_name and assigned_to_name != 'Unknown':
            description += f"Assigned to: {assigned_to_name}\n"
        
        description += f"Roles: {roles_text}"
        
        if entity_type and entity_ids:
            description += f"\nRecord ID: {', '.join(map(str, entity_ids))}"

    elif action == 'UPDATE_TASK_FAILED' and additional_data:
        task_type = additional_data.get('task_type', 'Unknown')
        attempted_assigned_to = additional_data.get('attempted_assigned_to')
        new_status = additional_data.get('new_status')
        field_changes = additional_data.get('field_changes', [])
        changes_count = additional_data.get('changes_count', 0)

        description = f"Timestamp: {timestamp_formatted}\n"
        description += f"User: {username}\n"
        description += f"Email: {user_email}\n"
        description += f"Action: Failed update task\n"
        description += f"Task type: {task_type}\n"
        description += f"Attempted changes: {changes_count}\n"
        
        if field_changes:
            for change in field_changes:
                description += f"  • {change}\n"
        
        if new_status:
            description += f"Attempted status: {new_status}\n"
        
        if attempted_assigned_to:
            description += f"Attempted assign: {attempted_assigned_to}\n"
        
        description += f"Error: {error_message or 'Unknown error'}\n"
        description += f"Roles: {roles_text}"
        
        if entity_type and entity_ids:
            description += f"\nRecord ID: {', '.join(map(str, entity_ids))}"

    elif action == 'DELETE_TASK_SUCCESS' and additional_data:
        task_type = additional_data.get('task_type', 'Unknown')
        assigned_to_name = additional_data.get('assigned_to_name', 'Unknown')

        description = f"Timestamp: {timestamp_formatted}\n"
        description += f"User: {username}\n"
        description += f"Email: {user_email}\n"
        description += f"Action: Deleted task\n"
        description += f"Task type: {task_type}\n"
        
        if assigned_to_name and assigned_to_name != 'Unknown':
            description += f"Assigned to: {assigned_to_name}\n"
        else:
            description += f"Status: Task unassigned\n"
        
        description += f"Roles: {roles_text}"
        
        if entity_type and entity_ids:
            description += f"\nRecord ID: {', '.join(map(str, entity_ids))}"

    elif action == 'DELETE_TASK_FAILED' and additional_data:
        task_type = additional_data.get('task_type', 'Unknown')
        assigned_to_name = additional_data.get('assigned_to_name', 'Unknown')
        
        description = f"Timestamp: {timestamp_formatted}\n"
        description += f"User: {username}\n"
        description += f"Email: {user_email}\n"
        description += f"Action: Failed delete task\n"
        description += f"Task type: {task_type}\n"
        
        if assigned_to_name and assigned_to_name != 'Unknown':
            description += f"Assigned to: {assigned_to_name}\n"
        
        description += f"Error: {error_message or 'Unknown error'}\n"
        description += f"Roles: {roles_text}"
        
        if entity_type and entity_ids:
            description += f"\nRecord ID: {', '.join(map(str, entity_ids))}"

    # **VOLUNTEER UPDATE DESCRIPTIONS**
    elif action == 'UPDATE_GENERAL_VOLUNTEER_SUCCESS' and additional_data:
        old_comments = additional_data.get('old_comments', '')
        new_comments = additional_data.get('new_comments', '')
        volunteer_name = additional_data.get('volunteer_name', 'Unknown Volunteer')
        volunteer_email = additional_data.get('volunteer_email', 'Unknown')
        
        description = f"Timestamp: {timestamp_formatted}\n"
        description += f"User: {username}\n"
        description += f"Email: {user_email}\n"
        description += f"Action: Updated general volunteer\n"
        description += f"Volunteer: {volunteer_name}\n"
        description += f"Volunteer email: {volunteer_email}\n"
        
        if old_comments != new_comments:
            old_display = old_comments[:50] + '...' if len(str(old_comments)) > 50 else old_comments
            new_display = new_comments[:50] + '...' if len(str(new_comments)) > 50 else new_comments
            description += f"Comments: {old_display} → {new_display}\n"
        
        description += f"Roles: {roles_text}"
        
        if entity_type and entity_ids:
            description += f"\nRecord ID: {', '.join(map(str, entity_ids))}"

    elif action == 'UPDATE_GENERAL_VOLUNTEER_FAILED' and additional_data:
        volunteer_name = additional_data.get('volunteer_name', 'Unknown')
        attempted_email = additional_data.get('attempted_email', 'Unknown')
        
        description = f"Timestamp: {timestamp_formatted}\n"
        description += f"User: {username}\n"
        description += f"Email: {user_email}\n"
        description += f"Action: Failed update volunteer\n"
        description += f"Volunteer: {volunteer_name}\n"
        description += f"Email: {attempted_email}\n"
        description += f"Error: {error_message or 'Unknown error'}\n"
        description += f"Roles: {roles_text}"

    # **TUTOR UPDATE DESCRIPTIONS**
    elif action == 'UPDATE_TUTOR_SUCCESS' and additional_data:
        tutor_name = additional_data.get('tutor_name', 'Unknown Tutor')
        tutor_email = additional_data.get('tutor_email', 'Unknown')
        changed_fields = additional_data.get('changed_fields', {})
        has_tutorship = additional_data.get('has_tutorship', False)
        child_name = additional_data.get('child_name', 'Unknown')
        
        description = f"Timestamp: {timestamp_formatted}\n"
        description += f"User: {username}\n"
        description += f"Email: {user_email}\n"
        description += f"Action: Updated tutor\n"
        description += f"Tutor: {tutor_name}\n"
        description += f"Tutor Email: {tutor_email}\n"
        if has_tutorship:
            description += f"Child: {child_name}\n"
        
        if changed_fields:
            field_updates = []
            for field, changes in changed_fields.items():
                old_val = changes.get('old', 'Unknown')
                new_val = changes.get('new', 'Unknown')
                field_updates.append(f"{field}: '{old_val}' → '{new_val}'")
            description += f"Changed: {'; '.join(field_updates)}\n"
        
        description += f"Roles: {roles_text}"
        
        if entity_type and entity_ids:
            description += f"\nRecord ID: {', '.join(map(str, entity_ids))}"

    elif action == 'UPDATE_TUTOR_FAILED' and additional_data:
        tutor_name = additional_data.get('tutor_name', 'Unknown')
        tutor_email = additional_data.get('tutor_email', 'Unknown')
        attempted_fields = additional_data.get('attempted_fields', [])
        
        description = f"Timestamp: {timestamp_formatted}\n"
        description += f"User: {username}\n"
        description += f"Email: {user_email}\n"
        description += f"Action: Failed update tutor\n"
        description += f"Tutor: {tutor_name}\n"
        description += f"Email: {tutor_email}\n"
        
        if attempted_fields:
            description += f"Attempted: {', '.join(attempted_fields)}\n"
        
        description += f"Error: {error_message or 'Unknown error'}\n"
        description += f"Roles: {roles_text}"
    
    # **TUTORSHIP OPERATION DESCRIPTIONS**
    elif action == 'CREATE_TUTORSHIP_SUCCESS' and additional_data:
        child_name = additional_data.get('child_name', 'Unknown')
        tutor_name = additional_data.get('tutor_name', 'Unknown')
        tutor_email = additional_data.get('tutor_email', 'Unknown')
        approval_counter = additional_data.get('approval_counter', 1)
        
        description = f"Timestamp: {timestamp_formatted}\n"
        description += f"User: {username}\n"
        description += f"Email: {user_email}\n"
        description += f"Action: Created tutorship\n"
        description += f"Child: {child_name}\n"
        description += f"Tutor: {tutor_name}\n"
        description += f"Tutor email: {tutor_email}\n"
        description += f"Approval counter: {approval_counter}\n"
        description += f"Roles: {roles_text}"
        
        if entity_type and entity_ids:
            description += f"\nRecord ID: {', '.join(map(str, entity_ids))}"

    elif action == 'CREATE_TUTORSHIP_FAILED' and additional_data:
        child_name = additional_data.get('child_name', 'Unknown')
        tutor_name = additional_data.get('tutor_name', 'Unknown')
        reason = additional_data.get('reason', 'unknown_reason')
        
        description = f"Timestamp: {timestamp_formatted}\n"
        description += f"User: {username}\n"
        description += f"Email: {user_email}\n"
        description += f"Action: Failed create tutorship\n"
        description += f"Child: {child_name}\n"
        description += f"Tutor: {tutor_name}\n"
        description += f"Error: {error_message or 'Unknown error'}\n"
        
        if reason == 'duplicate_tutorship':
            existing_id = additional_data.get('existing_tutorship_id', 'Unknown')
            description += f"Status: Duplicate exists\n"
            description += f"Existing ID: {existing_id}\n"
        
        description += f"Roles: {roles_text}"

    elif action == 'UPDATE_TUTORSHIP_SUCCESS' and additional_data:
        child_name = additional_data.get('child_name', 'Unknown')
        tutor_name = additional_data.get('tutor_name', 'Unknown')
        tutor_email = additional_data.get('tutor_email', 'Unknown')
        old_approval_counter = additional_data.get('old_approval_counter', 1)
        new_approval_counter = additional_data.get('new_approval_counter', 1)
        tutor_role_added = additional_data.get('tutor_role_added', False)
        tutorship_approved = additional_data.get('tutorship_approved', False)
        
        description = f"Timestamp: {timestamp_formatted}\n"
        description += f"User: {username}\n"
        description += f"Email: {user_email}\n"
        description += f"Action: Updated tutorship\n"
        description += f"Child: {child_name}\n"
        description += f"Tutor: {tutor_name}\n"
        description += f"Tutor Email: {tutor_email}\n"
        description += f"Number of Approvers: {old_approval_counter} → {new_approval_counter}\n"
        
        if tutor_role_added:
            description += f"Status: Role added\n"
        
        if tutorship_approved:
            description += f"Status: Fully approved\n"
        
        description += f"Roles: {roles_text}"
        
        if entity_type and entity_ids:
            description += f"\nRecord ID: {', '.join(map(str, entity_ids))}"

    elif action == 'UPDATE_TUTORSHIP_FAILED' and additional_data:
        child_name = additional_data.get('child_name', 'Unknown')
        tutor_name = additional_data.get('tutor_name', 'Unknown')
        reason = additional_data.get('reason', 'unknown_reason')
        current_approval_counter = additional_data.get('current_approval_counter', 'Unknown')

        description = f"Timestamp: {timestamp_formatted}\n"
        description += f"User: {username}\n"
        description += f"Email: {user_email}\n"
        description += f"Action: Failed update tutorship\n"
        description += f"Child: {child_name}\n"
        description += f"Tutor: {tutor_name}\n"
        
        if reason == 'duplicate_approval':
            description += f"Status: Already approved\n"
            description += f"Counter: {current_approval_counter}\n"
        
        description += f"Error: {error_message or 'Unknown error'}\n"
        description += f"Roles: {roles_text}"

    elif action == 'DELETE_TUTORSHIP_SUCCESS' and additional_data:
        child_name = additional_data.get('deleted_child_name', 'Unknown')
        tutor_name = additional_data.get('deleted_tutor_name', 'Unknown')
        tutor_email = additional_data.get('deleted_tutor_email', 'Unknown')
        status_restored = additional_data.get('status_restored', False)
        tutor_old_status = additional_data.get('tutor_old_status', 'Unknown')
        child_old_status = additional_data.get('child_old_status', 'Unknown')
        
        description = f"Timestamp: {timestamp_formatted}\n"
        description += f"User: {username}\n"
        description += f"Email: {user_email}\n"
        description += f"Action: Deleted tutorship\n"
        description += f"Child: {child_name}\n"
        description += f"Tutor: {tutor_name}\n"
        description += f"Email: {tutor_email}\n"
        
        if status_restored:
            description += f"Tutor status: {tutor_old_status}\n"
            description += f"Child status: {child_old_status}\n"
        else:
            description += f"Status: Default statuses\n"
        
        description += f"Roles: {roles_text}"
        
        if entity_type and entity_ids:
            description += f"\nRecord ID: {', '.join(map(str, entity_ids))}"

    elif action == 'DELETE_TUTORSHIP_FAILED' and additional_data:
        # DEBUG print additional_data
        print(f"DEBUG additional_data: {additional_data}")
        description = f"Timestamp: {timestamp_formatted}\n"
        description += f"User: {username}\n"
        description += f"Email: {user_email}\n"
        description += f"Action: Failed delete tutorship\n"
        description += f"Child: {additional_data.get('child_name', 'Unknown')}\n"
        description += f"Tutor: {additional_data.get('tutor_name', 'Unknown')}\n"
        description += f"Error: {error_message or 'Unknown error'}\n"
        description += f"Roles: {roles_text}"
    
    # **PENDING TUTOR DELETION - PROMOTION SUCCESS**
    elif action == 'DELETE_PENDING_TUTOR_SUCCESS' and additional_data:
        volunteer_name = additional_data.get('volunteer_name', 'Unknown')
        promoted_from_task_id = additional_data.get('promoted_from_task_id', 'Unknown')
        reason = additional_data.get('reason', 'Unknown')
        
        description = f"Timestamp: {timestamp_formatted}\n"
        description += f"User: {username}\n"
        description += f"Email: {user_email}\n"
        description += f"Action: Deleted pending tutor\n"
        description += f"Volunteer: {volunteer_name}\n"
        description += f"Reason: {reason}\n"
        description += f"Task ID: {promoted_from_task_id}\n"
        description += f"Status: Successfully promoted\n"
        description += f"Roles: {roles_text}"
    
    # **STAFF UPDATE DESCRIPTIONS**
    elif action == 'UPDATE_STAFF_SUCCESS' and additional_data:
        updated_staff_email = additional_data.get('updated_staff_email', 'Unknown')
        staff_full_name = additional_data.get('staff_full_name', 'Unknown')
        field_changes = additional_data.get('field_changes', [])
        changes_count = additional_data.get('changes_count', 0)
        updated_roles = additional_data.get('updated_roles', [])
        
        description = f"Timestamp: {timestamp_formatted}\n"
        description += f"User: {username}\n"
        description += f"Email: {user_email}\n"
        description += f"Action: Updated staff member\n"
        description += f"Staff name: {staff_full_name}\n"
        description += f"Staff email: {updated_staff_email}\n"
        description += f"Changes: {changes_count} field(s)\n"
        
        if field_changes:
            for change in field_changes:
                description += f"  • {change}\n"
        
        if updated_roles:
            description += f"Assigned roles: {', '.join(updated_roles)}\n"
        
        description += f"Admin roles: {roles_text}"
        
        if entity_type and entity_ids:
            description += f"\nRecord ID: {', '.join(map(str, entity_ids))}"
    
    elif action == 'UPDATE_STAFF_FAILED' and additional_data:
        updated_staff_email = additional_data.get('updated_staff_email', additional_data.get('staff_email', 'Unknown'))
        staff_full_name = additional_data.get('staff_full_name', 'Unknown')
        attempted_changes = additional_data.get('attempted_changes', additional_data.get('field_changes', []))
        changes_count = additional_data.get('changes_count', 0)
        
        description = f"Timestamp: {timestamp_formatted}\n"
        description += f"User: {username}\n"
        description += f"Email: {user_email}\n"
        description += f"Action: Failed update staff\n"
        description += f"Staff name: {staff_full_name}\n"
        description += f"Staff email: {updated_staff_email}\n"
        description += f"Attempted changes: {changes_count} field(s)\n"
        
        if attempted_changes:
            for change in attempted_changes:
                description += f"  • {change}\n"
        
        description += f"Error: {error_message or 'Unknown error'}\n"
        description += f"Admin roles: {roles_text}"
        
        if entity_type and entity_ids:
            description += f"\nRecord ID: {', '.join(map(str, entity_ids))}"
    
    # **STAFF DELETION DESCRIPTIONS - GDPR COMPLIANCE**
    elif action == 'DELETE_STAFF_SUCCESS' and additional_data:
        deleted_email = additional_data.get('deleted_staff_email', 'Unknown')
        deleted_full_name = additional_data.get('deleted_staff_full_name', 'Unknown')
        deleted_staff_id = additional_data.get('deleted_staff_id', 'Unknown')
        deleted_staff_roles = additional_data.get('deleted_staff_roles', [])

        description = f"Timestamp: {timestamp_formatted}\n"
        description += f"User: {username}\n"
        description += f"Email: {user_email}\n"
        description += f"Action: Deleted staff member\n"
        description += f"Staff name: {deleted_full_name}\n"
        description += f"Staff email: {deleted_email}\n"
        description += f"Staff ID: {deleted_staff_id}\n"
        description += f"Timestamp: {timestamp_formatted}\n"
        description += f"Staff roles: {', '.join(deleted_staff_roles)}\n"
        description += f"Status: GDPR deletion complete"
        
        if entity_type and entity_ids:
            description += f"\nDeleted record ID: {', '.join(map(str, entity_ids))}"
    
    elif action == 'DELETE_STAFF_FAILED' and additional_data:
        deleted_email = additional_data.get('deleted_staff_email', 'Unknown')
        deleted_full_name = additional_data.get('deleted_staff_full_name', 'Unknown')
        deleted_staff_id = additional_data.get('deleted_staff_id', 'Unknown')
        deleted_staff_roles = additional_data.get('deleted_staff_roles', [])

        description = f"Timestamp: {timestamp_formatted}\n"
        description += f"User: {username}\n"
        description += f"Email: {user_email}\n"
        description += f"Action: Failed delete staff\n"
        description += f"Staff name of attempted deletion: {deleted_full_name}\n"
        description += f"Staff email of attempted deletion: {deleted_email}\n"
        description += f"Staff ID of attempted deletion: {deleted_staff_id}\n"
        description += f"Timestamp of attempted deletion: {timestamp_formatted}\n"
        description += f"Error: {error_message or 'Unknown error'}\n"
        description += f"Staff Roles of attempted Deletion: {', '.join(deleted_staff_roles)}"

        if entity_type and entity_ids:
            description += f"\nRecord ID: {', '.join(map(str, entity_ids))}"
    
    # **FALLBACK TO ORIGINAL FORMAT FOR COMPATIBILITY**
    else:
        # Base description (original format for backward compatibility)
        description = f"Timestamp: {timestamp_formatted}\n"
        description += f"User: {username}\n"
        description += f"Email: {user_email}\n"
        description += f"Action: {action}\n"
        description += f"Timestamp: {timestamp_formatted}\n"
        description += f"Roles: {roles_text}\n"
        description += f"Status: {success_text}"
        
        # Add error message if failure
        if not success and error_message:
            description += f"\nError: {error_message}"
        
        # Add entity information if available
        if entity_type and entity_ids:
            description += f"\nEntity: {entity_type}"
            description += f"\nRecord ID: {', '.join(map(str, entity_ids))}"
        
        # Add report name if applicable
        if report_name:
            description += f"\nReport: {report_name}"
    
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
        registration_email = None
        if additional_data:
            attempted_email = additional_data.get('attempted_email') or additional_data.get('email')
            registration_email = additional_data.get('registration_email')
        
        # Handle different scenarios for anonymous users
        if not user_email:
            if action in ['USER_REGISTRATION_SUCCESS', 'USER_REGISTRATION_FAILED', 
                         'CREATE_PENDING_TUTOR_SUCCESS', 'CREATE_PENDING_TUTOR_FAILED',
                         'CREATE_VOLUNTEER_SUCCESS', 'CREATE_VOLUNTEER_FAILED'] and registration_email:
                # For registration-related actions, use the registration email as the user_email for audit
                user_email = registration_email
                username = additional_data.get('username', '')  # Use the created username
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
                username=username,      # This will be the created username for registrations
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