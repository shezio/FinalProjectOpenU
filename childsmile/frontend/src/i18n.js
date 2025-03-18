import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      "Login successful!": "Login successful!",
      "Invalid username": "Invalid username",
      "Invalid password": "Invalid password",
      "An error occurred. Please try again.": "An error occurred. Please try again."
    }
  },
  he: {
    translation: {
      "Login successful!": "ההתחברות הצליחה!",
      "Invalid username": "שם משתמש שגוי או לא קיים אנא נסה שוב",
      "Invalid password": "סיסמה שגויה אנא נסה שוב",
      "An error occurred. Please try again.": "אירעה שגיאה. אנא נסה שוב."
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