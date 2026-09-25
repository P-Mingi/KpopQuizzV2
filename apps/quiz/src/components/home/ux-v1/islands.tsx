'use client';

import dynamic from 'next/dynamic';

// The home's client islands, each behind next/dynamic (server-rendered as usual).
// Why: app/(site)/page.tsx serves the legacy home when NEXT_PUBLIC_UX_V1 is off,
// and any client component reachable from the page module is added to the page's
// client bundle even when it never renders (measured: +20 KB of v11 home code on
// the flag-off home). Behind next/dynamic, an island's code sits in its own chunk
// that the HTML references only when the island renders, so the flag-off home
// carries this tiny loader and nothing else (the same pattern as A0's shell loader).

export const HomeHeader = dynamic(() => import('./home-header').then((m) => m.HomeHeader));
export const QotdNote = dynamic(() => import('./qotd-note').then((m) => m.QotdNote));
export const ContinuePlaying = dynamic(() => import('./continue-playing').then((m) => m.ContinuePlaying));
export const BlindtestBand = dynamic(() => import('./blindtest-band').then((m) => m.BlindtestBand));
