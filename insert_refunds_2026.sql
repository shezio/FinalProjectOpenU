-- ============================================================
-- Insert historical expense refunds (2026)
-- staff_id looked up by first_name + last_name (exact match).
-- staff_full_name is hardcoded — no dependency on staff row existing.
-- phone_number = payment destination (Bit/PayBox), NOT the staff login phone.
-- Before re-running: DELETE FROM childsmile_app_expenserefund WHERE updated_by = 'admin_import';
-- ============================================================

-- ── נבו ──────────────────────────────────────────────────────
INSERT INTO childsmile_app_expenserefund
  (staff_id, staff_full_name, created_at, updated_at, expense_date, requested_amount, description, file_url, status, refund_method, phone_number, updated_by)
VALUES (
  COALESCE((SELECT staff_id FROM childsmile_app_staff WHERE first_name='נבו' LIMIT 1), (SELECT MIN(staff_id) FROM childsmile_app_staff)),
  'נבו',
  '2026-01-01 17:48:24', '2026-01-01 17:48:24',
  '2025-12-30', 339, 'דלק אלנטרה ותעודות הוקרה',
  'https://drive.google.com/open?id=1RvI0CqwkphX7ya1zA8hWmQpHIAKOGs01',
  'שולם', 'ביט', '0545606494', 'admin_import'
);

-- ── נויה דוידזון — 01/01/2026 ───────────────────────────────
INSERT INTO childsmile_app_expenserefund
  (staff_id, staff_full_name, created_at, updated_at, expense_date, requested_amount, description, file_url, status, refund_method, phone_number, updated_by)
VALUES (
  COALESCE((SELECT staff_id FROM childsmile_app_staff WHERE first_name='נויה' AND last_name='דוידזון' LIMIT 1), (SELECT MIN(staff_id) FROM childsmile_app_staff)),
  'נויה דוידזון',
  '2026-01-01 19:49:31', '2026-01-01 19:49:31',
  '2026-01-01', 78.8, 'הלכנו לחניכה הביתה והכנו איתה עוגיות',
  'https://drive.google.com/open?id=1p0G1_iEduHujRJufc2lu4yMpARPXI7vG',
  'שולם', 'ביט', '0543084166', 'admin_import'
);

-- ── שירה צדיק ────────────────────────────────────────────────
INSERT INTO childsmile_app_expenserefund
  (staff_id, staff_full_name, created_at, updated_at, expense_date, requested_amount, description, file_url, status, refund_method, phone_number, updated_by)
VALUES (
  COALESCE((SELECT staff_id FROM childsmile_app_staff WHERE first_name='שירה' AND last_name='צדיק' LIMIT 1), (SELECT MIN(staff_id) FROM childsmile_app_staff)),
  'שירה צדיק',
  '2026-01-01 21:18:56', '2026-01-01 21:18:56',
  '2026-01-01', 50, 'אסימונים',
  'https://drive.google.com/open?id=1eHBPz-YnxH38nXoFoaNacOSSPJriXBmu',
  'שולם', 'ביט', '0539842825', 'admin_import'
);

-- ── נויה דוידזון — 19/01/2026 ───────────────────────────────
INSERT INTO childsmile_app_expenserefund
  (staff_id, staff_full_name, created_at, updated_at, expense_date, requested_amount, description, file_url, status, refund_method, phone_number, updated_by)
VALUES (
  COALESCE((SELECT staff_id FROM childsmile_app_staff WHERE first_name='נויה' AND last_name='דוידזון' LIMIT 1), (SELECT MIN(staff_id) FROM childsmile_app_staff)),
  'נויה דוידזון',
  '2026-01-19 18:48:39', '2026-01-19 18:48:39',
  '2026-01-19', 25, 'חניון שניידר',
  'https://drive.google.com/open?id=10p9a2oe4oWjr-JDgequUXb-bLxmJhYwl',
  'שולם', 'ביט', '0543084166', 'admin_import'
);

-- ── איילת קליין ──────────────────────────────────────────────
INSERT INTO childsmile_app_expenserefund
  (staff_id, staff_full_name, created_at, updated_at, expense_date, requested_amount, description, file_url, status, refund_method, phone_number, updated_by)
VALUES (
  COALESCE((SELECT staff_id FROM childsmile_app_staff WHERE first_name='איילת' AND last_name='קליין' LIMIT 1), (SELECT MIN(staff_id) FROM childsmile_app_staff)),
  'איילת קליין',
  '2026-01-21 19:50:03', '2026-01-21 19:50:03',
  '2026-01-21', 150, 'שילמתי ל3 כרטיסים בקולנוע - אין קבלה אז מצרפת צילום מסך של הכרטיסים',
  'https://drive.google.com/open?id=1i620anMANCSu0GFvX5Bo_EWqP-NICvY8',
  'שולם', 'ביט', '0587348140', 'admin_import'
);

-- ── אווה גז (expense_date typo 1/22/0026 corrected to 2026-01-22) ─
INSERT INTO childsmile_app_expenserefund
  (staff_id, staff_full_name, created_at, updated_at, expense_date, requested_amount, description, file_url, status, refund_method, phone_number, updated_by)
VALUES (
  COALESCE((SELECT staff_id FROM childsmile_app_staff WHERE first_name='אווה' AND last_name='גז' LIMIT 1), (SELECT MIN(staff_id) FROM childsmile_app_staff)),
  'אווה גז',
  '2026-01-22 22:27:59', '2026-01-22 22:27:59',
  '2026-01-22', 173, 'יום כיף',
  'https://drive.google.com/open?id=1U8Az_g09_ED-veelAzSTCsQIJJ-kh_qM',
  'שולם', 'ביט', '0535264481', 'admin_import'
);

-- ── מעיין הירשפלד ────────────────────────────────────────────
INSERT INTO childsmile_app_expenserefund
  (staff_id, staff_full_name, created_at, updated_at, expense_date, requested_amount, description, file_url, status, refund_method, phone_number, updated_by)
VALUES (
  COALESCE((SELECT staff_id FROM childsmile_app_staff WHERE first_name='מעיין' AND last_name='הירשפלד' LIMIT 1), (SELECT MIN(staff_id) FROM childsmile_app_staff)),
  'מעיין הירשפלד',
  '2026-01-26 07:13:06', '2026-01-26 07:13:06',
  '2026-01-21', 135, 'ארוחה בבורגרסבר לחניכה ולאחיה',
  'https://drive.google.com/open?id=16ljO8cX_umgd4FiTsScrLggj7YmyRbOB',
  'שולם', 'ביט', '0533369235', 'admin_import'
);

-- ── מאי מוסקל ────────────────────────────────────────────────
INSERT INTO childsmile_app_expenserefund
  (staff_id, staff_full_name, created_at, updated_at, expense_date, requested_amount, description, file_url, status, refund_method, phone_number, updated_by)
VALUES (
  COALESCE((SELECT staff_id FROM childsmile_app_staff WHERE first_name='מאי' AND last_name='מוסקל' LIMIT 1), (SELECT MIN(staff_id) FROM childsmile_app_staff)),
  'מאי מוסקל',
  '2026-01-27 20:54:04', '2026-01-27 20:54:04',
  '2026-01-27', 291, 'פליי פארק ברעננה ומתנה קטנה שאדל רצתה',
  'https://drive.google.com/open?id=1K5JomQfpvA5Z-RaUnIoc5e9vu41k06Dm',
  'שולם', 'ביט', '0548118113', 'admin_import'
);

-- ── אורי פלזנר — 11/02/2026 row 1 ───────────────────────────
INSERT INTO childsmile_app_expenserefund
  (staff_id, staff_full_name, created_at, updated_at, expense_date, requested_amount, description, file_url, status, refund_method, phone_number, updated_by)
VALUES (
  COALESCE((SELECT staff_id FROM childsmile_app_staff WHERE first_name='אורי' AND last_name='פלזנר' LIMIT 1), (SELECT MIN(staff_id) FROM childsmile_app_staff)),
  'אורי פלזנר',
  '2026-02-11 19:05:23', '2026-02-11 19:05:23',
  '2026-02-11', 25, 'חניון הכנה למיאמי',
  'https://drive.google.com/open?id=1l6vcEDHw-oGSLmru7lFrpHHpKz0KkhOB',
  'שולם', 'ביט', '0547833161', 'admin_import'
);

-- ── אורי פלזנר — 12/02/2026 row 1 ───────────────────────────
INSERT INTO childsmile_app_expenserefund
  (staff_id, staff_full_name, created_at, updated_at, expense_date, requested_amount, description, file_url, status, refund_method, phone_number, updated_by)
VALUES (
  COALESCE((SELECT staff_id FROM childsmile_app_staff WHERE first_name='אורי' AND last_name='פלזנר' LIMIT 1), (SELECT MIN(staff_id) FROM childsmile_app_staff)),
  'אורי פלזנר',
  '2026-02-12 00:12:14', '2026-02-12 00:12:14',
  '2026-02-11', 25, 'חניה הכנה למיאמי',
  'https://drive.google.com/open?id=1pMd9zJI974rJRE6xWoXR23whNH4TfZNC',
  'שולם', 'ביט', '0547833161', 'admin_import'
);

-- ── אורי פלזנר — 12/02/2026 row 2 ───────────────────────────
INSERT INTO childsmile_app_expenserefund
  (staff_id, staff_full_name, created_at, updated_at, expense_date, requested_amount, description, file_url, status, refund_method, phone_number, updated_by)
VALUES (
  COALESCE((SELECT staff_id FROM childsmile_app_staff WHERE first_name='אורי' AND last_name='פלזנר' LIMIT 1), (SELECT MIN(staff_id) FROM childsmile_app_staff)),
  'אורי פלזנר',
  '2026-02-12 00:13:00', '2026-02-12 00:13:00',
  '2026-02-11', 25, 'חניה הכנה למיאמי',
  'https://drive.google.com/open?id=1HH_be66QG8Jb2ytDRxN6xAJ4zpphaNyV',
  'שולם', 'ביט', '0547833161', 'admin_import'
);

-- ── אורי פלזנר — 02/03/2026 ──────────────────────────────────
INSERT INTO childsmile_app_expenserefund
  (staff_id, staff_full_name, created_at, updated_at, expense_date, requested_amount, description, file_url, status, refund_method, phone_number, updated_by)
VALUES (
  COALESCE((SELECT staff_id FROM childsmile_app_staff WHERE first_name='אורי' AND last_name='פלזנר' LIMIT 1), (SELECT MIN(staff_id) FROM childsmile_app_staff)),
  'אורי פלזנר',
  '2026-03-02 15:39:53', '2026-03-02 15:39:53',
  '2026-03-01', 142, 'אוכל לילד חולה סרטן בהדסה, שהורידו את המחלקה למרחב מוגן והשאירו אותו לבד בלי אוכל',
  'https://drive.google.com/open?id=1ctyUumk6fZSsazW8NdSLz0jCD1ZFJ1FZ',
  'שולם', 'ביט', '0547833161', 'admin_import'
);

-- ── איתי רייך — 08/03/2026 ───────────────────────────────────
INSERT INTO childsmile_app_expenserefund
  (staff_id, staff_full_name, created_at, updated_at, expense_date, requested_amount, description, file_url, status, refund_method, phone_number, updated_by)
VALUES (
  COALESCE((SELECT staff_id FROM childsmile_app_staff WHERE first_name='איתי' AND last_name='רייך' LIMIT 1), (SELECT MIN(staff_id) FROM childsmile_app_staff)),
  'איתי רייך',
  '2026-03-08 18:04:52', '2026-03-08 18:04:52',
  '2026-03-08', 187.9, 'יום כיף עם אושר ביבנה המלך עם וולץ ואיתי פרוידמן',
  'https://drive.google.com/open?id=12c4sNfVB17A3XP7HVtRyCML7e9tU0cd2',
  'שולם', 'ביט', '0505320508', 'admin_import'
);

-- ── תהל ברנע ─────────────────────────────────────────────────
INSERT INTO childsmile_app_expenserefund
  (staff_id, staff_full_name, created_at, updated_at, expense_date, requested_amount, description, file_url, status, refund_method, phone_number, updated_by)
VALUES (
  COALESCE((SELECT staff_id FROM childsmile_app_staff WHERE first_name='תהל' AND last_name='ברנע' LIMIT 1), (SELECT MIN(staff_id) FROM childsmile_app_staff)),
  'תהל ברנע',
  '2026-03-09 15:10:29', '2026-03-09 15:10:29',
  '2026-03-09', 150, 'עשינו מונית הלוך חזור כי כל הקווים התבטלו בגלל המלחמה ולא היה עוד איך לנסוע',
  'https://drive.google.com/open?id=1YVzv4LtbF5z84s2uBun-zOUCmjlQRE6V',
  'שולם', 'ביט', '0547544837', 'admin_import'
);

-- ── דניאל ולץ — 10/03/2026 ───────────────────────────────────
INSERT INTO childsmile_app_expenserefund
  (staff_id, staff_full_name, created_at, updated_at, expense_date, requested_amount, description, file_url, status, refund_method, phone_number, updated_by)
VALUES (
  COALESCE((SELECT staff_id FROM childsmile_app_staff WHERE first_name='דניאל' AND last_name='ולץ' LIMIT 1), (SELECT MIN(staff_id) FROM childsmile_app_staff)),
  'דניאל ולץ',
  '2026-03-10 19:51:01', '2026-03-10 19:51:01',
  '2026-03-10', 60, 'שתי מגשי פיצה סטורי לביקור בית לאושר בוגנים',
  'https://drive.google.com/open?id=16uft5mwmHsTuxfOa_as78T4Dj86Wx30B',
  'שולם', 'ביט', '0543394025', 'admin_import'
);

-- ── איתי רייך — 10/03/2026 ───────────────────────────────────
INSERT INTO childsmile_app_expenserefund
  (staff_id, staff_full_name, created_at, updated_at, expense_date, requested_amount, description, file_url, status, refund_method, phone_number, updated_by)
VALUES (
  COALESCE((SELECT staff_id FROM childsmile_app_staff WHERE first_name='איתי' AND last_name='רייך' LIMIT 1), (SELECT MIN(staff_id) FROM childsmile_app_staff)),
  'איתי רייך',
  '2026-03-10 22:39:49', '2026-03-10 22:39:49',
  '2026-03-10', 50, 'דלק לנסיעה',
  'https://drive.google.com/open?id=1rdBM7QlxDJYPl_kCiB7aqoQEd9lxEqXD',
  'שולם', 'ביט', '0505320508', 'admin_import'
);

-- ── דניאל ולץ — 11/03/2026 ───────────────────────────────────
INSERT INTO childsmile_app_expenserefund
  (staff_id, staff_full_name, created_at, updated_at, expense_date, requested_amount, description, file_url, status, refund_method, phone_number, updated_by)
VALUES (
  COALESCE((SELECT staff_id FROM childsmile_app_staff WHERE first_name='דניאל' AND last_name='ולץ' LIMIT 1), (SELECT MIN(staff_id) FROM childsmile_app_staff)),
  'דניאל ולץ',
  '2026-03-11 15:34:07', '2026-03-11 15:34:07',
  '2026-03-11', 365, 'ארוחת צהריים למתנדבים ביום מרוכז של ביקורי בית',
  'https://drive.google.com/open?id=16zWOwSXscppg-ElrkO-4p7FfI3m7tIue',
  'שולם', 'ביט', '0543394025', 'admin_import'
);

-- ── אורי אריה — 11/03/2026 ───────────────────────────────────
INSERT INTO childsmile_app_expenserefund
  (staff_id, staff_full_name, created_at, updated_at, expense_date, requested_amount, description, file_url, status, refund_method, phone_number, updated_by)
VALUES (
  COALESCE((SELECT staff_id FROM childsmile_app_staff WHERE first_name='אורי' AND last_name='אריה' LIMIT 1), (SELECT MIN(staff_id) FROM childsmile_app_staff)),
  'אורי אריה',
  '2026-03-11 20:28:40', '2026-03-11 20:28:40',
  '2026-03-11', 130, 'דלק לרכב יום כיף',
  'https://drive.google.com/open?id=1zFwdLsWvXXK60NpaeRGi6XkZXQxXFrdG',
  'שולם', 'ביט', '0524598003', 'admin_import'
);

-- ── אורי פלזנר — 15/03/2026 ──────────────────────────────────
INSERT INTO childsmile_app_expenserefund
  (staff_id, staff_full_name, created_at, updated_at, expense_date, requested_amount, description, file_url, status, refund_method, phone_number, updated_by)
VALUES (
  COALESCE((SELECT staff_id FROM childsmile_app_staff WHERE first_name='אורי' AND last_name='פלזנר' LIMIT 1), (SELECT MIN(staff_id) FROM childsmile_app_staff)),
  'אורי פלזנר',
  '2026-03-15 20:14:46', '2026-03-15 20:14:46',
  '2026-03-15', 144, 'קניתי לראובן שובר לפעלטון כי הוא נתקע בלי אטרקציה לפאר פריוף בשניה האחרונה',
  'https://drive.google.com/open?id=1iDwMcvcXSIIbLIG0T8YgnSDipT3wJyUQ',
  'שולם', 'ביט', '0547833161', 'admin_import'
);

-- ── שירה שרון — 12/03/2026 ───────────────────────────────────
INSERT INTO childsmile_app_expenserefund
  (staff_id, staff_full_name, created_at, updated_at, expense_date, requested_amount, description, file_url, status, refund_method, phone_number, updated_by)
VALUES (
  COALESCE((SELECT staff_id FROM childsmile_app_staff WHERE first_name='שירה' AND last_name='שרון' LIMIT 1), (SELECT MIN(staff_id) FROM childsmile_app_staff)),
  'שירה שרון',
  '2026-03-16 11:02:58', '2026-03-16 11:02:58',
  '2026-03-12', 53, 'כדורי שוקולד לביקור בית',
  'https://drive.google.com/open?id=1QkqFgtuRU58uuTQacala-uYv9NpQZgX-',
  'שולם', 'ביט', '0515002488', 'admin_import'
);

-- ── אביה פרוכטר — 16/03/2026 ─────────────────────────────────
INSERT INTO childsmile_app_expenserefund
  (staff_id, staff_full_name, created_at, updated_at, expense_date, requested_amount, description, file_url, status, refund_method, phone_number, updated_by)
VALUES (
  COALESCE((SELECT staff_id FROM childsmile_app_staff WHERE first_name='אביה' AND last_name='פרוכטר' LIMIT 1), (SELECT MIN(staff_id) FROM childsmile_app_staff)),
  'אביה פרוכטר',
  '2026-03-16 20:29:28', '2026-03-16 20:29:28',
  '2026-03-16', 50, 'היינו עם נהג ואז הוא היה צריך ללכת להחזיר את הרכב אז נועם אמר לנו לשלם על מונית ויהיה החזר',
  'https://drive.google.com/open?id=1uC-rC3B-i5XRdqCnm3KF0C1obUNMSJSt',
  'שולם', 'ביט', '0543451809', 'admin_import'
);

-- ── שקד ישועה ─────────────────────────────────────────────────
INSERT INTO childsmile_app_expenserefund
  (staff_id, staff_full_name, created_at, updated_at, expense_date, requested_amount, description, file_url, status, refund_method, phone_number, updated_by)
VALUES (
  COALESCE((SELECT staff_id FROM childsmile_app_staff WHERE first_name='שקד' AND last_name='ישועה' LIMIT 1), (SELECT MIN(staff_id) FROM childsmile_app_staff)),
  'שקד ישועה',
  '2026-03-19 18:32:41', '2026-03-19 18:32:41',
  '2026-03-17', 150, 'סושי יום כיף',
  'https://drive.google.com/open?id=1DoXzmnc64rV8DCGL3jSdHWgJp4t1WFoK',
  'שולם', 'ביט', '0508570075', 'admin_import'
);

-- ── עדי שחם ───────────────────────────────────────────────────
INSERT INTO childsmile_app_expenserefund
  (staff_id, staff_full_name, created_at, updated_at, expense_date, requested_amount, description, file_url, status, refund_method, phone_number, updated_by)
VALUES (
  COALESCE((SELECT staff_id FROM childsmile_app_staff WHERE first_name='עדי' AND last_name='שחם' LIMIT 1), (SELECT MIN(staff_id) FROM childsmile_app_staff)),
  'עדי שחם',
  '2026-03-19 21:15:56', '2026-03-19 21:15:56',
  '2026-03-18', 282, 'ארבעה מגשי פיצות ביום כיף אחריי שלא הייתה ברירה בכלל',
  'https://drive.google.com/open?id=1IwGyJ6NR9dPbVJFYN1E00bvRgpFWX_aA',
  'שולם', 'ביט', '0542766735', 'admin_import'
);

-- ── אורי אריה — 25/03/2026 ───────────────────────────────────
INSERT INTO childsmile_app_expenserefund
  (staff_id, staff_full_name, created_at, updated_at, expense_date, requested_amount, description, file_url, status, refund_method, phone_number, updated_by)
VALUES (
  COALESCE((SELECT staff_id FROM childsmile_app_staff WHERE first_name='אורי' AND last_name='אריה' LIMIT 1), (SELECT MIN(staff_id) FROM childsmile_app_staff)),
  'אורי אריה',
  '2026-03-25 17:08:17', '2026-03-25 17:08:17',
  '2026-03-25', 210, 'על דלק',
  'https://drive.google.com/open?id=1tKqUkxCbj7FDpeQygc4u6FMeURD6KGSQ',
  'שולם', 'ביט', '0524598003', 'admin_import'
);

-- ── דוד שמש ───────────────────────────────────────────────────
INSERT INTO childsmile_app_expenserefund
  (staff_id, staff_full_name, created_at, updated_at, expense_date, requested_amount, description, file_url, status, refund_method, phone_number, updated_by)
VALUES (
  COALESCE((SELECT staff_id FROM childsmile_app_staff WHERE first_name='דוד' AND last_name='שמש' LIMIT 1), (SELECT MIN(staff_id) FROM childsmile_app_staff)),
  'דוד שמש',
  '2026-03-26 14:32:05', '2026-03-26 14:32:05',
  '2026-03-26', 505, 'חישוב דלק שלוש ימי כיף אחרי חישוב קמ',
  'https://drive.google.com/open?id=17CbsprcmgJvCByls783oX7RJ-OvG0bd-',
  'שולם', 'ביט', '0537117493', 'admin_import'
);

-- ── ראובן אלדרי ───────────────────────────────────────────────
INSERT INTO childsmile_app_expenserefund
  (staff_id, staff_full_name, created_at, updated_at, expense_date, requested_amount, description, file_url, status, refund_method, phone_number, updated_by)
VALUES (
  COALESCE((SELECT staff_id FROM childsmile_app_staff WHERE first_name='ראובן' AND last_name='אלדרי' LIMIT 1), (SELECT MIN(staff_id) FROM childsmile_app_staff)),
  'ראובן אלדרי',
  '2026-03-26 20:40:04', '2026-03-26 20:40:04',
  '2026-03-26', 175, '2 פיצות בשובר 45 ועוד אחת בהנחה פלוס שתיה יום כיף למשפחה בחריש',
  'https://drive.google.com/open?id=1NlkVlYQKFOihzC5EEtYjuGzVOcgPXeMw',
  'שולם', 'ביט', '0559844081', 'admin_import'
);

-- ── אביה פרוכטר — 30/03/2026 ─────────────────────────────────
INSERT INTO childsmile_app_expenserefund
  (staff_id, staff_full_name, created_at, updated_at, expense_date, requested_amount, description, file_url, status, refund_method, phone_number, updated_by)
VALUES (
  COALESCE((SELECT staff_id FROM childsmile_app_staff WHERE first_name='אביה' AND last_name='פרוכטר' LIMIT 1), (SELECT MIN(staff_id) FROM childsmile_app_staff)),
  'אביה פרוכטר',
  '2026-03-30 16:36:20', '2026-03-30 16:36:20',
  '2026-03-30', 30, 'היינו ביום כיף עם ריף ובגלל פסח אף אחד לא הסכים להתרים אז קנינו לה ציפס ושתיה',
  'https://drive.google.com/open?id=1ZLlXqWwkmNCRWcs6mpBRwTm5udV05xjQ',
  'שולם', 'ביט', '0543451809', 'admin_import'
);

-- ── אורי אריה — 13/04/2026 ───────────────────────────────────
INSERT INTO childsmile_app_expenserefund
  (staff_id, staff_full_name, created_at, updated_at, expense_date, requested_amount, description, file_url, status, refund_method, phone_number, updated_by)
VALUES (
  COALESCE((SELECT staff_id FROM childsmile_app_staff WHERE first_name='אורי' AND last_name='אריה' LIMIT 1), (SELECT MIN(staff_id) FROM childsmile_app_staff)),
  'אורי אריה',
  '2026-04-13 11:11:34', '2026-04-13 11:11:34',
  '2026-04-13', 150, 'עשיתי יום כיף והבאתי רכב מהבית וההחזר על הדלק',
  'https://drive.google.com/open?id=1nvnrUJrKdtSIh4ZRqNTndYWx4iC24Ye8',
  'שולם', 'ביט', '0524598003', 'admin_import'
);

-- ── אגם מלכה ──────────────────────────────────────────────────
INSERT INTO childsmile_app_expenserefund
  (staff_id, staff_full_name, created_at, updated_at, expense_date, requested_amount, description, file_url, status, refund_method, phone_number, updated_by)
VALUES (
  COALESCE((SELECT staff_id FROM childsmile_app_staff WHERE first_name='אגם' AND last_name='מלכה' LIMIT 1), (SELECT MIN(staff_id) FROM childsmile_app_staff)),
  'אגם מלכה',
  '2026-04-13 20:45:50', '2026-04-13 20:45:50',
  '2026-03-24', 75, 'יום כיף לנועם גבאי נסענו מנתניה קדימה צורן פתח תקווה אחרי זה לאור יהודה',
  'https://drive.google.com/open?id=1gV4ci0WwlV4zezLp5sxrAYtdn4YpNUwY',
  'שולם', 'ביט', '0546279195', 'admin_import'
);

-- ── נויה דוידזון — 12/04/2026 ───────────────────────────────
INSERT INTO childsmile_app_expenserefund
  (staff_id, staff_full_name, created_at, updated_at, expense_date, requested_amount, description, file_url, status, refund_method, phone_number, updated_by)
VALUES (
  COALESCE((SELECT staff_id FROM childsmile_app_staff WHERE first_name='נויה' AND last_name='דוידזון' LIMIT 1), (SELECT MIN(staff_id) FROM childsmile_app_staff)),
  'נויה דוידזון',
  '2026-04-14 13:26:00', '2026-04-14 13:26:00',
  '2026-04-12', 32.2, 'חניון ביום כיף',
  'https://drive.google.com/open?id=1X-FgWzzZ3juiLcijDowc9jy3L7CuCLR6',
  'שולם', 'ביט', '0543084166', 'admin_import'
);

-- ── מורן עזיז ─────────────────────────────────────────────────
INSERT INTO childsmile_app_expenserefund
  (staff_id, staff_full_name, created_at, updated_at, expense_date, requested_amount, description, file_url, status, refund_method, phone_number, updated_by)
VALUES (
  COALESCE((SELECT staff_id FROM childsmile_app_staff WHERE first_name='מורן' AND last_name='עזיז' LIMIT 1), (SELECT MIN(staff_id) FROM childsmile_app_staff)),
  'מורן עזיז',
  '2026-04-17 11:33:15', '2026-04-17 11:33:15',
  '2026-04-16', 160, 'ארוחות במקדונלדס וכדור בפוט לוקר',
  'https://drive.google.com/open?id=1h8_LGkglh0h1z32lFf7XpDMM6bOWZ5-5',
  'שולם', 'ביט', '0528969676', 'admin_import'
);

-- ── תהילה שרון ─────────────────────────────────────────────────
INSERT INTO childsmile_app_expenserefund
  (staff_id, staff_full_name, created_at, updated_at, expense_date, requested_amount, description, file_url, status, refund_method, phone_number, updated_by)
VALUES (
  COALESCE((SELECT staff_id FROM childsmile_app_staff WHERE first_name='תהילה' AND last_name='שרון' LIMIT 1), (SELECT MIN(staff_id) FROM childsmile_app_staff)),
  'תהילה שרון',
  '2026-04-27 19:36:04', '2026-04-27 19:36:04',
  '2026-04-27', 75, 'עשינו יום כיף והתרמנו מסעדה לחמישה אנשים בסוף האבא גם הצטרף ולא הסכימו להתרים לנו לעוד אחד אז שילמנו על הארוחה',
  'https://drive.google.com/open?id=1uX5a2whMP_I2wiA58pswViLRJH4GHeZq',
  'שולם', 'ביט', '0515002488', 'admin_import'
);

-- ── רוני אמיתי ────────────────────────────────────────────────
INSERT INTO childsmile_app_expenserefund
  (staff_id, staff_full_name, created_at, updated_at, expense_date, requested_amount, description, file_url, status, refund_method, phone_number, updated_by, approved_by)
VALUES (
  COALESCE((SELECT staff_id FROM childsmile_app_staff WHERE first_name='רוני' AND last_name='אמיתי' LIMIT 1), (SELECT MIN(staff_id) FROM childsmile_app_staff)),
  'רוני אמיתי',
  '2026-05-03 19:04:50', '2026-05-03 19:04:50',
  '2026-05-03', 97, 'קניתי לחניכה גלידה והמבורגר',
  'https://drive.google.com/open?id=1347beZRdbqUplCAALQQAnfBFy2VcSmYa',
  'שולם', 'ביט', '0524000046', 'admin_import', 'נבו'
);

-- ── נועה נויזץ ────────────────────────────────────────────────
INSERT INTO childsmile_app_expenserefund
  (staff_id, staff_full_name, created_at, updated_at, expense_date, requested_amount, description, file_url, status, refund_method, phone_number, updated_by, volunteer_comment)
VALUES (
  COALESCE((SELECT staff_id FROM childsmile_app_staff WHERE first_name='נועה' AND last_name='נויזץ' LIMIT 1), (SELECT MIN(staff_id) FROM childsmile_app_staff)),
  'נועה נויזץ',
  '2026-05-03 19:29:13', '2026-05-03 19:29:13',
  '2026-04-20', 260, '200 שקלים על אוכל במקדונלדס, 60 שקלים בווייטפול על האחיינית (הסכימו להתרים רק לילדה ולאח)',
  'https://drive.google.com/open?id=1hpdhFqyfzwdnwPLJB4BODVcTy5FWnnSQ',
  'שולם', 'ביט', '0559867900', 'admin_import',
  'האסמכתא בווייטפול לא תואמת כי חייבו ואז החזירו חלק, בסוף שילמתי רק 60'
);

-- ── אורי אריה ─────────────────────────────────────────────────
INSERT INTO childsmile_app_expenserefund
  (staff_id, staff_full_name, created_at, updated_at, expense_date, requested_amount, description, file_url, status, refund_method, phone_number, updated_by)
VALUES (
  COALESCE((SELECT staff_id FROM childsmile_app_staff WHERE first_name='אורי' AND last_name='אריה' LIMIT 1), (SELECT MIN(staff_id) FROM childsmile_app_staff)),
  'אורי אריה',
  '2026-05-03 23:15:06', '2026-05-03 23:15:06',
  '2026-05-03', 80, 'דלק לרכב',
  'https://drive.google.com/open?id=1SA3CQqMM7BUGdv0NPADg8pWfyMdzYmFq',
  'שולם', 'ביט', '0524598003', 'admin_import'
);

-- ── אורי אריה — 19/05/2026 ───────────────────────────────────
INSERT INTO childsmile_app_expenserefund
  (staff_id, staff_full_name, created_at, updated_at, expense_date, requested_amount, description, file_url, status, refund_method, phone_number, updated_by, approved_by)
VALUES (
  COALESCE((SELECT staff_id FROM childsmile_app_staff WHERE first_name='אורי' AND last_name='אריה' LIMIT 1), (SELECT MIN(staff_id) FROM childsmile_app_staff)),
  'אורי אריה',
  '2026-05-19 21:17:10', '2026-05-19 21:17:10',
  '2026-05-19', 85, 'דלק ליום כיף',
  'https://drive.google.com/open?id=1gISN_ylNLzkIYz62x4jxahomS6rnKy0w',
  'שולם', 'ביט', '0524598003', 'admin_import', 'ליאם'
);

-- ── שירה שרון ─────────────────────────────────────────────────
INSERT INTO childsmile_app_expenserefund
  (staff_id, staff_full_name, created_at, updated_at, expense_date, requested_amount, description, file_url, status, refund_method, phone_number, updated_by)
VALUES (
  COALESCE((SELECT staff_id FROM childsmile_app_staff WHERE first_name='שירה' AND last_name='שרון' LIMIT 1), (SELECT MIN(staff_id) FROM childsmile_app_staff)),
  'שירה שרון',
  '2026-05-20 14:41:04', '2026-05-20 14:41:04',
  '2026-05-19', 145, 'אוכל ביום כיף',
  'https://drive.google.com/open?id=1j6HXWC8c86LPtNF8q-KLd4903lv8Ddvg',
  'שולם', 'ביט', '0515002488', 'admin_import'
);

-- ── רוני רוזנבלום ─────────────────────────────────────────────
INSERT INTO childsmile_app_expenserefund
  (staff_id, staff_full_name, created_at, updated_at, expense_date, requested_amount, description, file_url, status, refund_method, phone_number, updated_by)
VALUES (
  COALESCE((SELECT staff_id FROM childsmile_app_staff WHERE first_name='רוני' AND last_name='רוזנבלום' LIMIT 1), (SELECT MIN(staff_id) FROM childsmile_app_staff)),
  'רוני רוזנבלום',
  '2026-05-20 14:41:04', '2026-05-20 14:41:04',
  '2026-05-19', 61.5, 'הכנו כדורי שוקולד',
  'https://drive.google.com/open?id=18XVkeMwfd_AE-cD8VtP094c06ReVhRXR',
  'שולם', 'ביט', '0585213142', 'admin_import'
);

-- ── טל לנגרמן ─────────────────────────────────────────────────
INSERT INTO childsmile_app_expenserefund
  (staff_id, staff_full_name, created_at, updated_at, expense_date, requested_amount, description, file_url, status, refund_method, updated_by, approved_by)
VALUES (
  COALESCE((SELECT staff_id FROM childsmile_app_staff WHERE first_name='טל' AND last_name='לנגרמן' LIMIT 1), (SELECT MIN(staff_id) FROM childsmile_app_staff)),
  'טל לנגרמן',
  '2026-05-23 23:12:43', '2026-05-23 23:12:43',
  '2026-05-19', 174, 'כיבוד לערב מתנדבים',
  'https://drive.google.com/open?id=1B5dz6uT9QkikRvPftx1A9jjR-fLddEXR',
  'שולם', 'ביט', 'admin_import', 'טל'
);

-- ── אביה פרוכטר — 24/05/2026 ─────────────────────────────────
INSERT INTO childsmile_app_expenserefund
  (staff_id, staff_full_name, created_at, updated_at, expense_date, requested_amount, description, file_url, status, refund_method, phone_number, updated_by, approved_by)
VALUES (
  COALESCE((SELECT staff_id FROM childsmile_app_staff WHERE first_name='אביה' AND last_name='פרוכטר' LIMIT 1), (SELECT MIN(staff_id) FROM childsmile_app_staff)),
  'אביה פרוכטר',
  '2026-05-24 21:22:56', '2026-05-24 21:22:56',
  '2026-05-24', 50, 'היינו ביום כיף והתרמתי פיצה אבל היא הייתה עם גלוטון והם לא הסכימו להתרים פיצה ללא גלוטון וזה באישור של טל',
  'https://drive.google.com/open?id=1vuAa4LdU6e8VTOlliHUIr_aE0sCMLdii',
  'שולם', 'ביט', '0543451809', 'admin_import', 'טל'
);

-- ── דניאל ולץ — 25/05/2026 ───────────────────────────────────
INSERT INTO childsmile_app_expenserefund
  (staff_id, staff_full_name, created_at, updated_at, expense_date, requested_amount, description, file_url, status, refund_method, phone_number, updated_by, approved_by)
VALUES (
  COALESCE((SELECT staff_id FROM childsmile_app_staff WHERE first_name='דניאל' AND last_name='ולץ' LIMIT 1), (SELECT MIN(staff_id) FROM childsmile_app_staff)),
  'דניאל ולץ',
  '2026-05-25 23:26:52', '2026-05-25 23:26:52',
  '2026-05-25', 260, 'קרטינג ל4 אנשים אחרי הנחה שתי מתנדבים ושתי חניכות',
  'https://drive.google.com/open?id=1nf8VFLViro6jAzCO_vZTWM_LJD3bLJ-z',
  'שולם', 'ביט', '0543394025', 'admin_import', 'אורי'
);

-- ── עדי שחם — 26/05/2026 ─────────────────────────────────────
INSERT INTO childsmile_app_expenserefund
  (staff_id, staff_full_name, created_at, updated_at, expense_date, requested_amount, description, file_url, status, refund_method, phone_number, updated_by, approved_by)
VALUES (
  COALESCE((SELECT staff_id FROM childsmile_app_staff WHERE first_name='עדי' AND last_name='שחם' LIMIT 1), (SELECT MIN(staff_id) FROM childsmile_app_staff)),
  'עדי שחם',
  '2026-05-26 20:59:36', '2026-05-26 20:59:36',
  '2026-05-26', 106, 'מגש פיצה עם תוספת ו2 בקבוקי שתייה קטנים',
  'https://drive.google.com/open?id=11G3tD7EkUSTDtq62tVZaUxK43UP_4NvP',
  'שולם', 'ביט', '0542766735', 'admin_import', 'טל'
);

-- ── Verify ────────────────────────────────────────────────────
SELECT COUNT(*) AS inserted_count,
       MIN(expense_date) AS earliest,
       MAX(expense_date) AS latest
FROM childsmile_app_expenserefund
WHERE updated_by = 'admin_import';
