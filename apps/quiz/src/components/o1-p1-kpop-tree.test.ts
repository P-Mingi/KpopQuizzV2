import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { clientRefsOf, flightTree } from '@/lib/o1-flight-tree';

import type { PassportInput } from '@/lib/ux-v1/p10/build-passport';
import type { Profile, QuizCardData } from '@/lib/db/types';

// Lot (b), P1: the kpop screens must keep the React Flight tree and the HTML they had before the passport pages of
// fandomverse.org/anime were added to the shared components (passport, person name, sign-in sheet, login body, onboarding form,
// settings, the passport view model). Each kpop render below is written with realistic kpop props (no prop of the anime
// path) and compared with the file of __o1_p1_kpop_tree__/: the Flight tree (lib/o1-flight-tree.ts) for the server
// components, the static HTML for the client components and for every server component too, and the JSON of the view
// model. The files are written ONLY from the base commit f7366ec (never from the head): O1_WRITE_TREE=1 writes them, a
// plain run compares.

const DIR = fileURLToPath(new URL('./__o1_p1_kpop_tree__/', import.meta.url));
const WRITE = process.env.O1_WRITE_TREE === '1';
const SRC = fileURLToPath(new URL('..', import.meta.url));

const flags = globalThis as { __v12?: boolean };
vi.mock('@/lib/ux-v12', () => ({ isUxV12: () => flags.__v12 === true }));
// The passport islands are next/dynamic loaders (profile/ux-v1/islands): outside Next they render nothing until their import
// has resolved, which depends on the load of the machine. The base files were written with them unresolved, so they stay null.
vi.mock('next/dynamic', () => ({ default: () => () => null }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: () => undefined, push: () => undefined }),
  usePathname: () => '/me',
  useSearchParams: () => new URLSearchParams('returnTo=/daily'),
}));

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

function input(mode: 'personal' | 'public', team?: PassportInput['team']): PassportInput {
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
    ],
    now: NOW,
    ...(team ? { team } : {}),
  };
}

let refs: Map<unknown, string>;

function firstDifference(a: string, b: string): number {
  const n = Math.min(a.length, b.length);
  let i = 0;
  while (i < n && a[i] === b[i]) i += 1;
  return i;
}

function compare(name: string, ext: string, got: string): void {
  const file = `${DIR}${name}.${ext}`;
  if (WRITE) {
    mkdirSync(DIR, { recursive: true });
    writeFileSync(file, `${got}\n`);
    return;
  }
  const want = readFileSync(file, 'utf8').trimEnd();
  if (got === want) return;
  const at = firstDifference(got, want);
  const around = (s: string): string => s.slice(Math.max(0, at - 90), at + 110);
  expect({ name, bytes: got.length, firstDifferenceAt: at, around: around(got) }).toEqual({ name, bytes: want.length, firstDifferenceAt: at, around: around(want) });
}

async function tree(name: string, node: unknown): Promise<void> {
  compare(name, 'json', JSON.stringify(await flightTree(node, { client: refs })));
}
const html = (name: string, node: React.ReactElement): void => compare(name, 'html', renderToStaticMarkup(node));

beforeAll(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-19T12:00:00Z'));
  const entries = [
    'components/profile/ux-v1/passport.tsx',
    'components/profile/ux-v1/passport-guest.tsx',
    'components/ux-v1/person-name.tsx',
  ].map((f) => `${SRC}${f}`);
  const found = await clientRefsOf(entries);
  expect(found.unloaded).toEqual([]);
  refs = found.refs;
  // Isomorphic components that use hooks (not 'use client' modules): the Flight walk cannot call them, so they stand as
  // client references, by name, in the base tree and in the head tree alike.
  const medals = (await import('@/components/ux-v1/badge-medal')) as Record<string, unknown>;
  for (const [name, v] of Object.entries(medals)) if (typeof v === 'function') refs.set(v, name);
});

afterAll(() => {
  vi.useRealTimers();
  flags.__v12 = undefined as unknown as boolean;
});

describe('the kpop passport keeps its tree', () => {
  it('view model: buildPassport for /me, /u and a team account', async () => {
    const { buildPassport } = await import('@/lib/ux-v1/p10/build-passport');
    flags.__v12 = true;
    const out = {
      personal: buildPassport(input('personal')),
      public: buildPassport(input('public')),
      team: buildPassport(input('public', { displayName: 'KpopQuiz Team', beat: 'Daily quizzes' })),
    };
    compare('view-model', 'json', JSON.stringify(out));
  });

  it('view model: the pure functions of passport-model', async () => {
    const m = await import('@/lib/ux-v1/p10/passport-model');
    const out = {
      meta: m.metaSegments({ groups: [{ name: 'Stray Kids', slug: 'stray-kids', fandom: 'STAY' }, { name: 'BTS', slug: 'bts' }, { name: 'TWICE', slug: 'twice' }], stanSince: 2019, createdAt: '2025-03-04T10:00:00Z', followers: 24 }),
      metaNone: m.metaSegments({ stanSince: 2021, createdAt: '2025-03-04T10:00:00Z', followers: 1 }),
      personal: m.personalStats({ quizzesPlayed: 84, averagePct: 71, streak: 12, quizzesMade: 12, blindtestsPlayed: 31 }),
      publicStats: m.publicStats({ streak: 1, groupsMastered: 3, quizzesMade: 12, playsReceived: 1400 }),
      level: m.levelChip(7, 'Superfan'),
      xp: m.xpLine(1280, 2000, 7, 64),
      team: m.TEAM_LEVEL_CHIP,
    };
    compare('model', 'json', JSON.stringify(out));
  });

  for (const [name, mode, v12] of [['personal', 'personal', false], ['public', 'public', false], ['personal-v12', 'personal', true], ['public-v12', 'public', true]] as const) {
    it(`UxPassport, ${name}`, async () => {
      flags.__v12 = v12;
      const { buildPassport } = await import('@/lib/ux-v1/p10/build-passport');
      const { UxPassport } = await import('@/components/profile/ux-v1/passport');
      const el = h(UxPassport, { ...buildPassport(input(mode)), footer: h('i', null, 'footer') });
      await tree(`passport-${name}`, el);
      html(`passport-${name}`, el);
    });
  }

  it('UxPassport, a team account (v12)', async () => {
    flags.__v12 = true;
    const { buildPassport } = await import('@/lib/ux-v1/p10/build-passport');
    const { UxPassport } = await import('@/components/profile/ux-v1/passport');
    const el = h(UxPassport, buildPassport(input('public', { displayName: 'KpopQuiz Team', beat: 'Daily quizzes' })));
    await tree('passport-team', el);
    html('passport-team', el);
  });

  it('UxPassport, nothing played yet', async () => {
    flags.__v12 = false;
    const { buildPassport } = await import('@/lib/ux-v1/p10/build-passport');
    const { UxPassport } = await import('@/components/profile/ux-v1/passport');
    const base = input('personal');
    const empty = buildPassport({ ...base, groupStats: [], earnedBadgeIds: [], quizzes: [], history: [], war: null, spine: { ...base.spine!, ult_groups: [], bias: null }, profile: { ...profile, stan_since: null, bio: null, pinned_badge_id: null } });
    const el = h(UxPassport, empty);
    await tree('passport-empty', el);
    html('passport-empty', el);
  });

  it('the guest passport', async () => {
    const { UxPassportGuest } = await import('@/components/profile/ux-v1/passport-guest');
    const el = h(UxPassportGuest);
    await tree('passport-guest', el);
    html('passport-guest', el);
  });
});

describe('the kpop name tags keep their tree', () => {
  it('BiasTag and PersonName', async () => {
    flags.__v12 = true;
    const { BiasTag, PersonName } = await import('@/components/ux-v1/person-name');
    const els = h('div', null,
      h(BiasTag, { bias: 'Han', accent: 'pink' }),
      h(BiasTag, { bias: '  ', accent: 'pink' }),
      h(BiasTag, { bias: 'Jin' }),
      h(PersonName, { name: 'mingi', accent: 'purple', font: 'serif', bias: 'Jimin', href: '/u/mingi' }),
      h(PersonName, { name: 'plain' }),
      h(PersonName, { name: 'tight', bias: 'RM', showBias: false, className: 'row' }),
      h(PersonName, { name: 'KpopQuiz Team', isTeam: true, href: '/u/kpopquiz' }));
    await tree('person-name', els);
    html('person-name', els);
  });
});

describe('the kpop client components keep their HTML', () => {
  it('the sign-in sheet, with the default title and a custom request', async () => {
    const { SignInSheet } = await import('@/components/ux-v1/sign-in-sheet');
    html('sign-in-default', h(SignInSheet, { open: true, request: {}, onClose: () => undefined, inline: true }));
    html('sign-in-custom', h(SignInSheet, { open: true, request: { title: 'Save your 7/8', sub: 'Keep it.', returnTo: '/daily' }, onClose: () => undefined, inline: true }));
    html('sign-in-closed', h(SignInSheet, { open: false, request: {}, onClose: () => undefined, inline: true }));
  });

  it('the login page', async () => {
    const { default: LoginPage } = await import('@/app/(site)/login/page');
    html('login', h(LoginPage));
  });

  it('the onboarding page and form', async () => {
    const { default: OnboardingPage } = await import('@/app/(site)/onboarding/page');
    html('onboarding', h(OnboardingPage));
    const { OnboardingForm } = await import('@/app/(site)/onboarding/onboarding-form');
    html('onboarding-form', h(OnboardingForm));
  });

  it('the settings page, while it loads', async () => {
    const { UxSettings } = await import('@/components/profile/ux-v1/settings');
    html('settings-loading', h(UxSettings));
  });

  it('the passport actions', async () => {
    const { PassportActions } = await import('@/components/profile/ux-v1/passport-actions');
    html('passport-actions-owner', h(PassportActions, { username: 'mingi', displayName: 'mingi', owner: 'server', level: 'Lv 7 · Superfan' }));
    html('passport-actions-visitor', h(PassportActions, { username: 'mingi', displayName: 'mingi', owner: 'check', level: 'Lv 7 · Superfan' }));
  });
});
