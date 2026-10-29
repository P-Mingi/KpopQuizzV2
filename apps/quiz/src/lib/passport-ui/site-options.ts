// Run O1, owner order of 2026-10-26: no pink on bunnyverse.org/anime. The passport settings offer name colours, avatar presets and passport themes; the kpop
// sets hold a "Pink" of each. On another site the pink choices are not offered, and the default passport theme (the site accent) shows as its own
// orange. On kpop every export here is the very same array or object as before.

import { AVATAR_PRESET_KEYS, NAME_ACCENT_KEYS } from '@/lib/passport-flair';
import { PASSPORT_THEMES, PASSPORT_THEME_KEYS } from '@/lib/passport-themes';
import { SITE } from '@/lib/site/registry';

const OTHER_SITE = SITE.id !== 'kpop';

/** The name colours the settings offer. */
export const OFFERED_NAME_ACCENT_KEYS: readonly string[] = OTHER_SITE ? NAME_ACCENT_KEYS.filter((k) => k !== 'pink') : NAME_ACCENT_KEYS;

/** The avatar presets the settings offer (the rose "Blossom" is kpop's). */
export const OFFERED_AVATAR_PRESET_KEYS: readonly string[] = OTHER_SITE ? AVATAR_PRESET_KEYS.filter((k) => k !== 'blossom') : AVATAR_PRESET_KEYS;

/** The passport themes the settings offer: every key stays valid (a stored one still renders), the default is the site accent. */
export const OFFERED_THEME_KEYS: readonly string[] = PASSPORT_THEME_KEYS;

/** The label and the swatch of a passport theme as this site shows it. */
export function themeOption(key: string): { readonly label: string; readonly swatch: string } {
  const t = PASSPORT_THEMES[key]!;
  if (OTHER_SITE && key === 'default') return { label: 'Orange', swatch: SITE.theme.light.pink ?? t.swatch };
  return t;
}
