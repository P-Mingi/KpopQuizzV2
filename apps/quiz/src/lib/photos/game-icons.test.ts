// o1/adminpics: the admin slots of the icons of the daily game cards, and what the public read makes of them.
import { describe, expect, it } from 'vitest';

import { gameIconsOf } from './game-icons';
import { GAME_ICON_GAMES, IMAGE_SLOTS, gameIconKey } from './slots';
import { parseAssetSlot } from './validate';

import type { LiveAsset } from './public-read';

const row = (key: string, files: Partial<Pick<LiveAsset, 'large' | 'mid' | 'thumb'>>, settings: Record<string, unknown> = {}, type: LiveAsset['type'] = 'card_image'): LiveAsset => ({
  key, type, page: 'daily', settings, large: files.large ?? null, mid: files.mid ?? null, thumb: files.thumb ?? null, width: null, height: null,
  sourceUrl: null, author: null, license: null, licenseNote: null, publishedAt: '2026-11-22T00:00:00Z',
});

describe('the icon slots of the games', () => {
  it('has one card image slot per game, after every slot that existed, with a key 022 accepts', () => {
    expect(GAME_ICON_GAMES.map((g) => g.game)).toEqual(['kpopdle-idol', 'otakudle', 'otakudle-one-piece', 'otakudle-dragon-ball']);
    const tail = IMAGE_SLOTS.slice(-4);
    expect(tail.map((s) => s.key)).toEqual(['icon:kpopdle-idol', 'icon:otakudle', 'icon:otakudle-one-piece', 'icon:otakudle-dragon-ball']);
    for (const s of tail) {
      expect(s.type).toBe('card_image');
      expect(s.key).toMatch(/^[a-z0-9][a-z0-9:/_-]{0,100}$/);
      expect(s.page).toMatch(/^[a-z0-9][a-z0-9/-]{0,80}$/);
      expect(s.name).toMatch(/^Icône de la carte /);
    }
    expect(new Set(IMAGE_SLOTS.map((s) => s.key)).size).toBe(IMAGE_SLOTS.length);
  });

  it('is accepted by the admin as a card image, never as an icon of the library', () => {
    for (const g of GAME_ICON_GAMES) expect(parseAssetSlot(gameIconKey(g.game))).toEqual({ key: `icon:${g.game}`, type: 'card_image', page: 'daily' });
  });
});

describe('gameIconsOf', () => {
  it('has no icon with no live picture: the cards keep their grid', () => {
    expect(gameIconsOf([])).toEqual({});
    expect(gameIconsOf([row('icon:otakudle', {})])).toEqual({});
  });

  it('gives the 400 px file of a live slot with its focal point, else the large one', () => {
    const icons = gameIconsOf([
      row('icon:otakudle', { large: 'https://x.test/l.webp', mid: 'https://x.test/m.webp', thumb: 'https://x.test/t.webp' }, { focal: { x: 20, y: 70 } }),
      row('icon:kpopdle-idol', { large: 'https://x.test/k.webp' }),
    ]);
    expect(icons['otakudle']).toEqual({ src: 'https://x.test/m.webp', position: '20% 70%' });
    expect(icons['kpopdle-idol']!.src).toBe('https://x.test/k.webp');
    expect(icons['otakudle-one-piece']).toBeUndefined();
  });

  it('ignores a row of another type or another key', () => {
    expect(gameIconsOf([row('icon:otakudle', { large: 'https://x.test/l.webp' }, {}, 'icon'), row('home:otakudle', { large: 'https://x.test/l.webp' })])).toEqual({});
  });
});
