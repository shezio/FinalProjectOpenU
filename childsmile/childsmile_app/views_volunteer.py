"""
Volunteer and Tutor registration views - Handle TOTP-based registration
"""
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view
from django_ratelimit.decorators import ratelimit
from django.core.mail import send_mail
from django.conf import settings
from django.db import DatabaseError, transaction
from django.utils.timezone import now
from .models import (
    Staff, TOTPCode, SignedUp, Pending_Tutor, 
    General_Volunteer, Tutors, Role, Children,
    Tutorships, PrevTutorshipStatuses, Tasks
)
from .utils import has_permission
from .audit_utils import log_api_action
import json
import datetime
import traceback


@csrf_exempt
@api_view(["POST"])
@ratelimit(key='ip', rate='5/m', method='POST', block=True)
def register_send_totp(request):
    """
    Send TOTP code for user registration verification
    """
    try:
        data = request.data
        email = data.get("email", "").strip().lower()
        first_name = data.get("first_name", "").strip()
        last_name = data.get("last_name", "").strip()
        registration_type = data.get("type", "").strip()

        # Validate required fields
        if not email or not first_name or not last_name or not registration_type:
            log_api_action(
                request=request,
                action='USER_REGISTRATION_FAILED',
                success=False,
                error_message="Missing required fields: email, first_name, last_name, type",
                status_code=400,
                additional_data={'attempted_email': email}
            )
            return JsonResponse({
                "error": "Missing required fields: email, first_name, last_name, type"
            }, status=400)

        # Check if user already registered
        if SignedUp.objects.filter(email=email).exists():
            log_api_action(
                request=request,
                action='USER_REGISTRATION_FAILED',
                success=False,
                error_message=f"Email '{email}' is already registered",
                status_code=400,
                additional_data={'attempted_email': email}
            )
            return JsonResponse({
                "error": f"Email '{email}' is already registered"
            }, status=400)

        # Store registration data in session
        request.session['pending_registration'] = {
            "email": email,
            "first_name": first_name,
            "last_name": last_name,
            "type": registration_type
        }
        request.session['registration_new_user_email'] = email

        # Mark old codes as used
        TOTPCode.objects.filter(email=email, used=False).update(used=True)
        
        # Generate new code
        code = TOTPCode.generate_code()
        TOTPCode.objects.create(email=email, code=code)

        # Send verification email
        subject = "Verify Your Registration - Child's Smile"
        message = f"""
        Hello {first_name},
        
        Thank you for registering with Child's Smile!
        
        Your verification code is: {code}
        
        This code will expire in 5 minutes.
        
        Please provide this code to complete your registration.
        
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
            
            return JsonResponse({
                "message": "Verification code sent to your email",
                "email": email
            })
            
        except Exception as email_error:
            log_api_action(
                request=request,
                action='USER_REGISTRATION_FAILED',
                success=False,
                error_message=f"Failed to send verification email: {str(email_error)}",
                status_code=500,
                additional_data={
                    'attempted_email': email,
                    'attempted_first_name': first_name,
                    'attempted_last_name': last_name
                }
            )
            return JsonResponse({
                "error": f"Failed to send verification email"
            }, status=500)
        
    except Exception as e:
        print(f"ERROR in register_send_totp: {str(e)}")
        print(f"DEBUG: Full traceback: {traceback.format_exc()}")
        log_api_action(
            request=request,
            action='USER_REGISTRATION_FAILED',
            success=False,
            error_message=str(e),
            status_code=500,
            additional_data={'attempted_email': data.get('email', 'Unknown')}
        )
        return JsonResponse({"error": "Registration failed"}, status=500)


@csrf_exempt
@api_view(["POST"])
@ratelimit(key='ip', rate='10/m', method='POST', block=True)
def register_verify_totp(request):
    """
    Verify TOTP and complete user registration
    """
    try:
        print(f"DEBUG: register_verify_totp called")
        
        data = json.loads(request.body)
        code = data.get('code', '').strip()
        
        email = request.session.get('registration_new_user_email', '').strip().lower()
        print(f"DEBUG: Email from session: '{email}', code from request: '{code}'")
        
        if not email or not code:
            log_api_action(
                request=request,
                action='USER_REGISTRATION_FAILED',
                success=False,
                error_message="Invalid session or missing code",
                status_code=400,
                additional_data={'attempted_email': email}
            )
            return JsonResponse({"error": "Invalid session or missing code"}, status=400)
        
        # Find the TOTP record
        totp_record = TOTPCode.objects.filter(
            email=email,
            used=False
        ).order_by('-created_at').first()
        
        print(f"DEBUG: Found TOTP record: {totp_record}")
        
        if not totp_record:
            log_api_action(
                request=request,
                action='USER_REGISTRATION_FAILED',
                success=False,
                error_message="Invalid or expired code",
                status_code=400,
                additional_data={'attempted_email': email}
            )
            return JsonResponse({"error": "Invalid or expired code"}, status=400)
            
        if not totp_record.is_valid():
            log_api_action(
                request=request,
                action='USER_REGISTRATION_FAILED',
                success=False,
                error_message="Code has expired or too many attempts",
                status_code=400,
                additional_data={'attempted_email': email}
            )
            return JsonResponse({"error": "Code has expired or too many attempts"}, status=400)
        
        totp_record.attempts += 1
        totp_record.save()
        
        if totp_record.code != code:
            if totp_record.attempts >= 3:
                totp_record.used = True
                totp_record.save()
                log_api_action(
                    request=request,
                    action='USER_REGISTRATION_FAILED',
                    success=False,
                    error_message="Too many failed attempts",
                    status_code=429,
                    additional_data={'attempted_email': email}
                )
                return JsonResponse({"error": "Too many failed attempts"}, status=429)
            
            log_api_action(
                request=request,
                action='USER_REGISTRATION_FAILED',
                success=False,
                error_message="Invalid code",
                status_code=400,
                additional_data={'attempted_email': email}
            )
            return JsonResponse({"error": "Invalid code"}, status=400)
        
        totp_record.used = True
        totp_record.save()
        print(f"DEBUG: TOTP verification successful")
        
        registration_data = request.session.get('pending_registration')
        print(f"DEBUG: Registration data from session: {registration_data}")
        
        if not registration_data:
            log_api_action(
                request=request,
                action='USER_REGISTRATION_FAILED',
                success=False,
                error_message="Registration session expired",
                status_code=400,
                additional_data={'attempted_email': email}
            )
            return JsonResponse({"error": "Registration session expired"}, status=400)
        
        print(f"DEBUG: About to create volunteer/tutor")
        result = create_volunteer_or_tutor_internal(registration_data, request)
        
        if 'pending_registration' in request.session:
            del request.session['pending_registration']
        if 'registration_new_user_email' in request.session:
            del request.session['registration_new_user_email']
        
        print(f"DEBUG: Registration completed successfully")
        return result
        
    except Exception as e:
        print(f"ERROR in register_verify_totp: {str(e)}")
        print(f"DEBUG: Full traceback: {traceback.format_exc()}")
        log_api_action(
            request=request,
            action='USER_REGISTRATION_FAILED',
            success=False,
            error_message=str(e),
            status_code=500,
            additional_data={'attempted_email': email if 'email' in locals() else 'Unknown'}
        )
        return JsonResponse({"error": "Registration failed"}, status=500)


@csrf_exempt
@api_view(["POST"])
def create_volunteer_or_tutor(request):
    """
    Create a new volunteer or tutor user via direct API call (not via registration flow)
    """
    try:
        user_id = request.session.get("user_id")
        if not user_id:
            log_api_action(
                request=request,
                action='CREATE_VOLUNTEER_FAILED',
                success=False,
                error_message="Authentication credentials were not provided",
                status_code=403,
                additional_data={'attempted_email': request.data.get('email', 'Unknown')}
            )
            return JsonResponse({
                "detail": "Authentication credentials were not provided."
            }, status=403)

        user = Staff.objects.get(staff_id=user_id)
        
        data = request.data
        email = data.get("email", "").strip().lower()
        first_name = data.get("first_name", "").strip()
        last_name = data.get("last_name", "").strip()
        user_type = data.get("type", "").strip()

        if not email or not first_name or not last_name or not user_type:
            log_api_action(
                request=request,
                action='CREATE_VOLUNTEER_FAILED',
                success=False,
                error_message="Missing required fields: email, first_name, last_name, type",
                status_code=400,
                additional_data={'attempted_email': email}
            )
            return JsonResponse({
                "error": "Missing required fields: email, first_name, last_name, type"
            }, status=400)

        if user_type not in ["General Volunteer", "Tutor"]:
            log_api_action(
                request=request,
                action='CREATE_VOLUNTEER_FAILED',
                success=False,
                error_message="Type must be 'General Volunteer' or 'Tutor'",
                status_code=400,
                additional_data={'attempted_email': email}
            )
            return JsonResponse({
                "error": "Type must be 'General Volunteer' or 'Tutor'"
            }, status=400)

        if SignedUp.objects.filter(email=email).exists():
            log_api_action(
                request=request,
                action='CREATE_VOLUNTEER_FAILED',
                success=False,
                error_message=f"Email '{email}' is already registered",
                status_code=400,
                additional_data={'attempted_email': email}
            )
            return JsonResponse({
                "error": f"Email '{email}' is already registered"
            }, status=400)

        # Create user directly
        signup_user = SignedUp.objects.create(
            email=email,
            first_name=first_name,
            last_name=last_name,
            type=user_type,
            created_at=datetime.datetime.now(),
        )

        # Create role-specific record
        if user_type == "General Volunteer":
            General_Volunteer.objects.create(
                id=signup_user,
                staff=None,
                notes="Created by admin",
                created_at=datetime.datetime.now()
            )
        elif user_type == "Tutor":
            Pending_Tutor.objects.create(
                id=signup_user,
                created_at=datetime.datetime.now()
            )

        log_api_action(
            request=request,
            action='CREATE_VOLUNTEER_SUCCESS',
            affected_tables=['childsmile_app_signedup'],
            entity_type='User',
            entity_ids=[signup_user.id],
            success=True,
            additional_data={
                'created_user_email': email,
                'user_type': user_type,
                'created_by_admin': True
            }
        )

        return JsonResponse({
            "message": "User created successfully",
            "user_id": signup_user.id,
            "email": email,
            "type": user_type
        }, status=201)

    except Staff.DoesNotExist:
        log_api_action(
            request=request,
            action='CREATE_VOLUNTEER_FAILED',
            success=False,
            error_message="Authentication failed - staff not found",
            status_code=403,
            additional_data={'attempted_email': data.get('email', 'Unknown')}
        )
        return JsonResponse({
            "error": "Authentication failed"
        }, status=403)
    except Exception as e:
        print(f"ERROR in create_volunteer_or_tutor: {str(e)}")
        print(f"DEBUG: Full traceback: {traceback.format_exc()}")
        log_api_action(
            request=request,
            action='CREATE_VOLUNTEER_FAILED',
            success=False,
            error_message=str(e),
            status_code=500,
            additional_data={'attempted_email': data.get('email', 'Unknown')}
        )
        return JsonResponse({"error": str(e)}, status=500)


def create_volunteer_or_tutor_internal(data, request=None):
    """
    Internal function to create volunteer or tutor user during registration
    """
    try:
        email = data.get("email", "").strip().lower()
        first_name = data.get("first_name", "").strip()
        last_name = data.get("last_name", "").strip()
        user_type = data.get("type", "").strip()

        print(f"DEBUG: Creating {user_type} with email {email}")
        
        # Check if already exists
        if SignedUp.objects.filter(email=email).exists():
            log_action_data = {
                'attempted_email': email,
                'attempted_first_name': first_name,
                'attempted_last_name': last_name
            }
            if request:
                log_api_action(
                    request=request,
                    action='CREATE_VOLUNTEER_FAILED',
                    success=False,
                    error_message=f"Email '{email}' is already registered",
                    status_code=400,
                    additional_data=log_action_data
                )
            return JsonResponse({
                "error": f"Email '{email}' is already registered"
            }, status=400)

        # Create user
        signup_user = SignedUp.objects.create(
            email=email,
            first_name=first_name,
            last_name=last_name,
            type=user_type,
            created_at=datetime.datetime.now(),
        )

        print(f"DEBUG: Created SignedUp user with id {signup_user.id}")

        # Create role-specific record
        if user_type == "General Volunteer":
            General_Volunteer.objects.create(
                id=signup_user,
                staff=None,
                notes="Self-registered via volunteer flow",
                created_at=datetime.datetime.now()
            )
            print(f"DEBUG: Created General_Volunteer record")
        elif user_type == "Tutor":
            Pending_Tutor.objects.create(
                id=signup_user,
                created_at=datetime.datetime.now()
            )
            print(f"DEBUG: Created Pending_Tutor record")

        if request:
            log_api_action(
                request=request,
                action='CREATE_VOLUNTEER_SUCCESS',
                affected_tables=['childsmile_app_signedup'],
                entity_type='User',
                entity_ids=[signup_user.id],
                success=True,
                additional_data={
                    'created_user_email': email,
                    'user_type': user_type,
                    'registration_flow': 'TOTP verified'
                }
            )

        print(f"DEBUG: {user_type} creation successful")
        
        return JsonResponse({
            "message": "Registration successful",
            "user_id": signup_user.id,
            "email": email,
            "type": user_type
        }, status=201)

    except Exception as e:
        print(f"ERROR in create_volunteer_or_tutor_internal: {str(e)}")
        print(f"DEBUG: Full traceback: {traceback.format_exc()}")
        
        if request:
            log_api_action(
                request=request,
                action='CREATE_VOLUNTEER_FAILED',
                success=False,
                error_message=str(e),
                status_code=500,
                additional_data={'attempted_email': data.get('email', 'Unknown')}
            )
        
        return JsonResponse({
            "error": "Registration failed: " + str(e)
        }, status=500)


@csrf_exempt
@api_view(["POST"])
def create_pending_tutor(request):
    """
    Create a pending tutor record for an existing user
    """
    try:
        user_id = request.session.get("user_id")
        if not user_id:
            log_api_action(
                request=request,
                action='CREATE_PENDING_TUTOR_FAILED',
                success=False,
                error_message="Authentication credentials were not provided",
                status_code=403,
                additional_data={'attempted_email': request.data.get('email', 'Unknown')}
            )
            return JsonResponse({
                "detail": "Authentication credentials were not provided."
            }, status=403)

        user = Staff.objects.get(staff_id=user_id)
        
        data = request.data
        email = data.get("email", "").strip().lower()

        if not email:
            log_api_action(
                request=request,
                action='CREATE_PENDING_TUTOR_FAILED',
                success=False,
                error_message="Missing required field: email",
                status_code=400,
                additional_data={'attempted_email': email}
            )
            return JsonResponse({
                "error": "Missing required field: email"
            }, status=400)

        # Find the user
        try:
            signup_user = SignedUp.objects.get(email=email)
        except SignedUp.DoesNotExist:
            log_api_action(
                request=request,
                action='CREATE_PENDING_TUTOR_FAILED',
                success=False,
                error_message=f"User with email '{email}' not found",
                status_code=404,
                additional_data={'attempted_email': email}
            )
            return JsonResponse({
                "error": f"User with email '{email}' not found"
            }, status=404)

        # Check if already a pending tutor
        if Pending_Tutor.objects.filter(id=signup_user).exists():
            log_api_action(
                request=request,
                action='CREATE_PENDING_TUTOR_FAILED',
                success=False,
                error_message=f"User is already a pending tutor",
                status_code=400,
                additional_data={'attempted_email': email}
            )
            return JsonResponse({
                "error": "User is already a pending tutor"
            }, status=400)

        # Create pending tutor record
        pending_tutor = Pending_Tutor.objects.create(
            id=signup_user,
            created_at=datetime.datetime.now()
        )

        log_api_action(
            request=request,
            action='CREATE_PENDING_TUTOR_SUCCESS',
            affected_tables=['childsmile_app_pending_tutor'],
            entity_type='PendingTutor',
            entity_ids=[pending_tutor.id],
            success=True,
            additional_data={
                'user_email': email,
                'user_name': f"{signup_user.first_name} {signup_user.last_name}"
            }
        )

        return JsonResponse({
            "message": "Pending tutor record created successfully",
            "user_id": signup_user.id,
            "email": email
        }, status=201)

    except Staff.DoesNotExist:
        log_api_action(
            request=request,
            action='CREATE_PENDING_TUTOR_FAILED',
            success=False,
            error_message="Authentication failed - staff not found",
            status_code=403,
            additional_data={'attempted_email': data.get('email', 'Unknown')}
        )
        return JsonResponse({
            "error": "Authentication failed"
        }, status=403)
    except Exception as e:
        print(f"ERROR in create_pending_tutor: {str(e)}")
        print(f"DEBUG: Full traceback: {traceback.format_exc()}")
        log_api_action(
            request=request,
            action='CREATE_PENDING_TUTOR_FAILED',
            success=False,
            error_message=str(e),
            status_code=500,
            additional_data={'attempted_email': data.get('email', 'Unknown')}
        )
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
@api_view(["PUT"])
def update_general_volunteer(request, volunteer_id):
    """
    Update a general volunteer's information
    """
    user_id = request.session.get("user_id")
    if not user_id:
        log_api_action(
            request=request,
            action='UPDATE_GENERAL_VOLUNTEER_FAILED',
            success=False,
            error_message="Authentication credentials were not provided",
            status_code=403
        )
        return JsonResponse({"detail": "Authentication credentials were not provided."}, status=403)
    if not has_permission(request, "general_volunteer", "UPDATE"):
        log_api_action(
            request=request,
            action='UPDATE_GENERAL_VOLUNTEER_FAILED',
            success=False,
            error_message="You do not have permission to access this resource",
            status_code=401,
            entity_type='General_Volunteer',
            entity_ids=[volunteer_id]
        )
        return JsonResponse({"error": "You do not have permission to access this resource."}, status=401)

    try:
        volunteer = General_Volunteer.objects.get(id_id=volunteer_id)
    except General_Volunteer.DoesNotExist:
        log_api_action(
            request=request,
            action='UPDATE_GENERAL_VOLUNTEER_FAILED',
            success=False,
            error_message="General Volunteer not found",
            status_code=404,
            entity_type='General_Volunteer',
            entity_ids=[volunteer_id],
            additional_data={'attempted_email': 'Unknown'}
        )
        return JsonResponse({"error": "General Volunteer not found."}, status=404)

    data = request.data
    old_comments = volunteer.comments
    volunteer.comments = data.get("comments", volunteer.comments)
    volunteer.save()

    log_api_action(
        request=request,
        action='UPDATE_GENERAL_VOLUNTEER_SUCCESS',
        affected_tables=['childsmile_app_general_volunteer'],
        entity_type='General_Volunteer',
        entity_ids=[volunteer_id],
        success=True,
        additional_data={
            'old_comments': old_comments,
            'new_comments': volunteer.comments,
            'volunteer_name': f"{volunteer.id.first_name} {volunteer.id.last_name}",
            'volunteer_email': volunteer.id.email
        }
    )

    return JsonResponse({"message": "General Volunteer updated successfully."}, status=200)


@csrf_exempt
@api_view(["PUT"])
def update_tutor(request, tutor_id):
    """
    Update a tutor's information including email, status, and wellness data
    """
    user_id = request.session.get("user_id")
    if not user_id:
        log_api_action(
            request=request,
            action='UPDATE_TUTOR_FAILED',
            success=False,
            error_message="Authentication credentials were not provided",
            status_code=403
        )
        return JsonResponse({"detail": "Authentication credentials were not provided."}, status=403)
    if not has_permission(request, "tutors", "UPDATE"):
        log_api_action(
            request=request,
            action='UPDATE_TUTOR_FAILED',
            success=False,
            error_message="You do not have permission to access this resource",
            status_code=401,
            entity_type='Tutor',
            entity_ids=[tutor_id]
        )
        return JsonResponse({"error": "You do not have permission to access this resource."}, status=401)

    try:
        tutor = Tutors.objects.get(id_id=tutor_id)
    except Tutors.DoesNotExist:
        log_api_action(
            request=request,
            action='UPDATE_TUTOR_FAILED',
            success=False,
            error_message="Tutor not found",
            status_code=404,
            entity_type='Tutor',
            entity_ids=[tutor_id],
            additional_data={
                'tutor_name': 'Unknown',
                'tutor_email': 'Unknown',
                'attempted_fields': list(request.data.keys()) if hasattr(request, 'data') else []
            }
        )
        return JsonResponse({"error": "Tutor not found."}, status=404)

    data = request.data
    updated = False
    
    # Store original values for audit
    original_data = {
        'tutor_email': tutor.tutor_email,
        'relationship_status': tutor.relationship_status,
        'tutee_wellness': tutor.tutee_wellness,
        'tutorship_status': tutor.tutorship_status,
        'preferences': tutor.preferences
    }
    
    affected_tables = ['childsmile_app_tutors']

    # Update tutor_email in both Tutors and Staff tables
    if "tutor_email" in data:
        tutor.tutor_email = data["tutor_email"]
        try:
            staff = Staff.objects.get(staff_id=tutor.staff_id)
            staff.email = data["tutor_email"]
            staff.save()
            affected_tables.append('childsmile_app_staff')
        except Staff.DoesNotExist:
            pass
        updated = True

    # Try to locate existing tutorship (we'll need it later)
    tutorship = Tutorships.objects.filter(tutor_id=tutor_id).first()
    child = tutorship.child if tutorship else None

    # Only allow updating relationship_status and tutee_wellness if tutor is in tutorship
    if ("relationship_status" in data or "tutee_wellness" in data) and tutorship and child:
        if "relationship_status" in data:
            new_status = data["relationship_status"]
            if new_status != tutor.relationship_status:
                tutor.relationship_status = new_status
                child.marital_status = new_status
                child.save()
                affected_tables.append('childsmile_app_children')
                updated = True

        if "tutee_wellness" in data:
            new_wellness = data["tutee_wellness"]
            if new_wellness != tutor.tutee_wellness:
                tutor.tutee_wellness = new_wellness
                child.current_medical_state = new_wellness
                child.save()
                if 'childsmile_app_children' not in affected_tables:
                    affected_tables.append('childsmile_app_children')
                updated = True

    # --- Tutorship status logic + PrevTutorshipStatuses ---
    if "tutorship_status" in data:
        new_tutor_status = data["tutorship_status"]
        if new_tutor_status != tutor.tutorship_status:
            tutor.tutorship_status = new_tutor_status
            updated = True

            # Find existing prev record
            prev = PrevTutorshipStatuses.objects.filter(tutor_id=tutor).order_by('-last_updated').first()

            if prev:
                prev.tutor_tut_status = new_tutor_status
                prev.save()
                affected_tables.append('childsmile_app_prevtutorshipstatuses')
            else:
                PrevTutorshipStatuses.objects.create(
                    tutor_id=tutor,
                    child_id=child if child else None,
                    tutor_tut_status=new_tutor_status,
                    child_tut_status=child.tutorship_status if child else "",
                )
                affected_tables.append('childsmile_app_prevtutorshipstatuses')

    # --- Child status logic (if provided) ---
    if "child_tut_status" in data and child:
        new_child_status = data["child_tut_status"]

        # assuming child has field tutorship_status or equivalent
        if getattr(child, "tutorship_status", "") != new_child_status:
            setattr(child, "tutorship_status", new_child_status)
            child.save()
            if 'childsmile_app_children' not in affected_tables:
                affected_tables.append('childsmile_app_children')
            updated = True

            # update PrevTutorshipStatuses
            prev = PrevTutorshipStatuses.objects.filter(child_id=child).order_by('-last_updated').first()

            if prev:
                prev.child_tut_status = new_child_status
                prev.save()
                if 'childsmile_app_prevtutorshipstatuses' not in affected_tables:
                    affected_tables.append('childsmile_app_prevtutorshipstatuses')
            else:
                PrevTutorshipStatuses.objects.create(
                    tutor_id=tutor,
                    child_id=child,
                    tutor_tut_status=tutor.tutorship_status,
                    child_tut_status=new_child_status,
                )
                if 'childsmile_app_prevtutorshipstatuses' not in affected_tables:
                    affected_tables.append('childsmile_app_prevtutorshipstatuses')

    if "preferences" in data:
        tutor.preferences = data["preferences"]
        updated = True

    if updated:
        tutor.save()
        
        # Determine what changed for audit
        changed_fields = {}
        for field, original_value in original_data.items():
            if field in data:
                new_value = getattr(tutor, field, data[field])
                if original_value != new_value:
                    changed_fields[field] = {
                        'old': original_value,
                        'new': new_value
                    }

        log_api_action(
            request=request,
            action='UPDATE_TUTOR_SUCCESS',
            affected_tables=affected_tables,
            entity_type='Tutor',
            entity_ids=[tutor_id],
            success=True,
            additional_data={
                'changed_fields': changed_fields,
                'has_tutorship': tutorship is not None,
                'child_id': child.child_id if child else None,
                'child_name': child.full_name if child else 'Unknown',
                'tutor_name': f"{tutor.staff_id.username if tutor.staff_id else 'Unknown'}",
                'tutor_email': tutor.tutor_email
            }
        )
        
        return JsonResponse({"message": "Tutor updated successfully."}, status=200)
    else:
        log_api_action(
            request=request,
            action='UPDATE_TUTOR_SUCCESS',
            entity_type='Tutor',
            entity_ids=[tutor_id],
            success=True,
            additional_data={
                'changed_fields': {},
                'no_updates_made': True,
                'tutor_name': f"{tutor.staff_id.username if tutor.staff_id else 'Unknown'}",
                'tutor_email': tutor.tutor_email
            }
        )
        return JsonResponse({"message": "No fields updated."}, status=200)
