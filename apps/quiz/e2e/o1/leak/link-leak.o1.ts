// Run O1, lane Q0a, leak suite: link leak (Q-bridges D0, check-network-links). As an anonymous visitor, every link
// to another FandomVerse site is on the allowlist (leak/link-allowlist.json, or F0's contract copy), carries no `via`,
// has the rel the allowlist asks, stays under its per-page cap; no head link (canonical, alternate) points to another
// network site; and the other world's domain appears nowhere in the HTML outside the allowlisted links.
// Two readings: the server HTML of the whole page set (what a crawler gets), and the hydrated DOM of the first pages
// in a browser (links a client component adds after load count too).
import { expect, test } from '@playwright/test';

import { analyzeHtml, checkLinks } from '../../../scripts/o1/leak-lib.mjs';
import { allowlistFile, contract, htmlPages, lines, readJson, required, siteState } from '../helpers/leak';

const HYDRATED = Number(process.env.O1_LEAK_HYDRATED_N ?? 5);

for (const site of ['kpop', 'anime', 'hub'] as const) {
  test(`link leak: cross-site links on ${site} are on the allowlist (server HTML)`, async () => {
    const st = await siteState(site);
    test.skip(st.state !== 'live' && !required(site), st.reason);
    expect(st.state, st.reason).toBe('live');
    const c = await contract();
    const allowlist = readJson<object>(allowlistFile());
    const pages = await htmlPages(site);
    expect(pages.length, `HTML pages read on ${site}`).toBeGreaterThan(0);
    const found: string[] = [];
    for (const pg of pages) {
      const { violations } = checkLinks({ site, path: pg.path, pageUrl: pg.url, an: analyzeHtml(pg.body), allowlist, contract: c });
      found.push(...lines(violations, pg.path));
    }
    test.info().annotations.push({ type: 'pages', description: `${pages.length} pages; allowlist ${allowlistFile()}` });
    expect(found, `cross-site link violations on ${site}`).toEqual([]);
  });

  test(`link leak: cross-site links on ${site} are on the allowlist (hydrated DOM)`, async ({ browser }) => {
    const st = await siteState(site);
    test.skip(st.state !== 'live' && !required(site), st.reason);
    test.skip(HYDRATED <= 0, 'O1_LEAK_HYDRATED_N=0');
    expect(st.state, st.reason).toBe('live');
    const c = await contract();
    const allowlist = readJson<object>(allowlistFile());
    const pages = (await htmlPages(site)).slice(0, HYDRATED);
    const ctx = await browser.newContext(); // fresh context: no cookie, no storage (anonymous)
    const found: string[] = [];
    try {
      for (const pg of pages) {
        const page = await ctx.newPage();
        // Read-only, local-only visit: GETs to the server under test go through; any other request (a non-GET, a
        // database, an analytics or audio host) is answered locally and never sent, so the browser reads no
        // database itself (rule 5: production is read by parity.sh only).
        const origin = new URL(pg.url).origin;
        await page.route('**/*', (route) => {
          const req = route.request();
          if (req.method() === 'GET' && new URL(req.url()).origin === origin) return route.continue();
          return req.method() === 'GET' ? route.abort('blockedbyclient') : route.fulfill({ status: 204, body: '' });
        });
        await page.goto(pg.url, { waitUntil: 'load' });
        await page.waitForTimeout(500);
        const html = await page.content();
        const { violations } = checkLinks({ site, path: pg.path, pageUrl: pg.url, an: analyzeHtml(html), allowlist, contract: c });
        // The domain-in-html rule reads the raw server HTML (test above); the live DOM is judged on its anchors.
        found.push(...lines(violations.filter((v: { code: string }) => v.code !== 'domain-in-html'), `${pg.path} (hydrated)`));
        await page.close();
      }
    } finally {
      await ctx.close();
    }
    expect(found, `cross-site link violations in the hydrated DOM on ${site}`).toEqual([]);
  });
}
