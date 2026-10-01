'use client';

import dynamic from 'next/dynamic';

// The home's client islands, each behind next/dynamic (server-rendered as usual).
// Why: app/(site)/page.tsx serves the legacy home when NEXT_PUBLIC_UX_V1 is off,
// and any client component reachable from the page module is added to the page's
// client bundle even when it never renders (measured: +20 KB of v11 home code on
// the flag-off home). Behind next/dynamic, an island's code sits in its own chunk
// that the HTML references only when the island renders. NEXT_PUBLIC_* is inlined
// at build time, so on a flag-off build the dynamic() branches are dead code and
// the minifier drops them with their chunk references: the flag-off home keeps
// only the few bytes of this loader.
const ON = process.env.NEXT_PUBLIC_UX_V1 === '1' || process.env.NEXT_PUBLIC_UX_V1 === 'true';

function Off(): null {
  return null;
}

export const HomeHeader = ON ? dynamic(() => import('./home-header').then((m) => m.HomeHeader)) : Off;
export const QotdNote = ON ? dynamic(() => import('./qotd-note').then((m) => m.QotdNote)) : Off;
export const ContinuePlaying = ON ? dynamic(() => import('./continue-playing').then((m) => m.ContinuePlaying)) : Off;
export const BlindtestBand = ON ? dynamic(() => import('./blindtest-band').then((m) => m.BlindtestBand)) : Off;
