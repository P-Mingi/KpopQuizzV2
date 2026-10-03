// C2 batch 8: C01, C03, C04, E01 to E06, R01 to R03. Evidence: ../batch8-evidence.txt
import { BASE, get, hrefs, logLines, stubLines, withPage, write } from './c2-browser.mts';

const out: string[] = [`C2 batch 8 at ${new Date().toISOString()} on ${BASE}`, ''];
const safe = async (label: string, fn: () => Promise<void>) => {
  try { await fn(); } catch (e) { out.push(`${label} ERROR ${(e as Error).message.split('\n')[0]}`); }
};

// C03, C04
const st = await get('/api/creators/standing');
out.push(`C03 GET /api/creators/standing (anonymous) -> ${st.status} ${st.text}`);
const cr = await get('/creators');
const ch = hrefs(cr.text);
out.push(`C04 /creators ${cr.status}: /create=${ch.includes('/create')} /leaderboard#creators=${ch.includes('/leaderboard#creators')}; noindex=${/<meta name="robots" content="[^"]*noindex/.test(cr.text)}`);
for (const h of ['/create', '/leaderboard']) out.push(`C04   ${h} -> ${(await get(h)).status}`);
const lb = await get('/leaderboard');
out.push(`C04 /leaderboard links /creators: ${hrefs(lb.text).includes('/creators')}`);

// C01: tabs switch without a request
out.push('', '## C01 /creators tabs (390)');
await safe('C01', () => withPage(390, async (page, log, stubbed) => {
  await page.goto(`${BASE}/creators`, { waitUntil: 'load', timeout: 90000 });
  await page.waitForTimeout(3000);
  const n = log.length;
  await page.getByRole('tab', { name: 'All time' }).click();
  await page.waitForTimeout(800);
  const allVisible = await page.getByText('7,386').first().isVisible().catch(() => false);
  await page.getByRole('tab', { name: 'This month' }).click();
  await page.waitForTimeout(800);
  out.push(`C01 requests after two tab clicks: ${log.length - n}; all-time board visible after its tab: ${allVisible}`);
  out.push(...stubLines(stubbed));
}));

// E01 to E06
const feed = await get('/community');
out.push('', `E01 /community ${feed.status}: "Editorial account of the KpopQuiz team" present=${feed.text.includes('Editorial account of the KpopQuiz team')}; team post links ${hrefs(feed.text).filter((h) => /\/community\/(thread|blog)\/e/.test(h)).length}`);
for (const p of ['/community/thread/e1', '/community/blog/e1']) out.push(`E02 GET ${p} -> ${(await get(p)).status}`);
const team = await get('/api/ux-v1/p11/team');
out.push(`E04 GET /api/ux-v1/p11/team -> ${team.status} ${team.text.slice(0, 160)}`);
const ae = await get('/admin/editorial');
out.push(`E05 GET /admin/editorial -> ${ae.status} location ${ae.location}`);
for (const m of ['GET']) {
  const r = await get('/api/admin/editorial', { method: m });
  out.push(`E05 ${m} /api/admin/editorial (anonymous) -> ${r.status} ${r.text.slice(0, 80)}`);
}
for (const p of ['/api/cron/editorial-publish', '/api/cron/fans-picked']) {
  const a = await get(p);
  const b = await get(p, { headers: { Authorization: 'Bearer c2-wrong' } });
  out.push(`E06/R03 GET ${p} -> ${a.status}; wrong bearer -> ${b.status}`);
}
// R01, R02
for (const p of ['/api/track/bt-run']) out.push(`R01 GET ${p} -> ${(await get(p)).status}`);
const rr = await get('/admin/blind-tests/runs');
out.push(`R02 GET /admin/blind-tests/runs -> ${rr.status} location ${rr.location}`);
const other = await get('/admin/c2-no-such-page');
out.push(`R02 compare: GET /admin/c2-no-such-page -> ${other.status} location ${other.location}`);
write('batch8-evidence.txt', out);
console.log(out.join('\n'));
void logLines;
