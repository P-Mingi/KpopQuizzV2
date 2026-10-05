'use client';

import dynamic from 'next/dynamic';

// Loaders of the /blindtest/<mode> page's client code (A0's loader pattern, like
// loader.tsx for the hub): the controller, the game and the results are separate
// chunks, server-rendered and preloaded only where they render (flag on).

export const BtModeControllerLoader = dynamic(() => import('./mode-controller').then((m) => m.BtModeController));
export const BtModePlayLoader = dynamic(() => import('./mode-controller').then((m) => m.BtModePlay));

// V12 landings (/guess-the-kpop-song and its fr, es, id pages): same pattern.
export const BtLandingControllerLoader = dynamic(() => import('./landing-controller').then((m) => m.BtLandingController));
export const BtLandingStartLoader = dynamic(() => import('./landing-controller').then((m) => m.BtLandingStart));
export const BtLandingErrorLoader = dynamic(() => import('./landing-controller').then((m) => m.BtLandingError));

// V12 theme pages (/blindtest/<theme>).
export const BtThemePlayLoader = dynamic(() => import('./mode-controller').then((m) => m.BtThemePlay));
export const BtModeErrorLoader = dynamic(() => import('./mode-controller').then((m) => m.BtModeError));
