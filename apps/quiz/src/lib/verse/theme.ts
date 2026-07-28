// Verse per-fandom theming. Base accent derives from groups.display_color; a
// space may override it via verse_spaces.theme.accent. The RAW accent is set as
// a CSS custom property on a `.verse-scope` wrapper; globals.css derives a
// MODE-AWARE readable ink from it (darkened on the light cream bg, lightened on
// dark) so accent text hits AA in both modes - a single raw hue cannot, hence
// the per-mode derivation lives in CSS, not here.
import type { CSSProperties } from 'react';

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export interface SpaceThemeInput {
  display_color: string | null;
  text_color: string | null;
  theme?: { accent?: string; accent_text?: string } | null;
}

/** Inline style object carrying the accent custom properties for a scope wrapper. */
export function verseScopeStyle(input: SpaceThemeInput): CSSProperties {
  const raw = input.theme?.accent && HEX.test(input.theme.accent) ? input.theme.accent
    : (input.display_color && HEX.test(input.display_color) ? input.display_color : null);
  const onAccent = input.theme?.accent_text && HEX.test(input.theme.accent_text) ? input.theme.accent_text
    : (input.text_color && HEX.test(input.text_color) ? input.text_color : '#ffffff');
  const style: Record<string, string> = {};
  if (raw) {
    style['--verse-accent'] = raw;
    style['--verse-accent-text'] = onAccent; // curated contrast pair for solid fills
  }
  return style as CSSProperties;
}

/** Relative luminance (0..1) of a hex color, for choosing overlay ink on photos. */
export function luminance(hex: string): number {
  if (!HEX.test(hex)) return 0.5;
  let h = hex.slice(1);
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const lin = (i: number): number => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(0) + 0.7152 * lin(2) + 0.0722 * lin(4);
}

/** True when dark text should sit on this accent (accent is light). */
export function accentPrefersDarkInk(hex: string | null): boolean {
  return hex ? luminance(hex) > 0.55 : false;
}
