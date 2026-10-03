// C2 batch 5: Q01 to Q05 (This or that bonus card). Evidence: ../batch5-evidence.txt
import { BASE, logLines, stubLines, withPage, write } from './c2-browser.mts';
import { rows } from './c2-read.mjs';

const out: string[] = [`C2 batch 5 at ${new Date().toISOString()} on ${BASE}`, ''];
const safe = async (label: string, fn: () => Promise<void>) => {
  try { await fn(); } catch (e) { out.push(`${label} ERROR ${(e as Error).message.split('\n')[0]}`); }
};
const QUIZ = 'ultimate-bts-era-quiz-only-real-armys-survive';
const ANON = '00000000-0000-4000-8000-00000000c2c2';

// Q01 direct: pairs for bts, songs must belong to an active song question of BTS
await safe('Q01', async () => {
  for (const g of ['bts', 'aespa', 'blackpink', 'stray-kids']) {
    const r = await fetch(`${BASE}/api/duel/pairs?group=${g}`, { headers: { 'x-duel-anon': ANON } });
    const j: any = await r.json();
    const pairs: any[] = j.pairs ?? [];
    out.push(`Q01 GET /api/duel/pairs?group=${g} -> ${r.status}; keys ${Object.keys(j).join(',')}; pairs ${pairs.length}; ranked ${j.ranked}; pair keys ${Object.keys(pairs[0] ?? {}).join(',')}`);
    if (g === 'bts' && pairs.length) {
      const ids = [...new Set(pairs.flatMap((p) => [p.a?.id, p.b?.id]).filter(Boolean))];
      const q = await rows(`duel_questions?select=id,active,group_id,question_type&limit=50`);
      const qs = Array.isArray(q.body) ? q.body : [];
      out.push(`Q01 duel_questions (read): ${qs.length} rows, active ${qs.filter((x: any) => x.active).length}`);
      const rr = await rows(`duel_ratings?select=entity_id,question_id&entity_id=in.(${ids.join(',')})`);
      const found = Array.isArray(rr.body) ? new Set(rr.body.map((x: any) => x.entity_id)) : new Set();
      const s = await rows(`songs?select=id,title,group_id&id=in.(${ids.join(',')})`);
      out.push(`Q01 bts pair songs ${ids.length}; in duel_ratings ${[...found].length}; in songs ${Array.isArray(s.body) ? s.body.length : s.status} (${Array.isArray(s.body) ? s.body.map((x: any) => x.title).slice(0, 6).join(', ') : ''})`);
    }
  }
});

// Q03: forged token, refused before any database call (lib/duel/service.ts castVote L128)
await safe('Q03', async () => {
  const r = await fetch(`${BASE}/api/duel/vote`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-duel-anon': ANON }, body: JSON.stringify({ token: 'c2.forged.token', winner: 'a' }) });
  out.push(`Q03 POST /api/duel/vote forged token -> ${r.status} ${await r.text()}`);
});

// Q01, Q02, Q04, Q05 in the browser: play the BTS quiz, the card, a vote (stubbed), Next / Skip
out.push('', '## browser: /q/<bts quiz> to results, bonus card (1440)');
await safe('Qb', () => withPage(1440, async (page, log, stubbed) => {
  await page.goto(`${BASE}/q/${QUIZ}`, { waitUntil: 'load', timeout: 90000 });
  await page.locator('.p4-act[data-ready], .p4-qq').first().waitFor({ state: 'attached', timeout: 90000 });
  await page.waitForTimeout(1500);
  await page.locator('.p4-act .ux-btn-primary').click();
  await page.locator('.p4-qq').waitFor({ timeout: 90000 });
  for (let i = 0; i < 40; i++) {
    await page.locator('.p4-answers .p4-ans, .p4-igrid .p4-ians').first().click();
    const next = page.locator('.p4-nextrow .ux-btn-primary');
    await next.waitFor({ timeout: 15000 });
    const label = await next.innerText();
    await next.click();
    if (/result/i.test(label)) break;
    await page.waitForTimeout(300);
  }
  await page.locator('.p4-pcard').waitFor({ timeout: 30000 });
  const card = page.locator('.ux-tot').first();
  await card.waitFor({ timeout: 20000 }).catch(() => {});
  out.push(`card visible: ${await card.isVisible().catch(() => false)}; heading "${await card.locator('h2').innerText().catch(() => '')}"`);
  const before = stubbed.length;
  await card.locator('.ux-toto').nth(0).click().catch(() => {});
  await page.waitForTimeout(2000);
  out.push(`Q02 new mutating calls after one tap: ${stubbed.length - before}; card text: ${(await card.innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 200)}`);
  const n2 = stubbed.length;
  const skip = card.getByRole('button', { name: /Skip|Next pair|Finish/ }).first();
  const skipLabel = await skip.innerText().catch(() => 'none');
  await skip.click().catch(() => {});
  await page.waitForTimeout(1500);
  out.push(`Q04 "${skipLabel}" clicked: new mutating calls ${stubbed.length - n2}`);
  const picked = await page.locator('a[href*="#fans-picked"]').count();
  out.push(`Q05 links to #fans-picked on the results page: ${picked}`);
  out.push(...logLines(log).filter((l) => !l.includes('/a0/styles')), ...stubLines(stubbed));
}));
write('batch5-evidence.txt', out);
console.log(out.join('\n'));
