// C1 pixel checker (V12 run): drivers for the 40 v12 states of capture-v12.mjs on the flag-on build
// and the landmark pairs (prototype selector -> implementation selector). The pairs, URLs, ready
// signals and fixtures are the page agents' own (apps/quiz/e2e/ux-v12/g*.spec.ts), so the checker
// measures what each agent proved; skips carry the agent's documented reason. Every mutating request
// is answered locally by the runner's write guard before any of these run.
//
// Landmark fields: name, proto, impl, box (parts compared within 2px against the live prototype in the
// same state: x, w, h, vy), skip (style props not compared), why, over (per screen prefix d | m: expected
// box values that are recorded deviations, e.g. { m: { w: 336.8 } }).
// State fields: owner, auth ('guest' | 'user'), anchor (impl element framed like the reference:
// scrolled to the top with 80px above it; null = top of the page), open(page), lm, pending (reason the
// state is NOT verified), note.
import { waitHydrated, hasShell } from './drivers-v11.mjs';

export const PHOTO = ['background-image', 'background-color', 'color', 'border-top-color', 'font-size', 'font-weight', 'line-height', 'letter-spacing'];
export const NAV = [{ name: 'nav', proto: '.nav', impl: '.ux-nav', box: ['x', 'w', 'h'] }];
export const json = (route, body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

/** goto + ready selector, up to 4 loads (shared DB reads can time out on a cold server). */
export async function openV12(page, url, ready, { attempts = 4, timeout = 45_000 } = {}) {
  let last = null;
  for (let i = 0; i < attempts; i++) {
    const res = i === 0 ? await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120_000 }) : await page.reload({ waitUntil: 'domcontentloaded', timeout: 120_000 });
    if (!res || res.status() !== 200) { last = new Error(`${url}: HTTP ${res && res.status()}`); await page.waitForTimeout(2500); continue; }
    if (!(await hasShell(page))) throw new Error(`${url}: no v11 shell (flag off?)`);
    try {
      if (ready) await page.locator(ready).first().waitFor({ state: 'attached', timeout });
      await waitHydrated(page);
      return res;
    } catch (e) { last = e; }
  }
  throw new Error(`${url}: "${ready}" never rendered (${last && String(last.message).split('\n')[0]})`);
}

// ---- blindtest fixtures (g3.spec.ts; v11 P6): silent clips, generate and the daily read answered locally
const TITLES = ["God's Menu", 'How You Like That', 'Supernova', 'Hype Boy', 'Dynamite', 'FANCY', 'HOT', 'SHEESH', 'LOVE DIVE', 'Guerrilla'];
const ARTISTS = ['Stray Kids', 'BLACKPINK', 'aespa', 'NewJeans', 'BTS', 'TWICE', 'SEVENTEEN', 'BABYMONSTER', 'IVE', 'ATEEZ'];
function btq(i) {
  const artist = i % 3 === 1; const pool = artist ? ARTISTS : TITLES; const correct = pool[i];
  const choices = [1, 2, 3].map((k) => pool[(i + k) % pool.length]); choices.splice(i % 4, 0, correct);
  return { song_id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`, question_type: artist ? 'artist' : 'title', question_text: artist ? 'Which group is this?' : 'Name the song', preview_url: `https://cdnt-preview.dzcdn.net/api/c1-test/${i}.mp3`, album_cover_medium: '/mascot/mascot-default.png', album_cover_big: '/mascot/mascot-default.png', correct_answer: correct, choices, reveal: { title: TITLES[i], artist: ARTISTS[i], album: `Album ${i + 1}`, cover: '/mascot/mascot-default.png' } };
}
const BTQ = Array.from({ length: 10 }, (_, i) => btq(i));
export async function btFixtures(page) {
  await page.route(/cdnt-preview\.dzcdn\.net/, (r) => r.fulfill({ status: 200, contentType: 'audio/wav', body: Buffer.alloc(64, 0) }));
  await page.route((u) => u.pathname === '/api/blind-test/generate', (r) => json(r, { questions: BTQ }));
  await page.route((u) => u.pathname === '/api/daily/blindtest', (r) => json(r, { date: 'fixture', questions: BTQ, timer_duration: 10, songs_count: 10 }));
  await page.route((u) => u.pathname === '/api/ranked/me', (r) => json(r, { ranked: 'not_live' }, 503));
}

// ---- G3: hub rail, live band, landings, themed playlists
const LAND = { en: '/guess-the-kpop-song', fr: '/fr/blind-test-kpop', es: '/es/adivina-la-cancion-kpop', id: '/id/tebak-lagu-kpop' };
const openLand = (lang) => async (page) => { await btFixtures(page); await openV12(page, LAND[lang], '.g3-land[data-live]'); };
const LAND_LM = [...NAV,
  { name: 'hero', proto: '.landhero', impl: '.g3-landhero', box: ['x', 'w'], skip: [], why: 'height: the "fans playing today" eyebrow is hidden until bt_runs exists (G3 report), so the hero is one line shorter' },
  { name: 'H1', proto: '.landhero h1', impl: '.g3-landhero h1', box: ['x'] },
  { name: 'language switch', proto: '.langsw', impl: '.g3-landtop .ux-langsw', box: ['w', 'h'], over: { m: { w: 336.8 } }, why: 'm width: A1 deviation 1, the prototype switch is 11px wider than its phone column and scrolls sideways' },
  { name: 'start button', proto: '.btn-primary', impl: '.g3-landhero .ux-btn-primary', box: ['h'] },
  { name: 'section title', proto: '.sec-h h2', impl: '.g3-land .ux-sec-h h2', box: ['h'] },
];
const THEME_CARD = { name: 'theme card', proto: '.thrail .thm', impl: '#g3-th .ux-thm', box: ['w'], why: 'height: a card is as tall as its copy (playable themes, real counts)' };
const openTheme = (id) => async (page) => { await btFixtures(page); await openV12(page, `/blindtest/${id}`, '.g3-theme[data-live]'); };
const themeLm = (kpdh) => [...NAV,
  { name: 'playlist hero', proto: '.plhero', impl: '.g3-plhero', box: ['x', 'w'], why: 'height: the hero is as tall as its lead (G3)' },
  { name: 'song row', proto: '.tracks .tr', impl: '.g3-tr', box: ['w', 'h'] },
  ...(kpdh ? [{ name: 'bridge card', proto: '.bridge', impl: '.g3-bridge', box: ['w', 'h'] }] : []),
  { name: 'play button', proto: '.btn-primary', impl: '[data-g3="play"]', box: ['h'] },
];
const G2_03 = 'NOT verified until v12-g2-03-releases-2026.sql is applied (kpop-hits-2026 has under 10 playable songs; the page answers 404 and the hub hides its card)';
const G2_07 = 'NOT verified until v12-g2-07-kpdh.sql is applied (the KPop Demon Hunters playlist has no songs yet; the page answers 404 and the hub hides its card)';
const openHidden = (id) => async (page, s) => {
  const res = await page.goto(`/blindtest/${id}`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  s.hiddenStatus = res && res.status();
  if (s.hiddenStatus !== 404) throw new Error(`/blindtest/${id} answered ${s.hiddenStatus}, expected 404 while its SQL is pending`);
};

export const G3 = {
  'bthub-playlists': { owner: 'G3', auth: 'guest', anchor: '#bt-th', open: async (page) => { await btFixtures(page); await openV12(page, '/blindtest', '.p6-hub[data-live]'); },
    lm: [...NAV, { ...THEME_CARD, impl: '#bt-th .ux-thm' }, { name: 'section title', proto: '.sec-h h2', impl: '.ux-sec-h:has(#g3-pl-h) h2', box: ['h'] }] },
  'bthub-live-band': { owner: 'G3', auth: 'guest', anchor: '.g3-liveband', open: async (page) => { await btFixtures(page); await openV12(page, '/blindtest', '.p6-hub[data-live]'); },
    lm: [{ name: 'live band', proto: '.liveband', impl: '.g3-liveband', box: ['x', 'w', 'h'] }, { name: 'band button', proto: '.liveband .btn-primary', impl: '.g3-liveband .ux-btn-primary', box: ['h'] }] },
  'land-en': { owner: 'G3', auth: 'guest', anchor: null, open: openLand('en'), lm: [...LAND_LM, THEME_CARD, { name: 'steps', proto: '.steps3', impl: '#g3-steps', box: ['w', 'h'] }] },
  'land-en-steps': { owner: 'G3', auth: 'guest', anchor: '#g3-steps', open: openLand('en'), lm: [{ name: 'steps', proto: '.steps3', impl: '#g3-steps', box: ['x', 'w', 'h', 'vy'] }] },
  'land-en-faq': { owner: 'G3', auth: 'guest', anchor: '#g3-faq', open: openLand('en'), lm: [{ name: 'FAQ', proto: '#ld-faq', impl: '#g3-faq', box: ['x', 'w', 'vy'] }] },
  'land-fr': { owner: 'G3', auth: 'guest', anchor: null, open: openLand('fr'), lm: LAND_LM },
  'land-es': { owner: 'G3', auth: 'guest', anchor: null, open: openLand('es'), lm: LAND_LM },
  'land-id': { owner: 'G3', auth: 'guest', anchor: null, open: openLand('id'), lm: LAND_LM },
  'theme-hits26': { owner: 'G3', auth: 'guest', anchor: null, pending: G2_03, open: openHidden('kpop-hits-2026'), lm: [] },
  'theme-hits25': { owner: 'G3', auth: 'guest', anchor: null, open: openTheme('kpop-hits-2025'), lm: themeLm(false) },
  'theme-gen5': { owner: 'G3', auth: 'guest', anchor: null, open: openTheme('5th-gen'), lm: themeLm(false) },
  'theme-viral': { owner: 'G3', auth: 'guest', anchor: null, open: openTheme('tiktok-viral'), lm: themeLm(false) },
  'theme-kpdh': { owner: 'G3', auth: 'guest', anchor: null, pending: G2_07, open: openHidden('kpop-demon-hunters'), lm: [] },
  'theme-kpdh-tracks': { owner: 'G3', auth: 'guest', anchor: null, pending: G2_07, open: openHidden('kpop-demon-hunters'), lm: [] },
};
