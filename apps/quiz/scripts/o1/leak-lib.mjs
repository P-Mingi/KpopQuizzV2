// Run O1, lane Q0a: the pure core of the leak suite (apps/quiz/e2e/o1/leak/) and of check-network-links.mts.
// No dependency, no browser: every check reads the server HTML an anonymous visitor (or a crawler) receives.
//   analyzeHtml(html)        the layers a check reads: <html> attributes, title, meta, head links, anchors, JSON-LD,
//                            the decoded page data (React Flight) and the text layer.
//   checkLinks(...)          cross-site links against the allowlist (Q-bridges D0: never a cross-site link outside it,
//                            never `via` for an anonymous visitor, nofollow where the allowlist says so, and on
//                            otakuquiz.org no "kpopquiz.org" anywhere outside the allowlisted links; the mirror on kpop).
//   checkIdentity(...)       canonical, og:url, og:site_name, og:image, hreflang and JSON-LD urls per site (never a
//                            cross-domain canonical).
//   checkStrings(...)        P2 and its mirror: no K-pop marker on anime pages, no anime marker on kpop pages.
//   checkNoNetMe(...)        the server HTML never calls /api/n/me (the NetMe fetch is client-only, signed-in only).
//   checkForbidden(...)      a list of strings that must not appear in a layer (JSON-LD spoiler hook, content leak).
//   httpGet(...)             one anonymous GET (no cookie, no redirect follow) with node:http; *.localhost connects to
//                            127.0.0.1 and keeps the name in the Host header (Node on macOS may not resolve it).
// Every function returns plain data; a violation is { code, detail } with a short, deterministic detail.
import http from 'node:http';
import https from 'node:https';

/** @typedef {{ code: string, detail: string }} Violation */
/** @typedef {'kpop' | 'anime' | 'hub'} Site */
/**
 * @typedef {{ domains: Record<string, string>, brands: Record<string, string>, devHosts?: Record<string, string> }} Contract
 * @typedef {{ href: string, rel: string, text: string, raw: string, attrs: Record<string, string> }} Anchor
 * @typedef {{ htmlAttrs: Record<string, string>, title: string, metas: { key: string, content: string }[],
 *   headLinks: { rel: string, href: string, hreflang: string }[], anchors: Anchor[], jsonLd: string[], flight: string,
 *   markup: string, raw: string }} Analysis
 */

export const SITE_IDS = ['kpop', 'anime', 'hub'];

/** Contract values used when F0's registry is not importable (BACKLOG 5.1, frozen names). */
export const FALLBACK_CONTRACT = {
  source: 'fallback (BACKLOG 5.1)',
  domains: { kpop: 'kpopquiz.org', anime: 'otakuquiz.org', hub: 'fanquiz.org' },
  brands: { kpop: 'KpopQuiz', anime: 'OtakuQuiz', hub: 'FanQuiz' },
  devHosts: { kpop: 'kpop.localhost', anime: 'anime.localhost', hub: 'hub.localhost' },
};

// ---------------------------------------------------------------------------------------------------------------
// HTML layers

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
export function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') {
      const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

/**
 * Attributes of one start tag source (`<a href="x" rel=nofollow>`), names lowercased, values decoded.
 * @param {string} tagSrc
 * @returns {Record<string, string>}
 */
export function parseAttrs(tagSrc) {
  /** @type {Record<string, string>} */
  const out = {};
  const body = tagSrc.replace(/^<[a-zA-Z][\w:-]*/, '').replace(/\/?>$/, '');
  const re = /([^\s"'=<>`/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let m;
  while ((m = re.exec(body))) {
    const name = m[1].toLowerCase();
    if (name in out) continue;
    out[name] = decodeEntities(m[2] ?? m[3] ?? m[4] ?? '');
  }
  return out;
}

const RAW_TEXT = /<(script|style|template|noscript)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;

/** The string literals of the React Flight payload (self.__next_f.push([1,"..."])), decoded, joined. */
export function flightRows(html) {
  const out = [];
  const re = /self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g;
  let m;
  while ((m = re.exec(html))) {
    try {
      out.push(JSON.parse(m[1]));
    } catch {
      // A literal that is not JSON (never seen in Next 16 output): ignored rather than guessed.
    }
  }
  return out.join('');
}

/**
 * The page data a visitor's browser receives but the markup may not show yet (client props, metadata), minus what is
 * code and not copy: module reference rows (`<id>:I[...]`), hint rows (`:HL[`), and every /_next/ asset path.
 */
export function flightText(html) {
  return flightRows(html)
    .split('\n')
    .filter((row) => !/^[0-9a-f]+:(?:I|HL)\[/i.test(row))
    .join('\n')
    .replace(/\/_next\/[^\s"'\\,\])]*/g, '');
}

function stripTags(s) {
  return decodeEntities(s.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

const TEXT_ATTRS = ['title', 'alt', 'aria-label', 'placeholder', 'aria-description', 'label'];
const TEXT_META = /^(description|keywords|og:|twitter:|application-name|apple-mobile-web-app-title)/i;

/**
 * Every layer of a server HTML page. `anchors` keep their element source (`raw`) so a check can drop allowlisted
 * links from the text layer.
 * @param {string} html
 * @returns {Analysis}
 */
export function analyzeHtml(html) {
  const scripts = [];
  html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi, (m, attrs, body) => {
    scripts.push({ attrs: parseAttrs(`<script ${attrs}>`), body });
    return m;
  });
  const markup = html.replace(RAW_TEXT, ' ');
  const htmlTag = markup.match(/<html\b[^>]*>/i);
  const titleM = html.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i);
  const metas = [];
  const headLinks = [];
  for (const t of markup.match(/<(meta|link)\b[^>]*>/gi) || []) {
    const a = parseAttrs(t);
    if (/^<meta/i.test(t)) metas.push({ key: (a.property || a.name || a['http-equiv'] || '').toLowerCase(), content: a.content ?? '' });
    else headLinks.push({ rel: (a.rel || '').toLowerCase(), href: a.href ?? '', hreflang: a.hreflang ?? '' });
  }
  const anchors = [];
  const aRe = /<(a|area)\b[^>]*>(?:([\s\S]*?)<\/\1\s*>)?/gi;
  let m;
  while ((m = aRe.exec(markup))) {
    const open = m[0].match(/^<(?:a|area)\b[^>]*>/i)[0];
    const a = parseAttrs(open);
    if (!('href' in a)) continue;
    anchors.push({ href: a.href, rel: (a.rel || '').toLowerCase(), text: stripTags(m[2] || ''), raw: m[0], attrs: a });
  }
  const jsonLd = scripts.filter((s) => (s.attrs.type || '').toLowerCase() === 'application/ld+json').map((s) => s.body.trim());
  return {
    htmlAttrs: htmlTag ? parseAttrs(htmlTag[0]) : {},
    title: titleM ? stripTags(titleM[1]) : '',
    metas,
    headLinks,
    anchors,
    jsonLd,
    flight: flightText(html),
    markup,
    raw: html,
  };
}

/** The meta content of a key (`og:url`, `description`), first one. */
export function metaContent(an, key) {
  const hit = an.metas.find((x) => x.key === key.toLowerCase());
  return hit ? hit.content : null;
}

/**
 * The text a visitor or a crawler reads: visible markup text, content attributes, title, text metas, JSON-LD and the
 * page data. `dropRaw`: element sources removed first (the allowlisted cross-site anchors).
 * @param {Analysis} an
 * @param {string[]} [dropRaw]
 * @returns {string}
 */
export function textLayer(an, dropRaw = []) {
  let markup = an.markup;
  for (const r of dropRaw) markup = markup.split(r).join(' ');
  const parts = [an.title];
  parts.push(stripTags(markup.replace(/<head\b[\s\S]*?<\/head\s*>/i, ' ')));
  for (const t of markup.match(/<[a-zA-Z][^>]*>/g) || []) {
    const a = parseAttrs(t);
    for (const k of TEXT_ATTRS) if (a[k]) parts.push(a[k]);
  }
  for (const x of an.metas) if (TEXT_META.test(x.key)) parts.push(x.content);
  parts.push(...an.jsonLd);
  let flight = an.flight;
  for (const r of dropRaw) {
    const a = parseAttrs((r.match(/^<(?:a|area)\b[^>]*>/i) || [''])[0]);
    if (a.href) flight = flight.split(a.href).join(' ');
    const text = stripTags(r);
    if (text) flight = flight.split(`"children":"${text}"`).join(' ');
  }
  parts.push(flight);
  return parts.filter(Boolean).join('\n');
}

// ---------------------------------------------------------------------------------------------------------------
// Sites and URLs

/** The site of a host: a production domain (www. allowed), a dev host, or null (outside the network). */
export function siteOfHost(host, contract = FALLBACK_CONTRACT) {
  const h = String(host || '').toLowerCase().replace(/:\d+$/, '').replace(/^www\./, '');
  for (const s of SITE_IDS) {
    if (h === contract.domains[s]) return s;
    if (contract.devHosts && h === contract.devHosts[s]) return s;
  }
  return null;
}

/**
 * Where a link goes, seen from a page of `site` served at `pageUrl`: 'self' (same origin or the site's own domain),
 * another SiteId, 'external', or 'none' (fragment, mailto, javascript, data).
 */
export function linkTarget(href, pageUrl, site, contract = FALLBACK_CONTRACT) {
  const h = String(href || '').trim();
  if (!h || h.startsWith('#') || /^(mailto|tel|javascript|data|blob):/i.test(h)) return { kind: 'none' };
  let u;
  try {
    u = new URL(h, pageUrl);
  } catch {
    return { kind: 'none' };
  }
  if (!/^https?:$/.test(u.protocol)) return { kind: 'none' };
  const page = new URL(pageUrl);
  if (u.host === page.host) return { kind: 'self', url: u };
  const s = siteOfHost(u.host, contract);
  if (s === site) return { kind: 'self', url: u };
  if (s) return { kind: 'site', site: s, url: u };
  return { kind: 'external', url: u };
}

/** Page pattern of the allowlist: '*' any page, '/x/**' the subtree, otherwise the exact path. */
export function pageMatches(pattern, path) {
  if (pattern === null || pattern === undefined) return false;
  if (pattern === '*') return true;
  if (pattern.endsWith('/**')) {
    const base = pattern.slice(0, -3);
    return path === base || path.startsWith(`${base}/`) || (base === '' && path.startsWith('/'));
  }
  return path === pattern;
}

function asList(v) {
  return Array.isArray(v) ? v : v === undefined || v === null ? [] : [v];
}

/** Allowlist entries that admit a link from (site, path) to (target, url). */
export function allowedBy(allowlist, site, path, target, url) {
  return (allowlist.links || []).filter(
    (e) =>
      asList(e.from).includes(site) &&
      asList(e.page).some((p) => pageMatches(p, path)) &&
      asList(e.to).includes(target) &&
      asList(e.href ?? '*').some((p) => pageMatches(p, url.pathname)),
  );
}

function short(s, n = 80) {
  const t = String(s).replace(/\s+/g, ' ');
  return t.length > n ? `${t.slice(0, n - 3)}...` : t;
}

/**
 * Cross-site links of one page. Returns { violations, allowed } where `allowed` lists the element sources of the
 * links the allowlist admits (the text layer drops them).
 * @param {{ site: Site, path: string, pageUrl: string, an: Analysis, allowlist: any, contract?: Contract, anonymous?: boolean }} args
 * @returns {{ violations: Violation[], allowed: string[] }}
 */
export function checkLinks({ site, path, pageUrl, an, allowlist, contract = FALLBACK_CONTRACT, anonymous = true }) {
  /** @type {Violation[]} */
  const violations = [];
  /** @type {string[]} */
  const allowed = [];
  const perEntry = new Map();
  for (const a of an.anchors) {
    const t = linkTarget(a.href, pageUrl, site, contract);
    if (t.kind !== 'site') continue;
    const where = `${t.site} ${t.url.host}${t.url.pathname}${t.url.search}`;
    if (anonymous && t.url.searchParams.has('via')) violations.push({ code: 'via-anonymous', detail: where });
    const entries = allowedBy(allowlist, site, path, t.site, t.url);
    if (entries.length === 0) {
      violations.push({ code: 'link-not-allowed', detail: `${where} "${short(a.text, 40)}"` });
      continue;
    }
    // maxPerPage counts per entry and target site. The first entry with room left takes the link; when every
    // matching entry is full, the first one reports it.
    const key = (x) => `${x.id}>${t.site}`;
    const e = entries.find((x) => typeof x.maxPerPage !== 'number' || (perEntry.get(key(x)) || 0) < x.maxPerPage) || entries[0];
    const rels = a.rel.split(/\s+/).filter(Boolean);
    if (e.rel === 'nofollow' && !rels.includes('nofollow')) violations.push({ code: 'link-needs-nofollow', detail: `${e.id}: ${where}` });
    if (e.rel === 'followed' && rels.includes('nofollow')) violations.push({ code: 'link-must-be-followed', detail: `${e.id}: ${where}` });
    if (e.query === false && t.url.search) violations.push({ code: 'link-has-query', detail: `${e.id}: ${where}` });
    const n = (perEntry.get(key(e)) || 0) + 1;
    perEntry.set(key(e), n);
    if (typeof e.maxPerPage === 'number' && n > e.maxPerPage) violations.push({ code: 'link-over-cap', detail: `${e.id} to ${t.site}: ${n} > ${e.maxPerPage}` });
    allowed.push(a.raw);
  }
  for (const l of an.headLinks) {
    if (!/\b(canonical|alternate)\b/.test(l.rel) || !l.href) continue;
    const t = linkTarget(l.href, pageUrl, site, contract);
    if (t.kind === 'site') violations.push({ code: 'head-link-cross-site', detail: `${l.rel} ${t.url.host}${t.url.pathname}` });
  }
  // The domain of the other world anywhere in the page (markup, metadata, JSON-LD, page data, scripts), once the
  // allowlisted links are removed: otakuquiz.org never says kpopquiz.org (Q-bridges D0), and the mirror on kpop.
  for (const other of asList((allowlist.domainText || {})[site])) {
    const domain = contract.domains[other];
    if (!domain) continue;
    let raw = an.raw;
    for (const r of allowed) {
      raw = raw.split(r).join(' ');
      const a = parseAttrs((r.match(/^<(?:a|area)\b[^>]*>/i) || [''])[0]);
      if (a.href) raw = raw.split(a.href).join(' ');
    }
    const re = new RegExp(`.{0,30}${domain.replace(/\./g, '\\.')}.{0,30}`, 'gi');
    const hits = raw.match(re) || [];
    if (hits.length) violations.push({ code: 'domain-in-html', detail: `${domain} x${hits.length}: ${short(hits[0], 70)}` });
  }
  return { violations, allowed };
}

function jsonLdUrls(blocks) {
  const out = [];
  const walk = (v, key) => {
    if (Array.isArray(v)) v.forEach((x) => walk(x, key));
    else if (v && typeof v === 'object') {
      for (const [k, x] of Object.entries(v)) {
        if (k === 'parentOrganization') continue; // the network parent (fanquiz.org) is allowed on every site
        walk(x, k);
      }
    } else if (typeof v === 'string' && /^(url|@id|sameAs|item|mainEntityOfPage)$/.test(key || '') && /^https?:\/\//.test(v)) out.push(v);
  };
  for (const b of blocks) {
    try {
      walk(JSON.parse(b), '');
    } catch {
      out.push('<invalid JSON-LD>');
    }
  }
  return out;
}

/**
 * Per-site identity of one page: canonical, og:url, hreflang (own domain only, never a cross-domain canonical),
 * og:site_name (the site's brand), og:image and twitter:image (own domain or Supabase storage, never another
 * network site), JSON-LD urls (never the other world's domain).
 */
/**
 * @param {{ site: Site, an: Analysis, contract?: Contract }} args
 * @returns {Violation[]}
 */
export function checkIdentity({ site, an, contract = FALLBACK_CONTRACT }) {
  /** @type {Violation[]} */
  const violations = [];
  const own = contract.domains[site];
  const hostOf = (u) => {
    try {
      return new URL(u).host.toLowerCase();
    } catch {
      return null;
    }
  };
  for (const l of an.headLinks) {
    if (!l.href) continue;
    if (l.rel.split(/\s+/).includes('canonical') || (l.rel.split(/\s+/).includes('alternate') && l.hreflang)) {
      const h = hostOf(l.href);
      const kind = l.rel.includes('canonical') ? 'canonical' : `hreflang ${l.hreflang}`;
      if (h !== own) violations.push({ code: h && siteOfHost(h, contract) ? 'cross-domain-canonical' : 'canonical-foreign-host', detail: `${kind} ${short(l.href, 70)}` });
    }
  }
  const ogUrl = metaContent(an, 'og:url');
  if (ogUrl !== null && hostOf(ogUrl) !== own) violations.push({ code: 'og-url-foreign', detail: short(ogUrl, 70) });
  const siteName = metaContent(an, 'og:site_name');
  if (siteName !== null && siteName !== contract.brands[site]) violations.push({ code: 'og-site-name', detail: `${siteName} (want ${contract.brands[site]})` });
  for (const key of ['og:image', 'twitter:image', 'og:image:secure_url']) {
    const v = metaContent(an, key);
    if (v === null) continue;
    const h = hostOf(v);
    if (h === null) continue; // relative: resolved on the own origin
    const s = siteOfHost(h, contract);
    if (s && s !== site) violations.push({ code: 'og-image-cross-site', detail: `${key} ${short(v, 70)}` });
    else if (!s && !/\.supabase\.co$/.test(h)) violations.push({ code: 'og-image-foreign-host', detail: `${key} ${short(v, 70)}` });
  }
  for (const u of jsonLdUrls(an.jsonLd)) {
    if (u === '<invalid JSON-LD>') {
      violations.push({ code: 'jsonld-invalid', detail: 'a JSON-LD block does not parse' });
      continue;
    }
    const s = siteOfHost(hostOf(u), contract);
    if (s && s !== site && s !== 'hub' && site !== 'hub') violations.push({ code: 'jsonld-cross-world', detail: short(u, 70) });
  }
  return violations;
}

/**
 * robots.txt Sitemap lines and sitemap.xml locs: own domain only.
 * @param {{ site: Site, path: string, body: string, contract?: Contract }} args
 * @returns {Violation[]}
 */
export function checkRootFile({ site, path, body, contract = FALLBACK_CONTRACT }) {
  const own = contract.domains[site];
  const urls =
    path === '/robots.txt'
      ? [...body.matchAll(/^\s*sitemap:\s*(\S+)/gim)].map((m) => m[1])
      : [...body.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => decodeEntities(m[1]));
  const bad = urls.filter((u) => {
    try {
      return new URL(u).host.toLowerCase() !== own;
    } catch {
      return true;
    }
  });
  return bad.length ? [{ code: 'root-file-foreign-url', detail: `${path}: ${bad.length} of ${urls.length}, first ${short(bad[0], 60)}` }] : [];
}

/**
 * Marker file entries -> RegExp list.
 * @param {{ id: string, re: string, flags?: string }[] | undefined} list
 * @returns {{ id: string, re: RegExp }[]}
 */
export function compileMarkers(list) {
  return (list || []).map((m) => ({ id: m.id, re: new RegExp(m.re, `${(m.flags || '').replace('g', '')}g`) }));
}

/**
 * P2 and its mirror on one page: every marker hit in the text layer, allowlisted links dropped.
 * @param {{ an: Analysis, markers: { id: string, re: RegExp }[], dropRaw?: string[] }} args
 * @returns {Violation[]}
 */
export function checkStrings({ an, markers, dropRaw = [] }) {
  const text = textLayer(an, dropRaw);
  /** @type {Violation[]} */
  const out = [];
  for (const m of markers) {
    m.re.lastIndex = 0;
    const hits = [...text.matchAll(m.re)];
    if (!hits.length) continue;
    const h = hits[0];
    const ctx = text.slice(Math.max(0, h.index - 30), h.index + h[0].length + 30);
    out.push({ code: `marker-${m.id}`, detail: `x${hits.length}: ${short(ctx, 80)}` });
  }
  return out;
}

/**
 * No server HTML references the NetMe endpoint (it is fetched by the client, for signed-in visitors only).
 * @param {string} raw
 * @returns {Violation[]}
 */
export function checkNoNetMe(raw) {
  const n = (raw.match(/\/api\/n\/me\b/g) || []).length;
  return n ? [{ code: 'netme-in-server-html', detail: `/api/n/me x${n}` }] : [];
}

/**
 * Strings that must not appear in a layer: 'jsonld', 'text' (the text layer) or 'raw'.
 * @param {{ an: Analysis, forbidden: readonly string[], layer?: 'jsonld' | 'text' | 'raw' }} args
 * @returns {Violation[]}
 */
export function checkForbidden({ an, forbidden, layer = 'text' }) {
  const hay = layer === 'jsonld' ? an.jsonLd.join('\n') : layer === 'raw' ? an.raw : textLayer(an);
  const low = hay.toLowerCase();
  return forbidden.filter((s) => s && low.includes(String(s).toLowerCase())).map((s) => ({ code: `forbidden-${layer}`, detail: short(s, 60) }));
}

// ---------------------------------------------------------------------------------------------------------------
// HTTP

/**
 * One anonymous GET: no cookie, no redirect follow, 20 s timeout. `*.localhost` connects to 127.0.0.1 with the
 * name kept in the Host header. Resolves { status, location, contentType, body }.
 * @param {string} url
 * @param {{ timeoutMs?: number, headers?: Record<string, string> }} [opts]
 * @returns {Promise<{ status: number, location: string | null, contentType: string, body: string }>}
 */
export function httpGet(url, { timeoutMs = 20000, headers = {} } = {}) {
  const u = new URL(url);
  const lib = u.protocol === 'https:' ? https : http;
  const hostname = u.hostname.endsWith('.localhost') || u.hostname === 'localhost' ? '127.0.0.1' : u.hostname;
  return new Promise((resolve, reject) => {
    const req = lib.request(
      {
        hostname,
        port: u.port || (u.protocol === 'https:' ? 443 : 80),
        path: `${u.pathname}${u.search}`,
        method: 'GET',
        headers: { host: u.host, 'user-agent': 'o1-leak-suite/1 (anonymous)', accept: 'text/html,*/*', ...headers },
        timeout: timeoutMs,
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () =>
          resolve({
            status: res.statusCode || 0,
            location: res.headers.location || null,
            contentType: String(res.headers['content-type'] || ''),
            body: Buffer.concat(chunks).toString('utf8'),
          }),
        );
      },
    );
    req.on('timeout', () => req.destroy(new Error(`timeout after ${timeoutMs} ms: ${url}`)));
    req.on('error', reject);
    req.end();
  });
}

/**
 * The <loc> paths of a site's sitemap (an index is followed one level), first `max`, document order.
 * @param {string} base
 * @param {number} max
 * @returns {Promise<string[]>}
 */
export async function sitemapPaths(base, max) {
  if (!max) return [];
  /** @type {string[]} */
  const seen = [];
  const read = async (url, depth) => {
    const r = await httpGet(url);
    if (r.status !== 200) return;
    const locs = [...r.body.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => decodeEntities(m[1]));
    const isIndex = /<sitemapindex\b/i.test(r.body);
    for (const loc of locs) {
      if (seen.length >= max) return;
      let p;
      try {
        const lu = new URL(loc);
        p = `${lu.pathname}${lu.search}`;
      } catch {
        continue;
      }
      if (isIndex && depth === 0) await read(new URL(p, base).toString(), 1);
      else if (!seen.includes(p)) seen.push(p);
    }
  };
  await read(new URL('/sitemap.xml', base).toString(), 0);
  return seen.slice(0, max);
}

/**
 * The URL list format of the parity list: one path per line, # comments and blank lines ignored.
 * @param {string} text
 * @returns {string[]}
 */
export function readPathList(text) {
  return text.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
}
