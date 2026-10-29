// Run O1, lane Q0a, leak suite: string leak (P-passport principle P2 and its mirror). No K-pop marker on an anime
// page, no anime marker on a kpop page, read on the text layer of the anonymous server HTML: visible text, content
// attributes, title, text metas, JSON-LD and the page data (React Flight copy, module rows and asset paths left out).
// The links the allowlist admits (the /about lines) are dropped first. Markers: leak/string-markers.json.
// The signed-in half of P2 (a fixture user with a K-pop bias, groups, header and bio, seen on bunnyverse.org/anime) needs
// the dev branch and the fixture users: content-leak.o1.ts holds it.
import path from 'node:path';

import { expect, test } from '@playwright/test';

import { analyzeHtml, checkLinks, checkStrings, compileMarkers } from '../../../scripts/o1/leak-lib.mjs';
import { LEAK_DIR, allowlistFile, contract, htmlPages, lines, readJson, required, siteState } from '../helpers/leak';

type Markers = { markers: Record<string, { id: string; re: string; flags?: string }[]> };

for (const site of ['anime', 'kpop'] as const) {
  const what = site === 'anime' ? 'no K-pop string on anime pages (P2)' : 'no anime string on kpop pages (P2 mirror)';
  test(`string leak: ${what}`, async () => {
    const st = await siteState(site);
    test.skip(st.state !== 'live' && !required(site), st.reason);
    expect(st.state, st.reason).toBe('live');
    const c = await contract();
    const markers = compileMarkers(readJson<Markers>(path.join(LEAK_DIR, 'string-markers.json')).markers[site]);
    const allowlist = readJson<object>(allowlistFile());
    const pages = await htmlPages(site);
    expect(pages.length, `HTML pages read on ${site}`).toBeGreaterThan(0);
    const found: string[] = [];
    for (const pg of pages) {
      const an = analyzeHtml(pg.body);
      const { allowed } = checkLinks({ site, path: pg.path, pageUrl: pg.url, an, allowlist, contract: c });
      found.push(...lines(checkStrings({ an, markers, dropRaw: allowed }), pg.path));
    }
    test.info().annotations.push({ type: 'pages', description: `${pages.length} pages; contract ${c.source}` });
    expect(found, `marker strings on ${site}`).toEqual([]);
  });
}
