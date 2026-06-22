'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import {
  getLocaleFromPathname,
  stripLocalePrefix,
  TRANSLATED_ROUTES,
  LOCALE_LABELS,
} from '@/lib/i18n/config';

import type { Locale } from '@/lib/i18n/config';

function setCookie(locale: Locale): void {
  document.cookie = `preferred_locale=${locale};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
}

export function LocaleSwitcher(): React.ReactElement {
  const pathname = usePathname();
  const currentLocale = getLocaleFromPathname(pathname);
  const basePath = stripLocalePrefix(pathname);

  const targetLocale: Locale = currentLocale === 'en' ? 'pt' : 'en';
  const hasTranslation = TRANSLATED_ROUTES.includes(basePath);

  const targetHref = hasTranslation
    ? targetLocale === 'en'
      ? basePath
      : `/pt${basePath === '/' ? '' : basePath}`
    : null;

  if (!targetHref) return <></>;

  return (
    <Link
      href={targetHref}
      onClick={() => setCookie(targetLocale)}
      className="locale-switcher"
      title={`Switch to ${LOCALE_LABELS[targetLocale]}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '4px 10px',
        borderRadius: 8,
        border: '1px solid var(--border)',
        background: 'transparent',
        color: 'var(--txt2)',
        fontSize: 11,
        fontWeight: 600,
        textDecoration: 'none',
        transition: 'border-color 120ms ease, color 120ms ease',
      }}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
      {LOCALE_LABELS[targetLocale]}
    </Link>
  );
}
