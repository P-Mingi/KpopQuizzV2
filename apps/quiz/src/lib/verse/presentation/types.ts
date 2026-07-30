// W-CUSTOM - the versioned presentation config shape. This is DATA; the renderer
// is ours. Curators never touch HTML/CSS/JS. verse_spaces.presentation (live) and
// presentation_draft (studio) both hold this shape. Empty/absent -> default look.

import type { Zone, FrameStyle } from './registry';

export const PRESENTATION_VERSION = 1 as const;

export type PresetId = 'minimal' | 'neon' | 'soft' | 'retro' | 'y2k' | 'dark';
export const PRESETS: PresetId[] = ['minimal', 'neon', 'soft', 'retro', 'y2k', 'dark'];

export type TabId =
  | 'home' | 'members' | 'music' | 'story' | 'timeline'
  | 'collections' | 'community' | 'awards' | 'tours';
export const ALLOWED_TABS: TabId[] = ['home', 'members', 'music', 'story', 'timeline', 'collections', 'community', 'awards', 'tours'];

/** One placed module in the stack. `type` is a registry key; `zone` is validated. */
export interface ModulePlacement {
  type: string;              // BLOCK_REGISTRY key
  zone: Zone;
  hidden?: boolean;          // feature blocks only; ignored (forced false) for seoCritical
  frame?: FrameStyle;
  mode?: string;             // per-module option (e.g. music mode); validated per block
  props?: Record<string, unknown>; // per-instance data (quote text, pinned spotlight...); validated per block
  order: number;             // sort within zone
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

export interface Presentation {
  version: 1;
  preset?: PresetId | null;
  accent?: string | null;    // hex; contrast-validated, auto-shaded at render
  banner?: BannerConfig;
  welcome?: string | null;   // short curator intro (TipTap-constrained inline)
  tabs?: TabId[];            // 3-7 tabs; hidden tabs never hide pages
  modules?: ModulePlacement[];
  stickers?: StickerPlacement[];
  frames?: { default?: FrameStyle; divider?: 'none' | 'line' | 'dots' | 'wave' };
}

/** The empty presentation: absent config resolves to this, which the renderer maps
 * to today's default look. Kept trivially small so "empty === default" is obvious. */
export const EMPTY_PRESENTATION: Presentation = { version: PRESENTATION_VERSION };
