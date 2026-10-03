// C2 batch 4: N01 to N06 (Name them all). Evidence: ../batch4-evidence.txt
import { BASE, get, logLines, stubLines, withPage, write } from './c2-browser.mts';
import { rows } from './c2-read.mjs';

const out: string[] = [`C2 batch 4 at ${new Date().toISOString()} on ${BASE}`, ''];
const safe = async (label: string, fn: () => Promise<void>) => {
  try { await fn(); } catch (e) { out.push(`${label} ERROR ${(e as Error).message.split('\n')[0]}`); }
};
const PATH = '/stray-kids-name-all-members';

// N04: roster from SQL vs served slots
const g = await rows('groups?select=id,name&slug=eq.stray-kids');
const gid = Array.isArray(g.body) && g.body[0] ? g.body[0].id : null;
const idols = await rows(`idols?select=name,ord&group_id=eq.${gid}&active=eq.true&detached_at=is.null&order=ord.asc,id.asc`);
const names: string[] = Array.isArray(idols.body) ? idols.body.map((i: any) => i.name) : [];
const page = await get(PATH);
const slots = (page.text.match(/class="ux-nta-slot"/g) ?? []).length;
out.push(`N04 SQL active idols of stray-kids: ${names.length} (${names.join(', ')}); served ${page.status}, slots in HTML ${slots}, title "${/<h1[^>]*>(.*?)<\/h1>/.exec(page.text)?.[1]?.replace(/<!-- -->/g, '') ?? ''}"`);

async function round(width: number, typed: string[], giveUp: boolean, label: string): Promise<void> {
  await withPage(width, async (p, log, stubbed) => {
    await p.goto(`${BASE}${PATH}`, { waitUntil: 'load', timeout: 90000 });
    await p.waitForTimeout(3000);
    await p.locator('[data-testid="nta-start"]').click();
    await p.waitForTimeout(500);
    const input = p.locator('.ux-nta-form input').first();
    for (const n of typed) { await input.fill(n); await input.press('Enter'); await p.waitForTimeout(300); }
    out.push(`${label} N01 mutating calls during the round (after ${typed.length} names): ${stubbed.length}; count shown ${await p.locator('[data-testid="nta-count"]').innerText().catch(() => '?')}`);
    if (giveUp) await p.getByRole('button', { name: 'Give up' }).click();
    await p.waitForTimeout(3000);
    const text = (await p.locator('main').innerText()).replace(/\s+/g, ' ');
    out.push(`${label} N05 community lines shown: ${/named all|Named first/i.test(text)}`);
    out.push(`${label} result excerpt: ${text.slice(0, 200)}`);
    const hdr = await p.evaluate(() => null);
    void hdr;
    out.push(...logLines(log).filter((l) => !l.includes('/a0/styles')), ...stubLines(stubbed));
  });
}

out.push('', '## N02 all found (390)');
await safe('N02', () => round(390, names, false, 'N02'));
out.push('', '## N03 two names then Give up (1440)');
await safe('N03', () => round(1440, names.slice(0, 2).reverse(), true, 'N03'));

// N06: requests the route refuses before any write (lib/name-all/submit.ts: L29 browser id,
// L35 unknown group, L38 unknown member; saveRound is only reached at L44).
out.push('', '## N06 route guard (refused before the save)');
const anon = '00000000-0000-4000-8000-00000000c002';
const send = async (body: unknown, hdr: Record<string, string>) => {
  const r = await fetch(`${BASE}/api/name-all/result`, { method: 'POST', headers: { 'content-type': 'application/json', ...hdr }, body: JSON.stringify(body) });
  return `${r.status} ${await r.text()}`;
};
out.push(`N06 no x-nta-anon: ${await send({ group: 'stray-kids', found: [], seconds: 5, gaveUp: true }, {})}`);
out.push(`N06 unknown group: ${await send({ group: 'no-such-group-c2', found: [], seconds: 5, gaveUp: true }, { 'x-nta-anon': anon })}`);
out.push(`N06 unknown member: ${await send({ group: 'stray-kids', found: ['Not A Member C2'], seconds: 5, gaveUp: true }, { 'x-nta-anon': anon })}`);
write('batch4-evidence.txt', out);
console.log(out.join('\n'));
