-- ============================================================================
-- add_audit_translations.sql
-- Seed Hebrew translations for every audit ACTION code the system can emit.
--
-- The Audit Log "Filter by Action" dropdown shows each action's Hebrew label
-- from childsmile_app_audittranslation (action UNIQUE). Any action missing a
-- row shows the raw English code. This script inserts a Hebrew label for every
-- known action.
--
-- Idempotent & safe to re-run: ON CONFLICT (action) DO UPDATE upserts. New
-- actions are inserted; existing ones have their Hebrew translation REFRESHED to
-- the value below. So to fix a wrong translation just edit it here and re-run —
-- no manual delete/insert needed. The id column auto-generates.
-- ============================================================================

INSERT INTO public.childsmile_app_audittranslation (action, hebrew_translation) VALUES
    -- Authentication / registration
    ('USER_LOGIN_SUCCESS',            'התחברות משתמש הצליחה'),
    ('USER_LOGIN_FAILED',             'כישלון בהתחברות משתמש'),
    ('USER_LOGOUT',                   'התנתקות משתמש'),
    ('GOOGLE_LOGIN_SUCCESS',          'התחברות עם גוגל הצליחה'),
    ('GOOGLE_LOGIN_FAILED',           'כישלון בהתחברות עם גוגל'),
    ('TOTP_VERIFICATION_SUCCESS',     'אימות TOTP הצליח'),
    ('TOTP_VERIFICATION_FAILED',      'כישלון באימות TOTP'),
    ('TOTP_SEND_FAILED',              'כישלון בשליחת קוד אימות'),
    ('LOGIN_CODE_SENT',               'קוד התחברות נשלח'),
    ('LOGIN_CODE_SEND_FAILED',        'כישלון בשליחת קוד התחברות'),
    ('USER_REGISTRATION_SUCCESS',     'הרשמת משתמש הצליחה'),
    ('USER_REGISTRATION_FAILED',      'כישלון בהרשמת משתמש'),
    ('UNAUTHORIZED_ACCESS_ATTEMPT',   'ניסיון גישה לא מורשה'),
    ('VIEW_AUDIT_LOGS',               'צפייה ביומן הביקורת'),

    -- Tutorships
    ('CREATE_TUTORSHIP_SUCCESS',      'יצירת חונכות הצליחה'),
    ('CREATE_TUTORSHIP_FAILED',       'כישלון ביצירת חונכות'),
    ('UPDATE_TUTORSHIP_SUCCESS',      'עדכון חונכות הצליח'),
    ('UPDATE_TUTORSHIP_FAILED',       'כישלון בעדכון חונכות'),
    ('DELETE_TUTORSHIP_SUCCESS',      'מחיקת חונכות הצליחה'),
    ('DELETE_TUTORSHIP_FAILED',       'כישלון במחיקת חונכות'),
    ('CALCULATE_MATCHES_FAILED',      'כישלון בחישוב התאמות'),
    ('VIEW_TUTORSHIPS_FAILED',        'שגיאה בטעינת חונכויות'),

    -- Feedbacks
    ('CREATE_TUTOR_FEEDBACK_SUCCESS',      'יצירת משוב חונך הצליחה'),
    ('CREATE_TUTOR_FEEDBACK_FAILED',       'כישלון ביצירת משוב חונך'),
    ('UPDATE_TUTOR_FEEDBACK_SUCCESS',      'עדכון משוב חונך הצליח'),
    ('UPDATE_TUTOR_FEEDBACK_FAILED',       'כישלון בעדכון משוב חונך'),
    ('DELETE_TUTOR_FEEDBACK_SUCCESS',      'מחיקת משוב חונך הצליחה'),
    ('DELETE_TUTOR_FEEDBACK_FAILED',       'כישלון במחיקת משוב חונך'),
    ('CREATE_VOLUNTEER_FEEDBACK_SUCCESS',  'יצירת משוב מתנדב כללי הצליחה'),
    ('CREATE_VOLUNTEER_FEEDBACK_FAILED',   'כישלון ביצירת משוב מתנדב כללי'),
    ('UPDATE_VOLUNTEER_FEEDBACK_SUCCESS',  'עדכון משוב מתנדב כללי הצליח'),
    ('UPDATE_VOLUNTEER_FEEDBACK_FAILED',   'כישלון בעדכון משוב מתנדב כללי'),
    ('DELETE_VOLUNTEER_FEEDBACK_SUCCESS',  'מחיקת משוב מתנדב כללי הצליחה'),
    ('DELETE_VOLUNTEER_FEEDBACK_FAILED',   'כישלון במחיקת משוב מתנדב כללי'),
    -- Unified feedbacks (tutor + volunteer merged into childsmile_app_feedbacks)
    ('CREATE_FEEDBACK_SUCCESS',            'יצירת משוב הצליחה'),
    ('CREATE_FEEDBACK_FAILED',             'כישלון ביצירת משוב'),
    ('UPDATE_FEEDBACK_SUCCESS',            'עדכון משוב הצליח'),
    ('UPDATE_FEEDBACK_FAILED',             'כישלון בעדכון משוב'),
    ('DELETE_FEEDBACK_SUCCESS',            'מחיקת משוב הצליחה'),
    ('DELETE_FEEDBACK_FAILED',             'כישלון במחיקת משוב'),

    -- Mail
    ('SEND_MAIL_SUCCESS',             'שליחת מייל הצליחה'),
    ('SEND_MAIL_FAILED',              'כישלון בשליחת מייל'),

    -- Families
    ('CREATE_FAMILY_SUCCESS',         'יצירת משפחה הצליחה'),
    ('CREATE_FAMILY_FAILED',          'כישלון ביצירת משפחה'),
    ('UPDATE_FAMILY_SUCCESS',         'עדכון משפחה הצליח'),
    ('UPDATE_FAMILY_FAILED',          'כישלון בעדכון משפחה'),
    ('DELETE_FAMILY_SUCCESS',         'מחיקת משפחה הצליחה'),
    ('DELETE_FAMILY_FAILED',          'כישלון במחיקת משפחה'),
    ('VIEW_FAMILY_DETAILS_SUCCESS',   'צפייה בפרטי משפחה הצליחה'),
    ('VIEW_FAMILY_DETAILS_FAILED',    'כישלון בצפייה בפרטי משפחה'),
    ('VIEW_INITIAL_FAMILY_FAILED',    'כישלון בצפייה בפרטי משפחה ראשוניים'),
    ('CREATE_INITIAL_FAMILY_SUCCESS', 'יצירת פרטי משפחה ראשוניים הצליחה'),
    ('CREATE_INITIAL_FAMILY_FAILED',  'כישלון ביצירת פרטי משפחה ראשוניים'),
    ('UPDATE_INITIAL_FAMILY_SUCCESS', 'עדכון פרטי משפחה ראשוניים הצליח'),
    ('UPDATE_INITIAL_FAMILY_FAILED',  'כישלון בעדכון פרטי משפחה ראשוניים'),
    ('DELETE_INITIAL_FAMILY_SUCCESS', 'מחיקת פרטי משפחה ראשוניים הצליחה'),
    ('DELETE_INITIAL_FAMILY_FAILED',  'כישלון במחיקת פרטי משפחה ראשוניים'),
    ('MARK_FAMILY_ADDED_SUCCESS',     'סימון משפחה כהתווספה הצליח'),
    ('MARK_FAMILY_ADDED_FAILED',      'כישלון בסימון משפחה כהתווספה'),

    -- Notifications
    ('CREATE_NOTIFICATION',           'יצירת התראה'),
    ('UPDATE_NOTIFICATION',           'עדכון התראה'),
    ('DELETE_NOTIFICATION',           'מחיקת התראה'),

    -- Refunds
    ('VIEW_REFUNDS',                  'צפייה בהחזרים'),
    ('VIEW_REFUNDS_FAILED',           'כישלון בצפייה בהחזרים'),
    ('CREATE_REFUND',                 'יצירת החזר'),
    ('CREATE_REFUND_FAILED',          'כישלון ביצירת החזר'),
    ('UPDATE_REFUND',                 'עדכון החזר'),
    ('UPDATE_REFUND_FAILED',          'כישלון בעדכון החזר'),
    ('DELETE_REFUND',                 'מחיקת החזר'),
    ('DELETE_REFUND_FAILED',          'כישלון במחיקת החזר'),
    ('DELETE_REFUND_FORBIDDEN',       'מחיקת החזר אסורה'),
    ('IMPORT_REFUNDS_SUCCESS',        'ייבוא החזרים הצליח'),
    ('IMPORT_REFUNDS_FAILED',         'כישלון בייבוא החזרים'),
    ('EXPORT_REPORT_REFUNDS_JSON',    'ייצוא דוח החזרים ל-JSON'),
    ('EXPORT_REPORT_REFUNDS_EXCEL',   'ייצוא דוח החזרים לאקסל'),
    ('EXPORT_REPORT_REFUNDS_PDF',     'ייצוא דוח החזרים ל-PDF'),

    -- Tasks
    ('VIEW_TASKS_SUCCESS',            'צפייה במשימות הצליחה'),
    ('VIEW_TASKS_FAILED',             'שגיאה בטעינת משימות'),
    ('CREATE_TASK_SUCCESS',           'יצירת משימה הצליחה'),
    ('CREATE_TASK_FAILED',            'כישלון ביצירת משימה'),
    ('UPDATE_TASK_SUCCESS',           'עדכון משימה הצליח'),
    ('UPDATE_TASK_FAILED',            'כישלון בעדכון משימה'),
    ('UPDATE_TASK',                   'עדכון משימה'),
    ('DELETE_TASK_SUCCESS',           'מחיקת משימה הצליחה'),
    ('DELETE_TASK_FAILED',            'כישלון במחיקת משימה'),
    ('REVERT_TASK_STATUS_SUCCESS',    'שחזור סטטוס משימה הצליח'),
    ('REVERT_TASK_STATUS_FAILED',     'כישלון בשחזור סטטוס משימה'),
    ('CREATE_MONTHLY_TASKS',          'יצירת משימות שיחת ביקורת חודשיות'),
    ('CREATE_MONTHLY_TASKS_FAILED',   'כשל ביצירת משימות שיחת ביקורת חודשיות'),
    ('DELETE_PENDING_TUTOR_SUCCESS',  'מחיקת מועמד לחונכות הצליחה'),

    -- Staff / volunteers / tutors
    ('CREATE_STAFF_SUCCESS',              'יצירת איש צוות הצליחה'),
    ('CREATE_STAFF_FAILED',               'כישלון ביצירת איש צוות'),
    ('UPDATE_STAFF_SUCCESS',              'עדכון איש צוות הצליח'),
    ('UPDATE_STAFF_FAILED',               'כישלון בעדכון איש צוות'),
    ('DELETE_STAFF_SUCCESS',              'מחיקת איש צוות הצליחה'),
    ('DELETE_STAFF_FAILED',               'כישלון במחיקת איש צוות'),
    ('DEACTIVATE_STAFF',                  'כיבוי משתמש'),
    ('DEACTIVATE_STAFF_FAILED',           'כשלון בכיבוי משתמש'),
    ('ACTIVATE_STAFF',                    'הפעלה מחדש של משתמש'),
    ('ACTIVATE_STAFF_FAILED',             'כשלון בהפעלה מחדש של משתמש'),
    ('CREATE_VOLUNTEER_SUCCESS',          'יצירת מתנדב כללי הצליחה'),
    ('CREATE_VOLUNTEER_FAILED',           'כישלון ביצירת מתנדב'),
    ('CREATE_PENDING_TUTOR_SUCCESS',      'יצירת מועמד לחונכות הצליחה'),
    ('CREATE_PENDING_TUTOR_FAILED',       'כישלון ביצירת מועמד לחונכות'),
    ('UPDATE_TUTOR_SUCCESS',              'עדכון חונך הצליח'),
    ('UPDATE_TUTOR_FAILED',               'כישלון בעדכון חונך'),
    ('UPDATE_GENERAL_VOLUNTEER_SUCCESS',  'עדכון מתנדב כללי הצליח'),
    ('UPDATE_GENERAL_VOLUNTEER_FAILED',   'כישלון בעדכון מתנדב כללי'),

    -- List / dashboard views
    ('VIEW_STAFF_LIST',               'צפייה ברשימת הצוות'),
    ('VIEW_STAFF_LIST_FAILED',        'צפייה ברשימת הצוות נכשלה'),
    ('VIEW_CHILDREN_LIST',            'צפייה ברשימת הילדים'),
    ('VIEW_TUTORS_LIST',              'צפייה ברשימת החונכים'),
    ('VIEW_DASHBOARD',                'צפייה בלוח בקרה'),
    ('VIEW_DASHBOARD_FAILED',         'כשלון בצפייה בלוח בקרה'),
    ('GENERATE_VIDEO_FAILED',         'כישלון ביצירת סרטון'),
    ('EXPORT_PPT_FAILED',             'כישלון בייצוא מצגת'),

    -- Report exports (triggered from the UI)
    ('EXPORT_REPORT_EXCEL_SUCCESS',   'יצוא דוח לאקסל הצליח'),
    ('EXPORT_REPORT_EXCEL_FAILED',    'כישלון ביצוא דוח לאקסל'),
    ('EXPORT_REPORT_PDF_SUCCESS',     'יצוא דוח ל-PDF הצליח'),
    ('EXPORT_REPORT_PDF_FAILED',      'כישלון ביצוא דוח ל-PDF'),
    ('EXPORT_REPORT_IMAGE_SUCCESS',   'יצוא דוח לתמונה הצליח'),
    ('EXPORT_REPORT_IMAGE_FAILED',    'כישלון ביצוא דוח לתמונה'),
    ('EXPORT_REPORT_CSV_SUCCESS',     'יצוא דוח ל-CSV הצליח'),
    ('EXPORT_REPORT_CSV_FAILED',      'כישלון בייצוא דוח ל-CSV'),

    -- Staff suspension clearing / scheduled task cleanup
    ('CLEAR_SUSPENSION',              'הסרת השהיה'),
    ('BULK_CLEAR_SUSPENSION',         'הסרת השהיה מרובה'),
    ('BULK_CLEAR_SUSPENSION_FAILED',  'כישלון בהסרת השהיה מרובה'),
    ('CLEANUP_OLD_TASKS',                 'ניקוי משימות ישנות'),
    ('CLEANUP_OLD_TASKS_FAILED',          'כישלון בניקוי משימות ישנות'),

    -- Viewer read-only blocked write attempts. The @block_viewer_writes guard
    -- logs the uppercased view-function name as the action when a 'Viewer' user
    -- attempts a write, so each decorated endpoint name needs a Hebrew label.
    ('CHECK_MONTHLY_REVIEW_TASKS',    'בדיקת משימות שיחת ביקורת חודשיות'),
    ('COORDINATOR_REPORT_DETAIL',     'פירוט דוח רכז'),
    ('CREATE_FAMILY',                 'יצירת משפחה'),
    ('CREATE_INITIAL_FAMILY_DATA',    'יצירת פרטי משפחה ראשוניים'),
    ('CREATE_PENDING_TUTOR',          'יצירת מועמד לחונכות'),
    ('CREATE_STAFF_MEMBER',           'יצירת איש צוות'),
    ('CREATE_TASK',                   'יצירת משימה'),
    ('CREATE_TUTORSHIP',              'יצירת חונכות'),
    ('CREATE_TUTOR_FEEDBACK',         'יצירת משוב חונך'),
    ('CREATE_VOLUNTEER_FEEDBACK',     'יצירת משוב מתנדב כללי'),
    ('CREATE_FEEDBACK',               'יצירת משוב'),
    ('UPDATE_FEEDBACK',               'עדכון משוב'),
    ('DELETE_FEEDBACK',               'מחיקת משוב'),
    ('CREATE_VOLUNTEER_OR_TUTOR',     'יצירת מתנדב או חונך'),
    ('DELETE_FAMILY',                 'מחיקת משפחה'),
    ('DELETE_INITIAL_FAMILY_DATA',    'מחיקת פרטי משפחה ראשוניים'),
    ('DELETE_MESSAGE',                'מחיקת הודעה'),
    ('DELETE_STAFF_MEMBER',           'מחיקת איש צוות'),
    ('DELETE_TASK',                   'מחיקת משימה'),
    ('DELETE_TUTORSHIP',              'מחיקת חונכות'),
    ('DELETE_TUTOR_FEEDBACK',         'מחיקת משוב חונך'),
    ('DELETE_VOLUNTEER_FEEDBACK',     'מחיקת משוב מתנדב כללי'),
    ('IMPORT_FAMILIES_ENDPOINT',      'ייבוא משפחות'),
    ('IMPORT_REFUNDS',                'ייבוא החזרים'),
    ('IMPORT_VOLUNTEERS_ENDPOINT',    'ייבוא מתנדבים'),
    ('LOCAL_UPLOAD_RECEIPT',          'העלאת קבלה'),
    ('MARK_INITIAL_FAMILY_COMPLETE',  'סימון פרטי משפחה ראשוניים כהושלמו'),
    ('MEETINGS_LIST',                 'רשימת פגישות'),
    ('MEETING_DETAIL',                'פירוט פגישה'),
    ('MEETING_HARD_DELETE',           'מחיקת פגישה לצמיתות'),
    ('PURGE_OLD_AUDIT_LOGS',          'ניקוי יומני ביקורת ישנים'),
    ('REFRESH_BIRTHDAY_NOTIFICATIONS','רענון התראות ימי הולדת'),
    ('REVERT_TASK_STATUS',            'שחזור סטטוס משימה'),
    ('SEND_MAIL_VIA_UI',              'שליחת מייל מהממשק'),
    ('SEND_MESSAGE_TO_ALL',           'שליחת הודעה לכולם'),
    ('SEND_MESSAGE_TO_COORDINATOR',   'שליחת הודעה לרכז'),
    ('SEND_MESSAGE_TO_MANY',          'שליחת הודעה למספר נמענים'),
    ('SEND_REMINDERS_NOW',            'שליחת תזכורות עכשיו'),
    ('SEND_WEEKLY_REQUEST_NOW',       'שליחת בקשה שבועית עכשיו'),
    ('STAFF_CREATION_SEND_TOTP',      'שליחת קוד אימות ליצירת איש צוות'),
    ('STAFF_CREATION_VERIFY_TOTP',    'אימות קוד ליצירת איש צוות'),
    ('UPDATE_CHILD_ID',               'עדכון מזהה ילד'),
    ('UPDATE_FAMILY',                 'עדכון משפחה'),
    ('UPDATE_GENERAL_VOLUNTEER',      'עדכון מתנדב כללי'),
    ('UPDATE_INITIAL_FAMILY_DATA',    'עדכון פרטי משפחה ראשוניים'),
    ('UPDATE_STAFF_MEMBER',           'עדכון איש צוות'),
    ('UPDATE_TASK_STATUS',            'עדכון סטטוס משימה'),
    ('UPDATE_TUTOR',                  'עדכון חונך'),
    ('UPDATE_TUTORSHIP',              'עדכון חונכות'),
    ('UPDATE_TUTORSHIP_CREATED_DATE', 'עדכון תאריך יצירת חונכות'),
    ('UPDATE_TUTOR_FEEDBACK',         'עדכון משוב חונך'),
    ('UPDATE_VOLUNTEER_FEEDBACK',     'עדכון משוב מתנדב כללי'),
    ('UPDATE_VOLUNTEER_ID',           'עדכון מזהה מתנדב'),
    ('UPDATE_VOLUNTEER_PHONE',        'עדכון טלפון מתנדב'),
    ('UPDATE_VOLUNTEER_ID_SUCCESS', 'עדכון מזהה מתנדב הצליח'),
    ('UPDATE_VOLUNTEER_ID_FAILED', 'כישלון בעדכון מזהה מתנדב'),
    ('UPDATE_VOLUNTEER_PHONE_SUCCESS', 'עדכון טלפון מתנדב הצליח'),
    ('UPDATE_VOLUNTEER_PHONE_FAILED', 'כישלון בעדכון טלפון מתנדב')
ON CONFLICT (action) DO UPDATE
    SET hebrew_translation = EXCLUDED.hebrew_translation;

-- Petty Cash (קופה קטנה) — added with add_petty_cash_table.sql
INSERT INTO public.childsmile_app_audittranslation (action, hebrew_translation) VALUES
    ('VIEW_PETTY_CASH',               'צפייה בקופה קטנה'),
    ('VIEW_PETTY_CASH_FAILED',        'כישלון בצפייה בקופה קטנה'),
    ('CREATE_PETTY_CASH',             'הוספת הוצאת קופה קטנה'),
    ('CREATE_PETTY_CASH_FAILED',      'כישלון בהוספת הוצאת קופה קטנה'),
    ('UPDATE_PETTY_CASH',             'עדכון הוצאת קופה קטנה'),
    ('UPDATE_PETTY_CASH_FAILED',      'כישלון בעדכון הוצאת קופה קטנה'),
    ('DELETE_PETTY_CASH',             'מחיקת הוצאת קופה קטנה'),
    ('DELETE_PETTY_CASH_FAILED',      'כישלון במחיקת הוצאת קופה קטנה')
ON CONFLICT (action) DO UPDATE
    SET hebrew_translation = EXCLUDED.hebrew_translation;

-- Ongoing Expenses (הוצאות שוטפות) — added with add_ongoing_expenses_table.sql
INSERT INTO public.childsmile_app_audittranslation (action, hebrew_translation) VALUES
    ('VIEW_ONGOING_EXPENSES',            'צפייה בהוצאות שוטפות'),
    ('VIEW_ONGOING_EXPENSES_FAILED',     'כישלון בצפייה בהוצאות שוטפות'),
    ('CREATE_ONGOING_EXPENSE',           'הוספת הוצאה שוטפת'),
    ('CREATE_ONGOING_EXPENSE_FAILED',    'כישלון בהוספת הוצאה שוטפת'),
    ('UPDATE_ONGOING_EXPENSE',           'עדכון הוצאה שוטפת'),
    ('UPDATE_ONGOING_EXPENSE_FAILED',    'כישלון בעדכון הוצאה שוטפת'),
    ('DELETE_ONGOING_EXPENSE',           'מחיקת הוצאה שוטפת'),
    ('DELETE_ONGOING_EXPENSE_FAILED',    'כישלון במחיקת הוצאה שוטפת')
ON CONFLICT (action) DO UPDATE
    SET hebrew_translation = EXCLUDED.hebrew_translation;

-- Financial Aid (סיוע כספי) — added with add_financial_aid_table.sql
INSERT INTO public.childsmile_app_audittranslation (action, hebrew_translation) VALUES
    ('VIEW_FINANCIAL_AID',                 'צפייה בסיוע כספי'),
    ('VIEW_FINANCIAL_AID_FAILED',          'כישלון בצפייה בסיוע כספי'),
    ('CREATE_FINANCIAL_AID',               'הוספת רישום סיוע כספי'),
    ('CREATE_FINANCIAL_AID_FAILED',        'כישלון בהוספת רישום סיוע כספי'),
    ('UPDATE_FINANCIAL_AID',               'עדכון רישום סיוע כספי'),
    ('UPDATE_FINANCIAL_AID_FAILED',        'כישלון בעדכון רישום סיוע כספי'),
    ('DELETE_FINANCIAL_AID',               'מחיקת רישום סיוע כספי'),
    ('DELETE_FINANCIAL_AID_FAILED',        'כישלון במחיקת רישום סיוע כספי'),
    ('DELETE_FINANCIAL_AID_ATTACHMENT',        'מחיקת מסמך מסיוע כספי'),
    ('DELETE_FINANCIAL_AID_ATTACHMENT_FAILED', 'כישלון במחיקת מסמך מסיוע כספי')
ON CONFLICT (action) DO UPDATE
    SET hebrew_translation = EXCLUDED.hebrew_translation;

-- Vouchers (חלוקת תלושים) — added with add_vouchers_table.sql
INSERT INTO public.childsmile_app_audittranslation (action, hebrew_translation) VALUES
    ('VIEW_VOUCHER_DISTRIBUTIONS',            'צפייה בחלוקות תלושים'),
    ('VIEW_VOUCHER_DISTRIBUTIONS_FAILED',     'כישלון בצפייה בחלוקות תלושים'),
    ('CREATE_VOUCHER_DISTRIBUTION',           'הוספת חלוקת תלושים'),
    ('CREATE_VOUCHER_DISTRIBUTION_FAILED',    'כישלון בהוספת חלוקת תלושים'),
    ('UPDATE_VOUCHER_DISTRIBUTION',           'עדכון חלוקת תלושים'),
    ('UPDATE_VOUCHER_DISTRIBUTION_FAILED',    'כישלון בעדכון חלוקת תלושים'),
    ('DELETE_VOUCHER_DISTRIBUTION',           'מחיקת חלוקת תלושים'),
    ('DELETE_VOUCHER_DISTRIBUTION_FAILED',    'כישלון במחיקת חלוקת תלושים'),
    ('VIEW_VOUCHER_RECIPIENTS',               'צפייה במקבלי תלושים'),
    ('VIEW_VOUCHER_RECIPIENTS_FAILED',        'כישלון בצפייה במקבלי תלושים'),
    ('CREATE_VOUCHER_RECIPIENT',              'הוספת מקבל תלושים'),
    ('CREATE_VOUCHER_RECIPIENT_FAILED',       'כישלון בהוספת מקבל תלושים'),
    ('UPDATE_VOUCHER_RECIPIENT',              'עדכון פרטי מקבל תלושים'),
    ('UPDATE_VOUCHER_RECIPIENT_FAILED',       'כישלון בעדכון פרטי מקבל תלושים'),
    ('DELETE_VOUCHER_RECIPIENT',              'מחיקת מקבל תלושים'),
    ('DELETE_VOUCHER_RECIPIENT_FAILED',       'כישלון במחיקת מקבל תלושים'),
    ('SUBMIT_VOUCHER_QUESTIONNAIRE',          'שליחת שאלון חלוקת תלושים'),
    ('SUBMIT_VOUCHER_QUESTIONNAIRE_FAILED',   'כישלון בשליחת שאלון חלוקת תלושים')
ON CONFLICT (action) DO UPDATE
    SET hebrew_translation = EXCLUDED.hebrew_translation;

