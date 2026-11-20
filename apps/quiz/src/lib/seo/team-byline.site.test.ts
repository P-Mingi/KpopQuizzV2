// Run O1, lot LAUNCH-POLISH (owner, 2026-11-20): a Team quiz is signed with the name of the site: "KpopQuiz Team" on kpopquiz.org,
// "OtakuQuiz Team" on OtakuQuiz, "Bunnyverse Team" on the hub. The Team rule is the one of kpopquiz.org (editorial accounts), and the
// Team badge shows on an OtakuQuiz quiz made by a Team account, never on a fan's.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/profile/follow-button', () => ({ FollowButton: () => null }));
vi.mock('@/components/layout/world-link', () => ({ WorldLink: (p: { href: string; children: unknown }) => createElement('a', { href: p.href }, p.children as never) }));

vi.setConfig({ testTimeout: 60_000 });
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

type Site = 'kpop' | 'anime' | 'hub';
const NAMES: Record<Site, string> = { kpop: 'KpopQuiz Team', anime: 'OtakuQuiz Team', hub: 'Bunnyverse Team' };

async function onSite(site: Site) {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_SITE_ID', site);
  const [byline, meta, card] = await Promise.all([import('./team-byline'), import('./quiz-meta'), import('@/components/profile/person-card')]);
  return { byline, meta, card };
}

describe('the Team byline of each site', () => {
  for (const site of ['kpop', 'anime', 'hub'] as const) {
    it(`${site}: "${NAMES[site]}"`, async () => {
      const { byline, meta } = await onSite(site);
      expect(byline.TEAM_AUTHOR_NAME).toBe(NAMES[site]);
      expect(byline.TEAM_BYLINE).toBe(`the ${NAMES[site]}`);
      expect(meta.quizAuthorJsonLd('mina', true)).toMatchObject({ '@type': 'Organization', name: NAMES[site] });
    });
  }
  it('kpop is unchanged: the same Organization and the same address as before', async () => {
    const { meta } = await onSite('kpop');
    expect(meta.quizAuthorJsonLd('njeansstan', true)).toEqual({ '@type': 'Organization', name: 'KpopQuiz Team', url: 'https://kpopquiz.org/about' });
    expect(meta.quizAuthorJsonLd('mina', false)).toEqual({ '@type': 'Person', name: 'mina', url: 'https://kpopquiz.org/u/mina' });
  });
});

describe('the Team badge on a quiz page of OtakuQuiz', () => {
  const person = { username: 'njeansstan', avatarUrl: null, avatarBg: '#fff', avatarText: '#000', xp: 4000, followerCount: 3 };
  it('shows the badge and "by the OtakuQuiz Team" for a Team account, never "KpopQuiz"', async () => {
    const { card } = await onSite('anime');
    const html = renderToStaticMarkup(createElement(card.PersonCard, { person: { ...person, isTeam: true }, compact: true }));
    expect(html).toContain('ux-teamtag');
    expect(html).toContain('by the OtakuQuiz Team');
    expect(html).not.toContain('KpopQuiz');
  });
  it('shows no badge on a fan quiz', async () => {
    const { card } = await onSite('anime');
    const html = renderToStaticMarkup(createElement(card.PersonCard, { person, compact: true }));
    expect(html).not.toContain('ux-teamtag');
    expect(html).not.toContain('Team');
    expect(html).toMatch(/Lv \d/);
  });
});

describe('the Team rule of the quiz pages: the editorial accounts, for every site', () => {
  async function rule(ids: string[] | 'fail') {
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_SITE_ID', 'anime');
    vi.doMock('@/lib/ux-v12', () => ({ isUxV12: () => true }));
    vi.doMock('next/cache', () => ({ unstable_cache: (fn: unknown) => fn }));
    vi.doMock('@/lib/supabase/server', () => ({
      createServiceRoleClient: () => ({
        from: () => ({ select: () => ({ order: () => ({ limit: () => (ids === 'fail'
          ? Promise.reject(new Error('down'))
          : Promise.resolve({ data: ids.map((id) => ({ user_id: id, display_name: 'Team', beat: 'x', active: true })), error: null, status: 200 })) }) }) }),
      }),
    }));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    return import('@/lib/editorial/accounts');
  }
  it('is true for a Team account, false for a fan, false with no id', async () => {
    const a = await rule(['team-1']);
    expect(await a.isTeamQuizCreator('team-1')).toBe(true);
    expect(await a.isTeamQuizCreator('fan-9')).toBe(false);
    expect(await a.isTeamQuizCreator(null)).toBe(false);
    expect(await a.isTeamQuizCreator(undefined)).toBe(false);
  });
  it('is false when the read fails', async () => {
    const a = await rule('fail');
    expect(await a.isTeamQuizCreator('team-1')).toBe(false);
  });
});
