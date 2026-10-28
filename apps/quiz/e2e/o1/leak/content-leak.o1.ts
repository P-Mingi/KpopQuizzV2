// Run O1, lane Q0a, leak suite: content leak (BACKLOG Q0: "an anime row on the branch never appears on kpop lists,
// sitemap, search, bell, badge shelf, passport stats, activity, with SITE_SCOPE on"; P2's signed-in half; the mirror
// on anime). The cases are written now and skip, saying why, until their three conditions hold:
//   - a dev branch with the fixture rows (O1_ENV=dev or scratch from scripts/o1/env.sh; owner gate G1),
//   - B2's SITE_SCOPE on in the server under test (O1_SITE_SCOPE=1, set by gate-checks.sh when it starts it so),
//   - a positive control: the fixture series are visible on fandomverse.org/anime itself, so an absence on kpop means scope,
//     not missing data.
// Fixture strings: the series fixtures of BACKLOG 5.1 (Death Note, One Piece, Spy x Family) and, on the mirror, the
// K-pop groups of the fixture users (BTS, BLACKPINK, TWICE: bias and groups of the kpop-heavy fixture).
// The signed-in surfaces (bell, badge shelf, passport stats, activity) also need a fixture session (Q0b's auth suite,
// owner gate G2): they skip with that reason until the suite provides one.
import { expect, test } from '@playwright/test';

import { analyzeHtml, checkForbidden } from '../../../scripts/o1/leak-lib.mjs';
import { get, required, siteState } from '../helpers/leak';

const ANIME_FIXTURES = ['Death Note', 'One Piece', 'Spy x Family'];
const KPOP_FIXTURES = ['BTS', 'BLACKPINK', 'TWICE'];

const DEV = process.env.O1_ENV === 'dev' || process.env.O1_ENV === 'scratch';
const SCOPE = process.env.O1_SITE_SCOPE === '1';
const WHY_DEV = `content leak needs a dev branch with the fixture rows (owner gate G1); O1_ENV is ${process.env.O1_ENV || 'unset'}`;
const WHY_SCOPE = "content leak needs B2's SITE_SCOPE on in the server under test (O1_SITE_SCOPE=1)";
const WHY_SESSION = "needs a fixture sign-in on the dev branch (Q0b's auth suite, owner gates G1 and G2)";

/** Anonymous kpop surfaces that list content: no fixture name anywhere in their HTML. */
const KPOP_LISTS = ['/quizzes', '/trending', '/new', '/most-liked', '/groups', '/leaderboard', '/creators', '/trivia', '/blindtest', '/sitemap.xml', '/llms.txt'];
/** Anonymous anime surfaces of the mirror. */
const ANIME_LISTS = ['/', '/series', '/sitemap.xml', '/llms.txt'];

/**
 * A search page echoes its query, so it is judged on its results: no link to a quiz or a hub (/q/..., /x-quiz,
 * /x-trivia) whose text names the fixture.
 */
function searchHits(body: string, pageUrl: string, name: string): string[] {
  const low = name.toLowerCase();
  return analyzeHtml(body)
    .anchors.filter((a: { href: string; text: string }) => {
      let p = '';
      try {
        p = new URL(a.href, pageUrl).pathname;
      } catch {
        return false;
      }
      return /^\/(q\/|[a-z0-9-]+-(quiz|trivia)$)/.test(p) && a.text.toLowerCase().includes(low);
    })
    .map((a: { href: string }) => a.href);
}

async function positiveControl(): Promise<string | null> {
  const anime = await siteState('anime');
  if (anime.state !== 'live') return `positive control needs the anime server: ${anime.reason}`;
  const r = await get('anime', '/series');
  const seen = ANIME_FIXTURES.filter((s) => r.body.includes(s));
  return seen.length ? null : 'positive control: no fixture series visible on fandomverse.org/anime /series (fixture rows missing on the branch)';
}

test('content leak: no anime fixture row on kpop lists, sitemap, search and llms.txt', async () => {
  test.skip(!DEV, WHY_DEV);
  test.skip(!SCOPE, WHY_SCOPE);
  const st = await siteState('kpop');
  test.skip(st.state !== 'live' && !required('kpop'), st.reason);
  const control = await positiveControl();
  expect(control, 'positive control').toBeNull();
  const found: string[] = [];
  for (const p of KPOP_LISTS) {
    const r = await get('kpop', p);
    if (r.status >= 500) found.push(`${p} answered ${r.status}`);
    for (const v of checkForbidden({ an: analyzeHtml(r.body), forbidden: ANIME_FIXTURES, layer: 'raw' })) found.push(`${p} ${v.detail}`);
  }
  for (const s of ANIME_FIXTURES) {
    const p = `/search?q=${encodeURIComponent(s)}`;
    const r = await get('kpop', p);
    for (const h of searchHits(r.body, r.url, s)) found.push(`${p} result ${h}`);
  }
  expect(found, 'anime rows on kpopquiz.org').toEqual([]);
});

test('content leak mirror: no kpop row on anime lists, sitemap, search and llms.txt', async () => {
  test.skip(!DEV, WHY_DEV);
  test.skip(!SCOPE, WHY_SCOPE);
  const st = await siteState('anime');
  test.skip(st.state !== 'live' && !required('anime'), st.reason);
  const found: string[] = [];
  for (const p of ANIME_LISTS) {
    const r = await get('anime', p);
    if (r.status >= 500) found.push(`${p} answered ${r.status}`);
    // Word match: "BTS" inside another word is not a leak.
    for (const s of KPOP_FIXTURES) if (new RegExp(`\\b${s}\\b`).test(r.body)) found.push(`${p} ${s}`);
  }
  for (const s of KPOP_FIXTURES) {
    const p = `/search?q=${encodeURIComponent(s)}`;
    const r = await get('anime', p);
    for (const h of searchHits(r.body, r.url, s)) found.push(`${p} result ${h}`);
  }
  expect(found, 'kpop rows on fandomverse.org/anime').toEqual([]);
});

for (const surface of ['bell (/notifications)', 'badge shelf (/me)', 'passport stats (/me)', 'activity (/u/<fixture>)']) {
  test(`content leak, signed in: no anime fixture row in the kpop ${surface}`, async () => {
    test.skip(!DEV, WHY_DEV);
    test.skip(!SCOPE, WHY_SCOPE);
    test.skip(true, WHY_SESSION);
  });
  test(`P2 signed in: the kpop-heavy fixture's bias, groups, header and bio stay off the anime ${surface}`, async () => {
    test.skip(!DEV, WHY_DEV);
    test.skip(!SCOPE, WHY_SCOPE);
    test.skip(true, WHY_SESSION);
  });
}
