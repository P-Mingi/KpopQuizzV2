// o1/dle2b (owner, 2026-11-25): the admin icon of a game, plain and large, on the daily games hub and the Daily games blocks; the old drawing when nothing is saved.
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/link', () => ({ default: (p: Record<string, unknown>) => h('a', { href: p.href as string, className: p.className as string }, p.children as React.ReactNode) }));
vi.mock('@/lib/supabase/server', () => ({ createPublicReadClient: () => ({}) }));

import { AnimeDailyCard, AnimeDailyModule } from '@/components/home/ux-v1/anime-daily-home';
import { BurrowBoard } from '@/components/hub/dle/burrow-board';
import { iconsOf } from '@/lib/photos/icons-read';

import { GameMark, firstSavedIcon, gameIconSlot } from './game-mark';

import type { LiveAsset } from '@/lib/photos/public-read';

const asset = (o: Partial<LiveAsset>): LiveAsset => ({
  key: 'x', type: 'icon', page: 'home', settings: {}, large: null, mid: null, thumb: null, width: null, height: null, sourceUrl: null, author: null, license: null, licenseNote: null, publishedAt: null, ...o,
});
const SAVED = iconsOf([
  asset({ key: 'icon:o-char', settings: { mode: 'png', icon: 'char', circle: true, color: 'a' }, thumb: 'https://cdn.test/o-char-96.png' }),
  asset({ key: 'icon:o-by-one-piece', settings: { mode: 'icon', icon: 'star', circle: true, color: 'ink' } }),
]);

describe('the slot of a game', () => {
  it('is the icon slot of its switch on its page', () => {
    expect(gameIconSlot('kpopdle-idol')).toBe('k-idol');
    expect(gameIconSlot('otakudle')).toBe('o-char');
    expect(gameIconSlot('otakudle-one-piece')).toBe('o-by-one-piece');
    expect(gameIconSlot('otakudle-dragon-ball')).toBe('o-by-dragon-ball');
    expect(gameIconSlot('nope')).toBeNull();
  });
  it('firstSavedIcon answers only a live row, never the defaults of a slot', () => {
    expect(firstSavedIcon(SAVED, 'o-char')?.id).toBe('o-char');
    expect(firstSavedIcon(SAVED, 'o-by-dragon-ball')).toBeNull();
    expect(firstSavedIcon(SAVED, 'o-by-dragon-ball', 'o-char')?.id).toBe('o-char');
    expect(firstSavedIcon(undefined, 'o-char')).toBeNull();
  });
});

describe('GameMark', () => {
  it('draws a PNG with no circle, whatever the slot says, larger than the ring it replaces', () => {
    const html = renderToStaticMarkup(h(GameMark, { icon: SAVED['o-char']!, size: 44, slot: 'o-char' }));
    expect(html).not.toContain('border-radius');
    expect(html).toContain('data-slot-icon="o-char" data-slot-mode="png"');
    expect(html).toMatch(/<img src="https:\/\/cdn\.test\/o-char-96\.png" alt="" width="38" height="38"/);
  });
});

describe('the Daily games blocks', () => {
  const view = { game: 'otakudle-one-piece', gameNo: 5, fansFound: null } as const;
  it('a card with a saved game icon shows it plain, in place of the grid; with none it is the grid as before', () => {
    const none = renderToStaticMarkup(h(AnimeDailyCard, { view }));
    expect(none).toContain('p5-ad-tiles');
    const set = renderToStaticMarkup(h(AnimeDailyCard, { view, mark: SAVED['o-by-one-piece']! }));
    expect(set).toContain('class="p5-ad-mark"');
    expect(set).toContain('data-slot-icon="o-by-one-piece"');
    expect(set).not.toContain('border-radius');
    expect(set).not.toContain('<span class="p5-ad-tiles"');
  });
  it('the module reads each game by its own slot', () => {
    const views = [{ game: 'otakudle', gameNo: 1, fansFound: null }, view, { game: 'otakudle-dragon-ball', gameNo: 2, fansFound: null }] as const;
    const out = renderToStaticMarkup(h(AnimeDailyModule, { views, marks: SAVED }));
    expect(out).toContain('data-slot-icon="o-char"');
    expect(out).toContain('data-slot-icon="o-by-one-piece"');
    expect(out).not.toContain('data-slot-icon="o-by-dragon-ball"');
    expect(out.match(/class="p5-ad-tiles"/g)).toHaveLength(1);
  });
});

describe('the Terrier', () => {
  const draw = (icons?: typeof SAVED): string => renderToStaticMarkup(h(BurrowBoard, { locale: 'en', dateLabel: 'd', facts: {}, quizLinks: {}, images: {}, ...(icons ? { icons } : {}) }));
  it('with no saved icon it is the page it was', () => {
    expect(draw()).toBe(draw(iconsOf([])));
    expect(draw()).not.toContain('data-slot-icon');
  });
  it('a saved game icon is drawn plain in the cards and in the rows of the day, the others keep their line icon', () => {
    const out = draw(SAVED);
    expect(out.match(/data-slot-icon="o-char"/g)).toHaveLength(2);
    expect(out.match(/data-slot-icon="o-by-one-piece"/g)).toHaveLength(2);
    expect(out).toContain('hub-dle-mbare');
    expect(out).toContain('hub-dle-thbare');
    // The Kpopdle modes and the dragon ball game are unsaved: their ring and tile stay.
    expect(out).toContain('hub-dle-mdot');
    expect(out).toContain('hub-dle-th"');
  });
});
