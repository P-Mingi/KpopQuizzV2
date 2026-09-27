'use client';

import dynamic from 'next/dynamic';

// The guest passport's one client island behind next/dynamic (same pattern as
// islands.tsx). Kept in its own module, reachable only from /me, so the shared
// passport islands chunk of /u and /me stays byte-identical, and a flag-off page
// never lists or downloads the sign-in button's chunk.
export const PassportGuestSignIn = dynamic(() => import('./passport-guest-sign-in').then((m) => m.PassportGuestSignIn));
