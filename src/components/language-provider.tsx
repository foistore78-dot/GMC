
'use client';

import { createContext, useContext, useState, ReactNode, useMemo, useEffect } from 'react';
import { translations } from '@/lib/translations';

type Language = 'it' | 'en' | 'sl';
type Translations = typeof translations.it;

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: keyof Translations | string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>('it');

  useEffect(() => {
    // You could also try to get language from browser settings or local storage
    // For now, it defaults to 'it'
  }, []);

  const t = useMemo(() => {
    const currentTranslations = translations[language] || translations.it;
    
    return (key: string): string => {
      const keys = key.split('.');
      let result: any = currentTranslations;
      for (const k of keys) {
        result = result?.[k];
        if (result === undefined) {
          // Fallback to Italian if key not found in current language
          let fallbackResult: any = translations.it;
          for (const fk of keys) {
            fallbackResult = fallbackResult?.[fk];
            if (fallbackResult === undefined) return key; // return key if not found in fallback either
          }
          return fallbackResult;
        }
      }
      return result || key;
    };
  }, [language]);

  const value = {
    language,
    setLanguage,
    t,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
