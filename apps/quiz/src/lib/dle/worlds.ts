// Daily games step 4: the two games of the Terrier as data (RAPPORT-JEUX-DU-JOUR-v2.md section 2, boards Main.dc.html and Kpopdle.dc.html): the
// brand, its colour family, the image slots of site_assets, its modes in order. Pure, no I/O. A mode links to its page only when its game
// is built (games.ts); until then the row, the dot and the step say "soon". Series of the day comes after the launch, the two series games of CR-024 are built: each is one game here, a line of DLE_BUILT_GAMES (registry.ts), its words (copy.ts), its SEO row (seo.ts) and its one page.
import { DAILY_PATH, dleGame, localePath } from './games';
import { DLE_SERIES, SERIES_MODE_FALLBACK, seriesIconId, seriesModeKey } from './series';

import type { DleGameDef, DleGameId } from './games';
import type { DleLocale } from './types';

export type DleWorldId = 'kpopdle' | 'otakudle';
type L10n = Readonly<Record<DleLocale, string>>;

export interface DleMode {
  readonly id: string;
  /** The game of the mode; null for a mode that has no game yet (Hidden members, the series modes). */
  readonly game: DleGameId | null;
  /** A name of ICON_LIBRARY (lib/photos/slots.ts). */
  readonly icon: string;
  /** Its site_assets key (the small round image and the square of its row). */
  readonly slot: string;
  /** The key read when `slot` has no image of its own (a series falls back to the shared "by series" square); absent for the other modes. */
  readonly slotFallback?: string;
  /** Its icon slot of the admin (lib/photos/slots.ts ICON_SLOTS): the step icon on the game pages. */
  readonly iconSlot: string;
  readonly name: L10n;
  /** The word of the step icons on the game page. */
  readonly step: L10n;
}

export interface DleWorld {
  readonly id: DleWorldId;
  readonly brand: 'Kpopdle' | 'Otakudle';
  /** The site of its XP, streak and quiz links. */
  readonly universe: 'kpop' | 'anime';
  /** The class of its colour family: hub-dle-k (pink) or hub-dle-a (orange). */
  readonly tone: 'k' | 'a';
  readonly wordmarkHead: 'Kpop' | 'Otaku';
  /** The large image of its block on the Terrier, and its banner. */
  readonly coverSlot: string;
  readonly bannerSlot: string;
  /** The vertical writing of the empty cover. */
  readonly vertical: { readonly text: string; readonly lang: 'ko' | 'ja' };
  /** A name of ICON_LIBRARY: its door at the foot of the other game's page. */
  readonly hopIcon: string;
  /** The icon slot of that door (link-o: the door to Otakudle, at the foot of Kpopdle; link-k: the door to Kpopdle). */
  readonly hopIconSlot: string;
  readonly what: L10n;
  readonly sub: L10n;
  /** Yesterday's answer stays hidden until a click (anime spoilers). */
  readonly spoiler: boolean;
  readonly modes: readonly DleMode[];
}

export const DLE_WORLDS: readonly DleWorld[] = [
  {
    id: 'kpopdle', brand: 'Kpopdle', universe: 'kpop', tone: 'k', wordmarkHead: 'Kpop', coverSlot: 'home:kpopdle', bannerSlot: 'banner:kpopdle',
    vertical: { text: '오늘의 아이돌', lang: 'ko' },
    hopIcon: 'idol', hopIconSlot: 'link-k',
    what: { en: 'Guess today’s K-pop idol', fr: 'Devine l’idol K-pop du jour' },
    sub: { en: 'Unlimited guesses', fr: 'Essais illimités' },
    spoiler: false,
    modes: [
      { id: 'idol', game: 'kpopdle-idol', icon: 'idol', slot: 'daily:mode-idol', iconSlot: 'k-idol', name: { en: 'Idol of the day', fr: 'Idol du jour' }, step: { en: 'Idol', fr: 'Idol' } },
      { id: 'group', game: 'kpopdle-group', icon: 'group', slot: 'daily:mode-group', iconSlot: 'k-group', name: { en: 'Group of the day', fr: 'Groupe du jour' }, step: { en: 'Group', fr: 'Groupe' } },
      { id: 'song', game: 'kpopdle-song', icon: 'song', slot: 'daily:mode-song', iconSlot: 'k-song', name: { en: 'Song of the day', fr: 'Chanson du jour' }, step: { en: 'Song', fr: 'Chanson' } },
      { id: 'hidden', game: null, icon: 'hidden', slot: 'daily:mode-hidden', iconSlot: 'k-hidden', name: { en: 'Hidden members', fr: 'Membres cachés' }, step: { en: 'Members', fr: 'Membres' } },
    ],
  },
  {
    id: 'otakudle', brand: 'Otakudle', universe: 'anime', tone: 'a', wordmarkHead: 'Otaku', coverSlot: 'home:otakudle', bannerSlot: 'banner:otakudle',
    vertical: { text: 'オタクドル', lang: 'ja' },
    hopIcon: 'eye', hopIconSlot: 'link-o',
    what: { en: 'Guess today’s anime character', fr: 'Devine le personnage d’anime du jour' },
    sub: { en: 'One anime character a day, the same for everyone', fr: 'Un personnage d’anime par jour, le même pour tout le monde' },
    spoiler: true,
    modes: [
      { id: 'char', game: 'otakudle', icon: 'char', slot: 'daily:mode-char', iconSlot: 'o-char', name: { en: 'Character of the day', fr: 'Personnage du jour' }, step: { en: 'Character', fr: 'Personnage' } },
      { id: 'series', game: null, icon: 'tv', slot: 'daily:mode-series', iconSlot: 'o-series', name: { en: 'Series of the day', fr: 'Série du jour' }, step: { en: 'Series', fr: 'Série' } },
      // The per-series games (024, CR-024) take the place of "One Otakudle per series", in the order of the chain: Otakudle, then One Piece, then Dragon Ball (Plan.dc.html, link 8).
      // One mode per series of lib/dle/series.ts: its square and its step icon are its own slots in the admin, falling back to the shared "by series" ones.
      ...DLE_SERIES.map((x): DleMode => ({
        id: x.id, game: `otakudle-${x.id}` as DleGameId, icon: x.icon, slot: seriesModeKey(x.id), slotFallback: SERIES_MODE_FALLBACK, iconSlot: seriesIconId(x.id),
        name: { en: `${x.name} character`, fr: `Personnage ${x.name}` }, step: { en: x.name, fr: x.name },
      })),
    ],
  },
];

/** The image of a mode's square: its own slot, else the slot it falls back to (a series without a square of its own shows the shared one). */
export function modeImage<T>(images: Readonly<Record<string, T>>, mode: DleMode): T | undefined {
  return images[mode.slot] ?? (mode.slotFallback ? images[mode.slotFallback] : undefined);
}

/** The game of a mode when it has a page, else null. */
export function liveGame(mode: DleMode): DleGameDef | null {
  if (!mode.game) return null;
  const g = dleGame(mode.game);
  return g.built ? g : null;
}

/** The mode after a game in its world that has a page (the "Next game" button of the result): Otakudle, then One Piece, then Dragon Ball; null at the end of the chain. */
export function nextLiveMode(game: DleGameId): DleMode | null {
  const world = worldOf(game);
  return world.modes.slice(world.modes.findIndex((m) => m.game === game) + 1).find((m) => liveGame(m)) ?? null;
}

/** The playable modes of a world. */
export function liveModes(world: DleWorld): readonly DleMode[] {
  return world.modes.filter((m) => liveGame(m) !== null);
}

/** The world of a game. */
export function worldOf(id: DleGameId): DleWorld {
  const w = DLE_WORLDS.find((x) => x.modes.some((m) => m.game === id));
  if (!w) throw new Error(`no world for ${id}`);
  return w;
}

/** The first playable page of a world, or null while it has none (its block then says "soon", never a dead door). */
export function worldHref(world: DleWorld, locale: DleLocale): string | null {
  const first = liveModes(world)[0];
  return first ? localePath(liveGame(first)!.path, locale) : null;
}

/** The other world's page, for the hop at the bottom of a game page; null while it has no page. */
export function otherWorld(world: DleWorld): DleWorld {
  return DLE_WORLDS.find((w) => w.id !== world.id)!;
}

export const burrowHref = (locale: DleLocale): string => localePath(DAILY_PATH, locale);
