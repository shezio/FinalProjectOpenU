new feature -  need update tutorship status of child and tutor when tutorship created

create new model PrevTutorshipStatuses to log statuses changes of child and tutor

before create of tutorship  - save current status of child and tutor in PrevTutorshipStatuses
after create of tutorship - update status of child and tutor: tutor will get  status ״יש_חניך״,child will get status ״יש_חונך״ - each in the correct field in Child and Tutor models DONE



upon edit of the status manually - need to update the correct field in PrevTutorshipStatuses - if tutor status changed - update the last record of PrevTutorshipStatuses for this tutor - prev_tutor_status, if child status changed - update the last record of PrevTutorshipStatuses for this child - prev_child_tutoring_status - if no row to update - create a new row with the new status of the edited entity and the current status of the other entity done

Need new UI for tutor management to dev the tutor edit - TBD

upon delete of tutorship - need to get the last record of PrevTutorshipStatuses for this tutor and child - and update the status of tutor and child in their models to the prev_tutor_status and prev_child_tutoring_status - if no record - set status of tutor to ״אין_חניך״ and child to ״אין_חונך and also create a new record in PrevTutorshipStatuses with these values
then delete the prev record of PrevTutorshipStatuses for this tutor and child - so next time we create a tutorship for any of them we wont have conflict with other statuses per the ids DONE