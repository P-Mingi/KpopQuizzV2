'use client';

import dynamic from 'next/dynamic';

// Loaders of the /blindtest/<mode> page's client code (A0's loader pattern, like
// loader.tsx for the hub): the controller, the game and the results are separate
// chunks, server-rendered and preloaded only where they render (flag on).

export const BtModeControllerLoader = dynamic(() => import('./mode-controller').then((m) => m.BtModeController));
export const BtModePlayLoader = dynamic(() => import('./mode-controller').then((m) => m.BtModePlay));
