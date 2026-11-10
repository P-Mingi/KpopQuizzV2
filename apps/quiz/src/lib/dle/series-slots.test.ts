// o1/slots: the series games of Otakudle are one tiny list (lib/dle/series.ts); the admin's slots, the modes of the world and the games of
// games.ts all derive from or agree with it, so a series added there needs no change in the slots code.
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { ICON_SLOTS, IMAGE_SLOTS, iconKey } from '@/lib/photos/slots';

import { DLE_GAMES, dleGame } from './games';
import { DLE_SERIES, SERIES_ICON_FALLBACK, SERIES_MODE_FALLBACK, seriesBannerKey, seriesIconId, seriesModeKey } from './series';
import { DLE_WORLDS, modeImage, worldOf } from './worlds';

describe('the series list', () => {
  it('matches the series games of games.ts, one for one', () => {
    const fromGames = DLE_GAMES.filter((g) => g.series).map((g) => g.series!.slug);
    expect(DLE_SERIES.map((s) => s.id)).toEqual(fromGames);
    for (const s of DLE_SERIES) {
      const g = dleGame(`otakudle-${s.id}` as never);
      expect(g.series?.name, s.id).toBe(s.name);
      expect(g.path).toBe(`/otakudle/${s.id}`);
    }
  });

  it('gives each series an admin icon slot, banner and square, with the fallbacks', () => {
    for (const s of DLE_SERIES) {
      const icon = ICON_SLOTS.find((x) => x.id === seriesIconId(s.id));
      expect(icon, s.id).toBeTruthy();
      expect(icon!.fallback).toBe(SERIES_ICON_FALLBACK);
      expect(icon!.defaults.icon).toBe(s.icon);
      expect(iconKey(icon!.id)).toMatch(/^[a-z0-9][a-z0-9:/_-]{0,100}$/);
      const banner = IMAGE_SLOTS.find((x) => x.key === seriesBannerKey(s.id));
      expect(banner?.fallback).toBe('banner:otakudle');
      expect(banner?.page).toBe(`otakudle/${s.id}`);
      const square = IMAGE_SLOTS.find((x) => x.key === seriesModeKey(s.id));
      expect(square?.fallback).toBe(SERIES_MODE_FALLBACK);
      expect(IMAGE_SLOTS.some((x) => x.key === SERIES_MODE_FALLBACK)).toBe(true);
    }
    // the legacy slot is still there for a save already made
    expect(ICON_SLOTS.some((x) => x.id === 'o-by')).toBe(true);
  });

  it('derives the mode of each series of the world from the list', () => {
    const otakudle = DLE_WORLDS.find((w) => w.id === 'otakudle')!;
    const modes = otakudle.modes.filter((m) => DLE_SERIES.some((s) => s.id === m.id));
    expect(modes.map((m) => m.id)).toEqual(DLE_SERIES.map((s) => s.id));
    for (const m of modes) {
      expect(m.slot).toBe(seriesModeKey(m.id));
      expect(m.slotFallback).toBe(SERIES_MODE_FALLBACK);
      expect(m.iconSlot).toBe(seriesIconId(m.id));
      expect(worldOf(m.game!).id).toBe('otakudle');
    }
  });

  it('gives every mode and hop of the worlds an icon slot of the admin', () => {
    const ids = new Set(ICON_SLOTS.map((s) => s.id));
    for (const w of DLE_WORLDS) {
      expect(ids.has(w.hopIconSlot), w.id).toBe(true);
      for (const m of w.modes) expect(ids.has(m.iconSlot), m.id).toBe(true);
    }
  });

  it('draws the square of a series from its own slot, else the shared one, else nothing', () => {
    const m = DLE_WORLDS.find((w) => w.id === 'otakudle')!.modes.find((x) => x.id === 'dragon-ball')!;
    const a = { src: 'a' }, b = { src: 'b' };
    expect(modeImage({ [seriesModeKey('dragon-ball')]: a, [SERIES_MODE_FALLBACK]: b }, m)).toBe(a);
    expect(modeImage({ [SERIES_MODE_FALLBACK]: b }, m)).toBe(b);
    expect(modeImage({}, m)).toBeUndefined();
    const idol = DLE_WORLDS[0]!.modes[0]!;
    expect(modeImage({ [SERIES_MODE_FALLBACK]: b }, idol)).toBeUndefined();
  });

  it('keeps lib/dle/series.ts free of imports (it ships in the admin client)', () => {
    const src = readFileSync(new URL('./series.ts', import.meta.url), 'utf8');
    expect(src).not.toMatch(/^import /m);
  });
});
