// The Bunnyverse passport redesign (owner, 2026-11-22: "make this page beautiful (UX and UI), with some of the information showing live").
// The page states the numbers it had (my_passport and the Collection count), draws them as rings and bars, keeps one H1, and its live row
// states nothing the server cannot know (placeholders until the browser reads the device and the wallet).
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/site/registry', async (o) => { const real = await o<typeof import('@/lib/site/registry')>(); return { ...real, SITE_ID: 'hub', SITE: real.REGISTRY.hub }; });

import { buildCommonPassport } from '@/lib/site/hub/passport-page';

import { HubPassport } from './hub-passport';
import { collectionPct, hubCollectionCard } from './hub-passport-collection';

import type { MyPassportRow } from '@/lib/passport/types';

const DASH = new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`);
const row = (site: 'kpop' | 'anime', xp: number, plays: number, streak: number): MyPassportRow => ({
  site_id: site, joined_at: '2026-01-01', joined_via: 'direct' as MyPassportRow['joined_via'], via_code: null, activated_at: '2026-01-01', xp, plays, daily_streak: streak, quizzes_created: 0, show_elsewhere: true,
});
const passport = buildCommonPassport([row('kpop', 1531, 28, 1), row('anime', 20, 2, 0)], 'mingi');
const css = readFileSync(new URL('../../styles/sites/hub/pp.css', import.meta.url), 'utf8');

describe('the passport data', () => {
  it('adds the progress into the level and the XP to the next one, total and per site, from getLevelInfo', async () => {
    const { getLevelInfo } = await import('@/lib/constants');
    const total = getLevelInfo(1551, 'hub');
    expect(passport.totalXp).toBe(1551);
    expect(passport.progress).toBe(total.progress);
    expect(passport.xpToNext).toBe((total.xpForNextLevel ?? 1551) - 1551);
    for (const s of passport.sites) {
      const lv = getLevelInfo(s.xp, s.id);
      expect(s.progress).toBe(lv.progress);
      expect(s.xpToNext).toBe((lv.xpForNextLevel ?? s.xp) - s.xp);
      expect(s.xpToNext).toBeGreaterThan(0);
    }
  });
});

describe('the page', () => {
  const html = renderToStaticMarkup(createElement(HubPassport, { passport, collection: hubCollectionCard({ owned: 104, total: 1056 }) }));

  it('one H1 with the fan, the total level and XP, a card per site with its numbers and its signed-in link', () => {
    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html).toMatch(/<h1 id="hub-pp-h" class="hub-pp-h1">@mingi<\/h1>/);
    expect(html).toContain('>Level 7<');
    expect(html).toContain('1,551</span> XP in all');
    expect(html.match(/<li class="hub-pp-site hub-pp-(kpop|anime)">/g)).toHaveLength(2);
    expect(html).toContain('>1,531</dd>');
    expect(html).toContain('>28</dd>');
    expect(html).toMatch(/href="\/auth\/passport\/out\?to=kpop&amp;next=%2Fme&amp;via=f\.pp" rel="nofollow">Open on KpopQuiz/);
    expect(html).not.toMatch(DASH);
  });

  it('the live row says nothing it cannot know on the server: placeholders, then the browser fills them', () => {
    expect(html).toContain('<h2 id="hub-pp-live-h" class="hub-pp-bandh">Right now</h2>');
    expect(html.match(/class="hub-pp-skel"/g)).toHaveLength(2);
    expect(html).not.toMatch(/left today|packs? ready|done today/);
    expect(html).toContain('href="/kpopcards"');
  });

  it('without the Collection (bridges off), no packs tile and no Collection card', () => {
    const off = renderToStaticMarkup(createElement(HubPassport, { passport }));
    expect(off).not.toContain('hub-pp-tile-packs');
    expect(off).not.toContain('data-testid="cards-collection"');
    expect(off).toContain('hub-pp-liverow-1');
  });

  it('the Collection card: the count, the share complete rounded down, the binder', () => {
    expect(html).toContain('104 of 1,056 cards');
    expect(html).toContain('9% complete');
    expect(collectionPct({ owned: 1055, total: 1056 })).toBe(99);
    expect(collectionPct({ owned: 0, total: 0 })).toBe(0);
    expect(html).toContain('href="/kpopcards/collection"');
  });

  it('every class of the page has a rule, and every animation stops with reduced motion', () => {
    const off = renderToStaticMarkup(createElement(HubPassport, { passport }));
    const classes = new Set([...(html + off).matchAll(/class="([^"]+)"/g)].flatMap((m) => m[1]!.split(' ')).filter((c) => c.startsWith('hub-pp')));
    for (const c of classes) expect(css, c).toMatch(new RegExp(`\\.${c}[ ,{:.>]`));
    const reduced = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
    for (const cls of ['.hub-pp-ring-arc', '.hub-pp-bar > span', '.hub-pp-packs > span', '.hub-pp-skel', '.hub-pp-live-dot::after']) expect(reduced, cls).toContain(cls);
    expect(css).not.toMatch(DASH);
  });
});
