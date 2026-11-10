// o1/slots: the rows of Today draw the owner's icon (admin, Icônes du jeu) once a row is saved: the image slot first, then the icon, then the
// icon the row always had. The blind test row gets a mark beside its name only when its icon is saved.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { iconsOf } from '@/lib/photos/icons-read';
import { iconKey } from '@/lib/photos/slots';

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
const html = (icons: ReturnType<typeof iconsOf> | undefined, assets = {}): string =>
  renderToStaticMarkup(createElement(HomeToday, { today: TODAY, viewer: null, done: DONE, assets, burrow: true, icons }));

describe('the icons of the rows of Today', () => {
  it('keeps every row as it was when nothing is saved, or when no icons are given', () => {
    expect(html(iconsOf([]))).toBe(html(undefined));
    expect(html(undefined)).not.toContain('data-slot-icon');
  });

  it('draws the saved icon of each row, the six of them, the blind test beside its name', () => {
    const saved = ['today-kpopdle', 'today-otakudle', 'today-qotd-k', 'today-qotd-a', 'today-debate', 'today-blindtest']
      .map((id) => row(id, { mode: 'icon', icon: 'star', circle: true, color: 'ink' }));
    const out = html(iconsOf(saved));
    for (const id of ['today-kpopdle', 'today-otakudle', 'today-qotd-k', 'today-qotd-a', 'today-debate', 'today-blindtest']) {
      expect(out, id).toContain(`data-slot-icon="${id}" data-slot-mode="icon"`);
    }
    expect(out).toContain('hub-h2-tname hub-h2-tname-mark');
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

  it('leaves the blind test row with no mark until its icon is saved', () => {
    expect(html(iconsOf([row('today-kpopdle', { mode: 'icon', icon: 'star', circle: true, color: 'k' })]))).not.toContain('hub-h2-tname-mark');
  });
});
