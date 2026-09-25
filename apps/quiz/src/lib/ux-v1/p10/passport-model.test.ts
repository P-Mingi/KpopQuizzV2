import { describe, expect, it } from 'vitest';

import {
  averagePct, badgeTiles, bandMode, cssUrl, earnedLine, historyLine, masteryPct, metaLine, pinnedTiles, publicStats, personalStats, quizLine, themeColours, timeAgo, topMastery, xpLine,
} from './passport-model';

describe('passport model', () => {
  it('theme colours: prototype band tints, passport-themes swatches, unknown = default', () => {
    expect(themeColours('teal')).toEqual({ band: '#E1F5EE', bar: '#1D9E75' });
    expect(themeColours(null)).toEqual({ band: '#FCE8EF', bar: '#E8457A' });
    expect(themeColours('neon')).toEqual({ band: '#FCE8EF', bar: '#E8457A' });
  });

  it('band: https header image, else the main group photo, else flat', () => {
    expect(bandMode('https://x/h.webp', '/idols/BTS.jpg')).toBe('image');
    expect(bandMode('http://x/h.webp', '/idols/BTS.jpg')).toBe('group');
    expect(bandMode(null, null)).toBe('flat');
  });

  it('meta line and XP line use the real fields', () => {
    expect(metaLine({ fandomName: 'STAY', stanSince: 2019, createdAt: '2025-03-04T10:00:00Z', followers: 24 })).toBe('STAY since 2019 · joined March 2025 · 24 followers');
    expect(metaLine({ fandomName: null, stanSince: 2020, createdAt: '2025-03-04T10:00:00Z', followers: 1 })).toBe('Stan since 2020 · joined March 2025 · 1 follower');
    expect(metaLine({ createdAt: '2026-09-01T00:00:00Z', followers: 0 })).toBe('joined September 2026 · 0 followers');
    expect(xpLine(1280, 2000, 7, 56)).toEqual({ have: '1,280', rest: ' / 2,000 XP to Lv 8', pct: 56 });
  });

  it('stats: owner row (average hidden when unknown), public row (no play counts)', () => {
    expect(personalStats({ quizzesPlayed: 84, averagePct: 71, streak: 12, quizzesMade: 3, blindtestsPlayed: 31 }).map((c) => `${c.value} ${c.label}`))
      .toEqual(['84 quizzes played', '71% average score', '12 days streak', '3 quizzes made', '31 blindtests played']);
    expect(personalStats({ quizzesPlayed: 0, averagePct: null, streak: 1, quizzesMade: 0, blindtestsPlayed: 0 }).map((c) => c.label)).not.toContain('average score');
    expect(publicStats({ streak: 0, groupsMastered: 2, quizzesMade: 1200, playsReceived: 51 }).map((c) => `${c.value} ${c.label}`))
      .toEqual(['0 days streak', '2 groups mastered', '1,200 quizzes made', '51 plays received']);
  });

  it('average score over every scored play', () => {
    expect(averagePct([])).toBeNull();
    expect(averagePct([{ score: 8, total_questions: 8 }, { score: 2, total_questions: 8 }, { score: null, total_questions: 8 }, { score: 3, total_questions: 0 }])).toBe(63);
  });

  it('mastery: both plays and accuracy count, 100 only when mastered; catch-all groups skipped', () => {
    expect(masteryPct(0, 0, false)).toBe(0);
    expect(masteryPct(15, 0.8, false)).toBe(50);
    expect(masteryPct(60, 0.4, false)).toBe(50);
    expect(masteryPct(60, 0.99, false)).toBe(99);
    expect(masteryPct(30, 0.8, true)).toBe(100);
    const groups = new Map([[1, { name: 'BTS', slug: 'bts' }], [2, { name: 'General K-pop', slug: 'general-kpop' }], [3, { name: 'Stray Kids', slug: 'stray-kids' }], [4, { name: 'Q', slug: 'zzz-quarantine-hidden' }]]);
    const rows = topMastery([
      { group_id: 1, songs_played: 10, accuracy: 0.5, mastered: false },
      { group_id: 2, songs_played: 90, accuracy: 0.9, mastered: true },
      { group_id: 3, songs_played: 40, accuracy: 0.9, mastered: true },
      { group_id: 4, songs_played: 40, accuracy: 0.9, mastered: true },
      { group_id: 5, songs_played: 40, accuracy: 0.9, mastered: true },
    ], groups);
    expect(rows).toEqual([{ name: 'Stray Kids', slug: 'stray-kids', pct: 100 }, { name: 'BTS', slug: 'bts', pct: 21 }]);
  });

  it('badges: definitions order, earned first, pinned first on the overview (max 6), live counts', () => {
    const defs = ['a', 'perfect_score', 'first_steps', 'group_master', 'b', 'c', 'd', 'e'].map((id, i) => ({ id, name: id, description: `d${i}` }));
    const tiles = badgeTiles(defs, ['first_steps', 'perfect_score', 'b', 'c', 'd', 'e', 'a']);
    expect(tiles.map((t) => t.id)).toEqual(['a', 'perfect_score', 'first_steps', 'b', 'c', 'd', 'e', 'group_master']);
    expect(tiles.find((t) => t.id === 'group_master')?.rarity).toBe('legendary');
    expect(pinnedTiles(tiles, 'first_steps').map((t) => t.id)).toEqual(['first_steps', 'a', 'perfect_score', 'b', 'c', 'd']);
    expect(pinnedTiles(tiles, 'group_master').map((t) => t.id)[0]).toBe('a'); // not earned: never pinned
    expect(earnedLine(tiles)).toBe('7 of 8 earned · colour and shape show rarity');
  });

  it('history and quiz lines', () => {
    const now = Date.parse('2026-09-25T20:00:00Z');
    expect(timeAgo('2026-09-25T19:59:30Z', now)).toBe('just now');
    expect(timeAgo('2026-09-25T14:00:00Z', now)).toBe('6 hours ago');
    expect(timeAgo('2026-09-24T18:00:00Z', now)).toBe('yesterday');
    expect(timeAgo('2026-09-01T18:00:00Z', now)).toBe('3 weeks ago');
    expect(historyLine({ kind: 'quiz', title: 't', href: null, groupSlug: null, score: 10, total: 10, at: '2026-09-23T12:00:00Z' }, now)).toBe('10/10 · perfect · 2 days ago');
    expect(quizLine({ play_count: 1400, like_count: 37 })).toBe('Published · 1.4k plays · 37 likes');
    expect(quizLine({ play_count: 1, like_count: 1 })).toBe('Published · 1 play · 1 like');
  });

  it('cssUrl only lets https / local paths through, escaped', () => {
    expect(cssUrl('javascript:alert(1)')).toBeNull();
    expect(cssUrl('//evil.example/x.png')).toBeNull();
    // "\27 " is the escape (its trailing space ends it), then the real space of the file name
    expect(cssUrl("/idols/Girls' Generation.jpg")).toBe('url("/idols/Girls\\27  Generation.jpg")');
    expect(cssUrl('https://a.example/x.png")')).toBe('url("https://a.example/x.png\\22 \\29 ")');
  });
});
