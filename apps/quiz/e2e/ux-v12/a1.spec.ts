import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { test, expect } from '@playwright/test';

import { basicA11y, runAxe } from '../ux-v1/helpers/a11y';
import { loadTestEnv } from '../ux-v1/helpers/env';
import { guardWrites } from '../ux-v1/helpers/guard';
import { OWNER_DEVIATIONS } from '../ux-v1/helpers/landmarks';
import { hasShell, horizontalOverflow, preparePage, THEMES, waitHydrated, widthOf } from '../ux-v1/helpers/setup-page';

import type { Page } from '@playwright/test';
import type { StubbedCall } from '../ux-v1/helpers/guard';
import type { Theme } from '../ux-v1/helpers/setup-page';

// A1 Foundation v12: the shared v12 pieces in the kit route (/ux-v1/kit), measured
// against the pinned v12 prototype (run/checks/reference/styles.json, captured by
// docs/design/growth-v12/capture-v12.mjs), at the project width (ux-1440 /
// ux-390), light and dark. No write: every page is wrapped with guardWrites and
// the spec asserts that nothing mutating was even attempted.
//
// Flag states (the dev server or build decides, the spec reads it from the page):
//   both on      the kit carries the v12 sections; landmarks, a11y, behaviour.
//   v11 only     no v12 section, no v12 rule in the stylesheet (today's v11).
//   both off     the kit route is not served at all.
// A1_EXPECT=v12 | v11 | off makes the state an assertion instead of a discovery.

const here = path.dirname(fileURLToPath(import.meta.url));
const STYLES_JSON = path.resolve(here, '../../../../docs/design/growth-v12/run/checks/reference/styles.json');
type StyleMap = Record<string, string>;
const REFERENCE = JSON.parse(fs.readFileSync(STYLES_JSON, 'utf8')) as Record<string, Record<string, StyleMap>>;

const env = loadTestEnv();
const EXPECT = process.env.A1_EXPECT as 'v12' | 'v11' | 'off' | undefined;

const V12_SECTIONS = ['v12-team', 'v12-themes', 'v12-ways', 'v12-steps', 'v12-lang', 'v12-answers', 'v12-result', 'v12-story'];
const V11_SECTIONS = ['tokens', 'type', 'buttons', 'nav', 'section-headers', 'controls', 'quiz-cards', 'text-cards', 'posts', 'identity', 'badges', 'forms', 'sheets', 'feedback', 'viewer', 'route-focus', 'icons'];

// The capture's property list (capture-v12.mjs PROPS).
const PROPS = ['width', 'height', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'margin-top',
  'border-top-width', 'border-top-color', 'border-radius', 'background-color', 'background-image', 'color', 'font-size',
  'font-weight', 'line-height', 'letter-spacing', 'box-shadow', 'gap'] as const;

interface Landmark {
  /** Prototype selector, as captured in styles.json. */
  proto: string;
  /** Kit selector (first match). */
  impl: string;
  /** Reference state that shows it. */
  state: string;
}

// Every A1 landmark of the brief, each in the kit inside a frame as wide as the
// prototype view that shows it.
const LANDMARKS: Landmark[] = [
  { proto: '.teamtag', impl: '[data-kit="team-feed"] .ux-teamtag', state: 'community-team-post' },
  { proto: '.ava.team', impl: '[data-kit="team-feed"] .ux-ava-team', state: 'community-team-post' },
  { proto: '.teamtag', impl: '[data-kit="team-post"] .ux-teamtag', state: 'post-team' },
  { proto: '.ava.team', impl: '[data-kit="team-post"] .ux-ava-team', state: 'post-team' },
  { proto: '.teamnote', impl: '[data-kit="team-post"] .ux-teamnote', state: 'post-team' },
  { proto: '.thrail .thm', impl: '[data-kit-section="v12-themes"] .ux-thrail .ux-thm', state: 'bthub-playlists' },
  { proto: '.thrail .thm', impl: '[data-kit-section="v12-themes"] .ux-thrail .ux-thm', state: 'theme-hits26' },
  { proto: '.thrail .thm', impl: '[data-kit-section="v12-themes"] .ux-thrail .ux-thm', state: 'land-en' },
  { proto: '.gtile', impl: '[data-kit-section="v12-ways"] .ux-gtiles .ux-gtile', state: 'hub-ways-to-play' },
  { proto: '.steps3', impl: '[data-kit-section="v12-steps"] .ux-steps3', state: 'land-en' },
  { proto: '.langsw', impl: '[data-kit-section="v12-lang"] .ux-langsw', state: 'land-en' },
  { proto: '.ltiles .lt', impl: '[data-kit="host-round"] .ux-lt', state: 'live-round' },
  { proto: '.ltiles .lt', impl: '[data-kit="host-round"] .ux-lt', state: 'live-answer' },
  { proto: '.pbtns .pb', impl: '[data-kit="phone-open"] .ux-pb', state: 'live-round' },
  { proto: '.pbtns .pb', impl: '[data-kit="phone-locked"] .ux-pb', state: 'live-answer' },
  { proto: '.rescard', impl: '[data-kit="result-member"] .ux-rescard', state: 'wma-result' },
  { proto: '.traits', impl: '[data-kit="result-member"] .ux-traits', state: 'wma-result' },
  { proto: '.dist', impl: '[data-kit="result-member"] .ux-dist', state: 'wma-result' },
  { proto: '.kit .story', impl: '[data-kit="story-9x16"] .ux-story', state: 'share-kit' },
];

/**
 * Expected values that differ from the capture, each exact (a new expected value,
 * never a skip) and each with its reason. The v11 owner deviations
 * (helpers/landmarks OWNER_DEVIATIONS: warm light ground, re-tuned surfaces,
 * re-clamped pink ink) apply on top, light only.
 */
interface Deviation { prefix: string[]; proto: string; prop: string; from: string; to: string; why: string }
const A1_DEVIATIONS: Deviation[] = [
  // The prototype's language switch is 360.83px wide in a 350px phone column (11px of
  // sideways scroll in the reference capture). C1 also asks for no sideways scroll at
  // 390, so the pills are 3px tighter on each side under 420px: all four languages on
  // one line, inside the column.
  { prefix: ['m', 'mk'], proto: '.langsw', prop: 'width', from: '360.828px', to: '336.828px', why: 'no sideways scroll at 390: pill padding 11px instead of 14px under 420px' },
];

function refKey(width: number, theme: Theme, state: string): string {
  return `${width > 500 ? 'd' : 'm'}${theme === 'dark' ? 'k' : ''}-${state}`;
}

function expected(width: number, theme: Theme, l: Landmark): StyleMap | null {
  const key = refKey(width, theme, l.state);
  const raw = REFERENCE[key]?.[l.proto];
  if (!raw) return null;
  const out: StyleMap = { ...raw };
  const prefix = key.split('-')[0] ?? '';
  for (const d of A1_DEVIATIONS) if (d.prefix.includes(prefix) && d.proto === l.proto && out[d.prop] === d.from) out[d.prop] = d.to;
  for (const d of OWNER_DEVIATIONS) if (d.theme === theme && (d.proto === '*' || d.proto === l.proto) && out[d.prop] === d.from) out[d.prop] = d.to;
  return out;
}

const norm = (v: string): string => v.replace(/\s+/g, ' ').trim();
function close(a: string, b: string): boolean {
  if (norm(a) === norm(b)) return true;
  // boxes within 2px (C1) when both are plain px values
  return /^-?[\d.]+px$/.test(a.trim()) && /^-?[\d.]+px$/.test(b.trim()) && Math.abs(parseFloat(a) - parseFloat(b)) <= 2;
}

async function computed(page: Page, selectors: string[]): Promise<Record<string, StyleMap | null>> {
  return page.evaluate(({ sels, props }) => {
    const out: Record<string, Record<string, string> | null> = {};
    for (const s of sels) {
      const el = document.querySelector<HTMLElement>(s);
      if (!el || el.offsetParent === null) { out[s] = null; continue; }
      const cs = getComputedStyle(el);
      out[s] = Object.fromEntries(props.map((p) => [p, cs.getPropertyValue(p)]));
    }
    return out;
  }, { sels: selectors, props: [...PROPS] });
}

type KitState = 'v12' | 'v11' | 'off';

async function openKit(page: Page): Promise<KitState> {
  const res = await page.goto('/ux-v1/kit');
  if (!res || res.status() === 404 || !/\/ux-v1\/kit$/.test(new URL(page.url()).pathname)) return 'off';
  if (!(await hasShell(page))) return 'off';
  await waitHydrated(page);
  return (await page.locator('[data-kit-v12]').count()) > 0 ? 'v12' : 'v11';
}

async function stylesheet(page: Page): Promise<string> {
  const href = await page.locator('link[rel="stylesheet"][href*="/api/ux-v1/a0/styles"]').first().getAttribute('href');
  expect(href, 'the flag-on stylesheet link').toBeTruthy();
  const r = await page.request.get(href as string);
  expect(r.status()).toBe(200);
  return r.text();
}

for (const theme of THEMES) {
  test.describe(`A1 v12 kit ${theme}`, () => {
    let writes: StubbedCall[] = [];
    test.beforeEach(async ({ page }) => {
      await preparePage(page, theme);
      writes = await guardWrites(page, env.supabaseUrl);
    });
    test.afterEach(() => {
      expect(writes, 'no mutating request was attempted').toEqual([]);
    });

    test('flag state is the expected one', async ({ page }) => {
      const state = await openKit(page);
      if (EXPECT) expect(state).toBe(EXPECT);
      test.info().annotations.push({ type: 'flag-state', description: state });
    });

    test('both flags on: every v12 section, reference landmarks, no sideways scroll, a11y', async ({ page }, info) => {
      const state = await openKit(page);
      test.skip(state !== 'v12', `v12 kit not served here (state: ${state})`);
      const w = widthOf(page);

      for (const s of [...V11_SECTIONS, ...V12_SECTIONS]) await expect(page.locator(`[data-kit-section="${s}"]`), s).toHaveCount(1);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
      await expect(page.locator('h1')).toHaveCount(1);
      expect(await horizontalOverflow(page), 'no sideways scroll').toBeLessThanOrEqual(0);

      const got = await computed(page, [...new Set(LANDMARKS.map((l) => l.impl))]);
      const missing: string[] = [];
      const mismatches: { landmark: string; key: string; prop: string; expected: string; actual: string }[] = [];
      const checked: string[] = [];
      for (const l of LANDMARKS) {
        const key = refKey(w, theme, l.state);
        const exp = expected(w, theme, l);
        expect(exp, `reference has ${l.proto} in ${key}`).not.toBeNull();
        const act = got[l.impl];
        if (!exp) continue;
        if (!act) { missing.push(`${l.impl} (${key})`); continue; }
        checked.push(`${l.proto} @ ${key}`);
        for (const p of PROPS) {
          const e = exp[p]; const a = act[p];
          if (e === undefined || a === undefined) continue;
          if (!close(e, a)) mismatches.push({ landmark: l.proto, key, prop: p, expected: e, actual: a });
        }
      }
      await info.attach('a1-landmarks.json', { body: JSON.stringify({ checked, missing, mismatches, got }, null, 1), contentType: 'application/json' });
      expect(missing, 'the kit renders every A1 landmark').toEqual([]);
      expect(mismatches, 'boxes within 2px, styles equal to styles.json').toEqual([]);
      expect(checked.length).toBe(LANDMARKS.length);

      expect(await basicA11y(page)).toEqual([]);
      for (const s of V12_SECTIONS) {
        const axe = await runAxe(page, { include: `[data-kit-section="${s}"]` });
        if (axe) expect(axe, `axe serious / critical in ${s}`).toEqual([]);
      }
      if (process.env.A1_SHOTS) {
        fs.mkdirSync(process.env.A1_SHOTS, { recursive: true });
        const t = `${w > 500 ? 'd' : 'm'}${theme === 'dark' ? 'k' : ''}`;
        // the sticky nav and the tab bar would sit over a section taller than the viewport
        await page.addStyleTag({ content: '.ux-nav, .ux-tabbar, nextjs-portal { visibility: hidden !important; }' });
        for (const s of V12_SECTIONS) await page.locator(`[data-kit-section="${s}"]`).screenshot({ path: path.join(process.env.A1_SHOTS, `${t}-kit-${s}.png`) });
        const rows = LANDMARKS.map((l) => ({ landmark: l.proto, state: refKey(w, theme, l.state), kit: l.impl, expected: expected(w, theme, l), actual: got[l.impl] }));
        fs.writeFileSync(path.join(process.env.A1_SHOTS, `${t}-landmarks.json`), `${JSON.stringify({ checked: checked.length, missing, mismatches, rows }, null, 1)}\n`);
      }
    });

    test('Team badge: pill after the name, team avatar, no level, no fan flair, the line on post and profile', async ({ page }) => {
      test.skip((await openKit(page)) !== 'v12', 'v12 kit not served here');
      const feed = page.locator('[data-kit="team-feed"] .ux-post');
      await expect(feed.locator('.ux-ph2 .ux-ava.ux-ava-team')).toHaveText('M');
      await expect(feed.locator('.ux-ph2 .ux-ava-team img')).toHaveCount(0);
      await expect(feed.locator('.ux-ph2 .ux-who + .ux-teamtag')).toHaveText('Team');
      await expect(feed.locator('.ux-teamtag')).toHaveAttribute('title', 'Editorial account run by the KpopQuiz team');
      await expect(feed.locator('.ux-ph2')).toHaveText('MMinaTeam · 2 hours ago');
      await expect(feed.locator('.ux-ph2')).not.toContainText('Lv');
      await expect(feed.locator('.ux-bias')).toHaveCount(0);
      await expect(feed.locator('.ux-teamnote')).toHaveCount(0); // the feed card has no line

      await expect(page.locator('[data-kit="team-post"] .ux-teamnote')).toHaveText('Editorial account of the KpopQuiz team. Topics and blogs are written by the team and checked before they go live. Replies come from fans.');
      await expect(page.locator('[data-kit="team-profile"] .ux-teamnote')).toHaveText('Editorial account of the KpopQuiz team. Topics and blogs are written by the team and checked before they go live.');

      // A team author passed with a fan's accent, font and bias shows none of them.
      const sec = page.locator('[data-kit-section="v12-team"]');
      const withFlair = sec.locator('.ux-post', { hasText: 'The hardest songs of the week' });
      await expect(withFlair.locator('.ux-teamnote')).toHaveCount(1);
      await expect(withFlair.locator('.ux-bias')).toHaveCount(0);
      expect(await withFlair.locator('.ux-who').getAttribute('class')).toBe('ux-who');
      expect(await withFlair.locator('.ux-who').getAttribute('style')).toBeNull();
      // and a fan next to it keeps its flair
      await expect(sec.locator('.ux-who.ux-acc-teal + .ux-bias')).toHaveText('Felix');
    });

    test('theme cards and tiles are real links; steps are an ordered list; language pills are pages', async ({ page }) => {
      test.skip((await openKit(page)) !== 'v12', 'v12 kit not served here');
      const cards = page.locator('[data-kit-section="v12-themes"] .ux-thrail').first().locator('a.ux-thm');
      await expect(cards).toHaveCount(6);
      expect(await cards.evaluateAll((els) => els.map((e) => e.getAttribute('href')))).toEqual(['/blindtest/kpop-hits-2026', '/blindtest/5th-gen', '/blindtest/tiktok-viral', '/blindtest/kpop-demon-hunters', '/blindtest/kpop-hits-2025', '/blindtest/4th-gen']);
      await expect(cards.nth(3).locator('.ux-thm-cv')).toHaveClass(/is-dark/);
      expect(await cards.nth(3).locator('.ux-thm-cv').evaluate((e) => getComputedStyle(e).color)).toBe('rgb(255, 255, 255)');
      // the link is named once: title, sub line, lead (the cover copy of the name is hidden)
      await expect(cards.nth(1)).toHaveAccessibleName('300 songs 5th gen The newest generation: Cortis, ILLIT, BABYMONSTER, KATSEYE, Hearts2Hearts and more.');

      const tiles = page.locator('[data-kit-section="v12-ways"] .ux-gtiles').first().locator('a.ux-gtile');
      await expect(tiles).toHaveCount(4);
      await expect(tiles.nth(2).locator('.ux-badge-new')).toHaveText('New');
      await expect(tiles.nth(0).locator('.ux-badge-new')).toHaveCount(0);
      await expect(tiles.nth(1)).toHaveAttribute('href', '/blindtest');

      const steps = page.locator('[data-kit-section="v12-steps"] ol.ux-steps3 > li');
      await expect(steps).toHaveCount(3);
      await expect(steps.nth(0).locator('h3')).toHaveText('Listen');

      const sw = page.locator('[data-kit-section="v12-lang"] nav.ux-langsw').first();
      await expect(sw).toHaveAttribute('aria-label', 'Page language');
      await expect(sw.locator('a')).toHaveCount(4);
      await expect(sw.locator('a[aria-current="page"]')).toHaveText('English');
      expect(await sw.locator('a').evaluateAll((els) => els.map((e) => `${e.getAttribute('hreflang')}:${e.getAttribute('lang')}`))).toEqual(['en:en', 'fr:fr', 'es:es', 'id:id']);
      expect(await sw.locator('a[aria-current="page"]').evaluate((e) => getComputedStyle(e).backgroundColor)).toBe('rgb(209, 58, 110)');
    });

    test('answers: four colours and four shapes, reveal state, phone buttons lock on the tapped answer', async ({ page }) => {
      test.skip((await openKit(page)) !== 'v12', 'v12 kit not served here');
      const round = page.locator('[data-kit="host-round"] .ux-lt');
      await expect(round).toHaveCount(4);
      expect(await round.evaluateAll((els) => els.map((e) => getComputedStyle(e).backgroundColor))).toEqual(['rgb(201, 56, 104)', 'rgb(107, 79, 216)', 'rgb(14, 124, 113)', 'rgb(165, 96, 15)']);
      expect(new Set(await round.locator('svg path').evaluateAll((els) => els.map((e) => e.getAttribute('d')))).size).toBe(4);
      await expect(round.nth(0)).toHaveText('Triangle: God\'s Menu');

      const reveal = page.locator('[data-kit="host-reveal"] .ux-lt');
      await expect(reveal.nth(0)).toHaveClass(/is-ok/);
      expect(await reveal.evaluateAll((els) => els.map((e) => getComputedStyle(e).opacity))).toEqual(['1', '0.38', '0.38', '0.38']);
      await expect(reveal.nth(0).locator('.ux-lt-cnt')).toHaveText('6 answers');
      expect(await reveal.locator('.ux-lt-bar').evaluateAll((els) => els.map((e) => (e as HTMLElement).style.width))).toEqual(['55%', '18%', '9%', '18%']);

      const open = page.locator('[data-kit="phone-open"]');
      const btns = open.locator('button.ux-pb');
      await expect(btns).toHaveCount(4);
      expect(await btns.evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')))).toEqual(['Answer 1, triangle', 'Answer 2, diamond', 'Answer 3, circle', 'Answer 4, square']);
      await expect(open.locator('[data-kit="phone-status"]')).toHaveText('Tap an answer');
      await btns.nth(2).focus();
      await page.keyboard.press('Enter');
      await expect(open.locator('[data-kit="phone-status"]')).toHaveText('Locked in: answer 3');
      await expect(open.locator('.ux-pbtns')).toHaveClass(/is-locked/);
      await expect(btns.nth(2)).toHaveAttribute('aria-pressed', 'true');
      await expect(btns.nth(0)).toBeDisabled();
      expect(await btns.evaluateAll((els) => els.map((e) => getComputedStyle(e).opacity))).toEqual(['0.3', '0.3', '1', '0.3']);

      const locked = page.locator('[data-kit="phone-locked"] .ux-pb');
      await expect(locked.nth(0)).toHaveClass(/is-me/);
    });

    test('result card parts and the distribution: real shares, the viewer row marked', async ({ page }) => {
      test.skip((await openKit(page)) !== 'v12', 'v12 kit not served here');
      const member = page.locator('[data-kit="result-member"]');
      await expect(member.locator('.ux-rescard-ph')).toHaveText('C');
      await expect(member.locator('.ux-rescard-ph img')).toHaveCount(0);
      await expect(member.locator('.ux-rescard-name')).toHaveText('Changbin');
      await expect(member.locator('.ux-traits > li')).toHaveText(['Intense', 'Warm', 'Hard-working']);
      await expect(member.locator('.ux-same')).toHaveText('9% of STAY got Changbin');
      const rows = member.locator('.ux-dist > li');
      await expect(rows).toHaveCount(8);
      await expect(rows.nth(0)).toHaveText('Han17%');
      await expect(member.locator('.ux-dist > li.is-me')).toHaveText('Changbin (your result)9%');
      expect(await rows.locator('.ux-dist-bar i').evaluateAll((els) => els.map((e) => (e as HTMLElement).style.width))).toEqual(['100%', '94%', '88%', '82%', '65%', '53%', '53%', '53%']);

      const group = page.locator('[data-kit="result-group"]');
      await expect(group.locator('.ux-rescard-ph img')).toHaveAttribute('src', /^\/idols\//);
      await expect(group.locator('.ux-rescard-ph img')).toHaveAttribute('alt', 'TWICE');
      await expect(group.locator('.ux-same')).toHaveCount(0);
    });

    test('story image variants: the saved PNG is 1080 x 1920, the square one 1080 x 1080', async ({ page }) => {
      test.skip((await openKit(page)) !== 'v12', 'v12 kit not served here');
      const sec = page.locator('[data-kit-section="v12-story"]');
      expect(await sec.locator('[data-kit="story-square"] .ux-story').evaluate((e) => { const r = e.getBoundingClientRect(); return Math.abs(r.width - r.height); })).toBeLessThan(0.5);
      for (const [name, file, w, h] of [['Story', 'kpopquiz-story.png', 1080, 1920], ['Square', 'kpopquiz-square.png', 1080, 1080]] as const) {
        const [download] = await Promise.all([page.waitForEvent('download'), sec.getByRole('button', { name, exact: true }).click()]);
        expect(download.suggestedFilename()).toBe(file);
        const saved = await download.path();
        const png = fs.readFileSync(saved);
        expect(png.subarray(1, 4).toString('latin1')).toBe('PNG');
        expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([w, h]);
        await expect(sec.locator('[data-kit="story-file"]')).toContainText(`${file} saved (${w} x ${h},`);
      }
    });

    test('stylesheet: the v12 rules and the ux-v12 page sheets are served with the v12 flag only', async ({ page }) => {
      const state = await openKit(page);
      test.skip(state === 'off', 'flag off: no kit, no stylesheet');
      const css = await stylesheet(page);
      expect(css.startsWith('/* a0.css */')).toBe(true);
      if (state === 'v12') {
        for (const c of ['.ux-teamtag{', '.ux-thm{', '.ux-gtile{', '.ux-steps3{', '.ux-langsw{', '.ux-lt{', '.ux-pb{', '.ux-rescard{', '.ux-traits{', '.ux-dist{', '.ux-story{', '--ux-lt-a:']) expect(css.includes(c), c).toBe(true);
      } else {
        for (const c of ['.ux-teamtag', '.ux-thm', '.ux-gtile', '.ux-steps3', '.ux-langsw', '.ux-ltiles', '.ux-pbtns', '.ux-rescard', '.ux-traits', '.ux-dist', '.ux-story', '--ux-lt-a', 'ux-v12/']) expect(css.includes(c), c).toBe(false);
      }
    });

    test('v11 only: the kit has no v12 section and a team prop changes nothing', async ({ page }) => {
      const state = await openKit(page);
      test.skip(state !== 'v11', `not a v11-only server (state: ${state})`);
      await expect(page.locator('[data-kit-v12]')).toHaveCount(0);
      for (const s of V11_SECTIONS) await expect(page.locator(`[data-kit-section="${s}"]`), s).toHaveCount(1);
      await expect(page.locator('.ux-teamtag, .ux-ava-team, .ux-teamnote, .ux-thm, .ux-gtile, .ux-steps3, .ux-langsw, .ux-lt, .ux-pb, .ux-rescard, .ux-story')).toHaveCount(0);
    });
  });
}
