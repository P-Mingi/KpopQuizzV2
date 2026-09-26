import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test } from '@playwright/test';

import { basicA11y, runAxe } from './helpers/a11y';
import { signedInTest, skipUnlessSignedIn } from './helpers/auth';
import { guardWrites } from './helpers/guard';
import { compareLandmarks, loadReference } from './helpers/landmarks';
import { hasShell, horizontalOverflow, preparePage, THEMES, waitHydrated, widthOf } from './helpers/setup-page';
import { SAMPLE_DRAFT } from '../../../../docs/design/ux-dashboard-v1/v11/reports/P5/sample-draft.mjs';

import type { Page, Route } from '@playwright/test';
import type { Landmark, ReferenceStyles } from './helpers/landmarks';
import type { StubbedCall } from './helpers/guard';
import type { Theme } from './helpers/setup-page';

// P5 create funnel (UX v11.2: DESIGN-SPEC 14.5, 16.6, 16.7, 17.9; WIRING-MAP 6).
//
// Production-write rules (ORCH, until the owner answers): every page is wrapped in
// guardWrites() (each mutating request is answered locally and recorded) and the
// specs assert the recorded payloads; nothing is created or published. The publish
// endpoints get a local fake answer so the done state can be checked. /create's GET
// path only reads (groups; client: session, profiles row, title-check), so it is
// visited signed in as the parity test user too. The draft lives in the test
// browser's localStorage (the prototype's sample, v11/reports/P5/sample-draft.mjs).

test.describe.configure({ timeout: 120_000 });
signedInTest.describe.configure({ timeout: 120_000 });

const here = path.dirname(fileURLToPath(import.meta.url));
const PROTO = JSON.parse(fs.readFileSync(path.resolve(here, '../../../../docs/design/ux-dashboard-v1/v11/reports/P5/proto-create.json'), 'utf8')) as Record<string, Record<string, Record<string, unknown>>>;

type Draft = typeof SAMPLE_DRAFT;
type State = 'create-1' | 'create-2' | 'create-3' | 'signin';
const STEP: Record<State, 1 | 2 | 3> = { 'create-1': 1, 'create-2': 2, 'create-3': 3, signin: 3 };

// The live /create (flag off) served these; the flag-on page must serve the same (SEO lock).
const LIVE = {
  title: 'Create a quiz | KpopQuiz',
  description: 'Create a K-pop quiz in minutes and challenge your fandom.',
  robots: 'noindex, follow',
  h1: "What's your quiz about?",
  intro: 'No account needed to start. You can change everything later.',
};

const FAKE_QUIZ = { id: 'p5-e2e-id', slug: 'p5-e2e-slug', creator_stats: { quizzes_created: 2, plays_received: 5 } };
const FAKE_UPLOAD = 'https://example.supabase.co/storage/v1/object/public/quiz-images/p5-e2e.jpg';
// 1x1 PNG, the smallest real image for the cover / picture inputs.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');

interface Open { calls: StubbedCall[]; posts: { url: string; body: string | null }[] }

/**
 * Opens /create with an optional draft at a step. Writes are stubbed (guardWrites);
 * the publish endpoints answer a local fake; the title check is pinned to "no
 * duplicate" (the sample title exists live) so the layout is deterministic.
 */
async function openCreate(page: Page, o: { theme: Theme; draft?: Draft | null; step?: 1 | 2 | 3; query?: string; titleExists?: boolean; noProfile?: boolean; pending?: boolean; routes?: (p: Page) => Promise<void> }): Promise<Open> {
  await preparePage(page, o.theme);
  const calls = await guardWrites(page);
  const posts: Open['posts'] = [];
  const fake = (json: unknown) => async (route: Route): Promise<void> => {
    if (route.request().method() === 'GET') { await route.continue(); return; }
    posts.push({ url: new URL(route.request().url()).pathname, body: route.request().postData() });
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(json) });
  };
  await page.route('**/api/quiz/create', fake(FAKE_QUIZ));
  await page.route('**/api/quiz/upload-image', fake({ url: FAKE_UPLOAD }));
  await page.route('**/api/quiz/title-check**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ exists: o.titleExists ?? false }) }));
  if (o.noProfile) {
    // A signed-in account without a profiles row (the inline username claim).
    await page.route((u) => u.pathname.endsWith('/rest/v1/profiles') && u.searchParams.get('select') === 'username', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  }
  if (o.routes) await o.routes(page);
  const seed = o.draft === undefined ? null : o.draft === null ? null : JSON.stringify({ ...o.draft, updatedAt: Date.now() });
  await page.addInitScript(({ d, s, p }) => {
    try {
      if (sessionStorage.getItem('p5-seeded')) return;
      sessionStorage.setItem('p5-seeded', '1');
      // A0's pending action as the sign-in sheet leaves it (lib/ux-v1/a0/pending-action)
      if (p) localStorage.setItem('ux:pending-action', JSON.stringify({ id: 'p5:publish', path: '/create', at: Date.now() }));
      else localStorage.removeItem('ux:pending-action');
      if (d) localStorage.setItem('kq_create_draft_v1', d); else localStorage.removeItem('kq_create_draft_v1');
      if (s) localStorage.setItem('kq_create_step_v1', s); else localStorage.removeItem('kq_create_step_v1');
    } catch { /* blocked */ }
  }, { d: seed, s: seed ? String(o.step ?? 1) : null, p: o.pending === true });
  await page.goto(`/create${o.query ?? ''}`);
  await waitHydrated(page);
  await page.locator('.p5-col[data-ready="1"]').waitFor({ timeout: 30_000 });
  // The dev server reads the live groups with a 5 s timeout (safeFetch); under load it
  // can fall back to an empty list. Read again rather than test a degraded page.
  for (let i = 0; i < 3 && (await page.locator('.p5-col[data-groups="0"]').count()) > 0; i++) {
    await page.reload();
    await page.locator('.p5-col[data-ready="1"]').waitFor({ timeout: 30_000 });
  }
  return { calls, posts };
}

async function toState(page: Page, state: State): Promise<void> {
  await expect(page.locator(`.p5-pane[data-step="${STEP[state]}"]`)).toBeVisible();
  if (state === 'create-2') await page.locator('#p5-qt-1').click();
  if (state === 'signin') { await page.locator('.p5-next').click(); await expect(page.locator('.ux-sheet')).toBeVisible(); }
  await page.mouse.move(1, 1);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
}

const draftIn = (page: Page): Promise<Record<string, unknown> | null> =>
  page.evaluate(() => { const r = localStorage.getItem('kq_create_draft_v1'); return r ? JSON.parse(r) as Record<string, unknown> : null; });

// ---------------------------------------------------------------------------
// Prototype landmarks: computed styles + boxes of the #create view (capture:
// v11/reports/P5/capture-proto-create.mjs). Boxes are compared relative to the
// stepper (the live H1 and intro above it are shorter than the prototype's copy,
// SEO lock), or in viewport coordinates for the sticky bar and the sheet.
// ---------------------------------------------------------------------------

type BoxPart = 'x' | 'y' | 'w' | 'h';
/** `phone`: extra skips at 390 (each one explained where it is used). */
interface P5Landmark { proto: string; impl: string; state: State; skip?: string[]; noBox?: boolean; boxSkip?: BoxPart[]; phone?: { skip?: string[]; boxSkip?: BoxPart[] } }
// On touch screens the row actions (duplicate, delete) sit on the open row only: the
// prototype keeps them invisible (opacity 0) but tappable on every row, which is a
// hidden tap target. Closed rows therefore give their text the actions' room at 390.
const TOUCH_ROW: P5Landmark['phone'] = { boxSkip: ['x', 'w'] };
const TEXT = ['width'];
const PHOTO = ['background-image', 'background-color'];
const L: P5Landmark[] = [
  // header + stepper (the H1 is focusable, tabindex -1: its resting radius is not a style)
  { proto: '#create .ph h1', impl: '.p5-ph h1', state: 'create-1', skip: [...TEXT, 'border-radius', 'border-top-color'], boxSkip: ['w', 'y'] },
  { proto: '#create .ph p', impl: '.p5-ph p', state: 'create-1', skip: [...TEXT, 'height'], noBox: true },
  { proto: '#cstep', impl: '.p5-stepper', state: 'create-1' },
  { proto: '#cstep .st.on', impl: '.p5-st.is-on .p5-st-b', state: 'create-1', skip: ['border-radius'] },
  { proto: '#cstep .st.on .c', impl: '.p5-st.is-on .p5-st-c', state: 'create-1' },
  { proto: '#cstep .st.on .c', impl: '.p5-st.is-on .p5-st-c', state: 'create-2' },
  { proto: '#cstep .st.done .c', impl: '.p5-st.is-done .p5-st-c', state: 'create-2' },
  { proto: '#cstep .st.done .c', impl: '.p5-st.is-done .p5-st-c', state: 'create-3' },
  // step 1
  { proto: '#cp-1 .field', impl: '.p5-pane[data-step="1"] > .ux-field', state: 'create-1' },
  { proto: '#cp-1 .field > label', impl: '.p5-pane[data-step="1"] > .ux-field > label', state: 'create-1' },
  { proto: '#cp-1 .field > label small', impl: '.p5-pane[data-step="1"] > .ux-field > label small', state: 'create-1' },
  { proto: '#c-title', impl: '#p5-title', state: 'create-1' },
  { proto: '#c-about', impl: '#p5-about', state: 'create-1' },
  { proto: '#cp-1 .flabel', impl: '#p5-type-l', state: 'create-1' },
  { proto: '#types', impl: '.p5-opts', state: 'create-1' },
  { proto: '#types .opt.on', impl: '.p5-opt.is-on', state: 'create-1' },
  { proto: '#types .opt:not(.on)', impl: '.p5-opt:not(.is-on)', state: 'create-1' },
  { proto: '#types .opt.on .rd', impl: '.p5-opt.is-on .p5-rd', state: 'create-1' },
  { proto: '#types .opt .ico', impl: '.p5-opt.is-on > .ux-ico', state: 'create-1' },
  { proto: '#types .opt b', impl: '.p5-opt.is-on b', state: 'create-1', skip: TEXT, boxSkip: ['w'] },
  { proto: '#types .opt small', impl: '.p5-opt.is-on small', state: 'create-1', skip: TEXT, boxSkip: ['w'] },
  { proto: '#types .opt .ex', impl: '.p5-opt.is-on .p5-opt-ex', state: 'create-1' },
  { proto: '#cp-1 .inp.focus', impl: '.p5-gbox', state: 'create-1' },
  { proto: '#cp-1 .gchip', impl: '.p5-gchip', state: 'create-1' },
  { proto: '#cp-1 .gchip .gav', impl: '.p5-gchip .p5-gav', state: 'create-1', skip: PHOTO },
  { proto: '#cp-1 .seg', impl: '.p5-pane .ux-seg', state: 'create-1' },
  { proto: '#cp-1 .seg button.on', impl: '.p5-pane .ux-seg [aria-pressed="true"]', state: 'create-1' },
  { proto: '#cp-1 .seg button:not(.on)', impl: '.p5-pane .ux-seg [aria-pressed="false"]', state: 'create-1' },
  // a native <select> keeps room for the chevron (padding-right 44); same box, same text position
  { proto: '#cp-1 .field:nth-child(6) .inp', impl: '#p5-lang', state: 'create-1', skip: ['padding-right'] },
  { proto: '.covgrid', impl: '.p5-covgrid', state: 'create-1', boxSkip: ['h'] },
  { proto: '.covgrid .qcov', impl: '.p5-cov', state: 'create-1', skip: PHOTO },
  { proto: '.covgrid .drop', impl: '.p5-drop', state: 'create-1' },
  { proto: '.covgrid .check', impl: '.p5-rights .ux-check', state: 'create-1' },
  { proto: '.covgrid .check i', impl: '.p5-rights .ux-check i', state: 'create-1' },
  // step 2 (row 2 open)
  { proto: '#cp-2 .field', impl: '.p5-qfield', state: 'create-2', boxSkip: ['h'] },
  { proto: '#cp-2 .flabel', impl: '#p5-ql-l', state: 'create-2' },
  { proto: '#cp-2 .flabel small', impl: '#p5-ql-l small', state: 'create-2' },
  { proto: '#qlist .qitem', impl: '.p5-qitem', state: 'create-2' },
  { proto: '#qlist .qitem.open', impl: '.p5-qitem.is-open', state: 'create-2' },
  { proto: '#qlist .qitem:nth-child(4)', impl: '.p5-qitem:nth-child(4)', state: 'create-2' },
  { proto: '.qhead', impl: '.p5-qhead', state: 'create-2' },
  { proto: '.qhead .n', impl: '.p5-qn', state: 'create-2' },
  { proto: '.qhead .q', impl: '.p5-qq', state: 'create-2', phone: TOUCH_ROW },
  { proto: '.qhead .q.w', impl: '.p5-qq.is-w', state: 'create-2', phone: TOUCH_ROW },
  { proto: '.qhead .st2.ok', impl: '.p5-qst.is-ok', state: 'create-2', phone: TOUCH_ROW },
  { proto: '.qhead .st2.w', impl: '.p5-qst.is-w', state: 'create-2', phone: TOUCH_ROW },
  // at 390 the first visible actions are the open row's (see TOUCH_ROW)
  { proto: '.qhead .acts', impl: '.p5-acts', state: 'create-2', skip: ['opacity'], phone: { boxSkip: ['y'] } },
  { proto: '.qbody', impl: '.p5-qbody', state: 'create-2' },
  { proto: '.qbody .field', impl: '.p5-qbody .ux-field', state: 'create-2' },
  { proto: '.qbody .field > label', impl: '.p5-qbody .ux-field > label', state: 'create-2' },
  { proto: '.qbody .flabel', impl: '.p5-qbody .ux-flabel', state: 'create-2' },
  { proto: '.qbody .flabel small', impl: '.p5-qbody .ux-flabel small', state: 'create-2' },
  { proto: '.qbody .inp', impl: '.p5-qbody .p5-auto', state: 'create-2' },
  { proto: '.arow', impl: '.p5-arow', state: 'create-2' },
  { proto: '.arow.on .rd', impl: '.p5-arow.is-on .p5-ard', state: 'create-2' },
  { proto: '.arow.on .inp', impl: '.p5-arow.is-on .ux-inp', state: 'create-2' },
  { proto: '.arow:not(.on) .inp', impl: '.p5-arow:not(.is-on) .ux-inp', state: 'create-2' },
  { proto: '#cp-2 .btn-ghost', impl: '.p5-qadd .ux-btn-ghost', state: 'create-2' },
  { proto: '#cp-2 .btn-quiet', impl: '.p5-qadd .ux-btn-quiet', state: 'create-2' },
  // step 3
  { proto: '#cp-3 .field', impl: '.p5-pubfield', state: 'create-3', phone: { boxSkip: ['h'] } },
  { proto: '#cp-3 .flabel', impl: '.p5-pubfield .ux-flabel', state: 'create-3' },
  // the note under the checklist is one line shorter on phones: the legacy publish drops
  // incomplete questions and clears the draft, so "until you finish it" would not be true
  { proto: '.pubgrid', impl: '.p5-pubgrid', state: 'create-3', phone: { boxSkip: ['h'] } },
  { proto: '#pubcard', impl: '.p5-pubcard', state: 'create-3' },
  { proto: '#pubcard .qcov', impl: '.p5-card .ux-qcov', state: 'create-3', skip: PHOTO },
  { proto: '#pubcard .qb', impl: '.p5-card .ux-qb', state: 'create-3' },
  { proto: '#pubcard .qg', impl: '.p5-card .ux-qg', state: 'create-3' },
  { proto: '#pubcard .qf', impl: '.p5-card .ux-qf', state: 'create-3' },
  { proto: '.pubgrid .rows', impl: '.p5-checks', state: 'create-3' },
  { proto: '.pubgrid .row', impl: '.p5-check', state: 'create-3' },
  { proto: '.pubgrid .row .ico', impl: '.p5-check > .ux-ico', state: 'create-3' },
  { proto: '.pubgrid .row .grow', impl: '.p5-check .ux-row-grow', state: 'create-3', skip: TEXT, boxSkip: ['w'] },
  { proto: '.pubgrid .row .end', impl: '.p5-check .ux-row-end', state: 'create-3' },
  { proto: '#cp-3 .help', impl: '.p5-note', state: 'create-3', skip: [...TEXT, 'height'], boxSkip: ['w', 'h'] },
  // the sticky bar (all steps)
  ...(['create-1', 'create-2', 'create-3'] as const).flatMap((s): P5Landmark[] => [
    { proto: '#cbar', impl: '.p5-bar', state: s },
    { proto: '#cbar .cbar-in', impl: '.p5-bar-in', state: s },
    { proto: '#cstt', impl: '.p5-stt', state: s, skip: [...TEXT, 'height'], boxSkip: ['w', 'h', 'y'] },
    { proto: '#cstt b', impl: '.p5-stt b', state: s, skip: TEXT, boxSkip: ['y', 'x'] },
    { proto: '#cstt .dotok', impl: '.p5-dot', state: s, skip: TEXT, boxSkip: ['w', 'x', 'y'] },
    // at 390 on step 2 the prototype's status squeezes and pushes its buttons 6px past
    // the gutter (horizontal overflow); the implementation keeps them inside
    { proto: '#cnext', impl: '.p5-next', state: s, ...(s === 'create-2' ? { phone: { boxSkip: ['x'] as BoxPart[] } } : {}) },
    { proto: '#cback', impl: '.p5-bar .ux-btn-ghost', state: s, ...(s === 'create-2' ? { phone: { boxSkip: ['x'] as BoxPart[] } } : {}) },
  ]),
  // A0's sign-in sheet opened by Publish
  { proto: '#signin', impl: '.ux-sheet', state: 'signin' },
  // A0's sheet title is 18/1.4 (25.2px) where the prototype's is 18/1.6: request to A0 (requests/P5.md)
  { proto: '#signin .sh-h h3', impl: '.ux-sheet .ux-sh-h h2', state: 'signin', skip: ['line-height'], boxSkip: ['h', 'y'] },
  { proto: '#si-p', impl: '.ux-sheet .ux-sh-p', state: 'signin' },
  { proto: '#signin .authb', impl: '.ux-sheet .ux-authb', state: 'signin' },
  { proto: '#signin .or', impl: '.ux-sheet .ux-or', state: 'signin' },
  { proto: '#si-e', impl: '.ux-sheet input[type="email"]', state: 'signin' },
  { proto: '#signin form .btn', impl: '.ux-sheet form .ux-btn', state: 'signin' },
  { proto: '#signin .help', impl: '.ux-sheet .ux-help', state: 'signin' },
];

/** proto-create.json in the A0 comparator's shape ({ key: { selector: styles + width/height } }). */
function protoRef(): ReferenceStyles {
  const out: ReferenceStyles = {};
  for (const [k, sels] of Object.entries(PROTO)) {
    out[k] = {};
    for (const [s, v] of Object.entries(sels)) {
      if (s === '__doc') continue;
      const box = v.box as number[];
      const styles: Record<string, string> = {};
      for (const [p, val] of Object.entries(v)) if (p !== 'box') styles[p] = String(val);
      styles.width = `${box[2]}px`;
      styles.height = `${box[3]}px`;
      out[k]![s] = styles;
    }
  }
  return out;
}
const REF = protoRef();

async function boxes(page: Page, sels: string[]): Promise<Record<string, [number, number, number, number] | null>> {
  return page.evaluate((list) => {
    const o: Record<string, [number, number, number, number] | null> = {};
    for (const s of list) {
      const el = Array.from(document.querySelectorAll<HTMLElement>(s)).find((e) => e.offsetParent !== null || getComputedStyle(e).position === 'fixed');
      if (!el) { o[s] = null; continue; }
      const r = el.getBoundingClientRect();
      o[s] = [r.x + scrollX, r.y + scrollY, r.width, r.height];
    }
    return o;
  }, sels);
}

async function checkLandmarks(page: Page, state: State, theme: Theme): Promise<string[]> {
  const width = widthOf(page);
  const key = `${width}-${theme}-${state}`;
  const phone = width < 500;
  const list = L.filter((l) => l.state === state).map((l) => (phone && l.phone
    ? { ...l, skip: [...(l.skip ?? []), ...(l.phone.skip ?? [])], boxSkip: [...(l.boxSkip ?? []), ...(l.phone.boxSkip ?? [])] }
    : l));
  const problems: string[] = [];
  // computed styles (A0 comparator: exact, px sizes within 2)
  // sizes are compared below on the bounding boxes (computed width / height is 'auto' on inline boxes)
  const lms: Landmark[] = list.map((l) => ({ proto: l.proto, impl: l.impl, state: l.state, box: [], skip: [...(l.skip ?? []), 'width', 'height'] }));
  const r = await compareLandmarks(page, width, theme, lms, REF);
  for (const m of r.mismatches) problems.push(`${m.landmark} ${m.prop}: expected ${m.expected}, got ${m.actual}`);
  for (const m of r.missing) problems.push(`missing ${m}`);
  // positions: x within 2, y relative to the stepper within 2 (viewport y for sticky / fixed)
  const vh = page.viewportSize()?.height ?? 900;
  const got = await boxes(page, [...list.map((l) => l.impl), '.p5-stepper']);
  const protoStep = (PROTO[key]?.['#cstep']?.box as number[] | undefined) ?? null;
  const protoBar = PROTO[key]?.['#cbar']?.box as number[] | undefined;
  const barStuck = !!protoBar && Math.abs(protoBar[1]! + protoBar[3]! - vh) < 2;
  const implStep = got['.p5-stepper'];
  const pageY: number = await page.evaluate(() => window.scrollY);
  for (const l of list) {
    if (l.noBox) continue;
    const pb = PROTO[key]?.[l.proto]?.box as number[] | undefined;
    const ib = got[l.impl];
    if (!pb || !ib) continue;
    // the bar is sticky: where the prototype's bar sits at the viewport bottom, compare in viewport y
    const inBar = /p5-bar|p5-stt|p5-dot|p5-next/.test(l.impl);
    const fixed = state === 'signin' || (inBar && barStuck);
    const skip = new Set(l.boxSkip ?? []);
    if (!skip.has('x') && Math.abs(pb[0]! - ib[0]) > 2) problems.push(`${l.proto} x: expected ${pb[0]}, got ${ib[0].toFixed(2)}`);
    if (!skip.has('w') && Math.abs(pb[2]! - ib[2]) > 2) problems.push(`${l.proto} w: expected ${pb[2]}, got ${ib[2].toFixed(2)}`);
    if (!skip.has('h') && Math.abs(pb[3]! - ib[3]) > 2) problems.push(`${l.proto} h: expected ${pb[3]}, got ${ib[3].toFixed(2)}`);
    if (!skip.has('y')) {
      const py = fixed || !protoStep ? pb[1]! : pb[1]! - protoStep[1]!;
      const iy = fixed || !implStep ? ib[1] - pageY : ib[1] - implStep[1];
      if (Math.abs(py - iy) > 2) problems.push(`${l.proto} y${fixed ? '' : ' (from the stepper)'}: expected ${py.toFixed(2)}, got ${iy.toFixed(2)}`);
    }
  }
  return problems;
}

// ---------------------------------------------------------------------------

test.describe('P5 SEO lock and shell', () => {
  test('server HTML keeps the live title, meta, robots, H1 and intro; no canonical, no JSON-LD change', async ({ request, page }) => {
    const res = await request.get('/create');
    expect(res.status()).toBe(200);
    const html = await res.text();
    test.skip(!html.includes('ux-app'), 'flag off');
    expect(html).toContain(`<title>${LIVE.title}</title>`);
    expect(html).toContain(`<meta name="description" content="${LIVE.description}"/>`);
    expect(html).toContain(`<meta name="robots" content="${LIVE.robots}"/>`);
    expect(html).not.toContain('rel="canonical"');
    const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/g)].map((m) => m[1]!.replace(/<[^>]+>/g, '').replace(/&#x27;/g, "'"));
    expect(h1s).toEqual([LIVE.h1]);
    expect(html).toContain(`<p>${LIVE.intro}</p>`);
    // the funnel is server rendered (step 1 fields are in the HTML)
    for (const id of ['p5-title', 'p5-about', 'p5-group-q', 'p5-lang']) expect(html).toContain(`id="${id}"`);
    // create shell mode: nav kept; tab bar and footer hidden by CSS (still in the HTML)
    await preparePage(page, 'light');
    await guardWrites(page);
    await page.goto('/create');
    await waitHydrated(page);
    await expect(page.locator('.ux-nav')).toBeVisible();
    await expect(page.locator('.ux-foot')).toBeHidden();
    await expect(page.locator('.ux-tabbar')).toBeHidden();
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  });
});

for (const theme of THEMES) {
  test.describe(`P5 ${theme}`, () => {
    for (const state of ['create-1', 'create-2', 'create-3', 'signin'] as const) {
      test(`${state}: matches the prototype (styles and boxes), axe clean, no write`, async ({ page }) => {
        const { calls } = await openCreate(page, { theme, draft: SAMPLE_DRAFT, step: STEP[state] });
        test.skip(!(await hasShell(page)), 'flag off');
        await toState(page, state);
        if (state === 'create-1') {
          // the prototype draws the group field focused; let the (reduced-motion) transition settle
          await page.locator('#p5-group-q').focus();
          await expect(page.locator('.p5-gbox')).toHaveCSS('border-top-color', 'rgb(232, 69, 122)'); // --ux-pink, both themes
        }
        const problems = await checkLandmarks(page, state, theme);
        expect(problems, problems.join('\n')).toEqual([]);
        // the reference .qcard landmark (styles.json) for the card preview
        if (state === 'create-3' || state === 'signin') {
          const r = await compareLandmarks(page, widthOf(page), theme, [{ proto: '.qcard', impl: '.p5-card', state, box: ['width', 'height'] }], loadReference());
          expect(r.mismatches, JSON.stringify(r.mismatches)).toEqual([]);
          expect(r.checked).toEqual(['.qcard']);
        }
        const axe = await runAxe(page, state === 'signin' ? { include: '.ux-sheet' } : { include: '.ux-page' });
        if (axe) expect(axe, JSON.stringify(axe, null, 1)).toEqual([]);
        expect(await basicA11y(page)).toEqual([]);
        expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
        expect(calls).toEqual([]);
      });
    }
  });
}

test.describe('P5 step 1 (guest)', () => {
  test('gate, errors, focus, combobox, custom group, type, difficulty, language, cover, autosave', async ({ page }) => {
    const { calls } = await openCreate(page, { theme: 'light', draft: null });
    test.skip(!(await hasShell(page)), 'flag off');
    // fresh: empty title, no group, step 1 current
    await expect(page.locator('.p5-st.is-on .p5-st-b')).toHaveAttribute('aria-current', 'step');
    await expect(page.locator('#p5-title')).toHaveValue('');
    await expect(page.getByTestId('p5-status')).toContainText('1 of 3');
    // "Add questions" shows what is missing and focuses the first gap (title)
    await page.locator('.p5-next').click();
    await expect(page.locator('#p5-title')).toBeFocused();
    await expect(page.locator('#p5-title')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#p5-title-e')).toHaveText('Add at least 5 characters.');
    await expect(page.locator('#p5-group-h')).toHaveText('Pick a group to continue.');
    await page.locator('#p5-title').fill('My e2e quiz title');
    await expect(page.locator('#p5-title-e')).toHaveText('');
    await page.locator('.p5-next').click();
    await expect(page.locator('#p5-group-q')).toBeFocused();

    // combobox: type, arrow, Enter picks; the chip shows; the help names the fandom
    const combo = page.locator('#p5-group-q');
    await combo.fill('bts');
    await expect(combo).toHaveAttribute('aria-expanded', 'true');
    const list = page.locator('.p5-glist');
    await expect(list.getByRole('option', { name: 'BTS', exact: true })).toBeVisible();
    await expect(list.locator('.p5-gopt-new')).toContainText('New group or artist: bts');
    await combo.press('Enter');
    await expect(page.locator('.p5-gchip')).toContainText('BTS');
    await expect(page.locator('#p5-group-h')).toContainText('Your quiz appears on the BTS page and counts for');
    await expect(combo).toHaveAttribute('aria-expanded', 'false');
    // Escape closes an open list; the x removes the chip
    await combo.fill('twi');
    await expect(list).toBeVisible();
    await combo.press('Escape');
    await expect(list).toBeHidden();
    await page.getByRole('button', { name: 'Remove BTS' }).click();
    await expect(page.locator('.p5-gchip')).toHaveCount(0);
    // keyboard to "New group or artist" -> the name field -> a custom group chip
    await combo.fill('Zzq Unknown Band');
    await expect(list.locator('.p5-gopt:not(.p5-gopt-new)')).toHaveCount(0);
    await combo.press('Enter');
    const newName = page.getByLabel('New group or artist');
    await expect(newName).toBeFocused();
    await expect(newName).toHaveValue('Zzq Unknown Band');
    await page.getByRole('button', { name: 'Create group' }).click();
    await expect(page.locator('.p5-gchip')).toContainText('Zzq Unknown Band');
    await expect(page.locator('.p5-gchip-new')).toHaveText('new group');
    await expect(page.locator('#p5-group-h')).toContainText('is a new group');
    // back to a listed group by clicking an option
    await page.getByRole('button', { name: 'Remove Zzq Unknown Band' }).click();
    await combo.click();
    await combo.fill('TWICE');
    await list.getByRole('option', { name: 'TWICE', exact: true }).click();
    await expect(page.locator('.p5-gchip')).toContainText('TWICE');

    // quiz type: native radios (the type is not locked while questions are empty)
    const tf = page.getByRole('radio', { name: /True or false/ });
    await tf.check();
    await expect(tf).toBeChecked();
    await expect(page.locator('.p5-opt.is-on')).toContainText('True or false');
    await page.getByRole('radio', { name: /Classic/ }).check();
    // difficulty (aria-pressed) and its one line
    await page.getByRole('group', { name: 'Difficulty' }).getByRole('button', { name: 'Hard' }).click();
    await expect(page.getByRole('group', { name: 'Difficulty' }).getByRole('button', { name: 'Hard' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.p5-pane .ux-seg + .ux-help')).toHaveText('Hard: only the most dedicated fans will pass.');
    // language
    await page.locator('#p5-lang').selectOption('ko');
    await expect(page.locator('#p5-lang')).toHaveValue('ko');
    await expect(page.getByText('Quizzes written in English reach a much bigger audience.', { exact: false })).toBeVisible();
    await page.locator('#p5-lang').selectOption('en');
    // about: counter
    await page.locator('#p5-about').fill('A short note.');
    await expect(page.locator('label[for="p5-about"] small')).toHaveText('13 / 280');

    // cover: file input -> preview (data URL held in the draft) + the rights box
    await page.locator('.p5-drop input[type="file"]').setInputFiles({ name: 'cover.png', mimeType: 'image/png', buffer: PNG });
    await expect(page.locator('.p5-cov img')).toHaveAttribute('src', /^data:image\/jpeg/);
    const rights = page.locator('#p5-rights-w input[type="checkbox"]');
    await expect(rights).not.toBeChecked();
    await page.locator('.p5-next').click();
    await expect(rights).toBeFocused();
    await expect(page.getByText('Confirm you have the right to use your cover image to continue.')).toBeVisible();
    // a wrong file type is refused with the legacy message
    await page.locator('.p5-drop input[type="file"]').setInputFiles({ name: 'x.gif', mimeType: 'image/gif', buffer: PNG });
    await expect(page.getByText('That file type is not supported. Use a JPG, PNG, or WebP image.')).toBeVisible();
    await page.locator('#p5-rights-w .ux-check').click();
    await expect(rights).toBeChecked();
    // autosave (500 ms after the last change) wrote the draft with the legacy keys
    await expect.poll(async () => (await draftIn(page))?.coverRights, { timeout: 10_000 }).toBe(true);
    const d = await draftIn(page);
    expect(d?.title).toBe('My e2e quiz title');
    expect(Object.keys(d ?? {}).sort()).toEqual(['cover', 'coverRights', 'creatorNote', 'difficulty', 'group_slug', 'language', 'newGroup', 'questions', 'quiz_type', 'title', 'updatedAt'].sort());
    expect(d).toMatchObject({ group_slug: 'twice', newGroup: null, difficulty: 'hard', language: 'en', quiz_type: 'multiple_choice', coverRights: true, creatorNote: 'A short note.' });
    await expect(page.getByTestId('p5-status')).toContainText('3 of 3 required done · draft saved on this device');
    // go on: step 2, heading focused
    await page.locator('.p5-next').click();
    await expect(page.locator('.p5-pane[data-step="2"]')).toBeVisible();
    await expect(page.locator('.p5-ph h1')).toHaveText('Your questions');
    await expect(page.locator('.p5-ph h1')).toBeFocused();
    await expect(page.locator('.p5-st.is-done')).toHaveCount(1);
    // a reload restores the draft and the step (lib/create-draft)
    await page.reload();
    await page.locator('.p5-col[data-ready="1"]').waitFor();
    await expect(page.locator('.p5-pane[data-step="2"]')).toBeVisible();
    // Remove cover (back on step 1 via the stepper)
    await page.locator('.p5-st').first().getByRole('button').click();
    await page.getByRole('button', { name: 'Remove cover' }).click();
    await expect(page.locator('.p5-cov img')).toHaveCount(0);
    expect(calls).toEqual([]);
  });

  test('title duplicate nudge is soft (GET title-check only)', async ({ page }) => {
    const { calls } = await openCreate(page, { theme: 'light', draft: null, titleExists: true });
    test.skip(!(await hasShell(page)), 'flag off');
    const check = page.waitForRequest((r) => r.url().includes('/api/quiz/title-check?title=') && r.method() === 'GET');
    await page.locator('#p5-title').fill('A title that exists');
    await check;
    await expect(page.locator('#p5-title-e')).toContainText('A quiz with this exact name already exists');
    await expect(page.locator('#p5-title')).not.toHaveAttribute('aria-invalid', 'true');
    expect(calls).toEqual([]);
  });

  test('?group=<slug> deep link pre-selects the group (server rendered)', async ({ page, request }) => {
    const html = await (await request.get('/create?group=bts')).text();
    test.skip(!html.includes('ux-app'), 'flag off');
    expect(html).toMatch(/class="p5-gchip"[\s\S]{0,400}BTS/);
    const unknown = await (await request.get('/create?group=not-a-group-xyz')).text();
    expect(unknown).not.toContain('class="p5-gchip"');
    const { calls } = await openCreate(page, { theme: 'dark', draft: null, query: '?group=bts' });
    await expect(page.locator('.p5-gchip')).toContainText('BTS');
    expect(calls).toEqual([]);
  });
});

test.describe('P5 step 2 (guest)', () => {
  test('rows, editor, answers, add, duplicate, delete, move, drag, paste, per-type editors', async ({ page }) => {
    const { calls } = await openCreate(page, { theme: 'light', draft: SAMPLE_DRAFT, step: 2 });
    test.skip(!(await hasShell(page)), 'flag off');
    const rows = page.locator('.p5-qitem');
    await expect(rows).toHaveCount(4);
    await expect(page.locator('#p5-ql-l small')).toHaveText('4 added · 3 needed to publish');
    await expect(rows.nth(0).locator('.p5-qst')).toHaveText('Ready');
    await expect(rows.nth(3).locator('.p5-qst')).toHaveText('2 answers missing');
    await expect(page.getByTestId('p5-status')).toContainText('3 complete questions · 1 needs work');
    // open row 4, fill the two answers: it becomes Ready
    const t4 = page.locator('#p5-qt-3');
    await t4.click();
    await expect(t4).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#p5-qt-0')).toHaveAttribute('aria-expanded', 'false');
    await page.getByRole('textbox', { name: 'Answer 3', exact: true }).fill('Butter');
    await page.getByRole('textbox', { name: 'Answer 4', exact: true }).fill('Permission to Dance');
    await expect(rows.nth(3).locator('.p5-qst')).toHaveText('Ready');
    // the circle marks the correct answer (aria-pressed), the row input turns ok
    await page.getByRole('button', { name: 'Mark answer 2 as correct' }).click();
    await expect(page.getByRole('button', { name: 'Mark answer 2 as correct' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: 'Mark answer 1 as correct' })).toHaveAttribute('aria-pressed', 'false');
    await page.locator('#p5-ff-3').fill('Life Goes On topped the Hot 100 in December 2020.');
    // the question field holds no line break
    await page.locator('#p5-q-3').fill('Line one\nline two');
    await expect(page.locator('#p5-q-3')).toHaveValue('Line one line two');
    await expect(page.getByTestId('p5-status')).toContainText('4 complete questions · ready to publish');

    // add: a blank row opens with focus on its question
    await page.getByRole('button', { name: 'Add a question' }).click();
    await expect(rows).toHaveCount(5);
    await expect(page.locator('#p5-q-4')).toBeFocused();
    await expect(rows.nth(4).locator('.p5-qst')).toHaveText('Missing question');
    // duplicate row 1 -> a copy right after it, open (actions sit on the open row on touch)
    await page.locator('#p5-qt-0').click();
    await page.getByRole('button', { name: 'Duplicate question 1' }).click();
    await expect(rows).toHaveCount(6);
    await expect(page.locator('#p5-q-1')).toHaveValue(SAMPLE_DRAFT.questions[0]!.question);
    // delete the copy (the open row)
    await page.getByRole('button', { name: 'Delete question 2' }).click();
    await expect(rows).toHaveCount(5);
    // move: open row 2, "Move up" swaps rows 1 and 2
    await page.locator('#p5-qt-1').click();
    await page.getByRole('button', { name: 'Move question 2 up' }).click();
    await expect(rows.nth(0).locator('.p5-qq')).toHaveText(SAMPLE_DRAFT.questions[1]!.question);
    await expect(page.locator('#p5-qt-0')).toBeFocused();
    await expect(page.locator('#p5-qt-0')).toHaveAttribute('aria-expanded', 'true');
    await page.getByRole('button', { name: 'Move question 1 down' }).click();
    await expect(rows.nth(1).locator('.p5-qq')).toHaveText(SAMPLE_DRAFT.questions[1]!.question);
    // drag (desktop): row 1 handle onto row 3
    // drag (HTML5 drag events, as a desktop mouse sends them): row 1 handle onto row 3
    const dt = await page.evaluateHandle(() => new DataTransfer());
    await rows.nth(0).locator('.p5-drag').dispatchEvent('dragstart', { dataTransfer: dt });
    await rows.nth(2).dispatchEvent('dragover', { dataTransfer: dt });
    await rows.nth(2).dispatchEvent('drop', { dataTransfer: dt });
    await rows.nth(0).locator('.p5-drag').dispatchEvent('dragend', { dataTransfer: dt });
    await expect(rows.nth(2).locator('.p5-qq')).toHaveText(SAMPLE_DRAFT.questions[0]!.question);
    // paste several: the sheet (X, Escape, backdrop close it; focus comes back)
    const pasteBtn = page.getByRole('button', { name: 'Paste several at once' });
    for (const how of ['x', 'escape', 'backdrop'] as const) {
      await pasteBtn.click();
      await expect(page.locator('.ux-sheet')).toBeVisible();
      await expect(page.locator('#p5-paste')).toBeFocused();
      if (how === 'x') await page.locator('.ux-sheet .ux-sh-h .ux-ib').click();
      if (how === 'escape') await page.keyboard.press('Escape');
      if (how === 'backdrop') await page.getByTestId('ux-scrim').click({ position: { x: 5, y: 5 } });
      await expect(page.locator('.ux-sheet')).toHaveCount(0);
      await expect(pasteBtn).toBeFocused();
    }
    await pasteBtn.click();
    await page.locator('#p5-paste').fill('Who is the leader of BTS?\nRM\nJin\nSuga\nV\n\nWhich year did BTS debut?\n2013\n2012\n2014\n2015\n\nbroken');
    await expect(page.locator('.ux-sheet [role="status"]')).toHaveText('2 questions found, 1 block skipped');
    await page.getByRole('button', { name: 'Add 2 questions' }).click();
    await expect(page.locator('.ux-sheet')).toHaveCount(0);
    await expect(rows).toHaveCount(7);
    await expect(page.getByTestId('ux-toast')).toContainText('2 questions added, 1 skipped');
    await expect(rows.nth(5).locator('.p5-qst')).toHaveText('Ready');
    // the draft keeps everything (autosave)
    await expect.poll(async () => ((await draftIn(page))?.questions as unknown[] | undefined)?.length).toBe(7);
    // back / next
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page.locator('.p5-pane[data-step="1"]')).toBeVisible();
    await expect(page.getByRole('radio', { name: /True or false/ })).toBeDisabled();
    await page.locator('.p5-next').click();
    await page.getByRole('button', { name: 'Review and publish' }).click();
    await expect(page.locator('.p5-pane[data-step="3"]')).toBeVisible();
    expect(calls).toEqual([]);
  });

  test('true/false, clues, image and intruder editors keep the EXISTS shapes', async ({ page }) => {
    const { calls } = await openCreate(page, { theme: 'dark', draft: null });
    test.skip(!(await hasShell(page)), 'flag off');
    await page.locator('#p5-title').fill('Editors test quiz');
    await page.locator('#p5-group-q').fill('bts');
    await page.locator('#p5-group-q').press('Enter');
    for (const t of ['True or false', 'Guess from clues', 'Image quiz', 'Find the intruder'] as const) {
      await page.locator('.p5-st').first().getByRole('button').click();
      await page.getByRole('radio', { name: new RegExp(t) }).check();
      await page.locator('.p5-next').click();
      await expect(page.locator('.p5-pane[data-step="2"]')).toBeVisible();
      await expect(page.locator('#p5-q-0')).toBeVisible();
      await page.locator('#p5-q-0').fill(`A ${t} question`);
      if (t === 'True or false') {
        await page.getByRole('button', { name: 'False is correct' }).click();
        await expect(page.getByRole('button', { name: 'False is correct' })).toHaveAttribute('aria-pressed', 'true');
        await expect(page.locator('.p5-qst').first()).toHaveText('Ready');
        await expect(page.getByRole('button', { name: 'Paste several at once' })).toBeVisible();
      }
      if (t === 'Guess from clues') {
        for (let c = 1; c <= 3; c++) await page.getByRole('textbox', { name: `Clue ${c}`, exact: true }).fill(`clue ${c}`);
        for (let a = 1; a <= 4; a++) await page.getByRole('textbox', { name: `Answer ${a}`, exact: true }).fill(`opt ${a}`);
        await page.getByRole('button', { name: 'Mark answer 3 as correct' }).click();
        await expect(page.locator('.p5-qst').first()).toHaveText('Ready');
        await expect(page.getByRole('button', { name: 'Paste several at once' })).toHaveCount(0);
      }
      if (t === 'Image quiz') {
        for (let a = 1; a <= 4; a++) await page.getByRole('textbox', { name: `Answer ${a}`, exact: true }).fill(`opt ${a}`);
        await page.getByRole('button', { name: 'Mark answer 1 as correct' }).click();
        await expect(page.locator('.p5-qst').first()).toHaveText('Missing image');
        await page.locator('.p5-qfoot input[type="file"]').setInputFiles({ name: 'q.png', mimeType: 'image/png', buffer: PNG });
        await expect(page.locator('.p5-qfoot img')).toHaveAttribute('src', /^data:image\/jpeg/);
        await expect(page.locator('.p5-qst').first()).toHaveText('Ready');
      }
      if (t === 'Find the intruder') {
        const cells = page.locator('.p5-intr-c');
        await expect(cells).toHaveCount(4);
        for (let j = 0; j < 4; j++) {
          await cells.nth(j).locator('input[type="file"]').setInputFiles({ name: `i${j}.png`, mimeType: 'image/png', buffer: PNG });
          await page.getByRole('textbox', { name: `Label ${j + 1}`, exact: true }).fill(`Member ${j + 1}`);
        }
        await page.getByRole('button', { name: 'Picture 2 is the intruder' }).click();
        await expect(page.locator('.p5-qst').first()).toHaveText('Ready');
      }
      // clear the question so the type can change again
      await page.waitForTimeout(700);
      await page.locator('.p5-st').first().getByRole('button').click();
      await expect(page.getByRole('radio', { name: /Classic/ })).toBeDisabled();
      await page.locator('.p5-st').nth(1).getByRole('button').click();
      await page.evaluate(() => {
        const raw = localStorage.getItem('kq_create_draft_v1');
        if (raw) { const d = JSON.parse(raw) as Record<string, unknown>; d.questions = [{ question: '', options: ['', '', '', ''], correct: null, fun_fact: '' }]; localStorage.setItem('kq_create_draft_v1', JSON.stringify(d)); }
      });
      await page.reload();
      await page.locator('.p5-col[data-ready="1"]').waitFor();
    }
    expect(calls).toEqual([]);
  });
});

test.describe('P5 step 3 + publish (guest)', () => {
  test('checklist, not ready hint, sign-in sheet (X / Escape / backdrop), magic link keeps the draft', async ({ page }) => {
    // not ready: only 2 complete questions
    const two = { ...SAMPLE_DRAFT, questions: SAMPLE_DRAFT.questions.slice(1) };
    const first = await openCreate(page, { theme: 'light', draft: two, step: 3 });
    test.skip(!(await hasShell(page)), 'flag off');
    await expect(page.locator('.p5-check[data-ok="false"]')).toHaveCount(2);
    await expect(page.getByRole('button', { name: 'Fix: 3 complete questions' })).toBeVisible();
    await page.locator('.p5-next').click();
    await expect(page.locator('.p5-pubmsg')).toHaveText('Not ready yet · finish 1 more question.');
    await expect(page.locator('.ux-sheet')).toHaveCount(0);
    await page.getByRole('button', { name: 'Fix: 3 complete questions' }).click();
    await expect(page.locator('.p5-pane[data-step="2"]')).toBeVisible();
    expect(first.calls).toEqual([]);
  });

  test('ready: card, checklist, Publish opens "Sign in to publish"; the email link keeps the draft and the action', async ({ page }) => {
    const { calls } = await openCreate(page, { theme: 'dark', draft: SAMPLE_DRAFT, step: 3 });
    test.skip(!(await hasShell(page)), 'flag off');
    await expect(page.locator('.p5-card .ux-qt')).toHaveText(SAMPLE_DRAFT.title);
    await expect(page.locator('.p5-card .ux-qg')).toHaveText('BTS');
    await expect(page.locator('.p5-card .ux-qpl')).toHaveText('New');
    await expect(page.locator('.p5-card a')).toHaveCount(0);
    await expect(page.locator('.p5-check .ux-row-grow')).toHaveText(['Title: done', 'Type and group: done', '3 complete questions: done', 'Cover image: done', 'Fun fact on every question: recommended']);
    await expect(page.locator('.p5-check .ux-row-end')).toHaveText(['47 characters', 'Classic · BTS', '3 of 4', 'Added', '3 of 4 · optional']);
    await expect(page.locator('.p5-note')).toHaveText('Question 4 is not complete, so it will not be published.');
    await expect(page.getByTestId('p5-status')).toContainText('Ready · question 4 is left out');
    const publish = page.locator('.p5-next');
    await expect(publish).toHaveText('Publish quiz');
    for (const how of ['x', 'escape', 'backdrop'] as const) {
      await publish.click();
      const sheet = page.locator('.ux-sheet');
      await expect(sheet).toBeVisible();
      await expect(sheet.locator('h2')).toHaveText('Sign in to publish');
      await expect(sheet.locator('.ux-sh-p')).toHaveText('Your quiz needs an owner so you can edit it and see its plays. Your draft is kept.');
      await expect(sheet.getByRole('button', { name: 'Continue with Google' })).toBeFocused();
      if (how === 'x') await sheet.getByRole('button', { name: 'Close' }).click();
      if (how === 'escape') await page.keyboard.press('Escape');
      if (how === 'backdrop') await page.getByTestId('ux-scrim').click({ position: { x: 5, y: 5 } });
      await expect(sheet).toHaveCount(0);
      await expect(publish).toBeFocused();
    }
    // email me a sign-in link: the OTP request is stubbed (nothing is sent) and
    // carries /auth/callback?returnTo=/create?resume=publish; the action is stored.
    await publish.click();
    await page.locator('.ux-sheet input[type="email"]').fill('p5-e2e@example.com');
    await page.getByRole('button', { name: 'Email me a sign-in link' }).click();
    await expect(page.locator('.ux-sheet')).toHaveCount(0);
    const otp = calls.find((c) => c.url.includes('/auth/v1/otp'));
    expect(otp, JSON.stringify(calls)).toBeTruthy();
    expect(otp!.url).toContain(encodeURIComponent('/auth/callback?returnTo=%2Fcreate%3Fresume%3Dpublish'));
    expect(JSON.parse(otp!.body ?? '{}')).toMatchObject({ email: 'p5-e2e@example.com' });
    const pending = await page.evaluate(() => JSON.parse(localStorage.getItem('ux:pending-action') ?? 'null') as { id: string; path: string } | null);
    expect(pending).toMatchObject({ id: 'p5:publish', path: '/create' });
    expect((await draftIn(page))?.title).toBe(SAMPLE_DRAFT.title);
    // only the stubbed OTP request, no quiz write
    expect(calls.map((c) => new URL(c.url).pathname)).toEqual(['/auth/v1/otp']);
  });
});

signedInTest.describe('P5 signed in (test user; publish answered locally)', () => {
  const expected = (cover: string | undefined): Record<string, unknown> => ({
    title: SAMPLE_DRAFT.title,
    quiz_type: 'multiple_choice',
    difficulty: 'medium',
    language: 'en',
    ...(cover ? { cover_image_url: cover } : {}),
    questions: SAMPLE_DRAFT.questions.slice(0, 3).map((q) => ({ question: q.question, ...(q.fun_fact ? { fun_fact: q.fun_fact } : {}), correct: q.correct, options: q.options })),
    settings: { timer: true, timer_seconds: 15, shuffle: false, show_answers: true, creator_note: SAMPLE_DRAFT.creatorNote },
  });

  signedInTest('resume after sign-in (?resume=publish) publishes the draft with the legacy payload; done state', async ({ page, context }) => {
    skipUnlessSignedIn();
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const { calls, posts } = await openCreate(page, { theme: 'light', draft: SAMPLE_DRAFT, step: 3, query: '?resume=publish' });
    test.skip(!(await hasShell(page)), 'flag off');
    await expect(page.locator('.p5-done')).toBeVisible({ timeout: 30_000 });
    expect(posts.map((p) => p.url)).toEqual(['/api/quiz/create']);
    const body = JSON.parse(posts[0]!.body ?? '{}') as Record<string, unknown>;
    expect(typeof body.group_id).toBe('number');
    expect(Object.keys(body)).toEqual(['group_id', 'title', 'quiz_type', 'difficulty', 'language', 'cover_image_url', 'questions', 'settings']);
    expect(body).toMatchObject(expected('/idols/BTS.jpg'));
    // done: heading, URL, copy (tracked link, POST /api/share/generate stubbed), links
    await expect(page.locator('.p5-ph h1')).toHaveText('Your quiz is live!');
    await expect(page.locator('.p5-ph h1')).toBeFocused();
    await expect(page.locator('.p5-bar')).toHaveCount(0);
    await expect(page.locator('.p5-st.is-done')).toHaveCount(3);
    await expect(page.locator('.p5-url span')).toHaveText(/\/q\/p5-e2e-slug$/);
    await expect(page.locator('.p5-nudge')).toHaveText('8 more quizzes to the Prolific Creator badge');
    await page.getByRole('button', { name: 'Copy' }).click();
    await expect.poll(() => calls.filter((c) => c.url.includes('/api/share/generate')).length).toBe(1);
    expect(JSON.parse(calls.find((c) => c.url.includes('/api/share/generate'))!.body ?? '{}')).toEqual({ quizId: 'p5-e2e-id', platform: 'link' });
    await expect(page.getByTestId('ux-toast')).toHaveText('Link copied');
    await expect(page.getByRole('link', { name: /Open your quiz/ })).toHaveAttribute('href', '/q/p5-e2e-slug');
    await expect(page.getByRole('link', { name: /Open your quiz/ })).toHaveAttribute('target', '_blank');
    await expect(page.getByRole('link', { name: 'Post a challenge' })).toHaveAttribute('href', '/community?compose=challenge&quiz=p5-e2e-slug');
    // the draft is cleared (legacy clearDraft); Create another quiz starts over
    expect(await draftIn(page)).toBeNull();
    await page.getByRole('button', { name: 'Create another quiz' }).click();
    await expect(page.locator('.p5-pane[data-step="1"]')).toBeVisible();
    await expect(page.locator('#p5-title')).toHaveValue('');
    expect(calls.map((c) => new URL(c.url).pathname)).toEqual(['/api/share/generate']);
  });

  signedInTest('A0 pending action resumes too; a data-URL cover is uploaded first (multipart), then create', async ({ page }) => {
    skipUnlessSignedIn();
    const withDataCover = { ...SAMPLE_DRAFT, cover: `data:image/png;base64,${PNG.toString('base64')}` };
    const { calls, posts } = await openCreate(page, { theme: 'dark', draft: withDataCover, step: 3, pending: true });
    test.skip(!(await hasShell(page)), 'flag off');
    await expect(page.locator('.p5-done')).toBeVisible({ timeout: 30_000 });
    expect(posts.map((p) => p.url)).toEqual(['/api/quiz/upload-image', '/api/quiz/create']);
    expect(posts[0]!.body).toContain('name="file"');
    expect(JSON.parse(posts[1]!.body ?? '{}')).toMatchObject(expected(FAKE_UPLOAD));
    expect(calls).toEqual([]);
  });

  signedInTest('Publish button (signed in, with a profile) publishes; a click while publishing is ignored', async ({ page }) => {
    skipUnlessSignedIn();
    const { calls, posts } = await openCreate(page, { theme: 'light', draft: SAMPLE_DRAFT, step: 3 });
    test.skip(!(await hasShell(page)), 'flag off');
    await expect(page.locator('.p5-pane[data-step="3"]')).toBeVisible();
    await page.locator('.p5-next').click();
    await expect(page.locator('.p5-done')).toBeVisible({ timeout: 30_000 });
    expect(posts.map((p) => p.url)).toEqual(['/api/quiz/create']);
    expect(calls).toEqual([]);
  });

  signedInTest('an account without a profile claims a username inline, then publishes (legacy calls)', async ({ page }) => {
    skipUnlessSignedIn();
    const { calls, posts } = await openCreate(page, {
      theme: 'light', draft: SAMPLE_DRAFT, step: 3, noProfile: true,
      routes: async (p) => { await p.route('**/api/auth/check-username**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ available: true }) })); },
    });
    test.skip(!(await hasShell(page)), 'flag off');
    const uname = page.locator('#p5-uname');
    await expect(uname).toBeVisible();
    await expect(page.locator('.p5-next')).toHaveText('Claim and publish');
    await page.locator('.p5-next').click();
    await expect(page.locator('.p5-pubmsg')).toHaveText('Pick an available username first.');
    await expect(uname).toBeFocused();
    await uname.fill('Bad Name!');
    await expect(page.locator('#p5-uname-s')).toHaveText('3 to 20 characters: lowercase letters, numbers, underscores');
    await uname.fill('p5_e2e_user');
    await expect(page.locator('#p5-uname-s')).toHaveText('Available');
    await page.locator('.p5-next').click();
    await expect(page.locator('.p5-done')).toBeVisible({ timeout: 30_000 });
    const claim = calls.find((c) => c.url.includes('/api/auth/create-profile'));
    expect(JSON.parse(claim?.body ?? '{}')).toEqual({ username: 'p5_e2e_user' });
    expect(posts.map((p) => p.url)).toEqual(['/api/quiz/create']);
    expect(calls.map((c) => new URL(c.url).pathname)).toEqual(['/api/auth/create-profile']);
  });

  signedInTest('signed-in create-3: styles and boxes still match (member nav), axe clean', async ({ page }) => {
    skipUnlessSignedIn();
    const { calls } = await openCreate(page, { theme: 'light', draft: SAMPLE_DRAFT, step: 3 });
    test.skip(!(await hasShell(page)), 'flag off');
    await toState(page, 'create-3');
    const problems = await checkLandmarks(page, 'create-3', 'light');
    expect(problems, problems.join('\n')).toEqual([]);
    const axe = await runAxe(page, { include: '.ux-page' });
    if (axe) expect(axe).toEqual([]);
    expect(calls).toEqual([]);
  });
});

test.describe('P5 keyboard', () => {
  test('every step control is reachable and operable from the keyboard', async ({ page }) => {
    const { calls } = await openCreate(page, { theme: 'light', draft: null });
    test.skip(!(await hasShell(page)), 'flag off');
    await page.locator('#p5-title').focus();
    await page.keyboard.type('Keyboard only quiz');
    await page.keyboard.press('Tab');
    await expect(page.locator('#p5-about')).toBeFocused();
    await page.keyboard.press('Tab');
    // the radio group: one tab stop, arrows move the choice
    await expect(page.getByRole('radio', { name: /Classic/ })).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('radio', { name: /True or false/ })).toBeChecked();
    await page.keyboard.press('ArrowUp');
    await expect(page.getByRole('radio', { name: /Classic/ })).toBeChecked();
    await page.keyboard.press('Tab');
    await expect(page.locator('#p5-group-q')).toBeFocused();
    await page.keyboard.type('blackp');
    await page.keyboard.press('Enter');
    await expect(page.locator('.p5-gchip')).toContainText('BLACKPINK');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Easy' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Easy' })).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expect(page.locator('#p5-lang')).toBeFocused();
    // the cover input is reachable (visually hidden, focus ring on the drop zone)
    await page.keyboard.press('Tab');
    await expect(page.locator('.p5-drop input')).toBeFocused();
    await expect(page.locator('.p5-drop')).toHaveCSS('outline-style', 'solid');
    // the bar button with Enter
    await page.locator('.p5-next').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.p5-pane[data-step="2"]')).toBeVisible();
    await expect(page.locator('.p5-ph h1')).toBeFocused();
    // step 2: the open row's question, the circles, add
    await page.locator('#p5-q-0').focus();
    await page.keyboard.type('Who sang Kill This Love?');
    await page.getByRole('button', { name: 'Mark answer 1 as correct' }).focus();
    await page.keyboard.press('Space');
    await expect(page.getByRole('button', { name: 'Mark answer 1 as correct' })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Add a question' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#p5-q-1')).toBeFocused();
    // the stepper buttons
    await page.locator('.p5-st').nth(2).getByRole('button').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.p5-pane[data-step="3"]')).toBeVisible();
    expect(calls).toEqual([]);
  });
});
