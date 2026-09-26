import { describe, expect, it } from 'vitest';

import { NOTIFICATION_TYPES } from '@/lib/notification-types';
import { UX_ICONS } from '@/lib/ux-v1/a0/icons';

import { applyRead, applyRemove } from './actions';
import {
  P11_FILTERS, bellAgo, categoryOf, compactAgo, countUnread, dayLabelOf, groupByDay, iconOf, matchesFilter, spokenAgo,
  streakRow, targetOf, unreadLine,
} from './notifications';
import {
  compact, flatRows, likePattern, matchGroups, mergeQuizzes, mergeSongs, normalizeQuery, playsLabel, quizzesLabel,
  resultSummary, songHref,
} from './search-model';

import type { P11Notification } from './notifications';

// P11 unit tests: the notifications view model (filters, icons, targets, day
// groups, ages, streak row), the page <-> bell sync reducers, and the search model
// (query normalisation, LIKE safety, group matching, merges, labels).

const NOW = new Date(2026, 8, 26, 15, 0, 0); // local time, 26 Sep 2026 15:00

function n(over: Partial<P11Notification> = {}): P11Notification {
  return { id: 'a', type: 'milestone', title: 'Your quiz hit 100 plays!', body: null, quiz_id: null, quiz_slug: null, link_url: null, is_read: false, created_at: NOW.toISOString(), ...over };
}

describe('notifications: filters and categories', () => {
  it('has the four prototype filters in order', () => {
    expect(P11_FILTERS.map((f) => f.label)).toEqual(['All', 'Your quizzes', 'Social', 'Achievements']);
  });
  it('maps every live type to its settings category (lib/notification-types.ts)', () => {
    expect(categoryOf('milestone')).toBe('your_quizzes');
    expect(categoryOf('rating')).toBe('your_quizzes');
    expect(categoryOf('comment')).toBe('your_quizzes');
    expect(categoryOf('new_follower')).toBe('social');
    expect(categoryOf('cheer')).toBe('social');
    expect(categoryOf('battle_beaten')).toBe('social');
    expect(categoryOf('verse_watch')).toBe('social');
    expect(categoryOf('badge_earned')).toBe('achievements');
    expect(categoryOf('group_mastered')).toBe('achievements');
    expect(categoryOf('streak_milestone')).toBe('achievements');
    expect(categoryOf('followed_new_quiz')).toBe('following');
    expect(categoryOf('admin_dm')).toBe('announcements');
    expect(categoryOf('unknown_type')).toBeNull();
  });
  it('All shows everything; the tabs show their category only', () => {
    expect(matchesFilter({ type: 'admin_dm' }, 'all')).toBe(true);
    expect(matchesFilter({ type: 'admin_dm' }, 'social')).toBe(false);
    expect(matchesFilter({ type: 'followed_new_quiz' }, 'your_quizzes')).toBe(false);
    expect(matchesFilter({ type: 'comment' }, 'your_quizzes')).toBe(true);
    expect(matchesFilter({ type: 'badge_earned' }, 'achievements')).toBe(true);
  });
});

describe('notifications: icons', () => {
  it('every live type has an icon from the v11 set', () => {
    for (const t of NOTIFICATION_TYPES) expect(Object.keys(UX_ICONS)).toContain(iconOf(t));
  });
  it('uses the prototype icons', () => {
    expect(iconOf('milestone')).toBe('play');
    expect(iconOf('comment')).toBe('msg');
    expect(iconOf('battle_beaten')).toBe('trophy');
    expect(iconOf('badge_earned')).toBe('star');
    expect(iconOf('new_follower')).toBe('user');
    expect(iconOf('cheer')).toBe('heart');
    expect(iconOf('streak_milestone')).toBe('flame');
    expect(iconOf('followed_new_quiz')).toBe('layers');
    expect(iconOf('group_mastered')).toBe('target');
    expect(iconOf('admin_dm')).toBe('mail');
    expect(iconOf('something_new')).toBe('bell');
  });
});

describe('notifications: targets (the live card rule, safe at the sink)', () => {
  it('link_url first, then the quiz', () => {
    expect(targetOf({ link_url: '/u/moa_bloom', quiz_slug: 'x' })).toEqual({ href: '/u/moa_bloom', external: false });
    expect(targetOf({ link_url: null, quiz_slug: 'bts-era-quiz' })).toEqual({ href: '/q/bts-era-quiz', external: false });
    expect(targetOf({ link_url: 'https://discord.gg/abc', quiz_slug: null })).toEqual({ href: 'https://discord.gg/abc', external: true });
    expect(targetOf({ link_url: null, quiz_slug: null })).toBeNull();
  });
  it('never links a dangerous or protocol-relative URL', () => {
    expect(targetOf({ link_url: 'javascript:alert(1)', quiz_slug: null })).toBeNull();
    expect(targetOf({ link_url: 'data:text/html,x', quiz_slug: null })).toBeNull();
    expect(targetOf({ link_url: '//evil.example/x', quiz_slug: null })).toBeNull();
    expect(targetOf({ link_url: '/\\evil.example', quiz_slug: null })).toBeNull();
    expect(targetOf({ link_url: 'javascript:alert(1)', quiz_slug: 'safe' })).toEqual({ href: '/q/safe', external: false });
  });
  it('encodes the quiz slug', () => {
    expect(targetOf({ link_url: null, quiz_slug: 'a b' })?.href).toBe('/q/a%20b');
  });
});

describe('notifications: day groups and ages', () => {
  const at = (d: number, h = 12): string => new Date(2026, 8, d, h, 0, 0).toISOString();
  it('Today / Yesterday / Earlier by the local calendar day', () => {
    expect(dayLabelOf(at(26, 1), NOW)).toBe('Today');
    expect(dayLabelOf(at(25, 23), NOW)).toBe('Yesterday');
    expect(dayLabelOf(at(25, 0), NOW)).toBe('Yesterday');
    expect(dayLabelOf(at(24, 23), NOW)).toBe('Earlier');
    expect(dayLabelOf('not a date', NOW)).toBe('Earlier');
  });
  it('groups consecutive rows, keeping the newest-first order', () => {
    const g = groupByDay([n({ id: '1', created_at: at(26) }), n({ id: '2', created_at: at(26, 9) }), n({ id: '3', created_at: at(25) }), n({ id: '4', created_at: at(20) })], NOW);
    expect(g.map((x) => [x.label, x.items.map((i) => i.id)])).toEqual([['Today', ['1', '2']], ['Yesterday', ['3']], ['Earlier', ['4']]]);
  });
  it('compact ages match the prototype ("2h", "1d", "1w")', () => {
    const ago = (ms: number): string => new Date(NOW.getTime() - ms).toISOString();
    expect(compactAgo(ago(20_000), NOW)).toBe('now');
    expect(compactAgo(ago(5 * 60_000), NOW)).toBe('5m');
    expect(compactAgo(ago(2 * 3_600_000), NOW)).toBe('2h');
    expect(compactAgo(ago(26 * 3_600_000), NOW)).toBe('1d');
    expect(compactAgo(ago(6 * 86_400_000), NOW)).toBe('6d');
    expect(compactAgo(ago(8 * 86_400_000), NOW)).toBe('1w');
    expect(compactAgo(ago(40 * 86_400_000), NOW)).toBe('Aug 2026');
    expect(compactAgo(new Date(NOW.getTime() + 60_000).toISOString(), NOW)).toBe('now');
  });
  it('bell and spoken ages', () => {
    const ago = (ms: number): string => new Date(NOW.getTime() - ms).toISOString();
    expect(bellAgo(ago(2 * 3_600_000), NOW)).toBe('2h ago');
    expect(bellAgo(ago(10_000), NOW)).toBe('just now');
    expect(bellAgo(ago(40 * 86_400_000), NOW)).toBe('Aug 2026');
    expect(spokenAgo(ago(2 * 3_600_000), NOW)).toBe('2 hours ago');
    expect(spokenAgo(ago(3_600_000), NOW)).toBe('1 hour ago');
    expect(spokenAgo(ago(86_400_000), NOW)).toBe('1 day ago');
    expect(spokenAgo(ago(14 * 86_400_000), NOW)).toBe('2 weeks ago');
  });
});

describe('notifications: header and streak row', () => {
  it('subtitle', () => {
    expect(unreadLine(4)).toBe('4 unread');
    expect(unreadLine(1200)).toBe('1,200 unread');
    expect(unreadLine(0)).toBe('All caught up');
  });
  it('at risk: the real rule (daily quiz or daily blindtest) and the daily link', () => {
    expect(streakRow({ state: 'at_risk', days: 12, left: '5h 12m' })).toEqual({
      state: 'at_risk', title: 'Your 12-day streak ends in 5h 12m', sub: 'Play the daily quiz or the daily blindtest to keep it.',
      action: { href: '/daily', label: "Play today's daily" },
    });
  });
  it('saved (prototype "Streak saved: 13 days")', () => {
    expect(streakRow({ state: 'played_today', days: 13, left: '9h' })).toEqual({ state: 'saved', title: 'Streak saved: 13 days', sub: 'Come back tomorrow to make it 14.', action: null });
    expect(streakRow({ state: 'played_today', days: 1, left: '9h' })?.title).toBe('Streak saved: 1 day');
  });
  it('no streak, no row (min-gate)', () => {
    expect(streakRow(null)).toBeNull();
    expect(streakRow({ state: 'at_risk', days: 0, left: '1h' })).toBeNull();
  });
  it('counts unread rows', () => {
    expect(countUnread([n(), n({ is_read: true }), n()])).toBe(2);
  });
});

describe('page <-> bell sync reducers', () => {
  const list = [n({ id: '1' }), n({ id: '2', is_read: true }), n({ id: '3' })];
  it('marks one or all read, same array when nothing changes', () => {
    expect(applyRead(list, { ids: ['1'] }).map((x) => x.is_read)).toEqual([true, true, false]);
    expect(applyRead(list, { all: true }).every((x) => x.is_read)).toBe(true);
    expect(applyRead(list, { ids: ['2'] })).toBe(list);
    const allRead = list.map((x) => ({ ...x, is_read: true }));
    expect(applyRead(allRead, { all: true })).toBe(allRead);
  });
  it('removes rows', () => {
    expect(applyRemove(list, { ids: ['2', '3'] }).map((x) => x.id)).toEqual(['1']);
    expect(applyRemove(list, { ids: ['9'] })).toBe(list);
  });
});

describe('search model', () => {
  it('normalises the query', () => {
    expect(normalizeQuery('  stray   kids ')).toBe('stray kids');
    expect(normalizeQuery(null)).toBe('');
    expect(normalizeQuery('x'.repeat(150)).length).toBe(100);
  });
  it('LIKE pattern drops wildcards and filter syntax', () => {
    expect(likePattern('bts')).toBe('%bts%');
    expect(likePattern('100% bts_*')).toBe('%100 bts%');
    expect(likePattern('a,b(c)')).toBe('%a b c%');
    expect(likePattern('%%')).toBeNull();
    expect(likePattern('방탄')).toBe('%방탄%');
  });
  it('compact form ignores spaces and punctuation', () => {
    expect(compact('(G)I-DLE')).toBe('gidle');
    expect(compact('Stray Kids')).toBe('straykids');
  });
  const groups = [
    { slug: 'bts', name: 'BTS', quizzes: 27, photo: '/idols/BTS.jpg' },
    { slug: 'stray-kids', name: 'Stray Kids', quizzes: 28, photo: null },
    { slug: 'g-i-dle', name: '(G)I-DLE', quizzes: 5, photo: null },
    { slug: 'btob', name: 'BTOB', quizzes: 0, photo: null },
    { slug: 'babymonster', name: 'BABYMONSTER', quizzes: 3, photo: null },
    { slug: 'blackpink', name: 'BLACKPINK', quizzes: 24, photo: null },
  ];
  it('matches group names (contains, case-insensitive, compact), most quizzes first, max 4', () => {
    expect(matchGroups(groups, 'bt').map((g) => g.slug)).toEqual(['bts', 'btob']);
    expect(matchGroups(groups, 'straykids').map((g) => g.slug)).toEqual(['stray-kids']);
    expect(matchGroups(groups, 'gidle').map((g) => g.slug)).toEqual(['g-i-dle']);
    expect(matchGroups(groups, 'b').map((g) => g.slug)).toEqual(['bts', 'blackpink', 'babymonster', 'btob']);
    expect(matchGroups(groups, '')).toEqual([]);
  });
  it('merges title and group matches, one row per quiz, most played first', () => {
    const a = [{ slug: 'x', title: 'X', play_count: 10, cover_image_url: null, group_name: 'BTS', group_slug: 'bts' }];
    const b = [
      { slug: 'x', title: 'X', play_count: 10, cover_image_url: null, group_name: 'BTS', group_slug: 'bts' },
      { slug: 'y', title: 'Y', play_count: 900, cover_image_url: null, group_name: 'BTS', group_slug: 'bts' },
    ];
    expect(mergeQuizzes([a, b]).map((q) => q.slug)).toEqual(['y', 'x']);
    expect(mergeQuizzes([Array.from({ length: 8 }, (_, i) => ({ ...a[0]!, slug: `s${i}`, play_count: i }))]).length).toBe(5);
  });
  it('merges song matches, max 3', () => {
    const s = (id: string, p: number) => ({ id, title: id, artist_name: 'BTS', play_count: p, group_slug: 'bts' });
    expect(mergeSongs([[s('a', 1), s('b', 5)], [s('b', 5), s('c', 3), s('d', 0)]]).map((x) => x.id)).toEqual(['b', 'c', 'a']);
  });
  it('labels', () => {
    expect(quizzesLabel(28)).toBe('28 quizzes');
    expect(quizzesLabel(1)).toBe('1 quiz');
    expect(quizzesLabel(0)).toBe('No quiz yet');
    expect(playsLabel(3)).toBe('New');
    expect(playsLabel(2400)).toBe('2.4k plays');
  });
  it('a song opens its group playlist only when the playlist exists', () => {
    const playable = new Set(['bts']);
    expect(songHref('bts', playable)).toBe('/blindtest/group-bts');
    expect(songHref('akmu', playable)).toBe('/blindtest');
    expect(songHref(null, playable)).toBe('/blindtest');
  });
  it('rows in display order and the spoken summary', () => {
    const r = {
      groups: [{ name: 'BTS', slug: 'bts', href: '/bts-quiz', sub: '27 quizzes', photo: null, initials: 'BT' }],
      quizzes: [{ title: 'Q', href: '/q/q', sub: 'BTS · New', thumb: null, initials: 'BT' }, { title: 'R', href: '/q/r', sub: 'BTS · New', thumb: null, initials: 'BT' }],
      songs: [{ title: 'Dynamite', href: '/blindtest/group-bts', sub: 'BTS' }],
    };
    expect(flatRows(r).map((x) => x.href)).toEqual(['/bts-quiz', '/q/q', '/q/r', '/blindtest/group-bts']);
    expect(resultSummary(r)).toBe('1 group, 2 quizzes and 1 song');
    expect(resultSummary({ groups: [], quizzes: [], songs: [] })).toBe('No results');
    expect(resultSummary({ groups: [], quizzes: r.quizzes, songs: [] })).toBe('2 quizzes');
  });
});
