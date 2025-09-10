new feature -  need update tutorship status of child and tutor when tutorship created

create new model PrevTutorshipStatuses to log statuses changes of child and tutor

before create of tutorship  - save current status of child and tutor in PrevTutorshipStatuses
after create of tutorship - update status of child and tutor: tutor will get  status ״יש_חניך״,child will get status ״יש_חונך״ - each in the correct field in Child and Tutor models DONE



upon edit of the status manually - need to update the correct field in PrevTutorshipStatuses - if tutor status changed - update the last record of PrevTutorshipStatuses for this tutor - prev_tutor_status, if child status changed - update the last record of PrevTutorshipStatuses for this child - prev_child_tutoring_status - if no row to update - create a new row with the new status of the edited entity and the current status of the other entity done

Need new UI for tutor management to dev the tutor edit - TBD

upon delete of tutorship - need to get the last record of PrevTutorshipStatuses for this tutor and child - and update the status of tutor and child in their models to the prev_tutor_status and prev_child_tutoring_status - if no record - set status of tutor to ״אין_חניך״ and child to ״אין_חונך and also create a new record in PrevTutorshipStatuses with these values
then delete the prev record of PrevTutorshipStatuses for this tutor and child - so next time we create a tutorship for any of them we wont have conflict with other statuses per the ids DONE


the data we get from the api of get_general_volunteers_not_pending isnt shown in the UI - need to show it
example data from server:

            "id": 100000001,
            "staff_id": 28,
            "first_name": "\u05d0\u05d1\u05d9\u05d2\u05d9\u05dc",
            "last_name": "\u05d2\u05e8\u05d9\u05e0\u05d1\u05e8\u05d2",
            "email": "aviga@mail.com",
            "signupdate": "2025-03-25",
            "comments": ""

grid is empty

also the edit functionality is not as i wanted - i want to edit a single field - no need modal - just click on the field and edit it - then modal appears to confirm the change - then save it to server 

also we need some sql to fill the tutee wellness and relationship status fields in the tutor table - from the child table - based on the current tutorships
and also make sure when we create a tutorship - these fields are updated in the tutor table from the child table

also the rotation not good enough i want no mirroring of text when rotated

