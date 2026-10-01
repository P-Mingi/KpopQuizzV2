'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Icon } from '@/components/ux-v1/icon';
import { getLocaleFromPathname, LOCALE_LABELS, stripLocalePrefix, TRANSLATED_ROUTES } from '@/lib/i18n/config';
import { applyTheme, useEffectiveTheme } from '@/lib/ux-v1/a0/theme';

import type { Locale } from '@/lib/i18n/config';

/** Footer theme switch (prototype: "Dark mode" / "Light mode"), the existing theme system. */
export function UxFooterTheme(): React.ReactElement {
  const dark = useEffectiveTheme() === 'dark';
  return (
    <button type="button" onClick={() => applyTheme(dark ? 'light' : 'dark')} suppressHydrationWarning>
      <Icon name={dark ? 'sun' : 'moon'} size="sm" />
      <span suppressHydrationWarning>{dark ? 'Light mode' : 'Dark mode'}</span>
    </button>
  );
}

/** Language link to the /pt mirror (same rule and cookie as the legacy LocaleSwitcher). */
export function UxFooterLocale(): React.ReactElement | null {
  const pathname = usePathname() || '/';
  const current = getLocaleFromPathname(pathname);
  const base = stripLocalePrefix(pathname);
  const target: Locale = current === 'en' ? 'pt' : 'en';
  if (!TRANSLATED_ROUTES.includes(base)) return null;
  const href = target === 'en' ? base : `/pt${base === '/' ? '' : base}`;
  return (
    <Link
      href={href}
      title={`Switch to ${LOCALE_LABELS[target]}`}
      onClick={() => { document.cookie = `preferred_locale=${target};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`; }}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
    >
      <Icon name="globe" size="sm" />{LOCALE_LABELS[target]}
    </Link>
  );
}
