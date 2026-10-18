// Run O1, lane Q0a, leak suite: route leak. Every kpop route answers 404 on the anime and hub builds (BACKLOG Q0,
// 5.1 "Route map per site": "Must 404"). The list: F0's KPOP_ONLY_SAMPLES and KPOP_DATA_SAMPLES (until F0 merges, one
// sample per prefix of lib/route-allowlist.ts outside the site's route map, and BACKLOG's data samples), plus every
// path of the 60-URL parity list that the site's route map does not know. One GET each, no redirect followed: a 3xx
// is a leak too (the kpop legacy redirects never run on another site).
import { expect, test } from '@playwright/test';

import { routeLeakPaths } from '../../../scripts/o1/leak-contract';
import { contract, get, required, siteState } from '../helpers/leak';

for (const site of ['anime', 'hub'] as const) {
  test(`route leak: every kpop route answers 404 on ${site}`, async () => {
    const st = await siteState(site);
    test.skip(st.state !== 'live' && !required(site), st.reason);
    expect(st.state, st.reason).toBe('live');
    const c = await contract();
    const paths = routeLeakPaths(c, site);
    expect(paths.length, 'the route leak list is never empty').toBeGreaterThan(40);
    const wrong: string[] = [];
    for (const p of paths) {
      const r = await get(site, p);
      if (r.status !== 404) wrong.push(`${p} answered ${r.status}${r.location ? ` -> ${r.location}` : ''}`);
    }
    test.info().annotations.push({ type: 'contract', description: `${c.source}; ${paths.length} paths` });
    expect(wrong, `kpop routes reachable on ${site}`).toEqual([]);
  });
}

for (const site of ['anime', 'hub'] as const) {
  test(`site identity: the ${site} server serves ${site}`, async () => {
    const st = await siteState(site);
    test.skip(st.state !== 'live' && !required(site), st.reason);
    expect(st.state, st.reason).toBe('live');
    const home = await get(site, '/');
    expect(home.status, `${site} home`).toBe(200);
    expect(home.body, `<html data-site="${site}"> on the ${site} home`).toMatch(new RegExp(`<html\\b[^>]*\\bdata-site="${site}"`));
  });
}
