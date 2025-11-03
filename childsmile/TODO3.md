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