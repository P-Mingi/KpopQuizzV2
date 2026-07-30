// W-CUSTOM step 3 - the 6 one-click presets. A preset is NOT a code path: applying
// one just fills the same presentation jsonb (accent family, banner treatment,
// frame style, divider, density). Every individual control stays editable under it.
// Each preset is authored to pass validation (readable accent on both backgrounds).

import type { Presentation, PresetId } from './types';

export interface PresetDef {
  id: PresetId;
  label: string;
  blurb: string;
  swatch: string;        // studio picker swatch (representative, not necessarily the accent)
  // The config fragment applied on top of the current draft. accent is optional:
  // Minimal keeps the group's own color. Type, texture and density ride along via
  // the data-preset CSS (keyed off preset id), so they need no config field. All
  // values are validated on save.
  apply: Partial<Pick<Presentation, 'accent' | 'frames' | 'banner' | 'stickers'>>;
}

// Each preset is a genuinely different MOOD on the one box system: a box style
// (rounded fill / outline / sharp edge / soft-shadow), an accent, a divider, a
// banner treatment, and a signature house sticker pack. Display type + surface
// texture + module density come from the [data-preset] CSS (globals.css), so the
// body stays legible and nothing needs a new schema field.
export const PRESET_DEFS: Record<PresetId, PresetDef> = {
  minimal: {
    id: 'minimal', label: 'Minimal', blurb: 'Clean and quiet: hairline boxes, the group color leads, light display, roomy.', swatch: '#8a8f98',
    // group color leads (no accent); outline boxes = box with no fill; no stickers.
    apply: { frames: { default: 'outline', divider: 'none' }, banner: { treatment: 'solid' } },
  },
  neon: {
    id: 'neon', label: 'Neon', blurb: 'High-voltage: crisp accent edges, heavy uppercase display, sparks.', swatch: '#c026d3',
    apply: { accent: '#c026d3', frames: { default: 'sharp', divider: 'dots' }, banner: { treatment: 'gradient' }, stickers: [{ id: 'house:sparkles:1', slot: 'banner-br' }] },
  },
  soft: {
    id: 'soft', label: 'Soft', blurb: 'Pastel and gentle: rounded fills, a soft wash, hearts.', swatch: '#e26aa0',
    apply: { accent: '#e26aa0', frames: { default: 'rounded', divider: 'wave' }, banner: { treatment: 'gradient' }, stickers: [{ id: 'house:hearts:2', slot: 'banner-br' }] },
  },
  retro: {
    id: 'retro', label: 'Retro', blurb: 'Warm blocks: outline boxes, bold condensed display, a paper tint, stars.', swatch: '#c2691f',
    apply: { accent: '#c2691f', frames: { default: 'outline', divider: 'dots' }, banner: { treatment: 'photo' }, stickers: [{ id: 'house:stars:1', slot: 'banner-br' }] },
  },
  y2k: {
    id: 'y2k', label: 'Y2K', blurb: 'Cyber violet: floating cards with a chrome sheen, bubbly display.', swatch: '#7c5cfc',
    apply: { accent: '#7c5cfc', frames: { default: 'soft-shadow', divider: 'wave' }, banner: { treatment: 'gradient' }, stickers: [{ id: 'house:sparkles:2', slot: 'banner-br' }] },
  },
  dark: {
    id: 'dark', label: 'Dark', blurb: 'Deep space: dark surfaces in any mode, floating cards, muted indigo glow.', swatch: '#6366f1',
    apply: { accent: '#6366f1', frames: { default: 'soft-shadow', divider: 'line' }, banner: { treatment: 'solid' }, stickers: [{ id: 'house:ring:1', slot: 'banner-br' }] },
  },
};

export const PRESET_LIST: PresetDef[] = Object.values(PRESET_DEFS);

/** Apply a preset onto a draft config (fills the same jsonb; leaves other controls). */
export function applyPreset(draft: Presentation, id: PresetId): Presentation {
  const def = PRESET_DEFS[id];
  if (!def) return draft;
  const next: Presentation = { ...draft, version: 1, preset: id };
  if (def.apply.accent !== undefined) next.accent = def.apply.accent;
  if (def.apply.frames !== undefined) next.frames = { ...def.apply.frames };
  if (def.apply.banner !== undefined) next.banner = { ...draft.banner, ...def.apply.banner };
  if (def.apply.stickers !== undefined) next.stickers = def.apply.stickers.map((s) => ({ ...s }));
  return next;
}
