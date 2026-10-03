// C2 batch 7: V01 to V07 (live blindtest), fail-soft form. Evidence: ../batch7-evidence.txt
import { BASE, get, logLines, stubLines, withPage, write } from './c2-browser.mts';

const out: string[] = [`C2 batch 7 at ${new Date().toISOString()} on ${BASE}`, ''];
const safe = async (label: string, fn: () => Promise<void>) => {
  try { await fn(); } catch (e) { out.push(`${label} ERROR ${(e as Error).message.split('\n')[0]}`); }
};

for (const p of ['/api/live', '/api/live/rooms/ABCDEF', '/api/live/rooms/ABCDEF/state', '/api/cron/live-expire']) {
  const r = await get(p);
  out.push(`GET ${p} -> ${r.status} ${r.text.slice(0, 120)}`);
}
const bad = await get('/api/cron/live-expire', { headers: { Authorization: 'Bearer c2-wrong' } });
out.push(`GET /api/cron/live-expire with a wrong bearer -> ${bad.status}`);
for (const p of ['/live', '/join', '/join/ABCDEF']) {
  const r = await get(p);
  out.push(`GET ${p} -> ${r.status}; robots noindex=${/<meta name="robots" content="[^"]*noindex/.test(r.text)}`);
}

out.push('', '## /live host setup (1440)');
await safe('V01', () => withPage(1440, async (page, log, stubbed) => {
  await page.goto(`${BASE}/live`, { waitUntil: 'load', timeout: 90000 });
  await page.waitForTimeout(5000);
  const screen = page.locator('.ux-live-screen').first();
  out.push(`data-open=${await screen.getAttribute('data-open').catch(() => '?')}; closed note: "${await page.locator('.ux-live-closed').innerText().catch(() => 'absent')}"`);
  const open = page.getByRole('button', { name: 'Open the room' }).first();
  out.push(`"Open the room" present=${await open.count()} disabled=${await open.isDisabled().catch(() => '?')}`);
  if (await open.count()) { await open.click({ force: true }).catch(() => {}); await page.waitForTimeout(3000); }
  out.push(...logLines(log).filter((l) => !l.includes('/a0/styles')), ...stubLines(stubbed));
}));

out.push('', '## /join phone (390): code ABCDEF, nickname, Join');
await safe('V04', () => withPage(390, async (page, log, stubbed) => {
  await page.goto(`${BASE}/join`, { waitUntil: 'load', timeout: 90000 });
  await page.waitForTimeout(3000);
  await page.locator('input[id$="-code"]').first().fill('ABCDEF');
  await page.locator('input[id$="-nick"]').first().fill('C2check');
  await page.getByRole('button', { name: 'Join', exact: true }).first().click();
  await page.waitForTimeout(4000);
  out.push(`phone text: ${(await page.locator('main').innerText()).replace(/\s+/g, ' ').slice(0, 220)}`);
  out.push(...logLines(log).filter((l) => !l.includes('/a0/styles')), ...stubLines(stubbed));
}));

out.push('', '## /join/ABCDEF phone (390)');
await safe('V04b', () => withPage(390, async (page, log, stubbed) => {
  await page.goto(`${BASE}/join/ABCDEF`, { waitUntil: 'load', timeout: 90000 });
  await page.waitForTimeout(4000);
  out.push(`phone text: ${(await page.locator('main').innerText()).replace(/\s+/g, ' ').slice(0, 220)}`);
  out.push(...logLines(log).filter((l) => !l.includes('/a0/styles')), ...stubLines(stubbed));
}));
write('batch7-evidence.txt', out);
console.log(out.join('\n'));
