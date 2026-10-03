// C2 batch 1: B01 to B07, L01 to L03 (blindtest hub, landings). Evidence: ../batch1-*.txt
import { get, hrefs, logLines, stubLines, withPage, write } from './c2-browser.mts';

const THEMES = ['kpop-hits-2026', 'kpop-hits-2025', '5th-gen', 'tiktok-viral', 'kpop-demon-hunters'];
const LANDINGS = ['/guess-the-kpop-song', '/fr/blind-test-kpop', '/es/adivina-la-cancion-kpop', '/id/tebak-lagu-kpop'];
const out: string[] = [`C2 batch 1 at ${new Date().toISOString()} on ${process.env.C2_BASE || 'http://localhost:3071'}`, ''];

// B01 to B04, B07: server HTML of /blindtest
const hub = await get('/blindtest');
const h = hrefs(hub.text);
out.push(`## /blindtest status ${hub.status}`);
const themeLinks = [...new Set(h.filter((x) => THEMES.some((t) => x === `/blindtest/${t}`)))];
out.push(`B01 theme links: ${themeLinks.join(', ') || 'none'}`);
for (const l of themeLinks) out.push(`B01   ${l} -> ${(await get(l)).status}`);
for (const t of ['kpop-hits-2026', 'kpop-demon-hunters']) out.push(`B01 hidden ${t}: link present=${h.includes(`/blindtest/${t}`)} status=${(await get(`/blindtest/${t}`)).status}`);
out.push(`B02 'Play in your language' -> /guess-the-kpop-song present=${hub.text.includes('Play in your language') && h.includes('/guess-the-kpop-song')}`);
out.push(`B03 /live present=${h.includes('/live')} status=${(await get('/live')).status}; /join present=${h.includes('/join')} status=${(await get('/join')).status}`);
out.push(`B04 landing links: ${LANDINGS.map((l) => `${l}=${h.includes(l)}`).join(' ')}`);
out.push(`B07 eyebrow 'playing today' in /blindtest HTML: ${/playing today/i.test(hub.text)}`);

// L02 to L04 and B07 on the landings
for (const l of LANDINGS) {
  const r = await get(l);
  const lh = hrefs(r.text);
  const others = LANDINGS.filter((x) => x !== l).every((x) => lh.includes(x));
  const th = [...new Set(lh.filter((x) => THEMES.some((t) => x === `/blindtest/${t}`)))];
  out.push(`L ${l}: status ${r.status}; L02 /live=${lh.includes('/live')}; L03 themes=${th.join(',')}; L04 others=${others}; B07 eyebrow=${/playing today|fans? (jouent|juegan|bermain)/i.test(r.text)}`);
}

// B05 + B06: hub playlist menu Themes -> Start; L01: landing Start
out.push('', '## B05 hub: Playlist menu, first Themes item, Start (1440)');
await withPage(1440, async (page, log, stubbed) => {
  await page.goto('/blindtest'.replace(/^/, process.env.C2_BASE || 'http://localhost:3071'), { waitUntil: 'load', timeout: 90000 }); await page.waitForTimeout(4000);
  await page.locator('button:has(span:text-is("Playlist"))').first().click();
  const themeItem = page.locator('.p6-pl-h:has-text("Themes") ~ button').first();
  out.push(`B05 Themes item: ${(await themeItem.count()) ? (await themeItem.innerText()).replace(/\s+/g, ' ') : 'absent'}`);
  await themeItem.click();
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await page.waitForTimeout(9000);
  out.push(...logLines(log), ...stubLines(stubbed));
  out.push(`B06 /api/track/bt-run calls (any method): ${[...log, ...stubbed.map((s) => ({ path: new URL(s.url).pathname }))].filter((x) => x.path.startsWith('/api/track/')).length}`);
});
out.push('', '## L01 /guess-the-kpop-song Start (390)');
await withPage(390, async (page, log, stubbed) => {
  await page.goto(`${process.env.C2_BASE || 'http://localhost:3071'}/guess-the-kpop-song`, { waitUntil: 'load', timeout: 90000 }); await page.waitForTimeout(4000);
  await page.locator('[data-g3="start"]').first().click();
  await page.waitForTimeout(9000);
  out.push(...logLines(log), ...stubLines(stubbed));
  out.push(`B06 /api/track/bt-run calls: ${log.filter((x) => x.path.startsWith('/api/track/')).length + stubbed.filter((s) => s.url.includes('/api/track/')).length}`);
});
const r01 = await get('/api/track/bt-run');
out.push('', `B06/R01 GET /api/track/bt-run -> ${r01.status} (POST is never sent by C2)`);
write('batch1-evidence.txt', out);
console.log(out.join('\n'));
