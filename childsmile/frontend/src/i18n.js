import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      "Login successful!": "Login successful!",
      "Invalid username": "Invalid username",
      "Invalid password": "Invalid password",
      "An error occurred. Please try again.": "An error occurred. Please try again.",
      "Technical Coordinator": "Technical Coordinator",
      "Volunteer Coordinator": "Volunteer Coordinator",
      "Families Coordinator": "Families Coordinator",
      "Tutors Coordinator": "Tutors Coordinator",
      "Matures Coordinator": "Matures Coordinator",
      "Healthy Kids Coordinator": "Healthy Kids Coordinator",
      "System Administrator": "System Administrator",
      "General Volunteer": "General Volunteer",
      "Select": "Select",
      "Error fetching tasks": "Error fetching tasks",
      "Error fetching staff": "Error fetching staff",
      "Error fetching children": "Error fetching children",
      "Error fetching tutors": "Error fetching tutors",
      "Error fetching data": "Error fetching data",
      "Error creating task": "Error creating task",
      "Error updating task": "Error updating task",
      "Error deleting task": "Error deleting task",
      "Task created successfully": "Task created successfully",
      "Task updated successfully": "Task updated successfully",
      "Task deleted successfully": "Task deleted successfully",
      "Request failed with status code 401": "Request failed with status code 401",
      "Update Task Status": "Update Task Status",
      "Select a new status for the task": "Select a new status for the task",
      "Please select a status": "Please select a status",
      "לא הושלמה": "not completed",
      "בביצוע": "in progress",
      "הושלמה": "completed",
      "Confirm Update": "Confirm Update",
      "Edit Task": "Edit Task",
      "Task Type": "Task Type",
      "Due Date": "Due Date",
      "Assigned To": "Assigned To",
      "Child": "Child",
      "Update Task": "Update Task",
      "You do not have permission to generate this report": "You do not have permission to generate this report",
      "Active Tutors Report": "Active Tutors Report",
      "Families Per Location Report": "Families Per Location Report",
      "New Families Report": "New Families Report",
      "Families Waiting For Tutorship Report": "Families Waiting For Tutorship Report",
      "Possible Tutorship Matches Report": "Possible Tutorship Matches Report",
      "Volunteer Feedback Report": "Volunteer Feedback Report",
      "Tutor Feedback Report": "Tutor Feedback Report",
      "active_tutors_report": "Active Tutors Report",
      "families_per_location_report": "Families Per Location Report",
      "new_families_report": "New Families Report",
      "families_waiting_for_tutorship_report": "Families Waiting For Tutorship Report",
      "possible_tutorship_matches_report": "Possible Tutorship Matches Report",
      "volunteer_feedback_report": "Volunteer Feedback Report",
      "tutor_feedback_report": "Tutor Feedback Report",
      "Report generated successfully": "Report generated successfully",
      "Error generating report": "Error generating report",
      "Tutor Name": "Tutor Name",
      "Child Name": "Child Name",
      "Tutorship Matching Date": "Tutorship Matching Date",
      "No data available": "No data available",
      "Select a date": "Select a date",
      "From Date": "From Date",
      "To Date": "To Date",
      "Export to Excel": "Export to Excel",
      "Export to PDF": "Export to PDF",
      "TEST REPORT NAME": "TEST REPORT NAME",
      "Filter": "Filter",
      "Refresh": "Refresh"
    }
  },
  he: {
    translation: {
      "Active Tutors Report": "דוח חונכים פעילים",
      "active_tutors_report": "דוח חונכים פעילים",
      "families_per_location_report": "דוח משפחות לפי מיקום",
      "new_families_report": "דוח משפחות חדשות",
      "families_waiting_for_tutorship_report": "דוח משפחות הממתינות לחונכות",
      "possible_tutorship_matches_report": "דוח התאמות חניך חונך פוטנציאליות",
      "volunteer_feedback_report": "דוח משוב מתנדבים",
      "tutor_feedback_report": "דוח משוב חונכים",
      "Anything Else": "משהו נוסף",
      "An error occurred. Please try again.": "אירעה שגיאה. אנא נסה שוב.",
      "Assigned To": "משוייך ל",
      "Child": "חניך",
      "Child Age": "גיל הילד",
      "Child City": "עיר הילד",
      "Child Full Name": "שם הילד",
      "Child Name": "שם החניך",
      "City": "עיר",
      "Comments": "הערות",
      "Confirm Update": "בצע עדכון",
      "Description": "תיאור",
      "Distance Between Cities (km)": "מרחק בין ערים בקמ",
      "Due Date": "תאריך סופי לביצוע",
      "Edit Task": "ערוך משימה",
      "Error creating task": "שגיאה ביצירת משימה",
      "Error deleting task": "שגיאה במחיקת משימה",
      "Error fetching children": "שגיאה בטעינת פרטי משפחה",
      "Error fetching data": "שגיאה בטעינת נתונים",
      "Error fetching staff": "שגיאה בטעינת צוות",
      "Error fetching tasks": "שגיאה בטעינת משימות",
      "Error fetching tutors": "שגיאה בטעינת חונכים",
      "Error generating report": "שגיאה ביצירת הדוח",
      "Error updating task": "שגיאה בעדכון משימה",
      "Event Date": "תאריך האירוע",
      "Export Map as Image": "ייצא מפה כתמונה",
      "Export to Excel": "ייצוא לאקסל",
      "Export to PDF": "ייצוא לPDF",
      "Exporting...": "מייצא...",
      "Exceptional Events": "אירועים חריגים",
      "Families Per Location Report": "דוח משפחות לפי מיקום",
      "Families Waiting for Tutorship Report": "דוח משפחות הממתינות לחונכות",
      "Father Name": "שם האב",
      "Father Phone": "טלפון האב",
      "Feedback Filled At": "מילוי המשוב",
      "Filter": "סנן",
      "From Date": "מתאריך",
      "General Volunteer": "מתנדב כללי",
      "Grade": "רמת ההתאמה 1-100",
      "Healthy Kids Coordinator": "רכז בריאים",
      "Invalid password": "סיסמה שגויה אנא נסה שוב",
      "Invalid username": "שם משתמש שגוי או לא קיים אנא נסה שוב",
      "Is First Visit?": "האם זו הפגישה הראשונה?",
      "Is It Your Tutee?": "האם זה החניך שלך?",
      "Loading data...": "הנתונים בטעינה...",
      "Login successful!": "ההתחברות הצליחה!",
      "Max Distance": "מרחק מקסימלי",
      "Mother Name": "שם האם",
      "Mother Phone": "טלפון האם",
      "New Families Report": "דוח משפחות חדשות",
      "No": "לא",
      "No data available": "אין נתונים זמינים",
      "No data to display": "אין נתונים להצגה",
      "No data to export": "אין נתונים לייצוא",
      "Please select a date": "אנא בחר תאריך",
      "Please select a status": "אנא בחר סטטוס",
      "Please select both From Date and To Date": "אנא בחר טווח תאריכים",
      "Possible Matches Report": "דוח התאמות פוטנציאליות",
      "Possible Tutorship Matches": "דוח התאמות פוטנציאליות",
      "Possible Tutorship Matches Report": "דוח התאמות חניך חונך פוטנציאליות",
      "Refresh": "רענן",
      "Registration Date": "תאריך רישום",
      "Report generated successfully": "הדוח נוצר בהצלחה",
      "Request failed with status code 401": "אין הרשאות לביצוע פעולה זו",
      "Select": "בחר",
      "Select a date": "בחר תאריך",
      "Select a new status for the task": "בחר סטטוס חדש למשימה",
      "Select a status": "בחר סטטוס",
      "System Administrator": "מנהל מערכת",
      "Task Type": "סוג משימה",
      "Task created successfully": "המשימה נוצרה בהצלחה!",
      "Task deleted successfully": "המשימה נמחקה בהצלחה!",
      "Task updated successfully": "המשימה עודכנה בהצלחה!",
      "Technical Coordinator": "רכז טכני",
      "TEST REPORT NAME": "שם דוח לדוגמה",
      "To Date": "עד תאריך",
      "Tutor": "חונך",
      "Tutor Age": "גיל החונך",
      "Tutor City": "עיר החונך",
      "Tutor Feedback Report": "דוח משוב חונכים",
      "Tutor Full Name": "שם החונך",
      "Tutor Name": "שם החונך",
      "Tutoring Status": "מצב חונכות",
      "Tutors Coordinator": "רכז חונכים",
      "Tutorship Matching Date": "תאריך התאמת חונכות",
      "Tutee Name": "שם החניך",
      "Update Task": "עדכן משימה",
      "Update Task Status": "עדכון סטטוס משימה",
      "Volunteer Coordinator": "רכז מתנדבים",
      "Volunteer Feedback Report": "דוח משוב מתנדבים",
      "Volunteer Name": "שם המתנדב",
      "Yes": "כן",
      "You do not have permission to generate this report": "אין לך הרשאה לייצר דוח זה",
      "אנא בחר טווח תאריכים": "אנא בחר טווח תאריכים",
      "בביצוע": "בביצוע",
      "הושלמה": "הושלמה",
      "לא הושלמה": "לא הושלמה",
      "משהו נוסף": "משהו נוסף",
      "Matures Coordinator": "רכז בוגרים",
      "רכז חונכים": "רכז חונכים",
      "רכז טכני": "רכז טכני",
      "Families Coordinator": "רכז משפחות",
      "רכז מתנדבים": "רכז מתנדבים",
      "רכז בריאים": "רכז בריאים",
      "מנהל מערכת": "מנהל מערכת",
      "מתנדב כללי": "מתנדב כללי",
      "Select a city": "בחר עיר",
      "First Name": "שם פרטי",
      "Surname": "שם משפחה",
      "Email": "אימייל",
      "Phone": "טלפון נייד",
      "Want to be a Tutor?": "רוצה להיות חונך?",
      "Comment": "הערות",
      "Age": "גיל",
      "Gender": "מין",
      "Register": "הרשמה להתנדבות - חיוך של ילד",
      "Male": "זכר",
      "Female": "נקבה",
      "Registration failed. Please try again.": "הרשמה נכשלה. אנא נסה שוב.",
      "First name must be in Hebrew and cannot be empty.": "שם פרטי חייב להיות בעברית ולא יכול להיות ריק.",
      "Surname must be in Hebrew and cannot be empty.": "שם משפחה חייב להיות בעברית ולא יכול להיות ריק.",
      "Age must be between 18 and 100.": "גיל חייב להיות בין 18 ל-100.",
      "Please select a valid gender.": "אנא בחר מין תקף.",
      "Phone number must start with 050-059 and have exactly 7 digits.": "מספר טלפון חייב להתחיל ב050-059 ולכלול בדיוק 7 ספרות.",
      "Please enter a valid email address.": "אנא הכנס כתובת אימייל תקפה.",
      "Please select if you want to be a tutor.": "אנא בחר אם אתה רוצה להיות חונך.",
      "Welcome to Child Smile! Please log in with your credentials: Username: {{username}}, Password: 1234": "ברוך הבא לחיוך של ילד! אנא המתן לקבלת הרשאות לשם התחברות: שם משתמש: {{username}}, סיסמה: 1234",
      "Please select a city.": "אנא בחר עיר.",
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'he', // Default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;