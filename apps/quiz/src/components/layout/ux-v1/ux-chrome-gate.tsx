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

/** How long after a route change the H1 may still arrive: a loading.tsx skeleton
 *  commits first and the page streams in behind it (a slow phone network, or a dev
 *  server rendering /q/<slug> on demand, can take well over 10 s). */
const H1_WAIT_MS = 30_000;

/**
 * On client navigation, move focus to the new page's H1 (16.5 / 16.9: "focus the
 * page H1, tabindex -1, no focus ring"). Skipped on the first load (the skip link
 * and the browser's own focus handling stay as they are) and on query-only changes
 * (filters, tabs, ?page=2 keep the focus on the control that changed them).
 * The H1 is awaited: routes with a loading.tsx commit their skeleton first and the
 * page (and its H1) streams in later, so the new H1 is watched for, not polled
 * once. Focus is never taken from a page that focused its own control on mount,
 * nor back from a fan who already moved it elsewhere.
 */
export function UxRouteFocus(): null {
  const pathname = usePathname();
  const prev = useRef<string | null>(null);
  useEffect(() => {
    const was = prev.current;
    prev.current = pathname;
    if (was === null || was === pathname) return;
    const main = document.getElementById('main');
    if (!main) return;
    // What has focus now: the link that was clicked (often gone, then <body>), or,
    // when the new page committed together with the route change, whatever that page
    // focused on mount (its effects ran before this one: the shell renders this
    // after <main>). Focus the page placed itself stays where it is.
    const origin = document.activeElement;
    if (origin && origin !== main && main.contains(origin)) return;
    const untouched = (): boolean => {
      const a = document.activeElement;
      return !a || a === document.body || a === main || a === origin || !a.isConnected;
    };
    let finished = false;
    const obs = new MutationObserver(() => { attempt(); });
    const timer = window.setTimeout(() => finish(), H1_WAIT_MS);
    function finish(): void { finished = true; obs.disconnect(); window.clearTimeout(timer); }
    function attempt(): void {
      if (finished) return;
      if (!untouched()) { finish(); return; }
      const h1 = main?.querySelector<HTMLElement>('h1');
      if (!h1) return; // not there yet: keep watching
      if (!h1.hasAttribute('tabindex')) h1.setAttribute('tabindex', '-1');
      h1.focus({ preventScroll: true });
      finish();
    }
    obs.observe(main, { childList: true, subtree: true });
    attempt();
    return () => { finish(); };
  }, [pathname]);
  return null;
}
