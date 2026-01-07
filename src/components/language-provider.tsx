
'use client';

import React, { createContext, useContext, useState, ReactNode, useMemo } from 'react';
import { translations } from '@/lib/translations';
import { get } from 'lodash';

type Language = 'it' | 'en' | 'sl';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>('it');

  const t = useMemo(() => (key: string): string => {
    return get(translations[language], key, key);
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
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
