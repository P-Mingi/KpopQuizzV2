// V-BUILDER-1 step 4 - the clamped ENUMS for the token-governed text marks, shared
// by the editor extensions (components/verse/editor/marks.ts) and the SSR renderer
// + sanitizer (render-content.ts) so the two can never drift. Pure data, no deps.
export const HIGHLIGHT_TINTS = ['yellow', 'pink', 'blue', 'green', 'purple'] as const;
export const FONT_SIZES = ['S', 'M', 'L'] as const;
export const TEXT_ALIGNS = ['left', 'center'] as const;

export type HighlightTint = (typeof HIGHLIGHT_TINTS)[number];
export type FontSize = (typeof FONT_SIZES)[number];
export type TextAlignV = (typeof TEXT_ALIGNS)[number];

export const clampTint = (v: unknown): HighlightTint => (HIGHLIGHT_TINTS as readonly string[]).includes(String(v)) ? (v as HighlightTint) : 'yellow';
export const clampSize = (v: unknown): FontSize => (FONT_SIZES as readonly string[]).includes(String(v)) ? (v as FontSize) : 'M';
export const clampAlign = (v: unknown): TextAlignV | null => (TEXT_ALIGNS as readonly string[]).includes(String(v)) ? (v as TextAlignV) : null;
