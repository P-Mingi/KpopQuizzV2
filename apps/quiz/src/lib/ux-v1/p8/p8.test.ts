import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { renderTipTapJSON } from '@/lib/verse/render-content';

import { draftToDoc, validateDraft } from './draft';
import { isMissingTable } from './features';
import { comma, compact, closesIn, dayAgo, excerpt, leaderIndex, levelLine, paragraphs, percents, plural, timeAgo, utcDate } from './format';
import { toPerson } from './people';
import { parsePostKey } from './post';
import { collapseSpree, eventPhrase } from './rail';
import { isPostKind } from './types';
import { checkChallenge, checkDebate, checkLike, checkReply, checkVote, hasLink } from './validate';

import type { Draft } from './draft';
import type { FeedPost } from './types';

// unstable_cache is a Next runtime feature: the pure helpers under test only need the
// wrapped function itself.
vi.mock('next/cache', () => ({ unstable_cache: (fn: unknown) => fn }));

const { blogCover, mergeFeed, dailyClosesAt } = await import('./feed');
const { FeedCard } = await import('@/components/community/ux-v1/feed-card');

const NOW = Date.parse('2026-09-26T12:00:00Z');
const EMDASH = /[–—]/;

describe('format', () => {
  it('timeAgo follows the prototype copy', () => {
    expect(timeAgo('2026-09-26T11:59:40Z', NOW)).toBe('just now');
    expect(timeAgo('2026-09-26T11:40:00Z', NOW)).toBe('20 min ago');
    expect(timeAgo('2026-09-26T11:00:00Z', NOW)).toBe('1 hour ago');
    expect(timeAgo('2026-09-26T09:00:00Z', NOW)).toBe('3 hours ago');
    expect(timeAgo('2026-09-25T09:00:00Z', NOW)).toBe('yesterday');
    expect(timeAgo('2026-09-22T09:00:00Z', NOW)).toBe('4 days ago');
    expect(timeAgo('2026-07-31T13:03:12.822573+00:00', NOW)).toBe('Jul 31');
    expect(timeAgo('2025-07-31T13:03:12Z', NOW)).toBe('Jul 31, 2025');
    expect(timeAgo(null, NOW)).toBe('');
  });
  it('dayAgo is day granular (UTC days)', () => {
    expect(dayAgo('2026-09-26T00:10:00Z', NOW)).toBe('today');
    expect(dayAgo('2026-09-25T23:50:00Z', NOW)).toBe('yesterday');
    expect(dayAgo('2026-09-21T10:00:00Z', NOW)).toBe('5 days ago');
  });
  it('numbers: comma, compact, plural', () => {
    expect(comma(1902)).toBe('1,902');
    expect(compact(312)).toBe('312');
    expect(compact(1902)).toBe('1.9k');
    expect(compact(1000)).toBe('1k');
    expect(compact(24_500)).toBe('24k');
    expect(compact(1_250_000)).toBe('1.2M');
    expect(plural(1, 'vote')).toBe('1 vote');
    expect(plural(1902, 'vote')).toBe('1,902 votes');
    expect(plural(3, 'reply', 'replies')).toBe('3 replies');
  });
  it('closesIn', () => {
    expect(closesIn('2026-09-28T12:00:00Z', NOW)).toBe('closes in 2 days');
    expect(closesIn('2026-09-27T12:00:00Z', NOW)).toBe('closes in 1 day');
    expect(closesIn('2026-09-26T17:00:00Z', NOW)).toBe('closes in 5 hours');
    expect(closesIn('2026-09-26T12:20:00Z', NOW)).toBe('closes in 20 min');
    expect(closesIn('2026-09-26T11:00:00Z', NOW)).toBe('closed');
  });
  it('percents always add up to 100, ties have no leader', () => {
    expect(percents([1, 1])).toEqual([50, 50]);
    expect(percents([1, 2])).toEqual([33, 67]);
    expect(percents([1, 1, 1])).toEqual([34, 33, 33]);
    expect(percents([0, 0])).toEqual([0, 0]);
    expect(percents([42, 31, 17, 10]).reduce((s, v) => s + v, 0)).toBe(100);
    expect(leaderIndex([42, 31, 17, 10])).toBe(0);
    expect(leaderIndex([1, 3])).toBe(1);
    expect(leaderIndex([2, 2])).toBe(-1);
    expect(leaderIndex([0, 0])).toBe(-1);
  });
  it('excerpt, paragraphs, utcDate, levelLine', () => {
    expect(excerpt('a '.repeat(200), 20).endsWith('...')).toBe(true);
    expect(excerpt('short')).toBe('short');
    expect(paragraphs('one\n\ntwo\n  \nthree')).toEqual(['one', 'two', 'three']);
    expect(utcDate(NOW)).toBe('2026-09-26');
    expect(levelLine({ level: 9, levelTitle: 'Stan' })).toBe('Lv 9');
    expect(levelLine({ level: 9, levelTitle: 'Stan' }, true)).toBe('Lv 9 Stan');
    expect(levelLine({ level: null, levelTitle: null })).toBe('');
  });
});

describe('people', () => {
  it('maps a profile to a person with flair and level', () => {
    const p = toPerson('u1', { id: 'u1', username: 'stay4life', display_name: null, avatar_url: null, xp: 5000, name_accent: 'teal', name_font: 'default', bias: ' Felix ' });
    expect(p.name).toBe('stay4life');
    expect(p.href).toBe('/u/stay4life');
    expect(p.accent).toBe('teal');
    expect(p.bias).toBe('Felix');
    expect(typeof p.level).toBe('number');
    expect(p.isSystem).toBe(false);
  });
  it('the system account shows its label, no link, no flair', () => {
    const p = toPerson('67358f12-5068-4cd9-ba02-ad19fdadad73', { id: 'x', username: 'localdev', display_name: null, avatar_url: null, xp: 10, name_accent: 'pink', name_font: 'mono', bias: 'x' });
    expect(p).toMatchObject({ name: 'KpopVerse', username: null, href: null, accent: null, bias: null, level: null, isSystem: true });
  });
  it('a missing profile is "a fan"', () => {
    expect(toPerson('nobody', null).name).toBe('a fan');
  });
});

describe('draft validation (same limits as the routes)', () => {
  const base: Draft = { mode: 'thread', groupId: 3, title: 'Hello there', body: '', question: '', options: ['', ''], days: '3', playId: null, message: '' };
  it('thread needs a group and a title of 140 max', () => {
    expect(validateDraft(base)).toEqual({});
    expect(validateDraft({ ...base, groupId: null }).groupId).toBeTruthy();
    expect(validateDraft({ ...base, title: ' ' }).title).toBeTruthy();
    expect(validateDraft({ ...base, title: 'x'.repeat(141) }).title).toBeTruthy();
    expect(validateDraft({ ...base, body: 'x'.repeat(2001) }).body).toBeTruthy();
  });
  it('blog needs text', () => {
    expect(validateDraft({ ...base, mode: 'blog' }).body).toBeTruthy();
    expect(validateDraft({ ...base, mode: 'blog', body: 'Words.' })).toEqual({});
  });
  it('debate: question 5 to 160, 2 to 4 distinct options', () => {
    const d: Draft = { ...base, mode: 'debate', question: 'Best title track?', options: ['A', 'B'] };
    expect(validateDraft(d)).toEqual({});
    expect(validateDraft({ ...d, question: 'Hi' }).question).toBeTruthy();
    expect(validateDraft({ ...d, options: ['A', ''] }).options).toBeTruthy();
    expect(validateDraft({ ...d, options: ['A', 'a'] }).options).toBeTruthy();
  });
  it('challenge needs a run', () => {
    expect(validateDraft({ ...base, mode: 'challenge' }).playId).toBeTruthy();
    expect(validateDraft({ ...base, mode: 'challenge', playId: 'x' })).toEqual({});
  });
  it('blog text becomes TipTap paragraphs; the renderer escapes it (XSS at the sink)', () => {
    const doc = draftToDoc('One <script>alert(1)</script>\nline two\n\nPara two');
    expect(doc.content).toHaveLength(2);
    expect(doc.content[0]!.content!.map((n) => n.type)).toEqual(['text', 'hardBreak', 'text']);
    const html = renderTipTapJSON(doc);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('<p>Para two</p>');
  });
});

describe('route payloads', () => {
  it('checkLike shapes per target type', () => {
    expect(checkLike({ target_type: 'thread', target_id: '12' })).toEqual({ ok: true, value: { type: 'thread', id: '12' } });
    expect(checkLike({ target_type: 'daily_debate', target_id: '2026-09-22' }).ok).toBe(true);
    expect(checkLike({ target_type: 'daily_debate', target_id: '12' }).ok).toBe(false);
    expect(checkLike({ target_type: 'debate_vote', target_id: 'A0000000-0000-0000-0000-000000000000' })).toMatchObject({ ok: true, value: { id: 'a0000000-0000-0000-0000-000000000000' } });
    expect(checkLike({ target_type: 'thread', target_id: '0' }).ok).toBe(false);
    expect(checkLike({ target_type: 'quiz', target_id: '1' }).ok).toBe(false);
    expect(checkLike(null).ok).toBe(false);
  });
  it('checkDebate mirrors the migration checks', () => {
    const ok = { question: 'Best 4th gen title track?', options: ['Supernova', 'Magnetic'], days: 3, group_id: 3 };
    expect(checkDebate(ok)).toMatchObject({ ok: true, value: { groupId: 3, days: 3, options: ['Supernova', 'Magnetic'], body: null } });
    expect(checkDebate({ ...ok, days: 2 }).ok).toBe(false);
    expect(checkDebate({ ...ok, options: ['A'] }).ok).toBe(false);
    expect(checkDebate({ ...ok, options: ['A', 'B', 'C', 'D', 'E'] }).ok).toBe(false);
    expect(checkDebate({ ...ok, options: ['Same', 'same'] }).ok).toBe(false);
    expect(checkDebate({ ...ok, question: 'x'.repeat(161) }).ok).toBe(false);
    expect(checkDebate({ ...ok, group_id: -1 }).ok).toBe(false);
  });
  it('checkVote, checkChallenge, checkReply, hasLink', () => {
    expect(checkVote({ option_index: 1 }, 2)).toEqual({ ok: true, value: 1 });
    expect(checkVote({ option_index: 2 }, 2).ok).toBe(false);
    expect(checkVote({ option_index: 1.5 }, 4).ok).toBe(false);
    expect(checkChallenge({ play_id: 'b0000000-0000-0000-0000-000000000000', message: ' Your turn ' })).toMatchObject({ ok: true, value: { message: 'Your turn' } });
    expect(checkChallenge({ play_id: 'nope' }).ok).toBe(false);
    expect(checkChallenge({ play_id: 'b0000000-0000-0000-0000-000000000000', message: 'x'.repeat(281) }).ok).toBe(false);
    expect(checkReply({ target_type: 'debate', target_id: 4, body: 'hi' })).toMatchObject({ ok: true, value: { parentId: null } });
    expect(checkReply({ target_type: 'thread', target_id: 4, body: 'hi' }).ok).toBe(false);
    expect(checkReply({ target_type: 'challenge', target_id: 4, body: '  ' }).ok).toBe(false);
    expect(hasLink('see https://x.y')).toBe(true);
    expect(hasLink('no link')).toBe(false);
  });
  it('post keys', () => {
    expect(isPostKind('thread')).toBe(true);
    expect(isPostKind('poll')).toBe(false);
    expect(parsePostKey('debate', '2026-09-22')).toEqual({ daily: '2026-09-22' });
    expect(parsePostKey('debate', '14')).toEqual({ id: 14 });
    expect(parsePostKey('thread', '2026-09-22')).toBeNull();
    expect(parsePostKey('thread', '0')).toBeNull();
    expect(parsePostKey('blog', '12abc')).toBeNull();
  });
  it('a missing table is recognised (GET probe), other errors are not', () => {
    expect(isMissingTable({ code: 'PGRST205', message: 'Could not find the table' }, 404)).toBe(true);
    expect(isMissingTable({ code: '42P01', message: 'relation does not exist' })).toBe(true);
    expect(isMissingTable({ code: '57014', message: 'canceling statement due to statement timeout' }, 500)).toBe(false);
    expect(isMissingTable(null)).toBe(false);
  });
});

describe('Happening now phrases', () => {
  const gname = (s: string | null): string => (s === 'stray-kids' ? 'Stray Kids' : 'K-pop');
  it('bolds the numbers and the quiz, links the hub', () => {
    const r = eventPhrase({ event_type: 'quiz_completed', group_slug: 'stray-kids', payload: { score: 10, total: 10 } }, gname)!;
    expect(r.parts.map((p) => (p.b ? `**${p.t}**` : p.t)).join(' ')).toBe('scored **10/10** on a **Stray Kids quiz**');
    expect(r.href).toBe('/stray-kids-quiz');
    expect(eventPhrase({ event_type: 'quiz_created', group_slug: null, payload: { title: 'TXT era check' } }, gname)!.parts[1]).toEqual({ t: 'TXT era check', b: true });
    expect(eventPhrase({ event_type: 'debate_voted', group_slug: null, payload: {} }, gname)!.href).toBe('/community');
    expect(eventPhrase({ event_type: 'unknown_thing', group_slug: null, payload: {} }, gname)).toBeNull();
  });
  it('collapses sprees: same person + same action once, 2 rows per person max', () => {
    const rows = [
      { user_id: 'a', display_name: 'a', event_type: 'quiz_completed' },
      { user_id: 'a', display_name: 'a', event_type: 'quiz_completed' },
      { user_id: 'a', display_name: 'a', event_type: 'perfect_score' },
      { user_id: 'a', display_name: 'a', event_type: 'quiz_created' },
      { user_id: null, display_name: 'someone', event_type: 'quiz_completed' },
      { user_id: 'b', display_name: 'b', event_type: 'mystery' },
    ];
    const out = collapseSpree(rows, 10, (r) => r.event_type !== 'mystery');
    expect(out.map((r) => `${r.user_id ?? r.display_name}:${r.event_type}`)).toEqual(['a:quiz_completed', 'a:perfect_score', 'someone:quiz_completed']);
    expect(collapseSpree(rows, 1, () => true)).toHaveLength(1);
  });
});

describe('feed', () => {
  const post = (kind: FeedPost['kind'], key: string, at: string, extra: Partial<FeedPost> = {}): FeedPost => ({
    kind, key, href: `/community/${kind}/${key}`, title: `${kind} ${key}`, excerpt: null, group: { id: 1, name: 'BTS', slug: 'bts', fandom: 'ARMY' },
    author: null, at, ago: '', replies: 0, likes: null, ...extra,
  });
  it('merges newest first (mixed timestamp formats), caps, stamps ago', () => {
    const out = mergeFeed([
      [post('thread', '1', '2026-07-31T13:03:12.822573+00:00')],
      [post('debate', '2026-09-22', '2026-09-22T00:00:00.000Z'), post('debate', '2026-09-21', '2026-09-21T00:00:00.000Z')],
      [post('blog', '2', '2026-09-22T00:00:01+00:00')],
    ], NOW, 3);
    expect(out.map((p) => p.key)).toEqual(['2', '2026-09-22', '2026-09-21']);
    expect(out[0]!.ago).toBe('4 days ago');
  });
  it('blog cover: own asset, album art, else the group photo, else none', () => {
    expect(blogCover({ mbid: '12345678-1234-1234-1234-123456789012' }, 'bts')).toContain('coverartarchive.org/release-group/12345678-1234-1234-1234-123456789012');
    expect(blogCover({ mbid: 'javascript:alert(1)' }, 'bts')).toBe('/idols/BTS.jpg');
    expect(blogCover({}, 'bts')).toBe('/idols/BTS.jpg');
    expect(blogCover(null, 'no-photo-group')).toBeNull();
  });
  it('a daily debate closes at the next UTC midnight', () => {
    expect(dailyClosesAt('2026-09-26')).toBe('2026-09-27T00:00:00.000Z');
  });
});

describe('feed card render', () => {
  const author = { name: 'stay4life', username: 'stay4life', href: '/u/stay4life', avatarUrl: null, accent: 'teal', font: 'default', bias: 'Felix', level: 9, levelTitle: 'Stan', isSystem: false };
  it('a thread: flair name, real title link, replies link, no heart without a store', () => {
    const html = renderToStaticMarkup(createElement(FeedCard, { post: {
      kind: 'thread', key: '1', href: '/community/thread/1', title: 'Which album first?', excerpt: 'My cousin <b>just</b> got in.', group: { id: 3, name: 'Stray Kids', slug: 'stray-kids', fandom: 'STAY' },
      author, at: '2026-09-26T11:40:00Z', ago: '20 min ago', replies: 38, likes: null,
    } }));
    expect(html).toContain('href="/community/thread/1"');
    expect(html).toContain('ux-acc-teal');
    expect(html).toContain('Felix');
    expect(html).toContain('Lv 9 · 20 min ago');
    expect(html).toContain('Thread · Stray Kids');
    expect(html).toContain('href="/community/thread/1#replies"');
    expect(html).toContain('&lt;b&gt;just&lt;/b&gt;');
    expect(html).not.toContain('aria-pressed');
    expect(EMDASH.test(html)).toBe(false);
  });
  it('a closed daily debate: the site as author, bars, no winner on a tie', () => {
    const html = renderToStaticMarkup(createElement(FeedCard, { post: {
      kind: 'debate', key: '2026-09-17', href: '/community/debate/2026-09-17', title: 'Dance practice or MV?', excerpt: null, group: { id: 30, name: 'General K-pop', slug: 'general-kpop', fandom: 'fan' },
      author: null, at: '2026-09-17T00:00:00.000Z', ago: 'Sep 17', replies: 0, likes: null,
      debate: { daily: true, open: false, closesAt: '2026-09-18T00:00:00.000Z', comments: 0, total: 2, options: [{ label: 'Agree', votes: 1 }, { label: 'Disagree', votes: 1 }] },
    } }));
    expect(html).toContain('KpopQuiz');
    expect(html).toContain('Daily debate · Sep 17');
    expect(html).toContain('2 votes · closed');
    expect(html).not.toContain('is-win');
    expect(html.match(/<b aria-hidden="true">50%<\/b>/g)).toHaveLength(2);
    expect(html).toContain('aria-label="Agree: 50%, 1 vote"');
  });
  it('a blog with a heart: the essay heart and the cover', () => {
    const html = renderToStaticMarkup(createElement(FeedCard, { post: {
      kind: 'blog', key: '2', href: '/community/blog/2', title: 'Why ARMY documents everything', excerpt: 'Every fandom remembers.', group: { id: 1, name: 'BTS', slug: 'bts', fandom: 'ARMY' },
      author: { ...author, name: 'KpopVerse', username: null, href: null, accent: null, bias: null, level: null, levelTitle: null, isSystem: true },
      at: '2026-07-31T13:03:11Z', ago: 'Jul 31', replies: 0, likes: 0, blog: { coverUrl: '/idols/BTS.jpg', coverFocal: 'center 22%', readingMin: 3 },
    } }));
    expect(html).toContain('Blog · BTS · 3 min read');
    expect(html).toContain('src="/idols/BTS.jpg"');
    expect(html).toContain('aria-pressed="false"');
    expect(html).not.toContain('href="/u/');
  });
});
