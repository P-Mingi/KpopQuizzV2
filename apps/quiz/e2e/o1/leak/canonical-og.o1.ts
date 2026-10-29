// Run O1, lane Q0a, leak suite: canonical and OG per site. Never a cross-domain canonical: on every page of a site the
// canonical, og:url and hreflang alternates are on the site's own domain, og:site_name is the site's brand, og:image
// and twitter:image are on the own domain or Supabase storage (never another network site), JSON-LD urls never name
// the other world (the Bunnyverse parent organization excepted); robots.txt and sitemap.xml list own-domain URLs only.
import { expect, test } from '@playwright/test';

import { analyzeHtml, checkIdentity, checkRootFile } from '../../../scripts/o1/leak-lib.mjs';
import { contract, get, htmlPages, lines, required, siteState } from '../helpers/leak';

for (const site of ['kpop', 'anime', 'hub'] as const) {
  test(`canonical and OG: every ${site} page names ${site} only`, async () => {
    const st = await siteState(site);
    test.skip(st.state !== 'live' && !required(site), st.reason);
    expect(st.state, st.reason).toBe('live');
    const c = await contract();
    const pages = await htmlPages(site);
    expect(pages.length, `HTML pages read on ${site}`).toBeGreaterThan(0);
    const found: string[] = [];
    for (const pg of pages) found.push(...lines(checkIdentity({ site, an: analyzeHtml(pg.body), contract: c }), pg.path));
    for (const f of ['/robots.txt', '/sitemap.xml']) {
      const r = await get(site, f);
      if (r.status !== 200) {
        found.push(`${f} answered ${r.status}`);
        continue;
      }
      found.push(...lines(checkRootFile({ site, path: f, body: r.body, contract: c }), f));
    }
    expect(found, `identity violations on ${site}`).toEqual([]);
  });
}
