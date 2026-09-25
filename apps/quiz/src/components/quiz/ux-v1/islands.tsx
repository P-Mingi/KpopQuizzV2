'use client';

import dynamic from 'next/dynamic';

// The only P4 client code in /q/[slug]'s eager bundle: a few bytes of loaders (A0's
// UxShellLoader pattern). Each island is its own chunk, server-rendered and preloaded
// only where it renders (flag on), so the flag-off quiz page never downloads the v11
// game, results or sheets (measured: without this, flag-off /q pages carried one extra
// chunk of ~71 KB).

export const P4Run = dynamic(() => import('./quiz-run').then((m) => m.P4Run));
export const P4StartActions = dynamic(() => import('./intro-islands').then((m) => m.P4StartActions));
export const P4StickyStart = dynamic(() => import('./intro-islands').then((m) => m.P4StickyStart));
export const P4HofMine = dynamic(() => import('./intro-islands').then((m) => m.P4HofMine));
export const P4Follow = dynamic(() => import('./intro-islands').then((m) => m.P4Follow));
export const P4ReportButton = dynamic(() => import('./report').then((m) => m.P4ReportButton));
