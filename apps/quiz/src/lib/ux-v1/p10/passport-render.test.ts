// Server-free render test of the v11 passport (worker brief: "/me cannot be loaded
// signed in until the owner answers the production-write question").
//
// What it proves: fed the SAME shapes /me and /u/[username] build (profile row,
// passport spine, group stats, collection, groups, badge_definitions, earned ids,
// creator quizzes, fandom name, war rank, average, history), buildPassport() +
// <UxPassport> render the personal and public variants with the right owner
// controls, stats, tabs, panels, flair and privacy gates, in plain HTML.
// What it does NOT prove: the live /me server run (its calls and writes are the
// unchanged legacy code), hydration, CSS, or the real data of any account.

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: () => undefined, push: () => undefined }), usePathname: () => '/me' }));
// The islands are next/dynamic loaders in the app (async chunks); a synchronous
// server-free render uses the island components themselves.
// The draft islands read this device's draft after mount (useEffect: a server-free
// render never runs it). Here, when a test turns SYNC_DRAFT on, they run the same
// read (readLocalDraftRow, the funnel's localStorage) synchronously and render the
// same presentational components (DraftSlot / DraftOrEmpty); otherwise the real
// islands render, as on the server.
const draftMode = vi.hoisted(() => ({ sync: false }));
vi.mock('@/components/profile/ux-v1/islands', async () => {
  const { createElement: h } = await import('react');
  const local = await import('@/components/profile/ux-v1/local-draft');
  const { readLocalDraftRow } = await import('./local-draft');
  const at = Date.parse('2026-09-25T20:00:00Z');
  return {
    PassportBand: (await import('@/components/profile/ux-v1/passport-band')).PassportBand,
    PassportActions: (await import('@/components/profile/ux-v1/passport-actions')).PassportActions,
    PassportTabs: (await import('@/components/profile/ux-v1/passport-tabs')).PassportTabs,
    MoreQuizzes: (await import('@/components/profile/ux-v1/more-quizzes')).MoreQuizzes,
    LocalDraftRow: () => (draftMode.sync ? h(local.DraftSlot, { view: readLocalDraftRow(at) }) : h(local.LocalDraftRow)),
    LocalDraftOrEmpty: ({ children }: { children: React.ReactNode }) => (draftMode.sync ? h(local.DraftOrEmpty, { view: readLocalDraftRow(at), children }) : h(local.LocalDraftOrEmpty, { children })),
  };
});

import { UxPassport } from '@/components/profile/ux-v1/passport';
import { DraftRow } from '@/components/profile/ux-v1/rows';

import { buildPassport } from './build-passport';
import { DRAFT_ROW_HTML, DRAFT_ROW_SAMPLE } from './draft-row.fixture';

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

const render = (mode: 'personal' | 'public'): string => renderToStaticMarkup(createElement(UxPassport, buildPassport(input(mode))));
const count = (html: string, re: RegExp): number => (html.match(re) ?? []).length;

describe('v11 passport, personal (/me props)', () => {
  const html = render('personal');

  it('one H1: the display name in the accent class, then the bias tag, the pinned medallion and the level chip', () => {
    expect(count(html, /<h1[\s>]/g)).toBe(1);
    expect(html).toMatch(/<h1 class="p10-pname ux-who ux-acc-pink">mingi<\/h1>/);
    expect(html).toMatch(/class="ux-bias ux-acc-pink"[^>]*>.*Han<\/span>/);
    expect(html).toMatch(/aria-label="Pinned badge: Perfect score"/);
    expect(html).toContain('Lv 7 · ');
  });

  it('band: main group photo over the default theme tint, with Change header for the owner', () => {
    expect(html).toMatch(/class="p10-band is-group"[^>]*--p10-tint:#FCE8EF/);
    expect(html).toContain('Stray%20Kids.jpg');
    expect(html).toContain('Change header');
    expect(html).toMatch(/<a[^>]+href="\/settings"[^>]*>.*Edit passport/);
  });

  it('meta, XP and the five owner stats (real fields, blindtests played replaces the dead rank)', () => {
    expect(html.replace(/<[^>]+>/g, '')).toContain('STAY since 2019 · also BTS · joined March 2025 · 24 followers');
    expect(html).toContain('<a href="/stray-kids-quiz">STAY</a>');
    expect(html).toContain('<a href="/bts-quiz">BTS</a>');
    expect(html).toMatch(/<b>1,280<\/b> \/ \d[\d,]* XP to Lv 8/);
    for (const label of ['quizzes played', 'average score', 'streak', 'quizzes made', 'blindtests played']) expect(html).toContain(`<span>${label}</span>`);
    expect(html).toContain('>71%<');
    expect(html).toContain('>12 days<');
  });

  it('four tabs, every panel in the HTML, only Overview visible', () => {
    expect(count(html, /role="tab"/g)).toBe(4);
    for (const id of ['overview', 'quizzes', 'history', 'badges']) expect(html).toContain(`id="p10-panel-${id}"`);
    expect(html).toMatch(/id="p10-panel-overview"[^>]*>/);
    expect(html).not.toMatch(/id="p10-panel-overview"[^>]*hidden/);
    expect(count(html, /data-p10-panel="[a-z]+" hidden=""/g)).toBe(3);
  });

  it('overview: fandom war strip, pinned badge first, groups mastered by progress, 3 recent plays', () => {
    expect(html).toContain('This week: <b>STAY is #2</b> in the fandom war');
    const pinned = html.slice(html.indexOf('Pinned badges'), html.indexOf('Groups mastered'));
    expect(pinned.indexOf('Perfect score')).toBeLessThan(pinned.indexOf('First steps'));
    expect(pinned).not.toContain('Group master');
    expect(html).toMatch(/Stray Kids<\/span>.*Mastered/);
    const recent = html.slice(html.indexOf('Recent activity'), html.indexOf('id="p10-panel-quizzes"'));
    expect(count(recent, /class="ux-row"/g)).toBe(3);
    expect(recent).toContain('2/8 · 6 hours ago');
    expect(recent).toContain('10/10 · perfect · 2 days ago');
  });

  it('quizzes, history and badges panels', () => {
    expect(html).toContain('href="/q/skz-quiz-1"');
    expect(html).toContain('Published · 1.4k plays · 37 likes · 72% average');
    expect(html).toContain('Show more (10)');
    expect(html).toContain('84 quizzes and 31 blindtests');
    expect(html).toContain('2 of 3 earned · colour and shape show rarity');
    expect(count(html, /class="ux-medal2 /g)).toBe(2 + 3);
    expect(html).toContain('Locked · 80% accuracy over 30+ questions on one group');
  });

  it('no em or en dash anywhere', () => {
    expect(html).not.toMatch(/[–—]/);
  });
});

describe('v11 passport, public (/u/[username] props)', () => {
  const html = render('public');

  it('privacy fail-closed: no History tab, no recent activity, no play counts or average', () => {
    expect(count(html, /role="tab"/g)).toBe(3);
    expect(html).not.toContain('p10-panel-history');
    expect(html).not.toContain('Recent activity');
    expect(html).not.toContain('quizzes played');
    expect(html).not.toContain('average score');
    for (const label of ['streak', 'groups mastered', 'quizzes made', 'plays received']) expect(html).toContain(`<span>${label}</span>`);
  });

  it('owner controls are not in the server HTML (resolved on the client)', () => {
    expect(html).not.toContain('Change header');
    expect(html).not.toContain('Edit passport');
    expect(html).toContain('aria-label="Share passport"');
  });

  it('keeps the crawlable content: H1, bio, quiz links', () => {
    expect(count(html, /<h1[\s>]/g)).toBe(1);
    expect(html).toContain('STAY since 2019. I make the true or false ones.');
    expect(html).toContain('href="/q/skz-quiz-2"');
  });
});

describe('band modes', () => {
  it('uses the header image when set, the flat tint without a main group photo', () => {
    const withHeader = renderToStaticMarkup(createElement(UxPassport, buildPassport({ ...input('public'), profile: { ...profile, header_url: 'https://cdn.example.com/h.webp' } })));
    expect(withHeader).toMatch(/class="p10-band is-image"/);
    expect(withHeader).toContain('url(&quot;https://cdn.example.com/h.webp&quot;)');
    const i = input('public');
    const flat = renderToStaticMarkup(createElement(UxPassport, buildPassport({ ...i, spine: { ...i.spine!, ult_groups: ['illit'], profile_theme: 'teal' } })));
    expect(flat).toMatch(/class="p10-band is-flat"[^>]*--p10-tint:#E1F5EE/);
  });

  it('never lets a stored URL break out of CSS url()', () => {
    const evil = renderToStaticMarkup(createElement(UxPassport, buildPassport({ ...input('public'), profile: { ...profile, header_url: 'https://x.example/a.png");background:url(javascript:alert(1)' } })));
    expect(evil).not.toContain('");background');
    expect(evil).toContain('\\22 ');
  });
});

// ---------------------------------------------------------------------------
// Quizzes tab: this device's create draft (X1-003 follow-up). /me is never loaded
// signed in, so the signed-in Quizzes tab is proven here with the /me props.
// ---------------------------------------------------------------------------

describe('personal Quizzes tab: the device draft row (prototype #pp-quizzes)', () => {
  const DRAFT_KEY = 'kq_create_draft_v1'; // lib/create-draft.ts
  const mcq = (question: string, options: string[], correct: number | null): Record<string, unknown> => ({ question, options, correct, fun_fact: '' });
  const started = {
    title: 'Stray Kids b-sides deep cut', group_slug: 'stray-kids', quiz_type: 'multiple_choice', cover: null, updatedAt: NOW - 2 * 24 * 60 * 60 * 1000,
    questions: [mcq('Which b-side opens NOEASY?', ['Cheese', 'Sorry, I Love You', 'Thunderous', 'Surfin'], 0), mcq('Which album has Gone Away?', ['NOEASY', '', '', ''], 0)],
  };
  const device = (draft: unknown): string[] => {
    const writes: string[] = [];
    const m = new Map<string, string>(draft ? [[DRAFT_KEY, JSON.stringify(draft)]] : []);
    vi.stubGlobal('window', {});
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => m.get(k) ?? null,
      setItem: (k: string) => { writes.push(`set ${k}`); },
      removeItem: (k: string) => { writes.push(`remove ${k}`); },
    });
    vi.useFakeTimers({ now: NOW });
    return writes;
  };
  const withQuizzes = (quizzes: QuizCardData[]): string => renderToStaticMarkup(createElement(UxPassport, buildPassport({ ...input('personal'), quizzes })));
  const quizzesPanel = (html: string): string => html.slice(html.indexOf('id="p10-panel-quizzes"'), html.indexOf('id="p10-panel-history"'));
  afterEach(() => { draftMode.sync = false; vi.unstubAllGlobals(); vi.useRealTimers(); });

  it('server HTML (and the first client render) has no draft row, even with a draft on the device', () => {
    device(started);
    const html = render('personal');
    expect(html).not.toContain('p10-draft');
    expect(html).not.toContain('>Continue<');
  });

  it('after mount: the draft is the last row, under every published quiz and above Show more; Continue opens /create; nothing written', () => {
    const writes = device(started);
    draftMode.sync = true;
    const panel = quizzesPanel(render('personal'));
    expect(panel).toMatch(/<a class="ux-row p10-draft" href="\/create">/);
    expect(panel).toMatch(/<span class="ux-thumb is-glyph" aria-hidden="true"><svg class="ux-ico"/);
    expect(panel).toContain('<span class="ux-rt">Stray Kids b-sides deep cut</span><span class="ux-rs">Draft · 1 of 2 questions · edited 2 days ago</span>');
    expect(panel).toContain('<span class="ux-btn ux-btn-ghost ux-btn-sm">Continue</span></a>');
    expect(panel.indexOf('p10-draft')).toBeGreaterThan(panel.lastIndexOf('href="/q/skz-quiz-2"'));
    expect(panel.indexOf('p10-draft')).toBeLessThan(panel.indexOf('Show more (10)'));
    expect((panel.match(/class="ux-row[ "]/g) ?? []).length).toBe(3);
    expect(writes).toEqual([]);
  });

  it('every published quiz shown (no Show more): the draft is still the last row', () => {
    device(started);
    draftMode.sync = true;
    const one = { ...quiz(1) };
    const i = input('personal');
    const panel = quizzesPanel(renderToStaticMarkup(createElement(UxPassport, buildPassport({ ...i, profile: { ...profile, total_quizzes_created: 1 }, spine: { ...i.spine!, total_quizzes_created: 1 }, quizzes: [one] }))));
    expect(panel).not.toContain('Show more');
    expect(panel.indexOf('p10-draft')).toBeGreaterThan(panel.indexOf('href="/q/skz-quiz-1"'));
  });

  it('no published quiz: the draft replaces the empty state; without a started draft the empty state stays', () => {
    device(started);
    draftMode.sync = true;
    const withDraft = quizzesPanel(withQuizzes([]));
    expect(withDraft).toMatch(/<div class="ux-rows"><a class="ux-row p10-draft" href="\/create">/);
    expect(withDraft).not.toContain('No quizzes yet');
    vi.unstubAllGlobals();
    device({ ...started, title: '', questions: [mcq('', ['', '', '', ''], null)] }); // a blank autosave is not a draft
    const blank = quizzesPanel(withQuizzes([]));
    expect(blank).not.toContain('p10-draft');
    expect(blank).toContain('<b>No quizzes yet</b>');
    expect(blank).toContain('Create your first quiz');
  });

  it('DraftRow renders exactly the fixture the e2e measures against the prototype', () => {
    expect(renderToStaticMarkup(createElement(DraftRow, { view: DRAFT_ROW_SAMPLE, href: '/create' }))).toBe(DRAFT_ROW_HTML);
  });

  it('the public passport never shows a device draft', () => {
    device(started);
    draftMode.sync = true;
    const html = render('public');
    expect(html).not.toContain('p10-draft');
    expect(html).not.toContain('Stray Kids b-sides deep cut');
  });
});
