// Run O1, lane E1a: text helpers shared by the checks (normalization, word n-grams, similarity, scans).

const MARKS = /\p{M}/gu;
export const STOP = new Set(('a an the of in on at to for from by with and or but is are was were be been being it its this that these those ' +
  'as which who whom whose what when where why how do does did has have had not no yes can could will would should may might ' +
  'about into than then there their they them he she his her him we you your our us i me my also very more most one ' +
  'true false').split(' '));

/** Lowercase, no accents, apostrophes removed, everything that is not a letter or digit becomes a space. */
export function normalize(s) {
  return String(s ?? '')
    .normalize('NFKD').replace(MARKS, '')
    .toLowerCase()
    .replace(/['\u{2018}\u{2019}\u{2bc}`]s\b/gu, '')
    .replace(/['\u{2018}\u{2019}\u{2bc}`]/gu, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}
export const words = (s) => { const n = normalize(s); return n === '' ? [] : n.split(' '); };
export const contentWords = (s) => words(s).filter((w) => !STOP.has(w) && (w.length >= 3 || /^[0-9]+$/.test(w)));

export function ngrams(ws, n) {
  const out = new Set();
  for (let i = 0; i + n <= ws.length; i += 1) out.add(ws.slice(i, i + n).join(' '));
  return out;
}

/** Share of the n-grams of `cand` found in `src` (0 when cand has fewer than n words). */
export function containment(cand, src, n) {
  const a = ngrams(cand, n);
  if (a.size === 0) return 0;
  const b = ngrams(src, n);
  let hit = 0;
  for (const g of a) if (b.has(g)) hit += 1;
  return hit / a.size;
}

/** Longest run of consecutive words that both texts share. */
export function longestRun(a, b) {
  let best = 0;
  let prev = new Array(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i += 1) {
    const cur = new Array(b.length + 1).fill(0);
    for (let j = 1; j <= b.length; j += 1) {
      if (a[i - 1] === b[j - 1]) { cur[j] = prev[j - 1] + 1; if (cur[j] > best) best = cur[j]; }
    }
    prev = cur;
  }
  return best;
}

export function jaccard(a, b) {
  const sa = new Set(a); const sb = new Set(b);
  if (sa.size === 0 && sb.size === 0) return 1;
  let inter = 0;
  for (const x of sa) if (sb.has(x)) inter += 1;
  return inter / (sa.size + sb.size - inter);
}

/** Dice score over character trigrams of two normalized strings. */
export function diceTrigrams(a, b) {
  const grams = (s) => { const p = `  ${s} `; const m = new Map(); for (let i = 0; i + 3 <= p.length; i += 1) { const g = p.slice(i, i + 3); m.set(g, (m.get(g) ?? 0) + 1); } return m; };
  const ga = grams(a); const gb = grams(b);
  let inter = 0; let total = 0;
  for (const [g, c] of ga) { total += c; inter += Math.min(c, gb.get(g) ?? 0); }
  for (const c of gb.values()) total += c;
  return total === 0 ? 0 : (2 * inter) / total;
}

// Dashes: hyphen-like characters other than the plain hyphen, written as escapes so this file holds none itself.
export const DASH_RE = /[\u{2012}\u{2013}\u{2014}\u{2015}\u{2212}\u{2e3a}\u{2e3b}\u{fe58}\u{fe63}\u{ff0d}]|--/u;
export const EMOJI_RE = /[\p{Extended_Pictographic}\p{Regional_Indicator}\u{fe0f}\u{200d}\u{20e3}\u{e0020}-\u{e007f}]/u;

/** Calls fn(value, path, key) for every string of a JSON value; path is a JSON pointer. */
export function walkStrings(value, fn, path = '', key = '') {
  if (typeof value === 'string') { fn(value, path, key); return; }
  if (Array.isArray(value)) { value.forEach((v, i) => walkStrings(v, fn, `${path}/${i}`, key)); return; }
  if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) walkStrings(v, fn, `${path}/${k}`, k);
}

/** Calls fn(key, path) for every object key of a JSON value. */
export function walkKeys(value, fn, path = '') {
  if (Array.isArray(value)) { value.forEach((v, i) => walkKeys(v, fn, `${path}/${i}`)); return; }
  if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) { fn(k, `${path}/${k}`); walkKeys(v, fn, `${path}/${k}`); }
}

const mentionCache = new Map();
/** True when the text names the name: same case, whole word (names such as Near or Light are common words in lower case). */
export function mentions(text, name) {
  if (typeof text !== 'string' || typeof name !== 'string' || name.trim().length < 3) return false;
  let re = mentionCache.get(name);
  if (!re) {
    const body = name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    re = new RegExp(`(?<![\\p{L}\\p{N}])${body}(?![\\p{L}\\p{N}])`, 'u');
    mentionCache.set(name, re);
  }
  return re.test(text);
}

export function hostOf(url) {
  try { return new URL(url).hostname.toLowerCase(); } catch { return ''; }
}
export const hostIs = (host, domain) => host === domain || host.endsWith(`.${domain}`);
export const looksLikeUrl = (s) => /^https?:\/\//i.test(s);

/** Quoted segments: "x", curly double quotes, guillemets and Japanese corner brackets. */
export function quotedSegments(text) {
  const out = [];
  const re = /"([^"]+)"|\u{201c}([^\u{201d}]+)\u{201d}|\u{ab}([^\u{bb}]+)\u{bb}|\u{300c}([^\u{300d}]+)\u{300d}/gu;
  let m;
  while ((m = re.exec(text)) !== null) out.push((m[1] ?? m[2] ?? m[3] ?? m[4]).trim());
  return out;
}

/** A coarse shape class of a short answer, used to compare options. */
export function shapeOf(s) {
  const t = String(s).trim();
  if (/^(?:19|20|21)[0-9]{2}$/.test(t)) return 'year';
  if (/^[0-9][0-9,.]*$/.test(t)) return 'number';
  const ws = t.split(/\s+/);
  if (ws.every((w) => /^\p{Lu}/u.test(w) || /^(of|the|no|de|and|to|wa|ga|and|in|on|a)$/i.test(w) || /^[0-9]/.test(w))) return 'name';
  return 'phrase';
}

// Seeded random numbers for the review sample.
export function hash32(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function rng(seedStr) {
  let a = hash32(seedStr) || 1;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
