import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import translationEn from './translation/en.json';
import translationZhCN from './translation/zh-CN.json';

export const DEFAULT_LANGUAGE = 'en';
export const SUPPORTED_LANGUAGES = ['en', 'zh-CN'];

export const normalizeLanguage = (language) => {
  return SUPPORTED_LANGUAGES.includes(language) ? language : DEFAULT_LANGUAGE;
};

export const applyLanguage = (language) => {
  return i18n.changeLanguage(normalizeLanguage(language));
};

const resources = {
  en: {
    translation: translationEn
  },
  'zh-CN': {
    translation: translationZhCN
  }
};

i18n
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources,
    lng: DEFAULT_LANGUAGE,
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGES,

    ns: 'translation', // Use translation as the default Namespace that will be loaded by default

    interpolation: {
      escapeValue: false // react already safes from xss
    }
  });

export default i18n;
