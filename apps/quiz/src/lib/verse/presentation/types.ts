// W-CUSTOM - the versioned presentation config shape. This is DATA; the renderer
// is ours. Curators never touch HTML/CSS/JS. verse_spaces.presentation (live) and
// presentation_draft (studio) both hold this shape. Empty/absent -> default look.

import type { Zone, FrameStyle } from './registry';
import type { DoorwayConfigMap } from './doorways';

export const PRESENTATION_VERSION = 1 as const;

export type PresetId = 'minimal' | 'neon' | 'soft' | 'retro' | 'y2k' | 'dark';
export const PRESETS: PresetId[] = ['minimal', 'neon', 'soft', 'retro', 'y2k', 'dark'];

// V-TEMPLATES: the structure template applied (3b). Orthogonal to the visual
// preset: templates decide STRUCTURE (tabs + modules), presets decide LOOK.
export type StructureTemplateId = 'starter' | 'complete' | 'encyclopedia' | 'empty';
export const STRUCTURE_TEMPLATES: StructureTemplateId[] = ['starter', 'complete', 'encyclopedia', 'empty'];

// Tab ids ARE the real route segments (home = the space root). The composer picks a
// subset to SHOW; hidden tabs never hide their pages (still live, in the sitemap,
// reachable via the footer graph). The layout intersects the picked set with the
// tabs that actually have content for the space.
export type TabId =
  | 'home' | 'members' | 'discography' | 'timeline' | 'quests' | 'essays'
  | 'community' | 'about' | 'tours' | 'shows' | 'ost' | 'awards'
  | 'photocards' | 'collectibles' | 'wiki' | 'songs';
// V-MODES: 'quests' stays in TabId for stored-config compat but is no longer
// pickable (it left the reader nav, locked Q1); validate drops legacy picks.
export const ALLOWED_TABS: TabId[] = ['home', 'members', 'discography', 'timeline', 'essays', 'community', 'about', 'tours', 'shows', 'ost', 'awards', 'photocards', 'collectibles', 'wiki', 'songs'];

/** One placed module in the stack. `type` is a registry key; `zone` is validated. */
export interface ModulePlacement {
  // V-BUILDER-2 step 3.0 - the STABLE block id, persisted here in the jsonb (no
  // migration). Minted once (deterministic blk-<type>-<n> for legacy configs, a
  // crypto.randomUUID for blocks the builder inserts) and frozen at the first save,
  // so a reorder can never re-derive it. Selection, undo, and reconcile key on it.
  // Optional only for back-compat: a config saved before 3.0 has none until it is
  // re-saved (the validator freezes it then); reads mint the deterministic fallback.
  id?: string;
  type: string;              // BLOCK_REGISTRY key
  zone: Zone;
  hidden?: boolean;          // feature blocks only; ignored (forced false) for seoCritical
  frame?: FrameStyle;
  mode?: string;             // per-module option (e.g. music mode); validated per block
  props?: Record<string, unknown>; // per-instance data (quote text, pinned spotlight...); validated per block
  order: number;             // sort within zone
  // V-BUILDER-2 step 5 - per-block STYLE, all named enum/token keys (see composition/
  // block-style.ts). Ride the presentation jsonb; validated + clamped on every save.
  background?: string | null;   // tint swatch key ('none' | 'veil' | 'soft' | 'bold')
  radius?: 'sharp' | 'soft' | 'round';
  density?: 'compact' | 'normal' | 'roomy';
  accent?: string | null;       // accent key ('world' | swatch) or a clamped hex (legacy)
  textScale?: 'S' | 'M' | 'L';  // block-level text scale (text blocks only)
  divider?: 'none' | 'hairline' | 'space';  // separator above this block
}

export type StickerSlot =
  | 'banner-tl' | 'banner-tr' | 'banner-bl' | 'banner-br'
  | 'seam' | 'section-end' | 'frame-corner';
export const STICKER_SLOTS: StickerSlot[] = ['banner-tl', 'banner-tr', 'banner-bl', 'banner-br', 'seam', 'section-end', 'frame-corner'];

export interface StickerPlacement {
  id: string;                // pack id ('house:hearts:1') or asset ref ('asset:123')
  slot: StickerSlot;
  scale?: number;            // 0.5 - 2
  rotate?: number;           // -30 - 30 degrees
  flip?: boolean;
  anchorIndex?: number;      // which seam/section-end anchor (0-based)
}

export interface BannerConfig {
  assetPath?: string | null; // storage path of the curator banner (validated host)
  treatment?: 'photo' | 'gradient' | 'solid';
}

// V-BUILDER-3 step 5 - HERO / IDENTITY overrides (co-design 8 / L-062). All curator
// overrides on the space masthead, stored in the presentation jsonb (rides the draft
// rail; no migration). Images are ingest-copied storage PATHS, never external URLs
// (L-047). Every field is optional and OVERRIDES a data-driven default; absent = the
// entity value (member count, fandom name, logo, derived vitals). The page H1 and hero
// semantics never change: displayName restyles only the VISIBLE masthead name.
export interface HeroIdentity {
  banner?: string | null;      // ingest-copied banner image path (overrides presentation.banner)
  avatar?: string | null;      // ingest-copied profile image path (overrides the group logo)
  displayName?: string | null; // overrides the visible masthead name (NOT the sr-only H1)
  tagline?: string | null;     // overrides the welcome line under the name
  chips?: { label?: string; value: string }[]; // overrides the derived vitals line
}

// W-CUSTOM step 7 - LIVE NOW is a curator manual toggle (a quota-cheap YouTube live
// check is not feasible: search.list costs 100 units/call). expiresAt caps the
// banner at 12h and auto-hides it at render even if the curator forgets.
export interface LiveNow { url: string; label?: string; expiresAt: string }

// V-SPACE-FLOW step 5 - COMEBACK MODE: a curator-armed event window (max 45
// days) that puts the hero into event skin: a countdown to the release, a pinned
// doorway (timeline or community until V-PAGES ships comeback hubs), and a
// release-day live-thread link. Auto-expires at render after endsAt.
export interface ComebackMode {
  title: string;
  startsAt: string;              // ISO date-time
  endsAt: string;                // ISO date-time; the release moment
  pinKind?: 'timeline' | 'community';
}

export interface Presentation {
  version: 1;
  preset?: PresetId | null;
  template?: StructureTemplateId | null;
  accent?: string | null;    // hex; contrast-validated, auto-shaded at render
  banner?: BannerConfig;
  hero?: HeroIdentity;       // V-BUILDER-3 step 5 - masthead identity overrides
  welcome?: string | null;   // short curator intro (TipTap-constrained inline)
  tabs?: TabId[];            // 3-7 tabs; hidden tabs never hide pages
  modules?: ModulePlacement[];
  stickers?: StickerPlacement[];
  frames?: { default?: FrameStyle; divider?: 'none' | 'line' | 'dots' | 'wave' };
  liveNow?: LiveNow | null;  // curator "we are live" state, auto-expiring
  comebackMode?: ComebackMode | null; // curator-armed event window, auto-expiring
  // V-SPACE-FLOW step 5 - anniversary auto-moments (debut years, birthdays) show
  // by default; a curator can switch them off. false = off, absent/true = on.
  celebrations?: boolean;
  // V-TEXT: per-section fold preference, keyed by section key (e.g. 'overview').
  // 'inline' never folds, 'folded' always folds; absent -> auto (fold past ~300
  // words). The split-to-sub-page option arrives with V-PAGES and is deliberately
  // NOT represented here until it is real.
  textFolds?: Record<string, 'inline' | 'folded'>;
  // V-PAGES: which page kinds this space's creator UI offers. Absent -> the
  // registry's default set. Ids are validated as shape here and resolved against
  // the kind registry at read (config can never invent a kind). Template bundles
  // write this (Encyclopedia enables all kinds).
  enabledKinds?: string[];
  // V-HARMONY-2A: per-door-type presentation (link/button/card/feature + a
  // heading override), keyed by door id. Absent -> sensible defaults. The FORMAT
  // is a skin only; the crawlable href + target title never change (the SEO
  // invariant lives in <DoorwayList>). Rides this jsonb - no migration.
  doorways?: DoorwayConfigMap;
}

/** The empty presentation: absent config resolves to this, which the renderer maps
 * to today's default look. Kept trivially small so "empty === default" is obvious. */
export const EMPTY_PRESENTATION: Presentation = { version: PRESENTATION_VERSION };
