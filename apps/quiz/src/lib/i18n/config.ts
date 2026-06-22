export const SUPPORTED_LOCALES = ['en', 'pt'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  pt: 'Portugues',
};

export const LOCALE_HTML_LANG: Record<Locale, string> = {
  en: 'en',
  pt: 'pt-BR',
};

export const TRANSLATED_ROUTES: string[] = [
  '/',
  '/about',
  '/faq',
  '/stats',
  '/blindtest',
  '/articles',
  '/easy-kpop-quizzes',
  '/hard-kpop-quizzes',
  '/guess-the-kpop-idol',
  '/kpop-true-or-false',
  '/kpop-quiz-2026',
  '/quizzes',
  '/games',
  '/leaderboard',
];

export function getLocaleFromPathname(pathname: string): Locale {
  if (pathname === '/pt' || pathname.startsWith('/pt/')) return 'pt';
  return 'en';
}

export function stripLocalePrefix(pathname: string): string {
  if (pathname === '/pt') return '/';
  if (pathname.startsWith('/pt/')) return pathname.slice(3);
  return pathname;
}

export function localizeHref(href: string, locale: Locale): string {
  if (locale === 'en') return href;
  if (href === '/') return '/pt';
  return `/pt${href}`;
}
