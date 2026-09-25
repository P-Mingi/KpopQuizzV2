// UX v11.1 badge medallions (DESIGN-SPEC 17.8). One SVG medallion per badge, no
// PNG art: the RARITY sets the frame shape + gradient, the BADGE sets a unique
// glyph. Glyphs are Lucide paths (ISC licence) drawn in a 24 box. Rarity itself
// always comes from lib/badges.ts badgeRarity() (the single source of truth).

import type { Rarity } from '@/lib/badges';

/** Frame per rarity on a 72 x 72 box; corners are rounded by stroking the shape
 *  with its own gradient (stroke 5, round joins). Gradient top-left to bottom-right. */
export interface RarityArt {
  from: string;
  to: string;
  /** Inner SVG of the frame shape (fill + stroke are applied by the renderer). */
  shape: string;
  /** Label colour used for the small uppercase rarity word (AA on the page). */
  ink: string;
}

function starPath(): string {
  const pts: string[] = [];
  for (let i = 0; i < 24; i++) {
    const r = i % 2 ? 28 : 33;
    const a = ((i * 15 - 90) * Math.PI) / 180;
    pts.push(`${(36 + r * Math.cos(a)).toFixed(1)} ${(36 + r * Math.sin(a)).toFixed(1)}`);
  }
  return `<path d="M${pts.join('L')}z"/>`;
}

export const RARITY_ART: Record<Rarity, RarityArt> = {
  common: { from: '#C9CED9', to: '#7C8499', ink: '#8b93a7', shape: '<circle cx="36" cy="36" r="31"/>' },
  uncommon: { from: '#74E3A4', to: '#17994F', ink: '#22a355', shape: '<rect x="7" y="7" width="58" height="58" rx="19"/>' },
  rare: { from: '#93BFFF', to: '#2C67DB', ink: '#3b82f6', shape: '<path d="M36 5l26.8 15.5v31L36 67 9.2 51.5v-31z"/>' },
  epic: { from: '#DBAEFF', to: '#8A3CDF', ink: '#a855f7', shape: '<path d="M36 5l26 9.5V34c0 16.5-11 27.5-26 33C21 61.5 10 50.5 10 34V14.5z"/>' },
  legendary: { from: '#FFE38A', to: '#E08E00', ink: '#e0a100', shape: starPath() },
};

// ---- glyphs (Lucide, ISC) --------------------------------------------------------
const G = {
  star: '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/>',
  flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
  calendarCheck: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="M9 16l2 2 4-4"/>',
  penTool: '<path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.59 7.59"/><circle cx="11" cy="11" r="2"/>',
  feather: '<path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"/><path d="M16 8L2 22"/><path d="M17.5 15H9"/>',
  headphones: '<path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/>',
  sprout: '<path d="M7 20h10"/><path d="M10 20c5.5-2.5.8-6.4 3-10"/><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/>',
  zap: '<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>',
  messageQuestion: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
  layers: '<path d="M12 2L2 7l10 5 10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>',
  flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>',
  target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  messages: '<path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2z"/><path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  compass: '<circle cx="12" cy="12" r="10"/><path d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36z"/>',
  heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7z"/>',
  rocket: '<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>',
  sparkles: '<path d="M12 3l-1.91 5.81a2 2 0 0 1-1.28 1.28L3 12l5.81 1.91a2 2 0 0 1 1.28 1.28L12 21l1.91-5.81a2 2 0 0 1 1.28-1.28L21 12l-5.81-1.91a2 2 0 0 1-1.28-1.28z"/><path d="M5 3v4M19 17v4M3 5h4M17 19h4"/>',
  crown: '<path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z"/><path d="M5 20h14"/>',
  gem: '<path d="M6 3h12l4 6-10 13L2 9z"/><path d="M11 3L8 9l4 13 4-13-3-6"/><path d="M2 9h20"/>',
  // extra family glyphs (Lucide: radar, bar-chart-2, book-open, link, gallery, map, scroll, award, arrow-left-right, hourglass)
  radar: '<path d="M19.07 4.93A10 10 0 0 0 6.99 3.34"/><path d="M4 6h.01"/><path d="M2.29 9.62A10 10 0 1 0 21.31 8.35"/><path d="M16.24 7.76A6 6 0 1 0 8.23 16.67"/><path d="M17.99 11.66A6 6 0 0 1 15.77 16.67"/><circle cx="12" cy="12" r="2"/><path d="m13.41 10.59 5.66-5.66"/>',
  chart: '<path d="M18 20V10M12 20V4M6 20v-6"/>',
  book: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  cards: '<rect x="2" y="6" width="14" height="14" rx="2"/><path d="M6 2h14a2 2 0 0 1 2 2v14"/>',
  map: '<path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/>',
  scroll: '<path d="M8 21h12a2 2 0 0 0 2-2v-2H10v2a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v3h4"/><path d="M19 17V5a2 2 0 0 0-2-2H4"/>',
  award: '<circle cx="12" cy="8" r="6"/><path d="M15.48 12.89 17 22l-5-3-5 3 1.52-9.11"/>',
  swap: '<path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/>',
  hourglass: '<path d="M5 22h14M5 2h14"/><path d="M17 22v-4.17a2 2 0 0 0-.59-1.42L12 12l-4.41 4.41A2 2 0 0 0 7 17.83V22"/><path d="M7 2v4.17a2 2 0 0 0 .59 1.42L12 12l4.41-4.41A2 2 0 0 0 17 6.17V2"/>',
} as const;

/** Exact badge ids (DESIGN-SPEC 17.8 glyph map + the legacy set of lib/badges.ts). */
const BY_ID: Record<string, string> = {
  perfect_score: G.star,
  streak_7: G.flame,
  streak_30: G.calendarCheck,
  streak_100: G.flame,
  creator_bronze: G.penTool,
  creator_silver: G.feather,
  creator_gold: G.crown,
  first_steps: G.sprout,
  hard_mode: G.zap,
  quiz_maker: G.messageQuestion,
  quizmaker_5: G.layers,
  prolific_creator: G.layers,
  multi_stan: G.users,
  dedicated_fan: G.heart,
  viral_hit: G.rocket,
  community_star: G.sparkles,
  group_master: G.crown,
  founding_fan: G.gem,
  pc_first: G.cards,
  pc_collector: G.cards,
  pc_set: G.cards,
};

/** Families (lib/badges/catalog.ts keys + legacy prefixes): an id with no exact
 *  mapping falls back to its family glyph (17.8). */
const BY_FAMILY: Record<string, string> = {
  marathoner: G.flag,
  perfectionist: G.target,
  golden_ear: G.headphones,
  bias_radar: G.radar,
  daily_devotion: G.calendarCheck,
  debater: G.messages,
  quizmaker: G.layers,
  reached: G.chart,
  fandom_traveler: G.compass,
  wordsmith: G.book,
  sourcerer: G.link,
  essayist: G.feather,
  quest_collector: G.cards,
  cartographer: G.map,
  chronicler: G.scroll,
  steady_hand: G.flame,
  first_fan: G.award,
  founding_curator: G.crown,
  dual_citizen: G.swap,
  multi_fandom: G.users,
  veteran: G.hourglass,
  completionist: G.star,
  streak: G.flame,
  creator: G.penTool,
  pc: G.cards,
};

/** Family key of a badge id: `marathoner_50` -> `marathoner`, `creator_gold` -> `creator`. */
export function badgeFamily(id: string): string {
  return id.replace(/_(\d+|bronze|silver|gold|first|collector|set)$/, '');
}

/** The glyph (inner SVG, 24 box) for a badge id. Unknown ids get the star. */
export function badgeGlyph(id: string): string {
  return BY_ID[id] ?? BY_FAMILY[badgeFamily(id)] ?? BY_FAMILY[id] ?? G.star;
}

/** True when an id resolves to a real glyph (exact or family), not the fallback. */
export function hasBadgeGlyph(id: string): boolean {
  return Boolean(BY_ID[id] ?? BY_FAMILY[badgeFamily(id)] ?? BY_FAMILY[id]);
}
