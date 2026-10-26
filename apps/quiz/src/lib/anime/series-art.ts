// Run O1, lane O2 (series art): the deterministic picture of a series, from its slug and its title alone. No image of a work
// is involved (S 3.4 rule 1: no poster, logo, screenshot or character drawing): one colour of a curated palette, one
// geometric pattern of a small set, and the series title. The same slug always gives the same colour and the same
// pattern (the cache and the crawler see one picture). Pure: no React, no I/O, so the component, the tests and the
// contrast proof read the same numbers.

/** Text colours the art uses: white on the deep colours, near black on the light ones (AA, see series-art.test.ts). */
export const ART_LIGHT_TEXT = '#FFFFFF';
export const ART_DARK_TEXT = '#1A1A22';

export interface ArtColor {
  readonly name: string;
  readonly bg: string;
  /** The text colour that reads on `bg` at WCAG AA (4.5:1) even under the pattern at its strongest. */
  readonly text: typeof ART_LIGHT_TEXT | typeof ART_DARK_TEXT;
}

/** The curated palette, mapped by slug. Every entry holds AA with its own text colour (proved by the unit test). No pink: OtakuQuiz is orange (owner, 2026-10-26). */
export const ART_PALETTE: readonly ArtColor[] = [
  { name: 'crimson', bg: '#AA263C', text: ART_LIGHT_TEXT },
  { name: 'persimmon', bg: '#9D3309', text: ART_LIGHT_TEXT },
  { name: 'umber', bg: '#794A00', text: ART_LIGHT_TEXT },
  { name: 'pine', bg: '#18603D', text: ART_LIGHT_TEXT },
  { name: 'teal', bg: '#0C5E58', text: ART_LIGHT_TEXT },
  { name: 'ocean', bg: '#035A8A', text: ART_LIGHT_TEXT },
  { name: 'cobalt', bg: '#1C4ACD', text: ART_LIGHT_TEXT },
  { name: 'indigo', bg: '#4338CA', text: ART_LIGHT_TEXT },
  { name: 'violet', bg: '#6D28D9', text: ART_LIGHT_TEXT },
  { name: 'orchid', bg: '#9C1BA8', text: ART_LIGHT_TEXT },
  { name: 'navy', bg: '#1E3A8A', text: ART_LIGHT_TEXT },
  { name: 'slate', bg: '#334155', text: ART_LIGHT_TEXT },
  { name: 'oxblood', bg: '#7C2D12', text: ART_LIGHT_TEXT },
  { name: 'apricot', bg: '#FDBA74', text: ART_DARK_TEXT },
  { name: 'saffron', bg: '#FCD34D', text: ART_DARK_TEXT },
  { name: 'mint', bg: '#86EFAC', text: ART_DARK_TEXT },
  { name: 'aqua', bg: '#67E8F9', text: ART_DARK_TEXT },
  { name: 'lilac', bg: '#C4B5FD', text: ART_DARK_TEXT },
  { name: 'sky', bg: '#93C5FD', text: ART_DARK_TEXT },
  { name: 'lime', bg: '#BEF264', text: ART_DARK_TEXT },
];

export type ArtSize = 'avatar' | 'card' | 'hub';

/** The viewBox of each size (the avatar is square, the card is a strip, the hub header is the 8:5 box of the title card). */
export const ART_BOX: Readonly<Record<ArtSize, { readonly w: number; readonly h: number; readonly unit: number }>> = {
  avatar: { w: 64, h: 64, unit: 16 },
  card: { w: 320, h: 104, unit: 24 },
  hub: { w: 320, h: 200, unit: 28 },
};

/** The opacity of the pattern, and the strongest one the contrast proof assumes. */
export const ART_PATTERN_OPACITY = 0.12;
/** The corner disc and the pattern can stack under a letter: 1 - (1 - 0.12) * (1 - 0.07), up to two decimals. */
export const ART_PATTERN_MAX_OPACITY = 0.19;
export const ART_DISC_OPACITY = 0.07;

export type ArtPatternKey = 'stripes' | 'dots' | 'waves' | 'chevrons' | 'rings' | 'lattice' | 'scales' | 'diamonds';

export interface ArtPattern {
  readonly key: ArtPatternKey;
  /** `stroke`: lines in the pattern colour; the dots are zero length segments with round caps. */
  readonly d: (w: number, h: number, u: number) => string;
  /** Stroke width as a multiple of the unit. */
  readonly weight: number;
}

/** A coordinate with at most one decimal (the paths stay short). */
const n1 = (v: number): string => String(Math.round(v * 10) / 10);

const range = (from: number, to: number, step: number): number[] => {
  const out: number[] = [];
  for (let v = from; v <= to; v += step) out.push(v);
  return out;
};

export const ART_PATTERNS: readonly ArtPattern[] = [
  // Diagonal stripes at 45 degrees.
  { key: 'stripes', weight: 0.34, d: (w, h, u) => range(-h, w, u).map((x) => `M${x} ${h}L${x + h} 0`).join('') },
  // A dot grid, every other row shifted by half a step.
  {
    key: 'dots', weight: 0.5,
    d: (w, h, u) => range(u / 2, h + u, u).flatMap((y, row) => range(row % 2 === 0 ? u / 2 : u, w + u, u).map((x) => `M${x} ${y}h0`)).join(''),
  },
  // Rows of soft waves.
  {
    key: 'waves', weight: 0.2,
    d: (w, h, u) => range(u / 2, h + u / 2, u).map((y) => `M0 ${y}${range(0, w, u).map(() => `q${n1(u / 4)} ${n1(-u / 3)} ${n1(u / 2)} 0t${n1(u / 2)} 0`).join('')}`).join(''),
  },
  // Rows of zig zags.
  {
    key: 'chevrons', weight: 0.22,
    d: (w, h, u) => range(u / 2, h + u / 2, u).map((y) => `M0 ${y}${range(0, w, u).map(() => `l${n1(u / 2)} ${n1(-u / 3)}l${n1(u / 2)} ${n1(u / 3)}`).join('')}`).join(''),
  },
  // Concentric circles around the lower right corner.
  {
    key: 'rings', weight: 0.18,
    d: (w, h, u) => range(u, Math.ceil(Math.hypot(w, h) / u) * u, u).map((r) => `M${w - r} ${h}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`).join(''),
  },
  // A square lattice.
  {
    key: 'lattice', weight: 0.14,
    d: (w, h, u) => `${range(u, h, u).map((y) => `M0 ${y}H${w}`).join('')}${range(u, w, u).map((x) => `M${x} 0V${h}`).join('')}`,
  },
  // Overlapping scales, the seigaiha wave of Japanese textiles.
  {
    key: 'scales', weight: 0.14,
    d: (w, h, u) => {
      const r = u * 0.75;
      return range(r, h + u, r).flatMap((y, row) => range(row % 2 === 0 ? 0 : r, w + u, 2 * r).map((x) => `M${x - r} ${y}a${r} ${r} 0 0 1 ${2 * r} 0`)).join('');
    },
  },
  // A lattice of diamonds.
  {
    key: 'diamonds', weight: 0.14,
    d: (w, h, u) => `${range(-h, w, u).map((x) => `M${x} ${h}L${x + h} 0`).join('')}${range(0, w + h, u).map((x) => `M${x} ${h}L${x - h} 0`).join('')}`,
  },
];

/** FNV-1a 32 bit of a string, from a seed, with a final mix so that the low bits are as good as the high ones. */
export function artHash(text: string, seed = 0): number {
  let h = (0x811c9dc5 ^ Math.imul(seed, 0x9e3779b1)) >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}

/** The seeds of the two picks. They were chosen once, so that the 30 series of the catalog get 30 different pairs. */
export const ART_COLOR_SEED = 68;
export const ART_PATTERN_SEED = 1;

/** The colour and the pattern of a slug. */
export function artFor(slug: string): { readonly color: ArtColor; readonly pattern: ArtPattern; readonly index: number; readonly patternIndex: number } {
  const key = slug.trim().toLowerCase();
  const index = artHash(key, ART_COLOR_SEED) % ART_PALETTE.length;
  const patternIndex = artHash(key, ART_PATTERN_SEED + 1) % ART_PATTERNS.length;
  return { color: ART_PALETTE[index]!, pattern: ART_PATTERNS[patternIndex]!, index, patternIndex };
}

const SMALL_WORDS = new Set(['the', 'of', 'a', 'an', 'and', 'no', 'wa', 'to', 'in', 'on', 'at', 'for', 'with']);

/** Two letters for the avatar: the first letters of the first two words, else the first two letters of the one word. */
export function artMonogram(title: string): string {
  const words = title.replace(/[^\p{L}\p{N} ]/gu, ' ').trim().split(/\s+/).filter(Boolean);
  const main = words.filter((w) => !SMALL_WORDS.has(w.toLowerCase()));
  const pick = main.length > 0 ? main : words;
  if (pick.length === 0) return '?';
  const letters = pick.length >= 2 ? `${Array.from(pick[0]!)[0]}${Array.from(pick[1]!)[0]}` : Array.from(pick[0]!).slice(0, 2).join('');
  const out = letters.toUpperCase();
  return pick.length >= 2 ? out : `${out.charAt(0)}${out.slice(1).toLowerCase()}`;
}

/** Width of one character of the display font, as a multiple of the font size (a deliberately wide estimate). */
export const ART_CHAR_EM = 0.62;
export const ART_LINE_HEIGHT = 1.16;

/** The words cut into lines of at most `chars` characters. A word longer than a line is cut (never dropped). */
export function wrapWords(title: string, chars: number): string[] {
  const lines: string[] = [];
  let cur = '';
  for (let word of title.trim().split(/\s+/).filter(Boolean)) {
    while (Array.from(word).length > chars) {
      const head = Array.from(word).slice(0, chars).join('');
      if (cur) { lines.push(cur); cur = ''; }
      lines.push(head);
      word = word.slice(head.length);
    }
    if (!word) continue;
    if (!cur) cur = word;
    else if (Array.from(`${cur} ${word}`).length <= chars) cur = `${cur} ${word}`;
    else { lines.push(cur); cur = word; }
  }
  if (cur) lines.push(cur);
  return lines;
}

export interface ArtText {
  readonly lines: readonly string[];
  readonly fontSize: number;
  readonly lineHeight: number;
}

/**
 * The title set to fill `width` x `height`: the largest font size (from `max` down to `min`) at which the whole title
 * fits on at most `maxLines` lines, no word cut. The title is never shortened: when nothing fits at the minimum size the
 * words are cut at the end of a line, and the whole text is still printed.
 */
export function fitArtText(title: string, width: number, height: number, maxLines: number, max: number, min: number): ArtText {
  for (let fs = max; fs >= min; fs--) {
    const chars = Math.floor(width / (fs * ART_CHAR_EM));
    const words = title.trim().split(/\s+/).filter(Boolean);
    if (words.some((w) => Array.from(w).length > chars)) continue;
    const lines = wrapWords(title, chars);
    if (lines.length <= maxLines && lines.length * fs * ART_LINE_HEIGHT <= height) return { lines, fontSize: fs, lineHeight: Math.round(fs * ART_LINE_HEIGHT * 10) / 10 };
  }
  const chars = Math.max(1, Math.floor(width / (min * ART_CHAR_EM)));
  return { lines: wrapWords(title, chars), fontSize: min, lineHeight: Math.round(min * ART_LINE_HEIGHT * 10) / 10 };
}

/** The slug a title would have, for a caller that knows only the title (the colour is then the one of that slug). */
export function slugOfTitle(title: string): string {
  return title.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// ---------------------------------------------------------------------------------------------------------------
// Contrast, for the proof of the palette (WCAG 2.x luminance of a colour)
// ---------------------------------------------------------------------------------------------------------------

function channel(v: number): number {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** `fg` laid over `bg` at `alpha`, as a hex colour. */
export function blend(fg: string, bg: string, alpha: number): string {
  const f = parseInt(fg.slice(1), 16);
  const b = parseInt(bg.slice(1), 16);
  const mix = (shift: number): number => Math.round(((f >> shift) & 255) * alpha + ((b >> shift) & 255) * (1 - alpha));
  return `#${[16, 8, 0].map((s) => mix(s).toString(16).padStart(2, '0')).join('')}`;
}
