'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { useAnnounce } from '@/components/ux-v1/toast';

// /quizzes browse navigation (P2). Every sort, filter, chip and page control is a
// real <a href> (crawlable, works before hydration, opens in a new tab); once
// hydrated, a plain click becomes a soft navigation inside a transition, so the
// server renders the filtered page (real server filtering and counts) while the
// grid stays in place and says it is busy. When the new result lands, the polite
// live region reads its summary ("48 quizzes").

interface P2Nav {
  /** A soft navigation to `href` is rendering. */
  pending: boolean;
  /** Soft-navigate to `href` (keeps the scroll), then focus the element matching the
   *  `focus` selector if given (a filter menu's trigger). */
  go: (href: string, focus?: string) => void;
}

const Ctx = createContext<P2Nav>({ pending: false, go: (href) => { window.location.assign(href); } });

export function useP2Nav(): P2Nav {
  return useContext(Ctx);
}

/** A click the page may take over (not a new-tab / new-window / download click). */
export function isPlainClick(e: React.MouseEvent): boolean {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && !e.defaultPrevented;
}

interface ProviderProps {
  children: React.ReactNode;
  /** Changes when the result list changes (sort + facets, not the page). */
  filterKey: string;
  /** What the live region says once a new result is shown. */
  summary: string;
}

export function P2NavProvider({ children, filterKey, summary }: ProviderProps): React.ReactElement {
  const router = useRouter();
  const announce = useAnnounce();
  const [pending, start] = useTransition();
  const focusAfter = useRef<string | null>(null);
  const lastKey = useRef(filterKey);

  const go = useCallback((href: string, focus?: string) => {
    focusAfter.current = focus ?? null;
    if (focus) document.querySelector<HTMLElement>(focus)?.focus({ preventScroll: true });
    start(() => { router.push(href, { scroll: false }); });
  }, [router]);

  // The server sent the new result: announce it once per change of filters.
  useEffect(() => {
    if (pending || lastKey.current === filterKey) return;
    lastKey.current = filterKey;
    announce(summary);
    const sel = focusAfter.current;
    focusAfter.current = null;
    if (sel) document.querySelector<HTMLElement>(sel)?.focus({ preventScroll: true });
  }, [pending, filterKey, summary, announce]);

  const value = useMemo(() => ({ pending, go }), [pending, go]);
  return <Ctx value={value}>{children}</Ctx>;
}
