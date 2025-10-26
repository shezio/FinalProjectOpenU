admin new mail

update public.childsmile_app_staff
set email = 'gowocij683@memeazon.com'
where email = 'sysadminmini@mail.com'

the description field value will be in a human story form like this:
User <username> with email <user_email> performed action <action> on <timestamp>. The action affected the following tables: <affected_tables>. The user had the following roles: <user_roles>. The action was <success/failure>. <If failure: The error message was: <error_message>>.

we need to also make sure that the description adapts to all possible actions.
need to go through every action we have in AUDIT_ACTIONS and make sure the description makes sense for each action - and if needed add more fields to the audit table and to the description story so it makes sense for every action. pls review every action in AUDIT_ACTIONS and confirm if the description format above is sufficient or if we need to add more fields to the audit log to make the description meaningful for each action.


and as for VIEW_*_FAILED and EXPORT_*_FAILED we will need to add a call from UI to update audit using API

Task list:
- [x] Update views.py to include audit logging
- [ ] Update family_views.py to include audit logging
- [ ] Update feedback_views.py to include audit logging
- [ ] Update task_views.py to include audit logging
- [ ] Update report_views.py to include audit logging
- [ ] Update tutor_volunteer_views.py to include audit logging
- [ ] Update tutorship_views.py to include audit logging
- [ ] Review all actions in AUDIT_ACTIONS - test every action
- [ ] Confirm if the description format is sufficient for each action
- [ ] Identify any additional fields needed for meaningful descriptions
- [ ] Update audit log schema if necessary
- [ ] Implement API calls from UI for VIEW_*_FAILED and EXPORT_*_FAILED actions

Bugs:
2. too many attempts with wrong totp - should have blocked completely to prevent brute force
3. filter healthy works only when u r on the 1st page lol
