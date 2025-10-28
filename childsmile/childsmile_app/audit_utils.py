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
        
        description = f"User {user_full_name} ({user_email}) successfully verified their identity using {verification_method} on {timestamp_formatted}.\n"
        description += f"The verification required {attempts_used} attempt(s).\n"
        description += f"User roles: [{roles_text}].\n"
        description += f"This is a security verification step before login completion."
        
    elif action == 'USER_LOGIN_SUCCESS' and additional_data:
        user_full_name = additional_data.get('user_full_name', f'{username}')
        login_method = additional_data.get('login_method', 'Unknown')
        session_duration = additional_data.get('session_duration_hours', 24)
        
        description = f"User {user_full_name} ({user_email}) successfully logged into the system on {timestamp_formatted} using {login_method}.\n"
        description += f"Session duration: {session_duration} hours.\n"
        description += f"User roles: [{roles_text}].\n"
        description += f"Login process completed successfully."
    
    elif action == 'GOOGLE_LOGIN_FAILED' and additional_data:
        attempted_email = additional_data.get('attempted_email', user_email)
        login_method = additional_data.get('login_method', 'Google OAuth')
        
        if attempted_email and attempted_email != 'anonymous':
            if username and username != 'anonymous':
                description = f"User {username} ({attempted_email}) failed to log in using {login_method} on {timestamp_formatted}.\n"
            else:
                description = f"Entity with email {attempted_email} attempted to log in using {login_method} on {timestamp_formatted}.\n"
            
            description += f"Login failed with error: {error_message or 'Unknown error'}.\n"
            description += f"This could indicate an unauthorized access attempt or non-existent user."
        else:
            description = f"Anonymous entity attempted Google login on {timestamp_formatted}.\n"
            description += f"Login failed with error: {error_message or 'Unknown error'}."
    
    elif action == 'GOOGLE_LOGIN_SUCCESS' and additional_data:
        user_full_name = additional_data.get('user_full_name', f'{username}')
        login_method = additional_data.get('login_method', 'Google OAuth')
        
        description = f"User {user_full_name} ({user_email}) successfully logged into the system on {timestamp_formatted} using {login_method}.\n"
        description += f"User roles: [{roles_text}].\n"
        description += f"Google OAuth authentication completed successfully."
    
    # **NEW: ENHANCED USER REGISTRATION SUCCESS**
    elif action == 'USER_REGISTRATION_SUCCESS' and additional_data:
        registration_email = additional_data.get('email', user_email)
        registered_username = additional_data.get('username', 'Unknown')
        registration_type = additional_data.get('registration_type', 'unknown')
        
        # Use the actual registration data instead of anonymous
        description = f"New user {registered_username} with email {registration_email} successfully registered in the system on {timestamp_formatted}.\n"
        description += f"Registration type: {registration_type.replace('_', ' ').title()}.\n"
        
        if entity_type and entity_ids:
            description += f"Created {entity_type} record with ID: {', '.join(map(str, entity_ids))}.\n"
        
        description += f"Account creation completed successfully."
    
    # **NEW: ENHANCED USER REGISTRATION FAILED**
    elif action == 'USER_REGISTRATION_FAILED' and additional_data:
        attempted_email = additional_data.get('attempted_email', user_email)
        
        if attempted_email and attempted_email != 'anonymous':
            description = f"Registration attempt for email {attempted_email} failed on {timestamp_formatted}.\n"
        else:
            description = f"Anonymous registration attempt failed on {timestamp_formatted}.\n"
        
        description += f"Registration failed with error: {error_message or 'Unknown error'}.\n"
        description += f"This could indicate duplicate email, invalid data, or system error."
    
    # **NEW: ENHANCED STAFF CREATION SUCCESS/FAILED**
    elif action == 'CREATE_STAFF_SUCCESS' and additional_data:
        staff_email = additional_data.get('created_staff_email', 'Unknown')
        assigned_roles = additional_data.get('assigned_roles', [])
        step = additional_data.get('step', 'completed')
        
        if step == 'totp_sent':
            description = f"Admin {username} ({user_email}) initiated staff account creation for {staff_email} on {timestamp_formatted}.\n"
            description += f"Verification code sent to new staff member.\n"
            description += f"Target roles: [{', '.join(assigned_roles)}].\n"
            description += f"Admin roles: [{roles_text}]."
        else:
            description = f"Admin {username} ({user_email}) successfully created staff account for {staff_email} on {timestamp_formatted}.\n"
            description += f"Assigned roles: [{', '.join(assigned_roles)}].\n"
            description += f"Admin roles: [{roles_text}].\n"
            
            if entity_type and entity_ids:
                description += f"Created {entity_type} record with ID: {', '.join(map(str, entity_ids))}."
    
    elif action == 'CREATE_STAFF_FAILED' and additional_data:
        target_email = additional_data.get('target_email', additional_data.get('attempted_email', 'Unknown'))
        
        description = f"Admin {username or 'Unknown'} ({user_email}) failed to create staff account for {target_email} on {timestamp_formatted}.\n"
        description += f"Creation failed with error: {error_message or 'Unknown error'}.\n"
        description += f"Admin roles: [{roles_text}]."
    
    # **ENHANCED VOLUNTEER/TUTOR CREATION**
    elif action in ['CREATE_VOLUNTEER_SUCCESS', 'CREATE_PENDING_TUTOR_SUCCESS'] and additional_data:
        volunteer_email = additional_data.get('volunteer_email', additional_data.get('tutor_email', user_email))
        first_name = additional_data.get('first_name', 'Unknown')
        surname = additional_data.get('surname', 'Unknown')
        created_username = additional_data.get('username', username)
        
        entity_name = 'Volunteer' if 'VOLUNTEER' in action else 'Pending Tutor'
        
        description = f"New {entity_name} {first_name} {surname} (username: {created_username}, email: {volunteer_email}) was successfully created on {timestamp_formatted}. "
        
        if entity_type and entity_ids:
            description += f"Created {entity_type} record with ID: {', '.join(map(str, entity_ids))}. "
        
        description += f"{entity_name} account setup completed successfully during registration process."
    
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
    
    # **NEW: ENHANCED FAMILY MANAGEMENT ACTIONS**
    elif action == 'CREATE_FAMILY_SUCCESS' and additional_data:
        family_name = additional_data.get('family_name', 'Unknown')
        family_city = additional_data.get('family_city', 'Unknown')
        
        description = f"User {username} ({user_email}) successfully created a new family record for {family_name} on {timestamp_formatted}. "
        description += f"Family location: {family_city}. "
        description += f"User roles: [{roles_text}]. "
        
        if entity_type and entity_ids:
            description += f"Created {entity_type} record with ID: {', '.join(map(str, entity_ids))}."
    
    elif action == 'UPDATE_FAMILY_SUCCESS' and additional_data:
        updated_name = additional_data.get('updated_family_name', 'Unknown')
        original_name = additional_data.get('original_family_name', 'Unknown')
        family_city = additional_data.get('family_city', 'Unknown')
        field_changes = additional_data.get('field_changes', [])
        changes_count = additional_data.get('changes_count', 0)
        
        if updated_name != original_name:
            description = f"User {username} ({user_email}) successfully updated family record from '{original_name}' to '{updated_name}' on {timestamp_formatted}. "
        else:
            description = f"User {username} ({user_email}) successfully updated family record for '{updated_name}' on {timestamp_formatted}. "
        
        # **ADD FIELD CHANGES DETAILS**
        if field_changes:
            description += f"Changed {changes_count} field(s): {'; '.join(field_changes)}. "
        else:
            description += "No field changes detected (refresh/save operation). "
        
        description += f"Family location: {family_city}. User roles: [{roles_text}]."
        
        if entity_type and entity_ids:
            description += f" Updated {entity_type} record with ID: {', '.join(map(str, entity_ids))}."

    elif action == 'DELETE_FAMILY_SUCCESS' and additional_data:
        deleted_name = additional_data.get('deleted_family_name', 'Unknown')
        family_city = additional_data.get('family_city', 'Unknown')
        family_status = additional_data.get('family_status', 'Unknown')
        family_phone = additional_data.get('family_phone', 'Unknown')
        family_hospital = additional_data.get('family_hospital', 'Unknown')
        medical_diagnosis = additional_data.get('medical_diagnosis', 'Unknown')
        current_medical_state = additional_data.get('current_medical_state', 'Unknown')
        
        description = f"User {username} ({user_email}) successfully deleted family record for {deleted_name} on {timestamp_formatted}.\n"
        description += f"Family details - Location: {family_city}, Phone: {family_phone}, Hospital: {family_hospital},\n"
        description += f"Status: {family_status}, Diagnosis: {medical_diagnosis}, Medical State: {current_medical_state}.\n"
        description += f"User roles: [{roles_text}]."
        
        if entity_type and entity_ids:
            description += f"\nDeleted {entity_type} record with ID: {', '.join(map(str, entity_ids))}."

    # **ADD CREATE_FAMILY_FAILED**
    elif action == 'CREATE_FAMILY_FAILED' and additional_data:
        family_name = additional_data.get('family_name', 'Unknown')
        
        description = f"User {username} ({user_email}) failed to create family record for {family_name} on {timestamp_formatted}.\n"
        description += f"Creation failed with error: {error_message or 'Unknown error'}.\n"
        description += f"User roles: [{roles_text}]."
    
    # **ADD UPDATE_FAMILY_FAILED**
    elif action == 'UPDATE_FAMILY_FAILED' and additional_data:
        family_name = additional_data.get('family_name', 'Unknown')
        attempted_changes = additional_data.get('attempted_changes', [])
        changes_count = additional_data.get('changes_count', 0)
        
        description = f"User {username} ({user_email}) failed to update family record for {family_name} on {timestamp_formatted}.\n"
        description += f"Update failed with error: {error_message or 'Unknown error'}.\n"
        
        # **ADD ATTEMPTED CHANGES DETAILS**
        if attempted_changes:
            description += f"User attempted to change {changes_count} field(s): {'; '.join(attempted_changes)}.\n"
        else:
            description += "No field changes were attempted.\n"
        
        description += f"User roles: [{roles_text}]."
        
        if entity_type and entity_ids:
            description += f"\nTarget {entity_type} record ID: {', '.join(map(str, entity_ids))}."
    
    # **ADD INITIAL FAMILY DATA ACTIONS**
    elif action == 'DELETE_INITIAL_FAMILY_SUCCESS' and additional_data:
        deleted_names = additional_data.get('deleted_family_names', 'Unknown')
        deleted_phones = additional_data.get('deleted_family_phones', 'Unknown')
        
        description = f"User {username} ({user_email}) successfully deleted initial family data record on {timestamp_formatted}.\n"
        description += f"Deleted family names: {deleted_names}.\n"
        description += f"Deleted family phones: {deleted_phones}.\n"
        description += f"User roles: [{roles_text}]."
        
        if entity_type and entity_ids:
            description += f"\nDeleted {entity_type} record with ID: {', '.join(map(str, entity_ids))}."

    elif action == 'DELETE_INITIAL_FAMILY_FAILED' and additional_data:
        deleted_names = additional_data.get('deleted_family_names', 'Unknown')
        deleted_phones = additional_data.get('deleted_family_phones', 'Unknown')
        
        description = f"User {username} ({user_email}) failed to delete initial family data record on {timestamp_formatted}.\n"
        description += f"Attempted to delete family names: {deleted_names}.\n"
        description += f"Attempted to delete family phones: {deleted_phones}.\n"
        description += f"Deletion failed with error: {error_message or 'Unknown error'}.\n"
        description += f"User roles: [{roles_text}]."
        
        if entity_type and entity_ids:
            description += f"\nTarget {entity_type} record ID: {', '.join(map(str, entity_ids))}."

    elif action == 'MARK_FAMILY_ADDED_SUCCESS' and additional_data:
        family_names = additional_data.get('family_names', 'Unknown')
        family_phones = additional_data.get('family_phones', 'Unknown')
        family_added_status = additional_data.get('family_added_status', False)
        
        description = f"User {username} ({user_email}) successfully marked initial family data as complete on {timestamp_formatted}.\n"
        description += f"Family names: {family_names}.\n"
        description += f"Family phones: {family_phones}.\n"
        description += f"Family added status: {'Yes' if family_added_status else 'No'}.\n"
        description += f"User roles: [{roles_text}]."
        
        if entity_type and entity_ids:
            description += f"\nMarked {entity_type} record with ID: {', '.join(map(str, entity_ids))} as complete."

    elif action == 'MARK_FAMILY_ADDED_FAILED' and additional_data:
        family_names = additional_data.get('family_names', 'Unknown')
        family_phones = additional_data.get('family_phones', 'Unknown')
        
        description = f"User {username} ({user_email}) failed to mark initial family data as complete on {timestamp_formatted}.\n"
        description += f"Attempted family names: {family_names}.\n"
        description += f"Attempted family phones: {family_phones}.\n"
        description += f"Operation failed with error: {error_message or 'Unknown error'}.\n"
        description += f"User roles: [{roles_text}]."
        
        if entity_type and entity_ids:
            description += f"\nTarget {entity_type} record ID: {', '.join(map(str, entity_ids))}."
    
    # **TASK OPERATION DESCRIPTIONS**
    elif action == 'CREATE_TASK_SUCCESS' and additional_data:
        task_type = additional_data.get('task_type', 'Unknown')
        assigned_to_id = additional_data.get('assigned_to_id')
        assigned_to_name = additional_data.get('assigned_to_name', 'Unassigned')
        
        if assigned_to_name and assigned_to_name != 'Unknown':
            description = f"User {username} ({user_email}) successfully created a new task on {timestamp_formatted}.\n"
            description += f"Task type: {task_type}.\n"
            description += f"Assigned to: {assigned_to_name}.\n"
        else:
            description = f"User {username} ({user_email}) successfully created a new task on {timestamp_formatted}.\n"
            description += f"Task type: {task_type}.\n"
            description += f"Task is currently unassigned.\n"
        
        description += f"User roles: [{roles_text}]."
        
        if entity_type and entity_ids:
            description += f"\nCreated {entity_type} record with ID: {', '.join(map(str, entity_ids))}."

    elif action == 'CREATE_TASK_FAILED' and additional_data:
        task_type = additional_data.get('task_type', 'Unknown')
        attempted_assigned_to = additional_data.get('attempted_assigned_to')
        
        description = f"User {username} ({user_email}) failed to create a task on {timestamp_formatted}.\n"
        description += f"Attempted task type: {task_type}.\n"
        
        if attempted_assigned_to:
            description += f"Attempted to assign to: {attempted_assigned_to}.\n"
        
        description += f"Creation failed with error: {error_message or 'Unknown error'}.\n"
        description += f"User roles: [{roles_text}]."

    elif action == 'UPDATE_TASK_SUCCESS' and additional_data:
        task_type = additional_data.get('task_type', 'Unknown')
        old_status = additional_data.get('old_status', 'Unknown')
        new_status = additional_data.get('new_status', 'Unknown')
        assigned_to_name = additional_data.get('assigned_to_name', 'Unknown')
        field_changes = additional_data.get('field_changes', [])
        changes_count = additional_data.get('changes_count', 0)
        
        description = f"User {username} ({user_email}) successfully updated task on {timestamp_formatted}.\n"
        description += f"Task type: {task_type}.\n"
        
        if old_status != new_status:
            description += f"Status changed from '{old_status}' to '{new_status}'.\n"
        
        if assigned_to_name and assigned_to_name != 'Unknown':
            description += f"Currently assigned to: {assigned_to_name}.\n"
        
        # **ADD FIELD CHANGES DETAILS**
        if field_changes:
            description += f"Modified {changes_count} field(s): {'; '.join(field_changes)}.\n"
        
        description += f"User roles: [{roles_text}]."
        
        if entity_type and entity_ids:
            description += f"\nUpdated {entity_type} record with ID: {', '.join(map(str, entity_ids))}."

    elif action == 'UPDATE_TASK_FAILED' and additional_data:
        task_type = additional_data.get('task_type', 'Unknown')
        attempted_assigned_to = additional_data.get('attempted_assigned_to')
        new_status = additional_data.get('new_status')
        field_changes = additional_data.get('field_changes', [])
        
        description = f"User {username} ({user_email}) failed to update task on {timestamp_formatted}.\n"
        description += f"Task type: {task_type}.\n"
        
        if new_status:
            description += f"Attempted new status: '{new_status}'.\n"
        
        if attempted_assigned_to:
            description += f"Attempted to assign to: {attempted_assigned_to}.\n"
        
        if field_changes:
            description += f"Attempted changes: {'; '.join(field_changes)}.\n"
        
        description += f"Update failed with error: {error_message or 'Unknown error'}.\n"
        description += f"User roles: [{roles_text}]."

    elif action == 'DELETE_TASK_SUCCESS' and additional_data:
        task_type = additional_data.get('task_type', 'Unknown')
        assigned_to_name = additional_data.get('assigned_to_name')
        
        description = f"User {username} ({user_email}) successfully deleted a task on {timestamp_formatted}.\n"
        description += f"Task type: {task_type}.\n"
        
        if assigned_to_name and assigned_to_name != 'Unknown':
            description += f"Task was assigned to: {assigned_to_name}.\n"
        else:
            description += "Task was unassigned.\n"
        
        description += f"User roles: [{roles_text}]."
        
        if entity_type and entity_ids:
            description += f"\nDeleted {entity_type} record with ID: {', '.join(map(str, entity_ids))}."

    elif action == 'DELETE_TASK_FAILED' and additional_data:
        task_type = additional_data.get('task_type', 'Unknown')
        
        description = f"User {username} ({user_email}) failed to delete task on {timestamp_formatted}.\n"
        description += f"Task type: {task_type}.\n"
        description += f"Deletion failed with error: {error_message or 'Unknown error'}.\n"
        description += f"User roles: [{roles_text}]."

    # **VOLUNTEER UPDATE DESCRIPTIONS**
    elif action == 'UPDATE_GENERAL_VOLUNTEER_SUCCESS' and additional_data:
        old_comments = additional_data.get('old_comments', '')
        new_comments = additional_data.get('new_comments', '')
        volunteer_name = additional_data.get('volunteer_name', 'Unknown Volunteer')
        volunteer_email = additional_data.get('volunteer_email', 'Unknown')
        
        description = f"User {username} ({user_email}) successfully updated general volunteer on {timestamp_formatted}.\n"
        description += f"Volunteer: {volunteer_name} ({volunteer_email}).\n"
        
        if old_comments != new_comments:
            old_display = old_comments[:50] + '...' if len(str(old_comments)) > 50 else old_comments
            new_display = new_comments[:50] + '...' if len(str(new_comments)) > 50 else new_comments
            description += f"Comments updated from '{old_display}' to '{new_display}'.\n"
        
        description += f"User roles: [{roles_text}]."
        
        if entity_type and entity_ids:
            description += f"\nUpdated {entity_type} record with ID: {', '.join(map(str, entity_ids))}."

    elif action == 'UPDATE_GENERAL_VOLUNTEER_FAILED' and additional_data:
        volunteer_name = additional_data.get('volunteer_name', 'Unknown')
        attempted_email = additional_data.get('attempted_email', 'Unknown')
        
        description = f"User {username} ({user_email}) failed to update general volunteer on {timestamp_formatted}.\n"
        description += f"Attempted volunteer: {volunteer_name} ({attempted_email}).\n"
        description += f"Update failed with error: {error_message or 'Unknown error'}.\n"
        description += f"User roles: [{roles_text}]."

    # **TUTOR UPDATE DESCRIPTIONS**
    elif action == 'UPDATE_TUTOR_SUCCESS' and additional_data:
        tutor_name = additional_data.get('tutor_name', 'Unknown Tutor')
        tutor_email = additional_data.get('tutor_email', 'Unknown')
        changed_fields = additional_data.get('changed_fields', {})
        has_tutorship = additional_data.get('has_tutorship', False)
        child_name = additional_data.get('child_name', 'Unknown')
        
        description = f"User {username} ({user_email}) successfully updated tutor on {timestamp_formatted}.\n"
        description += f"Tutor: {tutor_name} ({tutor_email}).\n"
        
        if changed_fields:
            field_updates = []
            for field, changes in changed_fields.items():
                old_val = changes.get('old', 'Unknown')
                new_val = changes.get('new', 'Unknown')
                field_updates.append(f"{field}: '{old_val}' → '{new_val}'")
            description += f"Fields updated: {'; '.join(field_updates)}.\n"
        
        if has_tutorship:
            description += f"Associated child: {child_name}.\n"
        
        description += f"User roles: [{roles_text}]."
        
        if entity_type and entity_ids:
            description += f"\nUpdated {entity_type} record with ID: {', '.join(map(str, entity_ids))}."

    elif action == 'UPDATE_TUTOR_FAILED' and additional_data:
        tutor_name = additional_data.get('tutor_name', 'Unknown')
        tutor_email = additional_data.get('tutor_email', 'Unknown')
        attempted_fields = additional_data.get('attempted_fields', [])
        
        description = f"User {username} ({user_email}) failed to update tutor on {timestamp_formatted}.\n"
        description += f"Attempted tutor: {tutor_name} ({tutor_email}).\n"
        
        if attempted_fields:
            description += f"Attempted to update: {', '.join(attempted_fields)}.\n"
        
        description += f"Update failed with error: {error_message or 'Unknown error'}.\n"
        description += f"User roles: [{roles_text}]."
    
    # **TUTORSHIP OPERATION DESCRIPTIONS**
    elif action == 'CREATE_TUTORSHIP_SUCCESS' and additional_data:
        child_name = additional_data.get('child_name', 'Unknown')
        tutor_name = additional_data.get('tutor_name', 'Unknown')
        tutor_email = additional_data.get('tutor_email', 'Unknown')
        approval_counter = additional_data.get('approval_counter', 1)
        
        description = f"User {username} ({user_email}) successfully created a new tutorship on {timestamp_formatted}.\n"
        description += f"Child: {child_name}.\n"
        description += f"Tutor: {tutor_name} ({tutor_email}).\n"
        description += f"Approval counter initialized to {approval_counter}.\n"
        description += f"User roles: [{roles_text}]."
        
        if entity_type and entity_ids:
            description += f"\nCreated {entity_type} record with ID: {', '.join(map(str, entity_ids))}."

    elif action == 'CREATE_TUTORSHIP_FAILED' and additional_data:
        child_name = additional_data.get('child_name', 'Unknown')
        tutor_name = additional_data.get('tutor_name', 'Unknown')
        reason = additional_data.get('reason', 'unknown_reason')
        
        description = f"User {username} ({user_email}) failed to create tutorship on {timestamp_formatted}.\n"
        description += f"Child: {child_name}.\n"
        description += f"Tutor: {tutor_name}.\n"
        description += f"Creation failed with error: {error_message or 'Unknown error'}.\n"
        
        if reason == 'duplicate_tutorship':
            description += f"A tutorship already exists for this child-tutor pair.\n"
            existing_id = additional_data.get('existing_tutorship_id', 'Unknown')
            description += f"Existing tutorship ID: {existing_id}.\n"
        
        description += f"User roles: [{roles_text}]."

    elif action == 'UPDATE_TUTORSHIP_SUCCESS' and additional_data:
        child_name = additional_data.get('child_name', 'Unknown')
        tutor_name = additional_data.get('tutor_name', 'Unknown')
        tutor_email = additional_data.get('tutor_email', 'Unknown')
        old_approval_counter = additional_data.get('old_approval_counter', 1)
        new_approval_counter = additional_data.get('new_approval_counter', 1)
        tutor_role_added = additional_data.get('tutor_role_added', False)
        tutorship_approved = additional_data.get('tutorship_approved', False)
        
        description = f"User {username} ({user_email}) successfully updated tutorship on {timestamp_formatted}.\n"
        description += f"Child: {child_name}.\n"
        description += f"Tutor: {tutor_name} ({tutor_email}).\n"
        description += f"Approval counter updated from {old_approval_counter} to {new_approval_counter}.\n"
        
        if tutor_role_added:
            description += f"Tutor role has been added to the staff member.\n"
        
        if tutorship_approved:
            description += f"Tutorship is now fully approved (2 approvals received).\n"
        
        description += f"User roles: [{roles_text}]."
        
        if entity_type and entity_ids:
            description += f"\nUpdated {entity_type} record with ID: {', '.join(map(str, entity_ids))}."

    elif action == 'UPDATE_TUTORSHIP_FAILED' and additional_data:
        child_name = additional_data.get('child_name', 'Unknown')
        tutor_name = additional_data.get('tutor_name', 'Unknown')
        reason = additional_data.get('reason', 'unknown_reason')
        current_approval_counter = additional_data.get('current_approval_counter', 'Unknown')
        
        description = f"User {username} ({user_email}) failed to update tutorship on {timestamp_formatted}.\n"
        description += f"Child: {child_name}.\n"
        description += f"Tutor: {tutor_name}.\n"
        
        if reason == 'duplicate_approval':
            description += f"Update failed: This role has already approved this tutorship.\n"
            description += f"Current approval counter: {current_approval_counter}.\n"
        
        description += f"Error: {error_message or 'Unknown error'}.\n"
        description += f"User roles: [{roles_text}]."

    elif action == 'DELETE_TUTORSHIP_SUCCESS' and additional_data:
        child_name = additional_data.get('deleted_child_name', 'Unknown')
        tutor_name = additional_data.get('deleted_tutor_name', 'Unknown')
        tutor_email = additional_data.get('deleted_tutor_email', 'Unknown')
        status_restored = additional_data.get('status_restored', False)
        tutor_old_status = additional_data.get('tutor_old_status', 'Unknown')
        child_old_status = additional_data.get('child_old_status', 'Unknown')
        
        description = f"User {username} ({user_email}) successfully deleted tutorship on {timestamp_formatted}.\n"
        description += f"Child: {child_name}.\n"
        description += f"Tutor: {tutor_name} ({tutor_email}).\n"
        
        if status_restored:
            description += f"Previous statuses have been restored - Tutor: {tutor_old_status}, Child: {child_old_status}.\n"
        else:
            description += f"Default statuses set - Tutor: אין_חניך, Child: אין_חונך.\n"
        
        description += f"User roles: [{roles_text}]."
        
        if entity_type and entity_ids:
            description += f"\nDeleted {entity_type} record with ID: {', '.join(map(str, entity_ids))}."

    elif action == 'DELETE_TUTORSHIP_FAILED' and additional_data:
        description = f"User {username} ({user_email}) failed to delete tutorship on {timestamp_formatted}.\n"
        description += f"Deletion failed with error: {error_message or 'Unknown error'}.\n"
        description += f"User roles: [{roles_text}]."
    
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