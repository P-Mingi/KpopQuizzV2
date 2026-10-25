// Run O1, lot H2a: the data of "Top fans this week" (the XP of the week on both sites, public profiles only, Team accounts left out).
// The body returns the design's sample (the handles are examples); lot H2b reads the real weekly XP and keeps the shape (HomeFan[]).

import type { HomeFan } from './home-types';

export async function loadHomeTopFans(): Promise<readonly HomeFan[]> {
  return [
    { handle: 'sunbae_mira', level: 42, onKpop: true, onAnime: true },
    { handle: 'tteok_rider', level: 39, onKpop: true, onAnime: false },
    { handle: 'mingi', level: 37, onKpop: true, onAnime: true },
    { handle: 'kenjiro_k', level: 33, onKpop: false, onAnime: true },
    { handle: 'shoujo_nova', level: 30, onKpop: true, onAnime: true },
  ];
}
