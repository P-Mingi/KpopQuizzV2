'use client';

import dynamic from 'next/dynamic';

// The only v11 blindtest client code in /blindtest's eager bundle: a few bytes of
// loaders. The controller, the game, the results and the hub islands are separate
// chunks, server-rendered and preloaded only where they render (flag on), so the
// flag-off page never downloads them (same pattern as A0's UxShellLoader).

export const BtHubControllerLoader = dynamic(() => import('./controller').then((m) => m.BtHubController));
export const BtSetupLoader = dynamic(() => import('./setup').then((m) => m.BtSetup));
export const BtLiveCountLoader = dynamic(() => import('./islands').then((m) => m.BtLiveCount));
export const BtDailyCardLoader = dynamic(() => import('./islands').then((m) => m.BtDailyCard));
export const BtRankedFootLoader = dynamic(() => import('./islands').then((m) => m.BtRankedFoot));
export const BtChallengeCardLoader = dynamic(() => import('./islands').then((m) => m.BtChallengeCard));
export const BtBoardLoader = dynamic(() => import('./islands').then((m) => m.BtBoard));
export const BtGroupIndexLoader = dynamic(() => import('./islands').then((m) => m.BtGroupIndex));
