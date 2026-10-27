import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import content from '@/data/team-quizzes/bts-army-level-test.json';
import { validateQuestions } from '@/lib/quiz-validation';
import { isGenericGroupTitle } from '@/lib/seo/quiz-meta';
import { hubSlugGroup } from '@/lib/seo/hub-slugs';

import { buildTeamQuizSql, storedQuestions } from '../../../scripts/team-quiz-sql.mjs';
import { parseResultLevels } from './result-levels';

// SEO Mission 2 part B point 8: the Team quiz "BTS ARMY level test", prepared for the owner
// (not in the database). 15 sourced questions, a level result, and the pending SQL is exactly
// what the generator makes of this file.

const ALLOWED = /^https:\/\/(en\.wikipedia\.org|www\.wikidata\.org|bts-official\.jp|ibighit\.com|www\.billboard\.com|circlechart\.kr|www\.koreajoongangdaily\.com|www\.koreatimes\.co\.kr|www\.koreaherald\.com|en\.yna\.co\.kr)\//;
const BANNED = /kprofiles|fandom\.com|namu\.wiki|allkpop|soompi/i;
const DASHES = /[\u2013\u2014]/;

describe('BTS ARMY level test content', () => {
  it('15 multiple-choice questions the create validator accepts', () => {
    expect(content.questions).toHaveLength(15);
    expect(validateQuestions(storedQuestions(content), 'multiple_choice')).toEqual([]);
  });

  it('every question: 4 distinct options, the answer among them, a fun fact under 280 characters', () => {
    for (const q of content.questions) {
      expect(new Set(q.options).size, q.question).toBe(4);
      expect(q.correct, q.question).toBeGreaterThanOrEqual(0);
      expect(q.correct, q.question).toBeLessThan(4);
      expect(q.fun_fact.length, q.question).toBeLessThanOrEqual(280);
      expect(q.fun_fact, q.question).toMatch(/Source: [A-Z][\w .]+\.$/);
    }
    // The answers are spread over the four positions, not always the same one.
    expect(new Set(content.questions.map((q) => q.correct)).size).toBeGreaterThanOrEqual(3);
  });

  it('every answer has an allowed source, never a fan database', () => {
    for (const q of content.questions) {
      expect(q.sources.length, q.question).toBeGreaterThanOrEqual(1);
      for (const s of q.sources) {
        expect(s.url, q.question).toMatch(ALLOWED);
        expect(s.url, q.question).not.toMatch(BANNED);
      }
    }
  });

  it('no dash anywhere, no typed Wikidata id', () => {
    const all = JSON.stringify(content);
    expect(all).not.toMatch(DASHES);
    expect(all).not.toMatch(/\bQ\d{4,}\b/);
  });

  it('a valid level result, and a title and slug that do not take the hub\'s', () => {
    const levels = parseResultLevels(content.settings);
    expect(levels).not.toBeNull();
    expect(levels!.map((l) => l.min)).toEqual([0, 40, 60, 80, 100]);
    expect(isGenericGroupTitle(content.title, 'BTS', 'bts')).toBe(false);
    expect(hubSlugGroup(content.slug)?.group).not.toBe('bts');
    expect(content.slug).toMatch(/^[a-z0-9-]{1,80}$/);
    expect(content.title.length).toBeGreaterThanOrEqual(5);
    expect(content.creatorId).toBe('00000000-0000-0000-0000-000000000001');
  });
});

describe('the pending SQL', () => {
  const dir = new URL('../../../../../docs/pending-migrations/', import.meta.url);
  const read = (name: string): string => readFileSync(fileURLToPath(new URL(name, dir)), 'utf8');

  it('is the generator output for the current content (never edited by hand)', () => {
    const { up, down } = buildTeamQuizSql(content);
    expect(read('seo-m2-bts-army-level-test.sql')).toBe(up);
    expect(read('seo-m2-bts-army-level-test-rollback.sql')).toBe(down);
  });

  it('inserts a draft owned by the Team profile, in one transaction, and never publishes', () => {
    const { up } = buildTeamQuizSql(content);
    const sql = up.split('\n').filter((l: string) => !l.startsWith('--')).join('\n');
    expect(sql).toMatch(/^begin;$/m);
    expect(sql).toMatch(/^commit;$/m);
    expect(sql).toContain("'draft',");
    expect(sql).not.toMatch(/'published'/);
    expect(sql).not.toMatch(/\bupdate\b/i);
    expect(sql).toContain("'00000000-0000-0000-0000-000000000001'::uuid");
  });

  it('the rollback only removes a draft', () => {
    const { down } = buildTeamQuizSql(content);
    expect(down).toContain("status = 'draft'");
    expect(down).toContain("status <> 'draft'");
  });
});
