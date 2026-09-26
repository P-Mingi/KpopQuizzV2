'use client';

import dynamic from 'next/dynamic';

// The only P3 client code in the eager bundles of /groups and /<slug>-quiz: a few
// bytes of loaders. The islands are separate chunks, server-rendered and preloaded
// only where they render (flag on), so the flag-off pages never download them
// (A0's UxShellLoader pattern, also used by P6).

export const GroupsBrowserLoader = dynamic(() => import('./groups-browser').then((m) => m.GroupsBrowser));
export const HubQuizzesLoader = dynamic(() => import('./hub-quizzes').then((m) => m.HubQuizzes));
export const HubNotifyLoader = dynamic(() => import('./hub-notify').then((m) => m.HubNotify));
