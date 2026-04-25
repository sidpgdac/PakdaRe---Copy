import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './data/i18n/en.json';
import hi from './data/i18n/hi.json';
import mr from './data/i18n/mr.json';

const LANG_KEY = 'pakdare-lang';
const savedLang = localStorage.getItem(LANG_KEY) || 'en';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
      mr: { translation: mr },
    },
    lng: savedLang,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });

// Persist language changes
i18n.on('languageChanged', (lng) => {
  localStorage.setItem(LANG_KEY, lng);
});

export default i18n;
