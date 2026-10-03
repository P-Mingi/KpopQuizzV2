// C2 flag-off probe (GET only). Run against ORCH's v11-only build:
//   C2_BASE=http://localhost:<port> node flag-off.mjs <label>   -> ../flag-off-<label>.txt
// Expected with NEXT_PUBLIC_UX_V12 unset: every v12 API route 404, every v12 page 404
// or a redirect away, no v12 control in the v11 pages. Each line says ok / DIFF.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.C2_BASE || 'http://localhost:3071';
const label = process.argv[2] || 'probe';
const out = [`C2 flag-off probe (${label}) at ${new Date().toISOString()} on ${BASE}`, ''];
const get = async (p) => {
  const r = await fetch(BASE + p, { redirect: 'manual' });
  return { status: r.status, location: r.headers.get('location'), text: await r.text() };
};
const check = (row, what, ok, seen) => out.push(`${ok ? 'ok  ' : 'DIFF'} ${row}\t${what}\t${seen}`);

const api404 = [
  ['V01', '/api/live'], ['V04', '/api/live/rooms/ABCDEF'], ['Q01', '/api/duel/pairs?group=bts'],
  ['H02', '/api/duel/fans-picked?group=bts'], ['S01', '/api/creators/kit?quiz=x'], ['C03', '/api/creators/standing'],
  ['E04', '/api/ux-v1/p11/team'], ['R01', '/api/track/bt-run'], ['V07', '/api/cron/live-expire'],
  ['R03', '/api/cron/fans-picked'], ['E06', '/api/cron/editorial-publish'], ['E05', '/api/admin/editorial'],
];
for (const [row, p] of api404) { const r = await get(p); check(row, `GET ${p} = 404`, r.status === 404, r.status); }

const pagesAway = [
  ['L01', '/guess-the-kpop-song'], ['L01', '/fr/blind-test-kpop'], ['L01', '/es/adivina-la-cancion-kpop'], ['L01', '/id/tebak-lagu-kpop'],
  ['K01', '/kpop-demon-hunters-quiz'], ['N01', '/stray-kids-name-all-members'], ['C01', '/creators'],
  ['V01', '/live'], ['V04', '/join'], ['V04', '/join/ABCDEF'], ['W01', '/which-stray-kids-member-are-you'],
];
for (const [row, p] of pagesAway) {
  const r = await get(p);
  check(row, `GET ${p} = 404 or 30x away`, r.status === 404 || (r.status >= 300 && r.status < 400 && r.location !== p), `${r.status} ${r.location ?? ''}`);
}

const hub = await get('/blindtest');
check('B01', '/blindtest has no Playlists rail theme link', !/href="\/blindtest\/(kpop-hits-2025|5th-gen|tiktok-viral)"/.test(hub.text), hub.status);
check('B03', '/blindtest has no live band', !hub.text.includes('Host a live blindtest'), '');
check('B04', '/blindtest has no landing link', !hub.text.includes('href="/guess-the-kpop-song"'), '');
for (const s of ['stray-kids', 'riize', 'katseye']) {
  const r = await get(`/${s}-quiz`);
  check('H01', `/${s}-quiz has no ways-to-play / empty / nudge v12 block`, !/name-all-members"|Be the first|Make the second|\/live\?playlist=/.test(r.text), r.status);
}
const lb = await get('/leaderboard');
check('C04', '/leaderboard has no /creators link', !lb.text.includes('href="/creators"'), lb.status);
const theme = await get('/blindtest/5th-gen');
check('T01', '/blindtest/5th-gen is the v11 mode page (no "Play this playlist")', !theme.text.includes('Play this playlist'), theme.status);

fs.writeFileSync(path.join(here, '..', `flag-off-${label}.txt`), out.join('\n') + '\n');
console.log(out.join('\n'));
