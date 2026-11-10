// o1/slots, then home v4: each tile of Today's games draws the owner's image slot when it is filled, else its icon slot (admin, Icônes du
// jeu), whose defaults are the icons the rows always had. Home v4 draws the mark of every tile, the blind test included, so the slots lane's
// "no mark until saved" case of the old Today column became "the defaults of the slot" (ORCH, reconciliation of o1/slots and o1/home4).
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { iconsOf } from '@/lib/photos/icons-read';
import { ICON_LIBRARY, iconKey } from '@/lib/photos/slots';

import { HomeToday } from './home-today';

import type { LiveAsset } from '@/lib/photos/public-read';
import type { HomeToday as HomeTodayData } from '@/lib/site/hub/home-types';

const row = (id: string, settings: Record<string, unknown>, thumb: string | null = null): LiveAsset => ({
  key: iconKey(id), type: 'icon', page: 'home', settings, large: thumb, mid: null, thumb, width: null, height: null,
  sourceUrl: null, author: null, license: null, licenseNote: null, publishedAt: '2026-11-10T00:00:00Z',
});

const TODAY: HomeTodayData = {
  quizzes: [
    { id: 'q1', site: 'kpop', path: '/q/a', title: 'aespa quiz', questions: 10, meta: '10 questions' },
    { id: 'q2', site: 'anime', path: '/q/b', title: 'Naruto quiz', questions: 10, meta: '10 questions' },
  ],
  blindtest: { site: 'kpop', path: '/blindtest/x', songs: 10, seconds: 10, previewUrl: 'https://x.test/p.mp3' },
  debate: { site: 'kpop', title: 'A debate', path: '/debate/x' },
  rotation: { nextAt: '2026-11-11T00:00:00.000Z', parisTime: '1:00' },
};
const DONE = { kpop: false, anime: false } as const;
const html = (icons: ReturnType<typeof iconsOf>, assets = {}): string =>
  renderToStaticMarkup(createElement(HomeToday, { today: TODAY, viewer: null, done: DONE, assets, burrow: true, icons }));
const TILES = ['today-kpopdle', 'today-otakudle', 'today-qotd-k', 'today-qotd-a', 'today-blindtest'] as const;

describe('the icons of the tiles of Today', () => {
  it('draws the defaults of each icon slot when nothing is saved', () => {
    const out = html(iconsOf([]));
    for (const id of TILES) expect(out, id).toContain(`data-slot-icon="${id}" data-slot-mode="icon"`);
    expect(out).toContain(`d="${ICON_LIBRARY.idol}"`);
    expect(out).toContain(`d="${ICON_LIBRARY.char}"`);
    expect(out).toContain(`d="${ICON_LIBRARY.song}"`);
  });

  it('draws the saved icon of each tile', () => {
    const out = html(iconsOf(TILES.map((id) => row(id, { mode: 'icon', icon: 'star', circle: true, color: 'ink' }))));
    for (const id of TILES) expect(out, id).toContain(`data-slot-icon="${id}" data-slot-mode="icon"`);
    expect(out.split(`d="${ICON_LIBRARY.star}"`).length - 1).toBe(TILES.length);
    expect(out).not.toContain(`d="${ICON_LIBRARY.idol}"`);
  });

  it('draws a PNG icon with its file, and lets a filled image slot win over the icon', () => {
    const icons = iconsOf([row('today-kpopdle', { mode: 'png', icon: 'idol', circle: true, color: 'k' }, 'https://x.test/k-96.webp'), row('today-otakudle', { mode: 'icon', icon: 'star', circle: true, color: 'a' })]);
    const out = html(icons);
    expect(out).toContain('data-slot-icon="today-kpopdle" data-slot-mode="png"');
    expect(out).toContain('src="https://x.test/k-96.webp"');
    const withImage = html(icons, { otakudle: { src: 'https://x.test/o.webp', position: '50% 50%' } });
    expect(withImage).not.toContain('data-slot-icon="today-otakudle"');
    expect(withImage).toContain('https://x.test/o.webp');
  });
});
