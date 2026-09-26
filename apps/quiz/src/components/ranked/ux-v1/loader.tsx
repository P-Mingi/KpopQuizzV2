'use client';

import dynamic from 'next/dynamic';

// The ranked page's client code, split per island and server-rendered where it
// shows (A0's loader pattern, as P6 did for /blindtest): the flag-off route is a
// 404 that never renders these, and the flag-on page loads each chunk only here.

export const RankedControllerLoader = dynamic(() => import('./controller').then((m) => m.RankedController));
export const RankedCardLoader = dynamic(() => import('./card').then((m) => m.RankedCard));
export const RankedTiersLoader = dynamic(() => import('./strip').then((m) => m.RankedTiers));
export const RankedLadderLoader = dynamic(() => import('./ladder').then((m) => m.RankedLadder));
