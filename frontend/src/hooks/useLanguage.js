import { useContext } from 'react';
import { LanguageContext } from '../context/LanguageContext';
import { translations } from '../locales';

export const useLanguage = () => {
  const context = useContext(LanguageContext);

  // Fallback to default values if context is not available
  const language = context?.language || 'en';
  const changeLanguage = context?.changeLanguage || (() => { });
  const t = translations[language] || translations.en;

  return {
    language,
    changeLanguage,
    t
  };
};

