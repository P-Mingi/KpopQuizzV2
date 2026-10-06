import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { findBannedTerm, joinedWords, words } from './banned-match';

import type { BannedTerm } from './banned-match';

// The real list: the terms the community migration inserts into verse_banned_terms.
const here = path.dirname(fileURLToPath(import.meta.url));
const sql = fs.readFileSync(path.resolve(here, '../../../../../docs/pending-migrations/v12-community-posts.sql'), 'utf8');
const TERMS: BannedTerm[] = [...sql.matchAll(/\('([^']+)', 'block', 'v12-community:/g)].map((m) => ({ term: m[1]!, action: 'block' }));

const blocked = (text: string): string | null => findBannedTerm(text, TERMS)?.term ?? null;

describe('banned terms: the list', () => {
  it('holds the five languages', () => {
    expect(TERMS.length).toBeGreaterThan(150);
    for (const lang of ['en', 'fr', 'es', 'id', 'ko']) expect(sql).toContain(`v12-community:${lang}:`);
  });
});

describe('banned terms: blocked, with the usual disguises', () => {
  const cases: Array<[string, string]> = [
    ['this comeback is fucking great', 'fuck'],
    ['F U C K this', 'fuck'],
    ['f.u.c.k this', 'fuck'],
    ['fuuuuuck', 'fuck'],
    ['fvck you', 'fvck'],
    ['p0rn site', 'porn'],
    ['wow what a b!tch!', 'bitch'],
    ['f*ck off', 'fck'],
    ['you are a b1tch', 'bitch'],
    ['what an @sshole', 'asshole'],
    ['link to porn here', 'porn'],
    ['PORNHUB', 'pornhub'],
    ['she is a whore', 'whore'],
    ['kill yourself', 'kill yourself'],
    ['kys', 'kys'],
    ['nique ta mère', 'nique ta mère'],
    ['NIQUE TA MERE', 'nique ta mère'],
    ['espèce de connard', 'connard'],
    ['enculé', 'enculé'],
    ['encule', 'enculé'],
    ['eres un hijo de puta', 'puta'],
    ['qué PUTA', 'puta'],
    ['maricon', 'maricón'],
    ['dasar bangsat', 'bangsat'],
    ['kontolmu', 'kontol'],
    ['씨발', '씨발'],
    ['씨 발', '씨발'],
    ['시1발', '시발'],
    ['개새끼야', '개새끼'],
    ['병신아 진짜', '병신'],
    ['ㅅㅂ', 'ㅅㅂ'],
    ['강간범', '강간'],
  ];
  for (const [text, term] of cases) {
    it(`"${text}" -> ${term}`, () => { expect(blocked(text)).toBe(term); });
  }
});

describe('banned terms: no false positive inside normal words', () => {
  const clean = [
    'Which class should a new fan start with?',
    'The assassin MV is passionate',
    'I live in Scunthorpe',
    'a cocktail and grape juice',
    'my therapist said so',
    'Sexy Love by T-ara is a classic',
    'Hitchcock films',
    'fans from Japan and Japanese fans',
    'reputation era',
    'la computadora y la disputa',
    'PD Kim produced it',
    'spicy noodles and spices',
    'Pussycat Dolls',
    'rapeseed oil',
    'constitution and concert',
    '시발점에서 다시 시작',
    '껌을 씹다',
    '보지 마',
    '자지 마',
    'anjing lucu sekali',
    'the essex show',
    'I love this song so much',
    '이 노래 진짜 좋아',
    'Bang Bang Bang',
  ];
  for (const text of clean) {
    it(`"${text}" passes`, () => { expect(blocked(text)).toBeNull(); });
  }
});

describe('banned terms: normalisation', () => {
  it('words keeps Hangul syllables and drops accents', () => {
    expect(words('Enculé! 시1발')).toEqual(['encule', '시발']);
  });
  it('joins spaced-out letters', () => {
    expect(joinedWords(words('f u c k off'))).toEqual(['fuck', 'off']);
    expect(joinedWords(words('씨 발 진짜'))).toEqual(['씨발', '진짜']);
  });
  it('block beats flag', () => {
    expect(findBannedTerm('nice porn', [{ term: 'nice', action: 'flag' }, { term: 'porn', action: 'block' }])).toEqual({ term: 'porn', action: 'block' });
    expect(findBannedTerm('nice day', [{ term: 'nice', action: 'flag' }])).toEqual({ term: 'nice', action: 'flag' });
  });
});
