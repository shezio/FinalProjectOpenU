import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      "Login successful!": "Login successful!",
      "Invalid username": "Invalid username",
      "Invalid password": "Invalid password",
      "An error occurred. Please try again.": "An error occurred. Please try again.",
      "Technical Coordinator" : "Technical Coordinator",
      "Volunteer Coordinator" : "Volunteer Coordinator",
      "Families Coordinator" : "Families Coordinator",
      "Tutors Coordinator" : "Tutors Coordinator",
      "Matures Coordinator" : "Matures Coordinator",
      "Healthy Kids Coordinator" : "Healthy Kids Coordinator",
      "System Administrator" : "System Administrator",
      "General Volunteer" : "General Volunteer",
      "Tutor" : "Tutor",
      "Select": "Select",
    }
  },
  he: {
    translation: {
      "Login successful!": "ההתחברות הצליחה!",
      "Invalid username": "שם משתמש שגוי או לא קיים אנא נסה שוב",
      "Invalid password": "סיסמה שגויה אנא נסה שוב",
      "An error occurred. Please try again.": "אירעה שגיאה. אנא נסה שוב.",
      "Technical Coordinator" : "רכז טכני",
      "Volunteer Coordinator" : "רכז מתנדבים",
      "Families Coordinator" : "רכז משפחות",
      "Tutors Coordinator" : "רכז חונכים",
      "Matures Coordinator" : "רכז בוגרים",
      "Healthy Kids Coordinator" : "רכז בריאים",
      "System Administrator" : "מנהל מערכת",
      "General Volunteer" : "מתנדב כללי",
      "Tutor" : "חונך",
      "Select": "בחר",      
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