// C2 batch 2: L06, T01 to T05 (landing results, theme pages). Evidence: ../batch2-evidence.txt
import { BASE, get, hrefs, logLines, stubLines, withPage, write } from './c2-browser.mts';
import { rows } from './c2-read.mjs';

const out: string[] = [`C2 batch 2 at ${new Date().toISOString()} on ${BASE}`, ''];
const safe = async (label: string, fn: () => Promise<void>) => {
  try { await fn(); } catch (e) { out.push(`${label} ERROR ${(e as Error).message.split('\n')[0]}`); }
};

/** Answer every round with the first choice until the results show a Share button. */
async function playThrough(page: any, maxRounds = 14): Promise<number> {
  let n = 0;
  for (let i = 0; i < maxRounds * 3; i++) {
    if (await page.locator('button:has-text("Share")').first().isVisible().catch(() => false)) return n;
    const tap = page.locator('.p6-tap').first();
    if (await tap.isVisible().catch(() => false)) { await tap.click().catch(() => {}); await page.waitForTimeout(800); continue; }
    const ans = page.locator('.p6-answers button:not([disabled])').first();
    if (await ans.isVisible().catch(() => false)) { await ans.click().catch(() => {}); n++; await page.waitForTimeout(600); }
    const next = page.locator('.p6-next').first();
    if (await next.isVisible().catch(() => false)) await next.click().catch(() => {});
    await page.waitForTimeout(900);
  }
  return n;
}

// L06: landing run to the end, Share -> challenge link request (stubbed)
out.push('## L06 /guess-the-kpop-song: Start, answer every round, Share (1440)');
await safe('L06', () => withPage(1440, async (page, log, stubbed) => {
  await page.goto(`${BASE}/guess-the-kpop-song`, { waitUntil: 'load', timeout: 90000 });
  await page.waitForTimeout(4000);
  await page.locator('[data-g3="start"]').first().click();
  await page.waitForTimeout(3000);
  const n = await playThrough(page);
  out.push(`answered rounds: ${n}`);
  await page.locator('button:has-text("Share")').first().click();
  await page.waitForTimeout(3000);
  out.push(...logLines(log), ...stubLines(stubbed));
}));

// T01: theme page "Play this playlist" -> generate payload (passed: read-only route)
out.push('', '## T01 /blindtest/5th-gen: Play this playlist (390)');
await safe('T01', () => withPage(390, async (page, log, stubbed) => {
  await page.goto(`${BASE}/blindtest/5th-gen`, { waitUntil: 'load', timeout: 90000 });
  await page.waitForTimeout(4000);
  await page.locator('[data-g3="play"]').first().click();
  await page.waitForTimeout(6000);
  out.push(...logLines(log), ...stubLines(stubbed));
}));

// T01 reply: direct read-only generate for the theme, songs must be 5th gen
await safe('T01b', async () => {
  const res = await fetch(`${BASE}/api/blind-test/generate`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ playlist: '5th-gen', count: 10 }) });
  const j: any = await res.json();
  const qs: any[] = j.questions ?? [];
  out.push(`T01b POST generate {playlist:'5th-gen',count:10} (read-only route) -> ${res.status}, ${qs.length} questions`);
  const ids = qs.map((q) => q.song_id ?? q.songId ?? q.id).filter(Boolean);
  if (ids.length) {
    const r = await rows(`songs?select=id,title,generation&id=in.(${ids.join(',')})`);
    const gens = Array.isArray(r.body) ? r.body.map((s: any) => s.generation ?? "null") : [];
    out.push(`T01b SQL generation of those songs: ${gens.join(',')}`);
  } else out.push(`T01b question keys: ${Object.keys(qs[0] ?? {}).join(',')}`);
});

// T02, T03, T05: server HTML of each playable theme
for (const t of ['kpop-hits-2025', '5th-gen', 'tiktok-viral']) {
  const r = await get(`/blindtest/${t}`);
  const h = hrefs(r.text);
  const items = (r.text.match(/<li[^>]*class="[^"]*g3-tr[^"]*"/g) ?? []).length;
  out.push(`T ${t}: ${r.status}; T02 /live link=${h.some((x) => x.startsWith('/live'))}; T03 track items=${items}; T05 kpdh bridge=${h.includes('/kpop-demon-hunters-quiz')}`);
}
for (const t of ['kpop-hits-2026', 'kpop-demon-hunters']) out.push(`T04 /blindtest/${t} -> ${(await get(`/blindtest/${t}`)).status}`);
write('batch2-evidence.txt', out);
console.log(out.join('\n'));
