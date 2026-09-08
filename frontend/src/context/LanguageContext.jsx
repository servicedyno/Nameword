import React, { createContext, useEffect, useState } from "react";

const LanguageContext = createContext({
  language: 'en',
  changeLanguage: () => {}
});

const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('en');

  useEffect(() => {
    const savedLanguage = localStorage.getItem('language');
    if (savedLanguage) {
      setLanguage(savedLanguage);
    } else {
      // Default to browser language if available, otherwise English
      const browserLang = navigator.language.split('-')[0].toLowerCase();
      if (['en', 'es', 'fr'].includes(browserLang)) {
        setLanguage(browserLang);
        localStorage.setItem('language', browserLang);
      } else {
        setLanguage('en');
        localStorage.setItem('language', 'en');
      }
    }
  }, []);

  const changeLanguage = (lang) => {
    if (['en', 'es', 'fr'].includes(lang)) {
      setLanguage(lang);
      localStorage.setItem('language', lang);
    }
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export { LanguageContext, LanguageProvider };

