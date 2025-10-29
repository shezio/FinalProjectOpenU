"""
Staff management views - Create, update, delete staff members
"""
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view
from django_ratelimit.decorators import ratelimit
from django.core.mail import send_mail
from django.conf import settings
from django.db import DatabaseError, transaction
from .models import Staff, Role, TOTPCode, SignedUp, Tutors, Pending_Tutor, Tasks
from .utils import is_admin
from .audit_utils import log_api_action
import json
import datetime
import traceback


@csrf_exempt
@api_view(["PUT"])
def update_staff_member(request, staff_id):
    """
    Update a staff member's details
    """
    user_id = request.session.get("user_id")
    if not user_id:
        log_api_action(
            request=request,
            action='UPDATE_STAFF_FAILED',
            success=False,
            error_message="Authentication credentials were not provided",
            status_code=403
        )
        return JsonResponse({"detail": "Authentication credentials were not provided."}, status=403)

    user = Staff.objects.get(staff_id=user_id)
    if not is_admin(user):
        log_api_action(
            request=request,
            action='UPDATE_STAFF_FAILED',
            success=False,
            error_message="You do not have permission to update staff",
            status_code=401
        )
        return JsonResponse({"error": "You do not have permission to update staff."}, status=401)

    try:
        staff_member = Staff.objects.get(staff_id=staff_id)
        
        data = request.data
        
        # Store original values for audit
        original_username = staff_member.username
        original_email = staff_member.email
        original_first_name = staff_member.first_name
        original_last_name = staff_member.last_name
        original_roles = list(staff_member.roles.values_list("role_name", flat=True))
        
        # Track what fields are being changed - BEFORE any updates
        field_changes = []
        
        if original_username != data.get("username", staff_member.username):
            field_changes.append(f"Username: '{original_username}' → '{data.get('username')}'")
        if original_email != data.get("email", staff_member.email):
            field_changes.append(f"Email: '{original_email}' → '{data.get('email')}'")
        if original_first_name != data.get("first_name", staff_member.first_name):
            field_changes.append(f"First Name: '{original_first_name}' → '{data.get('first_name')}'")
        if original_last_name != data.get("last_name", staff_member.last_name):
            field_changes.append(f"Last Name: '{original_last_name}' → '{data.get('last_name')}'")
        
        # Check role changes
        new_roles = set(data.get("roles", original_roles))
        if new_roles != set(original_roles):
            field_changes.append(f"Roles: [{', '.join(original_roles)}] → [{', '.join(new_roles)}]")

        # Validate required fields
        required_fields = ["username", "email", "first_name", "last_name"]
        missing_fields = [
            field for field in required_fields if not data.get(field, "").strip()
        ]
        if missing_fields:
            log_api_action(
                request=request,
                action='UPDATE_STAFF_FAILED',
                success=False,
                error_message=f"Missing or empty required fields: {', '.join(missing_fields)}",
                status_code=400,
                entity_type='Staff',
                entity_ids=[staff_id],
                additional_data={
                    'staff_email': staff_member.email,
                    'staff_full_name': f"{staff_member.first_name} {staff_member.last_name}",
                    'attempted_changes': field_changes,
                    'changes_count': len(field_changes)
                }
            )
            return JsonResponse(
                {
                    "error": f"Missing or empty required fields: {', '.join(missing_fields)}"
                },
                status=400,
            )

        # Check if username already exists - ALL EXISTING CHECKS STAY EXACTLY THE SAME
        if (
            Staff.objects.filter(username=data["username"])
            .exclude(staff_id=staff_id)
            .exists()
        ):
            log_api_action(
                request=request,
                action='UPDATE_STAFF_FAILED',
                success=False,
                error_message=f"Username '{data['username']}' already exists",
                status_code=400,
                entity_type='Staff',
                entity_ids=[staff_id],
                additional_data={
                    'staff_email': staff_member.email,
                    'staff_full_name': f"{staff_member.first_name} {staff_member.last_name}",
                    'attempted_changes': field_changes,
                    'changes_count': len(field_changes)
                }
            )
            return JsonResponse(
                {"error": f"Username '{data['username']}' already exists."}, status=400
            )

        # Check if email already exists
        if (
            Staff.objects.filter(email=data["email"])
            .exclude(staff_id=staff_id)
            .exists()
        ):
            log_api_action(
                request=request,
                action='UPDATE_STAFF_FAILED',
                success=False,
                error_message=f"Email '{data['email']}' already exists",
                status_code=400,
                entity_type='Staff',
                entity_ids=[staff_id],
                additional_data={
                    'staff_email': staff_member.email,
                    'staff_full_name': f"{staff_member.first_name} {staff_member.last_name}",
                    'attempted_changes': field_changes,
                    'changes_count': len(field_changes)
                }
            )
            return JsonResponse(
                {"error": f"Email '{data['email']}' already exists."}, status=400
            )

        # IF EMAIL IS BEING CHANGED - Require TOTP verification
        new_email = data.get("email", "").strip().lower()
        if new_email and new_email != original_email:
            # Check if TOTP code was provided for verification
            totp_code = data.get("totp_code", "").strip()
            
            if not totp_code:
                # First call: send TOTP to new email
                request.session['pending_staff_update'] = {
                    'staff_id': staff_id,
                    'data': data,
                    'original_email': original_email
                }
                request.session['staff_update_new_email'] = new_email
                
                # Send TOTP to new email
                TOTPCode.objects.filter(email=new_email, used=False).update(used=True)
                code = TOTPCode.generate_code()
                TOTPCode.objects.create(email=new_email, code=code)
                
                subject = "Email Change Verification - Child's Smile"
                message = f"""
                Hello {data.get('first_name', staff_member.first_name)},
                
                An email change has been requested for this staff account.
                
                Your verification code is: {code}
                
                This code will expire in 5 minutes.
                
                Please provide this code to verify and complete the email change.
                
                Best regards,
                Child's Smile Team
                """
                
                try:
                    send_mail(
                        subject,
                        message,
                        settings.DEFAULT_FROM_EMAIL,
                        [new_email],
                        fail_silently=False,
                    )
                    
                    return JsonResponse({
                        "message": "Verification code sent to new email address",
                        "email": new_email,
                        "requires_verification": True
                    })
                    
                except Exception as email_error:
                    log_api_action(
                        request=request,
                        action='UPDATE_STAFF_FAILED',
                        success=False,
                        error_message=f"Failed to send verification email: {str(email_error)}",
                        status_code=500,
                        entity_type='Staff',
                        entity_ids=[staff_id],
                        additional_data={
                            'staff_email': staff_member.email,
                            'attempted_new_email': new_email
                        }
                    )
                    return JsonResponse({"error": "Failed to send verification email"}, status=500)
            else:
                # Second call: verify TOTP code
                totp_record = TOTPCode.objects.filter(
                    email=new_email,
                    used=False
                ).order_by('-created_at').first()
                
                if not totp_record:
                    log_api_action(
                        request=request,
                        action='UPDATE_STAFF_FAILED',
                        success=False,
                        error_message="Invalid or expired code",
                        status_code=400,
                        entity_type='Staff',
                        entity_ids=[staff_id],
                        additional_data={
                            'staff_email': staff_member.email,
                            'staff_full_name': f"{staff_member.first_name} {staff_member.last_name}",
                            'attempted_changes': field_changes,
                            'changes_count': len(field_changes)
                        }
                    )
                    return JsonResponse({"error": "Invalid or expired code"}, status=400)
                
                if not totp_record.is_valid():
                    log_api_action(
                        request=request,
                        action='UPDATE_STAFF_FAILED',
                        success=False,
                        error_message="Code has expired or too many attempts",
                        status_code=400,
                        entity_type='Staff',
                        entity_ids=[staff_id],
                        additional_data={
                            'staff_email': staff_member.email,
                            'staff_full_name': f"{staff_member.first_name} {staff_member.last_name}",
                            'attempted_changes': field_changes,
                            'changes_count': len(field_changes)
                        }
                    )
                    return JsonResponse({"error": "Code has expired or too many attempts"}, status=400)
                
                totp_record.attempts += 1
                totp_record.save()
                
                if totp_record.code != totp_code:
                    if totp_record.attempts >= 3:
                        totp_record.used = True
                        totp_record.save()
                        log_api_action(
                            request=request,
                            action='UPDATE_STAFF_FAILED',
                            success=False,
                            error_message="Too many failed attempts",
                            status_code=429,
                            entity_type='Staff',
                            entity_ids=[staff_id],
                            additional_data={
                                'staff_email': staff_member.email,
                                'staff_full_name': f"{staff_member.first_name} {staff_member.last_name}",
                                'attempted_changes': field_changes,
                                'changes_count': len(field_changes)
                            }
                        )
                        return JsonResponse({"error": "Too many failed attempts"}, status=429)
                    
                    log_api_action(
                        request=request,
                        action='UPDATE_STAFF_FAILED',
                        success=False,
                        error_message="Invalid code",
                        status_code=400,
                        entity_type='Staff',
                        entity_ids=[staff_id],
                        additional_data={
                            'staff_email': staff_member.email,
                            'staff_full_name': f"{staff_member.first_name} {staff_member.last_name}",
                            'attempted_changes': field_changes,
                            'changes_count': len(field_changes)
                        }
                    )
                    return JsonResponse({"error": "Invalid code"}, status=400)
                
                # Mark TOTP as used - verified, continue with update below
                totp_record.used = True
                totp_record.save()
                # Clean up session
                if 'pending_staff_update' in request.session:
                    del request.session['pending_staff_update']
                if 'staff_update_new_email' in request.session:
                    del request.session['staff_update_new_email']

        # Continue with actual update (for both no-email-change and verified email-change cases)
        
        
        # Update roles if provided
        if "roles" in data:
            roles = data["roles"]
            if isinstance(roles, list):
                staff_member.roles.clear()
                for role_name in roles:
                    try:
                        role = Role.objects.get(role_name=role_name)
                        staff_member.roles.add(role)
                    except Role.DoesNotExist:
                        log_api_action(
                            request=request,
                            action='UPDATE_STAFF_FAILED',
                            success=False,
                            error_message=f"Role with name '{role_name}' does not exist",
                            status_code=400,
                            entity_type='Staff',
                            entity_ids=[staff_id],
                            additional_data={
                                'staff_email': staff_member.email,
                                'staff_full_name': f"{staff_member.first_name} {staff_member.last_name}",
                                'attempted_changes': field_changes,
                                'changes_count': len(field_changes)
                            }
                        )
                        return JsonResponse(
                            {"error": f"Role with name '{role_name}' does not exist."},
                            status=400,
                        )
            else:
                log_api_action(
                    request=request,
                    action='UPDATE_STAFF_FAILED',
                    success=False,
                    error_message="Roles should be provided as a list of role names",
                    status_code=400,
                    entity_type='Staff',
                    entity_ids=[staff_id],
                    additional_data={
                        'staff_email': staff_member.email,
                        'staff_full_name': f"{staff_member.first_name} {staff_member.last_name}",
                        'attempted_changes': field_changes,
                        'changes_count': len(field_changes)
                    }
                )
                return JsonResponse(
                    {"error": "Roles should be provided as a list of role names."},
                    status=400,
                )

        # Propagate email changes to related tables
        old_email = staff_member.email
        if old_email != data["email"]:
            SignedUp.objects.filter(email=old_email).update(email=data["email"])
            Tutors.objects.filter(tutor_email=old_email).update(
                tutor_email=data["email"]
            )

        # Update fields
        staff_member.username = data.get("username", staff_member.username)
        staff_member.email = data.get("email", staff_member.email)
        staff_member.first_name = data.get("first_name", staff_member.first_name)
        staff_member.last_name = data.get("last_name", staff_member.last_name)

        # Save the updated staff record
        try:
            staff_member.save()
        except DatabaseError as db_error:
            log_api_action(
                request=request,
                action='UPDATE_STAFF_FAILED',
                success=False,
                error_message=f"Database error: {str(db_error)}",
                status_code=500,
                entity_type='Staff',
                entity_ids=[staff_id],
                additional_data={
                    'staff_email': staff_member.email,
                    'staff_full_name': f"{staff_member.first_name} {staff_member.last_name}",
                    'attempted_changes': field_changes,
                    'changes_count': len(field_changes)
                }
            )
            return JsonResponse(
                {"error": f"Database error: {str(db_error)}"}, status=500
            )

        # Log successful update
        log_api_action(
            request=request,
            action='UPDATE_STAFF_SUCCESS',
            affected_tables=['childsmile_app_staff', 'childsmile_app_staff_roles'],
            entity_type='Staff',
            entity_ids=[staff_member.staff_id],
            success=True,
            additional_data={
                'updated_staff_email': staff_member.email,
                'staff_full_name': f"{staff_member.first_name} {staff_member.last_name}",
                'updated_roles': data.get('roles', []),
                'field_changes': field_changes,
                'changes_count': len(field_changes)
            }
        )

        return JsonResponse(
            {
                "message": "Staff member updated successfully",
                "staff_id": staff_member.staff_id,
            },
            status=200,
        )
    except Exception as e:
        log_api_action(
            request=request,
            action='UPDATE_STAFF_FAILED',
            success=False,
            error_message=str(e),
            status_code=500,
            entity_type='Staff',
            entity_ids=[staff_id],
            additional_data={
                'staff_email': staff_member.email if 'staff_member' in locals() else 'Unknown',
                'staff_full_name': f"{staff_member.first_name} {staff_member.last_name}" if 'staff_member' in locals() else 'Unknown',
                'attempted_changes': field_changes if 'field_changes' in locals() else [],
                'changes_count': len(field_changes) if 'field_changes' in locals() else 0
            }
        )
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
@api_view(["DELETE"])
def delete_staff_member(request, staff_id):
    """
    Delete a staff member
    """
    user_id = request.session.get("user_id")
    if not user_id:
        log_api_action(
            request=request,
            action='DELETE_STAFF_FAILED',
            success=False,
            error_message="Authentication credentials were not provided",
            status_code=403,
            entity_type='Staff',
            entity_ids=[staff_id],
            additional_data={
                'deleted_staff_email': 'Unknown - Not Found',
                'deleted_staff_full_name': 'Unknown - Not Found',
                'deleted_staff_id': staff_id,
                'deleted_staff_roles': []
            }
        )
        return JsonResponse({"detail": "Authentication credentials were not provided."}, status=403)

    user = Staff.objects.get(staff_id=user_id)
    
    # Fetch the staff member FIRST so we have their data for audit
    try:
        staff_member = Staff.objects.get(staff_id=staff_id)
    except Staff.DoesNotExist:
        log_api_action(
            request=request,
            action='DELETE_STAFF_FAILED',
            success=False,
            error_message="Staff member not found",
            status_code=404,
            entity_type='Staff',
            entity_ids=[staff_id],
            additional_data={
                'deleted_staff_email': 'Unknown - Not Found',
                'deleted_staff_full_name': 'Unknown - Not Found',
                'deleted_staff_id': staff_id,
                'deleted_staff_roles': []
            }
        )
        return JsonResponse({"error": "Staff member not found."}, status=404)

    # NOW check permission - with staff data available
    if not is_admin(user):
        deleted_email = staff_member.email
        deleted_full_name = f"{staff_member.first_name} {staff_member.last_name}"
        deleted_roles = [role.role_name for role in staff_member.roles.all()]
        
        log_api_action(
            request=request,
            action='DELETE_STAFF_FAILED',
            success=False,
            error_message="You do not have permission to delete staff",
            status_code=401,
            entity_type='Staff',
            entity_ids=[staff_id],
            additional_data={
                'deleted_staff_email': deleted_email,
                'deleted_staff_full_name': deleted_full_name,
                'deleted_staff_id': staff_id,
                'deleted_staff_roles': deleted_roles
            }
        )
        return JsonResponse({"error": "You do not have permission to delete staff."}, status=401)

    try:
        # Store info before deletion - MUST get roles before delete
        deleted_email = staff_member.email
        deleted_full_name = f"{staff_member.first_name} {staff_member.last_name}"
        deleted_roles = [role.role_name for role in staff_member.roles.all()]
        
        # Delete related data
        SignedUp.objects.filter(email=staff_member.email).delete()
        from .models import General_Volunteer
        General_Volunteer.objects.filter(staff=staff_member).delete()
        Pending_Tutor.objects.filter(id__email=staff_member.email).delete()
        Tutors.objects.filter(staff=staff_member).delete()
        from .models import Tutorships
        Tutorships.objects.filter(tutor__staff=staff_member).delete()
        Tasks.objects.filter(assigned_to=staff_member).delete()

        # Delete the staff record
        staff_member.delete()

        # Log successful deletion
        log_api_action(
            request=request,
            action='DELETE_STAFF_SUCCESS',
            affected_tables=['childsmile_app_staff', 'childsmile_app_signedup', 'childsmile_app_general_volunteer'],
            entity_type='Staff',
            entity_ids=[staff_id],
            success=True,
            additional_data={
                'deleted_staff_email': deleted_email,
                'deleted_staff_full_name': deleted_full_name,
                'deleted_staff_id': staff_id,
                'deleted_staff_roles': deleted_roles
            }
        )

        return JsonResponse({
            "message": "Staff member and related data deleted successfully",
            "staff_id": staff_id,
        }, status=200)
        
    except Exception as e:
        log_api_action(
            request=request,
            action='DELETE_STAFF_FAILED',
            success=False,
            error_message=str(e),
            status_code=500,
            entity_type='Staff',
            entity_ids=[staff_id],
            additional_data={
                'deleted_staff_email': staff_member.email if 'staff_member' in locals() else 'Unknown - Error',
                'deleted_staff_full_name': f"{staff_member.first_name} {staff_member.last_name}" if 'staff_member' in locals() else 'Unknown - Error',
                'deleted_staff_id': staff_id,
                'deleted_staff_roles': deleted_roles if 'deleted_roles' in locals() else []
            }
        )
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
@api_view(["POST"])
def create_staff_member(request):
    """
    Create a new staff member and assign roles.
    """
    user_id = request.session.get("user_id")
    if not user_id:
        log_api_action(
            request=request,
            action='CREATE_STAFF_FAILED',
            success=False,
            error_message="Authentication credentials were not provided",
            status_code=403
        )
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )

    user = Staff.objects.get(staff_id=user_id)
    if not is_admin(user):
        log_api_action(
            request=request,
            action='CREATE_STAFF_FAILED',
            success=False,
            error_message="You do not have permission to create a staff member",
            status_code=401
        )
        return JsonResponse(
            {"error": "You do not have permission to create a staff member."},
            status=401,
        )

    try:
        data = request.data

        required_fields = ["username", "email", "first_name", "last_name"]
        missing_fields = [
            field for field in required_fields if not data.get(field, "").strip()
        ]
        if missing_fields:
            log_api_action(
                request=request,
                action='CREATE_STAFF_FAILED',
                success=False,
                error_message=f"Missing or empty required fields: {', '.join(missing_fields)}",
                status_code=400
            )
            return JsonResponse(
                {
                    "error": f"Missing or empty required fields: {', '.join(missing_fields)}"
                },
                status=400,
            )

        if Staff.objects.filter(username=data["username"]).exists():
            log_api_action(
                request=request,
                action='CREATE_STAFF_FAILED',
                success=False,
                error_message=f"Username '{data['username']}' already exists",
                status_code=400
            )
            return JsonResponse(
                {"error": f"Username '{data['username']}' already exists."}, status=400
            )

        if Staff.objects.filter(email=data["email"]).exists():
            log_api_action(
                request=request,
                action='CREATE_STAFF_FAILED',
                success=False,
                error_message=f"Email '{data['email']}' already exists",
                status_code=400
            )
            return JsonResponse(
                {"error": f"Email '{data['email']}' already exists."}, status=400
            )

        staff_member = Staff.objects.create(
            username=data["username"],
            email=data["email"],
            first_name=data["first_name"],
            last_name=data["last_name"],
            created_at=datetime.datetime.now(),
        )

        roles = data["roles"]
        if isinstance(roles, list):
            if "General Volunteer" in roles or "Tutor" in roles:
                log_api_action(
                    request=request,
                    action='CREATE_STAFF_FAILED',
                    success=False,
                    error_message="Cannot create a user with 'General Volunteer' nor 'Tutor' roles via this flow",
                    status_code=400
                )
                return JsonResponse(
                    {
                        "error": "Cannot create a user with 'General Volunteer' nor 'Tutor' roles via this flow."
                    },
                    status=400,
                )
            staff_member.roles.clear()
            for role_name in roles:
                try:
                    role = Role.objects.get(role_name=role_name)
                    staff_member.roles.add(role)
                except Role.DoesNotExist:
                    log_api_action(
                        request=request,
                        action='CREATE_STAFF_FAILED',
                        success=False,
                        error_message=f"Role with name '{role_name}' does not exist",
                        status_code=400
                    )
                    return JsonResponse(
                        {"error": f"Role with name '{role_name}' does not exist."},
                        status=400,
                    )
        else:
            log_api_action(
                request=request,
                action='CREATE_STAFF_FAILED',
                success=False,
                error_message="Roles should be provided as a list of role names",
                status_code=400
            )
            return JsonResponse(
                {"error": "Roles should be provided as a list of role names."},
                status=400,
            )
        
        log_api_action(
            request=request,
            action='CREATE_STAFF_SUCCESS',
            affected_tables=['childsmile_app_staff', 'childsmile_app_staff_roles'],
            entity_type='Staff',
            entity_ids=[staff_member.staff_id],
            success=True,
            additional_data={
                'created_staff_email': data["email"],
                'assigned_roles': roles,
                'step': 'completed'
            }
        )
        
        print(
            f"DEBUG: Staff member created successfully with ID {staff_member.staff_id}"
        )
        return JsonResponse(
            {
                "message": "Staff member created successfully",
                "staff_id": staff_member.staff_id,
            },
            status=201,
        )
    except Exception as e:
        print(f"DEBUG: An error occurred while creating a staff member: {str(e)}")
        log_api_action(
            request=request,
            action='CREATE_STAFF_FAILED',
            success=False,
            error_message=str(e),
            status_code=500
        )
        return JsonResponse({"error": str(e)}, status=500)


def create_staff_member_internal(data, request=None):
    """
    Internal function to create staff member
    """
    try:
        staff_member = Staff.objects.create(
            username=data["username"],
            email=data["email"],
            first_name=data["first_name"],
            last_name=data["last_name"],
            created_at=datetime.datetime.now(),
        )

        roles = data["roles"]
        if isinstance(roles, list):
            if "General Volunteer" in roles or "Tutor" in roles:
                if request:
                    log_api_action(
                        request=request,
                        action='CREATE_STAFF_FAILED',
                        success=False,
                        error_message="Cannot create user with 'General Volunteer' or 'Tutor' roles",
                        status_code=400
                    )
                return JsonResponse({
                    "error": "Cannot create user with 'General Volunteer' or 'Tutor' roles"
                }, status=400)
            staff_member.roles.clear()
            for role_name in roles:
                try:
                    role = Role.objects.get(role_name=role_name)
                    staff_member.roles.add(role)
                except Role.DoesNotExist:
                    if request:
                        log_api_action(
                            request=request,
                            action='CREATE_STAFF_FAILED',
                            success=False,
                            error_message=f"Role '{role_name}' does not exist",
                            status_code=400
                        )
                    return JsonResponse({
                        "error": f"Role '{role_name}' does not exist"
                    }, status=400)

        if request:
            log_api_action(
                request=request,
                action='CREATE_STAFF_SUCCESS',
                affected_tables=['childsmile_app_staff', 'childsmile_app_staff_roles'],
                entity_type='Staff',
                entity_ids=[staff_member.staff_id],
                success=True,
                additional_data={
                    'created_staff_email': data["email"],
                    'assigned_roles': roles
                }
            )

        return JsonResponse({
            "message": "Staff member created successfully",
            "staff_id": staff_member.staff_id,
        }, status=201)

    except Exception as e:
        if request:
            log_api_action(
                request=request,
                action='CREATE_STAFF_FAILED',
                success=False,
                error_message=str(e),
                status_code=500
            )
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
@api_view(["POST"])
@ratelimit(key='ip', rate='5/m', method='POST', block=True)
def staff_creation_send_totp(request):
    """
    Send TOTP code for staff creation verification
    """
    try:
        user_id = request.session.get("user_id")
        if not user_id:
            log_api_action(
                request=request,
                action='CREATE_STAFF_FAILED',
                success=False,
                error_message="Authentication required",
                status_code=403
            )
            return JsonResponse({"detail": "Authentication required"}, status=403)

        user = Staff.objects.get(staff_id=user_id)
        if not is_admin(user):
            log_api_action(
                request=request,
                action='CREATE_STAFF_FAILED',
                success=False,
                error_message="Admin permission required",
                status_code=401
            )
            return JsonResponse({"error": "Admin permission required"}, status=401)

        data = request.data
        
        required_fields = ["username", "email", "first_name", "last_name"]
        missing_fields = [field for field in required_fields if not data.get(field, "").strip()]
        
        if not data.get("roles") or not isinstance(data.get("roles"), list) or len(data.get("roles")) == 0:
            missing_fields.append("roles")
            
        if missing_fields:
            log_api_action(
                request=request,
                action='CREATE_STAFF_FAILED',
                success=False,
                error_message=f"Missing or empty required fields: {', '.join(missing_fields)}",
                status_code=400
            )
            return JsonResponse({
                "error": f"Missing or empty required fields: {', '.join(missing_fields)}"
            }, status=400)

        email = data.get("email").strip().lower()
        username = data.get("username")
        first_name = data.get("first_name")
        last_name = data.get("last_name")
        roles = data.get("roles", [])
        
        if Staff.objects.filter(username=username).exists():
            log_api_action(
                request=request,
                action='CREATE_STAFF_FAILED',
                success=False,
                error_message=f"Username '{username}' already exists",
                status_code=400
            )
            return JsonResponse(
                {"error": f"Username '{username}' already exists."}, status=400
            )

        if Staff.objects.filter(email=email).exists():
            log_api_action(
                request=request,
                action='CREATE_STAFF_FAILED',
                success=False,
                error_message=f"Email '{email}' already exists",
                status_code=400,
                additional_data={'attempted_email': email}
            )
            return JsonResponse(
                {"error": f"Email '{email}' already exists."}, status=400
            )

        request.session['pending_staff_creation'] = data
        request.session['staff_creation_new_user_email'] = email

        TOTPCode.objects.filter(email=email, used=False).update(used=True)
        code = TOTPCode.generate_code()
        TOTPCode.objects.create(email=email, code=code)

        subject = "Staff Account Creation Verification - Child's Smile"
        message = f"""
        Hello {first_name},
        
        An admin is creating a staff account for you in the Child's Smile system.
        
        Your verification code is: {code}
        
        This code will expire in 5 minutes.
        
        Please provide this code to the admin to complete your account creation.
        
        Best regards,
        Child's Smile Team
        """
        
        try:
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [email],
                fail_silently=False,
            )
            
            print(f"DEBUG: Sent staff creation TOTP code {code} to {email}")
            
            return JsonResponse({
                "message": "Verification code sent to the new staff member's email",
                "email": email
            })
            
        except Exception as email_error:
            log_api_action(
                request=request,
                action='CREATE_STAFF_FAILED',
                success=False,
                error_message=f"Failed to send verification email: {str(email_error)}",
                status_code=500,
                additional_data={
                    'attempted_email': email,
                    'attempted_username': username
                }
            )
            return JsonResponse({"error": f"Failed to send verification email: {str(email_error)}"}, status=500)
        
    except Staff.DoesNotExist:
        log_api_action(
            request=request,
            action='CREATE_STAFF_FAILED',
            success=False,
            error_message="Authentication required - staff not found",
            status_code=403
        )
        return JsonResponse({"error": "Authentication required"}, status=403)
    except Exception as e:
        print(f"ERROR in staff_creation_send_totp: {str(e)}")
        print(f"DEBUG: Full traceback: {traceback.format_exc()}")
        log_api_action(
            request=request,
            action='CREATE_STAFF_FAILED',
            success=False,
            error_message=str(e),
            status_code=500
        )
        return JsonResponse({"error": "Failed to send verification code"}, status=500)


@csrf_exempt
@api_view(["POST"])
@ratelimit(key='ip', rate='10/m', method='POST', block=True)
def staff_creation_verify_totp(request):
    """
    Verify TOTP and complete staff creation
    """
    try:
        print(f"DEBUG: staff_creation_verify_totp called")
        print(f"DEBUG: Request body: {request.body}")
        
        user_id = request.session.get("user_id")
        if not user_id:
            print(f"DEBUG: No user_id in session")
            log_api_action(
                request=request,
                action='CREATE_STAFF_FAILED',
                success=False,
                error_message="Authentication required",
                status_code=403
            )
            return JsonResponse({"detail": "Authentication required"}, status=403)

        user = Staff.objects.get(staff_id=user_id)
        if not is_admin(user):
            print(f"DEBUG: User {user_id} is not admin")
            log_api_action(
                request=request,
                action='CREATE_STAFF_FAILED',
                success=False,
                error_message="Admin permission required",
                status_code=401
            )
            return JsonResponse({"error": "Admin permission required"}, status=401)

        data = json.loads(request.body)
        code = data.get('code', '').strip()
        
        email = request.session.get('staff_creation_new_user_email', '').strip().lower()
        
        print(f"DEBUG: Email from session: '{email}', code from request: '{code}'")
        print(f"DEBUG: Session keys: {list(request.session.keys())}")
        
        if not email or not code:
            print(f"DEBUG: Missing email or code - email: '{email}', code: '{code}'")
            log_api_action(
                request=request,
                action='CREATE_STAFF_FAILED',
                success=False,
                error_message="Invalid session or missing code",
                status_code=400
            )
            return JsonResponse({"error": "Invalid session or missing code"}, status=400)
        
        totp_record = TOTPCode.objects.filter(
            email=email,
            used=False
        ).order_by('-created_at').first()
        
        print(f"DEBUG: Found TOTP record: {totp_record}")
        if totp_record:
            print(f"DEBUG: TOTP code in DB: '{totp_record.code}', received: '{code}'")
            print(f"DEBUG: TOTP is_valid: {totp_record.is_valid()}")
        
        if not totp_record:
            print(f"DEBUG: No TOTP record found for email: {email}")
            log_api_action(
                request=request,
                action='CREATE_STAFF_FAILED',
                success=False,
                error_message="Invalid or expired code",
                status_code=400,
                additional_data={'attempted_email': email}
            )
            return JsonResponse({"error": "Invalid or expired code"}, status=400)
            
        if not totp_record.is_valid():
            print(f"DEBUG: TOTP record is not valid")
            log_api_action(
                request=request,
                action='CREATE_STAFF_FAILED',
                success=False,
                error_message="Code has expired or too many attempts",
                status_code=400,
                additional_data={'attempted_email': email}
            )
            return JsonResponse({"error": "Code has expired or too many attempts"}, status=400)
        
        totp_record.attempts += 1
        totp_record.save()
        
        if totp_record.code != code:
            print(f"DEBUG: Code mismatch - DB: '{totp_record.code}', received: '{code}'")
            if totp_record.attempts >= 3:
                totp_record.used = True
                totp_record.save()
                log_api_action(
                    request=request,
                    action='CREATE_STAFF_FAILED',
                    success=False,
                    error_message="Too many failed attempts",
                    status_code=429,
                    additional_data={'attempted_email': email}
                )
                return JsonResponse({"error": "Too many failed attempts"}, status=429)
            
            log_api_action(
                request=request,
                action='CREATE_STAFF_FAILED',
                success=False,
                error_message="Invalid code",
                status_code=400,
                additional_data={'attempted_email': email}
            )
            return JsonResponse({"error": "Invalid code"}, status=400)
        
        totp_record.used = True
        totp_record.save()
        print(f"DEBUG: TOTP verification successful")
        
        staff_data = request.session.get('pending_staff_creation')
        print(f"DEBUG: Staff data from session: {staff_data}")
        
        if not staff_data:
            print(f"DEBUG: No staff data in session")
            log_api_action(
                request=request,
                action='CREATE_STAFF_FAILED',
                success=False,
                error_message="Staff creation session expired",
                status_code=400
            )
            return JsonResponse({"error": "Staff creation session expired"}, status=400)
        
        print(f"DEBUG: About to create staff member")
        result = create_staff_member_internal(staff_data, request)
        
        if 'pending_staff_creation' in request.session:
            del request.session['pending_staff_creation']
        if 'staff_creation_new_user_email' in request.session:
            del request.session['staff_creation_new_user_email']
        
        print(f"DEBUG: Staff creation completed successfully")
        return result
        
    except Exception as e:
        print(f"ERROR in staff_creation_verify_totp: {str(e)}")
        print(f"DEBUG: Full traceback: {traceback.format_exc()}")
        log_api_action(
            request=request,
            action='CREATE_STAFF_FAILED',
            success=False,
            error_message=str(e),
            status_code=500
        )
        return JsonResponse({"error": "Staff creation failed"}, status=500)
