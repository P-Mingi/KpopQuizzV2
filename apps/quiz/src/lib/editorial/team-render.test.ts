// V12 G9: the Team badge data on the surfaces that show a person, rendered server
// free (no database). What it proves: fed a post whose author is an editorial
// account, the REAL feed card and the REAL post view render the team avatar, the
// Team pill, the line under the author, the time alone (no level) and no fan flair;
// with the v12 flag off the same props render exactly like a fan with no flair
// (no pill, no line). The two HTML files it pins (__fixtures__/) are what
// e2e/ux-v12/g9.spec.ts measures against the prototype reference in a real page.

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { P8Post } from '@/lib/ux-v1/p8/post';
import type { FeedPost, P8Person } from '@/lib/ux-v1/p8/types';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: () => undefined, push: () => undefined }), usePathname: () => '/community' }));

const NOW = Date.parse('2026-10-02T12:00:00Z');
const MINA = '11111111-1111-4111-8111-111111111111';

async function load(v12: boolean): Promise<{
  FeedCard: typeof import('@/components/community/ux-v1/feed-card').FeedCard;
  PostView: typeof import('@/components/community/ux-v1/post-view').PostView;
  toPerson: typeof import('@/lib/ux-v1/p8/people').toPerson;
  draftToPost: typeof import('./preview').draftToPost;
}> {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_UX_V1', '1');
  vi.stubEnv('NEXT_PUBLIC_UX_V12', v12 ? '1' : '');
  const [card, view, people, preview] = await Promise.all([
    import('@/components/community/ux-v1/feed-card'), import('@/components/community/ux-v1/post-view'), import('@/lib/ux-v1/p8/people'), import('./preview'),
  ]);
  return { FeedCard: card.FeedCard, PostView: view.PostView, toPerson: people.toPerson, draftToPost: preview.draftToPost };
}

afterEach(() => { vi.unstubAllEnvs(); });

const GENERAL = { id: 1, name: 'General K-pop', slug: 'general-kpop', fandom: null };

/** The prototype's team post (POSTS.team): a thread by Mina, 2 hours ago. */
function teamPosts(author: P8Person): { feed: FeedPost; post: P8Post } {
  const at = new Date(NOW - 2 * 3600_000).toISOString();
  const feed: FeedPost = {
    kind: 'thread', key: 'e1', href: '/community/thread/e1', title: 'Which b-side deserves a comeback stage?',
    excerpt: 'One b-side from any group that never got a music show stage. Say why in one line. The best answers go in Friday’s recap.',
    group: GENERAL, author, at, ago: '2 hours ago', replies: 57, likes: 31, editorialId: 1,
  };
  const post: P8Post = {
    ...feed, excerpt: null, likes: 64,
    paragraphs: ['One b-side from any group that never got a music show stage. Say why in one line.', 'The best answers go in Friday’s recap, with your name.'],
    html: null, likeType: 'editorial', openingCommentId: null, comments: [], commentCount: 57,
    replyTo: { store: 'community', target_type: 'editorial', target_id: 1 }, sources: [],
  };
  return { feed, post };
}

const PROFILE = { id: MINA, username: 'mina', display_name: 'Mina K', avatar_url: 'https://example.com/a.jpg', xp: 5000, name_accent: 'teal', name_font: 'serif', bias: 'Felix' };

describe('toPerson: an editorial account', () => {
  it('takes the name the owner gave it and nothing of a fan', async () => {
    const { toPerson } = await load(true);
    expect(toPerson(MINA, PROFILE, { displayName: 'Mina', beat: 'Girl groups' })).toEqual({
      name: 'Mina', username: 'mina', href: '/u/mina', avatarUrl: null, accent: null, font: null, bias: null, level: null, levelTitle: null, isSystem: false, isTeam: true,
    });
  });

  it('a fan has no isTeam key at all (a v11 payload is unchanged)', async () => {
    const { toPerson } = await load(true);
    const fan = toPerson(MINA, PROFILE);
    expect('isTeam' in fan).toBe(false);
    expect(fan).toMatchObject({ name: 'Mina K', accent: 'teal', bias: 'Felix', avatarUrl: 'https://example.com/a.jpg' });
    expect(fan.level).toBeGreaterThan(0);
    expect('isTeam' in toPerson(MINA, PROFILE, null)).toBe(false);
  });
});

describe('feed card and post view of an editorial post', () => {
  it('v12 on: team avatar, Team pill, time alone, no flair; pinned as the e2e fixtures', async () => {
    const { FeedCard, PostView, toPerson } = await load(true);
    const { feed, post } = teamPosts(toPerson(MINA, PROFILE, { displayName: 'Mina', beat: 'Girl groups' }));

    const card = renderToStaticMarkup(createElement(FeedCard, { post: feed }));
    expect(card).toContain('ux-ava ux-ava-team');
    expect(card).toContain('<span class="ux-teamtag" title="Editorial account run by the KpopQuiz team">Team</span>');
    expect(card).toContain('>Mina</a>');
    expect(card).toContain(' · 2 hours ago');
    expect(card).not.toMatch(/Lv \d/);
    expect(card).not.toContain('ux-bias');
    expect(card).not.toContain('ux-acc-');
    expect(card).not.toContain('example.com/a.jpg'); // never the account's photo
    expect(card).not.toContain('ux-teamnote'); // the feed card does not show the line
    expect(card).toContain('Thread · General K-pop');
    expect(card).toContain('href="/community/thread/e1"');
    await expect(card).toMatchFileSnapshot('./__fixtures__/team-feed-card.html');

    const view = renderToStaticMarkup(createElement(PostView, { post, more: [], likesLive: true }));
    expect(view).toContain('ux-ava ux-ava-team');
    expect(view).toContain('ux-teamtag');
    expect(view).toContain('Editorial account of the KpopQuiz team. Topics and blogs are written by the team and checked before they go live. Replies come from fans.');
    expect(view).toContain('<h1 class="p8-post-t"');
    expect(view.match(/<h1/g)).toHaveLength(1);
    expect(view).not.toMatch(/Lv \d/);
    expect(view).not.toContain('ux-bias');
    // The author row, then the line, then the title (prototype openPost('team')).
    expect(view.indexOf('class="p8-author"')).toBeLessThan(view.indexOf('ux-teamnote'));
    expect(view.indexOf('ux-teamnote')).toBeLessThan(view.indexOf('class="p8-post-t"'));
    await expect(view).toMatchFileSnapshot('./__fixtures__/team-post-view.html');
  });

  it('v12 off: the same props render no pill, no team avatar and no line', async () => {
    const { FeedCard, PostView, toPerson } = await load(false);
    const { feed, post } = teamPosts(toPerson(MINA, PROFILE, { displayName: 'Mina', beat: 'Girl groups' }));
    for (const html of [
      renderToStaticMarkup(createElement(FeedCard, { post: feed })),
      renderToStaticMarkup(createElement(PostView, { post, more: [], likesLive: true })),
    ]) {
      expect(html).not.toContain('ux-teamtag');
      expect(html).not.toContain('ux-ava-team');
      expect(html).not.toContain('ux-teamnote');
    }
  });

  it('a fan post is rendered as before (level, flair, no pill) with the flag on', async () => {
    const { FeedCard, toPerson } = await load(true);
    const { editorialId: _drop, ...fan } = teamPosts(toPerson(MINA, PROFILE)).feed;
    void _drop;
    const card = renderToStaticMarkup(createElement(FeedCard, { post: { ...fan, key: '12', href: '/community/thread/12' } }));
    expect(card).toMatch(/Lv \d+ · 2 hours ago/);
    expect(card).toContain('ux-bias');
    expect(card).not.toContain('ux-teamtag');
    expect(card).not.toContain('ux-ava-team');
  });

  it('sources are listed under the body, links only for http(s)', async () => {
    const { PostView, toPerson } = await load(true);
    const { post } = teamPosts(toPerson(MINA, PROFILE, { displayName: 'Mina', beat: 'Girl groups' }));
    const view = renderToStaticMarkup(createElement(PostView, { post: { ...post, sources: [{ label: 'KpopQuiz plays, Sep 22 to Sep 28, 2026', url: 'https://kpopquiz.org/q/x' }, { label: 'KpopQuiz release calendar', url: null }] }, more: [], likesLive: false }));
    expect(view).toMatch(/<h2 class="p8-sources-h"[^>]*>Sources<\/h2>/);
    expect(view).toContain('<a href="https://kpopquiz.org/q/x" rel="nofollow noopener noreferrer" target="_blank">KpopQuiz plays, Sep 22 to Sep 28, 2026</a>');
    expect(view).toContain('<li>KpopQuiz release calendar</li>');
  });

  it('the admin preview renders the same post markup, with an h2 title', async () => {
    const { PostView, FeedCard, draftToPost } = await load(true);
    const post = draftToPost({ kind: 'thread', title: 'Which b-side deserves a comeback stage?', body: 'One b-side from any group.', options: null, sources: [], debate_days: null },
      { account: { display_name: 'Mina' }, group: GENERAL, groupPhoto: null, at: NOW, now: NOW, ago: 'just now' });
    const view = renderToStaticMarkup(createElement(PostView, { post, more: [], likesLive: false, titleAs: 'h2' }));
    expect(view).not.toContain('<h1');
    expect(view).toContain('<h2 class="p8-post-t"');
    expect(view).toContain('ux-teamtag');
    expect(view).toContain('ux-teamnote');
    expect(renderToStaticMarkup(createElement(FeedCard, { post }))).toContain('ux-ava ux-ava-team');
  });
});

describe('notifications and the passport', () => {
  it('a notification row is a team row when its link opens an editorial passport', async () => {
    const { isTeamRow, linkedUsername, teamSet } = await import('@/lib/ux-v1/p11/team');
    const team = teamSet({ usernames: ['Mina', 'jae', 7, ''] });
    expect([...team]).toEqual(['mina', 'jae']);
    expect(isTeamRow({ link_url: '/u/mina' }, team)).toBe(true);
    expect(isTeamRow({ link_url: '/u/MINA?tab=badges' }, team)).toBe(true);
    expect(isTeamRow({ link_url: '/u/minami' }, team)).toBe(false);
    expect(isTeamRow({ link_url: '/q/some-quiz' }, team)).toBe(false);
    expect(isTeamRow({ link_url: 'https://evil.example/u/mina' }, team)).toBe(false);
    expect(isTeamRow({ link_url: null }, team)).toBe(false);
    expect(isTeamRow({ link_url: '/u/mina' }, new Set())).toBe(false);
    expect(linkedUsername('/u/a/b')).toBe('a');
    expect(teamSet(null).size).toBe(0);
  });

  it('a team passport has the team chip and no fan flair; a fan passport has no isTeam key', async () => {
    const { teamIdentity, TEAM_LEVEL_CHIP } = await import('@/lib/ux-v1/p10/passport-model');
    expect(TEAM_LEVEL_CHIP).toBe('KpopQuiz team');
    expect(teamIdentity({ displayName: 'Mina' })).toEqual({ displayName: 'Mina', accent: null, font: null, bias: null, level: 'KpopQuiz team', pinnedBadge: null });
  });
});
