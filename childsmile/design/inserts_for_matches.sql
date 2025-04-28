INSERT INTO
    childsmile_app_children (
        child_id,
        childfirstname,
        childsurname,
        registrationdate,
        lastupdateddate,
        gender,
        responsible_coordinator,
        city,
        child_phone_number,
        treating_hospital,
        date_of_birth,
        medical_diagnosis,
        diagnosis_date,
        marital_status,
        num_of_siblings,
        details_for_tutoring,
        additional_info,
        tutoring_status,
        current_medical_state,
        when_completed_treatments,
        father_name,
        father_phone,
        mother_name,
        mother_phone,
        street_and_apartment_number,
        expected_end_treatment_by_protocol,
        has_completed_treatments
    )
VALUES
    (
        (
            select
                COALESCE(max(child_id), 0)
            from
                childsmile_app_children
        ) + 1, -- Child ID (auto-incremented)
        'איתי', -- First name
        'לוי', -- Last name
        current_timestamp, -- Registration date
        current_timestamp, -- Last updated date
        FALSE, -- Gender (TRUE for male, FALSE for female)
        'ליה צוהר', -- Responsible coordinator
        'תל אביב - יפו', -- City (must exist in settlements_n_streets.json)
        '0' || COALESCE(
            (
                select
                    max(
                        regexp_replace(child_phone_number, '-', '', 'g')::bigint
                    )
                from
                    childsmile_app_children
                where
                    child_phone_number IS NOT NULL
                    and child_phone_number != ''
            ),
            0
        ) + 1, -- Child's phone number
        'שיבא תל השומר', -- Treating hospital (must exist in hospitals.json)
        '2015-01-01', -- Date of birth (child is 8 years old)
        'לוקמיה', -- Medical diagnosis
        '2021-12-31', -- Diagnosis date
        'נשואים', -- Marital status of parents
        2, -- Number of siblings
        'פרטים לחונכות', -- Details for tutoring
        'מידע נוסף', -- Additional info
        'למצוא_חונך', -- Tutoring status
        'התחיל כימותרפיה', -- Current medical state
        NULL, -- When completed treatments
        'דוד', -- Father's name
        '0' || COALESCE(
            (
                select
                    max(
                        regexp_replace(father_phone, '-', '', 'g')::bigint
                    )
                from
                    childsmile_app_children
                where
                    father_phone IS NOT NULL
                    and father_phone != ''
            ),
            0
        ) + 1, -- Father's phone number
        'שרה', -- Mother's name
        '0' || COALESCE(
            (
                select
                    max(
                        regexp_replace(mother_phone, '-', '', 'g')::bigint
                    )
                from
                    childsmile_app_children
                where
                    mother_phone IS NOT NULL
                    and mother_phone != ''
            ),
            0
        ) + 1, -- Mother's phone number
        'הרצל 10', -- Street and apartment number (must exist in settlements_n_streets.json)
        '2023-12-31', -- Expected end of treatment by protocol
        FALSE -- Has completed treatments
    );

--- inserts 19 more children with different names and details
INSERT INTO
    childsmile_app_children (
        child_id,
        childfirstname,
        childsurname,
        registrationdate,
        lastupdateddate,
        gender,
        responsible_coordinator,
        city,
        child_phone_number,
        treating_hospital,
        date_of_birth,
        medical_diagnosis,
        diagnosis_date,
        marital_status,
        num_of_siblings,
        details_for_tutoring,
        additional_info,
        tutoring_status,
        current_medical_state,
        when_completed_treatments,
        father_name,
        father_phone,
        mother_name,
        mother_phone,
        street_and_apartment_number,
        expected_end_treatment_by_protocol,
        has_completed_treatments
    )
VALUES
    (
        (
            select
                COALESCE(max(child_id), 0)
            from
                childsmile_app_children
        ) + 1, -- Child ID (auto-incremented)
        'ששון', -- First name
        'לואי', -- Last name
        current_timestamp, -- Registration date
        current_timestamp, -- Last updated date
        FALSE, -- Gender (TRUE for male, FALSE for female)
        'ליה צוהר', -- Responsible coordinator
        'תל אביב - יפו', -- City (must exist in settlements_n_streets.json)
        '0' || COALESCE(
            (
                select
                    max(
                        regexp_replace(child_phone_number, '-', '', 'g')::bigint
                    )
                from
                    childsmile_app_children
                where
                    child_phone_number IS NOT NULL
                    and child_phone_number != ''
            ),
            0
        ) + 1, -- Child's phone number
        'שיבא תל השומר', -- Treating hospital (must exist in hospitals.json)
        '2015-01-01', -- Date of birth (child is 8 years old)
        'לוקמיה', -- Medical diagnosis
        '2021-12-31', -- Diagnosis date
        'נשואים', -- Marital status of parents
        2, -- Number of siblings
        'פרטים לחונכות', -- Details for tutoring
        'מידע נוסף', -- Additional info
        'למצוא_חונך', -- Tutoring status
        'התחיל כימותרפיה', -- Current medical state
        NULL, -- When completed treatments
        'דוד', -- Father's name
        '0' || COALESCE(
            (
                select
                    max(
                        regexp_replace(father_phone, '-', '', 'g')::bigint
                    )
                from
                    childsmile_app_children
                where
                    father_phone IS NOT NULL
                    and father_phone != ''
            ),
            0
        ) + 1, -- Father's phone number
        'שרה', -- Mother's name
        '0' || COALESCE(
            (
                select
                    max(
                        regexp_replace(mother_phone, '-', '', 'g')::bigint
                    )
                from
                    childsmile_app_children
                where
                    mother_phone IS NOT NULL
                    and mother_phone != ''
            ),
            0
        ) + 1, -- Mother's phone number
        'הרצל 10', -- Street and apartment number (must exist in settlements_n_streets.json)
        '2023-12-31', -- Expected end of treatment by protocol
        FALSE -- Has completed treatments
    )
INSERT INTO
    childsmile_app_children (
        child_id,
        childfirstname,
        childsurname,
        registrationdate,
        lastupdateddate,
        gender,
        responsible_coordinator,
        city,
        child_phone_number,
        treating_hospital,
        date_of_birth,
        medical_diagnosis,
        diagnosis_date,
        marital_status,
        num_of_siblings,
        details_for_tutoring,
        additional_info,
        tutoring_status,
        current_medical_state,
        when_completed_treatments,
        father_name,
        father_phone,
        mother_name,
        mother_phone,
        street_and_apartment_number,
        expected_end_treatment_by_protocol,
        has_completed_treatments
    )
VALUES
    (
        (
            SELECT
                COALESCE(MAX(child_id), 0)
            FROM
                childsmile_app_children
        ) + 2, -- Child ID
        'עדי',
        'כהן',
        current_timestamp,
        current_timestamp,
        TRUE,
        'ליה צוהר',
        'תל אביב יפו', -- בלי גרש
        '0' || COALESCE(
            (
                SELECT
                    MAX(
                        regexp_replace(child_phone_number, '-', '', 'g')::bigint
                    )
                FROM
                    childsmile_app_children
                WHERE
                    child_phone_number IS NOT NULL
                    AND child_phone_number != ''
            ),
            0
        ) + 2, -- Child Phone Number
        'איכילוב תל אביב',
        '2016-05-10',
        'לוקמיה',
        '2022-03-15',
        'נשואים',
        2,
        'זקוקה לחונכת יציבה',
        'מידע נוסף',
        'למצוא_חונך',
        'התחילה כימותרפיה',
        NULL,
        'יוסי',
        '0' || COALESCE(
            (
                SELECT
                    MAX(
                        regexp_replace(father_phone, '-', '', 'g')::bigint
                    )
                FROM
                    childsmile_app_children
                WHERE
                    father_phone IS NOT NULL
                    AND father_phone != ''
            ),
            0
        ) + 2, -- Father Phone
        'רותי',
        '0' || COALESCE(
            (
                SELECT
                    MAX(
                        regexp_replace(mother_phone, '-', '', 'g')::bigint
                    )
                FROM
                    childsmile_app_children
                WHERE
                    mother_phone IS NOT NULL
                    AND mother_phone != ''
            ),
            0
        ) + 2, -- Mother Phone
        'אבן גבירול 10', -- גם פה אין גרש
        '2024-12-01',
        FALSE
    ),
    (
        (
            SELECT
                COALESCE(MAX(child_id), 0)
            FROM
                childsmile_app_children
        ) + 3, -- Child ID
        'דנה',
        'לוין',
        current_timestamp,
        current_timestamp,
        FALSE,
        'ליה צוהר',
        'תל אביב יפו', -- בלי גרש
        '0' || COALESCE(
            (
                SELECT
                    MAX(
                        regexp_replace(child_phone_number, '-', '', 'g')::bigint
                    )
                FROM
                    childsmile_app_children
                WHERE
                    child_phone_number IS NOT NULL
                    AND child_phone_number != ''
            ),
            0
        ) + 3, -- Child Phone Number
        'איכילוב תל אביב',
        '2016-05-10',
        'לוקמיה',
        '2022-03-15',
        'נשואים',
        2,
        'זקוקה לחונכת יציבה',
        'מידע נוסף',
        'למצוא_חונך_אין_באיזור_שלו',
        'התחילה כימותרפיה',
        NULL,
        'יוסי',
        '0' || COALESCE(
            (
                SELECT
                    MAX(
                        regexp_replace(father_phone, '-', '', 'g')::bigint
                    )
                FROM
                    childsmile_app_children
                WHERE
                    father_phone IS NOT NULL
                    AND father_phone != ''
            ),
            0
        ) + 3, -- Father Phone
        'רותי',
        '0' || COALESCE(
            (
                SELECT
                    MAX(
                        regexp_replace(mother_phone, '-', '', 'g')::bigint
                    )
                FROM
                    childsmile_app_children
                WHERE
                    mother_phone IS NOT NULL
                    AND mother_phone != ''
            ),
            0
        ) + 3, -- Mother Phone
        'אבן גבירול 10', -- גם פה אין גרש
        '2024-12-01',
        FALSE
    ),
    (
        (
            SELECT
                COALESCE(MAX(child_id), 0)
            FROM
                childsmile_app_children
        ) + 4, -- Child ID
        'אור',
        'שמש',
        current_timestamp,
        current_timestamp,
        TRUE,
        'ליה צוהר',
        'אשדוד',
        '0' || COALESCE(
            (
                SELECT
                    MAX(
                        regexp_replace(child_phone_number, '-', '', 'g')::bigint
                    )
                FROM
                    childsmile_app_children
                WHERE
                    child_phone_number IS NOT NULL
                    AND child_phone_number != ''
            ),
            0
        ) + 4, -- Child Phone Number
        'אסף הרופא',
        '2016-05-10',
        'לוקמיה',
        '2022-03-15',
        'נשואים',
        3,
        'זקוקה לחונכת, אבל לא באשדוד',
        'מידע נוסף',
        'למצוא_חונך_בעדיפות_גבוהה',
        'התחילה טיפולים',
        NULL,
        'מאיר',
        '0' || COALESCE(
            (
                SELECT
                    MAX(
                        regexp_replace(father_phone, '-', '', 'g')::bigint
                    )
                FROM
                    childsmile_app_children
                WHERE
                    father_phone IS NOT NULL
                    AND father_phone != ''
            ),
            0
        ) + 4, -- Father Phone
        'אורית',
        '0' || COALESCE(
            (
                SELECT
                    MAX(
                        regexp_replace(mother_phone, '-', '', 'g')::bigint
                    )
                FROM
                    childsmile_app_children
                WHERE
                    mother_phone IS NOT NULL
                    AND mother_phone != ''
            ),
            0
        ) + 4, -- Mother Phone
        'אבטליון 18',
        '2024-12-01',
        FALSE
    ),
    (
        (
            SELECT
                COALESCE(MAX(child_id), 0)
            FROM
                childsmile_app_children
        ) + 5,
        'נועם',
        'לוי',
        current_timestamp,
        current_timestamp,
        FALSE,
        'ליה צוהר',
        'חיפה',
        '0' || COALESCE(
            (
                SELECT
                    MAX(
                        regexp_replace(child_phone_number, '-', '', 'g')::bigint
                    )
                FROM
                    childsmile_app_children
                WHERE
                    child_phone_number IS NOT NULL
                    AND child_phone_number != ''
            ),
            0
        ) + 5,
        'רמבם חיפה',
        '2015-02-20',
        'לימפומה',
        '2021-09-10',
        'נשואים',
        1,
        'צריך חונך תומך',
        'מידע נוסף',
        'למצוא_חונך_בעדיפות_גבוהה',
        'מתחיל טיפולי הקרנות',
        NULL,
        'דוד',
        '0' || COALESCE(
            (
                SELECT
                    MAX(
                        regexp_replace(father_phone, '-', '', 'g')::bigint
                    )
                FROM
                    childsmile_app_children
                WHERE
                    father_phone IS NOT NULL
                    AND father_phone != ''
            ),
            0
        ) + 5,
        'שרה',
        '0' || COALESCE(
            (
                SELECT
                    MAX(
                        regexp_replace(mother_phone, '-', '', 'g')::bigint
                    )
                FROM
                    childsmile_app_children
                WHERE
                    mother_phone IS NOT NULL
                    AND mother_phone != ''
            ),
            0
        ) + 5,
        'שדרות הנשיא 12',
        '2025-05-15',
        FALSE
    ),
    (
        (
            SELECT
                COALESCE(MAX(child_id), 0)
            FROM
                childsmile_app_children
        ) + 6,
        'תמר',
        'ישראלי',
        current_timestamp,
        current_timestamp,
        TRUE,
        'ליה צוהר',
        'אשקלון',
        '0' || COALESCE(
            (
                SELECT
                    MAX(
                        regexp_replace(child_phone_number, '-', '', 'g')::bigint
                    )
                FROM
                    childsmile_app_children
                WHERE
                    child_phone_number IS NOT NULL
                    AND child_phone_number != ''
            ),
            0
        ) + 6,
        'ברזילי אשקלון',
        '2017-08-30',
        'סרטן מוח',
        '2023-02-01',
        'נשואים',
        3,
        'מעוניינת בחונכת קרובה לבית',
        'מידע נוסף',
        'למצוא_חונך_אין_באיזור_שלו',
        'עוברת סדרת טיפולי הקרנות',
        NULL,
        'משה',
        '0' || COALESCE(
            (
                SELECT
                    MAX(
                        regexp_replace(father_phone, '-', '', 'g')::bigint
                    )
                FROM
                    childsmile_app_children
                WHERE
                    father_phone IS NOT NULL
                    AND father_phone != ''
            ),
            0
        ) + 6,
        'איילת',
        '0' || COALESCE(
            (
                SELECT
                    MAX(
                        regexp_replace(mother_phone, '-', '', 'g')::bigint
                    )
                FROM
                    childsmile_app_children
                WHERE
                    mother_phone IS NOT NULL
                    AND mother_phone != ''
            ),
            0
        ) + 6,
        'בן גוריון 5',
        '2026-08-30',
        FALSE
    ),
    (
        (
            SELECT
                COALESCE(MAX(child_id), 0)
            FROM
                childsmile_app_children
        ) + 7,
        'אורי',
        'כהן',
        current_timestamp,
        current_timestamp,
        FALSE,
        'ליה צוהר',
        'באר שבע',
        '0' || COALESCE(
            (
                SELECT
                    MAX(
                        regexp_replace(child_phone_number, '-', '', 'g')::bigint
                    )
                FROM
                    childsmile_app_children
                WHERE
                    child_phone_number IS NOT NULL
                    AND child_phone_number != ''
            ),
            0
        ) + 7,
        'סורוקה באר שבע',
        '2014-12-10',
        'נפרובלסטומה',
        '2020-07-20',
        'גרושים',
        0,
        'צריך חונך לטווח ארוך',
        'מידע נוסף',
        'למצוא_חונך',
        'עבר ניתוח להסרת גידול',
        NULL,
        'יואב',
        '0' || COALESCE(
            (
                SELECT
                    MAX(
                        regexp_replace(father_phone, '-', '', 'g')::bigint
                    )
                FROM
                    childsmile_app_children
                WHERE
                    father_phone IS NOT NULL
                    AND father_phone != ''
            ),
            0
        ) + 7,
        'דנה',
        '0' || COALESCE(
            (
                SELECT
                    MAX(
                        regexp_replace(mother_phone, '-', '', 'g')::bigint
                    )
                FROM
                    childsmile_app_children
                WHERE
                    mother_phone IS NOT NULL
                    AND mother_phone != ''
            ),
            0
        ) + 7,
        'הרצל 22',
        '2025-09-10',
        FALSE
    ),
    (
        (
            SELECT
                COALESCE(MAX(child_id), 0)
            FROM
                childsmile_app_children
        ) + 8,
        'מיה',
        'זיו',
        current_timestamp,
        current_timestamp,
        TRUE,
        'ליה צוהר',
        'הרצליה',
        '0' || COALESCE(
            (
                SELECT
                    MAX(
                        regexp_replace(child_phone_number, '-', '', 'g')::bigint
                    )
                FROM
                    childsmile_app_children
                WHERE
                    child_phone_number IS NOT NULL
                    AND child_phone_number != ''
            ),
            0
        ) + 8,
        'מדיקל סנטר הרצליה',
        '2015-11-05',
        'רבדים סרקומה',
        '2022-08-18',
        'נשואים',
        1,
        'חונכת באזור השרון',
        'מידע נוסף',
        'למצוא_חונך_בעדיפות_גבוהה',
        'התחילה טיפול אימונותרפי',
        NULL,
        'רון',
        '0' || COALESCE(
            (
                SELECT
                    MAX(
                        regexp_replace(father_phone, '-', '', 'g')::bigint
                    )
                FROM
                    childsmile_app_children
                WHERE
                    father_phone IS NOT NULL
                    AND father_phone != ''
            ),
            0
        ) + 8,
        'אורית',
        '0' || COALESCE(
            (
                SELECT
                    MAX(
                        regexp_replace(mother_phone, '-', '', 'g')::bigint
                    )
                FROM
                    childsmile_app_children
                WHERE
                    mother_phone IS NOT NULL
                    AND mother_phone != ''
            ),
            0
        ) + 8,
        'ויצמן 22',
        '2025-12-05',
        FALSE
    ),
    (
        (
            SELECT
                COALESCE(MAX(child_id), 0)
            FROM
                childsmile_app_children
        ) + 9,
        'יהונתן',
        'ביטון',
        current_timestamp,
        current_timestamp,
        FALSE,
        'ליה צוהר',
        'ירושלים',
        '0' || COALESCE(
            (
                SELECT
                    MAX(
                        regexp_replace(child_phone_number, '-', '', 'g')::bigint
                    )
                FROM
                    childsmile_app_children
                WHERE
                    child_phone_number IS NOT NULL
                    AND child_phone_number != ''
            ),
            0
        ) + 9,
        'הדסה עין כרם ירושלים',
        '2016-01-18',
        'נוירובלסטומה',
        '2021-11-10',
        'נשואים',
        2,
        'זקוק לחונך לצורך לימודים',
        'מידע נוסף',
        'למצוא_חונך',
        'במעקב אונקולוגי צמוד',
        NULL,
        'עמיר',
        '0' || COALESCE(
            (
                SELECT
                    MAX(
                        regexp_replace(father_phone, '-', '', 'g')::bigint
                    )
                FROM
                    childsmile_app_children
                WHERE
                    father_phone IS NOT NULL
                    AND father_phone != ''
            ),
            0
        ) + 9,
        'גלית',
        '0' || COALESCE(
            (
                SELECT
                    MAX(
                        regexp_replace(mother_phone, '-', '', 'g')::bigint
                    )
                FROM
                    childsmile_app_children
                WHERE
                    mother_phone IS NOT NULL
                    AND mother_phone != ''
            ),
            0
        ) + 9,
        'עמק רפאים 8',
        '2024-11-18',
        FALSE
    ),
    (
        (
            SELECT
                COALESCE(MAX(child_id), 0)
            FROM
                childsmile_app_children
        ) + 10,
        'דנה',
        'פרידמן',
        current_timestamp,
        current_timestamp,
        TRUE,
        'ליה צוהר',
        'רעננה',
        '0' || COALESCE(
            (
                SELECT
                    MAX(
                        regexp_replace(child_phone_number, '-', '', 'g')::bigint
                    )
                FROM
                    childsmile_app_children
                WHERE
                    child_phone_number IS NOT NULL
                    AND child_phone_number != ''
            ),
            0
        ) + 10,
        'מרכז לוינשטיין רעננה',
        '2017-03-25',
        'אוסטאוסרקומה',
        '2022-01-12',
        'נשואים',
        1,
        'מעוניינת בחונכת',
        'מידע נוסף',
        'למצוא_חונך_אין_באיזור_שלו',
        'מחלים לאחר ניתוח גידול',
        NULL,
        'עופר',
        '0' || COALESCE(
            (
                SELECT
                    MAX(
                        regexp_replace(father_phone, '-', '', 'g')::bigint
                    )
                FROM
                    childsmile_app_children
                WHERE
                    father_phone IS NOT NULL
                    AND father_phone != ''
            ),
            0
        ) + 10,
        'הילה',
        '0' || COALESCE(
            (
                SELECT
                    MAX(
                        regexp_replace(mother_phone, '-', '', 'g')::bigint
                    )
                FROM
                    childsmile_app_children
                WHERE
                    mother_phone IS NOT NULL
                    AND mother_phone != ''
            ),
            0
        ) + 10,
        'אחוזה 100',
        '2025-10-25',
        FALSE
    ),
    (
        (
            SELECT
                COALESCE(MAX(child_id), 0)
            FROM
                childsmile_app_children
        ) + 11,
        'רועי',
        'סבן',
        current_timestamp,
        current_timestamp,
        FALSE,
        'ליה צוהר',
        'חדרה',
        '0' || COALESCE(
            (
                SELECT
                    MAX(
                        regexp_replace(child_phone_number, '-', '', 'g')::bigint
                    )
                FROM
                    childsmile_app_children
                WHERE
                    child_phone_number IS NOT NULL
                    AND child_phone_number != ''
            ),
            0
        ) + 11,
        'הלל יפה חדרה',
        '2015-06-14',
        'מיאלומה',
        '2021-05-30',
        'נשואים',
        2,
        'חונך ללימודי בית ספר',
        'מידע נוסף',
        'למצוא_חונך',
        'עבר סבב ראשון של טיפולים',
        NULL,
        'שאול',
        '0' || COALESCE(
            (
                SELECT
                    MAX(
                        regexp_replace(father_phone, '-', '', 'g')::bigint
                    )
                FROM
                    childsmile_app_children
                WHERE
                    father_phone IS NOT NULL
                    AND father_phone != ''
            ),
            0
        ) + 11,
        'תמר',
        '0' || COALESCE(
            (
                SELECT
                    MAX(
                        regexp_replace(mother_phone, '-', '', 'g')::bigint
                    )
                FROM
                    childsmile_app_children
                WHERE
                    mother_phone IS NOT NULL
                    AND mother_phone != ''
            ),
            0
        ) + 11,
        'הרצל 40',
        '2025-06-14',
        FALSE
    );

-- now  need to insert 10 tutors that leave in cities that are either same or close up to 20 km from the children cities, but 1st need to insert into signedup table, then staff table, and then into tutors table
-- childsmile_app_signedup - id, first_name, surname, age, gender, phone, city, comment, email, want_tutor.
-- childsmile_app_staff - staff_id, username, password, email, first_name, last_name, created_at, roles.
-- childsmile_app_tutors - id_id, staff_id, tutorship_status, preferences, tutor_email, relationship_status, tutee_wellness.
-- signedup need cities up to 20 km from the children cities, and also need to have different names and details, and also need to have different phone numbers, and also need to have different emails, and also need to have different comments, and also need to have different ages, and also need to TRUE for gender if name is of a female, and FALSE for a male name. also want_tutor should be TRUE for all of them. id must 9 digits long and UNIQUE, and phone must be 10 digits long, and email must be in the format of an email address, and comment should be a string of 10 characters long, and age should be between 18 and 60. the first name and last name should be in Hebrew letters, and the city should be in Hebrew letters, and the phone number should be in the format of a phone number.
-- staff will have the email from signedup, and the username will be the first name and last name concatenated with an underscore, and the password will be 1234, and the created_at will be the current timestamp, and the roles will be the role_id of a 'Tutor' from the childsmile_app_role table.
-- tutors will have the staff_id from the staff table, the id from signedup into id_id, the tutorship_status will be אין_חניך, the preferences will be a string of 10 characters long, the tutor_email will be the email from signedup, the relationship_status will be NULL, and the tutee_wellness will be NULL.
INSERT INTO
    childsmile_app_signedup (
        id,
        first_name,
        surname,
        age,
        gender,
        phone,
        city,
        comment,
        email,
        want_tutor
    )
VALUES
    (
        (
            SELECT
                COALESCE(MAX(id), 0)
            FROM
                childsmile_app_signedup
        ) + 1,
        'דנה', -- First name (female)
        'כהן', -- Last name
        25, -- Age
        TRUE, -- Gender (TRUE for female)
        '0' || COALESCE(
            (
                SELECT
                    MAX(regexp_replace(phone, '-', '', 'g')::bigint)
                FROM
                    childsmile_app_signedup
                WHERE
                    phone IS NOT NULL
                    AND phone != ''
            ),
            0
        ) + 1, -- Phone number (10 digits long)
        'תל אביב', -- City
        'חונכת טובה', -- Comment (10 characters)
        'dana@example.com', -- Email
        TRUE -- Want tutor
    ),
    (
        (
            SELECT
                COALESCE(MAX(id), 0)
            FROM
                childsmile_app_signedup
        ) + 2,
        'יוסי',
        'לוי',
        30,
        FALSE,
        '0' || COALESCE(
            (
                SELECT
                    MAX(regexp_replace(phone, '-', '', 'g')::bigint)
                FROM
                    childsmile_app_signedup
                WHERE
                    phone IS NOT NULL
                    AND phone != ''
            ),
            0
        ) + 2,
        'רמת גן',
        'חונך מצוין',
        'yossi@example.com',
        TRUE
    ),
    (
        (
            SELECT
                COALESCE(MAX(id), 0)
            FROM
                childsmile_app_signedup
        ) + 3,
        'נועה',
        'ישראלי',
        28,
        TRUE,
        '0' || COALESCE(
            (
                SELECT
                    MAX(regexp_replace(phone, '-', '', 'g')::bigint)
                FROM
                    childsmile_app_signedup
                WHERE
                    phone IS NOT NULL
                    AND phone != ''
            ),
            0
        ) + 3,
        'חולון',
        'חונכת מנוסה',
        'noa@example.com',
        TRUE
    ),
    (
        (
            SELECT
                COALESCE(MAX(id), 0)
            FROM
                childsmile_app_signedup
        ) + 4,
        'אורן',
        'שמש',
        35,
        FALSE,
        '0' || COALESCE(
            (
                SELECT
                    MAX(regexp_replace(phone, '-', '', 'g')::bigint)
                FROM
                    childsmile_app_signedup
                WHERE
                    phone IS NOT NULL
                    AND phone != ''
            ),
            0
        ) + 4,
        'פתח תקווה',
        'חונך אחראי',
        'oren@example.com',
        TRUE
    ),
    (
        (
            SELECT
                COALESCE(MAX(id), 0)
            FROM
                childsmile_app_signedup
        ) + 5,
        'רונית',
        'זיו',
        40,
        TRUE,
        '0' || COALESCE(
            (
                SELECT
                    MAX(regexp_replace(phone, '-', '', 'g')::bigint)
                FROM
                    childsmile_app_signedup
                WHERE
                    phone IS NOT NULL
                    AND phone != ''
            ),
            0
        ) + 5,
        'הרצליה',
        'חונכת מקצועית',
        'ronit@example.com',
        TRUE
    ),
    (
        (
            SELECT
                COALESCE(MAX(id), 0)
            FROM
                childsmile_app_signedup
        ) + 6,
        'דוד',
        'ביטון',
        45,
        FALSE,
        '0' || COALESCE(
            (
                SELECT
                    MAX(regexp_replace(phone, '-', '', 'g')::bigint)
                FROM
                    childsmile_app_signedup
                WHERE
                    phone IS NOT NULL
                    AND phone != ''
            ),
            0
        ) + 6,
        'נתניה',
        'חונך מנוסה',
        'david@example.com',
        TRUE
    ),
    (
        (
            SELECT
                COALESCE(MAX(id), 0)
            FROM
                childsmile_app_signedup
        ) + 7,
        'איילת',
        'פרידמן',
        32,
        TRUE,
        '0' || COALESCE(
            (
                SELECT
                    MAX(regexp_replace(phone, '-', '', 'g')::bigint)
                FROM
                    childsmile_app_signedup
                WHERE
                    phone IS NOT NULL
                    AND phone != ''
            ),
            0
        ) + 7,
        'כפר סבא',
        'חונכת מסורה',
        'ayelet@example.com',
        TRUE
    ),
    (
        (
            SELECT
                COALESCE(MAX(id), 0)
            FROM
                childsmile_app_signedup
        ) + 8,
        'משה',
        'כהן',
        50,
        FALSE,
        '0' || COALESCE(
            (
                SELECT
                    MAX(regexp_replace(phone, '-', '', 'g')::bigint)
                FROM
                    childsmile_app_signedup
                WHERE
                    phone IS NOT NULL
                    AND phone != ''
            ),
            0
        ) + 8,
        'חיפה',
        'חונך מקצועי',
        'moshe@example.com',
        TRUE
    ),
    (
        (
            SELECT
                COALESCE(MAX(id), 0)
            FROM
                childsmile_app_signedup
        ) + 9,
        'גלית',
        'סבן',
        29,
        TRUE,
        '0' || COALESCE(
            (
                SELECT
                    MAX(regexp_replace(phone, '-', '', 'g')::bigint)
                FROM
                    childsmile_app_signedup
                WHERE
                    phone IS NOT NULL
                    AND phone != ''
            ),
            0
        ) + 9,
        'באר שבע',
        'חונכת מצוינת',
        'galit@example.com',
        TRUE
    ),
    (
        (
            SELECT
                COALESCE(MAX(id), 0)
            FROM
                childsmile_app_signedup
        ) + 10,
        'יונתן',
        'לוין',
        38,
        FALSE,
        '0' || COALESCE(
            (
                SELECT
                    MAX(regexp_replace(phone, '-', '', 'g')::bigint)
                FROM
                    childsmile_app_signedup
                WHERE
                    phone IS NOT NULL
                    AND phone != ''
            ),
            0
        ) + 10,
        'ירושלים',
        'חונך אחראי',
        'yonatan@example.com',
        TRUE
    );

INSERT INTO
    childsmile_app_staff (
        username,
        password,
        email,
        first_name,
        last_name,
        created_at,
        roles
    )
SELECT
    CONCAT(first_name, '_', surname), -- Username
    '1234', -- Password
    email, -- Email from signedup
    first_name, -- First name
    surname, -- Last name
    current_timestamp, -- Created at
    ARRYA[(
        SELECT
            id
        FROM
            childsmile_app_role
        WHERE
            role_name = 'Tutor'
    )] -- Role ID for 'Tutor'
FROM
    childsmile_app_signedup
WHERE
    email IN (
        'dana@example.com',
        'yossi@example.com',
        'noa@example.com',
        'oren@example.com',
        'ronit@example.com',
        'david@example.com',
        'ayelet@example.com',
        'moshe@example.com',
        'galit@example.com',
        'yonatan@example.com'
    );

INSERT INTO
    childsmile_app_tutors (
        id_id,
        staff_id,
        tutorship_status,
        preferences,
        tutor_email,
        relationship_status,
        tutee_wellness
    )
SELECT
    s.id, -- ID from signedup
    st.staff_id, -- Staff ID from staff
    'אין_חניך', -- Tutorship status
    'העדפות כלליות', -- Preferences (10 characters)
    s.email, -- Tutor email
    NULL, -- Relationship status
    NULL -- Tutee wellness
FROM
    childsmile_app_signedup s
    JOIN childsmile_app_staff st ON s.email = st.email
WHERE
    s.email IN (
        'dana@example.com',
        'yossi@example.com',
        'noa@example.com',
        'oren@example.com',
        'ronit@example.com',
        'david@example.com',
        'ayelet@example.com',
        'moshe@example.com',
        'galit@example.com',
        'yonatan@example.com'
    );



-- insert 1 line into childsmile_app_possible_matches

INSERT INTO childsmile_app_possiblematches (
    child_id,
    tutor_id,
    child_full_name,
    tutor_full_name,
    child_city,
    tutor_city,
    child_age,
    tutor_age,
    child_gender,
    tutor_gender,
    distance_between_cities,
    grade,
    is_used
)
SELECT 
    child.child_id,
    tutor.id_id,
    CONCAT(child.childfirstname, ' ', child.childsurname) AS child_full_name,
    CONCAT(signedup.first_name, ' ', signedup.surname) AS tutor_full_name,
    child.city AS child_city,
    signedup.city AS tutor_city,
    EXTRACT(YEAR FROM AGE(current_date, child.date_of_birth))::int AS child_age, -- Calculate child age
    signedup.age AS tutor_age, -- Tutor age from signedup table
    child.gender AS child_gender, -- Child gender
    signedup.gender AS tutor_gender, -- Tutor gender
    0 AS distance_between_cities, -- Placeholder for distance
    100 AS grade, -- Default grade
    FALSE AS is_used -- Default is_used
FROM childsmile_app_children child
JOIN childsmile_app_signedup signedup 
    ON child.city = signedup.city AND child.gender = signedup.gender
JOIN childsmile_app_tutors tutor 
    ON signedup.id = tutor.id_id
WHERE NOT EXISTS (
    SELECT 1
    FROM childsmile_app_possiblematches pm
    WHERE pm.child_id = child.child_id AND pm.tutor_id = tutor.id_id
)
LIMIT 1; -- Insert only one row