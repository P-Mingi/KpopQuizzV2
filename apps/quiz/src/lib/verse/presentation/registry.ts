// W-CUSTOM - the BLOCK REGISTRY. One skeleton, infinite faces: the structure is
// fixed and identical for every space; presentation is composed from THIS enum.
// The one law lives here as a boolean: seoCritical blocks (entity content) can be
// restyled and reordered but never removed; decorative blocks toggle freely. Rich
// config and empty config therefore emit the same indexable content - proven in
// verify, enforced in validate.ts.

export type Zone = 'main' | 'side';
// A module's box. 'rounded' = filled soft-surface card (box WITH background);
// 'outline' = the same box with NO fill, just a hairline (box background off);
// 'none' = no box. sharp / soft-shadow / sticker-border are richer curator skins.
export type FrameStyle = 'none' | 'rounded' | 'outline' | 'sharp' | 'sticker-border' | 'soft-shadow';
export const FRAME_STYLES: FrameStyle[] = ['none', 'rounded', 'outline', 'sharp', 'sticker-border', 'soft-shadow'];

export interface BlockDef {
  type: string;              // stable config id
  label: string;             // curator-facing name
  seoCritical: boolean;      // THE LAW: true = cannot be removed, only restyled/reordered
  zones: Zone[];             // zones this block may be placed in
  defaultZone: Zone | null;  // where it sits in the default (empty-config) layout; null = off by default
  defaultOrder: number;      // order within its default zone (lower = higher up)
  implemented: boolean;      // step 1 renders only the default set; later steps flip these on
  category: 'core' | 'feature';
}

// v1 registry. `core` (seoCritical) blocks are the entity content that every space
// must emit; `feature` blocks are decorative/interactive and toggle freely.
export const BLOCK_REGISTRY: Record<string, BlockDef> = {
  // --- Core, SEO-critical (never removable) - these ARE today's home content ---
  game_widgets: { type: 'game_widgets', label: 'Play (games)', seoCritical: false, zones: ['main'], defaultZone: 'main', defaultOrder: 0, implemented: true, category: 'feature' },
  members:      { type: 'members', label: 'Members', seoCritical: true, zones: ['main', 'side'], defaultZone: 'main', defaultOrder: 1, implemented: true, category: 'core' },
  discography:  { type: 'discography', label: 'Latest releases', seoCritical: true, zones: ['main', 'side'], defaultZone: 'main', defaultOrder: 2, implemented: true, category: 'core' },
  on_this_day:  { type: 'on_this_day', label: 'On this day', seoCritical: false, zones: ['side', 'main'], defaultZone: 'side', defaultOrder: 0, implemented: true, category: 'feature' },
  stats:        { type: 'stats', label: 'In numbers', seoCritical: false, zones: ['side', 'main'], defaultZone: 'side', defaultOrder: 1, implemented: true, category: 'feature' },
  masthead:     { type: 'masthead', label: 'Curator invite', seoCritical: false, zones: ['side', 'main'], defaultZone: 'side', defaultOrder: 2, implemented: true, category: 'feature' },

  // --- Core, SEO-critical - registered now, rendered in later steps ---
  facts:        { type: 'facts', label: 'Facts', seoCritical: true, zones: ['main', 'side'], defaultZone: null, defaultOrder: 0, implemented: false, category: 'core' },
  timeline:     { type: 'timeline', label: 'Timeline', seoCritical: true, zones: ['main'], defaultZone: null, defaultOrder: 0, implemented: false, category: 'core' },
  eras:         { type: 'eras', label: 'Eras', seoCritical: true, zones: ['main'], defaultZone: null, defaultOrder: 0, implemented: false, category: 'core' },
  collections:  { type: 'collections', label: 'Collections', seoCritical: false, zones: ['main', 'side'], defaultZone: null, defaultOrder: 0, implemented: false, category: 'feature' },

  // --- Feature blocks (decorative/interactive, freely toggleable) ---
  music:        { type: 'music', label: 'Music', seoCritical: false, zones: ['main', 'side'], defaultZone: null, defaultOrder: 0, implemented: true, category: 'feature' },
  countdown:    { type: 'countdown', label: 'Countdown', seoCritical: false, zones: ['side', 'main'], defaultZone: null, defaultOrder: 0, implemented: true, category: 'feature' },
  poll:         { type: 'poll', label: 'Poll', seoCritical: false, zones: ['main', 'side'], defaultZone: null, defaultOrder: 0, implemented: true, category: 'feature' },
  quote:        { type: 'quote', label: 'Quote highlight', seoCritical: false, zones: ['main', 'side'], defaultZone: null, defaultOrder: 0, implemented: true, category: 'feature' },
  spotlight:    { type: 'spotlight', label: 'Spotlight', seoCritical: false, zones: ['main', 'side'], defaultZone: null, defaultOrder: 0, implemented: true, category: 'feature' },
  social_embed: { type: 'social_embed', label: 'Social post', seoCritical: false, zones: ['main', 'side'], defaultZone: null, defaultOrder: 0, implemented: true, category: 'feature' },
  discord:      { type: 'discord', label: 'Discord', seoCritical: false, zones: ['side', 'main'], defaultZone: null, defaultOrder: 0, implemented: true, category: 'feature' },
  live_now:     { type: 'live_now', label: 'Live now', seoCritical: false, zones: ['side', 'main'], defaultZone: null, defaultOrder: 0, implemented: false, category: 'feature' },
};

export function isKnownBlock(type: string): boolean {
  return Object.prototype.hasOwnProperty.call(BLOCK_REGISTRY, type);
}
export function blockDef(type: string): BlockDef | null {
  return isKnownBlock(type) ? BLOCK_REGISTRY[type]! : null;
}
export function isSeoCritical(type: string): boolean {
  return blockDef(type)?.seoCritical ?? false;
}
/** Every seoCritical block type - the set that MUST appear regardless of config. */
export function seoCriticalBlockTypes(): string[] {
  return Object.values(BLOCK_REGISTRY).filter((b) => b.seoCritical).map((b) => b.type);
}
/** The seoCritical blocks that are part of the default (implemented) layout. */
export function defaultSeoCriticalTypes(): string[] {
  return Object.values(BLOCK_REGISTRY).filter((b) => b.seoCritical && b.defaultZone !== null).map((b) => b.type);
}
