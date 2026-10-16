// Run O1, lane Q0a, leak suite: the JSON-LD spoiler leak hook (BACKLOG Q0; O3 adds the cases). A spoiler-tagged
// answer or fact never reaches the structured data a search engine shows in a snippet. Cases live in the lane's own
// folder, so the suite stays Q0a's and O3 needs no edit here:
//   apps/quiz/e2e/o1/O3/leak-cases.json   { "spoilerJsonLd": [ { "site": "anime", "path": "/q/<slug>",
//                                            "forbidden": ["<spoiler string>"], "note": "<why>" } ] }
// Each case: the page answers 200 and none of its JSON-LD blocks contains a forbidden string (case-insensitive).
import { expect, test } from '@playwright/test';

import { analyzeHtml, checkForbidden } from '../../../scripts/o1/leak-lib.mjs';
import { get, leakCases, required, siteState } from '../helpers/leak';

const CASES = leakCases('spoilerJsonLd');

test('spoiler JSON-LD hook: cases are registered', async () => {
  test.skip(CASES.length === 0, 'no case yet: O3 adds apps/quiz/e2e/o1/O3/leak-cases.json (key spoilerJsonLd)');
  for (const c of CASES) {
    expect(c.forbidden.length, `${c.lane} ${c.path}: a case lists at least one forbidden string`).toBeGreaterThan(0);
  }
});

for (const c of CASES) {
  test(`spoiler JSON-LD: ${c.site} ${c.path} (${c.lane})`, async () => {
    const st = await siteState(c.site);
    test.skip(st.state !== 'live' && !required(c.site), st.reason);
    expect(st.state, st.reason).toBe('live');
    const r = await get(c.site, c.path);
    expect(r.status, `${c.path} status`).toBe(200);
    const an = analyzeHtml(r.body);
    expect(an.jsonLd.length, `${c.path} has JSON-LD to judge`).toBeGreaterThan(0);
    expect(checkForbidden({ an, forbidden: c.forbidden, layer: 'jsonld' }).map((v: { detail: string }) => v.detail), `spoilers in the JSON-LD of ${c.path}`).toEqual([]);
  });
}
