admin new mail

update public.childsmile_app_staff
set email = 'gowocij683@memeazon.com'
where email = 'sysadminmini@mail.com'

while true; do LATEST_LOG=$(ls -t childsmile/childsmile_app/logs/*.log | head -n 1); echo "Tailing $LATEST_LOG"; tail -F "$LATEST_LOG" & TAIL_PID=$!; sleep 5; kill $TAIL_PID; wait $TAIL_PID 2>/dev/null; echo "Re-evaluating newest log file..."; done


Bugs/tasks:
[] created task for user even if totp send failed and user wasnt created
TBD:
[] create tests for UI
[] create tests for BE
[] guest account:
     - cannot see the children table - should see the table and disable the buttons in actions
     - same for initial family data
     - more bugs
[] need to verify in UI that we see correct order chronologically for this:
Status: בביצוע → הושלמה when we get to audit log UI



i noticed anyone in the world can register
what i need is:
1- Create new task type registration approval and create a new file in migration files for it

2 - Admin must approve by completing the task - so create internally task for Registration Approval - right after the user verified the totp on registration
 - All admin users will get the task - once one admin moves to in progress its deleted from all other users like we have for family add with technical coordinators - just look up the code base ull get it
- Only after the task complete can the user be allowed to login
 - add new field in staff table - approved registration boolean - can be in the same mig file above
 - update the task types and staff model to have the updates
- Will not send totp to user nor verify on any flow if false - create a util function to check if approved - (as i said above - except for registration so the "no send" restriction starts after the user is created with registraion_approved=false but then not allowed until
- in same mig file after creation set True to all existing lines

Update toaster text that after admin approval he can login - instaed of telling the user
what we now say that he can login after verification
add in i18n the new task type and the new toaster text