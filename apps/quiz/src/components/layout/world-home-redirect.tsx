'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { readWorldPreference } from '@/lib/world-preference';

/**
 * W-NAV step 4 - preferred-world open, on the games home ONLY.
 *
 * Mounted only on "/". After hydration it reads the world cookie (written solely by
 * a deliberate toggle click) and, if the user last chose Verse, does a client-side
 * router.replace to /verse. Play needs no redirect - "/" is already the Play home.
 *
 * CRAWLER SAFETY (why this cannot change what Googlebot sees at "/"):
 *  - It runs only in the browser, after hydration. There is no server redirect and
 *    no 3xx - the "/" HTML served to everyone is the games home, unchanged.
 *  - It is gated entirely on a cookie that a crawler never sends, so a bot is a
 *    no-cookie visitor by construction and the branch never fires for it.
 *  - It reads document.cookie (not cookies()/headers()), so the home page stays
 *    static/ISR - nothing here opts it into dynamic SSR.
 *  - It only exists on "/", so it can never intercept a deep SEO landing
 *    (/bts-quiz, /verse/bts, ...). Those are served by their own routes, untouched.
 * router.replace (not push) keeps the back button sane for the rare Verse-preferrer.
 */
export function WorldHomeRedirect(): null {
  const router = useRouter();
  useEffect(() => {
    if (window.location.pathname !== '/') return;
    if (readWorldPreference() === 'verse') router.replace('/verse');
  }, [router]);
  return null;
}
