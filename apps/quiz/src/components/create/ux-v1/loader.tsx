'use client';

import dynamic from 'next/dynamic';

// The only P5 client code in /create's eager bundle: a few bytes of loader (A0's
// UxShellLoader pattern). The v11 funnel is its own chunk, server-rendered and
// preloaded only where it renders (flag on), so the flag-off /create never
// downloads it.

export const P5CreateLoader = dynamic(() => import('./create').then((m) => m.P5Create));
