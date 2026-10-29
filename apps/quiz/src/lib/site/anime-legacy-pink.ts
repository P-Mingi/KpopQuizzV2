// Run O1, owner order of 2026-10-26: no pink is visible on bunnyverse.org/anime. The shared sheets (styles/globals.css, styles/ux-v1, styles/ux-v12) keep their
// kpop pinks: kpopquiz.org reads the same bytes. styles/sites/anime/legacy.css is the anime build's override, generated from those sheets by this module
// (a test regenerates it and compares, so a pink added to a shared sheet fails until the file is regenerated):
//   - the legacy custom properties (--brand and the others of globals.css) are set once, on the anime scope, from the --ux accent tokens;
//   - every other declaration of a shared rule that holds a pink colour is repeated under the anime scope with the hue turned to orange.
// Pure: strings in, string out. The one place that says what "pink" is, for the generator and for the test.

export interface CssSource { readonly name: string; readonly css: string }

/** The scope every selector of the output starts with (tokens.md 3.2). */
export const SCOPE = 'html.ux-v1[data-site="anime"]';
export const SCOPE_DARK = 'html.ux-v1.dark[data-site="anime"]';

/** The hue of the orange the pinks are turned to (the design's #C2410C is 18 degrees, #F97316 is 25). */
export const ORANGE_HUE = 20;

export function hsl(r: number, g: number, b: number): [number, number, number] {
  const R = r / 255, G = g / 255, B = b / 255;
  const mx = Math.max(R, G, B), mn = Math.min(R, G, B), l = (mx + mn) / 2;
  let h = 0, s = 0;
  const d = mx - mn;
  if (d) {
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = mx === R ? (G - B) / d + (G < B ? 6 : 0) : mx === G ? (B - R) / d + 2 : (R - G) / d + 4;
    h *= 60;
  }
  return [h, s, l];
}

export function rgbOf(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

/** The five dark rose grounds of the kpop accent family (dark pink-soft, pink-line and their legacy twins). */
const DARK_ROSES: readonly (readonly [number, number, number])[] = [[0x3A, 0x21, 0x29], [0x4A, 0x2A, 0x37], [0x3D, 0x1A, 0x26], [0x33, 0x20, 0x2A], [0x5A, 0x2A, 0x40]];

/** Pink: a hue between 325 and 347 degrees, saturated, neither dark nor white; or one of the dark rose grounds. Danger reds (#9F1239, #3A1622) are not pink. */
export function isPink(r: number, g: number, b: number): boolean {
  if (DARK_ROSES.some((c) => Math.abs(c[0] - r) + Math.abs(c[1] - g) + Math.abs(c[2] - b) <= 3)) return true;
  const [h, s, l] = hsl(r, g, b);
  return h >= 325 && h <= 347 && s >= 0.35 && l >= 0.38 && l <= 0.97;
}

const HEX_RE = /#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![0-9a-zA-Z])/g;
const RGB_RE = /rgba?\(\s*(\d+)\s*[ ,]\s*(\d+)\s*[ ,]\s*(\d+)(\s*[,/]\s*[\d.]+%?)?\s*\)/g;

/** The pink colours of a value, as written. */
export function pinksIn(value: string): string[] {
  const out: string[] = [];
  for (const m of value.matchAll(HEX_RE)) {
    const h = m[1]!.length === 3 ? m[1]!.split('').map((c) => c + c).join('') : m[1]!;
    if (isPink(parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16))) out.push(m[0]);
  }
  for (const m of value.matchAll(RGB_RE)) if (isPink(+m[1]!, +m[2]!, +m[3]!)) out.push(m[0]);
  return out;
}

const turn = (r: number, g: number, b: number): [number, number, number] => {
  const [, s, l] = hsl(r, g, b);
  return rgbOf(ORANGE_HUE, s, l);
};
const hex2 = (n: number): string => n.toString(16).padStart(2, '0');

/** The value with every pink colour turned to the orange hue (same saturation, lightness and alpha; same notation). */
export function orange(value: string): string {
  return value
    .replace(HEX_RE, (all, body: string) => {
      const h = body.length === 3 ? body.split('').map((c) => c + c).join('') : body;
      const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
      if (!isPink(r, g, b)) return all;
      const [R, G, B] = turn(r, g, b);
      const out = `${hex2(R)}${hex2(G)}${hex2(B)}${h.slice(6)}`;
      return `#${body === body.toUpperCase() ? out.toUpperCase() : out}`;
    })
    .replace(RGB_RE, (all, r: string, g: string, b: string) => {
      if (!isPink(+r, +g, +b)) return all;
      const turned = turn(+r, +g, +b);
      let n = 0;
      // The first three integers of the notation are the channels; an alpha after them is kept as written.
      return all.replace(/\d+/g, (d) => (n < 3 ? String(turned[n++]) : d));
    });
}

// ---- the legacy custom properties

/** Every pink custom property of the shared root blocks, and the --ux accent token that replaces it (they follow the light and the dark theme of the site). */
export const LEGACY_VARS: Readonly<Record<string, string>> = {
  '--brand': 'var(--ux-pink)',
  '--brand-light': 'var(--ux-pink-soft)',
  '--brand-dark': 'var(--ux-pink-ink)',
  '--brand-btn': 'var(--ux-pink-fill)',
  '--brand-btn-hover': 'var(--ux-pink-fill-h)',
  '--tot-bg': 'var(--ux-pink-soft)',
  '--tot-icon': 'var(--ux-pink)',
  '--accent-light': 'var(--ux-pink-line)',
  '--type-image': 'var(--ux-pink)',
  '--type-image-bg': 'var(--ux-pink-soft)',
  '--type-image-text': 'var(--ux-pink-ink)',
  '--vb-accent-rose': 'var(--ux-pink)',
  '--uxv1-pink': 'var(--ux-pink)',
  '--uxv1-pink-dk': 'var(--ux-pink-ink)',
  '--uxv1-pink-lt': 'var(--ux-pink-soft)',
  '--uxv1-pink-md': 'var(--ux-pink-line)',
};

/** The shadows and halos carry the accent with an alpha: written with color-mix on the accent token, per theme. */
const SHADOW_VARS: Readonly<Record<'light' | 'dark', Readonly<Record<string, string>>>> = {
  light: {
    '--shadow-lift': '0 8px 24px color-mix(in srgb, var(--ux-pink) 10%, transparent), 0 2px 8px rgba(0,0,0,0.06)',
    '--halo': 'color-mix(in srgb, var(--ux-pink) 10%, transparent)',
  },
  dark: {
    '--shadow-lift': '0 10px 30px rgba(0,0,0,0.5), 0 0 0 1px color-mix(in srgb, var(--ux-pink) 20%, transparent)',
    '--halo': 'color-mix(in srgb, var(--ux-pink) 22%, transparent)',
  },
};

// ---- a small CSS walker

interface Rule { readonly media: string; readonly selector: string; readonly decls: readonly { readonly prop: string; readonly value: string }[] }

const strip = (css: string): string => css.replace(/\/\*[\s\S]*?\*\//g, '');

function splitSelectors(s: string): string[] {
  const out: string[] = [];
  let depth = 0, cur = '';
  for (const ch of s) {
    if (ch === '(' || ch === '[') depth++;
    if (ch === ')' || ch === ']') depth--;
    if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = ''; } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

function splitDecls(body: string): { prop: string; value: string }[] {
  const out: { prop: string; value: string }[] = [];
  let depth = 0, cur = '';
  const push = (): void => {
    const k = cur.indexOf(':');
    if (k > 0) out.push({ prop: cur.slice(0, k).trim(), value: cur.slice(k + 1).trim() });
    cur = '';
  };
  for (const ch of body) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ';' && depth === 0) push(); else cur += ch;
  }
  push();
  return out;
}

/** Every style rule of a sheet, with the @media or @supports it sits in. @keyframes and @font-face are skipped. */
export function rulesOf(css: string): Rule[] {
  const out: Rule[] = [];
  const walk = (s: string, media: string): void => {
    let i = 0, start = 0;
    while (i < s.length) {
      const ch = s[i];
      if (ch === ';') start = i + 1;
      if (ch === '{') {
        const prelude = s.slice(start, i).trim();
        let depth = 1, j = i + 1;
        while (j < s.length && depth > 0) { if (s[j] === '{') depth++; if (s[j] === '}') depth--; j++; }
        const body = s.slice(i + 1, j - 1);
        if (prelude.startsWith('@')) {
          if (/^@(media|supports|layer)/.test(prelude)) walk(body, media ? `${media} ${prelude}` : prelude);
        } else {
          for (const selector of splitSelectors(prelude)) out.push({ media, selector, decls: splitDecls(body) });
        }
        i = j;
        start = j;
        continue;
      }
      i++;
    }
  };
  walk(strip(css), '');
  return out;
}

/** A selector of the root token blocks, whose custom properties LEGACY_VARS and the tokens of tokens.css replace. */
const ROOT_SELECTOR = /^(?::root(?::not\(\.light\))?|\.dark|html\.ux-v1(?:\.dark|:not\(\.light\))?|\.ux-theme-(?:light|dark)|html\.ux-v1\.dark)$/;
const isRootBlock = (selector: string): boolean => ROOT_SELECTOR.test(selector);

/** The anime scope of a shared selector: dark selectors keep their dark class. */
export function scoped(selector: string): string {
  if (/^html\.ux-v1\.dark(?![\w-])/.test(selector)) return selector.replace(/^html\.ux-v1\.dark/, SCOPE_DARK);
  if (/^html\.ux-v1(?![\w-])/.test(selector)) return selector.replace(/^html\.ux-v1/, SCOPE);
  if (/^\.dark(?![\w-])/.test(selector)) return selector.replace(/^\.dark/, SCOPE_DARK);
  return `${SCOPE} ${selector}`;
}

export interface PinkDeclaration { readonly source: string; readonly media: string; readonly selector: string; readonly prop: string; readonly value: string }

/** The pink custom properties of the root blocks of the shared sheets (the names LEGACY_VARS, SHADOW_VARS and tokens.css must replace). */
export function rootPinkProps(sources: readonly CssSource[]): string[] {
  const names = new Set<string>();
  for (const src of sources) for (const r of rulesOf(src.css)) {
    if (!isRootBlock(r.selector)) continue;
    for (const d of r.decls) if (d.prop.startsWith('--') && pinksIn(d.value).length > 0) names.add(d.prop);
  }
  return [...names].sort();
}

/** The pink declarations of the shared rules that are not root blocks. */
export function pinkDeclarations(sources: readonly CssSource[]): PinkDeclaration[] {
  const out: PinkDeclaration[] = [];
  for (const src of sources) for (const r of rulesOf(src.css)) {
    if (isRootBlock(r.selector)) continue;
    for (const d of r.decls) if (pinksIn(d.value).length > 0) out.push({ source: src.name, media: r.media, selector: r.selector, prop: d.prop, value: d.value });
  }
  return out;
}

const HEADER = `/* Run O1, owner order of 2026-10-26: no pink on bunnyverse.org/anime. GENERATED by lib/site/anime-legacy-pink.ts from styles/globals.css, styles/ux-v1 and
   styles/ux-v12 (a test regenerates it and compares; to change it, change that module and write its output here). The shared sheets keep their kpop
   pinks, so kpopquiz.org reads the same bytes; this sheet is appended on the anime build only, after tokens.css. Part 1 sets the legacy custom
   properties (--brand and the others) from the --ux accent tokens, which follow the light and the dark theme. Part 2 repeats each declaration of a
   shared rule that holds a pink colour, under the anime scope, with the hue turned to orange. */
`;

/** The whole of styles/sites/anime/legacy.css. */
export function legacySheet(sources: readonly CssSource[]): string {
  const names = rootPinkProps(sources);
  const known = new Set([...Object.keys(LEGACY_VARS), ...Object.keys(SHADOW_VARS.light), ...Object.keys(SHADOW_VARS.dark)]);
  const missing = names.filter((n) => !known.has(n) && !n.startsWith('--ux-'));
  if (missing.length > 0) throw new Error(`pink custom properties of the shared sheets with no replacement: ${missing.join(', ')}`);
  const lines: string[] = [HEADER];
  const vars = Object.entries(LEGACY_VARS).map(([k, v]) => `${k}: ${v};`).join(' ');
  lines.push(`${SCOPE} {\n  ${vars}\n  ${Object.entries(SHADOW_VARS.light).map(([k, v]) => `${k}: ${v};`).join('\n  ')}\n}\n`);
  const dark = Object.entries(SHADOW_VARS.dark).map(([k, v]) => `${k}: ${v};`).join('\n  ');
  lines.push(`${SCOPE_DARK} {\n  ${dark}\n}\n`);
  lines.push(`@media (prefers-color-scheme: dark) {\n  ${SCOPE}:not(.light) {\n    ${dark.replace(/\n {2}/g, '\n    ')}\n  }\n}\n`);
  // Part 2, grouped by media, in the order of the sources.
  const seen = new Set<string>();
  const byMedia = new Map<string, string[]>();
  for (const d of pinkDeclarations(sources)) {
    if (d.prop.startsWith('--ux-')) continue;
    const decl = `${d.prop}: ${orange(d.value)};`;
    const sel = scoped(d.selector);
    const key = `${d.media}|${sel}|${decl}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const list = byMedia.get(d.media) ?? [];
    list.push(`${sel} { ${decl} }`);
    byMedia.set(d.media, list);
  }
  for (const [media, rules] of byMedia) lines.push(media ? `${media} {\n${rules.map((r) => `  ${r}`).join('\n')}\n}\n` : `${rules.join('\n')}\n`);
  return lines.join('\n');
}
