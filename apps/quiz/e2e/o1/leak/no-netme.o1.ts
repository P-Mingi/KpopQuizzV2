// Run O1, lane Q0a, leak suite: the NetMe endpoint stays out of the server HTML (Q-bridges D0 acceptance: "an
// anonymous curl of 20 pages shows no /api/n/me call in server HTML"). NetMe is personal and private, no-store: a
// server render that fetches it or names it would put a signed-in surface in cached, crawlable HTML.
import { expect, test } from '@playwright/test';

import { checkNoNetMe } from '../../../scripts/o1/leak-lib.mjs';
import { get, lines, pagesFor, required, siteState } from '../helpers/leak';

const N = 20;

for (const site of ['kpop', 'anime', 'hub'] as const) {
  test(`no /api/n/me in the server HTML of ${N} ${site} pages`, async () => {
    const st = await siteState(site);
    test.skip(st.state !== 'live' && !required(site), st.reason);
    expect(st.state, st.reason).toBe('live');
    const paths = (await pagesFor(site)).slice(0, N);
    const found: string[] = [];
    const statuses = new Map<number, number>();
    for (const p of paths) {
      const r = await get(site, p);
      statuses.set(r.status, (statuses.get(r.status) || 0) + 1);
      // Every answer is judged, error pages included (an error page is server HTML too).
      found.push(...lines(checkNoNetMe(r.body), p));
    }
    const summary = [...statuses].sort((a, b) => a[0] - b[0]).map(([s, n]) => `${n}x ${s}`).join(', ');
    test.info().annotations.push({ type: 'pages', description: `${paths.length} pages read: ${summary}` });
    expect(statuses.get(200) || 0, `pages answering 200 on ${site} (${summary})`).toBeGreaterThan(0);
    expect(found, `/api/n/me in server HTML on ${site}`).toEqual([]);
  });
}
