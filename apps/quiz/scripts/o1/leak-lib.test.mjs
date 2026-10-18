// Run O1, lane Q0a: unit tests of the leak suite core (node --test apps/quiz/scripts/o1/leak-lib.test.mjs).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  analyzeHtml,
  checkForbidden,
  checkIdentity,
  checkLinks,
  checkNoNetMe,
  checkRootFile,
  checkStrings,
  compileMarkers,
  flightText,
  httpGet,
  linkTarget,
  pageMatches,
  parseAttrs,
  sitemapPaths,
  textLayer,
} from './leak-lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ALLOW = JSON.parse(fs.readFileSync(path.join(HERE, '../../e2e/o1/leak/link-allowlist.json'), 'utf8'));
const MARKERS = JSON.parse(fs.readFileSync(path.join(HERE, '../../e2e/o1/leak/string-markers.json'), 'utf8')).markers;

function page({ head = '', body = '', site = '', flight = [] } = {}) {
  const push = flight.map((s) => `<script>self.__next_f.push([1,${JSON.stringify(s)}])</script>`).join('');
  return `<!DOCTYPE html><html lang="en"${site ? ` data-site="${site}"` : ''}><head>${head}</head><body>${body}${push}</body></html>`;
}

test('parseAttrs reads quoted, bare and boolean attributes and decodes entities', () => {
  const a = parseAttrs('<a href="/x?a=1&amp;b=2" rel=nofollow data-x=\'y\' hidden>');
  assert.equal(a.href, '/x?a=1&b=2');
  assert.equal(a.rel, 'nofollow');
  assert.equal(a['data-x'], 'y');
  assert.equal(a.hidden, '');
});

test('flightText keeps copy, drops module rows and asset paths', () => {
  const t = flightText(page({ flight: ['1:I[123,["/_next/static/chunks/kpop-abc.js"],"KpopNav"]\n2:["$","p",null,{"children":"Hello fans"}]\n'] }));
  assert.match(t, /Hello fans/);
  assert.doesNotMatch(t, /KpopNav|kpop-abc/);
});

test('linkTarget classifies self, network sites, dev hosts and external links', () => {
  const pageUrl = 'http://127.0.0.1:4022/series';
  assert.equal(linkTarget('/q/x', pageUrl, 'anime').kind, 'self');
  assert.equal(linkTarget('https://otakuquiz.org/x', pageUrl, 'anime').kind, 'self');
  assert.equal(linkTarget('https://www.kpopquiz.org/', pageUrl, 'anime').site, 'kpop');
  assert.equal(linkTarget('http://hub.localhost:3108/', pageUrl, 'anime').site, 'hub');
  assert.equal(linkTarget('https://www.deezer.com/', pageUrl, 'anime').kind, 'external');
  assert.equal(linkTarget('mailto:a@b.c', pageUrl, 'anime').kind, 'none');
  assert.equal(linkTarget('#top', pageUrl, 'anime').kind, 'none');
});

test('pageMatches: any page, subtree, exact, null', () => {
  assert.ok(pageMatches('*', '/a'));
  assert.ok(pageMatches('/news/**', '/news/x/y'));
  assert.ok(pageMatches('/news/**', '/news'));
  assert.ok(!pageMatches('/news/**', '/newsletter'));
  assert.ok(pageMatches('/**', '/anything'));
  assert.ok(!pageMatches('/about', '/about/x'));
  assert.ok(!pageMatches(null, '/'));
});

const ANIME_URL = 'http://127.0.0.1:4022';

test('links: the footer link to fanquiz.org passes once, twice is over the cap', () => {
  const one = analyzeHtml(page({ body: '<footer><a href="https://fanquiz.org/">FanQuiz network</a></footer>' }));
  assert.deepEqual(checkLinks({ site: 'anime', path: '/', pageUrl: ANIME_URL, an: one, allowlist: ALLOW }).violations, []);
  const two = analyzeHtml(page({ body: '<a href="https://fanquiz.org/">FanQuiz</a><a href="https://fanquiz.org/">FanQuiz</a>' }));
  assert.deepEqual(checkLinks({ site: 'anime', path: '/', pageUrl: ANIME_URL, an: two, allowlist: ALLOW }).violations.map((v) => v.code), ['link-over-cap']);
});

test('links: the cap counts per target site (the anime /about line links KpopQuiz and FanQuiz, plus the footer)', () => {
  const html = page({ body: '<p>Made by the team behind <a href="https://kpopquiz.org/">KpopQuiz</a>, part of the <a href="https://fanquiz.org/">FanQuiz network</a>.</p><footer><a href="https://fanquiz.org/">FanQuiz network</a></footer>' });
  assert.deepEqual(checkLinks({ site: 'anime', path: '/about', pageUrl: ANIME_URL, an: analyzeHtml(html), allowlist: ALLOW }).violations, []);
  const twice = page({ body: '<a href="https://kpopquiz.org/">KpopQuiz</a><a href="https://kpopquiz.org/">KpopQuiz</a>' });
  assert.deepEqual(checkLinks({ site: 'anime', path: '/about', pageUrl: ANIME_URL, an: analyzeHtml(twice), allowlist: ALLOW }).violations.map((v) => v.code), ['link-over-cap']);
  const hub = page({ body: '<a href="https://kpopquiz.org/">KpopQuiz</a><a href="https://otakuquiz.org/">OtakuQuiz</a>' });
  assert.deepEqual(checkLinks({ site: 'hub', path: '/', pageUrl: 'http://127.0.0.1:4023/', an: analyzeHtml(hub), allowlist: ALLOW }).violations, []);
});

test('links: a link to the other world outside the allowlist fails, on /about it passes', () => {
  const html = page({ body: '<p>Made by the team behind <a href="https://kpopquiz.org/">KpopQuiz</a>.</p>' });
  const an = analyzeHtml(html);
  const home = checkLinks({ site: 'anime', path: '/', pageUrl: ANIME_URL, an, allowlist: ALLOW }).violations.map((v) => v.code);
  assert.ok(home.includes('link-not-allowed'));
  assert.ok(home.includes('domain-in-html'));
  const about = checkLinks({ site: 'anime', path: '/about', pageUrl: ANIME_URL, an, allowlist: ALLOW });
  assert.deepEqual(about.violations, []);
  assert.equal(about.allowed.length, 1);
});

test('links: via on an anonymous page, a query on an editorial link, nofollow rules', () => {
  const via = analyzeHtml(page({ body: '<a href="https://fanquiz.org/?via=a.foot">FanQuiz</a>' }));
  const codes = checkLinks({ site: 'anime', path: '/', pageUrl: ANIME_URL, an: via, allowlist: ALLOW }).violations.map((v) => v.code);
  assert.deepEqual(codes.sort(), ['link-has-query', 'via-anonymous']);
  const dirOk = analyzeHtml(page({ body: '<a rel="nofollow" href="https://otakuquiz.org/naruto-quiz">Naruto</a>' }));
  assert.deepEqual(checkLinks({ site: 'hub', path: '/directory', pageUrl: 'http://127.0.0.1:4023/directory', an: dirOk, allowlist: ALLOW }).violations, []);
  const dirBad = analyzeHtml(page({ body: '<a href="https://otakuquiz.org/naruto-quiz">Naruto</a>' }));
  assert.deepEqual(checkLinks({ site: 'hub', path: '/directory', pageUrl: 'http://127.0.0.1:4023/directory', an: dirBad, allowlist: ALLOW }).violations.map((v) => v.code), ['link-needs-nofollow']);
  const followedBad = analyzeHtml(page({ body: '<a rel="nofollow" href="https://fanquiz.org/">FanQuiz</a>' }));
  assert.deepEqual(checkLinks({ site: 'kpop', path: '/', pageUrl: 'http://127.0.0.1:4021/', an: followedBad, allowlist: ALLOW }).violations.map((v) => v.code), ['link-must-be-followed']);
});

test('links: the other world domain in page data or JSON-LD fails even without an anchor', () => {
  const an = analyzeHtml(page({ head: '<script type="application/ld+json">{"sameAs":["https://kpopquiz.org"]}</script>' }));
  assert.deepEqual(checkLinks({ site: 'anime', path: '/', pageUrl: ANIME_URL, an, allowlist: ALLOW }).violations.map((v) => v.code), ['domain-in-html']);
  const kp = analyzeHtml(page({ flight: ['2:["$","a",null,{"href":"https://otakuquiz.org/"}]\n'] }));
  assert.deepEqual(checkLinks({ site: 'kpop', path: '/', pageUrl: 'http://127.0.0.1:4021/', an: kp, allowlist: ALLOW }).violations.map((v) => v.code), ['domain-in-html']);
});

test('links: the allowlisted /about link duplicated in the page data does not count as a domain leak', () => {
  const html = page({
    body: '<p>Made by the team behind <a href="https://kpopquiz.org/">KpopQuiz</a>.</p>',
    flight: ['3:["$","a",null,{"href":"https://kpopquiz.org/","children":"KpopQuiz"}]\n'],
  });
  const r = checkLinks({ site: 'anime', path: '/about', pageUrl: ANIME_URL, an: analyzeHtml(html), allowlist: ALLOW });
  assert.deepEqual(r.violations, []);
});

test('identity: own canonical passes, cross-domain canonical and og fail', () => {
  const good = analyzeHtml(page({ head: '<link rel="canonical" href="https://otakuquiz.org/series"/><meta property="og:url" content="https://otakuquiz.org/series"/><meta property="og:site_name" content="OtakuQuiz"/><meta property="og:image" content="https://otakuquiz.org/api/og/site"/>' }));
  assert.deepEqual(checkIdentity({ site: 'anime', an: good }), []);
  const bad = analyzeHtml(page({ head: '<link rel="canonical" href="https://kpopquiz.org/series"/><meta property="og:url" content="https://kpopquiz.org/"/><meta property="og:site_name" content="KpopQuiz"/><meta property="og:image" content="https://kpopquiz.org/og-default.png"/><link rel="alternate" hreflang="pt-BR" href="https://kpopquiz.org/pt"/>' }));
  assert.deepEqual(checkIdentity({ site: 'anime', an: bad }).map((v) => v.code), ['cross-domain-canonical', 'cross-domain-canonical', 'og-url-foreign', 'og-site-name', 'og-image-cross-site']);
  const storage = analyzeHtml(page({ head: '<meta property="og:image" content="https://abc.supabase.co/storage/v1/x.png"/>' }));
  assert.deepEqual(checkIdentity({ site: 'kpop', an: storage }), []);
  const ld = analyzeHtml(page({ head: '<script type="application/ld+json">{"@type":"Organization","url":"https://kpopquiz.org","parentOrganization":{"url":"https://fanquiz.org"}}</script>' }));
  assert.deepEqual(checkIdentity({ site: 'anime', an: ld }).map((v) => v.code), ['jsonld-cross-world']);
  assert.deepEqual(checkIdentity({ site: 'kpop', an: ld }), []);
});

test('root files: robots Sitemap line and sitemap locs stay on the own domain', () => {
  assert.deepEqual(checkRootFile({ site: 'anime', path: '/robots.txt', body: 'User-agent: *\nSitemap: https://otakuquiz.org/sitemap.xml\n' }), []);
  assert.equal(checkRootFile({ site: 'anime', path: '/robots.txt', body: 'Sitemap: https://kpopquiz.org/sitemap.xml' })[0].code, 'root-file-foreign-url');
  assert.equal(checkRootFile({ site: 'hub', path: '/sitemap.xml', body: '<urlset><url><loc>https://fanquiz.org/</loc></url><url><loc>https://kpopquiz.org/</loc></url></urlset>' })[0].detail.startsWith('/sitemap.xml: 1 of 2'), true);
});

test('strings: K-pop markers fail on anime, the mirror fails on kpop, dropped anchors do not count', () => {
  const anime = compileMarkers(MARKERS.anime);
  const kpop = compileMarkers(MARKERS.kpop);
  const leak = analyzeHtml(page({ body: '<h1>Pick your bias</h1><img alt="K-pop stage"/>' }));
  assert.deepEqual(checkStrings({ an: leak, markers: anime }).map((v) => v.code), ['marker-kpop-genre', 'marker-kpop-pick-word']);
  const meta = analyzeHtml(page({ head: '<title>Quizzes | KpopQuiz</title>' }));
  assert.deepEqual(checkStrings({ an: meta, markers: anime }).map((v) => v.code), ['marker-kpop-brand']);
  const mirror = analyzeHtml(page({ flight: ['2:["$","p",null,{"children":"Try OtakuQuiz"}]\n'] }));
  assert.deepEqual(checkStrings({ an: mirror, markers: kpop }).map((v) => v.code), ['marker-anime-brand']);
  const about = analyzeHtml(page({ body: '<p>Made by the team behind <a href="https://kpopquiz.org/">KpopQuiz</a>.</p>', flight: ['3:["$","a",null,{"href":"https://kpopquiz.org/","children":"KpopQuiz"}]\n'] }));
  const { allowed } = checkLinks({ site: 'anime', path: '/about', pageUrl: ANIME_URL, an: about, allowlist: ALLOW });
  assert.deepEqual(checkStrings({ an: about, markers: anime, dropRaw: allowed }), []);
  const clean = analyzeHtml(page({ body: '<h1>Naruto quiz</h1><p>Pick your oshi. Opening by an idol group.</p>' }));
  assert.deepEqual(checkStrings({ an: clean, markers: anime }), []);
});

test('text layer: scripts other than JSON-LD and page data are not copy', () => {
  const an = analyzeHtml(page({ body: '<script>var k="K-pop"</script><style>.kpop{}</style><p>Hi</p>' }));
  assert.doesNotMatch(textLayer(an), /K-pop|kpop/);
});

test('netme: a server reference to /api/n/me fails', () => {
  assert.deepEqual(checkNoNetMe(page({ body: '<p>ok</p>' })), []);
  assert.equal(checkNoNetMe(page({ body: '<script>fetch("/api/n/me")</script>' }))[0].code, 'netme-in-server-html');
  assert.deepEqual(checkNoNetMe(page({ body: '<a href="/api/n/menu">x</a>' })), []);
});

test('forbidden: JSON-LD layer and text layer', () => {
  const an = analyzeHtml(page({ head: '<script type="application/ld+json">{"name":"L is Light"}</script>', body: '<p>Quiz</p>' }));
  assert.equal(checkForbidden({ an, forbidden: ['l is light'], layer: 'jsonld' }).length, 1);
  assert.equal(checkForbidden({ an, forbidden: ['Quiz'], layer: 'jsonld' }).length, 0);
  assert.equal(checkForbidden({ an, forbidden: ['quiz'], layer: 'text' }).length, 1);
});

test('httpGet sends no cookie, keeps *.localhost in Host, does not follow redirects; sitemapPaths follows an index', async () => {
  const seen = [];
  const server = http.createServer((req, res) => {
    seen.push({ url: req.url, host: req.headers.host, cookie: req.headers.cookie });
    if (req.url === '/r') {
      res.writeHead(301, { location: '/' });
      return res.end();
    }
    if (req.url === '/sitemap.xml') {
      res.writeHead(200, { 'content-type': 'application/xml' });
      return res.end('<sitemapindex><sitemap><loc>https://otakuquiz.org/s1.xml</loc></sitemap></sitemapindex>');
    }
    if (req.url === '/s1.xml') {
      res.writeHead(200, { 'content-type': 'application/xml' });
      return res.end('<urlset><url><loc>https://otakuquiz.org/</loc></url><url><loc>https://otakuquiz.org/series</loc></url><url><loc>https://otakuquiz.org/about</loc></url></urlset>');
    }
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end('<p>ok</p>');
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  try {
    const r = await httpGet(`http://anime.localhost:${port}/r`);
    assert.equal(r.status, 301);
    assert.equal(r.location, '/');
    assert.equal(seen[0].host, `anime.localhost:${port}`);
    assert.equal(seen[0].cookie, undefined);
    assert.deepEqual(await sitemapPaths(`http://127.0.0.1:${port}`, 2), ['/', '/series']);
  } finally {
    server.close();
  }
});
