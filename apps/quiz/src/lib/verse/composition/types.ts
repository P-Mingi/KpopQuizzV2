// V-BUILDER-1 Phase 1 - THE UNIFIED COMPOSITION SCHEMA.
// A page is sections[] -> blocks[] -> props. This is the one shape the builder
// (Phase 2) edits and the one renderer (step 3) renders. It is a SUPERSET of the
// current presentation config: the converter (./convert) maps today's
// presentation.modules[] into this losslessly, so nothing about the rendered page
// changes in Phase 1 (proven byte-parity). STORAGE is unchanged - this rides the
// existing verse_spaces.presentation jsonb, no migration.
//
// STABLE BLOCK IDS (spike ruling): every block carries an `id` that is NEVER the
// array index. Selection, style, and concurrent-edit locks reference the id, so a
// reorder can never break a reference. Legacy configs get a deterministic,
// content-derived id at convert time (see ./convert); they persist permanently
// once the Phase 2 builder saves a composition.

import type { Zone, FrameStyle } from '../presentation/registry';
import type { Presentation } from '../presentation/types';

export const COMPOSITION_VERSION = 1 as const;

// --- section-level (the vertical stack of a page) --------------------------
export type SectionWidth = 'text' | 'wide' | 'full';
export type SectionDensity = 'compact' | 'normal' | 'roomy';
export type SectionDivider = 'none' | 'line' | 'dots' | 'wave';

// --- per-block style (the option SET; Phase 2 builds the panel over this) ----
// Phase 1 only needs the options today's modules already carry (frame, mode) plus
// the shape the panel will fill. All are clamped by the validator (tokens only,
// ink floor) - encoded here so Phase 2's style panel is pure UI over data.
export interface BlockTextStyle {
  size?: 'S' | 'M' | 'L';        // steps on the type scale, never free px
  align?: 'left' | 'center';
}
export interface BlockStyle {
  frame?: FrameStyle;            // the 8 frame styles (bridged from ModulePlacement.frame)
  mode?: string;                 // per-module option (bridged from ModulePlacement.mode)
  background?: string | null;    // token tint key (Phase 2+)
  radius?: 'sharp' | 'soft' | 'round';
  density?: SectionDensity;
  accent?: string | null;        // per-block accent, contrast-clamped (Phase 2+)
  text?: BlockTextStyle;
}

// --- one placed block ------------------------------------------------------
export interface Block {
  id: string;                    // STABLE, content-derived; NEVER the array index
  type: string;                  // BLOCK_REGISTRY key
  zone: Zone;                    // transitional (main|side). Phase 3's grid replaces this with `span`.
  span?: number;                 // 1-12 column span (Phase 3; Phase 1 renders full-width stacks)
  hidden?: boolean;              // feature blocks only; forced false for seoCritical by the validator
  props?: Record<string, unknown>;
  style?: BlockStyle;
}

export interface Section {
  id: string;
  width: SectionWidth;
  background?: string | null;    // token tint
  density?: SectionDensity;
  divider?: SectionDivider;
  blocks: Block[];
}

// Everything on a Presentation that is NOT a module is page-level chrome
// (preset, accent, tabs, banner, stickers, frames, doorways...). It is preserved
// verbatim on the composition so the round-trip is lossless.
export type CompositionMeta = Omit<Presentation, 'version' | 'modules'>;

export interface Composition {
  version: 1;
  meta: CompositionMeta;
  sections: Section[];
}

/** Empty composition: one empty home section, empty meta. Maps to today's default look. */
export const EMPTY_COMPOSITION: Composition = {
  version: COMPOSITION_VERSION,
  meta: {},
  sections: [{ id: 'home', width: 'wide', blocks: [] }],
};
