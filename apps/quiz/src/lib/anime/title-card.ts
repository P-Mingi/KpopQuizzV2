// Run O1, lot (b), lane LB (A7): the spec of the typographic title card. Pure and deterministic: the same title always
// gives the same card (the cache and the crawler see one picture), and no image of the work is involved (S 3.4 rule 1:
// no poster, logo or cover on anime). The component draws the spec as an SVG.

/** Accent tokens a card may use (frozen names of tokens.md 1, without the `--ux-` prefix). */
export const TITLE_CARD_ACCENTS = ['pink-fill', 'accent2', 'acc-purple', 'acc-blue', 'acc-teal', 'acc-amber', 'acc-coral'] as const;
export type TitleCardAccent = (typeof TITLE_CARD_ACCENTS)[number];

export interface TitleCardShape { readonly kind: 'ring' | 'dot' | 'band'; readonly x: number; readonly y: number; readonly size: number; readonly opacity: number }
export interface TitleCardSpec {
  readonly accent: TitleCardAccent;
  readonly lines: readonly string[];
  readonly fontSize: number;
  readonly monogram: string;
  readonly shapes: readonly TitleCardShape[];
}

export const TITLE_CARD_VIEW = { width: 320, height: 200 } as const;

/** FNV-1a 32 bit. */
export function hashTitle(title: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < title.length; i++) {
    h ^= title.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

function prng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The title cut into at most `maxLines` lines of about `maxChars` characters, on word breaks (a long word is cut). */
export function wrapTitle(title: string, maxChars = 12, maxLines = 3): string[] {
  const words = title.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  for (let word of words) {
    while (word.length > maxChars) {
      if (cur) { lines.push(cur); cur = ''; }
      lines.push(word.slice(0, maxChars));
      word = word.slice(maxChars);
    }
    if (!cur) cur = word;
    else if ((cur + ' ' + word).length <= maxChars) cur = cur + ' ' + word;
    else { lines.push(cur); cur = word; }
  }
  if (cur) lines.push(cur);
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  kept[maxLines - 1] = `${kept[maxLines - 1]!.slice(0, Math.max(1, maxChars - 3)).trimEnd()}...`;
  return kept;
}

/** Up to three letters: the initials of the first words of the title. */
export function monogramOf(title: string): string {
  const words = title.replace(/[^A-Za-z0-9 ]/g, ' ').trim().split(/\s+/).filter(Boolean);
  const letters = words.slice(0, 3).map((w) => w.charAt(0)).join('');
  return (letters || title.trim().slice(0, 2)).toUpperCase();
}

export function titleCardSpec(title: string, accent?: TitleCardAccent): TitleCardSpec {
  const seed = hashTitle(title);
  const rnd = prng(seed);
  const lines = wrapTitle(title);
  const longest = lines.reduce((m, l) => Math.max(m, l.length), 1);
  const fontSize = Math.max(22, Math.min(44, Math.floor(250 / longest)));
  const shapes: TitleCardShape[] = [];
  const count = 4 + Math.floor(rnd() * 3);
  const kinds: TitleCardShape['kind'][] = ['ring', 'dot', 'band'];
  for (let i = 0; i < count; i++) {
    shapes.push({
      kind: kinds[Math.floor(rnd() * kinds.length)]!,
      x: Math.round(rnd() * TITLE_CARD_VIEW.width),
      y: Math.round(rnd() * TITLE_CARD_VIEW.height),
      size: 18 + Math.round(rnd() * 70),
      opacity: Math.round((0.12 + rnd() * 0.3) * 100) / 100,
    });
  }
  return { accent: accent ?? TITLE_CARD_ACCENTS[seed % TITLE_CARD_ACCENTS.length]!, lines, fontSize, monogram: monogramOf(title), shapes };
}
