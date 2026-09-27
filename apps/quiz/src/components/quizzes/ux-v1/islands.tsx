'use client';

import dynamic from 'next/dynamic';

// The only P2 client code in /quizzes' eager bundle: a few bytes of loaders (A0's
// UxShellLoader pattern, as P4 does). Each island is its own chunk, server rendered
// and loaded only where it renders (flag on), so the flag-off /quizzes page never
// downloads the v11 browse controls.

export const P2NavProvider = dynamic(() => import('./nav-context').then((m) => m.P2NavProvider));
export const P2Controls = dynamic(() => import('./controls').then((m) => m.P2Controls));
export const P2Chip = dynamic(() => import('./controls').then((m) => m.P2Chip));
export const P2NavLink = dynamic(() => import('./controls').then((m) => m.P2NavLink));
export const P2Results = dynamic(() => import('./results').then((m) => m.P2Results));
