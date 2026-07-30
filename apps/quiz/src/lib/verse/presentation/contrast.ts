// W-CUSTOM - the READABILITY GUARDRAIL (owner-blessed, inviolable). No curator can
// publish a page whose body text fails WCAG AA on its background. Accent colors
// auto-adjust shade (same idea as the fan card) instead of being rejected outright,
// but a genuinely unreadable text/bg pair is refused server-side with a plain
// sentence. Built on the existing luminance() so there is one contrast source.

import { luminance } from '@/lib/verse/theme';

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
export const AA_BODY = 4.5; // WCAG AA, normal body text

export function isHex(v: unknown): v is string {
  return typeof v === 'string' && HEX.test(v);
}

/** WCAG contrast ratio between two hex colors (1..21). */
export function contrastRatio(a: string, b: string): number {
  if (!isHex(a) || !isHex(b)) return 1;
  const la = luminance(a);
  const lb = luminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

export function passesAA(text: string, bg: string): boolean {
  return contrastRatio(text, bg) >= AA_BODY;
}

function toRgb(hex: string): [number, number, number] {
  let h = hex.slice(1);
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function toHex(r: number, g: number, b: number): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}
/** Move a color toward black (amount<0) or white (amount>0) by a 0..1 fraction. */
function shade(hex: string, amount: number): string {
  const [r, g, b] = toRgb(hex);
  const t = amount < 0 ? 0 : 255;
  const f = Math.abs(amount);
  return toHex(r + (t - r) * f, g + (t - g) * f, b + (t - b) * f);
}

/**
 * Return a shade of `accent` that hits AA against `bg`, darkening or lightening in
 * small steps (whichever direction the background calls for). Returns null only if
 * no shade of this hue can reach AA on this background (then the save is rejected).
 */
export function accentReadableOn(accent: string, bg: string): string | null {
  if (!isHex(accent) || !isHex(bg)) return null;
  if (passesAA(accent, bg)) return accent;
  const bgLight = luminance(bg) > 0.5;
  const dir = bgLight ? -1 : 1; // dark bg -> lighten accent; light bg -> darken
  for (let step = 1; step <= 10; step++) {
    const cand = shade(accent, dir * (step / 10));
    if (passesAA(cand, bg)) return cand;
  }
  // Try the opposite direction as a last resort (some mid hues invert better).
  for (let step = 1; step <= 10; step++) {
    const cand = shade(accent, -dir * (step / 10));
    if (passesAA(cand, bg)) return cand;
  }
  return null;
}
