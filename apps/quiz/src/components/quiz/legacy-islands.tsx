'use client';

import dynamic from 'next/dynamic';

// The client parts of the flag-off quiz page (the branch after `if (UX_V1)` in both q/[slug] page files),
// loaded through next/dynamic (SEO phase 1, 2026-10-27). Static imports put them, and supabase-js through
// the share row of QuizPlayer, in the first-load JS of every flag-on /q/ page, where they never render.
// A flag-off page still renders them on the server (dynamic keeps SSR) and loads their chunks only there.

export const QuizPlayer = dynamic(() => import('./quiz-player').then((m) => m.QuizPlayer));
export const AboutQuizDrawer = dynamic(() => import('./about-quiz-drawer').then((m) => m.AboutQuizDrawer));
export const EmbedQuizToggle = dynamic(() => import('@/components/embed/embed-quiz-toggle').then((m) => m.EmbedQuizToggle));
