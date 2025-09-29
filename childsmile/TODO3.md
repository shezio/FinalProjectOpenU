


FUNCTIONAL BUG also the edit of the relationship status is not as the user selected it always takes the first option in the list - need to fix it

upon edit of the status manually - need to update the correct field in PrevTutorshipStatuses - if tutor status changed - update the last record of PrevTutorshipStatuses for this tutor - prev_tutor_status, if child status changed - update the last record of PrevTutorshipStatuses for this child - prev_child_tutoring_status - if no row to update - create a new row with the new status of the edited entity and the current status of the other entity 

after all the above - we need to update the tutee wellness and relationship status fields of the tutor when the child updated has them updated