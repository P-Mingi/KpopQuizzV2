#!/usr/bin/env node
// Run O1, lane Q0a: the planted-leak stand-in of the three sites, for the leak suite's self-test (selftest.sh).
// Three small HTTP servers that render pages shaped like the contract says each site renders them (kpop with no
// data-site, anime and hub with data-site on <html>, own-domain canonical and OG, the allowlisted footer and /about
// links, page data in self.__next_f.push rows), and, with --plant <id>, exactly one leak. It proves each leak test
// fails on its planted leak and passes on the clean pages. It is never a site under test in a gate.
//   node scripts/o1/leak/planted-server.mjs --ports 3106,3107,3108 [--plant <id>]   (a port of 0: that site is not served)
// Plants: route-anime route-hub unwired string-anime string-anime-data string-kpop link-kpop link-via link-nofollow
// link-hydrated canonical og-site-name sitemap netme spoiler content content-mirror cookie-domain (the last one for
// the dev-multi cookie test: anime's robots.txt sets a session cookie with Domain=localhost, shared by every
// *.localhost host).
import http from 'node:http';

const args = process.argv.slice(2);
const opt = (k, d) => {
  const i = args.indexOf(k);
  return i >= 0 ? args[i + 1] : d;
};
const [kp, an, hb] = opt('--ports', '3106,3107,3108').split(',').map(Number);
const plant = opt('--plant', 'none');
const P = (id) => plant === id;

const DOMAIN = { kpop: 'kpopquiz.org', anime: 'fandomverse.org/anime', hub: 'fandomverse.org' };
const BRAND = { kpop: 'KpopQuiz', anime: 'OtakuQuiz', hub: 'FandomVerse' };

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function render(site, path, { body = '', head = '', data = '', dataSite = site !== 'kpop' } = {}) {
  const url = `https://${DOMAIN[site]}${path === '/' ? '' : path}`;
  const canonical = P('canonical') && site === 'anime' && path === '/series' ? `https://kpopquiz.org${path}` : url;
  const siteName = P('og-site-name') && site === 'hub' ? 'KpopQuiz' : BRAND[site];
  const ld = { '@context': 'https://schema.org', '@type': 'Organization', name: BRAND[site], url: `https://${DOMAIN[site]}` };
  if (site !== 'hub') ld.parentOrganization = { '@type': 'Organization', name: 'FandomVerse', url: 'https://fandomverse.org' };
  const via = P('link-via') && site === 'anime' ? '?via=a.foot' : '';
  const footer = site === 'hub' ? '' : `<footer><span>2027 ${BRAND[site]}. Part of the <a href="https://fandomverse.org/${via}">FandomVerse network</a>.</span></footer>`;
  const flight = [`0:{"P":null,"b":"build"}\n`, `1:I[4242,["/_next/static/chunks/app-abc.js"],"default"]\n`, `2:["$","main",null,{"children":${JSON.stringify(`${BRAND[site]} page ${path}`)}}]\n`];
  if (data) flight.push(`3:["$","p",null,{"children":${JSON.stringify(data)}}]\n`);
  const push = flight.map((r) => `<script>self.__next_f.push([1,${JSON.stringify(r)}])</script>`).join('');
  return [
    '<!DOCTYPE html>',
    `<html lang="en"${dataSite ? ` data-site="${site}"` : ''}><head><meta charSet="utf-8"/>`,
    `<title>${esc(`${path} | ${BRAND[site]}`)}</title>`,
    `<meta name="description" content="${esc(`${BRAND[site]} page`)}"/>`,
    `<link rel="canonical" href="${canonical}"/>`,
    `<meta property="og:url" content="${url}"/><meta property="og:site_name" content="${siteName}"/>`,
    `<meta property="og:image" content="https://${DOMAIN[site]}/og-default.png"/>`,
    `<script type="application/ld+json">${JSON.stringify(ld)}</script>${head}</head>`,
    `<body><main>${body}</main>${footer}${push}</body></html>`,
  ].join('');
}

const ANIME_PAGES = {
  '/': 'Anime quizzes and opening blindtests.',
  '/series': 'Series: Death Note, One Piece, Spy x Family. Pick your oshi.',
  '/anime-mix-quiz': 'Anime Mix quiz.',
  '/blindtest': 'Opening blindtest. Opening by an idol group, credited.',
  '/daily': 'Quiz of the day.',
  '/opening-of-the-day': 'Opening of the day.',
  '/login': 'Sign in.',
  '/search': 'Search series and quizzes.',
  '/community': 'Community.',
  '/about': 'OtakuQuiz is made by the team behind <a href="https://kpopquiz.org/">KpopQuiz</a>, part of the <a href="https://fandomverse.org/">FandomVerse network</a>.',
  '/editorial-policy': 'Editorial policy.',
  '/privacy': 'Privacy.',
  '/terms': 'Terms.',
  '/contact': 'Contact.',
  '/q/death-note-quiz-o1-fixture': 'Death Note quiz.',
};
const HUB_PAGES = {
  '/': 'One passport for every fandom. <a href="https://kpopquiz.org/">KpopQuiz</a> <a href="https://fandomverse.org/anime/">OtakuQuiz</a>',
  '/privacy': 'Network privacy policy.',
  '/login': 'Sign in.',
  '/directory': `Directory <a rel="nofollow" href="https://kpopquiz.org/bts-quiz">BTS</a> <a${P('link-nofollow') ? '' : ' rel="nofollow"'} href="https://fandomverse.org/anime/naruto-quiz">Naruto</a>`,
};

function kpopPage(path) {
  let body = `K-pop quiz page ${esc(path)}. Pick your bias.`;
  if (path === '/about') body += ' Also by our team: <a href="https://fandomverse.org/anime/">OtakuQuiz</a>, for anime fans.';
  if (path === '/quizzes' && P('string-kpop')) body += ' New: try OtakuQuiz for anime.';
  if (path === '/quizzes' && P('link-kpop')) body += ' <a href="https://fandomverse.org/anime/series">Anime series</a>';
  if (path === '/quizzes' && P('content')) body += ' <a href="/q/death-note-quiz-o1-fixture">Death Note quiz</a>';
  if (path === '/' && P('link-hydrated')) body += `<script>window.addEventListener('load',()=>{const a=document.createElement('a');a.href='https://'+'otaku'+'quiz.org/';a.textContent='x';document.body.appendChild(a)})</script>`;
  return render('kpop', path, { body });
}

function animePage(path) {
  let body = ANIME_PAGES[path];
  let data = '';
  let head = '';
  if (path === '/guess-the-kpop-idol' && P('route-anime')) body = 'Guess the idol.';
  if (body === undefined) return null;
  if (path === '/series' && P('string-anime')) body += ' Top K-pop groups this week.';
  if (path === '/series' && P('string-anime-data')) data = 'Made by KpopQuiz';
  if (path === '/series' && P('content-mirror')) body += ' <a href="/q/bts-quiz-o1-fixture">BTS quiz</a>';
  if (path === '/q/death-note-quiz-o1-fixture') {
    const ld = { '@context': 'https://schema.org', '@type': 'Quiz', name: 'Death Note quiz', about: P('spoiler') ? 'Answer: L dies in episode 25' : 'A quiz about Death Note' };
    head = `<script type="application/ld+json">${JSON.stringify(ld)}</script>`;
  }
  return render('anime', path, { body, data, head, dataSite: !P('unwired') });
}

function hubPage(path) {
  let body = HUB_PAGES[path];
  if (path === '/quizzes' && P('route-hub')) return { redirect: '/' };
  if (body === undefined) return null;
  let data = '';
  if (path === '/' && P('netme')) data = 'fetch /api/n/me on load';
  return render('hub', path, { body, data });
}

function rootFile(site, path) {
  if (path === '/robots.txt') return { type: 'text/plain', body: `User-agent: *\nAllow: /\nSitemap: https://${DOMAIN[site]}/sitemap.xml\n` };
  if (path === '/sitemap.xml') {
    const pages = site === 'kpop' ? ['/', '/quizzes'] : site === 'anime' ? ['/', '/series', '/about'] : ['/', '/privacy'];
    const locs = pages.map((p) => `https://${DOMAIN[site]}${p === '/' ? '' : p}`);
    if (site === 'anime' && P('sitemap')) locs.push('https://kpopquiz.org/bts-quiz');
    return { type: 'application/xml', body: `<?xml version="1.0" encoding="UTF-8"?><urlset>${locs.map((l) => `<url><loc>${l}</loc></url>`).join('')}</urlset>` };
  }
  if (path === '/llms.txt') return { type: 'text/plain', body: `# ${BRAND[site]}\n` };
  return null;
}

function serve(site, port) {
  const server = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    const path = u.pathname;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405);
      return res.end();
    }
    const rf = rootFile(site, path);
    if (rf) {
      const extra = P('cookie-domain') && site === 'anime' && path === '/robots.txt'
        ? { 'set-cookie': 'sb-127-auth-token=planted-shared; Domain=localhost; Path=/; SameSite=Lax' } : {};
      res.writeHead(200, { 'content-type': rf.type, ...extra });
      return res.end(rf.body);
    }
    if (path === '/favicon.ico') {
      res.writeHead(404);
      return res.end();
    }
    if (site === 'kpop') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      return res.end(kpopPage(path));
    }
    const out = site === 'anime' ? animePage(path) : hubPage(path);
    if (out && typeof out === 'object' && out.redirect) {
      res.writeHead(301, { location: out.redirect });
      return res.end();
    }
    if (!out) {
      res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
      return res.end(render(site, path, { body: 'Not found', dataSite: !(site === 'anime' && P('unwired')) }));
    }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    return res.end(out);
  });
  server.listen(port, '127.0.0.1');
  return server;
}

// A port of 0 leaves that site unserved (gate-selftest.sh: a planned server of the gate that never starts).
const served = [['kpop', kp], ['anime', an], ['hub', hb]].filter(([, p]) => p > 0);
const servers = served.map(([site, p]) => serve(site, p));
let up = 0;
for (const s of servers)
  s.on('listening', () => {
    up += 1;
    if (up === servers.length) console.log(`planted-server: ${served.map(([site, p]) => `${site} ${p}`).join(', ')}, plant ${plant}`);
  });
const stop = () => {
  for (const s of servers) s.close();
  process.exit(0);
};
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
