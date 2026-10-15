// SEO Mission 3, part B: the pure checks of the nightly production crawl
// (scripts/seo-prod-crawl.mts). No I/O here: every function takes HTML, text or URLs and
// returns findings, so each rule is unit tested (prod-crawl.test.ts). The app never imports
// this module; only the crawler does.
//
// Rulebook: .claude/skills/kpopquiz-seo/SKILL.md, sections 2 (titles, descriptions, H1),
// 4 (numbers, see prod-crawl-counts.ts), 6.5 (alt), 7 (JSON-LD), 9 (indexing, redirects).

/** Rulebook 2.2: 60 characters or fewer, the " | KpopQuiz" suffix included. */
export const TITLE_MAX_RENDERED = 60;
/** Rulebook 2.3: 120 to 160 characters. */
export const DESCRIPTION_MIN_RENDERED = 120;
export const DESCRIPTION_MAX_RENDERED = 160;

// ---- HTML basics -----------------------------------------------------------------------

const NAMED_ENTITIES: Readonly<Record<string, string>> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', mdash: '\u2014', ndash: '\u2013',
  hellip: '\u2026', rsquo: '\u2019', lsquo: '\u2018', ldquo: '\u201c', rdquo: '\u201d', middot: '\u00b7',
  copy: '\u00a9', reg: '\u00ae', trade: '\u2122', eacute: '\u00e9', egrave: '\u00e8', aacute: '\u00e1',
  oacute: '\u00f3', iacute: '\u00ed', uacute: '\u00fa', atilde: '\u00e3', otilde: '\u00f5', ccedil: '\u00e7',
  ecirc: '\u00ea', ocirc: '\u00f4', acirc: '\u00e2', agrave: '\u00e0', ntilde: '\u00f1', times: '\u00d7',
};

/** Decode the HTML entities a server render emits (named subset, decimal, hex). */
export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, body: string) => {
    if (body[0] === '#') {
      const code = body[1] === 'x' || body[1] === 'X' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : m;
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? m;
  });
}

const collapse = (s: string): string => s.replace(/\s+/g, ' ').trim();

/** Characters as a reader counts them (code points, not UTF-16 units). */
export const charLength = (s: string): number => [...s].length;

/**
 * The HTML a reader can see: no <head>, comments, scripts, styles, noscript or template.
 * Streamed Suspense content (`<div hidden id="S:0">`) is KEPT: the page moves it into place
 * on load, so it is what readers and rendering crawlers see.
 */
export function stripNonVisible(html: string): string {
  return html
    .replace(/<head\b[\s\S]*?<\/head>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<template\b[\s\S]*?<\/template>/gi, ' ');
}

/** Visible text, decoded, whitespace collapsed. */
export function visibleText(html: string): string {
  return collapse(decodeEntities(stripNonVisible(html).replace(/<[^>]+>/g, ' ')));
}

/** The value of one attribute in one tag, decoded, or null. */
export function attr(tag: string, name: string): string | null {
  const m = new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(tag);
  if (!m) return new RegExp(`\\s${name}(?=[\\s/>])`, 'i').test(tag) ? '' : null; // a bare attribute is an empty value
  return decodeEntities(m[1] ?? m[2] ?? m[3] ?? '');
}

/** The document title (an SVG <title> is never it). */
export function extractTitle(html: string): string {
  const noSvg = html.replace(/<svg\b[\s\S]*?<\/svg>/gi, ' ');
  const m = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(noSvg);
  return m ? collapse(decodeEntities(m[1]!)) : '';
}

function metaContent(html: string, name: string): string | null {
  for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = m[0];
    if ((attr(tag, 'name') ?? '').toLowerCase() === name) return collapse(attr(tag, 'content') ?? '');
  }
  return null;
}

export const extractMetaDescription = (html: string): string => metaContent(html, 'description') ?? '';

/** Every robots directive the page states (meta robots, googlebot, bingbot), joined. */
export function extractMetaRobots(html: string): string {
  return ['robots', 'googlebot', 'bingbot'].map((n) => metaContent(html, n) ?? '').filter(Boolean).join(', ');
}

export function extractCanonical(html: string): string {
  for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
    if ((attr(m[0], 'rel') ?? '').toLowerCase() === 'canonical') return attr(m[0], 'href') ?? '';
  }
  return '';
}

/** True when the meta robots or the X-Robots-Tag header says noindex (or none). */
export function isNoindex(metaRobots: string, xRobotsTag: string): boolean {
  return /\b(noindex|none)\b/i.test(metaRobots) || /\b(noindex|none)\b/i.test(xRobotsTag);
}

// ---- titles, descriptions, headings, images, dashes ------------------------------------

export function titleProblem(title: string): string | null {
  if (!title) return 'no <title>';
  const n = charLength(title);
  return n > TITLE_MAX_RENDERED ? `title is ${n} characters, over ${TITLE_MAX_RENDERED} with the suffix: "${title}"` : null;
}

export function descriptionProblem(description: string): string | null {
  if (!description) return 'no meta description';
  const n = charLength(description);
  if (n < DESCRIPTION_MIN_RENDERED) return `meta description is ${n} characters, under ${DESCRIPTION_MIN_RENDERED}: "${description}"`;
  if (n > DESCRIPTION_MAX_RENDERED) return `meta description is ${n} characters, over ${DESCRIPTION_MAX_RENDERED}: "${description}"`;
  return null;
}

/** Values shared by two or more keys: [value, keys][] (empty values ignored). */
export function duplicates(byKey: ReadonlyMap<string, string>): Array<[string, string[]]> {
  const groups = new Map<string, string[]>();
  for (const [key, value] of byKey) {
    if (!value) continue;
    groups.set(value, [...(groups.get(value) ?? []), key]);
  }
  return [...groups.entries()].filter(([, keys]) => keys.length > 1);
}

export function countH1(html: string): number {
  return (stripNonVisible(html).match(/<h1\b/gi) ?? []).length;
}

/** Every <img> with no alt attribute at all (alt="" is the decorative case, and fine). */
export function imagesWithoutAlt(html: string): string[] {
  const out: string[] = [];
  for (const m of stripNonVisible(html).matchAll(/<img\b[^>]*>/gi)) {
    if (attr(m[0], 'alt') === null) out.push(attr(m[0], 'src') ?? m[0].slice(0, 120));
  }
  return out;
}

const DASH_RE = /[\u2013\u2014]/g;

/** Each em or en dash with its surrounding words, so the owner can find it on the page. */
export function dashSnippets(text: string, radius = 40): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(DASH_RE)) {
    const i = m.index ?? 0;
    const name = m[0] === '\u2014' ? 'em dash' : 'en dash';
    out.push(`${name} in "${text.slice(Math.max(0, i - radius), i + radius + 1).replace(DASH_RE, (d) => (d === '\u2014' ? '[EM]' : '[EN]'))}"`);
  }
  return out;
}

/** The alt texts of a page (rulebook: no dashes in alt either). */
export function altTexts(html: string): string[] {
  const out: string[] = [];
  for (const m of stripNonVisible(html).matchAll(/<img\b[^>]*>/gi)) {
    const a = attr(m[0], 'alt');
    if (a) out.push(a);
  }
  return out;
}

// ---- noindex allowlist (rulebook 9.2) --------------------------------------------------

/**
 * The noindex allowlist of the rulebook, as path rules. "Profiles under the threshold" and
 * "unreviewed translations" are allowed by path because the threshold and the review flag
 * are not visible from outside; "empty hubs" needs a data check, so it is returned as
 * 'empty-hub?' and the crawler confirms it in the database.
 */
const NOINDEX_ALLOWED: ReadonlyArray<readonly [RegExp, string]> = [
  [/^\/search(\/|$)/, 'search'],
  [/^\/(create|build)(\/|$)/, 'create'],
  [/^\/(login|signup|register|logout|forgot-password|reset-password)(\/|$)/, 'login'],
  [/^\/auth(\/|$)/, 'auth'],
  [/^\/(profile|u|me|notifications)(\/|$)/, 'profile'],
  [/^\/settings(\/|$)/, 'settings'],
  [/^\/onboarding(\/|$)/, 'onboarding'],
  [/^\/admin(\/|$)/, 'admin'],
  [/^\/embed(\/|$)/, 'embed'],
  [/^\/(leaderboard|daily\/[^/]+\/leaderboard)(\/|$)/, 'daily leaderboard'],
  [/^\/(pt|id|es|fr|de|ja|ko|th|vi|tl|ms)(\/|$)/, 'translation'],
];

/**
 * Noindex pages kept on purpose with a written reason (rulebook 9.2: "any other noindex needs
 * a written reason"). Add a row here, with the reason, in the PR that decides it.
 */
export const DOCUMENTED_NOINDEX: ReadonlyArray<{ pattern: RegExp; reason: string }> = [];

export type NoindexVerdict = { allowed: true; why: string } | { allowed: false; hub?: { kind: 'quiz' | 'blindtest'; slug: string } };

export function noindexVerdict(path: string, query = ''): NoindexVerdict {
  if (query) return { allowed: true, why: 'parameter variant (unbounded facet)' };
  for (const [re, why] of NOINDEX_ALLOWED) if (re.test(path)) return { allowed: true, why };
  for (const d of DOCUMENTED_NOINDEX) if (d.pattern.test(path)) return { allowed: true, why: d.reason };
  const quizHub = /^\/([a-z0-9]+(?:-[a-z0-9]+)*)-quiz$/.exec(path);
  if (quizHub) return { allowed: false, hub: { kind: 'quiz', slug: quizHub[1]! } };
  const btHub = /^\/blindtest\/group-([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(path);
  if (btHub) return { allowed: false, hub: { kind: 'blindtest', slug: btHub[1]! } };
  return { allowed: false };
}

// ---- redirects (rulebook 9.4) ----------------------------------------------------------

export interface Hop { url: string; status: number; location: string | null }

/** Browse hubs a removed specific page must not be dumped on. */
export const GENERIC_PAGES: ReadonlySet<string> = new Set([
  '/', '/quizzes', '/groups', '/articles', '/trivia', '/blindtest', '/new', '/trending', '/most-liked',
  '/leaderboard', '/search', '/data', '/news', '/pt', '/pt/quizzes',
]);

const pathOfUrl = (u: string): string => {
  try { return new URL(u).pathname.replace(/\/+$/, '') || '/'; } catch { return u; }
};
const depth = (p: string): number => p.split('/').filter(Boolean).length;

/**
 * A redirect lands on a generic page instead of an exact successor when the target is the
 * home page (from any other path), or a browse hub reached from a specific page (two or more
 * path segments, or an identifying query such as ?quiz=). A one-segment hub moving to
 * another hub (/games to /quizzes, /blind-test to /blindtest) is a rename, not a dump.
 */
export function isGenericRedirect(fromUrl: string, toUrl: string): boolean {
  const from = new URL(fromUrl);
  const to = new URL(toUrl);
  const fromPath = from.pathname.replace(/\/+$/, '') || '/';
  const toPath = to.pathname.replace(/\/+$/, '') || '/';
  if (fromPath === toPath) return false; // host or scheme change only
  if (toPath === '/') return true;
  if (!GENERIC_PAGES.has(toPath)) return false;
  return depth(fromPath) >= 2 || from.search.length > 1;
}

export type RedirectVerdict =
  | { kind: 'none' }
  | { kind: 'ok'; to: string; status: number }
  | { kind: 'chain'; hops: number; to: string }
  | { kind: 'generic'; to: string }
  | { kind: 'loop' }
  | { kind: 'unfinished' };

/** Grade a manual redirect walk: hops[0] is the requested URL, the last hop the answer. */
export function classifyRedirect(hops: readonly Hop[]): RedirectVerdict {
  if (hops.length === 0 || hops[0]!.status < 300 || hops[0]!.status >= 400) return { kind: 'none' };
  const seen = new Set<string>();
  for (const h of hops) {
    if (seen.has(h.url)) return { kind: 'loop' };
    seen.add(h.url);
  }
  const last = hops[hops.length - 1]!;
  if (last.status >= 300 && last.status < 400) return { kind: 'unfinished' };
  const redirects = hops.length - 1;
  if (redirects > 1) return { kind: 'chain', hops: redirects, to: last.url };
  if (isGenericRedirect(hops[0]!.url, last.url)) return { kind: 'generic', to: last.url };
  return { kind: 'ok', to: last.url, status: hops[0]!.status };
}

/**
 * Legacy URLs whose answer the code defines, checked on production every night. Each is a
 * single permanent redirect to its exact successor, or a 410/404 when it has none
 * (next.config.ts redirects, middleware.ts, lib/seo/legacy-urls.ts, LIVE-CHECK-2026-10.md).
 * `probe: true` rows only assert "not a chain, not dumped on a generic page".
 */
export interface RedirectSeed { path: string; to?: string; status?: 404 | 410 | 200; probe?: boolean; flagsProbe?: boolean; why: string }

export const REDIRECT_SEEDS: ReadonlyArray<RedirectSeed> = [
  { path: '/group/bts', to: '/bts-quiz', why: 'next.config /group/:slug' },
  { path: '/how-well-do-you-know-bts', to: '/bts-quiz', why: 'next.config legacy hub URL' },
  { path: '/coer-quiz', to: '/cortis-quiz', why: 'next.config fandom slug' },
  { path: '/ranks', to: '/leaderboard', why: 'next.config nav unification' },
  { path: '/blind-test', to: '/blindtest', why: 'middleware consolidation' },
  { path: '/blind-test/group-bts', to: '/blindtest/group-bts', why: 'middleware consolidation keeps the path' },
  { path: '/rankings/bts/members', to: '/bts-quiz', why: 'next.config group ranking to its hub' },
  { path: '/games/name-all/name-all-aespa', to: '/aespa-name-all-members', why: 'legacy-urls.ts (V12 on)' },
  { path: '/games/name-all/name-top-10-bts-songs', status: 410, why: 'legacy-urls.ts: no successor' },
  { path: '/battle?quiz=illit-quiz', to: '/q/illit-quiz', why: 'legacy-urls.ts: the quiz itself' },
  { path: '/bts-name-all-members', status: 200, flagsProbe: true, why: 'V12 pretty URL: 200 only when production runs NEXT_PUBLIC_UX_V12=1' },
  { path: '/games/sort-it', probe: true, why: 'REFONTE P1 game URL' },
  { path: '/tier-list/new', probe: true, why: 'REFONTE P1 tier list maker' },
  { path: '/zz-seo-nightly-probe-not-a-page', status: 404, why: 'rulebook 9.3: a missing page is a real 404' },
];

// ---- robots.txt --------------------------------------------------------------------------

/** The Disallow prefixes of the `User-agent: *` group. */
export function robotsDisallows(txt: string): string[] {
  const out: string[] = [];
  let inStar = false;
  let sawRule = false;
  for (const raw of txt.split('\n')) {
    const line = raw.replace(/#.*/, '').trim();
    if (!line) continue;
    const [k, ...rest] = line.split(':');
    const key = k!.trim().toLowerCase();
    const value = rest.join(':').trim();
    if (key === 'user-agent') {
      if (sawRule) { inStar = false; sawRule = false; }
      if (value === '*') inStar = true;
    } else {
      sawRule = true;
      if (inStar && key === 'disallow' && value) out.push(value);
    }
  }
  return out;
}

export const isDisallowed = (path: string, disallows: readonly string[]): boolean => disallows.some((d) => path.startsWith(d));

// ---- links, route types, sampling ---------------------------------------------------------

/** Same-site page links in served HTML, as absolute canonical-host URLs without hash. */
export function internalLinks(html: string, origin: string): string[] {
  const out = new Set<string>();
  const host = new URL(origin).host.replace(/^www\./, '');
  for (const m of stripNonVisible(html).matchAll(/<a\b[^>]*>/gi)) {
    const href = attr(m[0], 'href');
    if (!href || href.startsWith('#') || /^(mailto|tel|javascript|data):/i.test(href)) continue;
    let u: URL;
    try { u = new URL(href, origin); } catch { continue; }
    if (!/^https?:$/.test(u.protocol) || u.host.replace(/^www\./, '') !== host) continue;
    if (/\.(png|jpe?g|gif|webp|avif|svg|ico|txt|xml|json|pdf|css|js|mp3|mp4)$/i.test(u.pathname)) continue;
    u.hash = '';
    out.add(`${origin}${u.pathname.replace(/\/+$/, '') || '/'}${u.search}`);
  }
  return [...out];
}

/** Coarse template of a path, so a small sample covers every template once. */
export function routeType(path: string): string {
  if (path === '/') return 'home';
  const first = path.split('/')[1] ?? '';
  if (/^(q|blindtest|articles|data|quizzes|pt|id|es|fr|verse)$/.test(first)) return path.split('/').length > 2 ? `${first}/*` : first;
  if (/-quiz$/.test(first)) return 'group-quiz';
  if (/-trivia$/.test(first)) return 'group-trivia';
  if (/-name-all-members$/.test(first)) return 'name-all';
  if (/^which-.+-member-are-you$/.test(first)) return 'which-member';
  return 'static';
}

/**
 * Up to `limit` paths: one per template first (in sitemap order), then evenly spread over
 * the rest, so a 30-URL run touches every template instead of the first 30 quizzes.
 */
export function samplePaths(paths: readonly string[], limit: number): string[] {
  if (limit >= paths.length) return [...paths];
  const firstOfType = new Map<string, string>();
  for (const p of paths) if (!firstOfType.has(routeType(p))) firstOfType.set(routeType(p), p);
  const picked = [...firstOfType.values()].slice(0, limit);
  const chosen = new Set(picked);
  const rest = paths.filter((p) => !chosen.has(p));
  const room = limit - picked.length;
  if (room > 0) {
    const stride = rest.length / room;
    for (let i = 0; i < room; i++) picked.push(rest[Math.floor(i * stride)]!);
  }
  return picked;
}

export const sitemapLocs = (xml: string): string[] => [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => decodeEntities(m[1]!));

/** Canonical equality: same origin and path, trailing slash ignored, no query. */
export function sameUrl(a: string, b: string): boolean {
  try {
    const x = new URL(a);
    const y = new URL(b);
    return x.origin === y.origin && pathOfUrl(a) === pathOfUrl(b) && x.search === y.search;
  } catch {
    return false;
  }
}

// ---- JSON-LD (rulebook 7: parses, and equals the visible text) ---------------------------

export interface JsonLdParse { nodes: Array<Record<string, unknown>>; errors: string[]; raw: string[] }

export function parseJsonLd(html: string): JsonLdParse {
  const out: JsonLdParse = { nodes: [], errors: [], raw: [] };
  for (const m of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    const body = m[1]!.trim();
    out.raw.push(body);
    if (!body) { out.errors.push('empty JSON-LD block'); continue; }
    let parsed: unknown;
    try { parsed = JSON.parse(body); } catch (e) { out.errors.push(`unparseable JSON-LD (${(e as Error).message}): ${body.slice(0, 80)}`); continue; }
    collectNodes(parsed, out.nodes);
  }
  return out;
}

function collectNodes(v: unknown, into: Array<Record<string, unknown>>): void {
  if (Array.isArray(v)) { for (const x of v) collectNodes(x, into); return; }
  if (!v || typeof v !== 'object') return;
  const o = v as Record<string, unknown>;
  if ('@type' in o) into.push(o);
  for (const [k, child] of Object.entries(o)) if (k !== '@context' && typeof child === 'object') collectNodes(child, into);
}

const typesOf = (n: Record<string, unknown>): string[] => (Array.isArray(n['@type']) ? (n['@type'] as unknown[]) : [n['@type']]).map(String);
const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null);

/** Types whose name or headline is the page's main title, and so must be visible. */
const MAIN_TYPES = new Set(['Article', 'NewsArticle', 'BlogPosting', 'Report', 'CollectionPage', 'Quiz', 'WebPage', 'Dataset', 'WebApplication', 'ItemList', 'MusicGroup', 'FAQPage', 'AboutPage', 'ProfilePage']);

export interface JsonLdClaim { where: string; text: string }

/** The JSON-LD strings that must be readable on the page itself. */
export function jsonLdVisibleClaims(nodes: ReadonlyArray<Record<string, unknown>>): JsonLdClaim[] {
  const out: JsonLdClaim[] = [];
  // The site navigation markup lists nav entries as WebPage nodes: graded as navigation
  // items, never as the page's own title.
  const navParts = new Set<unknown>();
  for (const n of nodes) if (typesOf(n).includes('SiteNavigationElement')) markNested(n.hasPart, navParts);
  for (const n of nodes) {
    const types = typesOf(n);
    if (navParts.has(n)) {
      const name = str(n.name);
      if (name) out.push({ where: 'navigation item', text: name });
    } else if (types.includes('Question')) {
      const q = str(n.name);
      if (q) out.push({ where: 'FAQ question', text: q });
      const a = n.acceptedAnswer as Record<string, unknown> | undefined;
      const at = a && str(a.text);
      if (at) out.push({ where: 'FAQ answer', text: at });
    } else if (types.includes('BreadcrumbList')) {
      for (const it of (n.itemListElement as unknown[] | undefined) ?? []) {
        const name = str((it as Record<string, unknown>)?.name);
        if (name) out.push({ where: 'breadcrumb', text: name });
      }
    } else if (types.includes('ListItem')) {
      const name = str(n.name);
      if (name && n.url !== undefined) out.push({ where: 'list item', text: name });
    } else if (types.some((t) => MAIN_TYPES.has(t))) {
      const h = str(n.headline);
      if (h) out.push({ where: `${types[0]} headline`, text: h });
      const name = str(n.name);
      if (name && name !== h) out.push({ where: `${types[0]} name`, text: name });
    }
  }
  return out;
}

/** Letters and digits only, lowercased: markup, spacing and punctuation never decide a match. */
export const alnumKey = (s: string): string => s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');

/** Claims that do not appear in the page's visible text (or its aria-labels and alts). */
export function jsonLdMismatches(claims: readonly JsonLdClaim[], visibleCorpus: string): JsonLdClaim[] {
  const hay = alnumKey(visibleCorpus);
  return claims.filter((c) => {
    const needle = alnumKey(c.text);
    return needle.length > 0 && !hay.includes(needle);
  });
}

/** Description strings of JSON-LD nodes (their numbers must also be on the page). */
export function jsonLdDescriptions(nodes: ReadonlyArray<Record<string, unknown>>): string[] {
  return nodes.map((n) => str(n.description)).filter((d): d is string => d !== null);
}

/** Every string value in the JSON-LD, joined, for the count check. */
export function jsonLdStrings(nodes: ReadonlyArray<Record<string, unknown>>): string {
  const out: string[] = [];
  const walk = (v: unknown, key: string): void => {
    if (typeof v === 'string') { if (!/^(@|url|item|image|logo|sameAs|email|datePublished|dateModified|startDate|endDate|uploadDate)/.test(key) && !/^https?:\/\//.test(v)) out.push(v); return; }
    if (Array.isArray(v)) { for (const x of v) walk(x, key); return; }
    if (v && typeof v === 'object') for (const [k, c] of Object.entries(v)) walk(c, k);
  };
  // Top-level nodes only: collectNodes also lists nested nodes, which would be read twice.
  const nested = new Set<unknown>();
  for (const n of nodes) for (const c of Object.values(n)) if (c && typeof c === 'object') markNested(c, nested);
  for (const n of nodes) if (!nested.has(n)) walk(n, '');
  return out.join(' | ');
}

function markNested(v: unknown, into: Set<unknown>): void {
  if (Array.isArray(v)) { for (const x of v) markNested(x, into); return; }
  if (!v || typeof v !== 'object') return;
  into.add(v);
  for (const c of Object.values(v as Record<string, unknown>)) markNested(c, into);
}

/** The aria-label values of a page (accessible names count as page text for JSON-LD). */
export function ariaLabels(html: string): string[] {
  const out: string[] = [];
  for (const m of stripNonVisible(html).matchAll(/<[a-z][^>]*\saria-label\s*=[^>]*>/gi)) {
    const v = attr(m[0], 'aria-label');
    if (v) out.push(v);
  }
  return out;
}
