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
      "Tutor": "Tutor",
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
      "Select a status": "Select a status",
      "Edit Task": "Edit Task",
      "Task Type": "Task Type",
      "Due Date": "Due Date",
      "Assigned To": "Assigned To",
      "Child": "Child",
      "Tutor": "Tutor",
      "Update Task": "Update Task",
    }
  },
  he: {
    translation: {
      "Login successful!": "ההתחברות הצליחה!",
      "Invalid username": "שם משתמש שגוי או לא קיים אנא נסה שוב",
      "Invalid password": "סיסמה שגויה אנא נסה שוב",
      "An error occurred. Please try again.": "אירעה שגיאה. אנא נסה שוב.",
      "Technical Coordinator": "רכז טכני",
      "Volunteer Coordinator": "רכז מתנדבים",
      "Families Coordinator": "רכז משפחות",
      "Tutors Coordinator": "רכז חונכים",
      "Matures Coordinator": "רכז בוגרים",
      "Healthy Kids Coordinator": "רכז בריאים",
      "System Administrator": "מנהל מערכת",
      "General Volunteer": "מתנדב כללי",
      "Tutor": "חונך",
      "Select": "בחר",
      "Error fetching tasks": "שגיאה בטעינת משימות",
      "Error fetching staff": "שגיאה בטעינת צוות",
      "Error fetching children": "שגיאה בטעינת ילדים",
      "Error fetching tutors": "שגיאה בטעינת חונכים",
      "Error fetching data": "שגיאה בטעינת נתונים",
      "Error creating task": "שגיאה ביצירת משימה",
      "Error updating task": "שגיאה בעדכון משימה",
      "Error deleting task": "שגיאה במחיקת משימה",
      "Task created successfully": "המשימה נוצרה בהצלחה!",
      "Task updated successfully": "המשימה עודכנה בהצלחה!",
      "Task deleted successfully": "המשימה נמחקה בהצלחה!",
      "Request failed with status code 401": "אין הרשאות לביצוע פעולה זו",
      "Update Task Status": "עדכון סטטוס משימה",
      "Select a new status for the task": "בחר סטטוס חדש למשימה",
      "Please select a status": "אנא בחר סטטוס",
      "Select a status": "בחר סטטוס",
      "לא הושלמה": "לא הושלמה",
      "בביצוע": "בביצוע",
      "הושלמה": "הושלמה",
      "Confirm Update": "בצע עדכון",
      "Edit Task": "ערוך משימה",
      "Task Type": "סוג משימה",
      "Due Date": "תאריך סופי לביצוע",
      "Assigned To": "משוייך ל",
      "Child": "חניך",
      "Tutor": "חונך",
      "Update Task": "עדכן משימה",
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