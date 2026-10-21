// Run O1, lot (b), lane P1: an editorial (Team) account on the passport of a world site says the site's team chip and line
// (copy team.chip, team.profileLine), keeps only its work as a creator, and never poses as a fan. Anime build, v12 on.
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/ux-v12', () => ({ isUxV12: () => true }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: () => undefined, push: () => undefined }), usePathname: () => '/u/x' }));

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

describe('a Team account on anime', () => {
  it('shows "OtakuQuiz team" and "Editorial account of OtakuQuiz", with no K-pop word and only its creator stats', async () => {
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_SITE_ID', 'anime');
    const [{ buildPassport }, { UxPassport }, { passportWords }] = await Promise.all([
      import('@/lib/ux-v1/p10/build-passport'), import('@/components/profile/ux-v1/passport'), import('./words'),
    ]);
    const words = passportWords('anime')!;
    const props = buildPassport({
      mode: 'public',
      profile: { id: 't1', username: 'oq_creator_01', display_name: 'OtakuQuiz Creator 01', avatar_url: null, avatar_bg: '#222', avatar_text: '#fff', bio: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', total_quizzes_created: 3, total_plays_received: 90, total_likes_received: 4, xp: 0, follower_count: 2, following_count: 0, name_accent: null, name_font: null, pinned_badge_id: null, avatar_kind: null, avatar_ref: null, stan_since: null, header_url: null },
      spine: null, groupStats: [], collection: { groups_mastered: 0, groups_total: 0, eras: [] }, groups: [], badgeDefs: [], earnedBadgeIds: [], quizzes: [],
      fandomName: null, war: null, now: Date.parse('2026-10-20T12:00:00Z'), team: { displayName: 'OtakuQuiz Creator 01', beat: 'Daily quizzes' }, words, site: 'anime',
    });
    expect(props.level).toBe('OtakuQuiz team');
    const html = renderToStaticMarkup(h(UxPassport, props));
    expect(html).toContain('Editorial account of OtakuQuiz');
    expect(html).toContain('quizzes made');
    expect(html).not.toMatch(/k-?pop|stan|series mastered|streak/i);
  });
});
