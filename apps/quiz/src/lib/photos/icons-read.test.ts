// o1/slots: the public read of the icon slots. Every slot answers something (its live settings, else its defaults), a stored value is
// checked against the library, and a PNG with no file falls back to the icon of its settings.
import { describe, expect, it } from 'vitest';

import { iconOf, iconsOf } from './icons-read';
import { HOME_TODAY_ICON, ICON_SLOTS, iconKey, parseIconSettings } from './slots';

import type { LiveAsset } from './public-read';

const row = (key: string, settings: Record<string, unknown>, files: Partial<Pick<LiveAsset, 'large' | 'mid' | 'thumb'>> = {}, type: LiveAsset['type'] = 'icon'): LiveAsset => ({
  key, type, page: 'home', settings, large: files.large ?? null, mid: files.mid ?? null, thumb: files.thumb ?? null, width: null, height: null,
  sourceUrl: null, author: null, license: null, licenseNote: null, publishedAt: '2026-11-10T00:00:00Z',
});

describe('iconsOf', () => {
  it('answers every slot, with its defaults when nothing is saved', () => {
    const icons = iconsOf([]);
    expect(Object.keys(icons)).toEqual(ICON_SLOTS.map((s) => s.id));
    for (const s of ICON_SLOTS) expect(icons[s.id]).toEqual({ id: s.id, cfg: s.defaults, png: null, live: false });
  });

  it('takes the saved icon of a slot, and its 96 px file for a PNG', () => {
    const icons = iconsOf([
      row(iconKey(HOME_TODAY_ICON.kpopdle), { mode: 'icon', icon: 'star', circle: false, color: 'ink' }),
      row(iconKey(HOME_TODAY_ICON.otakudle), { mode: 'png', icon: 'char', circle: true, color: 'a' }, { large: 'https://x.test/a-400.webp', thumb: 'https://x.test/a-96.webp' }),
    ]);
    expect(icons[HOME_TODAY_ICON.kpopdle]).toEqual({ id: 'today-kpopdle', cfg: { mode: 'icon', icon: 'star', circle: false, color: 'ink' }, png: null, live: true });
    expect(icons[HOME_TODAY_ICON.otakudle]!.png).toBe('https://x.test/a-96.webp');
    expect(icons[HOME_TODAY_ICON.otakudle]!.cfg.mode).toBe('png');
  });

  it('draws the icon of the settings when a PNG has no file, and ignores a value outside the library or another type', () => {
    const icons = iconsOf([
      row(iconKey('k-idol'), { mode: 'png', icon: 'heart', circle: true, color: 'k' }),
      row(iconKey('k-group'), { mode: 'icon', icon: 'not-an-icon', circle: true, color: 'k' }),
      row(iconKey('k-song'), { mode: 'icon', icon: 'star', circle: true, color: 'k' }, {}, 'card_image'),
    ]);
    expect(icons['k-idol']).toEqual({ id: 'k-idol', cfg: { mode: 'icon', icon: 'heart', circle: true, color: 'k' }, png: null, live: true });
    expect(icons['k-group']!.live).toBe(false);
    expect(icons['k-group']!.cfg).toEqual(ICON_SLOTS.find((s) => s.id === 'k-group')!.defaults);
    expect(icons['k-song']!.live).toBe(false);
  });

  it('gives the defaults of the first slot for an unknown id, never a throw', () => {
    expect(iconOf(iconsOf([]), 'gone').cfg).toEqual(ICON_SLOTS[0]!.defaults);
  });

  it('keeps every default inside the library', () => {
    for (const s of ICON_SLOTS) expect(parseIconSettings(s.defaults)).toEqual(s.defaults);
  });
});
