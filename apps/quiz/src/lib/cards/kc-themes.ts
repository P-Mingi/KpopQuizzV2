// KpopCards: the four themes of "Choose your pack" and the look of each pack (the v6 prototype's THEMES, packLook and GOLD_C). A theme only changes
// which idols can come out and the colours of the pack, never the odds of an edition. The face of a pack: three colours, a title, its address.
import { THEME_IDS } from './kc-paths';

import type { ThemeId } from './kc-paths';

export interface Theme { id: ThemeId; name: string; title: string; c: readonly [string, string, string] }

export const THEMES: readonly Theme[] = [
  { id: 'all', name: 'All idols', title: 'ALL IDOLS', c: ['#FF3E86', '#C55BFF', '#4CC9FF'] },
  { id: 'girls', name: 'Girl groups', title: 'GIRL GROUPS', c: ['#FF6FA8', '#FF8F6B', '#FFC94D'] },
  { id: 'boys', name: 'Boy groups', title: 'BOY GROUPS', c: ['#3D7BFF', '#7C5CFF', '#36D1C4'] },
  { id: 'solo', name: 'Soloists', title: 'SOLOISTS', c: ['#FFB23D', '#FF7A59', '#E8457A'] },
];
export const GOLD_C: readonly [string, string, string] = ['#FFF1B8', '#F2B53A', '#B77A0E'];

export function themeBy(id: string | null | undefined): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0]!;
}
export function isThemeId(s: string | null | undefined): s is ThemeId {
  return !!s && (THEME_IDS as readonly string[]).includes(s);
}

export interface PackLook { c: readonly [string, string, string]; title: string; path: string; golden: boolean }

/** The face of the pack for a way of opening it: a theme, the pack of the day (the group's colour), a golden pack. */
export function packLook(o: { theme?: string | null; daily?: { name: string; a: string; c: string } | null; golden?: boolean }): PackLook {
  if (o.daily) return { c: [o.daily.a, '#B48CFF', o.daily.c], title: o.daily.name.toUpperCase(), path: 'daily', golden: !!o.golden };
  const t = themeBy(o.theme);
  return o.golden ? { c: GOLD_C, title: 'GOLDEN PACK', path: t.id, golden: true } : { c: t.c, title: t.title, path: t.id, golden: false };
}

/** The shelf choice is kept in this browser until the account stores it (a preference, not a game state). */
export const THEME_KEY = 'kpopcards-theme';
