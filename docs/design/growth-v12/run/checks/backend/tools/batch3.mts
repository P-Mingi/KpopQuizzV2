// C2 batch 3: K01 to K03, W01 to W05 (KPDH bridge quiz, Which member). Evidence: ../batch3-evidence.txt
import { BASE, get, hrefs, logLines, stubLines, withPage, write } from './c2-browser.mts';
import { count, rows } from './c2-read.mjs';

const out: string[] = [`C2 batch 3 at ${new Date().toISOString()} on ${BASE}`, ''];
const safe = async (label: string, fn: () => Promise<void>) => {
  try { await fn(); } catch (e) { out.push(`${label} ERROR ${(e as Error).message.split('\n')[0]}`); }
};

/** Intro CTA, then the first answer of every question until the result shows. */
async function runQuiz(path: string, width: number, label: string, again: boolean): Promise<void> {
  await withPage(width, async (page, log, stubbed) => {
    await page.goto(`${BASE}${path}`, { waitUntil: 'load', timeout: 90000 });
    await page.waitForTimeout(3000);
    await page.locator('.ux-pers-intro button, main button.ux-btn').first().click();
    let n = 0;
    let postsDuring = 0;
    for (let i = 0; i < 12; i++) {
      const opt = page.locator('.ux-pers-opt').first();
      if (!(await opt.isVisible().catch(() => false))) break;
      postsDuring += stubbed.length;
      await opt.click();
      n++;
      await page.waitForTimeout(900);
    }
    await page.waitForTimeout(2500);
    out.push(`${label}: answered ${n}; mutating calls before the result: ${postsDuring}`);
    const resultText = (await page.locator('main').innerText()).replace(/\s+/g, ' ');
    out.push(`${label} result excerpt: ${resultText.slice(0, 260)}`);
    const links = await page.locator('main a[href]').evaluateAll((as: any[]) => as.map((a) => a.getAttribute('href')));
    out.push(`${label} result links: ${[...new Set(links)].filter((h: string) => /quiz$|blindtest\/group-|^\/[a-z0-9-]+$/.test(h)).join(', ')}`);
    const bias = page.locator('[data-testid="pers-bias"] button');
    if (await bias.count()) {
      const before = stubbed.length;
      await bias.first().click();
      await page.waitForTimeout(2000);
      out.push(`${label} W04 Set bias (signed out): new mutating calls ${stubbed.length - before}; sign-in sheet visible=${await page.locator('[role="dialog"]').first().isVisible().catch(() => false)}`);
      await page.keyboard.press('Escape');
    }
    if (again) {
      const before = stubbed.length;
      await page.getByRole('button', { name: 'Retake' }).first().click();
      await page.waitForTimeout(1500);
      await page.locator('.ux-pers-intro button, main button.ux-btn').first().click();
      for (let i = 0; i < 12; i++) {
        const opt = page.locator('.ux-pers-opt').first();
        if (!(await opt.isVisible().catch(() => false))) break;
        await opt.click();
        await page.waitForTimeout(900);
      }
      await page.waitForTimeout(2500);
      out.push(`${label} second run same day: new mutating calls ${stubbed.length - before}`);
    }
    out.push(...logLines(log).filter((l) => !l.includes('/a0/styles')), ...stubLines(stubbed));
  });
}

out.push('## K: /kpop-demon-hunters-quiz (390)');
await safe('K', () => runQuiz('/kpop-demon-hunters-quiz', 390, 'K', false));
const kp = await get('/kpop-demon-hunters-quiz');
out.push(`K page ${kp.status}; img tags before the result: ${(kp.text.match(/<img /g) ?? []).length}`);

out.push('', '## W: /which-stray-kids-member-are-you (1440)');
await safe('W', () => runQuiz('/which-stray-kids-member-are-you', 1440, 'W', true));

await safe('W03', async () => {
  const g = await rows('groups?select=id,slug,name&slug=eq.stray-kids');
  const id = Array.isArray(g.body) && g.body[0] ? g.body[0].id : null;
  const all = await count('personality_results', `group_id=eq.${id}`);
  const bridge = await count('personality_results', `group_id=eq.${id}&member_name=eq.@kpop-demon-hunters-quiz`);
  const page = await get('/which-stray-kids-member-are-you');
  const m = /([0-9,]+)<!-- --> results|([0-9,]+) results/.exec(page.text);
  out.push(`W03 SQL personality_results group stray-kids: ${all.count} (bridge rows ${bridge.count}); served "${m ? (m[1] ?? m[2]) : 'none'} results"`);
});
for (const h of ['/stray-kids-quiz', '/blindtest/group-stray-kids']) out.push(`K03/W link target ${h} -> ${(await get(h)).status}`);
void hrefs;
write('batch3-evidence.txt', out);
console.log(out.join('\n'));
