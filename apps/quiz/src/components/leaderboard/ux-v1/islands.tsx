'use client';

import dynamic from 'next/dynamic';

// The leaderboard's client islands, each behind next/dynamic (server-rendered as
// usual). Why (P1's measured lesson): app/(site)/leaderboard/page.tsx serves the
// live community page when NEXT_PUBLIC_UX_V1 is off, and any client component
// reachable from the page module joins the page's client bundle even when it never
// renders. Behind next/dynamic an island's code sits in its own chunk that the HTML
// references only when it renders. NEXT_PUBLIC_* is inlined at build time, so on a
// flag-off build these branches are dead code and the minifier drops them with
// their chunk references: the flag-off page keeps only this loader's few bytes.
const ON = process.env.NEXT_PUBLIC_UX_V1 === '1' || process.env.NEXT_PUBLIC_UX_V1 === 'true';

function Off(): null {
  return null;
}

export const LbTabs = ON ? dynamic(() => import('./tabs').then((m) => m.LbTabs)) : Off;
export const WarPin = ON ? dynamic(() => import('./pins').then((m) => m.WarPin)) : Off;
export const PlayerPin = ON ? dynamic(() => import('./pins').then((m) => m.PlayerPin)) : Off;
export const CreatorPin = ON ? dynamic(() => import('./pins').then((m) => m.CreatorPin)) : Off;
export const RankedPane = ON ? dynamic(() => import('./ranked').then((m) => m.RankedPane)) : Off;
export const CreatorsSwitch = ON ? dynamic(() => import('./creators').then((m) => m.CreatorsSwitch)) : Off;
