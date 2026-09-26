'use client';

import dynamic from 'next/dynamic';

// The passport's client islands behind next/dynamic (A0's pattern for the shell):
// the pages import the v11 passport only when NEXT_PUBLIC_UX_V1 is on, but a route's
// client chunk graph still sees every client module its server graph can reach. With
// these loaders the islands (and the A0 sheets, tabs and toasts they use) live in
// async chunks that a flag-off page never lists or downloads. Flag on they are
// server-rendered as before and their chunks are preloaded where they render.
export const PassportBand = dynamic(() => import('./passport-band').then((m) => m.PassportBand));
export const PassportActions = dynamic(() => import('./passport-actions').then((m) => m.PassportActions));
export const PassportTabs = dynamic(() => import('./passport-tabs').then((m) => m.PassportTabs));
export const MoreQuizzes = dynamic(() => import('./more-quizzes').then((m) => m.MoreQuizzes));
