// Lot o1/next (owner, 2026-11-09), points A and B of the home:
//  A. a signed-in fan gets the two hero buttons too, as real links under the streak line (no hidden copy any more);
//  B. on kpopquiz.org, as on OtakuQuiz, Surprise me sits right under the header and before the quiz of the day (the kpop-first order
//     of audit 01 P0-2 is undone); the phone chip "Today's quiz" stays in both headers.
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const me = vi.hoisted(() => ({ value: null as unknown }));
vi.mock('@/components/ux-v1/use-ux-me', () => ({ useUxMe: () => me.value }));

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); me.value = null; });

const SIGNED_IN = { profile: { username: 'fan1', display_name: 'Fan One', daily_streak: 3, last_daily_date: '2026-11-08' } };
const DAILY = { slug: 'the-quiz', title: 'The quiz' };

describe('A. the hero buttons', () => {
  for (const site of ['kpop', 'anime'] as const) {
    it(`${site}: signed in, the two buttons are real links under the streak line, the same block as the guest header`, async () => {
      vi.resetModules();
      if (site !== 'kpop') vi.stubEnv('NEXT_PUBLIC_SITE_ID', site);
      const { HomeHeader } = await import('./home-header');
      const guest = renderToStaticMarkup(h(HomeHeader, { daily: DAILY }));
      me.value = SIGNED_IN;
      const signedIn = renderToStaticMarkup(h(HomeHeader, { daily: DAILY }));
      const block = (html: string): string => /<div class="p1-hcta">[\s\S]*?<\/a><\/div>/.exec(html)?.[0] ?? '';
      expect(signedIn).toContain('data-auth="in"');
      expect(block(signedIn)).not.toBe('');
      expect(block(signedIn)).toBe(block(guest));
      expect(block(signedIn)).toContain('href="/quizzes"');
      expect(block(signedIn)).toContain('href="/create"');
      expect(block(signedIn)).toContain(site === 'kpop' ? 'Browse K-pop quizzes' : 'Browse anime quizzes');
      expect(signedIn).not.toContain('aria-hidden="true" style="visibility:hidden"');
      expect(signedIn).not.toContain('tabindex="-1"><svg');
      // Under the streak line, after the phone chip, as in the guest header.
      expect(signedIn.indexOf('class="p1-hcta"')).toBeGreaterThan(signedIn.indexOf('class="p1-hsub"'));
      expect(signedIn.indexOf('class="p1-hcta"')).toBeGreaterThan(signedIn.indexOf('class="p1-dchip"'));
    });
  }
});

describe('B. the order of the kpopquiz.org home', () => {
  beforeEach(() => {
    vi.doMock('next/image', () => ({ default: (p: Record<string, unknown>) => h('img', { src: p.src as string, alt: p.alt as string }) }));
    vi.doMock('@/components/home/activity-ticker', () => ({ ActivityTicker: () => null }));
    vi.doMock('@/components/home/ux-v1/islands', () => ({ HomeHeader: () => h('header', { className: 'p1-hhead' }), ContinuePlaying: () => null, BlindtestBand: () => null, QotdNote: () => null }));
    vi.doMock('@/components/home/ux-v1/qotd-row', () => ({ QotdRow: () => h('section', { className: 'p1-qotd' }) }));
    vi.doMock('@/lib/ux-v1/p1/home-data', () => ({
      getHomeQotd: async () => ({ id: 'qotd-1', slug: 'the-quiz', title: 'The quiz' }),
      getHomeGroups: async () => ({ groups: [], visibleGroups: 0 }),
      getHomeCommunity: async () => ({ rows: [], verse: null }),
      getHomeBand: async () => ({ date: '2026-11-09', fans: 0 }),
      getHomeLists: async () => ({ trending: [], best: [], fresh: [] }),
    }));
  });
  afterEach(() => { vi.doUnmock('next/image'); vi.doUnmock('@/components/home/activity-ticker'); vi.doUnmock('@/components/home/ux-v1/islands'); vi.doUnmock('@/components/home/ux-v1/qotd-row'); vi.doUnmock('@/lib/ux-v1/p1/home-data'); });

  it('kpop: header, then Surprise me, then the quiz of the day (as on OtakuQuiz)', async () => {
    vi.resetModules();
    const { IS_KPOP } = await import('@/lib/site/genre');
    expect(IS_KPOP).toBe(true);
    const { UxHome } = await import('./ux-home');
    const html = renderToStaticMarkup(await UxHome({ afterHeader: h('div', { className: 'kpop-h2-surprise' }) }));
    const at = (needle: string): number => html.indexOf(needle);
    expect(at('class="p1-hhead"')).toBeGreaterThan(-1);
    expect(at('class="kpop-h2-surprise"')).toBeGreaterThan(at('class="p1-hhead"'));
    expect(at('class="p1-qotd"')).toBeGreaterThan(at('class="kpop-h2-surprise"'));
  });
});
