'use client';

import { useEffect } from 'react';

import { readLastPlayed, type LastPlayedGame } from '@/lib/games/last-played';

// G-HUB v2 step 4: last-played read side. Progressive enhancement - the hub Play
// links are server-rendered to each game's DEFAULT variant (crawlable). On mount
// this rewrites those hrefs to the variant the user last played (from
// localStorage), so returning players reopen where they left off. First ever
// play keeps the default. Rewrites only href of tagged links; renders nothing.
export function HubLastPlayed(): null {
  useEffect(() => {
    const links = document.querySelectorAll<HTMLAnchorElement>('a[data-lp][data-lp-base]');
    links.forEach((a) => {
      const game = a.getAttribute('data-lp') as LastPlayedGame | null;
      const base = a.getAttribute('data-lp-base');
      if (!game || !base) return;
      const last = readLastPlayed(game);
      if (last) a.setAttribute('href', `${base}${last}`);
    });
  }, []);
  return null;
}
