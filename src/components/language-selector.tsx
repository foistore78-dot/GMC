
'use client';

import { useLanguage } from './language-provider';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import Image from 'next/image';

const languages = [
  { code: 'it', flag: '/flags/it.svg', name: 'Italiano' },
  { code: 'en', flag: '/flags/en.svg', name: 'English' },
  { code: 'sl', flag: '/flags/sl.svg', name: 'Sloveno' },
];

export function LanguageSelector() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-2 rounded-full bg-secondary p-1 border border-primary/20">
      {languages.map((lang) => (
        <Button
          key={lang.code}
          variant="ghost"
          onClick={() => setLanguage(lang.code as any)}
          className={cn(
            'rounded-full w-12 h-12 p-0 transition-all duration-300',
            language === lang.code
              ? 'bg-primary/20 ring-2 ring-primary'
              : 'opacity-50 hover:opacity-100 hover:bg-primary/10'
          )}
          aria-label={`Switch to ${lang.name}`}
        >
          <Image src={lang.flag} alt={`${lang.name} flag`} width={28} height={28} className="rounded-full" />
        </Button>
      ))}
    </div>
  );
}
