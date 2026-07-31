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
    Object.assign(style, derivedAccentVars(raw, onAccent));
  }
  return style as CSSProperties;
}

/* V-POLISH item 1+2 - THE CONTRAST FLOOR. The CSS color-mix derivation of
   --verse-ink uses a fixed ratio, so a near-white accent (BTS publishes
   #E6F1FB) lands headings at ~1.9:1 on the cream page. CSS cannot clamp to a
   target ratio, so the theme layer precomputes floored tokens per mode and
   globals.css prefers them over the mix. Same for solid CTA fills: a pale
   accent pill vanishes against the page, so --verse-cta darkens the fill
   until it separates, and --verse-cta-text is chosen to read on that fill. */

const LIGHT_BG = '#FAF8F5';   // --bg (light root)
const DARK_BG = '#0f1119';    // --bg-primary (dark root)
const INK_DARK = '#1a1714';   // light-mode mix target (matches globals.css)
const INK_LIGHT = '#f5f3ef';  // dark-mode mix target (matches globals.css)

export function contrastRatio(a: string, b: string): number {
  const l1 = luminance(a);
  const l2 = luminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

/** Per-channel sRGB interpolation, matching CSS color-mix(in srgb, ...). */
function mixHex(from: string, toward: string, t: number): string {
  const ch = (h: string, i: number): number => parseInt(h.slice(i, i + 2), 16);
  const f = from.length === 4 ? `#${[1, 2, 3].map((i) => from[i]! + from[i]!).join('')}` : from;
  const w = toward.length === 4 ? `#${[1, 2, 3].map((i) => toward[i]! + toward[i]!).join('')}` : toward;
  const out = [1, 3, 5].map((i) => {
    const v = Math.round(ch(f, i) * (1 - t) + ch(w, i) * t);
    return v.toString(16).padStart(2, '0');
  });
  return `#${out.join('')}`;
}

/** Mix accent toward `toward`, starting at the CSS baseline ratio, until it
 * clears `target` contrast against `bg`. Falls back to `toward` itself. */
function clampToContrast(accent: string, toward: string, bg: string, start: number, target: number): string {
  for (let t = start; t <= 1.001; t += 0.05) {
    const c = mixHex(accent, toward, Math.min(t, 1));
    if (contrastRatio(c, bg) >= target) return c;
  }
  return toward;
}

/** The floored derived tokens for one accent, both modes. Exported so the
 * studio guardrail can preview and validate with the exact same math. */
export function derivedAccentVars(accent: string, curatedText: string): Record<string, string> {
  const curatedOk = HEX.test(curatedText);
  // Ink: when the accent itself cannot reach AA, prefer the CURATED pair over
  // a mechanical darkening. For a pastel fandom accent (BTS ice #E6F1FB) the
  // curated partner is the fandom's deep tone (#0C447C) and reads intentional
  // where a mixed gray reads dead. Fall back to the clamped mix.
  const mixL = clampToContrast(accent, INK_DARK, LIGHT_BG, 0.26, 4.5);
  const inkL = contrastRatio(accent, LIGHT_BG) >= 4.5 ? accent
    : (curatedOk && contrastRatio(curatedText, LIGHT_BG) >= 4.5 ? curatedText : mixL);
  const inkD = contrastRatio(accent, DARK_BG) >= 4.5 ? accent
    : (curatedOk && contrastRatio(curatedText, DARK_BG) >= 4.5 ? curatedText
      : clampToContrast(accent, INK_LIGHT, DARK_BG, 0.32, 4.5));
  // Solid fills: keep the accent when it separates from the page (3:1, the
  // WCAG non-text component floor... 1.8 tolerated for large pills is too
  // forgiving, hold the line at 1.8 separation minimum then label rules).
  // When it cannot, invert the pair: the curated deep tone becomes the fill
  // and the accent becomes the label, which keeps the fandom's two-tone
  // identity instead of introducing a gray.
  const fillFor = (bg: string, towardInk: string): { fill: string; label: string | null } => {
    if (contrastRatio(accent, bg) >= 1.8) return { fill: accent, label: null };
    if (curatedOk && contrastRatio(curatedText, bg) >= 3.0) {
      const label = contrastRatio(accent, curatedText) >= 4.5 ? accent : null;
      return { fill: curatedText, label };
    }
    return { fill: clampToContrast(accent, towardInk, bg, 0.2, 3.0), label: null };
  };
  const l = fillFor(LIGHT_BG, INK_DARK);
  const d = fillFor(DARK_BG, INK_LIGHT);
  const textOn = (fill: string, preferred: string | null): string => {
    if (preferred) return preferred;
    if (curatedOk && contrastRatio(curatedText, fill) >= 4.5) return curatedText;
    return contrastRatio('#141210', fill) >= contrastRatio('#ffffff', fill) ? '#141210' : '#ffffff';
  };
  return {
    '--v-ink-l': inkL, '--v-ink-d': inkD,
    '--v-cta-l': l.fill, '--v-cta-d': d.fill,
    '--v-cta-text-l': textOn(l.fill, l.label), '--v-cta-text-d': textOn(d.fill, d.label),
  };
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
