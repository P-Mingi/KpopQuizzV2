// Run O1, lane O1 (lot a, finishing): the public passport takes the words of the site. kpop renders what it rendered before this
// change: the props of buildPassport, the HTML of both variants and the React Flight tree of UxPassport are the files of
// __o1_kpop_passport__/, written ONCE from the base commit 894cb7c (before any "words" key), never from the head; a plain run
// compares. Another site passes its words and prints no kpop word of them.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { clientRefsOf, flightTree } from '@/lib/o1-flight-tree';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: () => undefined, push: () => undefined }), usePathname: () => '/u/mingi' }));
// A server component may call useId; the Flight walker renders outside React, so the id is fixed (the same in every run).
vi.mock('react', async (orig) => { const r = await orig<typeof import('react')>(); let n = 0; return { ...r, default: r, useId: () => `:r${n++}:` }; });
vi.mock('@/lib/ux-v12', () => ({ isUxV12: () => true }));

// The islands are next/dynamic loaders in the app (async chunks, whether they render in a test depends on timing); a server-free
// render uses the island components themselves, as lib/ux-v1/p10/passport-render.test.ts does.
vi.mock('@/components/profile/ux-v1/islands', async () => {
  const { createElement: h } = await import('react');
  const local = await import('@/components/profile/ux-v1/local-draft');
  return {
    PassportBand: (await import('@/components/profile/ux-v1/passport-band')).PassportBand,
    PassportActions: (await import('@/components/profile/ux-v1/passport-actions')).PassportActions,
    PassportTabs: (await import('@/components/profile/ux-v1/passport-tabs')).PassportTabs,
    MoreQuizzes: (await import('@/components/profile/ux-v1/more-quizzes')).MoreQuizzes,
    LocalDraftRow: () => h(local.LocalDraftRow),
    LocalDraftOrEmpty: ({ children }: { children: React.ReactNode }) => h(local.LocalDraftOrEmpty, { children }),
  };
});

import { UxPassport } from '@/components/profile/ux-v1/passport';

import { buildPassport } from './build-passport';

import type { PassportInput } from './build-passport';
import type { Profile, QuizCardData } from '@/lib/db/types';

const NOW = Date.parse('2026-09-25T20:00:00Z');

const profile: Profile = {
  id: '00000000-0000-4000-8000-000000000001', username: 'mingi', display_name: 'mingi', avatar_url: null, avatar_bg: '#E8457A', avatar_text: '#FFFFFF',
  bio: 'STAY since 2019. I make the true or false ones.', created_at: '2025-03-04T10:00:00Z', updated_at: '2026-09-01T10:00:00Z',
  total_quizzes_created: 12, total_plays_received: 1400, total_likes_received: 37, xp: 1280, follower_count: 24, following_count: 3,
  name_accent: 'pink', name_font: 'default', pinned_badge_id: 'perfect_score', avatar_kind: 'photo', avatar_ref: null, stan_since: 2019, header_url: null,
};

const quiz = (i: number): QuizCardData => ({
  id: `q${i}`, title: `SKZ quiz ${i}`, slug: `skz-quiz-${i}`, quiz_type: 'true_false', difficulty: 'medium', language: 'en', play_count: 1400 - i, total_score_sum: 720, total_completions: 100, like_count: 37,
  created_at: '2026-09-01T10:00:00Z', group_name: 'Stray Kids', group_slug: 'stray-kids', display_color: '#000', text_color: '#fff', logo_url: null, fandom_name: 'STAY',
  creator_username: 'mingi', creator_avatar_url: null, creator_avatar_bg: '#E8457A', creator_avatar_text: '#fff', question_count: 10, cover_image_url: null,
} as QuizCardData);

function input(mode: 'personal' | 'public'): PassportInput {
  return {
    mode,
    profile,
    spine: {
      xp: 1280, total_quizzes_created: 12, total_plays_received: 1400, total_likes_received: 37, quizzes_played: 84, blindtests_played: 31, duels_voted: 0, battles_played: 0, battles_won: 0,
      ult_groups: ['stray-kids', 'bts'], bias: 'Han', profile_theme: 'default', streak_current: 12, streak_longest: 20, streak_last_active: '2026-09-25', snapshot_at: null,
    },
    groupStats: [
      { group_id: 1, songs_played: 40, songs_correct: 20, best_score: 0, mastery_level: 1, mastered: false, accuracy: 0.5 },
      { group_id: 2, songs_played: 50, songs_correct: 45, best_score: 0, mastery_level: 1, mastered: true, accuracy: 0.9 },
    ],
    collection: { groups_mastered: 1, groups_total: 90, eras: [] },
    groups: [{ id: 1, name: 'BTS', slug: 'bts' }, { id: 2, name: 'Stray Kids', slug: 'stray-kids' }],
    badgeDefs: [
      { id: 'perfect_score', name: 'Perfect score', description: 'Score 100% on any quiz', sort_order: 1 },
      { id: 'first_steps', name: 'First steps', description: 'Play your first quiz', sort_order: 2 },
      { id: 'group_master', name: 'Group master', description: '80% accuracy over 30+ questions on one group', sort_order: 3 },
    ],
    earnedBadgeIds: ['first_steps', 'perfect_score'],
    quizzes: [quiz(1), quiz(2)],
    fandomName: 'STAY',
    war: { fandom: 'STAY', rank: 2 },
    averagePct: 71,
    history: [
      { kind: 'quiz', title: 'Ultimate BTS era quiz', href: '/q/ultimate-bts-era-quiz', groupSlug: 'bts', score: 2, total: 8, at: '2026-09-25T14:00:00Z' },
      { kind: 'blindtest', title: 'Blindtest', href: null, groupSlug: null, score: 8, total: 10, at: '2026-09-24T18:00:00Z' },
      { kind: 'quiz', title: 'Stray Kids basics', href: '/q/stray-kids-basics', groupSlug: 'stray-kids', score: 10, total: 10, at: '2026-09-23T12:00:00Z' },
      { kind: 'quiz', title: 'TWICE eras', href: '/q/twice-eras', groupSlug: 'twice', score: 5, total: 10, at: '2026-09-20T12:00:00Z' },
    ],
    now: NOW,
  };
}

const DIR = './__o1_kpop_passport__/';

describe('public passport, kpop words', () => {
  for (const mode of ['public', 'personal'] as const) {
    it(`kpop ${mode}: the props, the HTML and the flight tree of the base commit`, async () => {
      const props = buildPassport(input(mode));
      await expect(`${JSON.stringify(props, null, 1)}\n`).toMatchFileSnapshot(`${DIR}${mode}-props.json`);
      await expect(`${renderToStaticMarkup(createElement(UxPassport, props))}\n`).toMatchFileSnapshot(`${DIR}${mode}.html`);
      const found = await clientRefsOf(['passport', 'passport-actions', 'passport-band', 'passport-tabs', 'more-quizzes', 'local-draft'].map((f) => `${process.cwd()}/src/components/profile/ux-v1/${f}.tsx`));
      expect(found.unloaded).toEqual([]);
      const tree = JSON.stringify(await flightTree(createElement(UxPassport, props), { client: found.refs }));
      await expect(`${tree}\n`).toMatchFileSnapshot(`${DIR}${mode}-tree.json`);
    }, 60_000);
  }
});

describe('public passport, anime words', () => {
  const words = { masteredStat: 'series mastered', masteredTitle: 'Series mastered', fanSince: 'Fan since', passport: 'passport', brand: 'OtakuQuiz' };
  const noMain = (mode: 'public' | 'personal'): PassportInput => {
    const i = input(mode);
    return { ...i, spine: { ...i.spine!, ult_groups: [] }, war: null };
  };

  it('the stat cell, the section title and the share text use the site words; the level title is the site ladder', () => {
    const props = buildPassport({ ...noMain('public'), words, site: 'anime' });
    expect(props.words).toEqual(words);
    expect(props.stats.map((c) => c.label)).toContain('series mastered');
    expect(props.stats.map((c) => c.label)).not.toContain('groups mastered');
    expect(props.meta.flat().map((p) => p.text)).toContain('Fan since 2019');
    expect(props.level).not.toContain('Stan');
    const html = renderToStaticMarkup(createElement(UxPassport, props));
    expect(html).toContain('Series mastered');
    expect(html).not.toContain('Groups mastered');
    expect(html).not.toMatch(/Stan since|K-pop|KpopQuiz|groups mastered/);
  });

  it('without words the props carry no words key (kpop)', () => {
    expect(buildPassport(input('public'))).not.toHaveProperty('words');
  });
});
