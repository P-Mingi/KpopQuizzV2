'use client';

import dynamic from 'next/dynamic';

// SEO Mission 3, part F.1: the code-split loader of the "Embed this quiz" island (same
// pattern as ./islands.tsx). The generator and its sheet are their own chunk, fetched
// only on the flag-on quiz page that renders the button.
export const P4EmbedButton = dynamic(() => import('./embed').then((m) => m.P4EmbedButton));
