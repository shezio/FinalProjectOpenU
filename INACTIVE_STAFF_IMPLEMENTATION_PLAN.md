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

**Behavior**:
- `approval_counter` works as follows:
  * 0 = created but not yet submitted (creator hasn't approved)
  * 1 = creator approved it (first approval given by system, automatic)
  * 2+ = fully approved (additional approvals received)
- `tutorship_activation` tracks status INDEPENDENTLY:
  * 'pending_first_approval' → when approval_counter = 0 (waiting for first approver)
  * 'active' → when approval_counter >= 1 (has approvals)
  * 'inactive' → when staff member deactivated (even if approval_counter unchanged)
- When staff deactivates: EXACT duplicate with same approval_counter and last_approver, set tutorship_activation='inactive'
- When reactivation occurs: Historical inactive tutorships stay inactive
- New tutorship creation: Cleans up ALL pending_first_approval tutorships (approval_counter=0)

---

## 2. Deactivation Logic (`_deactivate_staff` function)

### 2.1 Purpose
When staff member is deactivated, execute comprehensive deactivation with tutorship preservation.

### 2.2 Execution Steps (IN ORDER)

**Step 1: Validate deactivation_reason provided**
```python
def _deactivate_staff(staff, performed_by_user, deactivation_reason):
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
        # Step 6a: Create EXACT duplicate (NO counter changes, NO approver changes)
        Tutorships.objects.create(
            child=tutorship.child,
            tutor=tutorship.tutor,
            approval_counter=tutorship.approval_counter,  # Keep same counter!
            last_approver=tutorship.last_approver.copy() if isinstance(tutorship.last_approver, list) else [],
            tutorship_activation='inactive'  # Mark only this field as inactive
            # created_date will auto-set to now
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
            'tutorships_affected': active_tutorships.count()
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

## 3. Reactivation Logic (`_activate_staff` function)

### 3.1 Purpose
When "Activate" button clicked in UI, restore staff to active state with previous roles.

### 3.2 Execution Steps (IN ORDER)

**Step 1: Verify inactive**
```python
def _activate_staff(staff, performed_by_user):
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

**Step 2: NEW - Delete all pending tutorships for this tutor**
```python
    # On reactivation, user might create new tutorships
    # Delete ALL pending_first_approval tutorships (approval_counter=0)
    # Server can't distinguish old historical from current, so clean all pending on create
    
    pending_tutorships = Tutorships.objects.filter(
        tutor=tutor,
        approval_counter=0,  # Only pending/first approval ones
        tutorship_activation='pending_first_approval'
    )
    
    if pending_tutorships.exists():
        count_deleted = pending_tutorships.count()
        pending_tutorships.delete()
        
        # Log at verbose level (not critical audit)
        api_logger.debug(f"Cleaned up {count_deleted} pending tutorships for tutor {tutor.id}")
```

**Step 3: Create new tutorship** (existing, no changes)
```python
    tutorship = Tutorships.objects.create(
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
- **When to delete**: Delete BEFORE creating new tutorship
- **What to delete**: ALL `approval_counter=0` with `tutorship_activation='pending_first_approval'`
- **Why**: User reactivated, old pending ones should be cleaned up
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

**Code pattern**:
```python
@api_view(['GET'])
def get_staff(request):
    staff = Staff.objects.filter(is_active=True)  # ADD THIS FILTER
    # ... rest of endpoint
```

### 5.2 Dashboard updates
**Update dashboard pie chart**:
- Show: Active + Pending tutorships (approval_counter = 0 or 1)
- Hide by default: Historical (deactivated) tutorships
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
            user_permissions = Permissions.objects.filter(
                role__in=staff.roles.all()
            ).exists()
            
            if not user_permissions:
                # User has no roles or roles have no permissions
                api_logger.warning(f"User {staff.email} authenticated but has no permissions")
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
            # User authenticated but not a staff member (skip for now)
            pass
```

### 6.3 Error handling
- If inactive: Return 401 with "This account is inactive"
- If no permissions: Return 401 with "Account has no permissions"
- Both should be logged to audit with log_api_action()

---

## 7. Deactivation Trigger - Endpoint with TOTP for Admins

### 7.1 Endpoint Implementation
Create dedicated deactivate endpoint with TOTP verification for System Administrator accounts.

**Uses existing TOTP pattern from views_staff.py (email verification flow)**:
```python
@conditional_csrf
@api_view(['PUT'])
def deactivate_staff(request, staff_id):
    """
    Deactivate a staff member
    Two-step process for System Administrators:
    1. First call: send TOTP to staff member's email
    2. Second call: provide TOTP code + deactivation_reason
    """
    user_id = request.session.get("user_id")
    if not user_id:
        return JsonResponse(
            {"error": "Authentication required"},
            status=403
        )
    
    requesting_user = Staff.objects.get(staff_id=user_id)
    if not has_permission(request, "staff", "DEACTIVATE"):
        return JsonResponse(
            {"error": "You do not have permission to deactivate staff"},
            status=401
        )
    
    staff = Staff.objects.get(staff_id=staff_id)
    
    # Prevent self-deactivation
    if staff.staff_id == requesting_user.staff_id:
        return JsonResponse(
            {"error": "Cannot deactivate yourself"},
            status=400
        )
    
    # Check if staff being deactivated is System Administrator
    is_admin = staff.roles.filter(role_name='System Administrator').exists()
    
    if is_admin:
        # Two-step TOTP verification required for admin deactivation
        totp_code = request.data.get("totp_code", "").strip()
        
        if not totp_code:
            # First call: send TOTP to admin's email
            TOTPCode.objects.filter(email=staff.email, used=False).update(used=True)
            code = TOTPCode.generate_code()
            TOTPCode.objects.create(email=staff.email, code=code)
            
            subject = "Deactivation Verification Required - חיוך של ילד"
            message = f"""
            A deactivation request has been initiated for your staff account.
            
            Your verification code is: {code}
            
            This code will expire in 5 minutes.
            
            If you did not request this, please contact system administrators.
            """
            
            try:
                send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [staff.email])
                return JsonResponse({
                    "message": "Verification code sent to your email",
                    "requires_verification": True
                })
            except Exception as e:
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
                totp_record.attempts = (totp_record.attempts or 0) + 1
                totp_record.save()
                
                if totp_record.attempts >= 3:
                    totp_record.used = True
                    totp_record.save()
                
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
        _deactivate_staff(staff, requesting_user, deactivation_reason)
        
        # Return confirmation (no serialization, just JSON)
        return JsonResponse({
            "message": "Staff deactivated successfully",
            "staff_id": staff.staff_id,
            "staff_email": staff.email,
            "staff_name": f"{staff.first_name} {staff.last_name}"
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
```

### 7.2 Uses existing TOTPCode model and functions
- `TOTPCode.generate_code()` - generates random code
- `TOTPCode.is_valid()` - checks expiration (5 minutes)
- `totp_record.attempts` - tracks failed attempts (limit 3)

---

## 8. Reactivation Endpoint & Modal

### 8.1 Reactivation endpoint
## 8. Reactivation Endpoint

### 8.1 Reactivation endpoint
```python
@conditional_csrf
@api_view(['PUT'])
def activate_staff(request, staff_id):
    """
    Activate an inactive staff member
    Modal: Simple confirmation only, no role selector
    """
    user_id = request.session.get("user_id")
    if not user_id:
        return JsonResponse(
            {"error": "Authentication required"},
            status=403
        )
    
    requesting_user = Staff.objects.get(staff_id=user_id)
    if not has_permission(request, "staff", "ACTIVATE"):
        return JsonResponse(
            {"error": "You do not have permission to activate staff"},
            status=401
        )
    
    staff = Staff.objects.get(staff_id=staff_id)
    
    if staff.is_active == True:
        return JsonResponse(
            {"error": "Staff already active"},
            status=400
        )
    
    try:
        _activate_staff(staff, requesting_user)
        
        # Send email to staff member (use existing send_mail from Django)
        subject = "Your account has been reactivated - חיוך של ילד"
        message = f"""
        Dear {staff.first_name},
        
        Your staff account has been reactivated.
        
        You can now login to the system.
        
        Best regards,
        חיוך של ילד Team
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
        
        # Return confirmation (NO serialization, plain JSON)
        return JsonResponse({
            "message": "Staff reactivated successfully",
            "staff_id": staff.staff_id,
            "staff_email": staff.email,
            "staff_name": f"{staff.first_name} {staff.last_name}",
            "toast": {
                "type": "success",
                "message": f"{staff.first_name} has been reactivated"
            }
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
            <h2>הסרת משתמש מפעיל</h2>
            <p>האם להסיר את המשתמש {staff.first_name}?</p>
            
            <textarea
                placeholder="סיבת הסרה (חובה, עד 200 תווים)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={200}
            />
            <p>{reason.length}/200</p>
            
            <button 
                onClick={() => onConfirm(reason)}
                disabled={!isValid}
            >
                אישור הסרה
            </button>
            <button onClick={onCancel}>ביטול</button>
        </div>
    )
}
```

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
  * Created at 0 (not yet submitted)
  * Becomes 1 when creator auto-approves (happens on creation)
  * Becomes 2+ when additional approvals received
- tutorship_activation is UI filter:
  * 'pending_first_approval' = approval_counter is 0
  * 'active' = approval_counter >= 1 and staff is active
  * 'inactive' = staff member deactivated (stays even after reactivation)

### 12.3: Historical tutorship cleanup
When user creates ANY new tutorship after reactivation:
- Delete all tutorships with approval_counter=0 AND tutorship_activation='pending_first_approval'
- No special logic to distinguish historical from truly new pending - just clean on create
- Prevents stale pending tutorships from blocking new assignments

### 12.4: Role restoration partial failure
If some roles deleted from system: Restore only available ones + show warning toaster.
Don't reject activation - allow partial restoration.

### 12.5: Utils.py line 201 update
In `fetch_possible_matches()`, add to WHERE clause to exclude inactive/pending tutorships:
```sql
AND tutorship.approval_counter > 0
```
Prevents matching with tutor/tutee who have only pending tutorships.

---

## 13. Implementation Sequence (Recommended Order)

1. **Phase 1 - Database** (1-2 hours)
   - Add `is_active`, `previous_roles`, `deactivation_reason` to Staff model
   - Create migration
   - Test with initial data

2. **Phase 2 - Core Functions** (3-4 hours)
   - Implement `_deactivate_staff(staff, performed_by, reason)` 
   - Implement `_activate_staff(staff, performed_by)`
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
- `StaffManagement.jsx` - Grid with new columns, buttons
- `DeactivationModal.jsx` - New component
- `ActivationModal.jsx` - New component

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
4. ✅ Tutorship cleanup? Delete all approval_counter=0 with tutorship_activation='pending_first_approval' on new create
5. ✅ Admin deactivation abuse? Require TOTP verification code (existing pattern from email change)
6. ✅ Deactivation reason? Required field, 200 char limit, shown on grid, persists after reactivation
7. ✅ Audit logging? Use log_api_action() with proper format (verified from audit_utils.py)
8. ✅ Utils.py line 201? Add `AND approval_counter > 0` filter
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
- [ ] `_deactivate_staff()` works with 0, 1, 5 tutorships
- [ ] `_activate_staff()` restores roles correctly
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

