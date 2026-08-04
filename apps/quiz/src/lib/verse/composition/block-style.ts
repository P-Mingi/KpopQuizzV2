// V-BUILDER-2 step 5 - per-block STYLE value sets + their CSS mapping. Every value is a
// NAMED enum/token key; the panel offers only these and the renderer maps them to CSS
// built from tokens (color-mix over --verse-accent, v-radius, the --vb-accent-* swatches),
// NEVER a raw value. Stored on the module (rides the presentation jsonb; no migration).

export type BlockDensity = 'compact' | 'normal' | 'roomy';   // UI: Compact / Standard / Cozy
export type BlockRadius = 'sharp' | 'soft' | 'round';
export type BlockScale = 'S' | 'M' | 'L';

// Background tint swatches (None + the token set). Values are color-mix over the scope
// accent, so a tint always harmonizes with the space + stays readable.
export const TINT_KEYS = ['none', 'veil', 'soft', 'bold'] as const;
export type TintKey = (typeof TINT_KEYS)[number];
// Accent swatches: 'world' = inherit the scope accent (no override); the rest resolve to
// --vb-accent-* tokens defined in globals.css (concrete colors live in CSS, not source).
export const ACCENT_KEYS = ['world', 'violet', 'blue', 'green', 'amber', 'rose'] as const;
export type AccentKey = (typeof ACCENT_KEYS)[number];

export type BlockDivider = 'none' | 'hairline' | 'space';   // separator above the block
export const DENSITIES: BlockDensity[] = ['roomy', 'normal', 'compact'];
export const RADII: BlockRadius[] = ['sharp', 'soft', 'round'];
export const SCALES: BlockScale[] = ['S', 'M', 'L'];
export const BLOCK_DIVIDERS: BlockDivider[] = ['none', 'hairline', 'space'];

const RADIUS_CSS: Record<BlockRadius, string> = { sharp: '0', soft: 'var(--v-radius, 14px)', round: '1.5rem' };
const DENSITY_PAD: Record<BlockDensity, string> = { compact: '0.45rem 0.6rem', normal: 'var(--v-frame-pad, 1rem)', roomy: '1.5rem 1.4rem' };
const SCALE_EM: Record<BlockScale, string> = { S: '0.92em', M: '1em', L: '1.12em' };

export function tintCss(key: string): string {
  switch (key) {
    case 'veil': return 'color-mix(in srgb, var(--verse-accent) 6%, transparent)';
    case 'soft': return 'color-mix(in srgb, var(--verse-accent) 13%, transparent)';
    case 'bold': return 'color-mix(in srgb, var(--verse-accent) 22%, transparent)';
    default: return '';
  }
}
export function accentVarFor(key: string): string | null {
  return !key || key === 'world' ? null : `var(--vb-accent-${key})`;
}

export interface BlockStyleValues {
  frame?: string | undefined;
  background?: string | null | undefined;    // tint key
  radius?: BlockRadius | null | undefined;
  density?: BlockDensity | null | undefined;
  accent?: string | null | undefined;        // accent key ('world' | swatch) OR a clamped hex (legacy)
  textScale?: BlockScale | null | undefined;
}

/** The inline style (tokens only) that renders a module's per-block style on its box. */
export function blockBoxStyle(v: BlockStyleValues): Record<string, string> {
  const s: Record<string, string> = {};
  const tint = v.background ? tintCss(v.background) : '';
  if (tint) s.background = tint;
  if (v.radius) s.borderRadius = RADIUS_CSS[v.radius];
  if (v.density) s.padding = DENSITY_PAD[v.density];
  if (v.textScale) s.fontSize = SCALE_EM[v.textScale];
  if (v.accent) {
    // 'world' inherits; a swatch resolves to its token; a legacy hex passes through as
    // a value (dynamic, never a source literal, so the token gate never sees it).
    const a = accentVarFor(v.accent);
    if (a) s['--verse-accent'] = a;
    else if (v.accent !== 'world' && /^#/.test(v.accent)) s['--verse-accent'] = v.accent;
  }
  return s;
}

/** True when a module carries ANY per-block box style (so the renderer must wrap it). */
export function hasBoxStyle(v: BlockStyleValues): boolean {
  return !!(v.background && v.background !== 'none') || !!v.radius || !!v.density || !!v.textScale || !!(v.accent && v.accent !== 'world');
}

// ---- validator clamps (return the value if valid, else undefined) ----
export const clampDensity = (x: unknown): BlockDensity | undefined => (DENSITIES.includes(x as BlockDensity) ? (x as BlockDensity) : undefined);
export const clampRadius = (x: unknown): BlockRadius | undefined => (RADII.includes(x as BlockRadius) ? (x as BlockRadius) : undefined);
export const clampScale = (x: unknown): BlockScale | undefined => (SCALES.includes(x as BlockScale) ? (x as BlockScale) : undefined);
export const clampTint = (x: unknown): TintKey | undefined => (TINT_KEYS.includes(x as TintKey) ? (x as TintKey) : undefined);
export const clampAccentKey = (x: unknown): AccentKey | undefined => (ACCENT_KEYS.includes(x as AccentKey) ? (x as AccentKey) : undefined);
export const clampBlockDivider = (x: unknown): BlockDivider | undefined => (BLOCK_DIVIDERS.includes(x as BlockDivider) ? (x as BlockDivider) : undefined);
