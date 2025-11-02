admin new mail

update public.childsmile_app_staff
set email = 'gowocij683@memeazon.com'
where email = 'sysadminmini@mail.com'

while true; do LATEST_LOG=$(ls -t childsmile/childsmile_app/logs/*.log | head -n 1); echo "Tailing $LATEST_LOG"; tail -F "$LATEST_LOG" & TAIL_PID=$!; sleep 5; kill $TAIL_PID; wait $TAIL_PID 2>/dev/null; echo "Re-evaluating newest log file..."; done


Bugs/tasks:
[] create tests for UI
[] create tests for BE
[] guest account:
     - cannot see the children table - should see the table and disable the buttons in actions
     - same for initial family data
     - more bugs
[] test audit  so we have data of each action for UI
[] need UI for audit - with export to PDF, excel. also need refresh button, sort by date, search in description, filter by user, action, date range,
[] too many attempts with wrong totp, should have blocked expire the valid one to prevent brute force
[] filter healthy works only when u r on the 1st page lol
[] create logger and move all debug prints to logger, define levels etc
[] create tests for BE, and for UI
[] add role to search in sysmgmt table search
[] make sysmgmt sort by created_at desc by default and add sort button like in families.js
[] no validation on updating relationship type - can set to anything  - must be one of predefined types
[] cannot edit tutor using a volunteer account  - no error to user and no audit about it
[] created task for user even if totp send failed and user wasnt created
[] need to widen the delete staff modal to fit any length of email address
[] showing edit and delete buttons on family view even if user has no permission to edit or delete family - should disable those buttons
[] need to verify in UI that we see correct order chronologically for this:
Status: בביצוע → הושלמה when we get to audit log UI
[] add ID to tutor table, since we have it when the user is still pending tutor - and no one can see it. add to model, migrate. add to UI. update once we move pending tutor to tutor.
[] in tutor UI - need to actually see the relationship status and medical condition - not just have them shown when editing
[] mail send to tutor on promotion from pending tutor to tutor - now still not sending
[] all mails must be in hebrew
