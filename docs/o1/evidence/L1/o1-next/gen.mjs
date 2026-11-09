// Lot o1/next E: the generations link at the foot of the kpopquiz.org home, at 375 and 1280, signed in and out. GET only; "signed in" is
// the client view only (the page sees a fixture cookie name, /api/auth/me is answered in the browser).
import { chromium } from '@playwright/test'; // run with NODE_PATH=apps/quiz/node_modules, or copy into apps/quiz
import fs from 'node:fs';

const [url, outDir] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const PROFILE = { id: '00000000-0000-4000-8000-000000000001', username: 'fixture_fan', display_name: 'Mina', avatar_url: null, avatar_bg: '#E8457A', avatar_text: '#ffffff', xp: 1200, daily_streak: 3, last_daily_date: new Date(Date.now() - 86400000).toISOString().slice(0, 10) };
const browser = await chromium.launch();
const report = [];
for (const [w, hgt] of [[375, 812], [1280, 900]]) for (const auth of ['out', 'in']) {
  const ctx = await browser.newContext({ viewport: { width: w, height: hgt }, ...(w < 768 ? { isMobile: true, hasTouch: true } : {}) });
  const page = await ctx.newPage();
  if (auth === 'in') await page.addInitScript(() => { const d = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie'); Object.defineProperty(document, 'cookie', { configurable: true, get() { const c = d.get.call(document); return `${c}${c ? '; ' : ''}sb-fixture-auth-token=fixture`; }, set(v) { d.set.call(document, v); } }); });
  await page.route('**/*', (route) => { const r = route.request(); if (r.method() !== 'GET') return route.abort(); if (new URL(r.url()).pathname.endsWith('/api/auth/me')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ profile: auth === 'in' ? PROFILE : null }) }); return route.continue(); });
  await page.goto(url, { waitUntil: 'networkidle', timeout: 240000 }).catch(() => null);
  await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
  await page.waitForSelector(`header.p1-hhead[data-auth="${auth}"]`, { timeout: 60000 }).catch(() => null);
  const gen = page.locator('p.p1-gen').first();
  await gen.scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  const geo = await page.evaluate(() => {
    const p = document.querySelector('p.p1-gen'); const a = p?.querySelector('a');
    const groups = document.querySelector('section[aria-labelledby="p1-groups-h"] .ux-sec-h .ux-lnk');
    const main = p?.parentElement; const footer = document.querySelector('footer');
    const r = p?.getBoundingClientRect(); const f = footer?.getBoundingClientRect();
    return {
      headerAuth: document.querySelector('header.p1-hhead')?.getAttribute('data-auth'),
      linkText: a?.textContent?.trim(), href: a?.getAttribute('href'),
      linkColor: a ? getComputedStyle(a).color : null, groupsLinkColor: groups ? getComputedStyle(groups).color : null,
      lastOfPage: !!p && main?.lastElementChild === p,
      noteUnderGroups: !!document.querySelector('section[aria-labelledby="p1-groups-h"] a[href="/articles/kpop-generations-explained"]'),
      top: r ? Math.round(r.top + scrollY) : null, bottom: r ? Math.round(r.bottom + scrollY) : null, footerTop: f ? Math.round(f.top + scrollY) : null,
    };
  });
  geo.checks = {
    header_state_as_asked: geo.headerAuth === auth,
    exact_anchor_in_link: /K-pop generations/.test(geo.linkText ?? ''),
    same_colour_as_all_groups: !!geo.linkColor && geo.linkColor === geo.groupsLinkColor,
    last_block_before_footer: geo.lastOfPage && geo.footerTop !== null && geo.bottom !== null && geo.bottom <= geo.footerTop,
    gone_from_groups: !geo.noteUnderGroups,
  };
  const y = Math.max(0, (geo.top ?? 0) - Math.round(hgt * 0.55));
  const file = `${outDir}/kpop-${w}-${auth}-generations.png`;
  await page.screenshot({ path: file, fullPage: true, clip: { x: 0, y, width: w, height: Math.min(hgt, ((geo.footerTop ?? geo.bottom ?? 0) + 160) - y) } });
  report.push({ width: w, auth, file: file.split('/').pop(), ...geo });
  console.log(`${w} ${auth}: ${JSON.stringify(geo.checks)} "${geo.linkText}" ${geo.linkColor}`);
  await ctx.close();
}
fs.writeFileSync(`${outDir}/generations.json`, JSON.stringify(report, null, 2));
await browser.close();
