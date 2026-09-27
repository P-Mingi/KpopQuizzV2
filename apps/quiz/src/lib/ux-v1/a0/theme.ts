'use client';

import { useEffect, useState } from 'react';

// Night mode for v11 = the EXISTING class-based system (owner decision): the same
// localStorage['theme'] key and html.light / html.dark classes the root layout's
// pre-paint script and ThemeInit use. Absent key = follow the OS. No new system.

export type ThemeChoice = 'system' | 'light' | 'dark';

/** Browser chrome colour per theme = the v11 page ground (`--ux-page`; light is the
 *  live site's warm #FAF8F5 since the owner request of 2026-09-27, the same value the
 *  root layout's server `themeColor` already sends). a0.test.ts keeps it in sync. */
export const THEME_COLOR = { light: '#FAF8F5', dark: '#141312' } as const;

export function effectiveTheme(): 'light' | 'dark' {
  if (typeof document === 'undefined') return 'light';
  const c = document.documentElement.classList;
  if (c.contains('dark')) return 'dark';
  if (c.contains('light')) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function storedTheme(): ThemeChoice {
  try {
    const t = localStorage.getItem('theme');
    if (t === 'light' || t === 'dark') return t;
  } catch { /* storage blocked */ }
  return 'system';
}

/** Apply + persist a choice exactly like the legacy ThemeToggle / appearance setting. */
export function applyTheme(choice: ThemeChoice): void {
  const root = document.documentElement;
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    root.classList.add('theme-transition');
    window.setTimeout(() => root.classList.remove('theme-transition'), 280);
  }
  root.classList.remove('light', 'dark');
  try {
    if (choice === 'system') localStorage.removeItem('theme');
    else localStorage.setItem('theme', choice);
  } catch { /* storage blocked: applies for this session */ }
  if (choice !== 'system') root.classList.add(choice);
  const color = THEME_COLOR[effectiveTheme()];
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', color));
}

/** Live effective theme (follows class changes by any toggle and OS changes). */
export function useEffectiveTheme(): 'light' | 'dark' {
  const [t, setT] = useState<'light' | 'dark'>('light');
  useEffect(() => {
    const sync = (): void => setT(effectiveTheme());
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', sync);
    return () => { obs.disconnect(); mq.removeEventListener('change', sync); };
  }, []);
  return t;
}
