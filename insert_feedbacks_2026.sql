-- Feedback import 2026 (generated for PRODUCTION).
-- Table routing by feedback type: contains 'חונכות' -> tutor_feedback, else general_v_feedback.
-- Filler = existing prod person (real match on name, else placeholder tutor 'שי שפק' id 444444444 / volunteer 'אורי ברוש' id 999999999).
-- staff_id is DERIVED from the tutor/volunteer SignedUp id via subquery, so it is always correct for the target DB.
SET client_encoding TO 'UTF8';
SET TIME ZONE 'UTC';
BEGIN;

-- excel row 2 | יום כיף בחונכות -> tutor_fun_day | TUTOR | 'נויה דוידזון' -> 'נויה דוידזון' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-01-01 19:47:31.836000', '2026-01-01 00:00:00', (SELECT staff_id FROM childsmile_app_tutors WHERE id_id = 331620385), 'הלכנו אליה הביתה והכנו עוגיות והבאנו גלידה מגולדה שהם הסכימו לתרום שיחקנו אצלה. 
היה ברוך ה כיף ממש, היא אחרי ניתוח בטן ואחרי הרבה זמן בבית חולים כשבבית חולים לא היה לה כל כך טוב וראינו את זה עליה. היום היא הייתה הרבה יותר שמחה ושיתפה פעולה.', NULL, NULL, NULL, 'tutor_fun_day', NULL, 'רוני רוזנבלום', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_tutor_feedback (feedback_id_id, tutee_name, tutor_name, tutor_id, is_it_your_tutee)
SELECT feedback_id, 'תפארת אסתר ריף', 'נויה דוידזון', 331620385, TRUE FROM ins;

-- excel row 3 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'שירה צדיק' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-01-01 21:15:36.670000', '2026-01-01 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'נפגשו בקניון שרונים בהוד השרון והלכנו לנינג׳ה סטאר ואחר כך לקפה גרג לאכול', NULL, NULL, NULL, 'general_volunteer_fun_day', NULL, 'יהודית אזולאי', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'אלון אברהם' FROM ins;

-- excel row 4 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'תהילה שרון' -> 'תהילה שרון' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-01-05 19:56:48.316000', '2026-01-05 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 220123400), 'היינו בבילון ואז במסעדת סושי היה ממש כיף והיא מאד נהנתה', 'לא', NULL, NULL, 'general_volunteer_fun_day', NULL, 'הילה פרץ', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'תהילה שרון', 220123400, 'זוהר' FROM ins;

-- excel row 5 | יום כיף בחונכות -> tutor_fun_day | TUTOR | 'יואב בן שושן' -> 'שי שפק' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-01-06 18:02:37.816000', '2026-01-05 00:00:00', (SELECT staff_id FROM childsmile_app_tutors WHERE id_id = 444444444), 'לקחנו את דביר מהבית לקניון איילון שם שיחקנו בבילון ומשם הלכנו לפלאפל שדביר מאוד אוהב והוא מאוד נהנה', 'לא ברוך השם', NULL, NULL, 'tutor_fun_day', NULL, 'עידו גבעון', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_tutor_feedback (feedback_id_id, tutee_name, tutor_name, tutor_id, is_it_your_tutee)
SELECT feedback_id, 'דביר', 'שי שפק', 444444444, FALSE FROM ins;

-- excel row 6 | ביקור בחונכות -> tutorship | TUTOR | 'אילה כהן' -> 'אילה כהן' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-01-06 18:08:40.161000', '2026-01-02 00:00:00', (SELECT staff_id FROM childsmile_app_tutors WHERE id_id = 218226363), 'באתי אליהם הביתה, שיחקנו ביחד, צבענו ציורים בחוברת.. :)', NULL, NULL, NULL, 'tutorship', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_tutor_feedback (feedback_id_id, tutee_name, tutor_name, tutor_id, is_it_your_tutee)
SELECT feedback_id, 'פאר פריוף', 'אילה כהן', 218226363, TRUE FROM ins;

-- excel row 7 | ביקור בחונכות -> tutorship | TUTOR | 'נאוה פרולינגר' -> 'נאווה פרולינגר' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-01-06 20:35:33.382000', '2026-01-06 00:00:00', (SELECT staff_id FROM childsmile_app_tutors WHERE id_id = 331671040), 'הגעתי אליו סביב 16:30 הלכנו לפארק ואכלנו שם ארוחת ערב ואז חזרנו ושיחקנו בפאזל שהבאנו לו .', NULL, NULL, NULL, 'tutorship', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_tutor_feedback (feedback_id_id, tutee_name, tutor_name, tutor_id, is_it_your_tutee)
SELECT feedback_id, 'דניאל וידנלפד', 'נאווה פרולינגר', 331671040, TRUE FROM ins;

-- excel row 8 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'דניאל ולץ' -> 'דניאל ולץ' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-01-07 11:31:24.253000', '2026-01-06 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 219640364), 'הלכנו לאכול בחלהס חלה שניצל ואז לשחק באולינג בבסר', NULL, NULL, NULL, 'general_volunteer_fun_day', NULL, 'אהוד וייס', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'דניאל ולץ', 219640364, 'מייק' FROM ins;

-- excel row 9 | יום כיף בחונכות -> tutor_fun_day | TUTOR | 'יהלי עמר' -> 'שי שפק' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-01-07 12:28:45.186000', '2025-12-17 00:00:00', (SELECT staff_id FROM childsmile_app_tutors WHERE id_id = 444444444), 'נפגשנו בבאולינג ובמשחקייה', 'לא', 'לא היה מצוין הילד נהנה מאוד', 'היה אש', 'tutor_fun_day', NULL, 'עדו עבאדי', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_tutor_feedback (feedback_id_id, tutee_name, tutor_name, tutor_id, is_it_your_tutee)
SELECT feedback_id, 'איתי', 'שי שפק', 444444444, FALSE FROM ins;

-- excel row 10 | יום כיף בחונכות -> tutor_fun_day | TUTOR | 'הלל כהן' -> 'הלל כהן' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-01-10 18:04:23.819000', '2026-01-08 00:00:00', (SELECT staff_id FROM childsmile_app_tutors WHERE id_id = 331407825), 'ניפגשתי עם אחים של שרה בבאולינג', NULL, NULL, NULL, 'tutor_fun_day', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_tutor_feedback (feedback_id_id, tutee_name, tutor_name, tutor_id, is_it_your_tutee)
SELECT feedback_id, 'שרה חלפון', 'הלל כהן', 331407825, TRUE FROM ins;

-- excel row 11 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'דניאל ולץ' -> 'דניאל ולץ' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-01-11 18:57:48.568000', '2026-01-06 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 219640364), 'הלכנו לאכול בחלהס ושיחקנו באולינג בפתח תקווה היה ממש טוב מייק ממש נהנה והיה ממש כיף', NULL, NULL, NULL, 'general_volunteer_fun_day', NULL, 'אהוד וויס', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'דניאל ולץ', 219640364, 'מייק' FROM ins;

-- excel row 12 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'אביה פרוכטר' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-01-11 19:28:00.506000', '2026-01-11 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'אספני אותה מהבית ואז הלכנו לבאולינג ולמשחקייה ואז הלכנו לאכול פימה', 'הכל היה מושלם', NULL, NULL, 'general_volunteer_fun_day', NULL, 'חנה רנדל', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'שירה קרואני' FROM ins;

-- excel row 13 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'חנה רנדל' -> 'חנה רנדל' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-01-11 19:29:14.415000', '2026-01-11 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 329800551), 'הלכנו לבאולינג ולמשחקיה ואז לאכול פיצה', 'לא', 'לא הכל טוב', NULL, 'general_volunteer_fun_day', NULL, 'אביה פרוכטר', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'חנה רנדל', 329800551, 'שירה קראווני' FROM ins;

-- excel row 14 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'אורי אריה' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-01-12 23:12:48.789000', '2026-01-12 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'הלכנו לסרט', 'היה טוב מאוד', 'לא', NULL, 'general_volunteer_fun_day', NULL, 'אלסיני', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'דביר' FROM ins;

-- excel row 15 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'אליסיני שעיה' -> 'אליסיני שעיה' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-01-13 09:34:19.036000', '2026-01-12 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 329541700), 'אספנו את דביר מהבית נסענו לסרט עם פופקורן וקולה בסינמה סיטי אחר כך הלכנו קצת לקניון לקנות דברים, היה כיף מאוד ודביר הצליח להיפתח אלינו ונהנה מאוד', NULL, NULL, NULL, 'general_volunteer_fun_day', NULL, 'אורי אריה', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אליסיני שעיה', 329541700, 'דביר' FROM ins;

-- excel row 16 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'איילת היגרי' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-01-14 17:43:07.903000', '2026-01-14 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'יצאנו לסרט בסינמה', NULL, NULL, NULL, 'general_volunteer_fun_day', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'מילה' FROM ins;

-- excel row 17 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'דניאל ולץ' -> 'דניאל ולץ' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-01-14 20:34:14.463000', '2026-01-14 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 219640364), 'הלכנו לאיי גאמפ בראשון לציון ואז הלכנו לפיצרייה ליד ואכלנו ארוחת ערב היה ממש כיף פאר ממש נהנה והשתולל', 'לא', NULL, NULL, 'general_volunteer_fun_day', NULL, 'אורי אריה', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'דניאל ולץ', 219640364, 'פאר פריוף' FROM ins;

-- excel row 18 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'עמית צוברי' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-01-15 00:00:12.941000', '2026-01-14 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'הגעתי לשמעון והלכנו ביחד לסרט במובילנד שהגענו לסרט נפגשנו עם אהוד הביאו לנו הכל בתרומה כולל אוכל וכל מה שהוא רצה היה ממש ממש כיף והיה לי חיבור טוב עם שמעון', NULL, NULL, NULL, 'general_volunteer_fun_day', NULL, 'אהוד וייס', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'שמעון' FROM ins;

-- excel row 19 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'חנה רנדל' -> 'חנה רנדל' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-01-15 15:48:06.575000', '2026-01-14 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 329800551), 'היינו בוויט פול ואז לרובן והיה מעולה', 'לא', NULL, NULL, 'general_volunteer_fun_day', NULL, 'אביה פרוכטר', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'חנה רנדל', 329800551, 'אלון' FROM ins;

-- excel row 20 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'שוהם צדוק' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-01-15 17:53:44.228000', '2026-01-15 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'הלכנו לוויט פול ומקדונלדס', 'לא', NULL, NULL, 'general_volunteer_fun_day', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'מנור כליף' FROM ins;

-- excel row 21 | ביקור בחונכות -> tutorship | TUTOR | 'אילה כהן' -> 'אילה כהן' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-01-17 18:12:41.542000', '2026-01-16 00:00:00', (SELECT staff_id FROM childsmile_app_tutors WHERE id_id = 218226363), 'הלכתי אליו הביתה, שיחקתי איתו בבית קצת ואחרי זה הלכנו לגן משחקים:)', NULL, NULL, NULL, 'tutorship', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_tutor_feedback (feedback_id_id, tutee_name, tutor_name, tutor_id, is_it_your_tutee)
SELECT feedback_id, 'פאר פריוף', 'אילה כהן', 218226363, TRUE FROM ins;

-- excel row 22 | ביקור בבתי חולים -> general_volunteer_hospital_visit | VOL | 'נויה דוידזון' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-01-19 18:47:50.309000', '2026-01-19 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'שיחקנו איתה היה ממש כיף היא הייתה במצב רוח טוב', NULL, NULL, NULL, 'general_volunteer_hospital_visit', 'שניידר פתח תקווה', 'רוני רוזנבלום', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'תפארת אסתר ריף אשפוז יום אונקולוגיה שניידר' FROM ins;

-- excel row 23 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'יהודית אזולאי' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-01-21 20:50:40.581000', '2026-01-21 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'הלכנו לאכול המבורגר ואחר כך לאכול גלידה ולעשות מתקן', 'לא', NULL, NULL, 'general_volunteer_fun_day', NULL, 'שירה צדיק', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'ליאור' FROM ins;

-- excel row 24 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'אווה גז' -> 'אווה מרים גז' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-01-22 19:22:07.927000', '2026-01-22 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 341289536), 'יצאנו לאכול גלידה בערים בכפר סבא באתי לאסוף אותו ואת אחים שלו', 'לא רק עייפות מהצד של הילד שהקשה עליו לעלות ולרדת מדרגות בחניה', NULL, 'תודה רבה כל הזכות להיות חלק 🫶🏽', 'general_volunteer_fun_day', NULL, 'נויה', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אווה מרים גז', 341289536, 'ניתאי' FROM ins;

-- excel row 25 | ביקור בחונכות -> tutorship | TUTOR | 'נאוה פרולינגר' -> 'נאווה פרולינגר' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-01-22 21:04:07.962000', '2026-01-22 00:00:00', (SELECT staff_id FROM childsmile_app_tutors WHERE id_id = 331671040), 'אספתי אותו מהגן והלכנו לפארק', NULL, NULL, NULL, 'tutorship', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_tutor_feedback (feedback_id_id, tutee_name, tutor_name, tutor_id, is_it_your_tutee)
SELECT feedback_id, 'דניאל וינדפלד', 'נאווה פרולינגר', 331671040, TRUE FROM ins;

-- excel row 26 | ביקור בבתי חולים -> general_volunteer_hospital_visit | VOL | 'איתי פרוידמן' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-01-25 15:16:49.043000', '2026-01-22 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'נפגשנו בבית חולים הוא היה באשפוז יום דיברנו ואז הלכנו לאכול צהריים', NULL, NULL, NULL, 'general_volunteer_hospital_visit', 'שניידר פתח תקווה', 'אהוד וייס', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'נועם גבאי בשניידר אונקולוגית נראלי אבל אחרי זה הלכנו לצהריים.' FROM ins;

-- excel row 27 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'מעיין הירשפלד' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-01-26 07:04:38.011000', '2026-01-21 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'אכלנו בבורגרס בר עם אחיה רותם', NULL, NULL, NULL, 'general_volunteer_fun_day', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'נויה בלוקה' FROM ins;

-- excel row 28 | יום כיף בחונכות -> tutor_fun_day | TUTOR | 'נועה שרגוביץ' -> 'נועה שרגוביץ' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-01-27 17:42:29.688000', '2026-01-23 00:00:00', (SELECT staff_id FROM childsmile_app_tutors WHERE id_id = 218534329), 'נפגשנו בנווה זמר ואכלנו בbread station', NULL, NULL, NULL, 'tutor_fun_day', NULL, 'אודליה פלדמן', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_tutor_feedback (feedback_id_id, tutee_name, tutor_name, tutor_id, is_it_your_tutee)
SELECT feedback_id, 'אדל ברומברג', 'נועה שרגוביץ', 218534329, TRUE FROM ins;

-- excel row 29 | יום כיף בחונכות -> tutor_fun_day | TUTOR | 'אודליה פלדמן' -> 'אודליה פלדמן' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-01-27 17:43:17.435000', '2026-01-26 00:00:00', (SELECT staff_id FROM childsmile_app_tutors WHERE id_id = 334330073), 'אדל באה אליי והכנו עוגה וראינו טלוויזיה', NULL, NULL, NULL, 'tutor_fun_day', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_tutor_feedback (feedback_id_id, tutee_name, tutor_name, tutor_id, is_it_your_tutee)
SELECT feedback_id, 'אדל ברומברג', 'אודליה פלדמן', 334330073, TRUE FROM ins;

-- excel row 30 | יום כיף בחונכות -> tutor_fun_day | TUTOR | 'מאי מוסקל' -> 'מאי מוסקל' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-01-27 18:47:09.805000', '2026-01-27 00:00:00', (SELECT staff_id FROM childsmile_app_tutors WHERE id_id = 327722526), 'הלכנו לפליי פארק בקניון רננים עשינו את המשחקים שם והטרמפולינות ואז עשינו עוד סיבוב בקניון היה ממש כיף היא ממש נהנתה', 'לא', NULL, NULL, 'tutor_fun_day', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_tutor_feedback (feedback_id_id, tutee_name, tutor_name, tutor_id, is_it_your_tutee)
SELECT feedback_id, 'אדל ברומברג', 'מאי מוסקל', 327722526, FALSE FROM ins;

-- excel row 31 | ביקור בבתי חולים -> general_volunteer_hospital_visit | VOL | 'הלל כהן' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-01-28 15:40:54.990000', '2026-01-28 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'דיברנו ושיחקנו', NULL, NULL, NULL, 'general_volunteer_hospital_visit', 'שניידר פתח תקווה', NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'שרה חלפון' FROM ins;

-- excel row 32 | ביקור בחונכות -> tutorship | TUTOR | 'שירה רוקח' -> 'שירה רוקח' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-01-29 19:14:54.338000', '2026-01-29 00:00:00', (SELECT staff_id FROM childsmile_app_tutors WHERE id_id = 219214988), 'נפגשנו אצלו בבית שיחקו משחקים ואז יצאנו לגינה ושיחקנו שם קצת ואז חזרנו הביתה לשחק', 'לא', NULL, NULL, 'tutorship', NULL, 'עדי רוקח', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_tutor_feedback (feedback_id_id, tutee_name, tutor_name, tutor_id, is_it_your_tutee)
SELECT feedback_id, 'יאיר ישראל עמר', 'שירה רוקח', 219214988, TRUE FROM ins;

-- excel row 33 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'שירה צדיק' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-01-31 18:43:22.755000', '2026-01-29 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), '‏הלכנו לחדר בריחה עם ליאור ואח שלה ואחר כך הלכנו לאכול קרפ', 'לא', NULL, NULL, 'general_volunteer_fun_day', NULL, 'יהודית', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'ליאור' FROM ins;

-- excel row 34 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'אביה פרוכטר' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-02-03 17:25:34.431000', '2026-02-02 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'היינו בבאולינג ואז הלכנו לאכול פיצה', 'לא', NULL, NULL, 'general_volunteer_fun_day', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'שירה קוראני' FROM ins;

-- excel row 35 | ביקור בחונכות -> tutorship | TUTOR | 'יעל תנעמי' -> 'יעל תנעמי' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-02-03 19:04:44.796000', '2026-02-03 00:00:00', (SELECT staff_id FROM childsmile_app_tutors WHERE id_id = 331545731), 'הייתה אצלה בבית צבענו ורקדנו והיה ממש כיף', 'לא', NULL, NULL, 'tutorship', NULL, 'שירה קלפוס', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_tutor_feedback (feedback_id_id, tutee_name, tutor_name, tutor_id, is_it_your_tutee)
SELECT feedback_id, 'עופרי זרח', 'יעל תנעמי', 331545731, TRUE FROM ins;

-- excel row 36 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'נועה זוהר' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-02-04 18:32:59.373000', '2016-01-28 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'נסענו למסעדת לוצנה במודיעין', 'לא ב"ה', NULL, NULL, 'general_volunteer_fun_day', NULL, 'שירה זוהר', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'פאר פריוף' FROM ins;

-- excel row 37 | ביקור בית כללי -> general_house_visit | VOL | 'שילת אפל' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-02-09 09:32:26.469000', '2026-02-08 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'בפארק שעשועים', 'לא', NULL, NULL, 'general_house_visit', NULL, 'שוהם פלזנר', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'מנור' FROM ins;

-- excel row 38 | יום כיף בחונכות -> tutor_fun_day | TUTOR | 'מאי מוסקל' -> 'מאי מוסקל' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-02-10 13:13:55.081000', '2026-02-09 00:00:00', (SELECT staff_id FROM childsmile_app_tutors WHERE id_id = 327722526), 'באתי לאסוף אותה והלכנו לסרט בסינמה סיטי בראשון', NULL, NULL, NULL, 'tutor_fun_day', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_tutor_feedback (feedback_id_id, tutee_name, tutor_name, tutor_id, is_it_your_tutee)
SELECT feedback_id, 'אנאל בנימין', 'מאי מוסקל', 327722526, TRUE FROM ins;

-- excel row 39 | ביקור בחונכות -> tutorship | TUTOR | 'יעל תנעמי' -> 'יעל תנעמי' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-02-11 18:44:48.461000', '2026-02-11 00:00:00', (SELECT staff_id FROM childsmile_app_tutors WHERE id_id = 331545731), 'היינו בבית שלה בנינו ביחד לגו', 'לא', NULL, NULL, 'tutorship', NULL, 'שירה קלפוס', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_tutor_feedback (feedback_id_id, tutee_name, tutor_name, tutor_id, is_it_your_tutee)
SELECT feedback_id, 'עופרי זרח', 'יעל תנעמי', 331545731, TRUE FROM ins;

-- excel row 40 | ביקור בית כללי -> general_house_visit | VOL | 'שירה צדיק' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-02-14 19:25:16.378000', '2026-02-12 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), '‏הלכנו למסעדה בכפר סבא ואז הלכנו לביקור בית', NULL, NULL, NULL, 'general_house_visit', NULL, 'יהודית', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'ליאור' FROM ins;

-- excel row 41 | ביקור בחונכות -> tutorship | TUTOR | 'שירה רוקח' -> 'שירה רוקח' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-02-17 16:20:37.148000', '2026-02-12 00:00:00', (SELECT staff_id FROM childsmile_app_tutors WHERE id_id = 219214988), 'שיחקנו קצת בבית ואז הלכנו לגינה ושיחקנו בכדור ובמגלשות ואז חזרנו הביתה ושיחקנו קצת', NULL, NULL, NULL, 'tutorship', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_tutor_feedback (feedback_id_id, tutee_name, tutor_name, tutor_id, is_it_your_tutee)
SELECT feedback_id, 'יאיר ישראל עמר', 'שירה רוקח', 219214988, TRUE FROM ins;

-- excel row 42 | ביקור בבתי חולים -> general_volunteer_hospital_visit | VOL | 'הלל כהן' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-02-26 13:36:30.650000', '2026-02-25 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'היה טוב ממש המשפחות שמחו!', NULL, NULL, NULL, 'general_volunteer_hospital_visit', 'שניידר פתח תקווה', NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'הייתי בבית חולים שיינדר וחלקתי פיצות' FROM ins;

-- excel row 43 | ביקור בבתי חולים -> general_volunteer_hospital_visit | VOL | 'דניאל ולץ' -> 'דניאל ולץ' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-02-26 22:07:04.781000', '2026-02-26 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 219640364), 'הבאנו אוכל וחילקנו למחלקה', 'לא', NULL, NULL, 'general_volunteer_hospital_visit', 'שניידר פתח תקווה', 'נהוראי קראוני, נועם צוהר, נאוה פרולינגהר', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'דניאל ולץ', 219640364, 'ביקור במחלקה בשניידר' FROM ins;

-- excel row 44 | ביקור בבתי חולים -> general_volunteer_hospital_visit | VOL | 'נהוראי קרואני' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-02-27 01:36:47.196000', '2026-02-26 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'הלכנו לחלק אוכל וקצת לעשות שמח לכבוד פורים', 'לא', NULL, NULL, 'general_volunteer_hospital_visit', 'שניידר פתח תקווה', NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'ביקור במחלקה בשניידר' FROM ins;

-- excel row 45 | ביקור בחונכות -> tutorship | TUTOR | 'שירה רוקח' -> 'שירה רוקח' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-03 20:03:07.609000', '2026-03-03 00:00:00', (SELECT staff_id FROM childsmile_app_tutors WHERE id_id = 219214988), 'הגענו אליו קישטנו לו קצת את החדר, שיחקנו טיפה, ואז ראינו סדרות בטאבלט והוא נרדם', 'לא', NULL, NULL, 'tutorship', NULL, 'עדי רוקח', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_tutor_feedback (feedback_id_id, tutee_name, tutor_name, tutor_id, is_it_your_tutee)
SELECT feedback_id, 'יאיר ישראל עמר- ביקור בבית חולים בשניידר. היינו איתו כדי שההורים יוכלו לצאת יחד עם הילדים לפורים', 'שירה רוקח', 219214988, TRUE FROM ins;

-- excel row 46 | ביקור בית כללי -> general_house_visit | VOL | 'יעל תנעמי' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-04 22:02:56.906000', '2026-03-03 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'הבאנו לה משלוח מנות ושיחקנו', 'לא', NULL, NULL, 'general_house_visit', NULL, 'שירה קלפוס', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'עופרי זרח' FROM ins;

-- excel row 47 | ביקור בית כללי -> general_house_visit | VOL | 'שוהם צדוק' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-04 22:47:52.001000', '2026-03-03 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'שיחקתי איתם טיפה בגינה', 'הייתה אזעקה וחזרנו', NULL, NULL, 'general_house_visit', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'מנור כליף' FROM ins;

-- excel row 48 | ביקור בבתי חולים -> general_volunteer_hospital_visit | VOL | 'אביה פרוכטר' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-06 10:30:50.935000', '2026-03-05 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'הלכנו אליה לבית לולים הבאנו לה פיצה וישבנו ודיברנו איתה ושיחקנו איתה כי היה לה משעמם וזה ממש העלה לה חיוך על הפנים', NULL, NULL, NULL, 'general_volunteer_hospital_visit', 'שניידר פתח תקווה', 'עדי שחם', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'אלירז צור בבית חולים שניידר ביקור במחלקה' FROM ins;

-- excel row 49 | ביקור בבתי חולים -> general_volunteer_hospital_visit | VOL | 'דניאל ולץ' -> 'דניאל ולץ' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-06 13:31:33.173000', '2026-03-06 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 219640364), 'באנו הבאנו לה גולדה דיברנו איתה שיחקנו נפגשנו בשניידר היה ממש טוב נראה שזה עשה לה מאוד טוב וחיוך על הפנים', 'לא', NULL, NULL, 'general_volunteer_hospital_visit', 'שניידר פתח תקווה', 'איתי פרוידמן', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'דניאל ולץ', 219640364, 'אלירז צור שניידר' FROM ins;

-- excel row 50 | ביקור בבתי חולים -> general_volunteer_hospital_visit | VOL | 'איתי פרוידמן' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-06 14:25:07.220000', '2026-03-06 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'דיברנו איתה היה מצחיק וטוב', NULL, NULL, NULL, 'general_volunteer_hospital_visit', 'שניידר פתח תקווה', 'דניאל ולץ', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'אלירז צור באונקולוגית בשניידר' FROM ins;

-- excel row 51 | ביקור בבתי חולים -> general_volunteer_hospital_visit | VOL | 'עדי שחם' -> 'עדי שחם' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-07 19:26:05.234000', '2026-03-05 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 333569317), 'אלירז הייתה אחריי ניתוח, נפגשנו במחלקה, התרמנו פיצה ואכלנו איתה בבית חולים ביחד עם האמא גם, היה ממש נחמד, אלירז הייתה מאוד מבואסת מהמצב שהיא ושמחנו שהצלחנו להעלות לה קצת חיוכים :)', NULL, 'היא הולכת להיות שם הרבה בחודש הקרוב והיא וההורים ממש ישמחו עם מתנדבים יבואו אליה הרבה!', NULL, 'general_volunteer_hospital_visit', 'שניידר פתח תקווה', 'אביה פרוכטר', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'עדי שחם', 333569317, 'אלירז צור- ביקור במחלקה, שניידר' FROM ins;

-- excel row 52 | ביקור בבתי חולים -> general_volunteer_hospital_visit | VOL | 'איתי פרוידמן' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-07 19:43:49.773000', '2026-03-07 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'דיברנו היה כיף מצחיק וטוב', NULL, NULL, NULL, 'general_volunteer_hospital_visit', 'שניידר פתח תקווה', NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'אלירז צור אונקולוגית שניידר' FROM ins;

-- excel row 53 | יום כיף בחונכות -> tutor_fun_day | TUTOR | 'נאוה פרולינגר' -> 'נאווה פרולינגר' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-07 20:14:17.120000', '2026-03-05 00:00:00', (SELECT staff_id FROM childsmile_app_tutors WHERE id_id = 331671040), 'יצאנו לפארק לכמה שעות ואז שיחקנו בבית', NULL, NULL, NULL, 'tutor_fun_day', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_tutor_feedback (feedback_id_id, tutee_name, tutor_name, tutor_id, is_it_your_tutee)
SELECT feedback_id, 'דניאל וידנפלד', 'נאווה פרולינגר', 331671040, TRUE FROM ins;

-- excel row 54 | ביקור בבתי חולים -> general_volunteer_hospital_visit | VOL | 'דניאל ולץ' -> 'דניאל ולץ' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-08 15:48:35.512000', '2026-03-08 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 219640364), 'באתי להגיד שלום קצת לדבר לשבת עם כמה חניכים ולהכניס עוד משפחות לעמותה', 'לא', NULL, NULL, 'general_volunteer_hospital_visit', 'שניידר פתח תקווה', NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'דניאל ולץ', 219640364, 'ביקרתי את אדל ברומברג וביקור במחלקה בשניידר' FROM ins;

-- excel row 55 | ביקור בבתי חולים -> general_volunteer_hospital_visit | VOL | 'לינוי בבזרה' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-08 16:23:54.374000', '2026-03-08 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'היינו במחלקה שיחקנו ודיברנו עם הילדים', NULL, NULL, NULL, 'general_volunteer_hospital_visit', 'שניידר פתח תקווה', 'שירה שרון', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'ביקור במחלקה בשניידר' FROM ins;

-- excel row 56 | ביקור בית כללי -> general_house_visit | VOL | 'עמית צוברי' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-08 19:05:41.282000', '2026-03-08 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'בהתחלה הלכנו אליו ושיחקנו פיפא אחר כך הלכנו ביחד לפיצה היה ממש כיף ואדיר נהנה מאד', NULL, NULL, NULL, 'general_house_visit', NULL, 'יאיר יצחק לוי', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'אדיר שמואל' FROM ins;

-- excel row 57 | ביקור בית כללי -> general_house_visit | VOL | 'איתי פרוידמן' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-08 21:47:28.242000', '2026-03-08 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'שיחקנו כדורגל הרבה ואז עלינו אליו הביתה שיחקנו פיפא ואכלנו פיצה היה ממש כיף וטוב', NULL, NULL, NULL, 'general_house_visit', NULL, 'דניאל ולץ, איתי רייך', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'אושר בוגנים' FROM ins;

-- excel row 58 | ביקור בית כללי -> general_house_visit | VOL | 'דניאל ולץ' -> 'דניאל ולץ' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-08 22:44:26.403000', '2026-03-08 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 219640364), 'באנו אליו שיחקנו איתו כדורגל קצת פיפא אכלנו וואלה היה ממש כיף הוא נהנה נפתח קצת אלינו נפגשנו בבית שלו וירדנו למגרש ליד הבית לשחק', 'לא', NULL, 'רייך שילם זה נסגר איתו', 'general_house_visit', NULL, 'איתי פרוידמן, איתי רייך', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'דניאל ולץ', 219640364, 'אושר בוגנים' FROM ins;

-- excel row 59 | ביקור בית כללי -> general_house_visit | VOL | 'אביה פרוכטר' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-09 13:02:42.730000', '2026-03-09 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'נפגשנו בבית שלו שיחקנו בכדורגל ובמשחקים ועשינו כדורי שוקולד', 'לא', NULL, NULL, 'general_house_visit', NULL, 'אגם מלכה', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'דניאל וידנפלד' FROM ins;

-- excel row 60 | ביקור בית כללי -> general_house_visit | VOL | 'תהל ברנע' -> 'תהל ברנע' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-09 14:14:05.308000', '2026-03-09 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 219638632), 'שיחקנו והבאנו לו משחק של בניה', 'לא', 'באנו פעם ראשונה והיה ממש טוב', NULL, 'general_house_visit', NULL, 'לינדה טוויל', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'תהל ברנע', 219638632, 'יהונתן אליגאל' FROM ins;

-- excel row 61 | ביקור בית כללי -> general_house_visit | VOL | 'לינדה טויל' -> 'לינדה טויל' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-09 14:14:44.026000', '2026-03-09 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 342813631), 'שיחקנו, הבאנו לו משחק של בנייה כזה והוא שיחק 
עשינו איתו פאזלים שהאמא ביקשה שנעשה והייתה לו אחות שגם איתה היינו', 'לא', 'זה היה פעם ראשונה שלי והיה לי ממש כיף וטוב פשוט יש דברים שלא ידענו על ההסעות ולפעם הבא נדע', NULL, 'general_house_visit', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'לינדה טויל', 342813631, 'יהונתן אליגאל' FROM ins;

-- excel row 62 | ביקור בית כללי -> general_house_visit | VOL | 'רונילי אריאל' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-09 18:39:12.976000', '2026-03-09 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'צבענו עם גואש הכנו שייקים ושיחקנו נפגשנו בבית שלה במודיעין והיה מאוד כיף', NULL, NULL, NULL, 'general_house_visit', NULL, 'חנה רנדל', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'טליה רות צדקיהו' FROM ins;

-- excel row 63 | ביקור בית כללי -> general_house_visit | VOL | 'רננה בן ציון' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-09 18:44:51.564000', '2026-03-09 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'הכנו כדורי שוקולד בבית שלהם היה מושלם', 'לא', NULL, 'אין צורך בהחזר', 'general_house_visit', NULL, 'שירה שרון', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'מנור כליף' FROM ins;

-- excel row 64 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'נהוראי קרואני' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-09 21:07:45.624000', '2026-03-09 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'הלכנו למקום של כדורגל ושיחקנו והיה מטורף לכולם ואחרי זה הלכנו לאכול', 'לא הכל היה פגז', NULL, NULL, 'general_volunteer_fun_day', NULL, 'אורי אריה, יובל ניזרי', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'אושר, מנחם צח, אורי, שמעון( לא זוכר את השמות משפחה שלהם)' FROM ins;

-- excel row 65 | ביקור בית כללי -> general_house_visit | VOL | 'חנה רנדל' -> 'חנה רנדל' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-09 21:11:21.673000', '2026-03-09 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 329800551), 'צבענו בגואש הכנו שייק וסתם שיחקנו אחרי והיה ממש כיף היינו בבית של החניכה במודיעין', NULL, NULL, NULL, 'general_house_visit', NULL, 'רונילי אריאל', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'חנה רנדל', 329800551, 'טליה רות צדקיהו' FROM ins;

-- excel row 66 | ביקור בית כללי -> general_house_visit | VOL | 'עדי שחם' -> 'עדי שחם' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-09 21:31:05.164000', '2026-03-09 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 333569317), 'נפגשנו בבית, שיחקנו משחקי קופסא, אכלנו גלידה וגם דיברנו כולנו ביחד עם האמא, שמענו עוד מהסיפור', 'לא ברוך השם', 'הילדים ממש משועממים אז האמא ממש שמחה שהמתנדבים ממלאים לה את השבוע, הם עוד מעט מתחילים אישפוז אחרון של שבוע והאמא אמרה שאם יש איכשהו אפשרות ליצור קשר עם השחקנים של הסדרה כראמל הילדה תהיה בעננים', NULL, 'general_house_visit', NULL, 'אביה פרוכטר', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'עדי שחם', 333569317, 'שירה קרואני' FROM ins;

-- excel row 67 | יום כיף בחונכות -> tutor_fun_day | TUTOR | 'יובל נזרי' -> 'יובל נזרי' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-09 22:56:01.289000', '2026-03-09 00:00:00', (SELECT staff_id FROM childsmile_app_tutors WHERE id_id = 334349255), 'היינו במתחם כדורגל של מאור בוזגלו בראשלצ ואז אכלנו במסעדת אמילי בשרים ליד, אספנו אותם מהבתים', 'לא', 'היה חסר נהגים אורי היה צריך לעשות נגלות', NULL, 'tutor_fun_day', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_tutor_feedback (feedback_id_id, tutee_name, tutor_name, tutor_id, is_it_your_tutee)
SELECT feedback_id, 'שמעון טימסית, מנחם צח, אושר, אורי', 'יובל נזרי', 334349255, TRUE FROM ins;

-- excel row 68 | ביקור בית כללי -> general_house_visit | VOL | 'אביה פרוכטר' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-10 02:36:44.847000', '2026-03-09 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'היינו בבית שלהם שיחקנו בפאזלים אכלנו גלידה', NULL, NULL, NULL, 'general_house_visit', NULL, 'עדי שחם', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'שירה קרוואני' FROM ins;

-- excel row 69 | ביקור בחונכות -> tutorship | TUTOR | 'שקד ישועה' -> 'שקד ישועה' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-10 14:32:17.417000', '2026-03-10 00:00:00', (SELECT staff_id FROM childsmile_app_tutors WHERE id_id = 218554780), 'יצאנו לפארק קנינו משהו ושיחקנו בבית', 'לא', NULL, NULL, 'tutorship', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_tutor_feedback (feedback_id_id, tutee_name, tutor_name, tutor_id, is_it_your_tutee)
SELECT feedback_id, 'דניאל', 'שקד ישועה', 218554780, TRUE FROM ins;

-- excel row 70 | ביקור בית כללי -> general_house_visit | VOL | 'אביה פרוכטר' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-10 15:53:27.909000', '2026-03-10 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'זה היה בבית שלה עשינו צמידים שיחקנו משחקי קופסה והבאנו לה מתנות', NULL, NULL, NULL, 'general_house_visit', NULL, 'חנה רנדל', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'רבקה' FROM ins;

-- excel row 71 | ביקור בחונכות -> tutorship | TUTOR | 'נויה דוידזון' -> 'נויה דוידזון' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-10 18:33:50.956000', '2026-03-10 00:00:00', (SELECT staff_id FROM childsmile_app_tutors WHERE id_id = 331620385), 'שיחקנו איתה', NULL, NULL, NULL, 'tutorship', NULL, 'רוני רוזנבלום', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_tutor_feedback (feedback_id_id, tutee_name, tutor_name, tutor_id, is_it_your_tutee)
SELECT feedback_id, 'תפארת אסתר ריף', 'נויה דוידזון', 331620385, TRUE FROM ins;

-- excel row 72 | ביקור בית כללי -> general_house_visit | VOL | 'ניצן רוט' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-10 20:06:06.098000', '2026-03-10 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'זה היה בבית שלו,ושיחקנו איתו ועם אחותח', NULL, NULL, NULL, 'general_house_visit', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'יהונתן אליגל' FROM ins;

-- excel row 73 | ביקור בחונכות -> tutorship | TUTOR | 'נועם יאגודייב' -> 'נועם יאגודייב' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-10 20:07:10.723000', '2026-03-10 00:00:00', (SELECT staff_id FROM childsmile_app_tutors WHERE id_id = 334666666), 'ביקור בבית בגלל המלחמה, שיחקנו ועשינו כדורי שוקולד', 'לא', 'לא, רק שהילד ביקש יותר ימי כיף וביקורים', 'שילמתי 14 שקל על חבילת ביקסוויטים', 'tutorship', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_tutor_feedback (feedback_id_id, tutee_name, tutor_name, tutor_id, is_it_your_tutee)
SELECT feedback_id, 'מנחם צח', 'נועם יאגודייב', 334666666, TRUE FROM ins;

-- excel row 74 | ביקור בית כללי -> general_house_visit | VOL | 'איתי פרוידמן' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-10 23:35:29.251000', '2026-03-10 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'שיחקנו כדורגל כדוסל גם עם אח שלו ואז עלינו לאכול וקצת פיפא (גם פגשנו שם עוד מישהו שבא לא מטעם עמותה וכזה נראלי הוא נצטרף לעמותה)', NULL, NULL, NULL, 'general_house_visit', NULL, 'איתי רייך, דניאל ולץ', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'אושר בוגנים' FROM ins;

-- excel row 75 | ביקור בית כללי -> general_house_visit | VOL | 'חנה רנדל' -> 'חנה רנדל' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-11 00:03:45.931000', '2026-03-10 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 329800551), 'באנו אליה והבאנו ערכה של צמידים אז הכנו ביחד והיה ממש כיף', NULL, NULL, NULL, 'general_house_visit', NULL, 'אביה פרוכטר', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'חנה רנדל', 329800551, 'רבקה יצחק' FROM ins;

-- excel row 76 | ביקור בית כללי -> general_house_visit | VOL | 'דניאל ולץ' -> 'דניאל ולץ' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-11 02:02:42.294000', '2026-03-10 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 219640364), 'באנו אליו שיחקנו כדורגל כדורסל פיפא אכלנו היה ממש כיף שיחקנו גם עם אח שלו שתיהם ממש נהנו נפגשנו אצלו בבית וירדנו למגרש קרוב לבית', 'לא', NULL, NULL, 'general_house_visit', NULL, 'איתי פרוידמן, איתי רייך', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'דניאל ולץ', 219640364, 'אושר בוגנים' FROM ins;

-- excel row 77 | ביקור בית כללי -> general_house_visit | VOL | 'לינדה טוויל' -> 'לינדה טויל' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-11 15:04:39.099000', '2026-03-11 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 342813631), 'זה פעם שנייה שלי איתם היינו שעתיים, הפעם שיחתי איתו עם המתנה שהבאנו לו (כאלה סביבונים) ופשוט ישבנו על השטיח ושיחקנו. עם אחותו עשינו יצירה שהבאנו לה והיא ממש נהנתה', NULL, NULL, NULL, 'general_house_visit', NULL, 'תמרה שטיבל, תהילה ברוש', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'לינדה טויל', 342813631, 'יהונתן אליגאל' FROM ins;

-- excel row 78 | ביקור בית כללי -> general_house_visit | VOL | 'שירה צדיק' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-11 16:42:09.285000', '2026-03-11 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'נפגשנו בבית ושיחקנו במשחקים', NULL, NULL, NULL, 'general_house_visit', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'מנור כליף' FROM ins;

-- excel row 79 | ביקור בית כללי -> general_house_visit | VOL | 'תהילה שרון' -> 'תהילה שרון' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-11 16:42:18.497000', '2026-03-11 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 220123400), 'ביקרנו אצלה בבית שיחקנו איתה במשחקים', 'לא', NULL, NULL, 'general_house_visit', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'תהילה שרון', 220123400, 'מנור כליף' FROM ins;

-- excel row 80 | ביקור בית כללי -> general_house_visit | VOL | 'שירה צדיק' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-11 16:43:49.867000', '2026-03-11 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'נפגשנו בבית ושיחקנו', NULL, NULL, NULL, 'general_house_visit', NULL, 'תהילה שרון', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'נועם גבאי' FROM ins;

-- excel row 81 | ביקור בית כללי -> general_house_visit | VOL | 'תהל ברנע' -> 'תהל ברנע' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-11 17:17:23.781000', '2026-03-11 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 219638632), 'עם שליו ואח שלו היינו בגינה , עם טליה בבית הכנו כדורי שוקולד ועם המשפחה השלישית הלכנו לשחק כדורגל', 'לא', NULL, NULL, 'general_house_visit', NULL, 'אביה פרוכטר, רונילי אריאל, דניאל', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'תהל ברנע', 219638632, 'שליו, טליה ועוד משפחה' FROM ins;

-- excel row 82 | ביקור בית כללי -> general_house_visit | VOL | 'שירה צדיק' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-11 18:18:25.055000', '2026-03-11 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'נפגשנו בבית ושיחקנו', NULL, NULL, NULL, 'general_house_visit', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'אלון' FROM ins;

-- excel row 83 | ביקור בית כללי -> general_house_visit | VOL | 'אביגיל שועי' -> 'אביגיל שועי' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-11 18:27:34.810000', '2026-03-11 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 334431251), 'היינו בבית שלה ושיחקנו משחקים ועשינו יצירות ביחד והיה ממש כיף', 'לא', NULL, 'אם המשפחה תצטרך עוד משהו  או עזרה אנחנו בשמחה נעזור תמיד 🙏🏻', 'general_house_visit', NULL, 'לינדה טוויל', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אביגיל שועי', 334431251, 'ריף' FROM ins;

-- excel row 84 | ביקור בית כללי -> general_house_visit | VOL | 'לינדה טוויל' -> 'לינדה טויל' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-11 18:27:55.010000', '2026-03-11 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 342813631), 'נפגשנו בבית שלהם, הגענו והבאנו לה ממתק שהבאנו לה והיא מאוד שמחה, אחרי זה הבאנו לה הפתעה של יצירה ועשינו ביחד היא ממש אהבה, אחרי זה ציירנו ושיחקנו מלא שמחפשים שהיה לה שם , נהנו מאוד', 'לא', 'אני אשמח לבוא אליהם יותר דיברנו עם האמא ואמרנו לה שמתי שהיא צריכה שתגיד לנו , ממש אהבנו  וגם ריף ביקשה שנבוא שוב', NULL, 'general_house_visit', NULL, 'אביגיל שועי', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'לינדה טויל', 342813631, 'ריף' FROM ins;

-- excel row 85 | ביקור בית כללי -> general_house_visit | VOL | 'דניאל ולץ' -> 'דניאל ולץ' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-11 18:40:44.662000', '2026-03-11 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 219640364), 'עשינו יום מרוכז של ביקורי בית אצל שלושה חניכים היה ממש כיף שיחקנו איתם והבאנו להם מתנות מהמחסן הם ממש נהנו אצל כל אחד באנו לבית שלו ושיחקנו בגינה קרובה', 'לא', NULL, NULL, 'general_house_visit', NULL, 'רונילי אריאל, אביה פרוכטר, תהל ברנע, ראובן', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'דניאל ולץ', 219640364, 'שליו גולמן טליה רות ומיכל שוויצר' FROM ins;

-- excel row 86 | ביקור בית כללי -> general_house_visit | VOL | 'רונילי אריאל' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-11 18:52:49.870000', '2026-03-11 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'טליה בבית הכנו כדורי שוקולד שוויצר בגינה שיחקנו כדורגל שלו בגינה שיחקנו איתו ועם אח שלו ליאל', 'לא', NULL, NULL, 'general_house_visit', NULL, 'דניאל ולץ, תהל ברנע, אביה פרוכטר', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'שוויצר שלו טליה רות' FROM ins;

-- excel row 87 | ביקור בית כללי -> general_house_visit | VOL | 'יאיר קריגל' -> 'יאיר קריגל' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-11 18:56:01.822000', '2026-03-11 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 332990191), 'באנו אליו הביתה שיחקנו ואכלנו גלידה', NULL, NULL, NULL, 'general_house_visit', NULL, 'אהוד וייס', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'יאיר קריגל', 332990191, 'דביר פסקל' FROM ins;

-- excel row 88 | ביקור בית כללי -> general_house_visit | VOL | 'יאיר קריגל' -> 'יאיר קריגל' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-11 18:59:19.796000', '2026-03-11 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 332990191), 'נפגשנו אצלו בבית שיחקנו פיפא מחבואים משחק הצבעים אכלנו גלידה עשינו איתו כיף אש', NULL, NULL, NULL, 'general_house_visit', NULL, 'אהוד וייס', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'יאיר קריגל', 332990191, 'דביר פסקל' FROM ins;

-- excel row 89 | ביקור בית כללי -> general_house_visit | VOL | 'טליה דוידוביץ' -> 'טליה דוידוביץ' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-11 19:13:12.841000', '2026-03-11 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 333123123), 'הלכנו לפארק, אכלנו גלידה, שיחקנו איתה וכו', 'לא והיא ממש מתוקה!', NULL, 'נשמח לבוא אליה עוד🙃', 'general_house_visit', NULL, 'טליה וינוגרד וטליה הורביץ', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'טליה דוידוביץ', 333123123, 'רבקה יצחק' FROM ins;

-- excel row 90 | ביקור בית כללי -> general_house_visit | VOL | 'אביה פרוכטר' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-11 19:33:00.413000', '2026-03-11 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'היינו איתם בגינה', NULL, 'לעשות עוד ימים כאלה שוב שהולכים לבקר כמה משפחות אבל לקחת שתי מתנדבים ונהג שכולם יוכלט לעשות', NULL, 'general_house_visit', NULL, 'רונילי אריאל, תהל ברנע, דניאל וולץ, ראובן', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'שליו והיינו גם אצל טליה ומשפחת שוויצר' FROM ins;

-- excel row 91 | ביקור בית כללי -> general_house_visit | VOL | 'חנה רנדל' -> 'חנה רנדל' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-11 20:08:43.713000', '2026-03-11 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 329800551), 'הלכנו לאלון ושיחקנו קליעה למטרה ולגו והיה מעולה', NULL, NULL, NULL, 'general_house_visit', NULL, 'שירה צדיק, תהילה', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'חנה רנדל', 329800551, 'אלון גליק' FROM ins;

-- excel row 92 | ביקור בבתי חולים -> general_volunteer_hospital_visit | VOL | 'עדי שחם' -> 'עדי שחם' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-11 20:42:05.601000', '2026-03-11 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 333569317), 'באנו לבקר אותו בבית חולים ורוב הזמן הוא ישן, כשהוא התעורר שיחקנו איתו במגנטים שהבאנו לו מהמחסן', NULL, NULL, NULL, 'general_volunteer_hospital_visit', 'שניידר פתח תקווה', 'לינוי בבזרה', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'עדי שחם', 333569317, 'אור רפאל דהאן' FROM ins;

-- excel row 93 | ביקור בית כללי -> general_house_visit | VOL | 'שקד פלד' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-11 20:57:16.248000', '2026-03-11 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'היה ממש ממש טובב נפגשנו בבית שלהם והיינו עם כל האחים הבאנו להם מתנות מהמחסן ואז הכנו ביחד כדורי שוקולד ועשינו גם יצירה (אחת המתנות שהבאנו להם)', 'לא', 'כלום רק להגיד שהם ממש נהנו וגם האמא אמרה שהיא ממש הייתה צריכה את הזמן השקט הזה❤️❤️', NULL, 'general_house_visit', NULL, 'הלל כהן', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'שרה כלפון' FROM ins;

-- excel row 94 | ביקור בבתי חולים -> general_volunteer_hospital_visit | VOL | 'שקד פלד' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-11 20:58:54.349000', '2026-03-11 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'התרמנו פיצות וגלידות היה ממש טוב המשפחות ממש ממש שמחו', 'לא', NULL, NULL, 'general_volunteer_hospital_visit', 'שניידר פתח תקווה', 'הלל כהן', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'ביקור במחלקה בשניידר' FROM ins;

-- excel row 95 | ביקור בית כללי -> general_house_visit | VOL | 'רננה בן ציון' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-11 21:21:21.842000', '2026-03-11 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'נפגשנו בבית שלה הלכנו לפיצה', 'לא', NULL, 'לא צריך החזר', 'general_house_visit', NULL, 'תהילה ברוש', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'אדל בומברג' FROM ins;

-- excel row 96 | ביקור בחונכות -> tutorship | TUTOR | 'הלל כהן' -> 'הלל כהן' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-11 21:23:02.229000', '2026-03-11 00:00:00', (SELECT staff_id FROM childsmile_app_tutors WHERE id_id = 331407825), 'הכנו כדורי שוקולד והיה מושלם', NULL, NULL, NULL, 'tutorship', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_tutor_feedback (feedback_id_id, tutee_name, tutor_name, tutor_id, is_it_your_tutee)
SELECT feedback_id, 'שרה כלפון', 'הלל כהן', 331407825, TRUE FROM ins;

-- excel row 97 | ביקור בבתי חולים -> general_volunteer_hospital_visit | VOL | 'הלל כהן' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-11 21:23:54.433000', '2026-03-11 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'חילקנו פיצות וגלידה המשפחות ממש שמחו', NULL, NULL, NULL, 'general_volunteer_hospital_visit', 'שניידר פתח תקווה', NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'שניידר האונקולוגית' FROM ins;

-- excel row 98 | ביקור בית כללי -> general_house_visit | VOL | 'נעה צובל' -> 'נעה צובל' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-11 23:57:03.919000', '2026-11-03 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 333609261), 'הלכנו לבית שלה עם מצרכים לכדורי שוקולד והכנו ועשינו לק ושיחקנו', 'הכל היה מושלם', 'לא תודה רבה אין עליכם', 'אשמח לחונכות❤️', 'general_house_visit', NULL, 'שיילי מטלס', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'נעה צובל', 333609261, 'שירה קרוני' FROM ins;

-- excel row 99 | ביקור בית כללי -> general_house_visit | VOL | 'איתי פרוידמן' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-12 10:55:16.533000', '2026-03-11 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'שיחקנו בחצר תופסת וכזה ודיברנו עם ההורים שלו', NULL, NULL, NULL, 'general_house_visit', NULL, 'נועם צוהר, יובל נזרי', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'ריי (לא סגור על השם משפחה)' FROM ins;

-- excel row 100 | ביקור בית כללי -> general_house_visit | VOL | 'איתי פרוידמן' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-12 10:56:13.023000', '2026-03-11 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'שיחקנו קצת עשינו יצירות ודיברנו', NULL, NULL, NULL, 'general_house_visit', NULL, 'נועם צוהר', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'זוהר ארבל (מקווה שאני צודק בשם משפחה)' FROM ins;

-- excel row 101 | ביקור בבתי חולים -> general_volunteer_hospital_visit | VOL | 'תהל ברנע' -> 'תהל ברנע' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-12 16:09:10.384000', '2026-03-12 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 219638632), 'נפגשנו בבית חולים היינו איתנו ושיחקנו', NULL, NULL, NULL, 'general_volunteer_hospital_visit', 'שניידר פתח תקווה', 'אביה פרוכטר, רונילי אריאל', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'תהל ברנע', 219638632, 'אור רפאל' FROM ins;

-- excel row 102 | ביקור בית כללי -> general_house_visit | VOL | 'שילי מטלס' -> 'שילי מטלס' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-12 18:08:44.421000', '2026-03-11 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 334455888), 'היינו בבית שלה, הכנו כדורי שוקולד ושיחקנו משחקים', 'לא', NULL, NULL, 'general_house_visit', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'שילי מטלס', 334455888, 'שירה' FROM ins;

-- excel row 103 | ביקור בית כללי -> general_house_visit | VOL | 'יובל נזרי' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-12 18:09:55.387000', '2026-03-11 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'הגענו אליו הביתה, הבאנו לו מתנה שהוא מאוד אהב ושיחקתי איתו הרבה בטרמפולינה בחצר שלו', NULL, NULL, NULL, 'general_house_visit', NULL, 'נעם צוהר, דניאל פרוידמן', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'ריי נומברג' FROM ins;

-- excel row 104 | ביקור בחונכות -> tutorship | TUTOR | 'יעל תנעמי' -> 'יעל תנעמי' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-12 18:40:14.456000', '2026-03-12 00:00:00', (SELECT staff_id FROM childsmile_app_tutors WHERE id_id = 331545731), 'ההינו אצלה והכנו כדורי שוקולד ואז הלכנו לגן שעשועים', 'לא', NULL, NULL, 'tutorship', NULL, 'שירה קלפוס', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_tutor_feedback (feedback_id_id, tutee_name, tutor_name, tutor_id, is_it_your_tutee)
SELECT feedback_id, 'עופרי זרח', 'יעל תנעמי', 331545731, TRUE FROM ins;

-- excel row 105 | ביקור בית כללי -> general_house_visit | VOL | 'רננה בן ציון' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-12 18:46:06.580000', '2026-03-12 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'בבית שלה נפגשנו', 'לא', NULL, NULL, 'general_house_visit', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'מנור כליף' FROM ins;

-- excel row 106 | ביקור בית כללי -> general_house_visit | VOL | 'לינוי בבזרה' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-12 18:47:31.895000', '2026-03-12 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'בבית שלה נפגשנו', 'לא', NULL, NULL, 'general_house_visit', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'מנור כליף' FROM ins;

-- excel row 107 | ביקור בבתי חולים -> general_volunteer_hospital_visit | VOL | 'לינוי בבזרה' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-12 19:02:09.166000', '2026-03-13 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'הילד ישן רוב הזמן אבל כשהוא קם שיחקנו איתו במגנטים שהבאנו מהמחסן', 'לא', NULL, NULL, 'general_volunteer_hospital_visit', 'שניידר פתח תקווה', 'עדי', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'רפאל דהאן בשניידר' FROM ins;

-- excel row 108 | ביקור בחונכות -> tutorship | TUTOR | 'רננה בן ציון' -> 'רננה בן ציון' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-12 19:04:27.577000', '2026-03-12 00:00:00', (SELECT staff_id FROM childsmile_app_tutors WHERE id_id = 218304186), 'שיחקנו עם מוריאל בכדורגל הכנו איתו כדורי שוקולד עשינו איתו ועם המשפחה שלו ערב סרט כזה', NULL, NULL, NULL, 'tutorship', NULL, 'לינוי בבזרה', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_tutor_feedback (feedback_id_id, tutee_name, tutor_name, tutor_id, is_it_your_tutee)
SELECT feedback_id, 'מוריאל', 'רננה בן ציון', 218304186, FALSE FROM ins;

-- excel row 109 | ביקור בית כללי -> general_house_visit | VOL | 'רננה בן ציון' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-12 19:06:27.492000', '2026-03-12 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'בבית שלהם', 'לא', NULL, NULL, 'general_house_visit', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'מוריאל' FROM ins;

-- excel row 110 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'נגה ניר' -> 'נגה ניר' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-12 19:19:15.323000', '2026-12-03 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 217808922), 'נפגשנו בבית שלה עשינו איתה יצירות ושיחקנו איתה ואז היינו גם עם האחים', NULL, NULL, NULL, 'general_volunteer_fun_day', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'נגה ניר', 217808922, 'טליה רות' FROM ins;

-- excel row 111 | ביקור בית כללי -> general_house_visit | VOL | 'שירה שרון' -> 'שירה שרון' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-12 19:56:42.128000', '2026-03-12 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 218045243), 'היה כיףףףף הייתי אצלם בבית שיחקנו והכנו כדורי שוקולד', NULL, NULL, NULL, 'general_house_visit', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'שירה שרון', 218045243, 'מנחם צח' FROM ins;

-- excel row 112 | ביקור בית כללי -> general_house_visit | VOL | 'הלל כהן' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-12 20:59:33.077000', '2026-03-12 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'שחיקנו במשחקים שלו היה כיף', NULL, NULL, NULL, 'general_house_visit', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'ארז פלדמן' FROM ins;

-- excel row 113 | ביקור בית כללי -> general_house_visit | VOL | 'חנה רנדל' -> 'חנה רנדל' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-12 23:27:17.840000', '2026-03-12 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 329800551), 'הגענו אליה ולקחנו אותה ואת אחותה לפארק ואז אכלנו בעגלת קפה ואז חזרנו לבית שלה ושיחקנו קלפים ועשינו לק', NULL, NULL, NULL, 'general_house_visit', NULL, 'אביה פרוכטר(יובל, נזרי הצטרף, באמצע)', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'חנה רנדל', 329800551, 'שירה קרוואני' FROM ins;

-- excel row 114 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'לינדה טוויל' -> 'לינדה טויל' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-12 23:49:53.398000', '2026-03-12 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 342813631), 'היא הייתה ביום כיף עם חנה ואביה והם אמרו לי לרדת אליהם, הבאתי כלב שהיה אצלי בבית כי שירה מאוד רצתה, היינו בגינה עם הכלב והיא ממש נהנתה', 'לא', NULL, NULL, 'general_volunteer_fun_day', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'לינדה טויל', 342813631, 'שירה קראווני' FROM ins;

-- excel row 115 | ביקור בית כללי -> general_house_visit | VOL | 'יובל נזרי' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-12 23:55:32.495000', '2026-03-12 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'נפגשנו בפארק ברחוב ירושלים אכלנו בעגלת קפה שם ואז נסענו לבית שלהם ושיחקנו איתם בבית גם', 'לא', 'למשפחה אין חונכת קבועה רשמית בעמותה והאמא רוצה ואביה פרוכטר וחנה רנדל רוצות', NULL, 'general_house_visit', NULL, 'חנה רנדל, אביה פרוכטר, לינדה טוויל', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'שירה קרוואני' FROM ins;

-- excel row 116 | ביקור בבתי חולים -> general_volunteer_hospital_visit | VOL | 'איתי פרוידמן' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-13 15:23:29.010000', '2026-03-13 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'דיברנו ושיחקנו', NULL, NULL, NULL, 'general_volunteer_hospital_visit', 'שניידר פתח תקווה', NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'אלירז צור אונקולוגית שניידר' FROM ins;

-- excel row 117 | ביקור בית כללי -> general_house_visit | VOL | 'נהוראי קרואני' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-13 15:25:24.530000', '2026-03-12 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'הגענו אליהם הביתה הילדה לא הגיבה שיחקנו עם האחים שלה והאמא', 'לא הכל פגז', 'לא אין', NULL, 'general_house_visit', NULL, 'אורי אריה, איתן הרשקו', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'אלמה' FROM ins;

-- excel row 118 | ביקור בית כללי -> general_house_visit | VOL | 'נאוה פרולינגר' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-15 09:49:51.725000', '2026-03-12 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'יצאנו לקפה ברנר ועשינו סיבובים באוטו', NULL, NULL, NULL, 'general_house_visit', NULL, 'נועם צוהר', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'אדל מרעננה' FROM ins;

-- excel row 119 | ביקור בית כללי -> general_house_visit | VOL | 'נאוה פרולינגר' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-15 09:50:58.035000', '2026-03-12 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'הסתובבו קצת בגינה ואז שיחקנו במשחקי דמיון שלו', NULL, NULL, NULL, 'general_house_visit', NULL, 'הלל כהן', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'ארז פלדמן' FROM ins;

-- excel row 120 | ביקור בית כללי -> general_house_visit | VOL | 'נאוה פרולינגר' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-15 09:51:42.927000', '2026-03-13 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'שיחקנו במשחקים שלה בבית', NULL, NULL, NULL, 'general_house_visit', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'אדל מרעננה' FROM ins;

-- excel row 121 | ביקור בית כללי -> general_house_visit | VOL | 'רונילי אריאל' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-15 14:50:41.760000', '2026-03-15 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'הלכנו לגינה ושיחקנו בבית', NULL, NULL, NULL, 'general_house_visit', NULL, 'נעה צובל', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'זוהר ארבל' FROM ins;

-- excel row 122 | ביקור בית כללי -> general_house_visit | VOL | 'לינדה טויל' -> 'לינדה טויל' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-15 16:40:52.978000', '2026-03-15 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 342813631), 'זה פעם שנייה שהייתי איתה, היה ממש כיף הגענו ושיחקנו עם השמישים שלה ואז ציירנו ואז באנו ללכת והיא ממש רצתה שנשאר וכזה אז נשארנו עוד חצי שעה ואז האמא לקחה אותנו בחזרה לגבעת שמואל', 'לא', 'לא', NULL, 'general_house_visit', NULL, 'תמרה שטיבל', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'לינדה טויל', 342813631, 'ריף' FROM ins;

-- excel row 123 | ביקור בית כללי -> general_house_visit | VOL | 'תמרה שטיבל' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-15 16:41:50.372000', '2026-03-15 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'היה ממש נחמד נפגשנו בבית ושיחקנו עם המשחקים וציירנו ביחד ואז היינו אמורות ללכת אבל היא ממש רצתה שנשאר עוד אז נשארנו עוד איזה שעה והיה ממש כיף ואחרי זה חזרנו בחזרה ואמרנו לה שנבוא שוב', 'לא ,הכול היה בסדר', NULL, 'היה לנו ממש כיף איתה ❤️', 'general_house_visit', NULL, 'לינדה טויל', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'ריף' FROM ins;

-- excel row 124 | ביקור בית כללי -> general_house_visit | VOL | 'דוד שמש' -> 'דוד שמש' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-15 18:00:42.456000', '2026-03-15 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 324857416), 'הגענו לבית והלכנו לגימבורי', 'קיבל מכה ביד', NULL, NULL, 'general_house_visit', NULL, 'ענאל אבינועם, ראובן אלדרי', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'דוד שמש', 324857416, 'פאר פריוף' FROM ins;

-- excel row 125 | ביקור בבתי חולים -> general_volunteer_hospital_visit | VOL | 'עדי שחם' -> 'עדי שחם' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-15 18:01:47.834000', '2026-03-15 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 333569317), 'זה היה ביקור ממש קצר, שבוע שעבר האמא ביקשה אם אנחנו יכולים לארגן לו בובות של מיקי ומיני אז הגענו היום מחופשים לשמח אותו והבאנו גם פיצה ושתייה, הילד והאמא ממש ממש שמחו', NULL, NULL, NULL, 'general_volunteer_hospital_visit', 'שניידר פתח תקווה', 'רננה בן ציון, לינוי בבזרה', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'עדי שחם', 333569317, 'אור רפאל דאהן' FROM ins;

-- excel row 126 | ביקור בית כללי -> general_house_visit | VOL | 'רונילי אריאל' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-15 19:04:19.911000', '2026-03-15 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'הלכנו לגינה וגם בבית שיחקנו הרבה', 'לא', 'לא', NULL, 'general_house_visit', NULL, 'תהל ברנע, נעה צובל', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'שירה קראוני' FROM ins;

-- excel row 127 | ביקור בית כללי -> general_house_visit | VOL | 'תהל ברנע' -> 'תהל ברנע' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-15 19:05:32.760000', '2026-03-15 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 219638632), 'הלכנו לגינה ושיחקנו בבית', 'לא', 'לא', NULL, 'general_house_visit', NULL, 'רונילי אריאל, נעה צובל', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'תהל ברנע', 219638632, 'שירה קארוני' FROM ins;

-- excel row 128 | ביקור בית כללי -> general_house_visit | VOL | 'שירה שרון' -> 'שירה שרון' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-15 20:54:00.804000', '2026-03-15 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 218045243), 'היינו אצלה בבית', NULL, NULL, NULL, 'general_house_visit', NULL, 'שקד פלד', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'שירה שרון', 218045243, 'אדל בומברנג' FROM ins;

-- excel row 129 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'נועם צוהר' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-16 00:08:37.472000', '2026-03-15 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'שיחקנו מלחמה והיינו בממד', NULL, NULL, NULL, 'general_volunteer_fun_day', NULL, 'לרה', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'עומרי בכר' FROM ins;

-- excel row 130 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'נועם צוהר' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-16 00:09:29.841000', '2026-03-15 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'בנינו כדורגל שולחן וראינו סרט', NULL, NULL, NULL, 'general_volunteer_fun_day', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'מנחם צח' FROM ins;

-- excel row 131 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'נועם צוהר' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-16 00:09:53.534000', '2026-03-15 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'בנינו פאזל', NULL, NULL, NULL, 'general_volunteer_fun_day', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'אורי בן חמו' FROM ins;

-- excel row 132 | ביקור בית כללי -> general_house_visit | VOL | 'דניאל ולץ' -> 'דניאל ולץ' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-16 01:15:35.795000', '2026-03-15 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 219640364), 'באנו אליו הביתה שיחקנו פיפא פוקר כדורגל כדורסל אכלנו היה ממש כיף בהתחלה שהיינו באים אליו הוא היה ביישן עכשיו פחות הוא מתחיל להיפתח', 'לא', NULL, NULL, 'general_house_visit', NULL, 'איתי פרוידמן, איתי רייך', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'דניאל ולץ', 219640364, 'אושר בוגנים' FROM ins;

-- excel row 133 | ביקור בית כללי -> general_house_visit | VOL | 'רונילי אריאל' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-16 18:56:05.644000', '2026-03-16 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'היינו בבית שלו שיחקנו', NULL, NULL, NULL, 'general_house_visit', NULL, 'תהל ברנע', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'עומרי בכר' FROM ins;

-- excel row 134 | ביקור בית כללי -> general_house_visit | VOL | 'לינוי בבזרה' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-16 19:19:23.454000', '2026-03-16 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'הגענו אליו הביתה ושיחקנו', NULL, NULL, NULL, 'general_house_visit', NULL, 'שירה שרון', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'אבישי מרירס' FROM ins;

-- excel row 135 | ביקור בית כללי -> general_house_visit | VOL | 'חנה רנדל' -> 'חנה רנדל' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-16 19:54:20.821000', '2026-03-16 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 329800551), 'באנו לבית שלה והכנו שוקולד וצמידים', NULL, NULL, NULL, 'general_house_visit', NULL, 'תמרה שטיבל', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'חנה רנדל', 329800551, 'ליאור' FROM ins;

-- excel row 136 | ביקור בית כללי -> general_house_visit | VOL | 'אביה פרוכטר' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-16 20:31:09.172000', '2026-03-16 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'עשינו לו ביקור בית שילקנו כדורגל ומשחקי קופסה ורקדנו קצת', 'לא', NULL, NULL, 'general_house_visit', NULL, 'עדי שחם', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'מוריאל חיימי' FROM ins;

-- excel row 137 | ביקור בית כללי -> general_house_visit | VOL | 'הלל כהן' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-17 00:59:32.556000', '2026-03-16 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'היה ממש כיף שיחקנו והיינו בגינה', NULL, NULL, NULL, 'general_house_visit', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'עידן מזיג' FROM ins;

-- excel row 138 | ביקור בית כללי -> general_house_visit | VOL | 'הלל כהן' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-17 01:00:35.937000', '2026-03-16 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'שיחקנו במשחקים והיה טוב', NULL, NULL, NULL, 'general_house_visit', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'אלה ניסני' FROM ins;

-- excel row 139 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'הלל כהן' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-17 01:01:18.679000', '2026-03-16 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'הלכנו למסעדה היה טעים וכיף', NULL, NULL, NULL, 'general_volunteer_fun_day', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'אדל ברומברג' FROM ins;

-- excel row 140 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'הלל כהן' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-17 01:01:57.876000', '2026-03-16 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'ישבנו במסעדה היה כיף וטעים', NULL, NULL, NULL, 'general_volunteer_fun_day', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'אלה רבה' FROM ins;

-- excel row 141 | ביקור בית כללי -> general_house_visit | VOL | 'הלל כהן' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-17 01:02:36.365000', '2026-03-16 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'שיחקנו במשחקי וידאו שלו היה כיף', NULL, NULL, NULL, 'general_house_visit', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'מייק' FROM ins;

-- excel row 142 | ביקור בית כללי -> general_house_visit | VOL | 'לינוי בבזרה' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-17 01:57:57.055000', '2026-03-16 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'שיחקנו במשחקי קופסה , היינו בבית שלו , היה ממש כיף האמא שלחה לנו אחר כך הודעה שאבישי מאוד נהנה ושזה שינוי אווירה בשבילו .', NULL, NULL, NULL, 'general_house_visit', NULL, 'שירה שרון', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'אבישי מרירס' FROM ins;

-- excel row 143 | ביקור בית כללי -> general_house_visit | VOL | 'רננה בן ציון' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-17 16:02:13.664000', '2026-03-16 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'בבית שלהם', NULL, NULL, NULL, 'general_house_visit', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'מוריאל חיימי' FROM ins;

-- excel row 144 | ביקור בית כללי -> general_house_visit | VOL | 'דניאל ולץ' -> 'דניאל ולץ' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-17 16:42:52.837000', '2026-03-17 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 219640364), 'נסענו אליהם הוצאנו אותו ואת אח שלו לגינה ליד הבית ושיחקנו איתם היה כיף ראו עליהם שהם נהנו וזה היה גם קצת מנוחה בשביל האמא', 'לא', NULL, NULL, 'general_house_visit', NULL, 'איתי פרוידמן, נהגת לא, מתנדבת מהעמותה', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'דניאל ולץ', 219640364, 'יאיר עמר' FROM ins;

-- excel row 145 | ביקור בית כללי -> general_house_visit | VOL | 'תמרה שטיבל' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-17 18:20:27.373000', '2026-03-16 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'נפגשנו בבית שלה בהוד השרון והיה ממש כיף הכנו כזה שוקולד מגניב ושיחקנו בהפתעה שהבאנו לה', NULL, NULL, NULL, 'general_house_visit', NULL, 'חנה רנדל', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'ליאור רוכמן' FROM ins;

-- excel row 146 | ביקור בית כללי -> general_house_visit | VOL | 'תמרה שטיבל' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-17 18:22:19.427000', '2026-03-17 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'נפגשנו בבית שלה ברמת גן היה ממש נחמד קראנו לה סיפור והכנו צמידים היינו גם ביחד בממד', NULL, NULL, NULL, 'general_house_visit', NULL, 'לינדה טוויל', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'זוהר ארבל' FROM ins;

-- excel row 147 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'לינדה טוויל' -> 'לינדה טויל' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-17 18:23:02.584000', '2026-03-16 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 342813631), 'בהתחלה רק שירה ואחותה היו הלכנו לוואיטפול בפתח תקווה, שיחקנו מלא שירה ממש אהבה ואחרי כמה זמן הגיע שמעון עם אחים שלו נשארנו שם לשחק עוד ואז הלכנו לפיצה ליד וישבנו שם', 'בסוף שישבנו בפיצה שירה בכתה קצת ורצתה ללכת הביתה אבל אז אני (לינדה) באתי אליה בצד והיא ממש נרגעה ואז אמא שלה באה לקחת אותן', NULL, NULL, 'general_volunteer_fun_day', NULL, 'יובל נזרי ושיר מעוז', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'לינדה טויל', 342813631, 'שירה ושמעון (האחים של שתיהם באו גם)' FROM ins;

-- excel row 148 | ביקור בית כללי -> general_house_visit | VOL | 'לינדה טוויל' -> 'לינדה טויל' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-17 18:24:11.620000', '2026-03-17 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 342813631), 'הגענו והבאנו להם מתנות אז שיחקנו בהם ציירנו ועשינו צמידים ואז אחרי זה קראנו ספרים ושיחקנו מחבואים עם', NULL, NULL, NULL, 'general_house_visit', NULL, 'תמרה', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'לינדה טויל', 342813631, 'זוהר  ארבל' FROM ins;

-- excel row 149 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'אביה פרוכטר' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-17 18:26:05.693000', '2026-03-17 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'הלכנו לביבלון ואז לאכול בשניצל 20 הטעמים', 'לא', NULL, NULL, 'general_volunteer_fun_day', NULL, 'רונילי אריאל', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'עמית מלר' FROM ins;

-- excel row 150 | ביקור בית כללי -> general_house_visit | VOL | 'אביה פרוכטר' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-17 18:27:36.839000', '2026-03-17 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'באנו אליהם הביתה עשינו סליים שיחקנו במונפול ועשינו יצירות', NULL, NULL, NULL, 'general_house_visit', NULL, 'רונילי אריאל', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'דני סוסנה' FROM ins;

-- excel row 151 | ביקור בחונכות -> tutorship | TUTOR | 'יעל תנעמי' -> 'יעל תנעמי' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-17 18:52:31.688000', '2026-03-17 00:00:00', (SELECT staff_id FROM childsmile_app_tutors WHERE id_id = 331545731), 'שיחקנו יצאנו לגן שעשועים ועשינו גם ציורים', 'לא', NULL, NULL, 'tutorship', NULL, 'שירה קלפוס', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_tutor_feedback (feedback_id_id, tutee_name, tutor_name, tutor_id, is_it_your_tutee)
SELECT feedback_id, 'עופרי זרח', 'יעל תנעמי', 331545731, TRUE FROM ins;

-- excel row 152 | ביקור בית כללי -> general_house_visit | VOL | 'הלל קרמר' -> 'הלל קרמר' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-17 20:18:46.788000', '2026-03-17 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 218368108), 'הגעתי אליה הביתה ושיחקנו ביחד', 'לא', 'אין', NULL, 'general_house_visit', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'הלל קרמר', 218368108, 'תפארת אסתר ריף שניידר' FROM ins;

-- excel row 153 | ביקור בית כללי -> general_house_visit | VOL | 'נהוראי קרואני' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-17 20:20:45.901000', '2026-03-16 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'נפגשנו בבית שלהם שיחקנו עם האחים ודיברנו עם הילדה', 'הכל הלך חלק', NULL, NULL, 'general_house_visit', NULL, 'אורי אריה', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'אלמה' FROM ins;

-- excel row 154 | ביקור בית כללי -> general_house_visit | VOL | 'אביה פרוכטר' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-17 21:25:13.109000', '2026-03-16 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'היינו אצלו בבית, שיחקנו איתו ועם אחים שלו', NULL, NULL, NULL, 'general_house_visit', NULL, 'עדי שחם', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'מוריאל חיימי' FROM ins;

-- excel row 155 | ביקור בית כללי -> general_house_visit | VOL | 'רונילי אריאל' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-17 22:58:05.443000', '2026-03-17 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'בבית שלה שיחקנו', NULL, NULL, NULL, 'general_house_visit', NULL, 'אביה פרוכטר', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'דני הראלי סוסנה' FROM ins;

-- excel row 156 | ביקור בית כללי -> general_house_visit | VOL | 'רונילי אריאל' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-17 22:58:43.508000', '2026-03-17 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'הלכנו לבבילון ואכלנו', NULL, NULL, NULL, 'general_house_visit', NULL, 'אביה פרוכטר', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'עמית מלר' FROM ins;

-- excel row 157 | ביקור בחונכות -> tutorship | TUTOR | 'יובל נזרי' -> 'יובל נזרי' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-18 00:54:18.149000', '2026-03-16 00:00:00', (SELECT staff_id FROM childsmile_app_tutors WHERE id_id = 334349255), 'נפגשו בוויט פול פתח תקווה מתחם עם מתקני נינג׳ה ומגלשות לילדים ולאחר מכן הלכנו לאכול בפיצה פפא ג׳ונס', 'לא', NULL, NULL, 'tutorship', NULL, 'איתי רייך, לינדה טוויל', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_tutor_feedback (feedback_id_id, tutee_name, tutor_name, tutor_id, is_it_your_tutee)
SELECT feedback_id, 'חגי מנחם והדס צח שמעון טימסית שירה והלל קרוואני', 'יובל נזרי', 334349255, TRUE FROM ins;

-- excel row 158 | ביקור בית כללי -> general_house_visit | VOL | 'יובל נזרי' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-18 00:55:23.604000', '2026-03-17 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'הגענו אליה הביתה עם מתנה ושיחקנו איתה', 'לא', NULL, NULL, 'general_house_visit', NULL, 'חנה רנדל', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'שירה קרוואני' FROM ins;

-- excel row 159 | ביקור בית כללי -> general_house_visit | VOL | 'לינדה טוויל' -> 'לינדה טויל' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-18 13:09:49.929000', '2026-03-18 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 342813631), 'שיחקנו במשחק שהבאנו לה ואז הכנו כדורי שוקולד והיה מאוד מאוד כיף היא ממש שמחה ואז שיחקנו מחבואים', NULL, NULL, NULL, 'general_house_visit', NULL, 'תמרה', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'לינדה טויל', 342813631, 'ריף' FROM ins;

-- excel row 160 | ביקור בית כללי -> general_house_visit | VOL | 'תמרה שטיבל' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-18 13:10:49.554000', '2026-03-18 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'הכנו כדורי שוקולד והיה ממש כיף היא שמחה שבאנו ושיחקנו במשחק שהבאנו לה מהמחסן', 'לא', 'זה ממש עושה לה טוב שמתנדבים באים וזה כיף לה ממש היא אוהבת לשחק', 'אנחנו ממש רוצות לארגן לה איזשהו יום כיף מחוץ לבית❤️', 'general_house_visit', NULL, 'לינדה טוויל', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'ריף' FROM ins;

-- excel row 161 | ביקור בית כללי -> general_house_visit | VOL | 'איתי פרוידמן' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-18 13:37:23.228000', '2026-03-15 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'באנו אלין הביתה שיחקנו פיפא וירדנו לשחק כדורסל וכדורגל', NULL, NULL, NULL, 'general_house_visit', NULL, 'דניאל ולץ, איתי רייך', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'אושר בוגנים' FROM ins;

-- excel row 162 | ביקור בית כללי -> general_house_visit | VOL | 'רונילי אריאל' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-18 13:38:01.656000', '2026-03-18 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'שיחקנו בבית ובחוץ', 'לא', NULL, NULL, 'general_house_visit', NULL, 'תהל ברנע, אביה פרוכטר', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'אור רפאל דהאן' FROM ins;

-- excel row 163 | ביקור בית כללי -> general_house_visit | VOL | 'איתי פרוידמן' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-18 13:38:16.274000', '2026-03-17 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'הלכנו איתו ועם אח שלו לגינה לשחק הם אחרי השתלה ובידוד של חודש זה הוא מאוד נהנה', NULL, NULL, NULL, 'general_house_visit', NULL, 'דניאל ולץ', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'יאיר לא סגור מה השם משפחה שלו מבאר יעקב' FROM ins;

-- excel row 164 | ביקור בית כללי -> general_house_visit | VOL | 'חנה רנדל' -> 'חנה רנדל' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-18 13:44:00.594000', '2026-03-17 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 329800551), 'הלכנו לגינה ואז היא נסגרה אז חזרנו והכנו שוקולד', NULL, NULL, NULL, 'general_house_visit', NULL, 'אביה דומן', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'חנה רנדל', 329800551, 'שירה קרוואני' FROM ins;

-- excel row 165 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'נהוראי קרואני' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-18 17:54:49.420000', '2026-03-18 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'הלכנו לבאולינג ואז למסעדה', 'הלך פגז', NULL, NULL, 'general_volunteer_fun_day', NULL, 'אורי אריה', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'משפחת סימן טוב אבל רק האחים' FROM ins;

-- excel row 166 | ביקור בית כללי -> general_house_visit | VOL | 'לינוי בבזרה' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-18 17:56:11.000000', '2026-03-18 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'היינו אצלו בבית ושיחקנו', NULL, NULL, NULL, 'general_house_visit', NULL, 'שירה שרון, אורי אריה, תהילה ברוש, נהוראי קראווני.', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'נועם גבאי' FROM ins;

-- excel row 167 | ביקור בית כללי -> general_house_visit | VOL | 'נהוראי קרואני' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-18 17:56:49.408000', '2026-03-18 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'ישבנו אצלו בבית שיחקנו אליאס ודיברנו כזה', 'הלך פגז', NULL, NULL, 'general_house_visit', NULL, 'אורי אריה, שירה שרון, תהילה ברוש, לינוי בבזרה', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'נועם גבאי' FROM ins;

-- excel row 168 | ביקור בית כללי -> general_house_visit | VOL | 'נעה צובל' -> 'נעה צובל' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-18 19:10:53.320000', '2026-03-18 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 333609261), 'בבית שלה היה מאוד כיף!', 'לא', NULL, NULL, 'general_house_visit', NULL, 'אביגיל שועי', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'נעה צובל', 333609261, 'ריף תפארת אסתר' FROM ins;

-- excel row 169 | ביקור בית כללי -> general_house_visit | VOL | 'יובל נזרי' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-18 21:45:15.471000', '2026-03-18 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'הלכנו לבאולינג עם עוד כמה מתנדבים וחניכים ואז התפצלנו כל משפחה למסעדה אחרת והיה כיף ממש', NULL, NULL, NULL, 'general_house_visit', NULL, 'חנה רנדל', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'שמעון טימסיט' FROM ins;

-- excel row 170 | ביקור בחונכות -> tutorship | TUTOR | 'נויה דוידזון' -> 'נויה דוידזון' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-18 22:13:32.453000', '2026-03-16 00:00:00', (SELECT staff_id FROM childsmile_app_tutors WHERE id_id = 331620385), 'היינו אצלה בבית, שיחקנו איתה וציירנו', NULL, NULL, NULL, 'tutorship', NULL, 'רוני רוזנבלום', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_tutor_feedback (feedback_id_id, tutee_name, tutor_name, tutor_id, is_it_your_tutee)
SELECT feedback_id, 'תפארת אסתר ריף', 'נויה דוידזון', 331620385, TRUE FROM ins;

-- excel row 171 | ביקור בית כללי -> general_house_visit | VOL | 'תמי הורביץ' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-18 23:35:07.152000', '2026-03-18 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'היה ממש ממש טוב היינו בבית שלו ושיחקנו פליימוביל', NULL, NULL, NULL, 'general_house_visit', NULL, 'לרה סילינפרויד', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'ארז( לא יודעת שם משפחה אבל הוא מצופית)' FROM ins;

-- excel row 172 | ביקור בית כללי -> general_house_visit | VOL | 'שירה צדיק' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-19 00:26:40.554000', '2026-03-18 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'נפגשנו אצלה בבית שיחקנו והתרמנו פיצה ושתייה', NULL, NULL, NULL, 'general_house_visit', NULL, 'תהילה', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'מנור כליף' FROM ins;

-- excel row 173 | ביקור בחונכות -> tutorship | TUTOR | 'שירה רוקח' -> 'שירה רוקח' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-19 01:05:24.607000', '2026-03-18 00:00:00', (SELECT staff_id FROM childsmile_app_tutors WHERE id_id = 219214988), 'הגעתי אליהם הביתה שיחקנו קצת בכדור בנינו בלגו היה מאוד כיף', NULL, NULL, NULL, 'tutorship', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_tutor_feedback (feedback_id_id, tutee_name, tutor_name, tutor_id, is_it_your_tutee)
SELECT feedback_id, 'יאיר ישראל עמר', 'שירה רוקח', 219214988, TRUE FROM ins;

-- excel row 174 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'עמית צוברי' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-19 09:00:40.311000', '2026-03-17 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'לקחנו את אדל מרעננה נסענו לנתניה לקחנו את אלה הלכנו לבאולינג בקניון עיר ימים ואז לאכול בשיפודי חיים שמחה ובניו', NULL, NULL, NULL, 'general_volunteer_fun_day', NULL, 'אהוד וייס', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'אדל ברומברג ואלה רבה' FROM ins;

-- excel row 175 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'דוד שמש' -> 'דוד שמש' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-19 13:29:31.431000', '2026-03-18 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 324857416), 'באנו להתים ושיחקנו איתם דיברנו והבאנו מתנה וממתק', 'לא', 'המשפחה של יהונתן העלו בקשה לחניך קבוע כיוון שהילד לא מצליח להיקשר רגשית במפגש חד פעמי', NULL, 'general_volunteer_fun_day', NULL, 'ענאל אבינעם', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'דוד שמש', 324857416, 'הדרא וטליה רות ויהונתן' FROM ins;

-- excel row 176 | ביקור בית כללי -> general_house_visit | VOL | 'אביה פרוכטר' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-19 15:30:35.571000', '2026-03-19 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'הייינו אצלה שיחקנו קצת אחרי זה הכנו פנקייקים והלכנו לגינה', 'לא', 'המשפחה ממש ביקשה שכמה שיותר יבואו אליהם כי ממש קשה להם', 'היה ממש ממש כיף היא חמודה ברמות!', 'general_house_visit', NULL, 'נעה צובל', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'ריף שניידר' FROM ins;

-- excel row 177 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'נעה טרויהפט' -> 'נעה טרויהפט' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-19 20:23:48.111000', '2026-03-19 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 218733582), 'היה ממש כיף באנו שיחקנו עם הילדים אצל חלק דיברנו גם עם ההורים ו2 משפחות התרמנו פיצה', NULL, NULL, 'תודה רבה!!', 'general_volunteer_fun_day', NULL, 'נויה בן נתנאל, דביר כהן', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'נעה טרויהפט', 218733582, 'יעלה,זוהר,מנור' FROM ins;

-- excel row 178 | ביקור בית כללי -> general_house_visit | VOL | 'תמרה שטיבל' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-19 20:55:42.529000', '2026-03-19 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'הלכנו לגינה ואז היינו בבית שלה והיה ממש כיף', 'לא', NULL, NULL, 'general_house_visit', NULL, 'אביגיל שועי, תהל ברנע', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'שירה קראבני' FROM ins;

-- excel row 179 | ביקור בית כללי -> general_house_visit | VOL | 'נעה צובל' -> 'נעה צובל' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-19 20:58:19.324000', '2026-03-15 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 333609261), 'נפגשנו בבית שלה שיחקנו עשינו יצירה והלכנו לגינה', 'הכל היה בסדר', 'לא תודה רבה', NULL, 'general_house_visit', NULL, 'רונילי אראיל', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'נעה צובל', 333609261, 'זוהר' FROM ins;

-- excel row 180 | ביקור בית כללי -> general_house_visit | VOL | 'נעה צובל' -> 'נעה צובל' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-19 20:59:29.455000', '2016-03-15 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 333609261), 'נפגשנו בבית הלכנו לגינה ושיחקו', 'הכל בסדר', 'לא תודה', NULL, 'general_house_visit', NULL, 'רונילי אריאל, תהל ברנע', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'נעה צובל', 333609261, 'שירה קרוואני' FROM ins;

-- excel row 181 | יום כיף בחונכות -> tutor_fun_day | TUTOR | 'נועם יאגודייב' -> 'נועם יאגודייב' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-19 21:10:11.632000', '2026-03-18 00:00:00', (SELECT staff_id FROM childsmile_app_tutors WHERE id_id = 334666666), 'נסענו לבאולינג עם מנחם ואחים שלו, באו איתנו גם עוד שני מתנדבות והמשפחה של שירה קרואני היה טוב.', 'כן, היה מקרה אבל לפי הבנתי הוא בטיפול', 'לא', NULL, 'tutor_fun_day', NULL, 'יונתן אלחייאני', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_tutor_feedback (feedback_id_id, tutee_name, tutor_name, tutor_id, is_it_your_tutee)
SELECT feedback_id, 'מנחם צח', 'נועם יאגודייב', 334666666, TRUE FROM ins;

-- excel row 182 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'נעה טרויהפט' -> 'נעה טרויהפט' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-19 21:11:57.520000', '2026-03-19 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 218733582), 'היה ממש כיף שיחקנו עם שתי הבנות', NULL, NULL, 'תודהרבה!!', 'general_volunteer_fun_day', NULL, 'נויה בן נתנאל, דביר כהן, נעם, הר', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'נעה טרויהפט', 218733582, 'זוהר-רמת גן' FROM ins;

-- excel row 183 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'נויה בן נתנאל' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-19 21:13:03.202000', '2026-03-19 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'התרמנו פיצה ושיחקנו הלכנו לגינה היה ממש', NULL, NULL, 'תודהרבה!!', 'general_volunteer_fun_day', NULL, 'נעה טרויהפט, דביר כהן', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'יעלה שי' FROM ins;

-- excel row 184 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'נויה בן נתנאל' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-19 21:14:01.790000', '2026-03-19 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'היה ממש כיף התרמנו פיצה דיברנו עם ההורים שיחקנו עם הילדים', NULL, NULL, 'תודהרבה!!', 'general_volunteer_fun_day', NULL, 'נעה טרויהפט, דביר כהן', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'מנור מכלוף' FROM ins;

-- excel row 185 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'דניאל ולץ' -> 'דניאל ולץ' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-20 03:24:41.446000', '2026-03-19 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 219640364), 'בהתחלה אספנו את אדל נסענו לאסוף את אלה והלכנו לבאולינג ואז הלכנו לאכול סודוך אחרי זה הלכנו לגינה לשחק איתם וחזרנו לבית של אלה ישבנו דיברנו שיחקנו אליאס היה ממש כיף הם נראה לי ממש נהנו', 'לא', NULL, NULL, 'general_volunteer_fun_day', NULL, 'אורי אריה, רננה בן ציון', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'דניאל ולץ', 219640364, 'אלה רבה ואדל ברומברג' FROM ins;

-- excel row 186 | ביקור בחונכות -> tutorship | TUTOR | 'הלל כהן' -> 'הלל כהן' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-20 11:24:57.266000', '2026-03-19 00:00:00', (SELECT staff_id FROM childsmile_app_tutors WHERE id_id = 331407825), 'הלכנו לגינה כול האחים והיה כיף ממש ברוך ה', NULL, NULL, NULL, 'tutorship', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_tutor_feedback (feedback_id_id, tutee_name, tutor_name, tutor_id, is_it_your_tutee)
SELECT feedback_id, 'שרה כלפון', 'הלל כהן', 331407825, TRUE FROM ins;

-- excel row 187 | ביקור בית כללי -> general_house_visit | VOL | 'תהל ברנע' -> 'תהל ברנע' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-20 15:57:34.146000', '2026-03-19 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 219638632), 'יצאנו לגינה ושיחקנו בבית שמנו שירים וכו', NULL, NULL, NULL, 'general_house_visit', NULL, 'תמרה שטיבל, אביגיל שועי', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'תהל ברנע', 219638632, 'שירה קראווני' FROM ins;

-- excel row 188 | ביקור בית כללי -> general_house_visit | VOL | 'נטלי שרה פרקש' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-22 17:41:45.643000', '2026-03-22 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'נפגשו בבית שלו , שיחקנו יחד  עשינו יצירות רקדנו ובישלנו 
והיה מאוד כיף', 'הכל היה מעולה', NULL, 'היה מאוד כיף תודה רבה 💗', 'general_house_visit', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'עומרי בכר' FROM ins;

-- excel row 189 | ביקור בית כללי -> general_house_visit | VOL | 'שחר לבנון' -> 'שחר לבנון' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-22 17:43:06.223000', '2026-03-22 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 334364734), 'היה ממש כיף ושיחקנו ואפינו דברים טעימים והיינו בבית שלו איתו ועם אחיות שלו והיה מאוד כיף', 'לא ,היה ממש סבבה', NULL, 'תודה רבה😍😘', 'general_house_visit', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'שחר לבנון', 334364734, 'עומרי בכר' FROM ins;

-- excel row 190 | ביקור בית כללי -> general_house_visit | VOL | 'הלל כהן' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-22 22:16:08.920000', '2026-03-22 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'הכנו כדורי שוקולד היה מושלםםם', NULL, NULL, NULL, 'general_house_visit', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'אמי' FROM ins;

-- excel row 191 | ביקור בית כללי -> general_house_visit | VOL | 'הלל כהן' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-22 22:16:34.643000', '2026-03-22 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'הבאנו לה מתנות ושחקנו עם אחותה בגינה', NULL, NULL, NULL, 'general_house_visit', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'אריאל' FROM ins;

-- excel row 192 | ביקור בחונכות -> tutorship | TUTOR | 'שקד פלד' -> 'שקד פלד' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-22 22:16:58.514000', '2026-03-22 00:00:00', (SELECT staff_id FROM childsmile_app_tutors WHERE id_id = 331646695), 'נפגשנו בבית שלו ושיחקנו', 'לא', NULL, NULL, 'tutorship', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_tutor_feedback (feedback_id_id, tutee_name, tutor_name, tutor_id, is_it_your_tutee)
SELECT feedback_id, 'אלון גליק', 'שקד פלד', 331646695, TRUE FROM ins;

-- excel row 193 | ביקור בבתי חולים -> general_volunteer_hospital_visit | VOL | 'הלל כהן' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-22 22:17:26.500000', '2026-03-22 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'חילקנו אוכל והמשפחות עפו על האוכל וגם האחים והאחיות', NULL, NULL, NULL, 'general_volunteer_hospital_visit', 'שניידר פתח תקווה', NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'שניידר אונקולוגי' FROM ins;

-- excel row 194 | ביקור בית כללי -> general_house_visit | VOL | 'נאוה פרולינגר' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-22 22:21:23.984000', '2026-03-22 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'יצאנו לטיול והכנו ארוחת צהריים וכדורי שוקולד', NULL, NULL, NULL, 'general_house_visit', NULL, 'הלל כהן', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'אמי חשורק' FROM ins;

-- excel row 195 | ביקור בית כללי -> general_house_visit | VOL | 'נאוה פרולינגר' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-22 22:21:57.356000', '2026-03-22 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'יצאנו לפארק והבאנו הפתעות', NULL, NULL, NULL, 'general_house_visit', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'אריאל מבית שאן' FROM ins;

-- excel row 196 | ביקור בית כללי -> general_house_visit | VOL | 'חנה רנדל' -> 'חנה רנדל' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-22 23:08:51.798000', '2026-03-22 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 329800551), 'הגענו אליה ואז עשינו יצירות ואכלנו', NULL, NULL, NULL, 'general_house_visit', NULL, 'אביה פרוכטר, דביר כהן', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'חנה רנדל', 329800551, 'אביגיל נסימיה' FROM ins;

-- excel row 197 | ביקור בית כללי -> general_house_visit | VOL | 'אביה פרוכטר' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-22 23:08:56.396000', '2026-03-22 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'היינו אצלה בבית עשינו יצירות שיחקנו במשחקי קופסב והיה כיף מאוד', 'לא', NULL, NULL, 'general_house_visit', NULL, 'חנה רנדל, שמואל שוב, נעם יאגודייב, דביר כהן', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'נועה אהרון' FROM ins;

-- excel row 198 | ביקור בית כללי -> general_house_visit | VOL | 'חנה רנדל' -> 'חנה רנדל' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-22 23:10:05.425000', '2026-03-22 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 329800551), 'עשינו פאזלים ושיחקנו קצת והיה כיף', NULL, NULL, NULL, 'general_house_visit', NULL, 'אביה פרוכטר, דביר כהן, נועם יאגודייב, שמואל שוב', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'חנה רנדל', 329800551, 'יעלה תמה שי' FROM ins;

-- excel row 199 | ביקור בית כללי -> general_house_visit | VOL | 'אביה פרוכטר' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-22 23:10:29.943000', '2026-03-22 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'חגגנו לו יומולדת שיחקנו במשחקי קופסה והיה ממש ממ כיף', 'לא', NULL, NULL, 'general_house_visit', NULL, 'חנה רנדל, נועם יאגודיב, שמואל שוב, דביר כהן', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'פאר פריוף' FROM ins;

-- excel row 200 | ביקור בית כללי -> general_house_visit | VOL | 'אביה פרוכטר' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-22 23:13:01.569000', '2026-03-22 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'היה ממש ממש כיף שיחקנו משחקי קופסה ובסוני וכדורגל', 'לא', NULL, NULL, 'general_house_visit', NULL, 'חנה רנדל, נועם יאגודייב, שמואל שוב, דביר כבן', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'נוריאל קלמנוב' FROM ins;

-- excel row 201 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'יובל נזרי' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-22 23:16:48.796000', '2026-03-22 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'אספנו אותם מהבתים נסענו למשחקיה בבסר סיטי ואז לבאוולינג ולאחר מכן אכלנו בשיפודי ציפורה', 'לא', 'לא', NULL, 'general_volunteer_fun_day', NULL, 'יהונתן אלחיאני, גבריאלה, תמי', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'מייקי אדל ונעם' FROM ins;

-- excel row 202 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'יובל נזרי' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-22 23:18:42.879000', '2026-03-20 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'אספנו אותם מהבית והלכנו לפארק בגבש', 'לא', 'לא', NULL, 'general_volunteer_fun_day', NULL, 'לינדה טוויל, חנה רנדל', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'שירה והלל קרוואני' FROM ins;

-- excel row 203 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'טלי סנדברנד' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-23 14:30:30.479000', '2026-03-22 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'הלכנו לבאולינג ואז למסעדה 
היה ממש כיף!', NULL, NULL, NULL, 'general_volunteer_fun_day', NULL, 'גבריאלה, תמי, יונתן, יובל', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'אדל ואח שלה, מייק' FROM ins;

-- excel row 204 | יום כיף בחונכות -> tutor_fun_day | TUTOR | 'טלי סנדברנד' -> 'טלי סנדברנד' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-23 14:30:51.876000', '2026-03-23 00:00:00', (SELECT staff_id FROM childsmile_app_tutors WHERE id_id = 330072232), 'הייתי אצלה בבית', NULL, NULL, NULL, 'tutor_fun_day', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_tutor_feedback (feedback_id_id, tutee_name, tutor_name, tutor_id, is_it_your_tutee)
SELECT feedback_id, 'שיי', 'טלי סנדברנד', 330072232, TRUE FROM ins;

-- excel row 205 | ביקור בבתי חולים -> general_volunteer_hospital_visit | VOL | 'יובל נזרי' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-23 16:31:37.008000', '2026-03-23 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'נפגשנו במחלקה שיחקנו איתה', 'לא', 'לא', NULL, 'general_volunteer_hospital_visit', 'שניידר פתח תקווה', 'לינדה טוויל', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'שניידר' FROM ins;

-- excel row 206 | ביקור בית כללי -> general_house_visit | VOL | 'דניאל ולץ' -> 'דניאל ולץ' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-23 16:33:58.682000', '2026-03-23 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 219640364), 'הלכתי איתו ועם אחיות שלו לגינה ליד הבית שיחקנו כדורגל ובמתקנים של הגינה היה כיף הם נהנו ממש', 'לא', NULL, NULL, 'general_house_visit', NULL, 'נהג שהגיע מהעמותה', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'דניאל ולץ', 219640364, 'עומרי בכר' FROM ins;

-- excel row 207 | ביקור בית כללי -> general_house_visit | VOL | 'מעיין מדליון' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-23 19:23:22.250000', '2026-03-23 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'נפגשנו בביתו של החניך 
שיחקנו איתו כל מיני משחקים בבית כגון כדורגל שולחן וכדומה 
ולאחר מכן ירדנו לגינה ושיחקנו כדורגל ואז עלינו בחזרה ואכלנו ארוחת ערב עם הילדים בזמן שהאמא קילחה את בנה 
ולאחר מכן סידרנו את המשחקים והלכנו הביתה', 'האמת שלא, הכל הלך חלק ברוך ה׳', 'המשפחה תשמח לעוד ביקורי בית בתדירות גבוהה', 'היה מצויין', 'general_house_visit', NULL, 'יעקב מרק', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'רפאל דהאן' FROM ins;

-- excel row 208 | ביקור בית כללי -> general_house_visit | VOL | 'דניאל ולץ' -> 'דניאל ולץ' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-23 21:14:35.671000', '2026-03-23 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 219640364), 'באנו אליו הביתה שיחקנו איתו ועם אח שלו כדורגל ומשחקי קופסא הם ממש נהנו היה ממש טןב', 'לא', NULL, NULL, 'general_house_visit', NULL, 'יובל נזרי, נהג מהעמותה', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'דניאל ולץ', 219640364, 'ליאם נעים' FROM ins;

-- excel row 209 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'אביה פרוכטר' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-24 00:44:47.441000', '2026-03-23 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'הלכנו לחדר בריחה ואז ללה טוסקנה ואז לאיי גאמפ ואז לסודוך ואז לאלה', 'לא', NULL, NULL, 'general_volunteer_fun_day', NULL, 'שירה שרון, אורי אריה, שירה זוהר', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'אלה רבה ואדל בורמנבר' FROM ins;

-- excel row 210 | ביקור בבתי חולים -> general_volunteer_hospital_visit | VOL | 'איילת קליין' -> 'איילת קליין' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-24 11:47:18.403000', '2026-03-23 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 218010528), 'שיחקנו בפאזל ומשחקי קופסה', NULL, NULL, NULL, 'general_volunteer_hospital_visit', 'שניידר פתח תקווה', 'נוי סלומון', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'איילת קליין', 218010528, 'ריף - ביקור בשניידר' FROM ins;

-- excel row 211 | ביקור בבתי חולים -> general_volunteer_hospital_visit | VOL | 'תהל ברנע' -> 'תהל ברנע' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-24 12:27:13.993000', '2026-03-24 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 219638632), 'בית חולים היינו איתו', NULL, NULL, NULL, 'general_volunteer_hospital_visit', 'שניידר פתח תקווה', 'רונילי אריאל', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'תהל ברנע', 219638632, 'אור רפאל דהאן' FROM ins;

-- excel row 212 | ביקור בבתי חולים -> general_volunteer_hospital_visit | VOL | 'אביה פרוכטר' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-24 13:27:37.421000', '2026-03-24 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'היינו איתה בבית חולים שיחקנו מלא עשינו יצירות והיא ממש נהנתה וגם אנחנו', NULL, NULL, NULL, 'general_volunteer_hospital_visit', 'שניידר פתח תקווה', 'תמרה שטיבל', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'ריף תפארת שניידר' FROM ins;

-- excel row 213 | ביקור בית כללי -> general_house_visit | VOL | 'עדי שחם' -> 'עדי שחם' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-24 13:38:50.033000', '2026-03-23 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 333569317), 'נפגשנו אצלם בבית ולקחנו את שירה ואחותה לגינה, היה ממש נחמד והעברנו להם את כל האחה״צ', NULL, NULL, NULL, 'general_house_visit', NULL, 'נועה צובל', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'עדי שחם', 333569317, 'שירה קרואני' FROM ins;

-- excel row 214 | ביקור בית כללי -> general_house_visit | VOL | 'שירה צדיק' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-24 14:31:26.407000', '2026-03-23 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'נפגשנו בבית שלה הבאנו אוכל ושיחקנו', NULL, NULL, NULL, 'general_house_visit', NULL, 'יהודית', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'ליאור רוכמן' FROM ins;

-- excel row 215 | ביקור בית כללי -> general_house_visit | VOL | 'יאיר קריגל' -> 'יאיר קריגל' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-24 15:40:18.590000', '2026-03-24 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 332990191), 'שיחקנו עם שליו ואח שלו בפארק והיה סוף הדרך נהננו רצח', NULL, NULL, NULL, 'general_house_visit', NULL, 'יהלי עמר', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'יאיר קריגל', 332990191, 'שליו גולמן' FROM ins;

-- excel row 216 | ביקור בחונכות -> tutorship | TUTOR | 'אורי ולץ' -> 'שי שפק' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-24 16:27:29.746000', '2026-03-23 00:00:00', (SELECT staff_id FROM childsmile_app_tutors WHERE id_id = 444444444), 'היינו בבית שלו ורוב הזמן הוא היה גמור וישן או חסר כוחות', NULL, 'אושר ממש מבואס בכללי ואמא שלו ממש תשמח לכמה שיותר ביקורים בשבילו ולפתוח אותו, ביום של טיפול הוא בכלל ממש ממש מבואס ועושה דווקא כזה שאין לו כוח ודווקא אז כדאי לבוא לבקר אותו ולהרים אותו', NULL, 'tutorship', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_tutor_feedback (feedback_id_id, tutee_name, tutor_name, tutor_id, is_it_your_tutee)
SELECT feedback_id, 'אושר בוגנים', 'שי שפק', 444444444, FALSE FROM ins;

-- excel row 217 | ביקור בית כללי -> general_house_visit | VOL | 'נעה טרויהפט' -> 'נעה טרויהפט' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-24 17:03:29.122000', '2026-03-24 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 218733582), 'היינו עם הילדים בגינה הרבה זמן ואז עלינו הביתה עזרנו לאמא בבית', NULL, NULL, 'תודהרבה!!', 'general_house_visit', NULL, 'נויה בן נתנאל', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'נעה טרויהפט', 218733582, 'מנור כליף' FROM ins;

-- excel row 218 | ביקור בחונכות -> tutorship | TUTOR | 'נועה זוהר' -> 'נועה זוהר' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-24 17:08:19.122000', '2026-03-16 00:00:00', (SELECT staff_id FROM childsmile_app_tutors WHERE id_id = 323083865), 'באנו אליו הביתה לדבר לשחק הבאנו איתנו חטיפים ותרומה של חצי קילו גלידה מגולדה', 'לא ב"ה', NULL, NULL, 'tutorship', NULL, 'הדס סוויסה', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_tutor_feedback (feedback_id_id, tutee_name, tutor_name, tutor_id, is_it_your_tutee)
SELECT feedback_id, 'אדיר שמואל', 'נועה זוהר', 323083865, TRUE FROM ins;

-- excel row 219 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'תמרה שטיבל' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-24 17:34:38.769000', '2026-03-24 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'היינו באולינג ובמשחקייה והיה ממש כיף הם נהנו ממש הבנות', NULL, NULL, NULL, 'general_volunteer_fun_day', NULL, 'לינדה טוויל', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'שירה קרווני' FROM ins;

-- excel row 220 | ביקור בבתי חולים -> general_volunteer_hospital_visit | VOL | 'תמרה שטיבל' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-24 17:37:13.785000', '2026-03-24 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'באנו לבקר אותה בבית חולים והיה ממש כיף היא שמחה שבאנו וזה נתן להורים קצת מנוחה', 'לא', 'כן , ההורים ממש שמחים שבאים לשחק או לבקר את ריף זה עושה לה ממש טוב והיא אוהבת את זה ואני גם ממש אוהבת אותה והתחברנו ממש 🩷', NULL, 'general_volunteer_hospital_visit', 'שניידר פתח תקווה', 'אביה', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'ריף בשניידר' FROM ins;

-- excel row 221 | ביקור בבתי חולים -> general_volunteer_hospital_visit | VOL | 'רוני פריד' -> 'רוני פריד' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-24 18:12:00.156000', '2026-03-24 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 333565026), 'שיחקנו איתה בכל מיני משחקים שהיו לה בחדר ויצאנו איתה לטיול במחלקה.', 'לא', NULL, NULL, 'general_volunteer_hospital_visit', 'שניידר פתח תקווה', 'שקד אדואר ורננה יואלמן', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'רוני פריד', 333565026, 'תפארת אסתר ריף, ביקרנו אותה בשניידר במחלקה אונקולוגית ילדים' FROM ins;

-- excel row 222 | ביקור בית כללי -> general_house_visit | VOL | 'לירון ונגרובר' -> 'לירון ונגרובר' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-24 18:58:56.946000', '2026-03-23 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 333307858), 'נפגשנו בבית שלו במודיעין והלכנו לגינה עם אחותי ואמא שלו ושיחקנו, היה מאוד כיף(:', 'לא, ברוך ה', NULL, NULL, 'general_house_visit', NULL, 'נגה ניר', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'לירון ונגרובר', 333307858, 'יהונתן אליגאל' FROM ins;

-- excel row 223 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'אביה פרוכטר' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-24 19:44:43.106000', '2026-03-24 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'נפגשנו בבית שלהם עשינו טיול בחוות והלכנו לפיצה', NULL, NULL, NULL, 'general_volunteer_fun_day', NULL, 'עמית צוברי, דביר כהן, אהוד וייס', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'נועה אסבן' FROM ins;

-- excel row 224 | ביקור בית כללי -> general_house_visit | VOL | 'אביה פרוכטר' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-24 19:45:31.067000', '2026-03-24 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'באנו אליהם הביתה אחרי זה הלכנו לחווה אחרי זה לאכול', NULL, NULL, NULL, 'general_house_visit', NULL, 'עמית צוברי, אהוד וייס, דביר כהן', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'נועה אסבן ואחים שלה' FROM ins;

-- excel row 225 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'עמית צוברי' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-24 19:45:40.270000', '2026-03-17 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'נסענו לאדל ואחר כך לקחנו את אלה מנתניה והלכנו לשחק באולינג אחרי הבאולינג הלכנו למסעדה 
היה ממש כיף', 'לא', NULL, NULL, 'general_volunteer_fun_day', NULL, 'אהוד וייס', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'אדל ברומבל ואלה רבא' FROM ins;

-- excel row 226 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'עמית צוברי' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-24 19:46:57.300000', '2026-03-24 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'הלכנו אליהם הביתה ואז הלכנו לעשות טיול ביישוב ולחווה ואז לאכול פיצה עם כל המשפחה שלהם והאחים היה מטורף', 'לא', NULL, NULL, 'general_volunteer_fun_day', NULL, 'אהוד וייס, אביה פרוכטר, דביר כהן', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'נועה אסבן' FROM ins;

-- excel row 227 | ביקור בית כללי -> general_house_visit | VOL | 'יהונתן אליגאל' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-24 22:10:52.050000', '2026-03-23 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'נפגשנו אצלו בבית וירדנו איתו ועם אחותו והאמא לפארק', NULL, NULL, NULL, 'general_house_visit', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'יהונתן אליגאל' FROM ins;

-- excel row 228 | ביקור בית כללי -> general_house_visit | VOL | 'נגה ניר' -> 'נגה ניר' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-24 22:13:39.613000', '2026-03-24 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 217808922), 'נפגשנו אצלה בבית שיחקנו עם האחים ,קישטנו עוגיות', NULL, NULL, NULL, 'general_house_visit', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'נגה ניר', 217808922, 'טליה רות צדקיהו' FROM ins;

-- excel row 229 | ביקור בית כללי -> general_house_visit | VOL | 'נהוראי קרואני' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-25 00:13:47.999000', '2026-03-24 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'נפגשו בבית שלהם שיחקנו עם האחים ואיתה קצת דיברנו איתה קצת', NULL, NULL, NULL, 'general_house_visit', NULL, 'דניאל וולץ', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'אלמה סימן טוב' FROM ins;

-- excel row 230 | ביקור בית כללי -> general_house_visit | VOL | 'דניאל ולץ' -> 'דניאל ולץ' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-25 00:15:12.821000', '2026-03-24 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 219640364), 'באנו אליהם היא הייתה על סמים והלכה לישון אז ישבנו דיברנו עם האמא שיחקנו עם האחים שלה היה ממש כיף נראה שאחים שלה ממש נהנו והיה נראה על האמא שזה הקל עליה קצת', 'לא', NULL, NULL, 'general_house_visit', NULL, 'נהוראי קראוני', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'דניאל ולץ', 219640364, 'עלמה סימן טוב' FROM ins;

-- excel row 231 | ביקור בבתי חולים -> general_volunteer_hospital_visit | VOL | 'נעה צובל' -> 'נעה צובל' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-25 01:05:03.819000', '2026-03-24 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 333609261), 'באנו לבית חולים שיחקנו ועשינו שמח', 'לא', NULL, NULL, 'general_volunteer_hospital_visit', 'שניידר פתח תקווה', 'הדר ברם', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'נעה צובל', 333609261, 'ביקור במחלקת מיון ילדים שניידר' FROM ins;

-- excel row 232 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'לינדה טויל' -> 'לינדה טויל' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-25 12:45:11.492000', '2026-03-20 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 342813631), 'הם היו כבר בגינה ואני הצטרפתי יותר מאוחר הבאתי לה חטיפים וכזה, שיחקנו בנדנדות ואז הלכנו למגלשות והיה ממש כיף', NULL, NULL, NULL, 'general_volunteer_fun_day', NULL, 'יובל ו חנה', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'לינדה טויל', 342813631, 'שירה קראוני' FROM ins;

-- excel row 233 | ביקור בבתי חולים -> general_volunteer_hospital_visit | VOL | 'לינדה טויל' -> 'לינדה טויל' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-25 12:47:42.012000', '2026-03-23 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 342813631), 'הגענו אליה בבוקר והבאנו לה משחק של בצק כזה והכנו מלא דברים, ציירתי לה בפנים ואז היא ציירה עלינו? אחרי זה שיחקנו עם הבובה שלה ואז ראיתי איתה סרט היה כיף והיא מאוד שמחה', NULL, NULL, NULL, 'general_volunteer_hospital_visit', 'שניידר פתח תקווה', 'יובל נזרי', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'לינדה טויל', 342813631, 'ריף (בשניידר)' FROM ins;

-- excel row 234 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'לינדה טויל' -> 'לינדה טויל' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-25 12:49:14.719000', '2026-03-23 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 342813631), 'הם היום שעתיים בגינה ואז קראו לי לרדת גם, הבאתי איתי כלב ששירה מאוד אוהבת והיא ושיחקנו איתו כמה דק והיא ממש נהנתה', NULL, NULL, NULL, 'general_volunteer_fun_day', NULL, 'נעה צובל', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'לינדה טויל', 342813631, 'שירה קראוני' FROM ins;

-- excel row 235 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'לינדה טויל' -> 'לינדה טויל' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-25 12:52:11.090000', '2026-03-24 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 342813631), 'באנו אליהם הביתה לקחת אותן ואז הלכנו לבאולינג ממש היה כיף שתינו ברד ואז אכלנו שם כי הם התרימו לנו שם פיצות, אחרי שסיימנו את המשחק הביאו לנו כרטיסים למשחקייה ושיחקנו שם הרבה זמן והיה מאוד כיף, אחרי זה יצאנו ונשארנו לשחק למטה בספסל עד שהגיעו לקחת אותנו', NULL, NULL, NULL, 'general_volunteer_fun_day', NULL, 'תמרה', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'לינדה טויל', 342813631, 'שירה קראוני ואחותה הלל' FROM ins;

-- excel row 236 | ביקור בית כללי -> general_house_visit | VOL | 'תמי הורוביץ' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-25 17:15:12.896000', '2026-03-25 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'ביקור בית ושיחקנו', NULL, NULL, NULL, 'general_house_visit', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'ארז מצופית' FROM ins;

-- excel row 237 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'תמי הורוביץ' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-25 17:15:46.028000', '2026-03-24 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'הלכנו לסטריט סיימ בכפר סבא', NULL, NULL, NULL, 'general_volunteer_fun_day', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'אדל' FROM ins;

-- excel row 238 | ביקור בחונכות -> tutorship | TUTOR | 'שירה רוקח' -> 'שירה רוקח' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-25 21:07:42.226000', '2026-03-25 00:00:00', (SELECT staff_id FROM childsmile_app_tutors WHERE id_id = 219214988), 'הגעתי אליהם הביתה שיחקנו קצת בהוקי ובכדור 
הכנו מצות לפסח, שמענו שירים וראינו סרט על יציאת מצרים', NULL, NULL, NULL, 'tutorship', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_tutor_feedback (feedback_id_id, tutee_name, tutor_name, tutor_id, is_it_your_tutee)
SELECT feedback_id, 'יאיר ישראל עמר', 'שירה רוקח', 219214988, TRUE FROM ins;

-- excel row 239 | ביקור בית כללי -> general_house_visit | VOL | 'תהילה שרון' -> 'תהילה שרון' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-26 08:37:25.556000', '2026-03-22 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 220123400), 'בבית, שיחקנו ועשינו יצירה', NULL, NULL, NULL, 'general_house_visit', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'תהילה שרון', 220123400, 'מנור כליף' FROM ins;

-- excel row 240 | ביקור בית כללי -> general_house_visit | VOL | 'תהילה שרון' -> 'תהילה שרון' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-26 08:39:09.652000', '2026-03-18 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 220123400), 'היינו בבית, הכנו כדורי שוקולד ושיחקנו', NULL, NULL, NULL, 'general_house_visit', NULL, 'שירה צדיק', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'תהילה שרון', 220123400, 'מנור כליף' FROM ins;

-- excel row 241 | ביקור בבתי חולים -> general_volunteer_hospital_visit | VOL | 'אביה פרוכטר' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-26 14:23:09.207000', '2026-03-25 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'באנו אליה לבית חולים היא בהתחלה לא הרגישה כלכך טוב אבל אחרי זה התחילה לחייך ושיחקנו איתה', 'לא', NULL, NULL, 'general_volunteer_hospital_visit', 'שניידר פתח תקווה', 'אביגיל שועי', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'ריף תפארת שניידר' FROM ins;

-- excel row 242 | ביקור בבתי חולים -> general_volunteer_hospital_visit | VOL | 'חנה רנדל' -> 'חנה רנדל' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-26 18:41:23.128000', '2026-03-26 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 329800551), 'באנו אליה לשניידר ודיברנו איתה ועשינו קצת פאזל', NULL, NULL, NULL, 'general_volunteer_hospital_visit', 'שניידר פתח תקווה', 'אביגיל שועי', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'חנה רנדל', 329800551, 'תפארת אסתר ריף שניידר' FROM ins;

-- excel row 243 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'חנה רנדל' -> 'חנה רנדל' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-26 18:42:25.510000', '2026-03-25 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 329800551), 'הלכנו לחדר בריחה ואז לאכול', NULL, NULL, NULL, 'general_volunteer_fun_day', NULL, 'תמרה שטיבל, גם רוני אמיתי', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'חנה רנדל', 329800551, 'ליאור רוכמן' FROM ins;

-- excel row 244 | ביקור בית כללי -> general_house_visit | VOL | 'חנה רנדל' -> 'חנה רנדל' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-26 18:43:14.026000', '2026-03-25 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 329800551), 'באנו אליה ועשינו ריקודים ושיחקנו משחקי קופסא', NULL, NULL, NULL, 'general_house_visit', NULL, 'אביגיל שועי', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'חנה רנדל', 329800551, 'שירה קראווני' FROM ins;

-- excel row 245 | ביקור בית כללי -> general_house_visit | VOL | 'חנה רנדל' -> 'חנה רנדל' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-26 18:45:28.134000', '2026-03-23 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 329800551), 'הלכנו אליו ושיחקנו איתו והלכנו לגינה', NULL, NULL, NULL, 'general_house_visit', NULL, 'נועם יאגודייב', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'חנה רנדל', 329800551, 'מנחם' FROM ins;

-- excel row 246 | ביקור בבתי חולים -> general_volunteer_hospital_visit | VOL | 'חנה רנדל' -> 'חנה רנדל' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-26 18:47:41.617000', '2026-03-23 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 329800551), 'איפרנו אחת את השנייה ושיחקנו בפלסטלינה ועוד משחקים', NULL, NULL, NULL, 'general_volunteer_hospital_visit', 'שניידר פתח תקווה', NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'חנה רנדל', 329800551, 'תפארת אסתר ריף שניידר ביקור במחלקה בשניידר' FROM ins;

-- excel row 247 | ביקור בית כללי -> general_house_visit | VOL | 'רונילי אריאל' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-26 19:02:11.483000', '2026-03-26 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'בבית שלו שיחקנו', NULL, NULL, NULL, 'general_house_visit', NULL, 'תהל ברנע', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'עומרי בכר' FROM ins;

-- excel row 248 | ביקור בית כללי -> general_house_visit | VOL | 'נעה צובל' -> 'נעה צובל' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-26 20:29:37.392000', '2026-03-26 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 333609261), 'נפגשנו בבית של ריף הכנו כדורי שוקולד ושיחקנו', 'ברוך ה היה מושלם', 'אשמח להיות החונכת הקבועה שלה', NULL, 'general_house_visit', NULL, 'שחר פיקאר', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'נעה צובל', 333609261, 'ריף תפארת אסתר שניידר' FROM ins;

-- excel row 249 | ביקור בית כללי -> general_house_visit | VOL | 'עדי שחם' -> 'עדי שחם' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-26 20:39:33.956000', '2026-03-26 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 333569317), 'נפגשנו אצלם בבית, שיחקנו במשחקים שהבאנו איתנו וגם בחצר שלהם, הבאנו גם פיצה והיה ממש נחמד', NULL, NULL, NULL, 'general_house_visit', NULL, 'נויה בן נתנאל, דוד שמש וראובן', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'עדי שחם', 333569317, 'שקד מארי' FROM ins;

-- excel row 250 | ביקור בחונכות -> tutorship | TUTOR | 'יעל תנעמי' -> 'יעל תנעמי' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-26 20:52:44.977000', '2026-03-26 00:00:00', (SELECT staff_id FROM childsmile_app_tutors WHERE id_id = 331545731), 'היינו אצלה ושיחקנו בכל מני דברים והיה ממש טוב', 'לא', NULL, NULL, 'tutorship', NULL, 'שירה קלפוס', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_tutor_feedback (feedback_id_id, tutee_name, tutor_name, tutor_id, is_it_your_tutee)
SELECT feedback_id, 'עופרי זרח', 'יעל תנעמי', 331545731, TRUE FROM ins;

-- excel row 251 | ביקור בית כללי -> general_house_visit | VOL | 'אביה פרוכטר' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-26 21:16:39.395000', '2026-03-26 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'היינו אצלה ואז הלכנו לפארק ואז חזרנו ושיחקנו שש', NULL, NULL, NULL, 'general_house_visit', NULL, 'יובל נזרי', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'שירה קראווני' FROM ins;

-- excel row 252 | ביקור בית כללי -> general_house_visit | VOL | 'איתי פרוידמן' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-26 23:49:49.493000', '2026-03-25 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'שיחקנו בהרבה דברים פיפא כדורסל שם קוד', NULL, NULL, NULL, 'general_house_visit', NULL, 'אהוד וייס, אגם מלכה', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'נועם גבאי' FROM ins;

-- excel row 253 | ביקור בית כללי -> general_house_visit | VOL | 'עדן רחלזון' -> 'עדן רחלזון' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-27 14:02:33.135000', '2026-03-25 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 334903903), 'הלכנו אליה הביתה ושיחקנו איתה ועם אחותה משחקי קופסא וכו', 'לא', 'לא', 'אין', 'general_house_visit', NULL, 'שיר פולק', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'עדן רחלזון', 334903903, 'דנני גולדפלד' FROM ins;

-- excel row 254 | ביקור בית כללי -> general_house_visit | VOL | 'עדן רחלזון' -> 'עדן רחלזון' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-27 14:05:18.945000', '2026-03-25 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 334903903), 'הלכנו אליה הביתה ושיחקנו , דיברנו איתה והיה כיף', 'לא', 'לא', 'אין', 'general_house_visit', NULL, 'שיר פולק', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'עדן רחלזון', 334903903, 'ליאור רוכמן' FROM ins;

-- excel row 255 | ביקור בית כללי -> general_house_visit | VOL | 'שירה בן יצחק' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-29 18:21:44.953000', '2026-03-29 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'היינו בבית שלה והלכנו לגינה לשחק', 'לא', NULL, NULL, 'general_house_visit', NULL, 'חנה רנדל', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'זוהר' FROM ins;

-- excel row 256 | ביקור בית כללי -> general_house_visit | VOL | 'עדו עבאדי' -> 'עדו עבאדי' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-29 20:08:01.057000', '2026-03-29 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 333589687), 'באנו אליו הביתה והלכנו לשחק בגינה', NULL, NULL, NULL, 'general_house_visit', NULL, 'אהוד וייס', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'עדו עבאדי', 333589687, 'עמרי בכר' FROM ins;

-- excel row 257 | ביקור בית כללי -> general_house_visit | VOL | 'דניאל ולץ' -> 'דניאל ולץ' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-29 20:19:53.254000', '2026-03-29 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 219640364), 'באנו אליו שיחקנו איתו כדורגל ובעוד צעצועים שיש לו בבית הוא ממש נהנה היה ממש כיף', 'לא', NULL, NULL, 'general_house_visit', NULL, 'איתי פרוידמן, אביה פרוכטר, נהג דביר כהן', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'דניאל ולץ', 219640364, 'אור רפאל דהאן' FROM ins;

-- excel row 258 | ביקור בית כללי -> general_house_visit | VOL | 'אביה פרוכטר' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-29 21:19:10.413000', '2026-03-29 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'באנו אליהם הביתה שיחקנו קצת אחרי זה הלכנו לפארק', NULL, NULL, NULL, 'general_house_visit', NULL, 'דניאל וולץ, איתי פרוידמן, דביר כהן', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'נוגה אליזבת לב' FROM ins;

-- excel row 259 | ביקור בית כללי -> general_house_visit | VOL | 'אביה פרוכטר' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-29 21:19:59.457000', '2026-03-29 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'באנו אליו הביתה שיחקנו איתו מלא', NULL, NULL, NULL, 'general_house_visit', NULL, 'דניאל וולץ, איתי פרוידמן, דביר כהן', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'אור רפאל דהאן' FROM ins;

-- excel row 260 | ביקור בית כללי -> general_house_visit | VOL | 'דניאל ולץ' -> 'דניאל ולץ' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-29 22:24:53.929000', '2026-03-29 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 219640364), 'באנו אליהם הביתה שיחקנו איתה ועם אח שלה פיפא כדורגל משחקי קופסא יצאנו גם לגינה הם ממש נהנו היה ממש טוב', 'לא', NULL, NULL, 'general_house_visit', NULL, 'איתי פרוידמן, אביה פרוכטר, נהג דביר כהן', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'דניאל ולץ', 219640364, 'נוגה לב' FROM ins;

-- excel row 261 | ביקור בית כללי -> general_house_visit | VOL | 'שירה בן יצחק' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-30 12:33:33.574000', '2026-03-30 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'הכנו כדורי שוקולד', 'לא', NULL, NULL, 'general_house_visit', NULL, 'אווה חיים', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'זוהר' FROM ins;

-- excel row 262 | ביקור בית כללי -> general_house_visit | VOL | 'אביגיל שועי' -> 'אביגיל שועי' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-30 14:00:23.369000', '2026-03-30 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 334431251), 'היינו בגינה ושיחקנו', NULL, NULL, NULL, 'general_house_visit', NULL, 'תהל ברנע', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אביגיל שועי', 334431251, 'שליו' FROM ins;

-- excel row 263 | ביקור בית כללי -> general_house_visit | VOL | 'רוני אמיתי' -> 'רוני אמיתי' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-30 17:52:50.095000', '2026-03-30 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 325048239), 'נפגשנו אצלו בבית הבאתי לו מתנה קליעה למטרה שיחקנו קצת ואז ירדנו עם אופניים לפארק למטה', 'לא', 'לא', NULL, 'general_house_visit', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'רוני אמיתי', 325048239, 'עומרי בכר' FROM ins;

-- excel row 264 | ביקור בית כללי -> general_house_visit | VOL | 'לינוי בר' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-30 18:57:26.901000', '2026-03-30 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'שיחקנו , ציירנו , ואכלנו גלידה', NULL, NULL, NULL, 'general_house_visit', NULL, 'ליאורה קסל', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'ליאור רוכמן' FROM ins;

-- excel row 265 | ביקור בית כללי -> general_house_visit | VOL | 'נועה נויזץ' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-31 16:49:01.353000', '2026-03-30 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'נפגשנו בבית של החניך, שיחקנו כדורגל לגו ועוד משחקים גם עם האחים והיה ממש נחמד', NULL, NULL, NULL, 'general_house_visit', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'רפאל דהאן' FROM ins;

-- excel row 266 | ביקור בית כללי -> general_house_visit | VOL | 'מעיין מדליון' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-31 22:09:05.011000', '2026-03-31 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'שיחקתי עם ילדי המשפחה ועזרתי לאמא במה שצריך', 'לא היו', 'ביקורי הבית ממש עוזרים למשפחה אז כדאי לעשות אצלם כמה שיותר', 'היה אחלה', 'general_house_visit', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'אור רפאל דהאן' FROM ins;

-- excel row 267 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'דניאל ולץ' -> 'דניאל ולץ' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-03-31 22:15:14.052000', '2026-03-31 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 219640364), 'באנו אליו לקחנו אותו לפלנט באולינג ראשל״צ ניסינו גם לקחת את אח שלו אבל הוא לא רצה היה ממש כיף שיחקנו שתי משחקים בבאולינג נראה שאושר ממש נהנה', 'לא', NULL, NULL, 'general_volunteer_fun_day', NULL, 'איתי פרוידמן, איתי רייך', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'דניאל ולץ', 219640364, 'אושר בוגנים' FROM ins;

-- excel row 268 | ביקור בית כללי -> general_house_visit | VOL | 'אביה פרוכטר' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-04-01 14:42:11.525000', '2026-03-31 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'באנו אליה הביתה שיחקנו איתה', NULL, NULL, NULL, 'general_house_visit', NULL, 'חנה רנדל', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'ריף תפארת שניידר' FROM ins;

-- excel row 269 | ביקור בית כללי -> general_house_visit | VOL | 'אביה פרוכטר' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-04-01 14:42:54.531000', '2026-03-31 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'באנו אליה הביתה שיחקנו משחקים', NULL, NULL, NULL, 'general_house_visit', NULL, 'חנה רנדל, תמר גזית', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'הילה יונה' FROM ins;

-- excel row 270 | ביקור בית כללי -> general_house_visit | VOL | 'אביה פרוכטר' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-04-01 14:43:47.221000', '2026-03-31 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'באנו אליה הביתה שיחקנו אחרי זה הלכנו לפארק והיה ממש כיף', NULL, NULL, NULL, 'general_house_visit', NULL, 'חנה רנדל, תמר גזית', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'שירה קרוואני' FROM ins;

-- excel row 271 | ביקור בית כללי -> general_house_visit | VOL | 'איתי פרוידמן' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-04-01 18:27:56.915000', '2026-03-01 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'שיחקנו בבית שלו', NULL, NULL, NULL, 'general_house_visit', NULL, 'דניאל ולץ, אביה פרוכטר, דביר כהן', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'אור רפאל דהן' FROM ins;

-- excel row 272 | ביקור בית כללי -> general_house_visit | VOL | 'איתי פרוידמן' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-04-01 18:29:26.392000', '2026-03-31 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'שיחקנו באולינג לבקשת אמו', NULL, NULL, NULL, 'general_house_visit', NULL, 'דניאל ולץ, איתי רייך', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'אושר בוגנים' FROM ins;

-- excel row 273 | ביקור בית כללי -> general_house_visit | VOL | 'איתי פרוידמן' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-04-01 18:30:10.210000', '2026-03-29 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'שיחקנו בבית שלהם ואז בגינה', NULL, NULL, NULL, 'general_house_visit', NULL, 'דניאל ולץ, אביה פרוכטר, דביר כהן', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'נגה לב (מקווה שצודק בשם משפחה היא מיבנה)' FROM ins;

-- excel row 274 | ביקור בית כללי -> general_house_visit | VOL | 'יהודית אזולאי' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-04-03 15:49:56.491000', '2026-03-23 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'הבאנו לה פסטה ושיחקנו במשחקים', 'לא', NULL, NULL, 'general_house_visit', NULL, 'שירה צדיק', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'ליאור רוכמן' FROM ins;

-- excel row 275 | ביקור בית כללי -> general_house_visit | VOL | 'נטלי פרקש' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-04-03 16:29:08.520000', '2026-03-31 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'נפגשנו אצלה בבית ושיחקנו ואלינו ולאחר מכן ירדנו איתה ועם אחותה לגינה יהיה ממש כיף❤️', 'היה מעולה ❤️', NULL, 'תודה רבה היה מעולה 🙏🏻', 'general_house_visit', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'זוהר ארבל' FROM ins;

-- excel row 276 | יום כיף בחונכות -> tutor_fun_day | TUTOR | 'גבריאלה אובסיוביץ' -> 'שי שפק' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-04-04 20:29:43.957000', '2026-03-18 00:00:00', (SELECT staff_id FROM childsmile_app_tutors WHERE id_id = 444444444), 'מסעדה וסדנת בישול', 'לא', NULL, NULL, 'tutor_fun_day', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_tutor_feedback (feedback_id_id, tutee_name, tutor_name, tutor_id, is_it_your_tutee)
SELECT feedback_id, 'אדל, נועם ברונברג', 'שי שפק', 444444444, TRUE FROM ins;

-- excel row 277 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'גבריאלה אובסיוביץ' -> 'גבריאלה אובסיוביץ' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-04-04 20:34:33.039000', '2026-03-22 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 345194336), 'באולינג ומסעדה', 'לא.', NULL, NULL, 'general_volunteer_fun_day', NULL, 'יובל נזרי, טלי סנדברנד', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'גבריאלה אובסיוביץ', 345194336, 'מייקי, אדל ונועם ברונברג' FROM ins;

-- excel row 278 | יום כיף בחונכות -> tutor_fun_day | TUTOR | 'גבריאלה אובסיוביץ' -> 'שי שפק' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-04-04 20:36:19.106000', '2026-03-25 00:00:00', (SELECT staff_id FROM childsmile_app_tutors WHERE id_id = 444444444), 'סדנת בישול וגלידה', NULL, NULL, NULL, 'tutor_fun_day', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_tutor_feedback (feedback_id_id, tutee_name, tutor_name, tutor_id, is_it_your_tutee)
SELECT feedback_id, 'אדל ברונברג', 'שי שפק', 444444444, TRUE FROM ins;

-- excel row 279 | ביקור בית כללי -> general_house_visit | VOL | 'גבריאלה אובסיוביץ' -> 'גבריאלה אובסיוביץ' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-04-04 20:38:45.923000', '2026-03-31 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 345194336), 'ביקור בית וגלידה', NULL, NULL, NULL, 'general_house_visit', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'גבריאלה אובסיוביץ', 345194336, 'ליאור רוכמן' FROM ins;

-- excel row 280 | ביקור בית כללי -> general_house_visit | VOL | 'הדס צ׳יסמדיה' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-04-06 17:34:26.756000', '2026-03-31 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'נפגשנו בבית של מנור, שיחקנו איתה ועם אח שלה, אחכ גם ירדנו לגינה:)', 'לא', '.', NULL, 'general_house_visit', NULL, 'תהילה פינקלשטיין', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'מנור כליף' FROM ins;

-- excel row 281 | ביקור בית כללי -> general_house_visit | VOL | 'דניאל ולץ' -> 'דניאל ולץ' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-04-06 23:38:51.542000', '2026-04-06 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 219640364), 'באנו אליו הביתה שיחקנו איתו פיפא הוא ממש נהנה התחיל לדבר הרבה יותר היה כיף', 'לא', NULL, NULL, 'general_house_visit', NULL, 'איתי פרוידמן, איתי רייך', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'דניאל ולץ', 219640364, 'אושר בוגנים' FROM ins;

-- excel row 282 | ביקור בית כללי -> general_house_visit | VOL | 'לינוי בר' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-04-09 17:21:13.624000', '2026-04-09 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'נפגשנו בבית של זוהר קראנו ספרים ושיחקנו קצת ואחר כך הלכנו לגינה', NULL, NULL, NULL, 'general_house_visit', NULL, 'טליה ג׳ובאני', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'זוהר ארבל' FROM ins;

-- excel row 283 | ביקור בבתי חולים -> general_volunteer_hospital_visit | VOL | 'הלל כהן' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-04-10 00:13:04.739000', '2026-04-10 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'חילקנו אוכל והיה טובבב', NULL, NULL, NULL, 'general_volunteer_hospital_visit', 'שניידר פתח תקווה', NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'שניידר אונקולוגית' FROM ins;

-- excel row 284 | יום כיף בחונכות -> tutor_fun_day | TUTOR | 'נויה דוידזון' -> 'נויה דוידזון' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-04-12 21:31:05.265000', '2026-04-12 00:00:00', (SELECT staff_id FROM childsmile_app_tutors WHERE id_id = 331620385), 'היינו בבאולינג', NULL, NULL, NULL, 'tutor_fun_day', NULL, 'רוני רוזנבלום', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_tutor_feedback (feedback_id_id, tutee_name, tutor_name, tutor_id, is_it_your_tutee)
SELECT feedback_id, 'תפארת אסתר ריף', 'נויה דוידזון', 331620385, TRUE FROM ins;

-- excel row 285 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'נועם ברששת' -> 'נועם ברששת' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-04-12 22:29:54.248000', '2026-04-12 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 335835765), 'אני ואורי נפגשנו לאחר מכן אספנו את אדל ואז נסענו לאסוף את מנחם ואחים שלו ואז הלכנו לבאולינג במגדלי B.S.R ושם פגשנו את רוני ואת נויה ואת ריף שיחקנו בבאולינג ואז עברנו למשחקייה של הבאולינג ולאחר מכן שמנו את מנחם והאחים שלו בבית והלכנו עם אדל לאכול בקפה עלמא', 'לא', 'לא', NULL, 'general_volunteer_fun_day', NULL, 'אוריה אריה, רוני רוזנבלום, נויה דוידזון', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'נועם ברששת', 335835765, 'מנחם צח ריף שניידר ואדל ברומברג' FROM ins;

-- excel row 286 | ביקור בבתי חולים -> general_volunteer_hospital_visit | VOL | 'הלל כהן' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-04-13 00:37:35.199000', '2026-04-12 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'חילקתי אוכל במחלקה', NULL, NULL, NULL, 'general_volunteer_hospital_visit', 'שניידר פתח תקווה', NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'שניידר' FROM ins;

-- excel row 287 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'שירה שרון' -> 'שירה שרון' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-04-13 19:56:56.131000', '2026-04-13 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 218045243), 'חגגתי לה יום הולדת והלכנו לים', 'לא', NULL, NULL, 'general_volunteer_fun_day', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'שירה שרון', 218045243, 'אלה רבה' FROM ins;

-- excel row 288 | ביקור בבתי חולים -> general_volunteer_hospital_visit | VOL | 'הלל כהן' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-04-15 12:14:43.102000', '2026-04-14 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'חילקתי אוכל למשפחות', NULL, NULL, NULL, 'general_volunteer_hospital_visit', 'שניידר פתח תקווה', NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'שניידר' FROM ins;

-- excel row 289 | ביקור בית כללי -> general_house_visit | VOL | 'הלל כהן' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-04-15 12:15:19.964000', '2026-04-15 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'שיחקנו ביחד ודיברתי עם אמא שלו', NULL, NULL, NULL, 'general_house_visit', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'ארז' FROM ins;

-- excel row 290 | ביקור בית כללי -> general_house_visit | VOL | 'הלל כהן' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-04-15 17:18:48.254000', '2026-04-15 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'הלכנו לגינה והיה ממש כיף', NULL, NULL, NULL, 'general_house_visit', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'טוהר' FROM ins;

-- excel row 291 | ביקור בבתי חולים -> general_volunteer_hospital_visit | VOL | 'יובל נזרי' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-04-16 18:09:40.247000', '2026-03-23 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'הגענו לבית חולים ושיחקנו איתה', 'לא', NULL, NULL, 'general_volunteer_hospital_visit', 'שניידר פתח תקווה', 'לינדה טוויל', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'ריף' FROM ins;

-- excel row 292 | ביקור בית כללי -> general_house_visit | VOL | 'יובל נזרי' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-04-16 18:10:43.189000', '2026-03-23 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'הגענו לבית שלו שיחקנו כדורגל שחמט ובמחשב', 'לא', 'לא', NULL, 'general_house_visit', NULL, 'דניאל ולץ', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'עילי' FROM ins;

-- excel row 293 | יום כיף בחונכות -> tutor_fun_day | TUTOR | 'יובל נזרי' -> 'יובל נזרי' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-04-16 18:13:05.056000', '2026-04-07 00:00:00', (SELECT staff_id FROM childsmile_app_tutors WHERE id_id = 334349255), 'אספנו אותו נסענו לקרטינג בראשלצ ואז לאכול גלידה בפתח תקווה', 'לא', 'לא', NULL, 'tutor_fun_day', NULL, 'דביר כהן', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_tutor_feedback (feedback_id_id, tutee_name, tutor_name, tutor_id, is_it_your_tutee)
SELECT feedback_id, 'שמעון טימסית', 'יובל נזרי', 334349255, TRUE FROM ins;

-- excel row 294 | ביקור בבתי חולים -> general_volunteer_hospital_visit | VOL | 'יובל נזרי' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-04-16 18:16:01.519000', '2026-04-14 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'הגעתי לבית חולים עם גלידה שהתרמתי מגולדה ושיחקתי איתה במחלקה', 'לא', 'יש להם חונכת קבועה בלהושיט יד שעוזבת בקרוב, והאמא רוצה חונכת קבועה שתקח אותה כמה שיותר', NULL, 'general_volunteer_hospital_visit', 'שניידר פתח תקווה', NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'שירה קרוואני' FROM ins;

-- excel row 295 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'מורן עזיז' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-04-16 22:04:59.055000', '2026-04-16 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'אספתי אותו ואת נדב אחיו מביתם ונסענו לקניון ערים בכפר סבא , טיילנו שם ואכלנו ארוחה במקדולנס', 'לא', NULL, NULL, 'general_volunteer_fun_day', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'ניתאי איתן' FROM ins;

-- excel row 296 | ביקור בית כללי -> general_house_visit | VOL | 'דניאל ולץ' -> 'דניאל ולץ' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-04-17 11:59:27.310000', '2026-04-16 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 219640364), 'באנו אליהם הביתה שיחקנו עם אמי ישבנו דיברנו עם אמא שלה היה טוב הם ממש נהנו', 'לא', NULL, NULL, 'general_house_visit', NULL, 'רננה בן ציון, אור פלזנר', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'דניאל ולץ', 219640364, 'אמי חקשור' FROM ins;

-- excel row 297 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'חנה רנדל' -> 'חנה רנדל' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-04-17 14:17:37.210000', '2026-04-09 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 329800551), 'הלכנו לבאולינג', NULL, NULL, NULL, 'general_volunteer_fun_day', NULL, 'יובל נזרי', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'חנה רנדל', 329800551, 'שירה קראווני וריף' FROM ins;

-- excel row 298 | ביקור בית כללי -> general_house_visit | VOL | 'חנה רנדל' -> 'חנה רנדל' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-04-17 14:18:52.941000', '2026-04-09 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 329800551), 'באתי אליה הביתה ושיחקנו קצת משחקי קלפים וכזה', NULL, NULL, NULL, 'general_house_visit', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'חנה רנדל', 329800551, 'הילה יונה' FROM ins;

-- excel row 299 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'יעלה אביאור' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-04-17 15:37:54.844000', '2026-04-15 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'יצאנו לניו דלי בישפרו מודיעין יחד עם הילדה (מילה) 2 אחיות והאמא. אחרי זה המשכנו לבאולינג. היה מעולה ממש', NULL, 'אם הם ירצו שוב באהבה אני אשמח לבוא:)', NULL, 'general_volunteer_fun_day', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'מילה שילו' FROM ins;

-- excel row 300 | ביקור בית כללי -> general_house_visit | VOL | 'עדי רוקח' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-04-19 18:57:42.779000', '2026-04-15 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'נפגשנו אצלה היה מהמם שיחקנו מלא', NULL, NULL, NULL, 'general_house_visit', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'אביגיל נסימיאן' FROM ins;

-- excel row 301 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'עדי רוקח' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-04-19 18:59:08.177000', '2026-04-05 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'אספנו אותה מהבית ואז הלכנו לאכול בקפה גן סיפור ומשם הלכנו אליה הביתה והיה מושלם', NULL, NULL, NULL, 'general_volunteer_fun_day', NULL, 'שירה רוקח', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'הילה יונה' FROM ins;

-- excel row 302 | ביקור בית כללי -> general_house_visit | VOL | 'עדי רוקח' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-04-21 10:48:05.738000', '2026-04-20 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'היינו אצלה בבית ושיחקנו 
4 שעות בערך', NULL, NULL, NULL, 'general_house_visit', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'ריף שניידר' FROM ins;

-- excel row 303 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'נועה נויזץ' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-04-22 22:27:48.458000', '2026-04-20 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'הלכנו עם האמא, האח והבת דודה של הילדה לווייטפול פתח תקווה מתחם גימבורי ואחר כך אכלנו במקדונלדס. היה ממש נחמד וכיף', 'רק זה שהאמא שעה לפני היציאה ביקשה לצרף את האחיינית שלה והמקום לא הסכים להתרים גם לה..', NULL, NULL, 'general_volunteer_fun_day', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'מנור כליף' FROM ins;

-- excel row 304 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'עדי שחם' -> 'עדי שחם' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-04-23 20:51:36.007000', '2026-04-23 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 333569317), 'אספנו אותה מהבית והלכנו לאכול במסעדה בליקר בייקרי, היה ממש נחמד, שירה נהנתה מאוד', NULL, NULL, NULL, 'general_volunteer_fun_day', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'עדי שחם', 333569317, 'שירה קרואני' FROM ins;

-- excel row 305 | ביקור בית כללי -> general_house_visit | VOL | 'אביה פרוכטר' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-04-24 14:22:05.910000', '2026-04-23 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'היינו אצלה בבית אחרי זה הלכנו לגינה', NULL, NULL, NULL, 'general_house_visit', NULL, 'הדר ברם', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'ריף שניידר' FROM ins;

-- excel row 306 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'שירה צדיק' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-04-27 19:25:49.581000', '2026-04-27 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'נפגשנו בבאולינג בסר והכלנו לאכול ברובן מסעדה בשרית', NULL, NULL, NULL, 'general_volunteer_fun_day', NULL, 'תהילה שרון', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'עומרי' FROM ins;

-- excel row 307 | ביקור בחונכות -> tutorship | TUTOR | 'שקד פלד' -> 'שקד פלד' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-04-28 16:05:49.376000', '2026-04-17 00:00:00', (SELECT staff_id FROM childsmile_app_tutors WHERE id_id = 331646695), 'נפגשנו ההית שלו ושיחקנו', 'לא', NULL, NULL, 'tutorship', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_tutor_feedback (feedback_id_id, tutee_name, tutor_name, tutor_id, is_it_your_tutee)
SELECT feedback_id, 'אלון גליק', 'שקד פלד', 331646695, TRUE FROM ins;

-- excel row 308 | ביקור בחונכות -> tutorship | TUTOR | 'שקד פלד' -> 'שקד פלד' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-04-28 16:06:28.050000', '2026-04-24 00:00:00', (SELECT staff_id FROM childsmile_app_tutors WHERE id_id = 331646695), 'שיחקנו בבית שלו', 'לא', NULL, NULL, 'tutorship', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_tutor_feedback (feedback_id_id, tutee_name, tutor_name, tutor_id, is_it_your_tutee)
SELECT feedback_id, 'אלון גליק', 'שקד פלד', 331646695, TRUE FROM ins;

-- excel row 309 | ביקור בחונכות -> tutorship | TUTOR | 'הלל כהן' -> 'הלל כהן' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-04-28 19:00:03.714000', '2026-04-28 00:00:00', (SELECT staff_id FROM childsmile_app_tutors WHERE id_id = 331407825), 'הלכתי עם האחים לגינה והיה טוב', NULL, NULL, NULL, 'tutorship', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_tutor_feedback (feedback_id_id, tutee_name, tutor_name, tutor_id, is_it_your_tutee)
SELECT feedback_id, 'שרה כלפון', 'הלל כהן', 331407825, TRUE FROM ins;

-- excel row 310 | ביקור בחונכות -> tutorship | TUTOR | 'שירה רוקח' -> 'שירה רוקח' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-04-28 20:26:54.689000', '2026-04-28 00:00:00', (SELECT staff_id FROM childsmile_app_tutors WHERE id_id = 219214988), 'נפגשנו אצלם בבית, יצאנו לשחק קצת בגינה ליד הבית שלהם ואז חזרנו הביתה ושיחקנו קצת בכדור', NULL, NULL, NULL, 'tutorship', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_tutor_feedback (feedback_id_id, tutee_name, tutor_name, tutor_id, is_it_your_tutee)
SELECT feedback_id, 'חיים יאיר ישראל עמר', 'שירה רוקח', 219214988, TRUE FROM ins;

-- excel row 311 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'חנה רנדל' -> 'חנה רנדל' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-04-28 21:00:11.782000', '2026-04-28 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 329800551), 'הלכנו לבאולינג ואחרי זה לאכול בלחם בשר', NULL, NULL, NULL, 'general_volunteer_fun_day', NULL, 'לינדה טוויל', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'חנה רנדל', 329800551, 'תפארת ריף' FROM ins;

-- excel row 312 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'אביה פרוכטר' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-04-28 22:23:40.028000', '2026-04-28 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'היינו איתם בבאולינג ואז בפיצה', 'לא', NULL, NULL, 'general_volunteer_fun_day', NULL, 'אהוד וייס, עמית צוברי', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'משפחת אסבן ומשפחת בן חמו' FROM ins;

-- excel row 313 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'תמר צאל' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-04-28 23:03:19.303000', '2026-04-28 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'הלכנו למשחקייה של משחקי וידיאו ואחרי זה למסעדה', 'לא', NULL, NULL, 'general_volunteer_fun_day', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'אדל ברומברג' FROM ins;

-- excel row 314 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'עמית צוברי' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-04-29 11:14:37.322000', '2026-04-28 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'לקחנו אותם למשחקייה ובאולינג ולאחר מכן הלכנו לפיצה היה ממש כיף', NULL, NULL, NULL, 'general_volunteer_fun_day', NULL, 'אהוד וייס, אביה פרוכטר', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'נועה אסבן ואורי בן חמו' FROM ins;

-- excel row 315 | ביקור בחונכות -> tutorship | TUTOR | 'יעל תנעמי' -> 'יעל תנעמי' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-05-01 13:22:22.757000', '2026-04-29 00:00:00', (SELECT staff_id FROM childsmile_app_tutors WHERE id_id = 331545731), 'ביקרנו אותה בבית אחרי הניתוח שעברה והבאנו לה גלידה ושיחקנו איתה', NULL, NULL, NULL, 'tutorship', NULL, 'שירה קלפוס', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_tutor_feedback (feedback_id_id, tutee_name, tutor_name, tutor_id, is_it_your_tutee)
SELECT feedback_id, 'עופרי זרח', 'יעל תנעמי', 331545731, TRUE FROM ins;

-- excel row 316 | יום כיף בחונכות -> tutor_fun_day | TUTOR | 'עדי רוקח' -> 'עדי רוקח' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-05-03 09:48:08.581000', '2026-04-30 00:00:00', (SELECT staff_id FROM childsmile_app_tutors WHERE id_id = 329512255), 'הלכנו למסעדה ואחרי זה לים. היה מושלם', NULL, NULL, NULL, 'tutor_fun_day', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_tutor_feedback (feedback_id_id, tutee_name, tutor_name, tutor_id, is_it_your_tutee)
SELECT feedback_id, 'מיה ניסים', 'עדי רוקח', 329512255, TRUE FROM ins;

-- excel row 317 | ביקור בית כללי -> general_house_visit | VOL | 'עדי רוקח' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-05-03 09:49:22.113000', '2026-04-29 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'נסעתי אליו לנהריה והיינו אצלו בבית ושיחקנו והייתי עם האמא והם היו צריכים את זה והיה מהמם', NULL, NULL, NULL, 'general_house_visit', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'סיני לובינסקי' FROM ins;

-- excel row 318 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'רוני אמיתי' -> 'רוני אמיתי' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-05-03 19:05:36.444000', '2026-05-03 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 325048239), 'נפגשנו אצלה בבית שיחקנו ואז יצאנו לאכול', 'לא', 'לא', NULL, 'general_volunteer_fun_day', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'רוני אמיתי', 325048239, 'ליאור רוכמן' FROM ins;

-- excel row 319 | יום כיף בחונכות -> tutor_fun_day | TUTOR | 'גבריאלה אובסיוביץ' -> 'שי שפק' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-05-03 19:08:16.701000', '2026-04-02 00:00:00', (SELECT staff_id FROM childsmile_app_tutors WHERE id_id = 444444444), 'שופינג', 'לא', NULL, NULL, 'tutor_fun_day', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_tutor_feedback (feedback_id_id, tutee_name, tutor_name, tutor_id, is_it_your_tutee)
SELECT feedback_id, 'אדל ברומברג', 'שי שפק', 444444444, TRUE FROM ins;

-- excel row 320 | ביקור בבתי חולים -> general_volunteer_hospital_visit | VOL | 'סופיה שעיו' -> 'סופיה שעיו' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-05-03 19:11:55.178000', '2026-05-03 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 348392184), 'שניידר', NULL, NULL, NULL, 'general_volunteer_hospital_visit', 'שניידר פתח תקווה', 'אריאל אובסיוביץ, גבריאלה אובסיוביץ', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'סופיה שעיו', 348392184, 'בית חולים שניידר' FROM ins;

-- excel row 321 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'חנה רנדל' -> 'חנה רנדל' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-05-04 18:54:08.942000', '2026-05-04 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 329800551), 'הלכנו לקארטינג ואז למסעדה', NULL, NULL, NULL, 'general_volunteer_fun_day', NULL, 'יובל נזרי', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'חנה רנדל', 329800551, 'אדל ואורי אח של חניך מחולון' FROM ins;

-- excel row 322 | ביקור בית כללי -> general_house_visit | VOL | 'דניאל ולץ' -> 'דניאל ולץ' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-05-06 00:46:52.119000', '2026-05-05 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 219640364), 'באנו אליו ראינו משחק ליגת האלופות היה ממש טוב', 'לא', NULL, NULL, 'general_house_visit', NULL, 'איתי רייך, איתי פרוידמן', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'דניאל ולץ', 219640364, 'אושר בוגנים' FROM ins;

-- excel row 323 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'הלל כהן' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-05-06 18:26:46.350000', '2026-05-06 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'הלכנו לליזר טאג והלכנו לאכול', NULL, NULL, NULL, 'general_volunteer_fun_day', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'ארז ונועם' FROM ins;

-- excel row 324 | יום כיף בחונכות -> tutor_fun_day | TUTOR | 'הלל כהן' -> 'הלל כהן' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-05-06 21:20:32.855000', '2026-05-06 00:00:00', (SELECT staff_id FROM childsmile_app_tutors WHERE id_id = 331407825), 'הכלנו כול האחים שלה למסעדה והיה מושלם', NULL, NULL, NULL, 'tutor_fun_day', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_tutor_feedback (feedback_id_id, tutee_name, tutor_name, tutor_id, is_it_your_tutee)
SELECT feedback_id, 'שרה כלפון', 'הלל כהן', 331407825, TRUE FROM ins;

-- excel row 325 | ביקור בחונכות -> tutorship | TUTOR | 'נויה דוידזון' -> 'נויה דוידזון' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-05-07 15:25:23.128000', '2026-05-06 00:00:00', (SELECT staff_id FROM childsmile_app_tutors WHERE id_id = 331620385), 'שיחקנו איתה בבית שלה', NULL, NULL, NULL, 'tutorship', NULL, 'רוני רוזנבלום', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_tutor_feedback (feedback_id_id, tutee_name, tutor_name, tutor_id, is_it_your_tutee)
SELECT feedback_id, 'תפארת אסתר ריף', 'נויה דוידזון', 331620385, TRUE FROM ins;

-- excel row 326 | ביקור בבתי חולים -> general_volunteer_hospital_visit | VOL | 'הלל כהן' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-05-07 22:33:58.158000', '2026-05-07 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'חילקנו אוכל', NULL, NULL, NULL, 'general_volunteer_hospital_visit', 'שניידר פתח תקווה', NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'שניידר' FROM ins;

-- excel row 327 | ביקור בבתי חולים -> general_volunteer_hospital_visit | VOL | 'הלל כהן' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-05-10 20:17:32.430000', '2026-05-09 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'חילקתי אוכל', NULL, NULL, NULL, 'general_volunteer_hospital_visit', 'שניידר פתח תקווה', NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'שניידר' FROM ins;

-- excel row 328 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'תהילה שרון' -> 'תהילה שרון' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-05-11 10:03:42.314000', '2026-05-10 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 220123400), 'היינו בבורגרס בר ואחר כך הלכנו לחדר בריחה היה ממש כיף', 'לא', NULL, NULL, 'general_volunteer_fun_day', NULL, 'שירה צדיק', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'תהילה שרון', 220123400, 'אדל' FROM ins;

-- excel row 329 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'דניאל ולץ' -> 'דניאל ולץ' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-05-11 20:05:41.978000', '2026-05-11 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 219640364), 'לקחנו אותם לבאולינג בנתניה ואז הלכנו לאכול בסודוך בנתניה היה כיף נראה שהן נהנו', 'לא', NULL, NULL, 'general_volunteer_fun_day', NULL, 'אורי אריה', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'דניאל ולץ', 219640364, 'אלה רבה ואדל ברומברג' FROM ins;

-- excel row 330 | יום כיף בחונכות -> tutor_fun_day | TUTOR | 'לינוי בר' -> 'שי שפק' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-05-11 21:26:09.585000', '2026-05-11 00:00:00', (SELECT staff_id FROM childsmile_app_tutors WHERE id_id = 444444444), 'היינו בבאולינג ובקניון', NULL, NULL, NULL, 'tutor_fun_day', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_tutor_feedback (feedback_id_id, tutee_name, tutor_name, tutor_id, is_it_your_tutee)
SELECT feedback_id, 'תמר תורג׳מן', 'שי שפק', 444444444, TRUE FROM ins;

-- excel row 331 | ביקור בבתי חולים -> general_volunteer_hospital_visit | VOL | 'הלל כהן' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-05-12 18:23:20.194000', '2026-05-12 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'חילקתי גלידה', NULL, NULL, NULL, 'general_volunteer_hospital_visit', 'שניידר פתח תקווה', NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'שניידר' FROM ins;

-- excel row 332 | ביקור בחונכות -> tutorship | TUTOR | 'נויה דוידזון' -> 'נויה דוידזון' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-05-13 16:22:54.431000', '2026-05-13 00:00:00', (SELECT staff_id FROM childsmile_app_tutors WHERE id_id = 331620385), 'היינו בפארק ושיחקנו', NULL, NULL, NULL, 'tutorship', NULL, 'רוני רוזנבלום, אורי בורקש', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_tutor_feedback (feedback_id_id, tutee_name, tutor_name, tutor_id, is_it_your_tutee)
SELECT feedback_id, 'תפארת אסתר ריף שניידר', 'נויה דוידזון', 331620385, TRUE FROM ins;

-- excel row 333 | ביקור בבתי חולים -> general_volunteer_hospital_visit | VOL | 'הלל כהן' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-05-15 17:01:13.580000', '2026-05-15 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'חילקתי פיצות', NULL, NULL, NULL, 'general_volunteer_hospital_visit', 'שניידר פתח תקווה', NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'שניידר' FROM ins;

-- excel row 334 | ביקור בחונכות -> tutorship | TUTOR | 'שקד פלד' -> 'שקד פלד' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-05-17 00:30:14.772000', '2026-05-11 00:00:00', (SELECT staff_id FROM childsmile_app_tutors WHERE id_id = 331646695), 'שיחקנו והכנו עוגה🩷', 'לא', NULL, NULL, 'tutorship', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_tutor_feedback (feedback_id_id, tutee_name, tutor_name, tutor_id, is_it_your_tutee)
SELECT feedback_id, 'אלון גליק', 'שקד פלד', 331646695, TRUE FROM ins;

-- excel row 335 | ביקור בית כללי -> general_house_visit | VOL | 'לא ידוע' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-05-17 04:24:44.715000', '2026-05-11 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'בבית', NULL, NULL, NULL, 'general_house_visit', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'מוריאל' FROM ins;

-- excel row 336 | ביקור בית כללי -> general_house_visit | VOL | 'רננה בן ציון' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-05-17 04:27:13.595000', '2026-04-12 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'בבית', NULL, NULL, NULL, 'general_house_visit', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'מוריאל' FROM ins;

-- excel row 337 | ביקור בית כללי -> general_house_visit | VOL | 'רננה בן ציון' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-05-17 04:27:41.945000', '2026-04-16 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'בבית', NULL, NULL, NULL, 'general_house_visit', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'אמי חקשור' FROM ins;

-- excel row 338 | ביקור בבתי חולים -> general_volunteer_hospital_visit | VOL | 'הלל כהן' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-05-18 15:54:38.770000', '2026-05-18 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'חילקתי פלאפל', NULL, NULL, NULL, 'general_volunteer_hospital_visit', 'שניידר פתח תקווה', NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'שניידר' FROM ins;

-- excel row 339 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'עדי שחם' -> 'עדי שחם' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-05-18 20:00:48.659000', '2026-05-18 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 333569317), 'נפגשנו בקניון, אכלנו במסעדת המבורגרים, היה ממש כיף', NULL, NULL, NULL, 'general_volunteer_fun_day', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'עדי שחם', 333569317, 'שירה קרואני' FROM ins;

-- excel row 340 | ביקור בחונכות -> tutorship | TUTOR | 'נויה דוידזון' -> 'נויה דוידזון' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-05-19 19:50:36.406000', '2026-05-19 00:00:00', (SELECT staff_id FROM childsmile_app_tutors WHERE id_id = 331620385), 'היינו אצלה בבית שיחקנו והכנו כדורי שוקולד', NULL, NULL, NULL, 'tutorship', NULL, 'רוני רוזנבלום', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_tutor_feedback (feedback_id_id, tutee_name, tutor_name, tutor_id, is_it_your_tutee)
SELECT feedback_id, 'תפארת אסתר ריף שניידר', 'נויה דוידזון', 331620385, TRUE FROM ins;

-- excel row 341 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'שירה שרון' -> 'שירה שרון' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-05-19 22:02:06.032000', '2026-05-19 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 218045243), 'יצאנו לאכול ולבאולינג', NULL, NULL, NULL, 'general_volunteer_fun_day', NULL, 'הלל קרמר', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'שירה שרון', 218045243, 'שירה קראווני' FROM ins;

-- excel row 342 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'שירה צדיק' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-05-19 23:03:20.353000', '2026-05-18 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'נסענו למקום פרטי שמכין בשר ואחר כך הלכנו לחדר בריחה', NULL, NULL, NULL, 'general_volunteer_fun_day', NULL, 'יהודית', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'ליאור' FROM ins;

-- excel row 343 | יום כיף בחונכות -> tutor_fun_day | TUTOR | 'יובל נזרי' -> 'יובל נזרי' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-05-20 10:58:01.914000', '2010-05-19 00:00:00', (SELECT staff_id FROM childsmile_app_tutors WHERE id_id = 334349255), 'אורי אסף אותנו נסענו לגמזו לטיול ריינג׳רים ומתחם פיטבול ומשם נסענו למסעדה בפתח תקווה', 'לא', 'למה', NULL, 'tutor_fun_day', NULL, 'אורי אריה', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_tutor_feedback (feedback_id_id, tutee_name, tutor_name, tutor_id, is_it_your_tutee)
SELECT feedback_id, 'שמעון טימסית ומייקי', 'יובל נזרי', 334349255, TRUE FROM ins;

-- excel row 344 | ביקור בית כללי -> general_house_visit | VOL | 'לינוי בר' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-05-20 15:46:51.114000', '2026-05-20 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'נפגשנו בבית שלה היינו איתה ירדנו לפארק ואכלנו', 'לא', NULL, NULL, 'general_house_visit', NULL, 'רננה בן ציון', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'מנור כליף' FROM ins;

-- excel row 345 | ביקור בחונכות -> tutorship | TUTOR | 'יעקב מרק' -> 'יעקב מרק' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-05-21 01:45:42.573000', '2026-05-20 00:00:00', (SELECT staff_id FROM childsmile_app_tutors WHERE id_id = 219998226), 'הלכנו לבית של החניך וירדנו איתו לשחק במגרש', NULL, NULL, NULL, 'tutorship', NULL, 'מעיין מדליון, אליה טאוב', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_tutor_feedback (feedback_id_id, tutee_name, tutor_name, tutor_id, is_it_your_tutee)
SELECT feedback_id, 'אור רפאל', 'יעקב מרק', 219998226, TRUE FROM ins;

-- excel row 346 | ביקור בבתי חולים -> general_volunteer_hospital_visit | VOL | 'הלל כהן' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-05-21 16:10:06.844000', '2026-05-21 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'חילקתי פיצות', NULL, NULL, NULL, 'general_volunteer_hospital_visit', 'שניידר פתח תקווה', NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'שניידר' FROM ins;

-- excel row 347 | ביקור בית כללי -> general_house_visit | VOL | 'יובל נזרי' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-05-24 00:48:46.315000', '2026-05-21 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'אספנו אותם הלכנו איתם לגינה ושיחקנו איתם בבית', 'לא', NULL, NULL, 'general_house_visit', NULL, 'לינדה טוויל', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'הלל, אביחי שירה קרוואני' FROM ins;

-- excel row 348 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'אביה פרוכטר' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-05-24 21:23:49.974000', '2026-05-24 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'באתי אליה הביתה אחרי זה הלכנו לפארק ואכלנו פיצה אחרי זה חזרנו הביתה ושיחקנו', NULL, NULL, NULL, 'general_volunteer_fun_day', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'שירה קראווני' FROM ins;

-- excel row 349 | ביקור בבתי חולים -> general_volunteer_hospital_visit | VOL | 'הלל כהן' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-05-24 22:39:45.600000', '2026-05-24 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'חלקתי גלידה וכריכים', NULL, NULL, NULL, 'general_volunteer_hospital_visit', 'שניידר פתח תקווה', NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'שניידר' FROM ins;

-- excel row 350 | ביקור בבתי חולים -> general_volunteer_hospital_visit | VOL | 'הלל כהן' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-05-25 22:00:00.722000', '2026-05-25 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'חילקתי פיצה במחלקה', NULL, NULL, NULL, 'general_volunteer_hospital_visit', 'שניידר פתח תקווה', NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'שניידר' FROM ins;

-- excel row 351 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'דניאל ולץ' -> 'דניאל ולץ' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-05-25 23:28:39.567000', '2026-05-25 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 219640364), 'לקחנו אותן לקרטינג בנתניה ואז למסעדת בשרים בנתניה היה ממש טוב הם ממש נהנו באמצע אדל גילתה על חברה שלה שנפטרה אז הייתה קצת בדיכאון אבל עבר', 'לא', NULL, NULL, 'general_volunteer_fun_day', NULL, 'אורי אריה', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'דניאל ולץ', 219640364, 'אלה רבה ואדל ברומברג' FROM ins;

-- excel row 352 | ביקור בית כללי -> general_house_visit | VOL | 'מעיין מדליון' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-05-26 10:42:50.055000', '2026-05-20 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'הגענו הביתה שיחקנו איתם בכמה משחקים בבית וקצת בסוני ואחרת כך ירדנו לגינה לשחק איתם בחוץ', 'הכל היה בסדר', NULL, NULL, 'general_house_visit', NULL, 'יעקב מרק ואליה טאוב', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'אור רפאל דהאן' FROM ins;

-- excel row 353 | ביקור בבתי חולים -> general_volunteer_hospital_visit | VOL | 'הלל כהן' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-05-26 12:55:22.685000', '2026-05-26 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'הבאתי לה משחקים ואוכל', NULL, NULL, NULL, 'general_volunteer_hospital_visit', 'שניידר פתח תקווה', NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'טוהר דאהן' FROM ins;

-- excel row 354 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'לינדה טוויל' -> 'לינדה טויל' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-05-26 12:58:50.030000', '2026-05-25 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 342813631), 'היינו בwhitepool בפתח תקווה והיה ממש כיף ואז הלכנו לשיפודי ציפורה ואכלנו והיה כיף אחרי זה אני וחנה החזרנו את שירה ואחים שלה הביתה', 'לא חריג פשוט לשמעון נאבד הטלפון שם ולא הצלחנו למצוא', NULL, NULL, 'general_volunteer_fun_day', NULL, 'יובל נזרי, חנה רנדל', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'לינדה טויל', 342813631, 'שירה קראוני ואחים שלה מנחם ואחים שלו ושמעון' FROM ins;

-- excel row 355 | ביקור בבתי חולים -> general_volunteer_hospital_visit | VOL | 'אביה פרוכטר' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-05-26 18:56:49.168000', '2026-05-26 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'נפגשנו בבית חולים, הבאנו פיצה, כשהגענו הוא ישן אז דיברנו עם אמא שלו, אחריי שהוא קם לקח לו קצת זמן להיפתח אבל אחריי זה הוא נפתח ושיחק איתנו', NULL, NULL, NULL, 'general_volunteer_hospital_visit', 'שניידר פתח תקווה', 'עדי שחם', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'אור רפאל דהאן- ביקור במחלקה בשניידר' FROM ins;

-- excel row 356 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'נועה שרגוביץ' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-05-26 19:10:36.631000', '2026-05-26 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'נפגשנו בקניון הסתובבנו וקניתי לה גלידה ואחר כך הלכנו  לבאולינג ולסקיי גאמפ.', NULL, NULL, NULL, 'general_volunteer_fun_day', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'ליאור' FROM ins;

-- excel row 357 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'לינדה טוויל' -> 'לינדה טויל' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-05-27 13:24:24.379000', '2026-05-26 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 342813631), 'היינו בבאולינג ואז במשחקייה ואז אכלנו בפסטיטו היה כיף', NULL, NULL, NULL, 'general_volunteer_fun_day', NULL, 'תמרה שטיבל', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'לינדה טויל', 342813631, 'ריף שניידר' FROM ins;

-- excel row 358 | יום כיף בחונכות -> tutor_fun_day | TUTOR | 'הלל כהן' -> 'הלל כהן' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-05-27 20:36:41.269000', '2026-05-27 00:00:00', (SELECT staff_id FROM childsmile_app_tutors WHERE id_id = 331407825), 'לקחתי את האחים שלה לסדנת שוקולד', NULL, NULL, NULL, 'tutor_fun_day', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_tutor_feedback (feedback_id_id, tutee_name, tutor_name, tutor_id, is_it_your_tutee)
SELECT feedback_id, 'שרה חלפון', 'הלל כהן', 331407825, TRUE FROM ins;

-- excel row 359 | יום כיף בחונכות -> tutor_fun_day | TUTOR | 'יובל נזרי' -> 'יובל נזרי' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-05-29 00:50:34.478000', '2010-05-25 00:00:00', (SELECT staff_id FROM childsmile_app_tutors WHERE id_id = 334349255), 'נהג אסף אותם ב2 נגלות לוויט פול פתח תקווה היינו במתחם ולאחר מכן הלכנו לאכול בשיפודי ציפורה', 'לא', NULL, NULL, 'tutor_fun_day', NULL, 'חנה רנדל ולינדה טוויל', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_tutor_feedback (feedback_id_id, tutee_name, tutor_name, tutor_id, is_it_your_tutee)
SELECT feedback_id, 'שמעון טימסית , חגי צח, מנחם צח, הדס צח, שירה קרוואני, אביחי קרוואני והלל קרוואני', 'יובל נזרי', 334349255, TRUE FROM ins;

-- excel row 360 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'יובל נזרי' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-05-29 00:52:29.856000', '2010-05-27 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'אמא שלהם הביאה אותם לבאוולינג בפתח תקווה שיחקנו בבאוולינג ובמשחקיה ולאחר מכן הלכנו לאכול בפיצה מוצה', 'לא', 'לא', NULL, 'general_volunteer_fun_day', NULL, 'נעם אייגודיב ולינדה טוויל', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'מנחם חגי והדס צח' FROM ins;

-- excel row 361 | יום כיף בחונכות -> tutor_fun_day | TUTOR | 'נועם יאגודייב' -> 'נועם יאגודייב' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-05-29 13:08:27.817000', '2026-05-27 00:00:00', (SELECT staff_id FROM childsmile_app_tutors WHERE id_id = 334666666), 'באולינג בבסר ופיצה בפיצה מוצה', NULL, NULL, 'התרמנו פיצה אחת , ולפיצה השנייה היה לנו 50 אחוז אז יובל שילם 35 שקל על הפיצה', 'tutor_fun_day', NULL, 'לינדה טוויל', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_tutor_feedback (feedback_id_id, tutee_name, tutor_name, tutor_id, is_it_your_tutee)
SELECT feedback_id, 'מנחם צח', 'נועם יאגודייב', 334666666, TRUE FROM ins;

-- excel row 362 | ביקור בית כללי -> general_house_visit | VOL | 'מעיין מדליון' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-05-29 13:33:27.918000', '2026-05-28 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'הגענו הביתה הכנו עם אור רפאל פנקייקים ואז אכלנו ביחד וירדנו לשחק בכדור בגינה חזרנו הביתה וזהו', 'לא', 'לא עולה לי לראש משהו כרגע', 'חונכות מושלמת😍', 'general_house_visit', NULL, 'יעקב מרק', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'אור רפאל דהאן' FROM ins;

-- excel row 363 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'איילת צייזן' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-05-29 17:20:16.311000', '2026-05-29 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'הסתובבנו לקצת זמן בבגדי ואז יצאנו לראות את הסרט מייקל ג׳קסון בקולנוע סינמה סיטי גלילות', NULL, NULL, 'שילמתי 20 שקל על גלידה לחניכה', 'general_volunteer_fun_day', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'אורין' FROM ins;

-- excel row 364 | ביקור בחונכות -> tutorship | TUTOR | 'שירה שרייבר' -> 'שי שפק' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-05-30 22:50:17.844000', '2026-01-30 00:00:00', (SELECT staff_id FROM childsmile_app_tutors WHERE id_id = 444444444), 'ביקרתי אותה בשניידר
היא אמרה שיש לה ביקורת והייתי באיזור אז חיכיתי איתה קצת והעברנו את הזמן ביחד.', NULL, NULL, NULL, 'tutorship', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_tutor_feedback (feedback_id_id, tutee_name, tutor_name, tutor_id, is_it_your_tutee)
SELECT feedback_id, 'ליאן עזרא', 'שי שפק', 444444444, FALSE FROM ins;

-- excel row 365 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'שירה שרייבר' -> 'שירה שרייבר' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-05-30 23:00:27.837000', '2026-04-19 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 216507046), 'התחלנו אצלה בבית ואז הלכנו לים ביחד(יש לנו יומולדת בהפרש של יום אז חגגנו ביחד)', NULL, NULL, NULL, 'general_volunteer_fun_day', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'שירה שרייבר', 216507046, 'ליאן עזרא' FROM ins;

-- excel row 366 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'שירה שרייבר' -> 'שירה שרייבר' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-05-30 23:10:01.820000', '2026-05-24 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 216507046), 'יצאנו לאכול באמילי גריל בר(ראשון לציון, תרמו)', NULL, NULL, NULL, 'general_volunteer_fun_day', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'שירה שרייבר', 216507046, 'ליאן עזרא' FROM ins;

-- excel row 367 | יום כיף בחונכות -> tutor_fun_day | TUTOR | 'אודליה פלדמן' -> 'אודליה פלדמן' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-05-31 21:46:41.125000', '2026-05-31 00:00:00', (SELECT staff_id FROM childsmile_app_tutors WHERE id_id = 334330073), 'נפגשנו בקליי קפה בנווה זמר ואדל ציירה על כוס ואז הלכנו לחנות משחקים ואז הלכנו למוזס', NULL, NULL, NULL, 'tutor_fun_day', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_tutor_feedback (feedback_id_id, tutee_name, tutor_name, tutor_id, is_it_your_tutee)
SELECT feedback_id, 'אדל ברומברג', 'אודליה פלדמן', 334330073, TRUE FROM ins;

-- excel row 368 | יום כיף בחונכות -> tutor_fun_day | TUTOR | 'יובל נזרי' -> 'יובל נזרי' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-05-31 23:32:50.957000', '2026-05-31 00:00:00', (SELECT staff_id FROM childsmile_app_tutors WHERE id_id = 334349255), 'אספנו אותם מהבתים נסענו לחדר בריחה ברעננה ומשם למסעדה בפתח תקווה', 'לא', 'לא', NULL, 'tutor_fun_day', NULL, 'דביר כהן', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_tutor_feedback (feedback_id_id, tutee_name, tutor_name, tutor_id, is_it_your_tutee)
SELECT feedback_id, 'שמעון טימסית ומייקי', 'יובל נזרי', 334349255, TRUE FROM ins;

-- excel row 369 | יום כיף בחונכות -> tutor_fun_day | TUTOR | 'שירה שרייבר' -> 'שי שפק' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-06-01 00:23:46.440000', '2026-05-31 00:00:00', (SELECT staff_id FROM childsmile_app_tutors WHERE id_id = 444444444), 'הלכנו לאכול ב-לה קרנה פתח תקווה היה נדיר ב״ה', NULL, NULL, 'תודה רבה!!', 'tutor_fun_day', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_tutor_feedback (feedback_id_id, tutee_name, tutor_name, tutor_id, is_it_your_tutee)
SELECT feedback_id, 'ליאן עזרא', 'שי שפק', 444444444, FALSE FROM ins;

-- excel row 370 | ביקור בבתי חולים -> general_volunteer_hospital_visit | VOL | 'הלל כהן' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-06-01 22:30:51.198000', '2026-06-01 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'חליקתי פיצות', NULL, NULL, NULL, 'general_volunteer_hospital_visit', 'שניידר פתח תקווה', NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'שניידר' FROM ins;

-- excel row 371 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'אודליה פלדמן' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-06-02 19:01:53.179000', '2026-06-02 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'נפגשנו בפארק רעננה היינו שם בגן חיות ובמתקנים ואז הלכנו לארוחת צהריים בברנר', 'לא', NULL, NULL, 'general_volunteer_fun_day', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'מנור כליף' FROM ins;

-- excel row 372 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'דניאל פלבין' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-06-03 19:53:53.201000', '2026-06-03 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'היינו בבאולינג במתחם בסר פ״ת ואכלנו ב בלייקר בייקרי א. ערב', 'המסעדה לא הבינה אותנו נכון בנוגע לתרומה, הם חשבו שצריך לתרום רק לאוכל של הילד במקום לכל המשפחה. בסוף הם נתנו 25 אחוז הנחה על האוכל לכולם ולאוכל של הילד בחינם. את השאר שילמנו מהעמותה.', NULL, 'היה ממש כיף😍', 'general_volunteer_fun_day', NULL, 'שקד אדואר', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'אלון גליק' FROM ins;

-- excel row 373 | ביקור בית כללי -> general_house_visit | VOL | 'תהילה שרון' -> 'תהילה שרון' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-06-03 20:09:39.380000', '2026-06-03 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 220123400), 'הלכנו לפארק ושיחקנו בבית', 'לא', NULL, NULL, 'general_house_visit', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'תהילה שרון', 220123400, 'מנור כליף' FROM ins;

-- excel row 374 | ביקור בחונכות -> tutorship | TUTOR | 'רוני רוזנבלום' -> 'רוני רוזנבלום' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-06-04 17:48:53.113000', '2026-06-04 00:00:00', (SELECT staff_id FROM childsmile_app_tutors WHERE id_id = 332977503), 'היינו אצלה בבית ושיחקנו איתה', NULL, NULL, NULL, 'tutorship', NULL, 'אורי בורקש', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_tutor_feedback (feedback_id_id, tutee_name, tutor_name, tutor_id, is_it_your_tutee)
SELECT feedback_id, 'ריף שניידר', 'רוני רוזנבלום', 332977503, TRUE FROM ins;

-- excel row 375 | ביקור בחונכות -> tutorship | TUTOR | 'לינוי בר' -> 'שי שפק' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-06-04 21:09:36.797000', '2026-06-04 00:00:00', (SELECT staff_id FROM childsmile_app_tutors WHERE id_id = 444444444), 'היינו בבית שלה אכלנו ושיחקנו גם תמר רצתה שאני אלמד אותה מתמטיקה למבחן', NULL, NULL, NULL, 'tutorship', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_tutor_feedback (feedback_id_id, tutee_name, tutor_name, tutor_id, is_it_your_tutee)
SELECT feedback_id, 'תמר תורגמן', 'שי שפק', 444444444, TRUE FROM ins;

-- excel row 376 | ביקור בבתי חולים -> general_volunteer_hospital_visit | VOL | 'הלל כהן' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-06-05 17:29:06.016000', '2026-06-05 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'חילקנו פיצה וגלידה', NULL, NULL, NULL, 'general_volunteer_hospital_visit', 'שניידר פתח תקווה', NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'שניידר' FROM ins;

-- excel row 377 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'שקד אדואר' -> 'שקד אדואר' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-06-07 11:36:16.228000', '2026-06-03 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 218851772), 'נפגשנו במתחם בסר בפתח תקווה,עלינו למשחקייה ליד הבאולינג היינו שם בערך שעה ואז התקדמנו למסעדת בליקר בייקרי שביכין סנטר,אכלנו וחזרנו הבייתה. היה כיף ממש.', 'היה בעיה עם התשלום על האוכל, אבל בסוף הם עשו הנחה ועל הילד הם תרמו הכל. ואתם עזרתם לשלם את השאר.', NULL, NULL, 'general_volunteer_fun_day', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'שקד אדואר', 218851772, 'שקד אדואר,דניאל פלבין' FROM ins;

-- excel row 378 | ביקור בבתי חולים -> general_volunteer_hospital_visit | VOL | 'הלל כהן' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-06-08 17:04:27.689000', '2026-06-08 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'חילקתי פלאפל והיה טוב ברוך ה שמחו ממש', NULL, NULL, NULL, 'general_volunteer_hospital_visit', 'שניידר פתח תקווה', NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'שניידר' FROM ins;

-- excel row 379 | ביקור בית כללי -> general_house_visit | VOL | 'עדי שחם' -> 'עדי שחם' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-06-10 13:57:23.701000', '2026-06-09 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 333569317), 'הבאנו פיצה ושיחקנו איתם בבית', NULL, NULL, NULL, 'general_house_visit', NULL, 'אביה פרוכטר', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'עדי שחם', 333569317, 'שירה קרואני' FROM ins;

-- excel row 380 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'דניאל ולץ' -> 'דניאל ולץ' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-06-10 15:26:13.793000', '2026-06-09 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 219640364), 'לקחנו אותן להופעה של עומר אדם ברמת גן ואחרי ההופעה הלכנו לסודוך בנתניה והחזרנו אותן הביתה היה ממש כיף נראה שהן נהנו', 'לא', NULL, NULL, 'general_volunteer_fun_day', NULL, 'אורי אריה', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'דניאל ולץ', 219640364, 'אלה רבה ואדל ברומברג' FROM ins;

-- excel row 381 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'אביה פרוכטר' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-06-10 16:52:27.753000', '2026-06-09 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'באמו אליה הביתה עם פיצות ושיחקנו איתה שם ויצאנו לסיבוב אחרי', NULL, NULL, NULL, 'general_volunteer_fun_day', NULL, 'עדי שחם', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'שירה קראווהי' FROM ins;

-- excel row 382 | יום כיף בחונכות -> tutor_fun_day | TUTOR | 'לינוי בר' -> 'שי שפק' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-06-10 18:57:37.641000', '2026-06-10 00:00:00', (SELECT staff_id FROM childsmile_app_tutors WHERE id_id = 444444444), 'שיחקנו בבית שלה  ואז הלכנו לאכול גלידה', NULL, NULL, NULL, 'tutor_fun_day', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_tutor_feedback (feedback_id_id, tutee_name, tutor_name, tutor_id, is_it_your_tutee)
SELECT feedback_id, 'תמר תורג׳מן', 'שי שפק', 444444444, TRUE FROM ins;

-- excel row 383 | יום כיף בחונכות -> tutor_fun_day | TUTOR | 'יובל נזרי' -> 'יובל נזרי' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-06-14 12:49:14.274000', '2026-06-09 00:00:00', (SELECT staff_id FROM childsmile_app_tutors WHERE id_id = 334349255), 'נפגשו מחוץ להופעה של עומר אדם היינו בהופעה ולאחר ההופעה הלכנו עם אימרי ואבא שלו למסעדה ליד.', 'לא', NULL, NULL, 'tutor_fun_day', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_tutor_feedback (feedback_id_id, tutee_name, tutor_name, tutor_id, is_it_your_tutee)
SELECT feedback_id, 'שמעון טימסית אימרי זינגר', 'יובל נזרי', 334349255, TRUE FROM ins;

-- excel row 384 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'יובל נזרי' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-06-14 12:50:42.398000', '2026-06-11 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'נפגשנו בתחנת רכבת והלכנו להופעה של בן צור', NULL, NULL, NULL, 'general_volunteer_fun_day', NULL, 'לינדה טוויל', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'מנחם צח והדס צח' FROM ins;

-- excel row 385 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'רננה בן ציון' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-06-17 01:56:13.271000', '2026-06-16 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'נסענו לבאולינג', NULL, NULL, NULL, 'general_volunteer_fun_day', NULL, 'אורי אריה', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'תאלא' FROM ins;

-- excel row 386 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'רננה בן ציון' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-06-17 01:57:46.366000', '2026-06-16 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'הלכנו לclay and kef ואז לאכול ולקניון', NULL, NULL, NULL, 'general_volunteer_fun_day', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'אדל בומברג' FROM ins;

-- excel row 387 | ביקור בית כללי -> general_house_visit | VOL | 'אביה פרוכטר' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-06-17 18:29:49.399000', '2026-06-17 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'באנו אליה הביתה שיחקנו איתה קצת וזה', NULL, NULL, NULL, 'general_house_visit', NULL, 'נעה צובל', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'ריף שניידר' FROM ins;

-- excel row 388 | יום כיף בחונכות -> tutor_fun_day | TUTOR | 'מעיין מדליון' -> 'מעיין מדליון' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-06-18 19:20:56.752000', '2026-06-18 00:00:00', (SELECT staff_id FROM childsmile_app_tutors WHERE id_id = 219341096), 'נפגשנו בבית ויצאנו למסעדת שווארמה ואז שיחקנו בגינה ואז עלינו הביתה לשחק בבית', 'לא ממש', 'אין לי', 'לא הצלחנו למצוא מקום שתורם באיזור וממש רצינו לעשות כבר את היום כיף ושילמנו בעצמינו על השווארמה לאור רפאל ואחיו הקנייה עלתה 295 ש״ח', 'tutor_fun_day', NULL, 'אליה טאוב, יעקב מרק', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_tutor_feedback (feedback_id_id, tutee_name, tutor_name, tutor_id, is_it_your_tutee)
SELECT feedback_id, 'אור רפאל דהאן', 'מעיין מדליון', 219341096, TRUE FROM ins;

-- excel row 389 | ביקור בחונכות -> tutorship | TUTOR | 'שירה רוקח' -> 'שירה רוקח' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-06-21 15:29:13.823000', '2026-06-04 00:00:00', (SELECT staff_id FROM childsmile_app_tutors WHERE id_id = 219214988), 'הגעתי אליהם הביתה והפתעתי אותו עם רובה מים ואז הלכנו לשחק קצת עם הרובה מים ואז הלכנו לשחק קצת בגינה 
מאוד נהניתי', NULL, NULL, NULL, 'tutorship', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_tutor_feedback (feedback_id_id, tutee_name, tutor_name, tutor_id, is_it_your_tutee)
SELECT feedback_id, 'חיים יאיר ישראל עמר', 'שירה רוקח', 219214988, TRUE FROM ins;

-- excel row 390 | ביקור בחונכות -> tutorship | TUTOR | 'שירה רוקח' -> 'שירה רוקח' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-06-21 15:31:05.100000', '2026-06-11 00:00:00', (SELECT staff_id FROM childsmile_app_tutors WHERE id_id = 219214988), 'הגעתי אליהם הביתה ויצאנו קצת לשחק בכדור ואז הלכנו קצת לגינה ושיחקנו קצת', NULL, NULL, NULL, 'tutorship', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_tutor_feedback (feedback_id_id, tutee_name, tutor_name, tutor_id, is_it_your_tutee)
SELECT feedback_id, 'חיים יאיר ישראל עמר', 'שירה רוקח', 219214988, TRUE FROM ins;

-- excel row 391 | ביקור בחונכות -> tutorship | TUTOR | 'שירה רוקח' -> 'שירה רוקח' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-06-21 15:34:50.949000', '2026-06-17 00:00:00', (SELECT staff_id FROM childsmile_app_tutors WHERE id_id = 219214988), 'נפגשנו אצל סבא וסבתא שלו בבית, חגגנו לו יומולדת', NULL, NULL, NULL, 'tutorship', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_tutor_feedback (feedback_id_id, tutee_name, tutor_name, tutor_id, is_it_your_tutee)
SELECT feedback_id, 'חיים יאיר ישראל עמר', 'שירה רוקח', 219214988, TRUE FROM ins;

-- excel row 392 | ביקור בבתי חולים -> general_volunteer_hospital_visit | VOL | 'שירה רוקח' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-06-23 13:19:29.249000', '2026-06-22 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'שיחקנו בברביות, הלכנו לאכול קצת, וציירנו היה מאוד כיף', NULL, NULL, NULL, 'general_volunteer_hospital_visit', 'שניידר פתח תקווה', 'שירה שרייבר', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'תפארת ריף שניידר, ביקור במחלקת אונקולוגיה בבית חולים שניידר' FROM ins;

-- excel row 393 | ביקור בחונכות -> tutorship | TUTOR | 'נויה דוידזון' -> 'נויה דוידזון' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-06-23 19:42:23.580000', '2026-06-23 00:00:00', (SELECT staff_id FROM childsmile_app_tutors WHERE id_id = 331620385), 'הלכתי אליה לאשפוז… היא הייתה מאוד עצבנית בגלל התרופות', NULL, NULL, NULL, 'tutorship', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_tutor_feedback (feedback_id_id, tutee_name, tutor_name, tutor_id, is_it_your_tutee)
SELECT feedback_id, 'תפארת אסתר ריף שניידר', 'נויה דוידזון', 331620385, TRUE FROM ins;

-- excel row 394 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'אהוד וייס' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-06-24 20:10:49.146000', '2026-06-24 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'הלכנו משניידר אכלנו במסעדה החברים ואז הלכנו לקניון לראות את הסרט קופה ראשית ואז נסענו לבית שלה', NULL, NULL, NULL, 'general_volunteer_fun_day', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'אדל ברומברג' FROM ins;

-- excel row 395 | ביקור בבתי חולים -> general_volunteer_hospital_visit | VOL | 'הלל כהן' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-06-27 22:49:38.143000', '2026-06-27 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'חילקתי פיצות', NULL, NULL, NULL, 'general_volunteer_hospital_visit', 'שניידר פתח תקווה', NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'שניידר' FROM ins;

-- excel row 396 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'יעלה אביאור' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-06-29 22:32:25.578000', '2026-06-29 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'יצאנו לסרט סינמה סיטי ירושלים יחד עם כל האחים', NULL, NULL, NULL, 'general_volunteer_fun_day', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'מילה' FROM ins;

-- excel row 397 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'עדי רוקח' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-07-01 19:00:30.567000', '2026-07-01 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'אספתי אותו מהבית ונסענו לקארטינג ואחרי זה למסעדה. היה מושלם.', NULL, NULL, NULL, 'general_volunteer_fun_day', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'ליאור ישראלי' FROM ins;

-- excel row 398 | ביקור בית כללי -> general_house_visit | VOL | 'שהם פלזנר' -> 'שהם פלזנר' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-07-01 19:16:31.679000', '2026-07-01 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 331672105), 'שיחקנו בבית שלהם במשחקי קופסא ואחר כך ירדנו לשחק בגן שעשועים והיה ממש טוב! מיכל האמא ממש שמחה על הזמן הזה', NULL, NULL, NULL, 'general_house_visit', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'שהם פלזנר', 331672105, 'מנור כליף' FROM ins;

-- excel row 399 | ביקור בית כללי -> general_house_visit | VOL | 'לינדה טוויל' -> 'לינדה טויל' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-07-02 03:09:25.516000', '2026-07-01 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 342813631), 'היינו אצלה בבית ושיחקנו מלא ואכלנו והיה מאוד כיף', NULL, NULL, NULL, 'general_house_visit', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'לינדה טויל', 342813631, 'תפארת ריף' FROM ins;

-- excel row 400 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'נאוה פרולינגר' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-07-02 14:06:51.688000', '2026-06-30 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'אספתי אותה והלכנו לים לאכול גלידה וסתם לשבת על החוף .', 'לא', 'היא ממש משועממת בזמן האחרון אז להוציא אותה יותר.', NULL, 'general_volunteer_fun_day', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'אדל ברומברג' FROM ins;

-- excel row 401 | ביקור בית כללי -> general_house_visit | VOL | 'נאוה פרולינגר' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-07-02 14:07:51.114000', '2026-06-26 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'באנו ביום שישי , יצאנו לפארק וכזה הכנו כל מיני דברים לשבת.', 'לא', NULL, NULL, 'general_house_visit', NULL, NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'טוהר דהאן' FROM ins;

-- excel row 402 | ביקור בבתי חולים -> general_volunteer_hospital_visit | VOL | 'נאוה פרולינגר' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-07-02 14:09:10.515000', '2026-06-21 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'חילקנו פיצות וגלידה לכל החולים שם.', 'לא', NULL, NULL, 'general_volunteer_hospital_visit', 'שניידר פתח תקווה', NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'בית חולים שניידר' FROM ins;

-- excel row 403 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'חנה רנדל' -> 'חנה רנדל' [matched]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-07-02 16:57:17.396000', '2026-07-02 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 329800551), 'הלכנו לבאולינג בקניון כפ״ס ואחרי זה למסעדה', NULL, NULL, NULL, 'general_volunteer_fun_day', NULL, 'אביה פרוכטר', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'חנה רנדל', 329800551, 'ליאור' FROM ins;

-- excel row 404 | יום כיף בהתנדבות כללית -> general_volunteer_fun_day | VOL | 'אביה פרוכטר' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-07-02 17:08:51.546000', '2026-07-02 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'הלכנו לבאולינג ואז לאכול', NULL, NULL, NULL, 'general_volunteer_fun_day', NULL, 'חנה רנדל', NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'ליאור' FROM ins;

-- excel row 405 | ביקור בבתי חולים -> general_volunteer_hospital_visit | VOL | 'הלל כהן' -> 'אורי ברוש' [PLACEHOLDER]
WITH ins AS (
  INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments, feedback_type, hospital_name, additional_volunteers, names, phones, other_information)
  VALUES ('2026-07-02 20:30:15.834000', '2026-07-02 00:00:00', (SELECT staff_id FROM childsmile_app_general_volunteer WHERE id_id = 999999999), 'חילקתי גלידה ופיצה', NULL, NULL, NULL, 'general_volunteer_hospital_visit', 'שניידר פתח תקווה', NULL, NULL, NULL, NULL)
  RETURNING feedback_id
)
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id, child_name)
SELECT feedback_id, 'אורי ברוש', 999999999, 'שניידר' FROM ins;

COMMIT;