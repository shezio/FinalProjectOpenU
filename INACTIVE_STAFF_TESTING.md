# Inactive Staff - Manual Testing Guide

## Test Scenarios to Execute

---

## 1. Login & Access Control

### Scenario 1.1: Inactive staff cannot login
**Setup**: Create staff member "דוד" with active status
1. Go to login page
2. Enter דוד's credentials
3. **Expected**: Login succeeds, can access system

**Then deactivate דוד**:
1. Go to System Management → Staff grid
2. Find דוד
3. Click settings/edit
4. Change role to "Inactive"
5. Click save

**Then try to login as דוד again**:
1. Go to login page
2. Enter דוד's credentials
3. **Expected**: Login FAILS with "This account is inactive" message

---

## 2. System Management - Deactivation

### Scenario 2.1: Deactivate staff member with multiple roles
**Setup**: Create staff "רחל" with roles: Manager + Tutor
1. Go to System Management → Staff grid
2. Find רחל (should have Manager + Tutor roles)
3. Click on רחל's row
4. **Expected**: See both roles listed

**Deactivate**:
1. Click settings/edit button
2. Change role to "Inactive"
3. Click save
4. **Expected**: 
   - רחל's row becomes grayed out (opacity 50%)
   - "Activate" button appears instead of settings
   - Roles saved (no longer show Manager/Tutor)

### Scenario 2.2: Deactivate admin requires TOTP verification
**Setup**: Create admin staff member "מנהל" with role: System Administrator
1. Go to System Management → Staff grid
2. Find מנהל
3. Click settings/edit button
4. Fill in deactivation reason: "משאבי אנוש מקוצצים"
5. Click "Save/Deactivate"
6. **Expected**: 
   - No immediate deactivation
   - Popup/dialog says "קוד האימות נשלח לדוא"ל שלך" (Verification code sent to your email)
   - Can see message about code expiring in 5 minutes

**Verify email received**:
1. Check מנהל's email for code (code looks like: 123456)
2. **Expected**: Email contains Hebrew message with code

**Enter verification code**:
1. In the verification dialog, enter the code received
2. Click confirm
3. **Expected**:
   - Dialog closes
   - מנהל's row becomes grayed out
   - Deactivation completed successfully

**Test invalid code**:
1. Go back and try again
2. Fill in reason again: "בדיקה בלבד"
3. Click save
4. When asked for code, enter wrong code (e.g., "000000")
5. **Expected**: Error message "Invalid code" and can retry
6. After 3 wrong attempts: Error "Too many failed attempts"

---

## 3. System Management - Reactivation

### Scenario 3.1: Activate staff - restore roles
**Setup**: Staff "דוד" is inactive with previous roles: Manager + Tutor
1. Go to System Management → Staff grid
2. Find דוד (grayed out)
3. Click "Activate" button
4. **Expected**: Modal popup appears with text "האם להפעיל את המשתמש דוד?"

**Important**: Modal should NOT show roles or ask to select them

5. Click "אישור"
6. **Expected**:
   - Modal closes
   - דוד's row returns to normal color (opacity 100%)
   - דוד has Manager + Tutor roles restored
   - Settings button reappears

### Scenario 3.2: Edit roles AFTER activation
**Setup**: דוד just got reactivated with Manager + Tutor
1. Go to System Management → Staff grid
2. Click settings on דוד
3. **Expected**: Can see role selector
4. Uncheck "Manager", keep "Tutor"
5. Click save
6. **Expected**: דוד now only has Tutor role

---

## 4. Assignment Prevention

### Scenario 4.1: Cannot create feedback with inactive staff
**Setup**: דוד is inactive
1. Go to Feedback section
2. Click "Create Feedback"
3. In staff dropdown, look for דוד
4. **Expected**: דוד does NOT appear in dropdown

### Scenario 4.2: Cannot create task with inactive staff
**Setup**: רחל is inactive
1. Go to Tasks section
2. Click "Create Task"
3. In "Assign To" dropdown, look for רחל
4. **Expected**: רחל does NOT appear in dropdown

### Scenario 4.3: Cannot create tutorship with inactive tutor
**Setup**: יוסף is inactive, and יוסף is a tutor
1. Go to Tutorships section
2. Click "Create Tutorship"
3. In tutor dropdown, look for יוסף
4. **Expected**: יוסף does NOT appear in tutor dropdown

---

## 5. Tutorship Handling

### Scenario 5.1: Tutorship auto-released on deactivation
**Setup**: דוד is active tutor with tutee ליאור
- Tutorship status: "active"

**Deactivate דוד**:
1. Go to System Management
2. Set דוד to inactive
3. Click save

**Verify tutorship**:
1. Go to Tutorships section
2. Look for original tutorship (דוד ↔ ליאור)
3. **Expected**: 
   - Original tutorship is GONE (deleted)
   - New inactive historical record exists
   - ליאור is released (can be assigned to new tutor)

**Verify ליאור can be reassigned**:
1. Go to Create Tutorship
2. Select ליאור as tutee
3. Select נחמן as new tutor
4. Click save
5. **Expected**: New tutorship created successfully

### Scenario 5.2: Historical tutorship stays inactive on reactivation
**Setup**: 
- דוד was deactivated with active tutorship (דוד ↔ ליאור)
- Historical inactive copy was created (tutorship_activation='inactive')
- ליאור was reassigned to נחמן (active tutorship)

**Reactivate דוד**:
1. Go to System Management
2. Click Activate on דוד
3. Confirm in modal
4. Click save

**Verify historical tutorship NOT reactivated**:
1. Go to Tutorships section
2. Look for דוד's historical inactive tutorship
3. **Expected**:
   - Historical record still exists
   - Status is still 'inactive' (NOT changed to 'active')
   - This is read-only historical data
4. Look for ליאור's current tutorship
5. **Expected**: Still with נחמן (not reverted to דוד)

### Scenario 5.3: Create new tutorship for reactivated staff - delete historical one
**Setup**:
- דוד was reactivated
- Historical inactive tutorship exists (דוד with ליאור, status='inactive')
- ליאור is currently with נחמן

**Create new tutorship for דוד**:
1. Go to Create Tutorship
2. Select דוד as tutor
3. Select שרה as tutee (different from historical ליאור)
4. Click save
5. **Expected**: New tutorship created successfully (דוד ↔ שרה, status='active')

**Verify historical tutorship deleted**:
1. Go to Tutorships section
2. Look for דוד's historical inactive tutorship (with ליאור)
3. **Expected**: 
   - Historical record is DELETED (no longer appears)
   - Only the new active tutorship (דוד ↔ שרה) exists
   - ליאור's tutorship with נחמן is unaffected

### Scenario 5.4: Historical tutorship deleted on any new tutorship by reactivated staff
**Setup**:
- דוד was deactivated/reactivated
- Historical inactive tutorship exists
- דוד creates MULTIPLE new tutorships

**Create first new tutorship for דוד**:
1. Go to Create Tutorship
2. Select דוד as tutor
3. Select שרה as tutee
4. Click save

**Check historical record after first creation**:
1. Query database or audit log
2. **Expected**: Historical inactive tutorship still exists (one per original)

**Create second new tutorship for דוד**:
1. Go to Create Tutorship  
2. Select דוד as tutor
3. Select מיכאל as tutee
4. Click save

**Final check - only latest historical deleted**:
1. Go to Tutorships section
2. **Expected**:
   - Both new tutorships exist (דוד ↔ שרה, דוד ↔ מיכאל)
   - Historical inactive record DELETED after any new tutorship creation
   - No orphaned historical records

---

## 6. Dashboard

### Scenario 6.1: Dashboard counts exclude inactive staff
**Setup**: 
- 10 active staff members
- 3 inactive staff members
- 5 active tutorships

**Test**:
1. Go to Dashboard
2. Check "Total Staff" count
3. **Expected**: Shows 10 (not 13)
4. Check "Active Tutorships" count
5. **Expected**: Shows 5 (only active, not inactive ones)

---

## 7. Historical Data Visibility

### Scenario 7.1: View past feedback from inactive staff
**Setup**: 
- דוד was active and created feedback: "ליאור made great progress"
- Now דוד is inactive

**Test**:
1. Go to Reports section
2. Filter by staff: דוד
3. **Expected**: Can still see all feedback דוד created, even though inactive

### Scenario 7.2: View past tasks from inactive staff
**Setup**:
- רחל was active and created 5 tasks
- Now רחל is inactive

**Test**:
1. Go to Tasks section
2. Check if can view past tasks by רחל
3. **Expected**: Can see task history, but cannot create new tasks

### Scenario 7.3: View financial reports including inactive tutorships
**Setup**:
- דוד was tutor for ליאור (complete tutorship)
- Now דוד is inactive (tutorship in historical record)

**Test**:
1. Go to Financial Reports
2. Generate annual report
3. Look for דוד's tutorship hours/data
4. **Expected**: דוד's work is included in financial calculations

---

## 8. Audit Logs

### Scenario 8.1: Deactivation logged
**Test**:
1. Deactivate staff member דוד (had Manager + Tutor roles)
2. Go to Audit Log section
3. Search for action: "DEACTIVATE_STAFF"
4. Find דוד's entry
5. **Expected**: 
   - Timestamp recorded
   - Old roles shown: Manager, Tutor
   - New role shown: Inactive
   - User who did it: admin name

### Scenario 8.2: Activation logged
**Test**:
1. Reactivate staff member דוד
2. Go to Audit Log section
3. Search for action: "ACTIVATE_STAFF"
4. Find דוד's entry (most recent)
5. **Expected**:
   - Timestamp recorded
   - Restored roles shown: Manager, Tutor
   - User who did it: admin name

### Scenario 8.3: Invalid assignment attempt logged
**Test**:
1. Try to create feedback with inactive staff (should fail)
2. Go to Audit Log
3. Search for action: "INVALID_INACTIVE_STAFF_ASSIGNMENT"
4. **Expected**: Entry exists showing attempt

---

## 9. Multi-Cycle Testing

### Scenario 9.1: Deactivate → Reactivate → Change Roles → Deactivate again
**Test**:

**Cycle 1 - Initial state**:
- דוד has: Manager + Tutor roles

**Cycle 1 - Deactivate**:
1. Set דוד to inactive
2. **Expected**: Roles saved as Manager + Tutor

**Cycle 1 - Reactivate**:
1. Click Activate on דוד
2. **Expected**: Modal asks "activate?" (no roles shown)
3. Click yes
4. **Expected**: דוד has Manager + Tutor restored

**Cycle 2 - Change roles**:
1. Edit דוד, remove Manager
2. **Expected**: דוד now only has Tutor

**Cycle 2 - Deactivate again**:
1. Set דוד to inactive
2. **Expected**: Roles saved as ONLY Tutor (not Manager)

**Cycle 2 - Reactivate**:
1. Click Activate on דוד
2. **Expected**: Modal shows "activate?"
3. Click yes
4. **Expected**: דוד has ONLY Tutor (Manager not restored)

---

## 10. Error Cases

### Scenario 10.1: Cannot set inactive on new staff creation
**Test**:
1. Go to System Management → Create New Staff
2. Fill in: שם = דני
3. In roles dropdown, look for "Inactive"
4. **Expected**: "Inactive" NOT in dropdown (cannot create inactive user)

### Scenario 10.2: Inactive staff marked clearly in UI
**Test**:
1. Have mix of active (דוד, רחל) and inactive (יוסף) staff
2. Go to System Management grid
3. **Expected**:
   - Active staff have normal opacity
   - Inactive staff have gray/reduced opacity (50%)
   - "Activate" button visible on inactive rows

---

## 11. Permission/Role Specific Tests

### Scenario 11.1: Only admins can deactivate/reactivate
**Setup**: Regular staff member (not admin) logged in
**Test**:
1. Go to System Management
2. **Expected**: Cannot see deactivate/activate buttons
3. OR if visible, click deactivate → permission denied message

### Scenario 11.2: Audit log shows who deactivated
**Test**:
1. Admin user דוד deactivates staff רחל
2. Go to Audit Log
3. Find DEACTIVATE_STAFF entry for רחל
4. **Expected**: "Performed by: דוד" shown

---

## Testing Checklist

Use this to track what you've tested:

### Access Control (2 test cases)
- [ ] Inactive staff cannot login
- [ ] Active staff can login

### Deactivation (1 test case)
- [ ] Deactivate multi-role staff → grayed out, roles saved

### Reactivation (2 test cases)
- [ ] Activate shows simple confirmation modal (no roles)
- [ ] Activation restores all previous roles

### Role Editing (1 test case)
- [ ] Can edit roles AFTER activation (separate step)

### Assignment Prevention (3 test cases)
- [ ] Inactive staff not in feedback dropdown
- [ ] Inactive staff not in task dropdown
- [ ] Inactive tutor not in tutorship dropdown

### Tutorship (4 test cases)
- [ ] Tutorship auto-released on deactivation, tutee can be reassigned
- [ ] Historical tutorship stays inactive on reactivation (NOT reactivated)
- [ ] Create new tutorship for reactivated staff → delete historical one
- [ ] Historical tutorship deleted on ANY new tutorship by reactivated staff

### Dashboard (1 test case)
- [ ] Dashboard counts exclude inactive staff

### Historical Data (3 test cases)
- [ ] Can view past feedback from inactive staff
- [ ] Can view past tasks from inactive staff
- [ ] Financial reports include inactive tutorship data

### Audit (3 test cases)
- [ ] Deactivation logged with roles
- [ ] Activation logged with roles
- [ ] Invalid assignment attempts logged

### Multi-Cycle (1 test case)
- [ ] Deactivate → Reactivate → Change Roles → Deactivate → Reactivate cycle

### Error Cases (2 test cases)
- [ ] Cannot create staff with Inactive role
- [ ] Inactive staff clearly marked in UI

### Permissions (2 test cases)
- [ ] Only admins can deactivate/reactivate
- [ ] Audit log shows who performed action

**Total: 25 test scenarios to manually execute**

---

## Notes
- Test in order (scenarios build on each other)
- Use real staff names or test data consistently
- Document any unexpected behavior
- Check Hebrew text displays correctly
- Verify modal text: "האם להפעיל את המשתמש {name}?"
