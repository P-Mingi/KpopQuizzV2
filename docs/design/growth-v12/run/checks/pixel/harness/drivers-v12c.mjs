// C1 (V12 run) drivers, part 3: G8 hubs, share kit, /creators; G4 live (not-live form); G9 Team posts
// (hidden form). Pairs, flows and fixtures from apps/quiz/e2e/ux-v12/g8.spec.ts, g4.spec.ts, g9.spec.ts.
import path from 'node:path';
import { NAV, openV12, json } from './drivers-v12.mjs';
import { WT, waitHydrated } from './drivers-v11.mjs';

const HUB_PRIMARY = '#ghub-play .ux-btn-primary';
const WAYS = [
  { name: 'ways tile', proto: '.gtile', impl: '.g8-ways .ux-gtile', box: [], why: 'width, height: the tile count and copy are the group\'s real ones (G8)' },
  { name: 'section title', proto: '.sec-h h2', impl: '.g8-ways .ux-sec-h h2', box: ['h'] },
  { name: 'hero action', proto: '.btn-primary', impl: HUB_PRIMARY, box: ['h'] },
];
const hub = (slug, ready) => (page) => openV12(page, `/${slug}-quiz`, ready);
const FP_PENDING = 'NOT verified until v12-g7-this-or-that.sql and v12-g7-song-questions.sql are applied and a group passes the 100-vote floor (no group is ranked: the section and its tile are absent, checked)';

export const G8 = {
  'hub-ways-to-play': { owner: 'G8', auth: 'guest', anchor: '.g8-ways', open: hub('stray-kids', '[data-testid="hub-ways"]'), lm: [...NAV, ...WAYS] },
  'hub-fans-picked': { owner: 'G8', auth: 'guest', anchor: '.g8-ways', pending: FP_PENDING,
    open: async (page, s) => { await hub('stray-kids', '[data-testid="hub-ways"]')(page); s.hidden = { fansPicked: await page.getByTestId('hub-fans-picked').count(), fpTile: await page.locator('a.ux-gtile[href="#fans-picked"]').count() }; },
    lm: [...NAV, ...WAYS] },
  'hub-empty-riize': { owner: 'G8', auth: 'guest', anchor: '.g8-fcreate', open: hub('riize', '[data-testid="hub-first"]'),
    lm: [{ name: 'be the first', proto: '.fcreate', impl: '.g8-fcreate', box: ['x', 'w'], why: 'height: the signals are the real ones (G8)' },
      { name: 'template', proto: '.tpl', impl: '.g8-tpl', box: ['w', 'h'] },
      { name: 'create button', proto: '.btn-primary', impl: '.g8-fcreate .ux-btn-primary', box: ['h'] }] },
  'hub-thin-katseye': { owner: 'G8', auth: 'guest', anchor: '.g8-nudge', open: hub('katseye', '[data-testid="hub-nudge"]'),
    lm: [{ name: 'nudge', proto: '.nudge', impl: '.g8-nudge', box: ['x', 'w'], why: 'height: the body line is the real play count or none (G8)' }, ...WAYS] },
  'share-kit': { owner: 'G8', auth: 'user', anchor: null, open: shareKit,
    note: 'create done reached with the P5 sample draft, the publish and the kit read answered locally (G8 fixture, linkPlays null: "plays from your link" NOT verified until v12-g8-share-link-plays.sql)',
    lm: [{ name: 'story card', proto: '.kit .story', impl: '.g8-kit-story .ux-story', box: ['w', 'h'] },
      { name: 'kit section', proto: '.kitsec', impl: '.g8-kitsec', box: ['w'], over: { m: { w: null } }, why: 'height: the local link; 390 width: the prototype kit is 440px on a 390 screen and scrolls sideways (G8)' }] },
  creators: { owner: 'G8', auth: 'guest', anchor: null, open: (page) => openV12(page, '/creators', '.g8-cbgrid'),
    note: 'Rising in each fandom: shown only with real rows; compared when present',
    lm: [...NAV, { name: 'creator board', proto: '.cbgrid', impl: '.g8-cbgrid', box: ['x', 'w'], why: 'height: real rows (G8)' },
      { name: 'tiers', proto: '.tiers3', impl: '.g8-tiers', box: ['w', 'h'] },
      { name: 'create button', proto: '.btn-primary', impl: '.g8-cb-cta', box: ['h'] },
      { name: 'rising', proto: '.rising', impl: '.g8-rising', box: ['x', 'w'], why: 'height: one row per real fandom (G8)', optional: 'real data: Rising in each fandom is hidden while no fandom has a first quiz with plays this month (G8)' }] },
};

async function shareKit(page) {
  const { SAMPLE_DRAFT } = await import(path.join(WT, 'docs/design/ux-dashboard-v1/v11/reports/P5/sample-draft.mjs'));
  const FAKE = { id: '0e8e2c4a-6b1f-4c1e-9a43-0c6f0b9d8a11', slug: 'g8-e2e-slug', creator_stats: { quizzes_created: 2, plays_received: 5 } };
  await page.route('**/api/quiz/create', (r) => (r.request().method() === 'GET' ? r.continue() : json(r, FAKE)));
  await page.route('**/api/quiz/title-check**', (r) => json(r, { exists: false }));
  await page.route('**/api/creators/kit**', (r) => json(r, { quiz: { id: FAKE.id, slug: FAKE.slug, title: SAMPLE_DRAFT.title, questions: 3 }, group: { name: 'BTS', slug: 'bts', fandom: 'ARMY' }, linkPlays: null }));
  const seed = JSON.stringify({ ...SAMPLE_DRAFT, updatedAt: Date.now() });
  await page.addInitScript(({ d }) => { try { if (sessionStorage.getItem('c1-seeded')) return; sessionStorage.setItem('c1-seeded', '1'); localStorage.removeItem('ux:pending-action'); localStorage.setItem('kq_create_draft_v1', d); localStorage.setItem('kq_create_step_v1', '3'); } catch { /* blocked */ } }, { d: seed });
  await page.goto('/create?resume=publish', { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await waitHydrated(page);
  await page.locator('.p5-done').waitFor({ timeout: 60_000 });
  await page.getByTestId('open-share-kit').click();
  await page.getByTestId('share-kit').waitFor();
  await page.locator('.g8-kit-story .ux-story').waitFor();
  await page.waitForTimeout(800);
}

// ---- G4 live: every state needs a live room; POST /api/live answers 503 until the SQL is applied.
const G4_PENDING = 'NOT verified until v12-g4-live.sql (and v12-g4-party-rls.sql) are applied: /api/live answers 503, no room can open; checked in its not-live form';
async function liveNotLive(page, s) {
  await openV12(page, '/live', '.ux-live-screen');
  await page.locator('.ux-live-screen:not([data-open="checking"])').waitFor({ timeout: 30_000 });
  s.hidden = { dataOpen: await page.locator('.ux-live-screen').getAttribute('data-open'), dataState: await page.locator('.ux-live-screen').getAttribute('data-state') };
}
const LIVE_LM = [...NAV, { name: 'screen', proto: '.screen', impl: '.ux-live-screen', box: ['x', 'w'] }];
export const G4 = Object.fromEntries(['live-setup', 'live-lobby', 'live-join', 'live-round', 'live-answer', 'live-reveal', 'live-board', 'live-end'].map((id) => [id, { owner: 'G4', auth: 'guest', anchor: null, pending: G4_PENDING, open: liveNotLive, lm: id === 'live-setup' ? LIVE_LM : [] }]));
// The prototype's live-join is the HOST screen once a phone has joined (lobby + toast), not the /join page: it
// needs a room too. The /join page itself renders without the SQL; its form is recorded in the hidden form.
G4['live-join'].open = async (page, s) => {
  await liveNotLive(page, s);
  const r = await page.request.get('/join');
  s.hidden.joinPage = r.status();
};

// ---- G9 Team posts: the editorial tables do not exist, so no Team post exists; the feed shows none.
const G9_PENDING = 'NOT verified until v12-g9-editorial.sql and v12-g9-editorial-accounts.sql are applied (no editorial account or post exists); the feed is checked to carry no Team badge';
export const G9 = {
  'community-team-post': { owner: 'G9', auth: 'guest', anchor: null, pending: G9_PENDING,
    open: async (page, s) => { await openV12(page, '/community', '.p8-feed'); s.hidden = { teamTags: await page.locator('.ux-teamtag, .ux-ava-team').count() }; }, lm: [...NAV] },
  'post-team': { owner: 'G9', auth: 'guest', anchor: null, pending: G9_PENDING,
    open: async (page, s) => { await openV12(page, '/community', '.p8-feed'); s.hidden = { teamTags: await page.locator('.ux-teamtag, .ux-ava-team').count() }; }, lm: [...NAV] },
};
