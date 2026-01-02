'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { translations, defaultLanguage } from './translations';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(defaultLanguage);

  // Load language from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('language');
    if (saved && (saved === 'id' || saved === 'en')) {
      setLanguage(saved);
    }
  }, []);

  const changeLanguage = (lang) => {
    setLanguage(lang);
    localStorage.setItem('language', lang);
  };

  const t = (key) => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
