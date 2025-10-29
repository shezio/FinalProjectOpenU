admin new mail

update public.childsmile_app_staff
set email = 'gowocij683@memeazon.com'
where email = 'sysadminmini@mail.com'



and as for VIEW_*_FAILED and EXPORT_*_FAILED we will need to add a call from UI to update audit using API

Task list:
- [x] Update views.py to include audit logging
- [x] Update family_views.py to include audit logging
- [x] Update feedback_views.py to include audit logging
- [x] Update task_views.py to include audit logging
- [x] Update tutor_volunteer_views.py to include audit logging
- [x] Update tutorship_views.py to include audit logging
- [x] Review all actions in AUDIT_ACTIONS - test every action
- [ ] Confirm if the description format is sufficient for each action
- [ ] Identify any additional fields needed for meaningful descriptions
- [ ] Update audit log schema if necessary
- [x] Implement API calls from UI for VIEW_*_FAILED and EXPORT_*_FAILED actions

Bugs/tasks:
- too many attempts with wrong totp - should have blocked expire the valid one to prevent brute force
- filter healthy works only when u r on the 1st page lol
- create logger and move all debug prints to logger, define levels etc
- create tests for BE, and for UI
- add role to search in sysmgmt table search
- make sysmgmt sort by created_at desc by default and add sort button like in families.js
- no validation on updating relationship type - can set to anything  - must be one of predefined types
- cannot edit tutor using a volunteer account  - no error to user and no audit about it
- created task for user even if totp send failed and user wasnt created
- need to widen the delete staff modal to fit any length of email address
- showing edit and delete buttons on family view even if user has no permission to edit or delete family - should disable those buttons
- need to verify in UI that we see correct order chronologically for this: 
Status: בביצוע → הושלמה when we get to audit log UI
- add ID to tutor table, since we have it when the user is still pending tutor - and no one can see it. add to model, migrate. add to UI. update once we move pending tutor to tutor. 
- in addition to the above - we dont have any place we show some of the data in signedip and staff tables - need to consida!