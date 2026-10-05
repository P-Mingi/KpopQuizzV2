// V12 themed blindtest playlists as the acquisition surfaces show them (the
// Playlists rail on /blindtest and on the landings, the /blindtest/<theme> pages).
//
// The DATA of a theme (which songs, how many, playable or hidden) is G2's:
// lib/blind-test-modes.ts THEMED_MODES, lib/blind-test-curated.ts and the
// hidden-under-10 rule of lib/blind-test-playlists.ts. This file only holds what a
// visitor reads: the name, the cover, the sentences. They are the prototype's
// (docs/design/growth-v12/prototype.html, tables THM and THL), in its order.
//
// Numbers are never written here. A cover line that is a count ("300 songs") is
// built from the real count at render time and left out when there is none.
//
// Client-safe: plain data and pure functions.

import type { BtLang } from './bt-strings';
import type { ThemeCover } from '@/components/ux-v1/theme-card';

export interface BtTheme {
  /** The mode id: the page is /blindtest/<id>, the run is generate's playlist of that id. */
  id: string;
  cover: ThemeCover;
  name: string;
  /** H1 of the theme page. */
  h1: string;
  lead: string;
  /** Cover line: a fixed phrase, or the real song count. */
  sub: { kind: 'count' } | { kind: 'text'; text: string };
  /** true = a v12 themed mode (hidden under 10 songs); false = a v11 mode page that already exists. */
  themed: boolean;
  /** fr, es, id: cover line (when it is a phrase) and the card sentence. Names stay as they are. */
  loc: Readonly<Record<Exclude<BtLang, 'en'>, { sub?: string; lead: string }>>;
}

export const KPDH_ID = 'kpop-demon-hunters';

export const BT_THEMES: readonly BtTheme[] = [
  {
    id: 'kpop-hits-2026', cover: 'hits26', name: 'K-pop hits 2026', h1: 'K-pop hits 2026 blind test',
    lead: 'This year\'s biggest K-pop songs, added as they chart.',
    sub: { kind: 'text', text: 'Updated every week' }, themed: true,
    loc: {
      fr: { sub: 'Mise à jour chaque semaine', lead: 'Les plus gros titres K-pop de l’année.' },
      es: { sub: 'Actualizada cada semana', lead: 'Los mayores éxitos K-pop del año.' },
      id: { sub: 'Update tiap minggu', lead: 'Lagu K-pop paling hits tahun ini.' },
    },
  },
  {
    id: '5th-gen', cover: 'gen5', name: '5th gen', h1: '5th gen blind test',
    lead: 'The newest generation: Cortis, ILLIT, BABYMONSTER, KATSEYE, Hearts2Hearts and more.',
    sub: { kind: 'count' }, themed: true,
    loc: {
      fr: { lead: 'La nouvelle génération : Cortis, ILLIT, BABYMONSTER, KATSEYE.' },
      es: { lead: 'La nueva generación: Cortis, ILLIT, BABYMONSTER, KATSEYE.' },
      id: { lead: 'Generasi terbaru: Cortis, ILLIT, BABYMONSTER, KATSEYE.' },
    },
  },
  {
    id: 'tiktok-viral', cover: 'viral', name: 'Viral on TikTok', h1: 'Viral on TikTok blind test',
    lead: 'The K-pop songs everyone danced to on TikTok. Each one is checked against a public trend source.',
    sub: { kind: 'text', text: 'Curated' }, themed: true,
    loc: {
      fr: { sub: 'Sélection', lead: 'Les chansons K-pop qui ont explosé sur TikTok.' },
      es: { sub: 'Selección', lead: 'Las canciones K-pop que arrasaron en TikTok.' },
      id: { sub: 'Pilihan', lead: 'Lagu K-pop yang viral di TikTok.' },
    },
  },
  {
    id: KPDH_ID, cover: 'kpdh', name: 'KPop Demon Hunters', h1: 'KPop Demon Hunters songs blind test',
    lead: 'The songs from the film, then the real K-pop they come from. Audio clips only, no images from the film.',
    sub: { kind: 'text', text: 'Soundtrack songs' }, themed: true,
    loc: {
      fr: { sub: 'Chansons du film', lead: 'Les chansons du film, puis la vraie K-pop.' },
      es: { sub: 'Banda sonora', lead: 'Las canciones de la película y el K-pop real.' },
      id: { sub: 'Soundtrack film', lead: 'Lagu-lagu dari filmnya, lalu K-pop aslinya.' },
    },
  },
  {
    id: 'kpop-hits-2025', cover: 'hits25', name: 'K-pop hits 2025', h1: 'K-pop hits 2025 blind test',
    lead: 'The songs that defined last year.',
    sub: { kind: 'count' }, themed: true,
    loc: {
      fr: { lead: 'Les chansons qui ont marqué l’an dernier.' },
      es: { lead: 'Las canciones que marcaron el año pasado.' },
      id: { lead: 'Lagu-lagu paling hits tahun lalu.' },
    },
  },
  {
    id: '4th-gen', cover: 'gen4', name: '4th gen', h1: '4th gen blind test',
    lead: 'Stray Kids, aespa, IVE, NewJeans, ITZY, ENHYPEN, TXT and more.',
    sub: { kind: 'count' }, themed: false,
    loc: {
      fr: { lead: 'Stray Kids, aespa, IVE, NewJeans, ITZY et plus.' },
      es: { lead: 'Stray Kids, aespa, IVE, NewJeans, ITZY y más.' },
      id: { lead: 'Stray Kids, aespa, IVE, NewJeans, ITZY, dan lainnya.' },
    },
  },
];

export function themeById(id: string): BtTheme | undefined {
  return BT_THEMES.find((t) => t.id === id);
}

/** Is this id a v12 themed PAGE (its own layout, a new URL)? '4th-gen' is not: its page is v11's. */
export function isThemePage(id: string): boolean {
  return themeById(id)?.themed === true;
}

/** First sentence of a lead: the line under a card title (prototype thCard). */
export function firstSentence(lead: string): string {
  const i = lead.indexOf('.');
  return i < 0 ? lead : lead.slice(0, i + 1);
}

/**
 * The themes a visitor may be shown: a themed one only when it is in `playable`
 * (the ids of getPlayableStaticModes, the hidden-under-10 rule), the v11 one always.
 */
export function visibleThemes(playable: ReadonlySet<string>): BtTheme[] {
  return BT_THEMES.filter((t) => !t.themed || playable.has(t.id));
}

export interface ThemeCardCopy {
  href: string;
  name: string;
  sub: string | undefined;
  lead: string;
  cover: ThemeCover;
}

/**
 * What a rail card prints, in a language. `counts` are real playable-song counts by
 * theme id; `songsCount` turns a formatted count into "300 songs" in that language.
 */
export function themeCard(
  t: BtTheme,
  lang: BtLang,
  counts: Readonly<Record<string, number>>,
  fmt: { num: (n: number) => string; songsCount: (n: string) => string },
): ThemeCardCopy {
  const loc = lang === 'en' ? null : t.loc[lang];
  const n = counts[t.id];
  const sub = t.sub.kind === 'count'
    ? (typeof n === 'number' && n > 0 ? fmt.songsCount(fmt.num(n)) : undefined)
    : (loc?.sub ?? t.sub.text);
  return { href: `/blindtest/${t.id}`, name: t.name, sub, lead: loc ? loc.lead : firstSentence(t.lead), cover: t.cover };
}
