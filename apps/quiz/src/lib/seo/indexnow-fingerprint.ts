// SEO Mission 3, part A (2026-10-15): the content fingerprint of a page, for the nightly
// IndexNow reconciliation and the post-deploy diff. Pure (no network, no database), unit
// tested in indexnow-fingerprint.test.ts.
//
// A page is resubmitted only when what a search engine indexes changes: its title, meta
// description, H1, main content, robots directive or canonical. Never because of a play
// count, a score, a "2 hours ago" or a rotating card (rulebook section 11.2: volatile
// counters never trigger a submission). So the fingerprint reads:
//   - title, description, H1 and the text of <main> (the body when a page has no <main>);
//   - inside <main>, the text outside links, navigation, forms, buttons and the blocks that
//     change between two renders of the same content (hall of fame, rotating "Did you
//     know", counts line, avatars; VOLATILE_HINT below);
//   - every digit masked ("2,535 plays" and "2,536 plays" read the same), and relative
//     times removed;
//   - the robots directive (meta and X-Robots-Tag) and the canonical, unmasked.
// A change made only of digits is not seen here: data edits are caught by the database
// triggers (docs/pending-migrations/seo-indexnow.sql) and code edits by the post-deploy diff,
// which both enqueue without a fingerprint. This is the safety net, so it errs on the side of
// never resubmitting an unchanged page.
//
// Listing pages whose main content is a ranking that moves every hour (leaderboards, today's
// popular quizzes, trending) are fingerprinted on their head only (HEAD_ONLY_PATHS).

import { createHash } from 'node:crypto';

export interface PageSignals {
  title: string;
  description: string;
  h1: string;
  main: string;
  robots: string;
  canonical: string;
}

/** Elements whose text is not main content, or changes with every render. */
const SKIP_TAGS = new Set([
  'script', 'style', 'noscript', 'template', 'svg', 'iframe', 'canvas', 'video', 'audio',
  'a', 'nav', 'aside', 'header', 'footer', 'form', 'button', 'select', 'option', 'textarea', 'input', 'dialog',
]);

const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);

/**
 * Blocks that change between two renders of the same content, matched on their class, id or
 * aria label. Each one is named after what it shows on the live site (read 2026-10-15):
 *   p4-hof*, p4-hrow, p4-mine   the hall of fame of a quiz page (names, scores, times)
 *   p4-dyk                      "Did you know": one stored fact picked at random per render
 *   p4-counts                   "Pass rate 31% · 45 likes · 1 reaction · 1 comment"
 *   p4-author                   the creator line, with the creator's level title
 *   p1-qotd, p1-band            the quiz and the blindtest of the day on the home page
 *   g8-fp*, fans-picked         a hub's song ranking by fan votes
 *   pers-top                    "the most common results are ..." on Which member are you
 *   p6-board                    today's blindtest board
 *   ux-ava                      avatars (initials of the latest players)
 *   leaderboard, ticker, live   rankings and live activity strips
 *   data-volatile               any element a page marks itself
 */
const VOLATILE_HINT = /(?:^|[\s"'])(?:p4-hof[\w-]*|p4-hrow|p4-mine|p4-dyk|p4-counts|p4-author|p1-qotd|p1-band|g8-fp[\w-]*|fans-picked|pers-top|p6-board|ux-ava|leaderboard[\w-]*|ticker[\w-]*|live-[\w-]+|hall-of-fame)(?=$|[\s"'])|data-volatile/i;

/** Paths whose main content is a ranking that moves all day: their head is their fingerprint. */
const HEAD_ONLY_PATHS: ReadonlyArray<RegExp> = [
  /^\/(?:pt\/)?leaderboard(?:\/|$)/,
  /^\/trending$/,
  /^\/quizzes\/popular-(?:today|this-week|this-month)$/,
  /^\/most-liked$/,
  /^\/blindtest\/leaderboard(?:\/|$)/,
  /^\/(?:pt\/)?stats$/,
];

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'", '#x27': "'", '#x2F': '/' };

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+[0-9]*);/gi, (m, e: string) => {
    const lower = e.toLowerCase();
    if (lower in ENTITIES) return ENTITIES[lower]!;
    if (lower.startsWith('#x')) { const n = parseInt(lower.slice(2), 16); return Number.isFinite(n) ? String.fromCodePoint(n) : m; }
    if (lower.startsWith('#')) { const n = parseInt(lower.slice(1), 10); return Number.isFinite(n) ? String.fromCodePoint(n) : m; }
    return m;
  });
}

const collapse = (s: string): string => s.replace(/\s+/g, ' ').trim();

/**
 * Digits masked, relative times removed, the plural after a count dropped ("1 fan played",
 * "2 fans played" read the same), spaces collapsed: what is left cannot move by itself.
 */
export function maskVolatile(text: string): string {
  return collapse(
    text
      .replace(/\b(?:just now|an? (?:second|minute|hour|day|week|month|year) ago|yesterday|today)\b/gi, ' ')
      .replace(/\d+\s*(?:s|m|h|d|w|mo|y|secs?|seconds?|mins?|minutes?|hrs?|hours?|days?|weeks?|months?|years?)\s+ago\b/gi, ' ')
      .replace(/\d(?:[\d.,   ]*\d)?/g, '#')
      .replace(/#(\s*[+%]?\s*[A-Za-z]+?)s\b/g, '#$1'),
  );
}

/** Attributes of one tag, lowercased names: `<meta name="x" content="y">` gives { name, content }. */
export function parseAttrs(attrs: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of attrs.matchAll(/([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) {
    out[m[1]!.toLowerCase()] = decodeEntities(m[2] ?? m[3] ?? m[4] ?? '');
  }
  return out;
}

const TOKEN = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][\w:-]*)((?:\s+[^\s"'>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*(\/?)>|([^<]+)|</g;

/** Visible text of an HTML fragment, without the skipped and volatile elements. */
export function visibleText(html: string): string {
  const src = html
    .replace(/<script\b[\s\S]*?<\/script\s*>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style\s*>/gi, ' ')
    .replace(/<noscript\b[\s\S]*?<\/noscript\s*>/gi, ' ');
  const out: string[] = [];
  const stack: Array<{ name: string; skip: boolean }> = [];
  let skipping = 0;
  for (const m of src.matchAll(TOKEN)) {
    const [whole, slash, rawName, attrs, selfClose, text] = m;
    if (text !== undefined) { if (!skipping) out.push(text); continue; }
    if (!rawName) { if (whole === '<' && !skipping) out.push('<'); continue; } // a comment or a stray "<"
    const name = rawName.toLowerCase();
    if (slash) {
      let i = stack.length - 1;
      while (i >= 0 && stack[i]!.name !== name) i--;
      if (i < 0) continue;
      for (let j = stack.length - 1; j >= i; j--) if (stack[j]!.skip) skipping--;
      stack.length = i;
      out.push(' ');
      continue;
    }
    if (VOID_TAGS.has(name) || selfClose) { out.push(' '); continue; }
    const skip = SKIP_TAGS.has(name) || VOLATILE_HINT.test(attrs ?? '');
    stack.push({ name, skip });
    if (skip) skipping++;
    out.push(' ');
  }
  return collapse(decodeEntities(out.join('')));
}

function tagTexts(html: string, tag: string): string[] {
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}\\s*>`, 'gi');
  return [...html.matchAll(re)].map((m) => collapse(decodeEntities(m[1]!.replace(/<[^>]*>/g, ' '))));
}

/** The main region: <main>...</main>, else <body>...</body>, else the whole document. */
function mainRegion(html: string): string {
  const open = html.search(/<main\b/i);
  const close = html.toLowerCase().lastIndexOf('</main>');
  if (open >= 0 && close > open) return html.slice(open, close + 7);
  const b = html.search(/<body\b/i);
  const be = html.toLowerCase().lastIndexOf('</body>');
  if (b >= 0 && be > b) return html.slice(b, be + 7);
  return html;
}

function headOnly(path: string): boolean {
  return HEAD_ONLY_PATHS.some((re) => re.test(path));
}

/**
 * What a search engine indexes on a page, normalized. `path` decides head-only pages;
 * `xRobotsTag` is the response header, merged with the meta robots.
 */
export function extractSignals(html: string, path: string, xRobotsTag = ''): PageSignals {
  const headEnd = html.search(/<\/head\s*>/i);
  const head = headEnd > 0 ? html.slice(0, headEnd) : html;
  let description = '';
  const robots: string[] = [];
  for (const m of head.matchAll(/<meta\b([^>]*)>/gi)) {
    const a = parseAttrs(m[1] ?? '');
    const key = (a.name ?? '').toLowerCase();
    if (key === 'description' && !description) description = collapse(a.content ?? '');
    if (key === 'robots' || key === 'bingbot') robots.push((a.content ?? '').toLowerCase());
  }
  if (xRobotsTag) robots.push(xRobotsTag.toLowerCase());
  let canonical = '';
  for (const m of head.matchAll(/<link\b([^>]*)>/gi)) {
    const a = parseAttrs(m[1] ?? '');
    if ((a.rel ?? '').toLowerCase().split(/\s+/).includes('canonical')) { canonical = (a.href ?? '').trim(); break; }
  }
  const robotsTokens = [...new Set(robots.join(',').split(/[,\s]+/).map((t) => t.trim()).filter(Boolean))].sort();
  const body = headEnd > 0 ? html.slice(headEnd) : html;
  return {
    title: maskVolatile(tagTexts(head, 'title')[0] ?? ''),
    description: maskVolatile(description),
    h1: maskVolatile(tagTexts(body, 'h1').join(' | ')),
    main: headOnly(path) ? '' : maskVolatile(visibleText(mainRegion(body))),
    robots: robotsTokens.join(','),
    canonical,
  };
}

/** The fingerprint stored in seo_url_state.hash: sha256 of the signals, in a fixed order. */
export function fingerprint(s: PageSignals): string {
  const payload = JSON.stringify([s.title, s.description, s.h1, s.main, s.robots, s.canonical]);
  return createHash('sha256').update(payload).digest('hex');
}

const pathOf = (u: string): string => {
  try { return new URL(u).pathname.replace(/\/$/, '') || '/'; } catch { return u; }
};

/**
 * Indexable = answers 200, no noindex, and the canonical (when present) is the page itself.
 * A page that canonicalizes elsewhere, redirects, 404s or says noindex is not indexable:
 * when a page that was indexable stops being so, that is a removal to submit.
 */
export function isIndexable(status: number, s: PageSignals, url: string): boolean {
  if (status !== 200) return false;
  if (s.robots.split(',').some((t) => t === 'noindex' || t === 'none')) return false;
  if (s.canonical && pathOf(s.canonical) !== pathOf(url)) return false;
  return true;
}
