'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

import { MobileTabBar } from '@/components/layout/mobile-tab-bar';
import { isBuilderCanvas, worldForPath } from '@/lib/world';

/**
 * Keeps the v11 chrome to the Play world, exactly like the legacy chrome does:
 * the builder canvas has no chrome at all, and Verse routes keep their own (the
 * Verse side nav + the legacy mobile tab bar with the Verse tabs). Decided from the
 * path during the static render, so the HTML carries the right chrome per URL.
 */
export function UxChromeGate({ part, children }: { part: 'nav' | 'tabbar'; children: React.ReactNode }): React.ReactElement | null {
  const pathname = usePathname() || '/';
  if (isBuilderCanvas(pathname)) return null;
  if (worldForPath(pathname) === 'verse') return part === 'tabbar' ? <MobileTabBar /> : null;
  return <>{children}</>;
}

/** Hairline under the sticky nav after 8px of scroll (16.5). */
export function UxNavScroll(): null {
  useEffect(() => {
    const nav = document.getElementById('ux-nav');
    if (!nav) return;
    const on = (): void => { nav.classList.toggle('is-scrolled', window.scrollY > 8); };
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  return null;
}

/**
 * On client navigation, move focus to the new page's H1 (16.5: "focus the page H1,
 * tabindex -1, no focus ring"). Skipped on the first load so the skip link and
 * the browser's own focus handling stay as they are.
 */
export function UxRouteFocus(): null {
  const pathname = usePathname();
  const prev = useRef<string | null>(null);
  useEffect(() => {
    const was = prev.current;
    prev.current = pathname;
    if (was === null || was === pathname) return;
    const t = window.setTimeout(() => {
      const h1 = document.querySelector<HTMLElement>('#main h1');
      if (!h1) return;
      if (!h1.hasAttribute('tabindex')) h1.setAttribute('tabindex', '-1');
      h1.focus({ preventScroll: true });
    }, 60);
    return () => window.clearTimeout(t);
  }, [pathname]);
  return null;
}
