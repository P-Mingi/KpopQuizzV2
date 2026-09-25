import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { UX_TOKENS_DARK, UX_TOKENS_LIGHT } from '@/lib/design-tokens';
import { badgeRarity, RARITY_ORDER } from '@/lib/badges';
import { BADGE_FAMILIES } from '@/lib/badges/catalog';

import { activeNav, activeTab, NAV_ITEMS, TAB_ITEMS } from './nav';
import { badgeFamily, badgeGlyph, hasBadgeGlyph, RARITY_ART } from './badge-art';
import { groupPhotoUrl, GROUP_PHOTO_SLUGS, photoFocal } from './group-photos';
import { streakView } from './streak';

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
