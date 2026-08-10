'use client';
// ITERATION 6 FIX 2 - the sidebar fold control. Clicking it stamps `data-verse-nav` on <html>
// (CSS reads it immediately) and writes the `verse_nav` cookie so the choice survives navigation
// instead of resetting to the per-route default on every page. The cookie is re-applied before
// first paint by the blocking script in the verse layout, so there is no flash.
//
// The nav links themselves are plain SSR <a> in both fold states; this control only picks which
// state is visible, so nothing here affects crawlability.
import { useCallback } from 'react';

export type NavState = 'open' | 'rail';

const COOKIE = 'verse_nav';
const ONE_YEAR = 60 * 60 * 24 * 365;

function apply(next: NavState): void {
  document.documentElement.setAttribute('data-verse-nav', next);
  try {
    document.cookie = `${COOKIE}=${next}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
  } catch {
    // cookies blocked: the state still applies for this page view
  }
}

export function VerseNavToggle({ to, className, title, children }: {
  to: NavState; className: string; title: string; children: React.ReactNode;
}): React.ReactElement {
  const onClick = useCallback(() => { apply(to); }, [to]);
  return (
    <button type="button" className={className} title={title} aria-label={title} onClick={onClick}>
      {children}
    </button>
  );
}
