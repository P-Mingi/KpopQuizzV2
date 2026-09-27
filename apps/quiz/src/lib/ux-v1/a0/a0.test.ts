import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { UX_TOKENS_DARK, UX_TOKENS_LIGHT } from '@/lib/design-tokens';
import { badgeRarity, RARITY_ORDER } from '@/lib/badges';
import { BADGE_FAMILIES } from '@/lib/badges/catalog';
import { blankQuestionFor, QUIZ_TYPES } from '@/lib/quiz-question';

import { activeNav, activeTab, isPlainClick, NAV_ITEMS, TAB_ITEMS } from './nav';
import { badgeFamily, badgeGlyph, hasBadgeGlyph, RARITY_ART } from './badge-art';
import { groupPhotoUrl, GROUP_PHOTO_SLUGS, photoFocal } from './group-photos';
import { isStartedDraft, MY_QUIZZES_HREF, samePageHash } from './my-quizzes';
import { streakView } from './streak';
import { THEME_COLOR } from './theme';

const here = path.dirname(fileURLToPath(import.meta.url));
const css = fs.readFileSync(path.resolve(here, '../../../styles/ux-v1/a0.css'), 'utf8');

function block(selectorStart: string): Record<string, string> {
  const i = css.indexOf(selectorStart);
  if (i < 0) throw new Error(`no block ${selectorStart}`);
  const body = css.slice(css.indexOf('{', i) + 1, css.indexOf('}', i));
  const out: Record<string, string> = {};
  for (const [, k, v] of body.matchAll(/--ux-([a-z0-9-]+):\s*([^;]+);/g)) if (k && v) out[k] = v.trim().replace(/\s+/g, '');
  return out;
}
const norm = (v: string): string => v.replace(/\s+/g, '').toLowerCase();

describe('tokens: a0.css and lib/design-tokens.ts agree', () => {
  const light = block('html.ux-v1,\n.ux-theme-light');
  const dark = block('html.ux-v1.dark,\n.ux-theme-dark');
  const system = block('html.ux-v1:not(.light)');
  it('light', () => {
    for (const [k, v] of Object.entries(UX_TOKENS_LIGHT)) expect(norm(light[k] ?? ''), k).toBe(norm(v));
  });
  it('dark (class) and dark (system) are identical and match', () => {
    for (const [k, v] of Object.entries(UX_TOKENS_DARK)) {
      if (k in dark) expect(norm(dark[k] ?? ''), k).toBe(norm(v));
      else expect(norm(light[k] ?? ''), `${k} (theme-independent)`).toBe(norm(v));
    }
    expect(system).toEqual(dark);
  });
  it('v11.1 light border tokens (17.1)', () => {
    expect(light.line).toBe('#ECE8E3'); expect(dark.line).toBe('#2B2826');
    expect(light['line-2']).toBe('#F3F1EE'); expect(dark['line-2']).toBe('#242220');
    expect(light.edge).toBe('#E5E0DA'); expect(dark.edge).toBe('#35312E');
    expect(light['pink-line']).toBe('#F2CFDB'); expect(dark['pink-line']).toBe('#4A2A37');
  });
});

describe('ink floor: every text token pair is AA (16.9)', () => {
  const rgb = (h: string): number[] => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const lum = (h: string): number => {
    const [r, g, b] = rgb(h).map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
  };
  const ratio = (a: string, b: string): number => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return ((x ?? 0) + 0.05) / ((y ?? 0) + 0.05); };
  // The text / ground pairs the v11 components actually use.
  const PAIRS: [string[], string[]][] = [
    [['ink', 'muted'], ['page', 'surface', 'surface-2', 'raised', 'paper']],
    [['ink'], ['pink-soft']],
    [['pink-ink'], ['page', 'surface', 'raised', 'paper']],
    [['pink-soft-ink'], ['pink-soft']],
  ];
  for (const [name, t] of [['light', UX_TOKENS_LIGHT], ['dark', UX_TOKENS_DARK]] as const) {
    it(`${name}: ink, muted, pink-ink, pink-soft-ink, accents and rarity words >= 4.5`, () => {
      const flair = Object.keys(t).filter((k) => k.startsWith('acc-') || k.startsWith('rar-'));
      const pairs: [string[], string[]][] = [...PAIRS, [flair, ['page', 'surface', 'surface-2', 'raised', 'paper', 'pink-soft']]];
      for (const [inks, grounds] of pairs) for (const i of inks) for (const g of grounds) {
        expect(ratio(t[i] as string, t[g] as string), `${name} ${i} on ${g}`).toBeGreaterThanOrEqual(4.5);
      }
    });
  }
  it('white on the pink fill button (4.62:1, 16.1)', () => {
    expect(ratio('#FFFFFF', UX_TOKENS_LIGHT['pink-fill'] as string)).toBeGreaterThanOrEqual(4.5);
  });
});

// Owner request 2026-09-27 (A0 fix 5, owner-approved deviation from the prototype):
// light page ground = the live site's warm --bg; everything that was white on the
// prototype's white page stays white; the fills keep their visible step; dark unchanged.
describe('owner request: warm light page ground (A0 fix 5)', () => {
  const lin = (v: number): number => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const lab = (h: string): number[] => {
    const [r, g, b] = [1, 3, 5].map((i) => lin(parseInt(h.slice(i, i + 2), 16))) as [number, number, number];
    const xyz = [(0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047, 0.2126 * r + 0.7152 * g + 0.0722 * b, (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883];
    const [fx, fy, fz] = xyz.map((t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)) as [number, number, number];
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
  };
  const dE = (a: string, b: string): number => { const [p, q] = [lab(a), lab(b)]; return Math.hypot(...p.map((v, i) => v - (q[i] ?? 0))); };
  const globals = fs.readFileSync(path.resolve(here, '../../../styles/globals.css'), 'utf8');

  it('light page = the live --bg (globals.css), white fills stay white', () => {
    const liveBg = /--bg:\s*(#[0-9A-Fa-f]{6});/.exec(globals)?.[1];
    expect(liveBg).toBe('#FAF8F5');
    expect(UX_TOKENS_LIGHT.page).toBe(liveBg);
    for (const k of ['raised', 'paper', 'card-fill']) expect(UX_TOKENS_LIGHT[k], k).toBe('#FFFFFF');
    expect(norm(UX_TOKENS_LIGHT['nav-bg'] ?? '')).toBe('rgba(250,248,245,.86)');
    expect(norm(UX_TOKENS_LIGHT['tabbar-bg'] ?? '')).toBe('rgba(255,255,255,.86)');
    expect(THEME_COLOR.light).toBe(UX_TOKENS_LIGHT.page);
  });
  it('dark is unchanged: paper = page, card fill transparent, tab bar = nav glass', () => {
    expect(UX_TOKENS_DARK.page).toBe('#141312');
    expect(UX_TOKENS_DARK.paper).toBe(UX_TOKENS_DARK.page);
    expect(UX_TOKENS_DARK['card-fill']).toBe('transparent');
    expect(UX_TOKENS_DARK['tabbar-bg']).toBe(UX_TOKENS_DARK['nav-bg']);
    expect(norm(UX_TOKENS_DARK['nav-bg'] ?? '')).toBe('rgba(20,19,18,.84)');
    expect(THEME_COLOR.dark).toBe(UX_TOKENS_DARK.page);
  });
  it('surface and surface-2 keep the prototype step from the ground (CIE76 dE within 10%)', () => {
    const proto = { surface: dE('#FFFFFF', '#F7F6F4'), s2: dE('#FFFFFF', '#F0EEEA'), step: dE('#F7F6F4', '#F0EEEA') };
    const now = {
      surface: dE(UX_TOKENS_LIGHT.page as string, UX_TOKENS_LIGHT.surface as string),
      s2: dE(UX_TOKENS_LIGHT.page as string, UX_TOKENS_LIGHT['surface-2'] as string),
      step: dE(UX_TOKENS_LIGHT.surface as string, UX_TOKENS_LIGHT['surface-2'] as string),
    };
    for (const k of ['surface', 's2', 'step'] as const) {
      expect(Math.abs(now[k] - proto[k]) / proto[k], `${k}: ${now[k].toFixed(2)} vs ${proto[k].toFixed(2)}`).toBeLessThanOrEqual(0.1);
    }
  });
  it('a0.css paints no white fill with the page token (only the ground and the nav bell ring use it)', () => {
    const bare = css.replace(/\/\*[\s\S]*?\*\//g, '');
    const uses: string[] = [];
    for (let i = bare.indexOf('var(--ux-page)'); i >= 0; i = bare.indexOf('var(--ux-page)', i + 1)) {
      const open = bare.lastIndexOf('{', i);
      uses.push(bare.slice(bare.lastIndexOf('}', open) + 1, open).trim().replace(/\s+/g, ' '));
    }
    expect(uses).toEqual(['html.ux-v1 body', '.ux-app, .ux-theme-light, .ux-theme-dark', '.ux-bell-dot']);
  });
});

describe('nav model', () => {
  it('every item is a real path', () => {
    for (const it2 of [...NAV_ITEMS, ...TAB_ITEMS]) expect(it2.href.startsWith('/')).toBe(true);
  });
  it.each([
    ['/', 'home', 'home'],
    ['/quizzes', 'quizzes', 'quizzes'],
    ['/quizzes/popular-this-week', 'quizzes', 'quizzes'],
    ['/q/some-quiz', 'quizzes', 'quizzes'],
    ['/groups', 'groups', 'quizzes'],
    ['/bts-quiz', 'groups', 'quizzes'],
    ['/twice-trivia', 'groups', 'quizzes'],
    ['/blindtest', 'blindtest', 'blindtest'],
    ['/blindtest/ranked', 'blindtest', 'blindtest'],
    ['/community', 'community', 'community'],
    ['/leaderboard', 'leaderboard', 'community'],
    ['/profile', null, 'you'],
    ['/u/someone', null, 'you'],
    ['/settings', null, 'you'],
    ['/notifications', null, 'you'],
    ['/create', null, null],
    ['/pt/quizzes', 'quizzes', 'quizzes'],
    ['/pt', 'home', 'home'],
    ['/quizzesx', null, null],
  ])('%s', (p, nav, tab) => {
    expect(activeNav(p)).toBe(nav);
    expect(activeTab(p)).toBe(tab);
  });
  it('isPlainClick: only an unmodified primary click is the page\'s to take over', () => {
    const plain = { button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, defaultPrevented: false };
    expect(isPlainClick(plain)).toBe(true);
    expect(isPlainClick({ ...plain, metaKey: true })).toBe(false);
    expect(isPlainClick({ ...plain, ctrlKey: true })).toBe(false);
    expect(isPlainClick({ ...plain, shiftKey: true })).toBe(false);
    expect(isPlainClick({ ...plain, altKey: true })).toBe(false);
    expect(isPlainClick({ ...plain, button: 1 })).toBe(false);
    expect(isPlainClick({ ...plain, defaultPrevented: true })).toBe(false);
  });
});

describe('badge medallions (17.8)', () => {
  it('every rarity has a frame and gradient', () => {
    for (const r of RARITY_ORDER) {
      expect(RARITY_ART[r].shape).toMatch(/^<(circle|rect|path)/);
      expect(RARITY_ART[r].from).toMatch(/^#/);
    }
  });
  it('spec glyph map: unique glyph per named badge', () => {
    const ids = ['perfect_score', 'streak_7', 'streak_30', 'creator_bronze', 'creator_silver', 'golden_ear_5', 'first_steps', 'hard_mode', 'quiz_maker', 'quizmaker_5', 'marathoner_50', 'perfectionist_10', 'debater_5', 'multi_stan', 'fandom_traveler_5', 'dedicated_fan', 'viral_hit', 'community_star', 'group_master', 'founding_fan'];
    const glyphs = ids.map(badgeGlyph);
    expect(new Set(glyphs).size).toBe(ids.length);
  });
  it('every catalog tier resolves to its family glyph', () => {
    for (const f of BADGE_FAMILIES) for (const t of f.tiers) {
      const id = `${f.key}_${t}`;
      expect(badgeFamily(id)).toBe(f.key);
      expect(hasBadgeGlyph(id), id).toBe(true);
    }
  });
  it('rarity stays the lib/badges.ts truth', () => {
    expect(badgeRarity('group_master')).toBe('legendary');
    expect(badgeRarity('first_steps')).toBe('common');
  });
});

describe('group photos (16.8)', () => {
  it('33 groups, encoded public paths that exist', () => {
    expect(GROUP_PHOTO_SLUGS.length).toBe(33);
    for (const s of GROUP_PHOTO_SLUGS) {
      const url = groupPhotoUrl(s) as string;
      const file = decodeURIComponent(url.replace('/idols/', ''));
      expect(fs.existsSync(path.resolve(here, '../../../../public/idols', file)), file).toBe(true);
    }
    expect(groupPhotoUrl('chungha')).toBeNull();
    expect(groupPhotoUrl(null)).toBeNull();
  });
  it('focal point is stable', () => {
    expect(photoFocal('abc')).toBe(photoFocal('abc'));
  });
});

describe('streak view', () => {
  const now = new Date('2026-09-25T18:48:00Z'); // a Friday
  // streakView() takes `now`, but the state comes from lib/streak.ts streakState(),
  // which reads the wall clock (shared flag-off code, not changed here). Freeze the
  // system clock on the same instant so the cases do not depend on the day they run.
  beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(now); });
  afterEach(() => { vi.useRealTimers(); });
  it('at risk: played yesterday', () => {
    const v = streakView(12, '2026-09-24', now);
    expect(v?.state).toBe('at_risk');
    expect(v?.left).toBe('5h 12m');
    expect(v?.week.map((d) => d.done)).toEqual([true, true, true, true, false, false, false]);
    expect(v?.week[4]?.today).toBe(true);
  });
  it('played today', () => {
    const v = streakView(3, '2026-09-25', now);
    expect(v?.state).toBe('played_today');
    expect(v?.week.map((d) => d.done)).toEqual([false, false, true, true, true, false, false]);
  });
  it('nothing to show', () => {
    expect(streakView(0, '2026-09-25', now)).toBeNull();
    expect(streakView(5, '2026-09-20', now)).toBeNull();
    expect(streakView(5, null, now)).toBeNull();
  });
});

describe('avatar menu: My quizzes (X1-003)', () => {
  it('opens the personal passport on its Quizzes tab (P10 hash deep link)', () => {
    expect(MY_QUIZZES_HREF).toBe('/me#p10-panel-quizzes');
  });
  it('samePageHash: switch in place only on the page the link points at', () => {
    expect(samePageHash(MY_QUIZZES_HREF, '/me')).toBe('#p10-panel-quizzes');
    expect(samePageHash(MY_QUIZZES_HREF, '/profile')).toBeNull();
    expect(samePageHash(MY_QUIZZES_HREF, '/u/someone')).toBeNull();
    expect(samePageHash(MY_QUIZZES_HREF, '/quizzes')).toBeNull();
    expect(samePageHash('/me', '/me')).toBeNull();
    expect(samePageHash('#x', '/anywhere')).toBe('#x');
  });
  const blank = (type: string) => ({ title: '', newGroup: null, cover: null, creatorNote: '', questions: [blankQuestionFor(type)] });
  it.each(QUIZ_TYPES)('a blank %s draft (the autosave of a /create visit) is not a draft', (type) => {
    expect(isStartedDraft(blank(type))).toBe(false);
    expect(isStartedDraft({ ...blank(type), title: '   ' })).toBe(false);
  });
  it('no draft, or an empty question list, is not a draft', () => {
    expect(isStartedDraft(null)).toBe(false);
    expect(isStartedDraft({ ...blank('multiple_choice'), questions: [] })).toBe(false);
  });
  it('anything typed or picked by hand makes it a draft', () => {
    const mc = blank('multiple_choice');
    expect(isStartedDraft({ ...mc, title: 'SKZ b-sides' })).toBe(true);
    expect(isStartedDraft({ ...mc, newGroup: 'NMIXX' })).toBe(true);
    expect(isStartedDraft({ ...mc, cover: 'data:image/jpeg;base64,AAAA' })).toBe(true);
    expect(isStartedDraft({ ...mc, creatorNote: 'For STAYs' })).toBe(true);
    expect(isStartedDraft({ ...mc, questions: [{ ...blankQuestionFor('multiple_choice'), question: 'Who?' }] })).toBe(true);
    expect(isStartedDraft({ ...mc, questions: [{ ...blankQuestionFor('multiple_choice'), options: ['', 'Han', '', ''] }] })).toBe(true);
    expect(isStartedDraft({ ...mc, questions: [{ ...blankQuestionFor('true_false'), correct: true }] })).toBe(true);
    expect(isStartedDraft({ ...mc, questions: [{ ...blankQuestionFor('guess_from_clues'), clues: ['', 'Leader', ''] }] })).toBe(true);
    expect(isStartedDraft({ ...mc, questions: [{ ...blankQuestionFor('image'), image_url: 'data:image/png;base64,AAAA' }] })).toBe(true);
    const intruder = blankQuestionFor('intruder');
    expect(isStartedDraft({ ...mc, questions: [{ ...intruder, options: [{ label: 'Felix', image_url: null }, ...(intruder.options.slice(1) as { label: string; image_url: string | null }[])] }] })).toBe(true);
  });
});
