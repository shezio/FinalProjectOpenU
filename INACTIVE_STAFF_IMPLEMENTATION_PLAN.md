# Inactive Staff Feature - Implementation Plan (UPDATED)

## Overview
This document outlines the complete technical implementation approach for the "Inactive Staff" feature. All code patterns verified against actual codebase.

---

## 1. Database Schema Changes

### 1.1 Staff Model
**Changes needed**:
```
- Add field: is_active (BooleanField, default=True)
- Add field: previous_roles (JSONField, null=True, blank=True)
  Structure: {"role_ids": [1, 3, 5]}  # Only role IDs, NO names
- Add field: deactivation_reason (CharField, max_length=200, null=True, blank=True)
  Purpose: Admin must fill this when deactivating, displayed on grid
```

**Important constraints**:
- `is_active=False` means user cannot login and cannot appear in dropdowns
- `previous_roles` only populated when `is_active=False`, null when True
- `deactivation_reason` persists even after reactivation (audit trail)

### 1.2 Tutorships Model
**ADD NEW FIELD**:
```
- Add field: tutorship_activation (CharField, max_length=50, default='pending_first_approval')
  Choices: 'pending_first_approval', 'active', 'inactive'
  Purpose: Filter tutorships in UI - critical for dashboard and filtering
```

**IMPORTANT - Include ALL Tutorships fields when duplicating**:
When creating an exact duplicate during deactivation, copy ALL fields from original tutorship:
- child_id
- tutor_id  
- approval_counter
- last_approver (copy the list)
- created_date (from original, not auto-set)
- updated_at (from original, not auto-set)
- tutorship_activation='inactive' (only this is different)
- Any other existing fields in the actual model

**Behavior**:
- `approval_counter` works as follows:
  * 1 = created (first approval given by system, automatic)
  * 2 = fully approved (additional approval received)
- `tutorship_activation` tracks status INDEPENDENTLY:
  * 'pending_first_approval' → when approval_counter = 1 (waiting for first approver)
  * 'active' → when approval_counter = 2 (has approvals)
  * 'inactive' → when staff member deactivated (approval_counter irrelevant)
- When staff deactivates: EXACT duplicate with same approval_counter and last_approver, set tutorship_activation='inactive'
- When reactivation occurs: Historical inactive tutorships stay inactive
- New tutorship creation: Cleans up ALL tutorships with that tutor by id

---

## 2. Deactivation Logic (`deactivate_staff` function)

### 2.1 Purpose
When staff member is deactivated, execute comprehensive deactivation with tutorship preservation.

### 2.2 Execution Steps (IN ORDER)

**Step 1: Validate deactivation_reason provided**
```python
def deactivate_staff(staff, performed_by_user, deactivation_reason):
    # Reason must not be empty or only spaces
    if not deactivation_reason or not deactivation_reason.strip():
        raise ValidationError("Deactivation reason required")
    
    if len(deactivation_reason.strip()) > 200:
        raise ValidationError("Reason must be 200 chars or less")
    
    deactivation_reason = deactivation_reason.strip()
```

**Step 2: Save current role IDs to JSON**
```python
    # Get ALL current roles BEFORE removing them
    current_roles = staff.roles.all()
    role_ids = list(current_roles.values_list('role_id', flat=True))
    
    # Save ONLY role_ids to JSON (names stored in Role table anyway)
    staff.previous_roles = {"role_ids": role_ids}
    staff.deactivation_reason = deactivation_reason
    staff.save()
```

**Step 3: Clear all current roles**
```python
    staff.roles.clear()
```

**Step 4: Add Inactive role**
```python
    inactive_role = Role.objects.get(role_name='Inactive')
    staff.roles.add(inactive_role)
```

**Step 5: Set is_active flag**
```python
    staff.is_active = False
    staff.save()
```

**Step 6: Handle tutorships - EXACT DUPLICATE**
```python
    # Get ALL tutorships for this staff member (regardless of approval_counter)
    active_tutorships = Tutorships.objects.filter(
        tutor__staff=staff
    )
    
    for tutorship in active_tutorships:
        # Step 6a: Create EXACT duplicate with ALL fields from original
        Tutorships.objects.create(
            child=tutorship.child,
            tutor=tutorship.tutor,
            approval_counter=tutorship.approval_counter,  # Keep same counter
            last_approver=tutorship.last_approver.copy() if isinstance(tutorship.last_approver, list) else [],
            created_date=tutorship.created_date,  # Keep original created date
            updated_at=tutorship.updated_at,  # Keep original updated date
            tutorship_activation='inactive'  # Mark only this field as inactive
            # Copy any other fields that exist in Tutorships model
        )
        
        # Step 6b: DELETE original tutorship (make room for the inactive copy)
        tutorship.delete()
```

**Step 7: Log to audit AND logger**
```python
    # Log to audit table with proper format
    log_api_action(
        request=request,  # Need to get request obj from caller
        action='DEACTIVATE_STAFF',
        success=True,
        additional_data={
            'staff_email': staff.email,
            'staff_full_name': f"{staff.first_name} {staff.last_name}",
            'staff_id': staff.staff_id,
            'previous_roles': [Role.objects.get(role_id=rid).role_name for rid in role_ids],
            'deactivation_reason': deactivation_reason,
        },
        entity_type='Staff',
        entity_ids=[staff.staff_id]
    )
    
    # Also log to logger for support/debug
    api_logger.info(f"Staff deactivated: {staff.email} (ID: {staff.staff_id}) by {performed_by_user.email}. Reason: {deactivation_reason}")
```

### 2.3 Critical Notes
- Tutorships are duplicated with EXACT counter values and approver lists - DO NOT MODIFY THEM
- Only `tutorship_activation='inactive'` is set on the duplicate to mark it as inactive
- Original tutorship is deleted (only the inactive copy remains)
- No need to save role_names since they're in Role table
- Deactivation reason is required and displayed on staff grid

---

## 3. Reactivation Logic (`activate_staff` function)

### 3.1 Purpose
When "Activate" button clicked in UI, restore staff to active state with previous roles.

### 3.2 Execution Steps (IN ORDER)

**Step 1: Verify inactive**
```python
def activate_staff(staff, performed_by_user):
    if staff.is_active == True:
        raise ValidationError("Staff already active")
    
    if staff.previous_roles is None:
        raise ValidationError("No previous roles found to restore")
```

**Step 2: Extract role IDs from JSON**
```python
    role_ids = staff.previous_roles.get('role_ids', [])
    
    if not role_ids:
        raise ValidationError("No roles to restore")
```

**Step 3: Query roles from database (get available roles)**
```python
    # Get Role objects by IDs
    roles_to_restore = Role.objects.filter(role_id__in=role_ids)
    
    # Handle case where some roles were deleted from system
    if len(roles_to_restore) != len(role_ids):
        # Log warning but continue with available roles
        api_logger.warning(f"Some roles no longer exist for {staff.username}. Using available roles.")
        # Show toaster warning on UI: "Some roles no longer exist. Using available ones."
```

**Step 4: Clear Inactive role**
```python
    inactive_role = Role.objects.get(role_name='Inactive')
    staff.roles.remove(inactive_role)
```

**Step 5: Restore all roles atomically**
```python
    # Restore available roles
    staff.roles.set(roles_to_restore)
```

**Step 6: Set active flag (DO NOT clear deactivation_reason)**
```python
    staff.is_active = True
    staff.previous_roles = None  # Clear the JSON backup
    staff.save()
    # NOTE: Do NOT clear deactivation_reason - keep for audit trail
    # NOTE: Do NOT modify historical inactive tutorships - leave them as-is
```

**Step 7: Log to audit AND logger**
```python
    # Get restored role names for logging
    restored_role_names = [r.role_name for r in roles_to_restore]
    
    log_api_action(
        request=request,
        action='ACTIVATE_STAFF',
        success=True,
        additional_data={
            'staff_email': staff.email,
            'staff_full_name': f"{staff.first_name} {staff.last_name}",
            'staff_id': staff.staff_id,
            'restored_roles': restored_role_names
        },
        entity_type='Staff',
        entity_ids=[staff.staff_id]
    )
    
    api_logger.info(f"Staff reactivated: {staff.email} (ID: {staff.staff_id}) by {performed_by_user.email}. Roles restored: {restored_role_names}")
```

### 3.3 Important Behaviors
- Partial role restoration: If some roles deleted, use what's available + show warning toaster
- Historical tutorships with tutorship_activation='inactive' are NOT touched
- Deactivation reason persists on staff record (for auditing when the person was inactive)
- previous_roles JSON is cleared after reactivation

---

## 4. New Tutorship Creation Logic (CREATE endpoint)

### 4.1 Current Code Pattern (from tutorship_views.py lines 359-367)
The current code creates tutorships with:
```python
tutorship = Tutorships.objects.create(
    child_id=child_id,
    tutor_id=tutor_id,
    created_date=datetime.datetime.now(),
    updated_at=datetime.datetime.now(),
    last_approver=[staff_role_id],  # Initialize with creator's role ID
    approval_counter=1,  # Creator auto-approves, so starts at 1
)
```

Note: `approval_counter` starts at 1 because creator automatically approves it.

### 4.2 NEW BEHAVIOR - Add historical cleanup

**Step 1: Validate tutor is active** (existing)
```python
    if not tutor.staff.is_active:
        raise ValidationError("Cannot assign inactive tutor")
```

**Step 2: NEW - Delete all tutorships for this tutor**
```python
    # On reactivation, user might create new tutorships
    # Delete ALL pending_first_approval tutorships (approval_counter=0)
    # Server can't distinguish old historical from current, so clean all pending on create
    
    historical_tutorships = Tutorships.objects.filter(
        tutor=tutor,
        tutorship_activation='inactive'
    )

    if historical_tutorships.exists():
        count_deleted = historical_tutorships.count()
        historical_tutorships.delete()

        # Log at verbose level (not critical audit)
        api_logger.debug(f"Cleaned up {count_deleted} historical tutorships for tutor {tutor.id}")
```

**Step 3: Create new tutorship** (existing, no changes)
```python
    tutorship = Tutorships.objects.create(
        # same as now we just add the tutorship_activation field
        child_id=child_id,
        tutor_id=tutor_id,
        created_date=datetime.datetime.now(),
        updated_at=datetime.datetime.now(),
        last_approver=[staff_role_id],
        approval_counter=1,
        tutorship_activation='pending_first_approval'  # Set initial status
    )
    return tutorship
```

### 4.3 Implementation Notes
- **When to delete**: Delete BEFORE creating new tutorship but not before duplicating to create an inactive copy
- **What to delete**: ALL `tutorship_activation='inactive'` with that tutor by id
- **Why**: User reactivated, old inactive ones should be cleaned up
- **Idempotent**: Safe to run even if no historical records exist
- **No audit log needed**: Just debug log, this is internal cleanup

---

## 5. GET Endpoints - Filtering Active Staff (20+ endpoints)

### 5.1 Implementation pattern
All endpoints that return staff/tutors for selection must filter `is_active=True`.

**Examples to update**:
- `GET /api/get_staff/` → filter `is_active=True`
- `GET /api/get_tutors/` → filter `staff__is_active=True`
- `GET /api/get_staff_for_feedback/` → filter `is_active=True`
- `GET /api/get_staff_for_tasks/` → filter `is_active=True`
- Any dropdown endpoint → filter `is_active=True`
# get_all_staff doesnt change so we can see inactive staff there too

**Code pattern**:
```python
@api_view(['GET'])
def get_staff(request):
    staff = Staff.objects.filter(is_active=True)  # ADD THIS FILTER
    # ... rest of endpoint
```

### 5.2 Dashboard updates
**Update dashboard pie chart**:
- Show: Active + Pending tutorships (tutorship_activation = 'pending_first_approval' or 'active') by default
- Not selected to show by default: Historical (deactivated) tutorships (tutorship_activation='inactive')
- Add toggle: "Show All" to include historical
- Staff count: `Staff.objects.filter(is_active=True).count()`
- Add total tutorships (all types) stat

---

## 6. Login Authentication - Permission Validation

### 6.1 Current behavior (from views_auth.py)
System uses Google OAuth (no passwords). Login happens in `views_auth.py` with TOTP verification.

### 6.2 NEW behavior - Validate is_active and permissions

**Add these checks after user authenticates**:
```python
def google_login_success(request):
    # ... existing OAuth logic ...
    
    if request.user.is_authenticated:
        user_id = request.user.id
        try:
            staff = Staff.objects.get(user_id=user_id)
            
            # NEW: Check if is_active=False
            if staff.is_active == False:
                api_logger.warning(f"User {staff.email} tried to login but account is inactive")
                log_api_action(
                    request=request,
                    action='USER_LOGIN_FAILED',
                    success=False,
                    error_message="Account is inactive",
                    status_code=401,
                    additional_data={
                        'email': staff.email,
                        'reason': 'inactive_account'
                    }
                )
                return JsonResponse(
                    {"error": "This account is inactive"},
                    status=401
                )
            
            # NEW: Check if user has ANY permissions
            # Count total permissions for all user's roles
            user_permissions = Permissions.objects.filter(
                role__in=staff.roles.all()
            ).count()
            
            if user_permissions == 0:
                # User has no roles or roles have no permissions at all
                api_logger.warning(f"User {staff.email} authenticated but has no permissions for any resource")
                log_api_action(
                    request=request,
                    action='USER_LOGIN_FAILED',
                    success=False,
                    error_message="Account has no permissions",
                    status_code=401,
                    additional_data={
                        'email': staff.email,
                        'reason': 'no_permissions'
                    }
                )
                return JsonResponse(
                    {"error": "Account has no permissions"},
                    status=401
                )
            
            # Continue with normal login
        except Staff.DoesNotExist:
            # User authenticated but not a staff member
            # DO NOT allow login - staff membership is required
            api_logger.warning(f"Authenticated user {user_id} not found in Staff table")
            log_api_action(
                request=request,
                action='USER_LOGIN_FAILED',
                success=False,
                error_message="User not found in staff database",
                status_code=401
            )
            return JsonResponse(
                {"error": "Access denied"},
                status=401
            )
```

### 6.3 Error handling
- If inactive: Return 401 with "This account is inactive"
- If no permissions: Return 401 with "Account has no permissions"
- Both should be logged to audit with log_api_action()

---

## 7. Deactivation Enhancement to update_staff_member Endpoint

### 7.1 Enhanced Endpoint Implementation
Enhance the `update_staff_member` endpoint to support deactivation with TOTP verification for System Administrator accounts.

**Uses existing TOTP pattern from views_staff.py (email verification flow)**:
```python
@conditional_csrf
@api_view(['PUT'])
def update_staff_member(request, staff_id):
    """
    Enhanced update endpoint - supports deactivation with TOTP for admins
    """
    user_id = request.session.get("user_id")
    if not user_id:
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."},
            status=403
        )
    
    requesting_user = Staff.objects.get(staff_id=user_id)
    if not is_admin(requesting_user):
        log_api_action(
            request=request,
            action='UPDATE_STAFF_FAILED',
            success=False,
            error_message="You do not have permission to update staff",
            status_code=401
        )
        return JsonResponse(
            {"error": "You do not have permission to update staff."},
            status=401
        )
    
    staff = Staff.objects.get(staff_id=staff_id)
    
    # Prevent self-deactivation
    if staff.staff_id == requesting_user.staff_id and request.data.get("is_active") == False:
        return JsonResponse(
            {"error": "Cannot deactivate yourself"},
            status=400
        )
    
    # Check if deactivation is being requested
    if request.data.get("is_active") == False and staff.is_active == True:
        # Staff member is being deactivated - check if they are admin
        if is_admin(staff):
            # Two-step TOTP verification required for admin deactivation
            totp_code = request.data.get("totp_code", "").strip()
            
            if not totp_code:
                # First call: send TOTP to admin's email
                TOTPCode.objects.filter(email=staff.email, used=False).update(used=True)
                code = TOTPCode.generate_code()
                TOTPCode.objects.create(email=staff.email, code=code)
                
                subject = "אישור כיבוי חשבון - חיוך של ילד"
                message = f"""
                בקשה לכיבוי חשבון במערכת חיוך של ילד.
                
                קוד האימות שלך: {code}
                
                הקוד יפוג תוקף בעוד 5 דקות.
                
                אם לא ביקשת זאת, אנא צור קשר עם מנהלי המערכת בדחיפות!.
                """
                
                try:
                    send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [staff.email])
                    return JsonResponse({
                        "message": "Verification code sent to your email",
                        "requires_verification": True
                    })
                except Exception as e:
                    log_api_action(
                        request=request,
                        action='UPDATE_STAFF_FAILED',
                        success=False,
                        error_message=f"Failed to send verification email: {str(e)}",
                        status_code=500,
                        entity_type='Staff',
                        entity_ids=[staff_id]
                    )
                    api_logger.error(f"Failed to send TOTP: {str(e)}")
                    return JsonResponse(
                        {"error": "Failed to send verification code"},
                        status=500
                    )
            
            else:
                # Second call: verify TOTP code
                totp_record = TOTPCode.objects.filter(
                    email=staff.email,
                    used=False
                ).order_by('-created_at').first()
                
                if not totp_record or not totp_record.is_valid() or totp_record.code != totp_code:
                    if totp_record:
                        totp_record.attempts = (totp_record.attempts or 0) + 1
                        totp_record.save()
                        
                        if totp_record.attempts >= 3:
                            totp_record.used = True
                            totp_record.save()
                    
                    log_api_action(
                        request=request,
                        action='UPDATE_STAFF_FAILED',
                        success=False,
                        error_message="Invalid or expired verification code",
                        status_code=401,
                        entity_type='Staff',
                        entity_ids=[staff_id]
                    )
                    return JsonResponse(
                        {"error": "Invalid or expired verification code"},
                        status=401
                    )
                
                totp_record.used = True
                totp_record.save()
                # Continue to deactivation below
        
        # Get deactivation reason
        deactivation_reason = request.data.get("deactivation_reason", "").strip()
        
        if not deactivation_reason:
            return JsonResponse(
                {"error": "Deactivation reason required"},
                status=400
            )
        
        if len(deactivation_reason) > 200:
            return JsonResponse(
                {"error": "Reason must be 200 characters or less"},
                status=400
            )
        
        try:
            deactivate_staff(staff, requesting_user, deactivation_reason)
            
            log_api_action(
                request=request,
                action='DEACTIVATE_STAFF',
                success=True,
                additional_data={
                    'staff_email': staff.email,
                    'staff_full_name': f"{staff.first_name} {staff.last_name}",
                    'staff_id': staff.staff_id,
                    'deactivation_reason': deactivation_reason
                },
                entity_type='Staff',
                entity_ids=[staff.staff_id]
            )
            
            return JsonResponse({
                "message": "Staff deactivated successfully",
                "staff_id": staff.staff_id
            })
        except Exception as e:
            log_api_action(
                request=request,
                action='DEACTIVATE_STAFF_FAILED',
                success=False,
                error_message=str(e),
                status_code=400,
                additional_data={'staff_id': staff_id}
            )
            return JsonResponse(
                {"error": str(e)},
                status=400
            )
    
    # ... Continue with normal update_staff_member logic for other fields ...
```

### 7.2 TOTP Verification Flow
Use the SAME pattern from existing email verification in `update_staff_member` (lines 173-276 in views_staff.py):

```python
# When deactivating an admin, use existing TOTP pattern:

if is_admin(staff):
    totp_code = request.data.get("totp_code", "").strip()
    
    if not totp_code:
        # First call: send TOTP to admin's email
        TOTPCode.objects.filter(email=staff.email, used=False).update(used=True)
        code = TOTPCode.generate_code()
        TOTPCode.objects.create(email=staff.email, code=code)
        
        subject = "אישור כיבוי חשבון - חיוך של ילד"
        message = f"""
        בקשה לכיבוי חשבון במערכת חיוך של ילד.
        
        קוד האימות שלך: {code}
        
        הקוד יפוג תוקף בעוד 5 דקות.
        
        אם לא ביקשת זאת, אנא צור קשר עם מנהלי המערכת בדחיפות!
        """
        
        try:
            send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [staff.email])
            return JsonResponse({
                "message": "Verification code sent to your email",
                "requires_verification": True
            })
        except Exception as e:
            log_api_action(
                request=request,
                action='UPDATE_STAFF_FAILED',
                success=False,
                error_message=f"Failed to send verification email: {str(e)}",
                status_code=500,
                entity_type='Staff',
                entity_ids=[staff_id]
            )
            api_logger.error(f"Failed to send TOTP: {str(e)}")
            return JsonResponse(
                {"error": "Failed to send verification code"},
                status=500
            )
    
    else:
        # Second call: verify TOTP code (use exact same pattern as email verification)
        totp_record = TOTPCode.objects.filter(
            email=staff.email,
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
                entity_ids=[staff_id]
            )
            return JsonResponse(
                {"error": "Invalid or expired code"},
                status=400
            )
        
        if not totp_record.is_valid():
            log_api_action(
                request=request,
                action='UPDATE_STAFF_FAILED',
                success=False,
                error_message="Code has expired or too many attempts",
                status_code=400,
                entity_type='Staff',
                entity_ids=[staff_id]
            )
            return JsonResponse(
                {"error": "Code has expired or too many attempts"},
                status=400
            )
        
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
                    entity_ids=[staff_id]
                )
                return JsonResponse(
                    {"error": "Too many failed attempts"},
                    status=429
                )
            
            log_api_action(
                request=request,
                action='UPDATE_STAFF_FAILED',
                success=False,
                error_message="Invalid code",
                status_code=400,
                entity_type='Staff',
                entity_ids=[staff_id]
            )
            return JsonResponse(
                {"error": "Invalid code"},
                status=400
            )
        
        # Mark TOTP as used - verified, continue to deactivation below
        totp_record.used = True
        totp_record.save()
```

### 7.3 Notes on TOTP
- **Reuse existing pattern**: Don't create new utilities. Copy the logic from `update_staff_member` email verification (lines 173-276 in views_staff.py)
- **Same TOTPCode model**: Uses existing `TOTPCode.objects.create()`, `is_valid()`, `attempts` tracking
- **Same verification flow**: Request without code = send email, request with code = verify and proceed
- **No new utilities needed**: The email change already has all TOTP logic needed for deactivation

---

## 8. Reactivation Enhancement to update_staff_member Endpoint

### 8.1 Reactivation Logic
Enhance the `update_staff_member` endpoint to handle reactivation (setting `is_active=True`):

```python
# In update_staff_member endpoint, handle activation:

    if request.data.get("is_active") == True and staff.is_active == False:
        # Staff member is being reactivated
        try:
            activate_staff(staff, requesting_user)
            
            # Send email to staff member (only Hebrew)
            subject = "חשבונך הופעל - חיוך של ילד"
            message = f"""
            שלום {staff.first_name},
            
            חשבונך בחיוך של ילד הופעל מחדש.
            
            תוכל להתחבר למערכת כעת.
            
            בברכה,
            צוות חיוך של ילד
            """
            
            try:
                send_mail(
                    subject,
                    message,
                    settings.DEFAULT_FROM_EMAIL,
                    [staff.email],
                    fail_silently=False
                )
            except Exception as e:
                api_logger.error(f"Failed to send reactivation email: {str(e)}")
            
            log_api_action(
                request=request,
                action='ACTIVATE_STAFF',
                success=True,
                additional_data={
                    'staff_email': staff.email,
                    'staff_full_name': f"{staff.first_name} {staff.last_name}",
                    'staff_id': staff.staff_id
                },
                entity_type='Staff',
                entity_ids=[staff.staff_id]
            )
            
            return JsonResponse({
                "message": "Staff reactivated successfully",
                "staff_id": staff.staff_id
            })
        except Exception as e:
            log_api_action(
                request=request,
                action='ACTIVATE_STAFF_FAILED',
                success=False,
                error_message=str(e),
                status_code=400,
                additional_data={'staff_id': staff_id}
            )
            return JsonResponse(
                {"error": str(e)},
                status=400
            )
```

### 8.2 Frontend - NO toast objects in response
DO NOT tell frontend what to do with UI elements. Response contains only data:
- Frontend decides how to display (toast, dialog, etc.)
- Response should only include status and data
- Never include UI instructions like "toast" in JSON response
            {"error": str(e)},
            status=400
        )
```

### 8.2 Frontend Modal (React)
```javascript
// ActivationModal.jsx - SIMPLE confirmation only

function ActivationModal({ staff, onConfirm, onCancel, loading=false }) {
    return (
        <div className="modal">
            <h2>הפעלת משתמש</h2>
            <p>האם להפעיל את המשתמש {staff.first_name} {staff.last_name}?</p>
            
            {/* IMPORTANT: NO role selector here */}
            {/* NO role list display */}
            {/* JUST CONFIRMATION */}
            
            <button 
                onClick={onConfirm}
                disabled={loading}
            >
                אישור
            </button>
            <button onClick={onCancel} disabled={loading}>ביטול</button>
        </div>
    )
}
```
            {/* JUST CONFIRMATION */}
            
            <button onClick={onConfirm}>אישור</button>
            <button onClick={onCancel}>ביטול</button>
        </div>
    )
}
```

---

## 9. Validation Rules - Assignment Prevention

### 9.1 Cannot assign inactive staff
All create endpoints must validate `is_active=True`:

**Pattern** (same for feedback, tasks, tutorships):
```python
@api_view(['POST'])
def create_feedback(request):
    staff_id = request.data.get('staff_id')
    staff = Staff.objects.get(staff_id=staff_id)
    
    if not staff.is_active:
        log_api_action(
            request=request,
            action='CREATE_FEEDBACK_FAILED',
            success=False,
            error_message="Cannot assign feedback to inactive staff",
            additional_data={
                'reason': 'inactive_staff',
                'target_staff': staff.email
            }
        )
        return JsonResponse(
            {"error": "Cannot assign feedback to inactive staff"},
            status=400
        )
    
    # Create feedback (return JSON, not serialized object)
    feedback = Feedback.objects.create(staff=staff, ...)
    return JsonResponse({
        "message": "Feedback created successfully",
        "feedback_id": feedback.feedback_id
    }, status=201)
```
```

---

## 10. UI Styling - Inactive Staff Display

### 10.1 Staff Grid
```javascript
function StaffGrid({ staff }) {
    return (
        <table>
            {staff.map(s => (
                <tr 
                    key={s.staff_id}
                    style={{
                        opacity: s.is_active ? 1 : 0.5,
                        backgroundColor: s.is_active ? 'white' : '#f5f5f5'
                    }}
                >
                    <td>{s.first_name} {s.last_name}</td>
                    <td>{s.roles.map(r => r.role_name).join(', ')}</td>
                    <td>{s.is_active ? 'פעיל' : 'לא פעיל'}</td>
                    <td>{s.deactivation_reason || '-'}</td>
                    <td>
                        {s.is_active ? (
                            <button onClick={() => handleSettings(s)}>הגדרות</button>
                        ) : (
                            <button onClick={() => showActivationModal(s)}>הפעל</button>
                        )}
                    </td>
                    <td>
                        {!s.is_active && (
                            <button onClick={() => handleDeleteStaff(s)}>מחק</button>
                        )}
                    </td>
                </tr>
            ))}
        </table>
    )
}
```

### 10.2 Deactivation Modal
```javascript
function DeactivationModal({ staff, onConfirm, onCancel }) {
    const [reason, setReason] = useState('')
    
    const isValid = reason.trim().length > 0 && reason.length <= 200
    
    return (
        <div className="modal">
            <h2>כיבוי משתמש</h2>
            <p>האם לכבות את המשתמש {staff.first_name}?</p>
            
            <textarea
                placeholder="סיבת כיבוי (חובה, עד 200 תווים)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={200}
            />
            <p>{reason.length}/200</p>
            
            <button 
                onClick={() => onConfirm(reason)}
                disabled={!isValid}
            >
                אישור כיבוי
            </button>
            <button onClick={onCancel}>ביטול</button>
        </div>
    )
}
```

**NOTE**: Frontend designer will create the actual UI component. These are just suggestions for text and required fields.

---

## 11. Audit Logging

### 11.1 Actions & Format
Use `log_api_action()` function (existing pattern in codebase).

**DEACTIVATE_STAFF**:
```python
log_api_action(
    request=request,
    action='DEACTIVATE_STAFF',
    success=True,
    additional_data={
        'staff_email': staff.email,
        'staff_full_name': f"{staff.first_name} {staff.last_name}",
        'staff_id': staff.staff_id,
        'previous_roles': [r.role_name for r in roles_to_deactivate],
        'deactivation_reason': deactivation_reason,
        'tutorships_affected': tutorship_count
    },
    entity_type='Staff',
    entity_ids=[staff.staff_id]
)
```

**ACTIVATE_STAFF**:
```python
log_api_action(
    request=request,
    action='ACTIVATE_STAFF',
    success=True,
    additional_data={
        'staff_email': staff.email,
        'staff_full_name': f"{staff.first_name} {staff.last_name}",
        'staff_id': staff.staff_id,
        'restored_roles': [r.role_name for r in roles_to_restore]
    },
    entity_type='Staff',
    entity_ids=[staff.staff_id]
)
```

### 11.2 Hebrew translations
Add these to audit_utils `generate_audit_description()`:
- DEACTIVATE_STAFF → כיבוי משתמש
- ACTIVATE_STAFF → הפעלה מחדש של משתמש

---

## 12. Key Implementation Decisions

### 12.1: Admin deactivation verification
For admin users (System Administrator role): Send TOTP code to email, require confirmation before deactivation.
This prevents accidental or abuse deactivation of other admins.
Uses existing TOTPCode model and pattern from email verification in views_staff.py.

### 12.2: Tutorship state representation  
**NEW FIELD REQUIRED**: Add `tutorship_activation` (CharField, max_length=50):
- Values: 'pending_first_approval', 'active', 'inactive'
- Independent of `approval_counter` which tracks approval chain
- approval_counter behavior:
  * Created at 1
  * Becomes 2 when additional approval received
- tutorship_activation is UI filter:
  * 'pending_first_approval' = approval_counter is 1 and staff active
  * 'active' = approval_counter = 2 and staff active
  * 'inactive' = staff member deactivated (stays even after reactivation until new tutorship created)

### 12.3: Historical tutorship cleanup
When user creates ANY new tutorship after reactivation:
- Delete all tutorships with tutorship_activation='inactive' for that tutor
- Prevents stale pending tutorships from blocking new assignments

### 12.4: Role restoration partial failure
If some roles deleted from system: Restore only available ones + show warning toaster.
Don't reject activation - allow partial restoration.

### 12.5: Utils.py line 201 update
In `fetch_possible_matches()`, add to WHERE clause to exclude inactive/pending tutorships:
```sql
AND tutorship.tutorship_activation <> 'inactive'
```
Prevents unmatching with tutor/tutee who have inactive tutorships - that way we dont consider the tutor/tutee as actually assigned.

---

## 13. Implementation Sequence (Recommended Order)

1. **Phase 1 - Database** (1-2 hours)
   - Add `is_active`, `previous_roles`, `deactivation_reason` to Staff model
   - Create migration
   - Test with initial data

2. **Phase 2 - Core Functions** (3-4 hours)
   - Implement `deactivate_staff(staff, performed_by, reason)` 
   - Implement `activate_staff(staff, performed_by)`
   - update update_staff_member to use these functions
   - Add tutorship duplication/deletion in deactivate
   - Test both functions thoroughly

3. **Phase 3 - Endpoints** (3-4 hours)
   - Create `deactivate_staff(request, staff_id)` endpoint
   - Create `activate_staff(request, staff_id)` endpoint
   - Add cleanup to tutorship creation
   - Add validation to all assign endpoints

4. **Phase 4 - GET Filtering** (2-3 hours)
   - Filter all 20+ GET endpoints with `is_active=True`
   - Update dashboard pie chart
   - Test all dropdowns

5. **Phase 5 - Authentication** (1-2 hours)
   - Add permission check in login
   - Add is_active check in login

6. **Phase 6 - Frontend** (4-5 hours)
   - Build deactivation modal with reason input
   - Build activation modal (simple)
   - Add styling (grayed out)
   - Add columns to grid (deactivation_reason, is_active)

7. **Phase 7 - Audit Logging** (1 hour)
   - Add DEACTIVATE_STAFF handling to `generate_audit_description()`
   - Add ACTIVATE_STAFF handling
   - Add Hebrew translations

8. **Phase 8 - Testing** (7-11 hours)
   - Run all 25 manual test scenarios
   - Fix bugs as they appear

---

## 14. Files to Modify

### Backend (Django)
- `childsmile_app/models.py` - Staff model
- `childsmile_app/audit_utils.py` - Audit action descriptions
- `childsmile_app/views_staff.py` - Deactivate/activate endpoints
- `childsmile_app/views_tutorship.py` - Tutorship creation cleanup
- `childsmile_app/views_feedback.py` - Add validation
- `childsmile_app/views_task.py` - Add validation
- `childsmile_app/views_auth.py` - Permission & is_active check
- `childsmile_app/utils.py` - Line 201: Update fetch_possible_matches()
- `childsmile_app/migrations/` - New migration file

### Frontend (React)
- `SystemManagement.js` - Update Grid with new columns, buttons
- `DeactivationModal` - New component in the System Management page
- `ActivationModal` - New component
- `Dashboard.jsx` - Update pie chart, stats
- `Tutorships.js` - Update tutorship list, filters, appearance for inactive

---

## 15. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Tutorship data loss | HIGH | Use transactions, test thoroughly |
| Inactive staff can login | HIGH | Add is_active check in auth |
| Inactive staff in dropdowns | HIGH | Filter all GET endpoints |
| Admin deactivation abuse | MEDIUM | Require email verification code |
| Partial role restoration fails | MEDIUM | Log warning, show toaster |
| Orphaned tutorships | MEDIUM | Delete on new tutorship creation |

---

## 16. Questions Addressed

1. ✅ Role names saved? NO - only IDs, names in Role table
2. ✅ Login permission check? YES - verify Permissions table has entries
3. ✅ Tutorship status field? YES - NEW `tutorship_activation` field (pending_first_approval, active, inactive)
4. ✅ Tutorship cleanup? Delete all with tutorship_activation='inactive' on new create
5. ✅ Admin deactivation abuse? Require TOTP verification code (existing pattern from email change)
6. ✅ Deactivation reason? Required field, 200 char limit, shown on grid, persists after reactivation
7. ✅ Audit logging? Use log_api_action() with proper format (verified from audit_utils.py)
8. ✅ Utils.py line 201? Add `AND tutorship_activation <> 'inactive'` filter
9. ✅ Hebrew text? כיבוי משתמש (deactivation), הפעלה מחדש של משתמש (reactivation)
10. ✅ Dashboard? Show active+pending tutorships, add toggle for all, show total count
11. ✅ Decorators? Use `@conditional_csrf` not `@require_permission`
12. ✅ Permission check? Use `has_permission()` function, not decorator
13. ✅ Response format? Return JsonResponse with plain dicts, NOT serialized objects
14. ✅ Admin role name? 'System Administrator' not 'Admin'
15. ✅ Deactivation duplication? EXACT duplicate with same approval_counter and approvers, only set tutorship_activation='inactive'

---

## 17. Testing Checklist (for implementation)

- [ ] Database migrations apply cleanly
- [ ] `deactivate_staff()` works with 0, 1, 5 tutorships
- [ ] `activate_staff()` restores roles correctly
- [ ] Partial role restoration shows toaster warning
- [ ] Login rejects inactive user
- [ ] Login rejects user with 0 permissions
- [ ] All GET endpoints filter active only
- [ ] Feedback creation rejects inactive staff
- [ ] Task creation rejects inactive staff
- [ ] Tutorship creation rejects inactive tutor
- [ ] Tutorship creation cleans up historical
- [ ] Audit logs created correctly with log_api_action()
- [ ] Deactivation modal shows reason input (UI enforced 200 chars, not empty)
- [ ] Activation modal shows simple confirmation only
- [ ] Inactive staff grayed in UI with reason column
- [ ] Grid shows Activate button for inactive, Settings for active
- [ ] Admin deactivation requires verification code
- [ ] All 25 manual test scenarios pass

---

## Next Steps

1. Review this updated plan
2. Approve implementation sequence
3. Begin Phase 1 (Database migrations)
4. Proceed through phases in order

