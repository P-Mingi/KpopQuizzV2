import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { ORIGINS, quizRow } from './test-support';
import {
  ageInDays, capPerKey, chunk, coverOf, difficultyLabel, isListable, metaLine, playsLabel, QUIZ_SELECT, ratingFor, REPORT_EXCLUDE_AT, resolveOrigins, stableHash,
  toCard, utcDate,
} from './util';

import type { QuizRow } from './util';

const NOW = new Date('2026-10-25T12:00:00Z');

describe('labels', () => {
  it('prints plays from 100 and rounds like the cards do', () => {
    expect(playsLabel(0)).toBe('');
    expect(playsLabel(99)).toBe('');
    expect(playsLabel(100)).toBe('100 plays');
    expect(playsLabel(999)).toBe('999 plays');
    expect(playsLabel(1700)).toBe('1.7k plays');
    expect(playsLabel(2650)).toBe('2.7k plays');
    expect(playsLabel(12400)).toBe('12k plays');
  });

  it('writes the difficulty and the format', () => {
    expect(difficultyLabel('easy')).toBe('Easy');
    expect(metaLine('medium', 'multiple_choice')).toBe('Medium');
    expect(metaLine('easy', 'true_false')).toBe('Easy · True or false');
    expect(metaLine('easy', 'intruder')).toBe('Easy · Find the intruder');
  });
});

describe('dates', () => {
  it('counts whole UTC days', () => {
    expect(utcDate(NOW)).toBe('2026-10-25');
    expect(ageInDays('2026-10-25', NOW)).toBe(0);
    expect(ageInDays('2026-10-19', NOW)).toBe(6);
    expect(ageInDays('2026-10-26', NOW)).toBe(-1);
    expect(ageInDays('2026-10-25', new Date('2026-10-25T23:59:59Z'))).toBe(0);
  });
});

describe('toCard', () => {
  it('links to the canonical page of the quiz on its own site, never a copy', () => {
    const k = toCard(quizRow({ id: 'a', slug: 'bts-quiz', site_id: 'kpop' }) as unknown as QuizRow, ORIGINS, NOW);
    const a = toCard(quizRow({ id: 'b', slug: 'one-piece-basics', site_id: 'anime', groups: { name: 'One Piece', slug: 'one-piece' } }) as unknown as QuizRow, ORIGINS, NOW);
    expect(k.href).toBe('https://kpop.example/q/bts-quiz');
    expect(k.path).toBe('/q/bts-quiz');
    expect(a.href).toBe('https://anime.example/q/one-piece-basics');
    expect(a.siteName).toBe('OtakuQuiz');
    expect(k.siteName).toBe('KpopQuiz');
    expect(a.tile).toBe('OP');
  });

  it('marks a quiz New for 14 days and prints plays from 100', () => {
    const fresh = toCard(quizRow({ id: 'a', created_at: '2026-10-20T00:00:00Z', play_count: 40 }) as unknown as QuizRow, ORIGINS, NOW);
    expect(fresh.isNew).toBe(true);
    expect(fresh.hasPlays).toBe(false);
    const old = toCard(quizRow({ id: 'b', created_at: '2026-10-01T00:00:00Z', play_count: 2650 }) as unknown as QuizRow, ORIGINS, NOW);
    expect(old.isNew).toBe(false);
    expect(old.plays).toBe('2.7k plays');
    expect(old.hasPlays).toBe(true);
  });
});

describe('coverOf (home v3)', () => {
  const COVER = 'https://abc.supabase.co/storage/v1/object/public/images/covers/x.jpg';
  // A row the hub lists (owner decision 2026-10-29: the cover follows the moderation of the quiz page, see the last case).
  const LISTED = { status: 'published', report_count: 0 } as const;
  it('keeps the own cover of a K-pop quiz on a configured image host, as an absolute https URL', () => {
    expect(coverOf({ ...LISTED, site_id: 'kpop', cover_image_url: COVER })).toBe(COVER);
    expect(coverOf({ ...LISTED, site_id: 'kpop', cover_image_url: ` ${COVER} ` })).toBe(COVER);
    expect(toCard(quizRow({ id: 'a', cover_image_url: COVER }) as unknown as QuizRow, ORIGINS, NOW).cover).toBe(COVER);
  });
  it('refuses a protocol-relative URL (another host), a root-relative path, http, an unknown host, an anime quiz and no cover', () => {
    for (const url of ['//abc.supabase.co/storage/v1/object/public/images/covers/x.jpg', '//evil.example/x.jpg', '/covers/x.jpg', 'http://abc.supabase.co/x.jpg', 'https://evil.example/x.jpg', 'https:///x.jpg', 'javascript:alert(1)', '', null]) {
      expect(coverOf({ ...LISTED, site_id: 'kpop', cover_image_url: url }), String(url)).toBeNull();
    }
    expect(coverOf({ ...LISTED, site_id: 'kpop' })).toBeNull();
    expect(coverOf({ ...LISTED, site_id: 'anime', cover_image_url: COVER })).toBeNull();
  });
  it('shows the cover the kpop quiz page shows, with its moderation: the same field, and only while the quiz is published and listed', () => {
    // The quiz page reads quizzes.cover_image_url of a row read with status published (any other status is its 404); the hub reads the same
    // column in its one select.
    const read = (rel: string): string => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');
    expect(read('../../../../app/(site)/q/[slug]/ux-page.tsx')).toContain('const cover = quiz.cover_image_url ?? groupPhoto;');
    expect(read('../../../db/queries/quizzes.ts')).toMatch(/\.eq\('slug', slug\)\s*\.eq\('status', 'published'\)/);
    expect(QUIZ_SELECT.split(', ')).toContain('cover_image_url');
    // A quiz the page no longer shows (a draft, a quiz taken down, one waiting for review) has no cover on the hub, whoever asks.
    for (const status of ['draft', 'flagged', 'removed', 'hidden', 'pending', 'rejected', '']) {
      expect(coverOf({ status, report_count: 0, site_id: 'kpop', cover_image_url: COVER }), status).toBeNull();
      expect(toCard(quizRow({ id: 'a', status, cover_image_url: COVER }) as unknown as QuizRow, ORIGINS, NOW).cover, status).toBeNull();
    }
    // At the auto-flag line (5 reports) the quiz leaves every hub list, and its cover with it; under it the cover stays.
    expect(coverOf({ status: 'published', report_count: REPORT_EXCLUDE_AT, site_id: 'kpop', cover_image_url: COVER })).toBeNull();
    expect(coverOf({ status: 'published', report_count: REPORT_EXCLUDE_AT - 1, site_id: 'kpop', cover_image_url: COVER })).toBe(COVER);
    expect(coverOf({ status: 'published', report_count: null, site_id: 'kpop', cover_image_url: COVER })).toBe(COVER);
  });
});

describe('helpers', () => {
  it('lists a published quiz with fewer than 5 reports', () => {
    expect(REPORT_EXCLUDE_AT).toBe(5);
    expect(isListable({ status: 'published', report_count: 4 })).toBe(true);
    expect(isListable({ status: 'published', report_count: 5 })).toBe(false);
    expect(isListable({ status: 'flagged', report_count: 0 })).toBe(false);
    expect(isListable({ status: 'draft', report_count: null })).toBe(false);
  });

  it('caps items per key and keeps the order', () => {
    const items = ['a1', 'a2', 'b1', 'a3', 'b2', 'b3'];
    expect(capPerKey(items, (s) => s[0]!, 2)).toEqual(['a1', 'a2', 'b1', 'b2']);
  });

  it('chunks and hashes stably', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(stableHash('x')).toBe(stableHash('x'));
    expect(stableHash('x')).not.toBe(stableHash('y'));
  });

  it('pulls the like rate toward the site average', () => {
    const rows = [
      { like_count: 100, play_count: 2000 },
      { like_count: 0, play_count: 0 },
      { like_count: 10, play_count: 10 },
    ];
    const rate = ratingFor(rows);
    // a quiz without plays sits at the site average, not on top
    expect(rate(rows[1]!)).toBeCloseTo(110 / 2010, 5);
    expect(rate({ like_count: 100, play_count: 1000 })).toBeGreaterThan(rate(rows[1]!));
    expect(ratingFor([{ like_count: 0, play_count: 0 }])({ like_count: 0, play_count: 0 })).toBe(0);
  });
});

describe('origins', () => {
  it('uses the registry urls, and a given set as it is', () => {
    expect(resolveOrigins({ origins: ORIGINS })).toBe(ORIGINS);
    const o = resolveOrigins();
    expect(o.kpop).toMatch(/^https?:\/\//);
    expect(Object.keys(o).sort()).toEqual(['anime', 'hub', 'kpop']);
  });
});
