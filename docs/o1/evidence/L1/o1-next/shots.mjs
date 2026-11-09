// Lot o1/next, proofs of A, B and C: node shots.mjs <kpopHomeUrl> <animeHomeUrl> <outDir> [tag]
// Read-only: GET only (every other method is aborted in the browser). "Signed in" is the client view only: /api/auth/me is answered
// in the browser with a fixture profile (no account, no password, no cookie); the server render of the home is the same for both.
import { chromium } from '@playwright/test'; // run with NODE_PATH=apps/quiz/node_modules, or copy into apps/quiz
import fs from 'node:fs';

const [kpopUrl, animeUrl, outDir, tag = 'after'] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const PROFILE = {
  id: '00000000-0000-4000-8000-000000000001', username: 'fixture_fan', display_name: 'Mina', avatar_url: null, avatar_bg: '#E8457A',
  avatar_text: '#ffffff', xp: 1200, daily_streak: 3, last_daily_date: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
};
const WIDTHS = [[375, 812], [768, 1024], [1280, 900], [1440, 900]];
const browser = await chromium.launch();
const report = [];

async function shoot(site, url, [w, hgt], auth) {
  const ctx = await browser.newContext({ viewport: { width: w, height: hgt }, deviceScaleFactor: 1, ...(w < 768 ? { isMobile: true, hasTouch: true } : {}) });
  const page = await ctx.newPage();
  // Signed in: the client reads /api/auth/me only when it sees a Supabase auth cookie (lib/auth/use-me.ts). The getter of
  // document.cookie shows a fixture name to the page script; no cookie is set, so none is ever sent to a server.
  if (auth === 'in') {
    await page.addInitScript(() => {
      const d = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
      Object.defineProperty(document, 'cookie', { configurable: true, get() { const c = d.get.call(document); return `${c}${c ? '; ' : ''}sb-fixture-auth-token=fixture`; }, set(v) { d.set.call(document, v); } });
    });
  }
  await page.route('**/*', (route) => {
    const r = route.request();
    if (r.method() !== 'GET') return route.abort();
    if (/\/api\/auth\/me(\?|$)/.test(new URL(r.url()).pathname + '?')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ profile: auth === 'in' ? PROFILE : null }) });
    }
    return route.continue();
  });
  await page.goto(url, { waitUntil: 'networkidle', timeout: 240000 }).catch(() => page.waitForLoadState('load'));
  for (const name of [/reject/i, /decline/i, /necessary only/i]) {
    const b = page.getByRole('button', { name }).first();
    if (await b.count()) { try { await b.click({ timeout: 1500 }); break; } catch { /* none */ } }
  }
  await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
  await page.waitForSelector(`header.p1-hhead[data-auth="${auth}"]`, { timeout: 60000 }).catch(() => null);
  await page.waitForTimeout(800);
  const geo = await page.evaluate(() => {
    const r = (sel) => { const el = document.querySelector(sel); if (!el) return null; const b = el.getBoundingClientRect(); const cs = getComputedStyle(el); return { top: Math.round(b.top + scrollY), bottom: Math.round(b.bottom + scrollY), h: Math.round(b.height), visible: cs.display !== 'none' && cs.visibility !== 'hidden' && b.height > 0 }; };
    const cta = [...document.querySelectorAll('header.p1-hhead .p1-hcta a')].map((a) => ({ href: a.getAttribute('href'), text: a.textContent.trim() }));
    return {
      headerAuth: document.querySelector('header.p1-hhead')?.getAttribute('data-auth') ?? null,
      header: r('header.p1-hhead'), cta: r('header.p1-hhead .p1-hcta'), ctaLinks: cta,
      hiddenCopy: !!document.querySelector('.p1-hcta[aria-hidden="true"]'),
      chip: r('.p1-dchip'), surprise: r('.kpop-h2-surprise') ?? r('.anime-h2-surprise'), qotd: r('.p1-qotd'),
      viewportH: innerHeight,
    };
  });
  const s = geo.surprise, q = geo.qotd, c = geo.cta;
  geo.checks = {
    order_surprise_before_qotd: !!(s && q && s.top < q.top),
    no_overlap_surprise_qotd: !!(s && q && s.bottom <= q.top),
    no_overlap_cta_surprise: !!(c && s && c.bottom <= s.top),
    header_state_as_asked: geo.headerAuth === auth,
    two_real_buttons: geo.ctaLinks.length === 2 && !geo.hiddenCopy,
    phone_play_above_fold: w < 768 ? !!(geo.chip && geo.chip.visible && geo.chip.bottom <= geo.viewportH) : null,
  };
  const bottom = Math.max(hgt, (q?.bottom ?? 0) + 40);
  const file = `${outDir}/${site}-${w}-${auth}-${tag}.png`;
  await page.screenshot({ path: file, fullPage: true, clip: { x: 0, y: 0, width: w, height: bottom } });
  report.push({ site, width: w, auth, file, ...geo });
  console.log(`${site} ${w} ${auth}: ${JSON.stringify(geo.checks)} header=${geo.header?.h}`);
  await ctx.close();
}

for (const [site, url] of [['kpop', kpopUrl], ['anime', animeUrl]]) {
  if (!url || url === '-') continue;
  for (const wh of WIDTHS) for (const auth of ['out', 'in']) await shoot(site, url, wh, auth);
}
// A: the header keeps its height when /api/auth/me answers (signed in vs out, same site and width).
for (const r of report.filter((x) => x.auth === 'in')) {
  const o = report.find((x) => x.site === r.site && x.width === r.width && x.auth === 'out');
  r.checks.same_header_height_as_guest = o ? Math.abs((o.header?.h ?? 0) - (r.header?.h ?? -1)) <= 2 : null;
}
fs.writeFileSync(`${outDir}/geometry-${tag}.json`, JSON.stringify(report, null, 2));
await browser.close();
