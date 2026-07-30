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
  // Minimal keeps the group's own color. All values are validated on save.
  apply: Partial<Pick<Presentation, 'accent' | 'frames' | 'banner'>>;
}

export const PRESET_DEFS: Record<PresetId, PresetDef> = {
  minimal: {
    id: 'minimal', label: 'Minimal', blurb: 'Clean, quiet, the group color leads.', swatch: '#8a8f98',
    apply: { frames: { default: 'none', divider: 'line' }, banner: { treatment: 'solid' } },
  },
  neon: {
    id: 'neon', label: 'Neon', blurb: 'High-voltage, sharp edges, glow.', swatch: '#c026d3',
    apply: { accent: '#c026d3', frames: { default: 'sharp', divider: 'dots' }, banner: { treatment: 'gradient' } },
  },
  soft: {
    id: 'soft', label: 'Soft', blurb: 'Pastel, rounded, gentle.', swatch: '#e26aa0',
    apply: { accent: '#e26aa0', frames: { default: 'rounded', divider: 'wave' }, banner: { treatment: 'gradient' } },
  },
  retro: {
    id: 'retro', label: 'Retro', blurb: 'Warm tones, bordered blocks.', swatch: '#c2691f',
    apply: { accent: '#c2691f', frames: { default: 'sticker-border', divider: 'dots' }, banner: { treatment: 'photo' } },
  },
  y2k: {
    id: 'y2k', label: 'Y2K', blurb: 'Cyber violet, bubbly, chrome.', swatch: '#7c5cfc',
    apply: { accent: '#7c5cfc', frames: { default: 'sticker-border', divider: 'wave' }, banner: { treatment: 'gradient' } },
  },
  dark: {
    id: 'dark', label: 'Dark', blurb: 'Deep ground, muted glow.', swatch: '#6366f1',
    apply: { accent: '#6366f1', frames: { default: 'soft-shadow', divider: 'line' }, banner: { treatment: 'solid' } },
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
  return next;
}
