'use client';

import { createContext, useContext, useEffect } from 'react';

import { LOCALE_HTML_LANG } from './config';
import { getDictionary } from './get-dictionary';

import type { Locale } from './config';
import type { Dictionary } from './get-dictionary';

interface LocaleContextValue {
  locale: Locale;
  t: Dictionary;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: 'en',
  t: getDictionary('en'),
});

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}): React.ReactElement {
  const t = getDictionary(locale);

  useEffect(() => {
    document.documentElement.lang = LOCALE_HTML_LANG[locale];
  }, [locale]);

  return (
    <LocaleContext.Provider value={{ locale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  return useContext(LocaleContext);
}
