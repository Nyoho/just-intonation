import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import translationEN from './locales/en.json';
import translationJA from './locales/ja.json';

// 翻訳リソース
const resources = {
  en: {
    translation: translationEN
  },
  ja: {
    translation: translationJA
  }
};

i18n
  // ブラウザの言語を検出
  .use(LanguageDetector)
  // react-i18nextを初期化
  .use(initReactI18next)
  // i18nの初期化
  .init({
    resources,
    fallbackLng: 'en', // フォールバック言語
    interpolation: {
      escapeValue: false // XSS対策をReactが行うので不要
    }
  });

export default i18n;