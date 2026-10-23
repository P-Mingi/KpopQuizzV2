import { describe, expect, it } from 'vitest';

import { clusterMatcher, normalizeQuery, parseTargets, RULEBOOK_V1_CLUSTERS } from './targets';
import { TARGETS_MD } from './fixtures';

describe('parseTargets', () => {
  const rows = parseTargets(TARGETS_MD);

  it('reads the cluster table and nothing else', () => {
    expect(rows).toHaveLength(13);
    expect(rows[1]).toEqual({ cluster: 'bts quiz', queries: ['bts quiz', 'quiz bts', 'bts test'], url: '/bts-quiz', status: 'live' });
    expect(rows.at(-1)!.cluster).toBe('{group} games');
  });

  it('returns nothing for a file without the table', () => {
    expect(parseTargets('# nothing here\n\n| a | b |\n|---|---|\n| 1 | 2 |')).toEqual([]);
  });
});

describe('normalizeQuery', () => {
  it('lower-cases, drops accents and punctuation, writes k-pop as kpop', () => {
    expect(normalizeQuery('  K-Pop  Générations?! ')).toBe('kpop generations');
    expect(normalizeQuery("which aespa member are you")).toBe('which aespa member are you');
  });
});

describe('clusterMatcher', () => {
  const match = clusterMatcher(parseTargets(TARGETS_MD));
  const id = (q: string): string | null => match(q)?.cluster.cluster ?? null;

  it('exact queries first', () => {
    expect(match('BTS Quiz')).toMatchObject({ how: 'exact' });
    expect(id('bts quiz')).toBe('bts quiz');
    expect(id('quiz kpop')).toBe('kpop quiz');
    expect(id('kpop blind test')).toBe('blind test kpop');
  });

  it('every word of a cluster query, the most specific winning', () => {
    expect(id('kpop generations timeline')).toBe('kpop generations');
    expect(id('generations of kpop')).toBe('kpop generations');
    expect(id('bts army test')).toBe('bts army test');
    expect(id('bts trivia games')).toBe('bts trivia');
    expect(id('free kpop games online')).toBe('kpop games');
    // Fan spellings of the real export (Bing, 2026-10-14).
    expect(id('kpop gens')).toBe('kpop generations');
    expect(id('1st gen kpop')).toBe('kpop generations');
    expect(id('first gen k pop')).toBe('kpop generations');
    expect(id('what generation is bts')).toBe('kpop generations');
    expect(id('enhypen game')).toBe('{group} games');
  });

  it('templates need a word for {group} or X', () => {
    expect(id('stray kids test')).toBe('{group} quiz');
    expect(id('how well do you know stray kids stray kids quiz')).toBe('{group} quiz');
    expect(id('stray kids games online')).toBe('{group} games');
    expect(id('which aespa member are you')).toBe('which {group} member are you');
    expect(id('what gen is bts')).toBe('kpop generations');
    expect(id('quiz')).toBeNull();
    expect(match('twice quiz')).toMatchObject({ how: 'template' });
  });

  it('leaves unrelated or cut queries alone', () => {
    expect(id('bts qui')).toBeNull();
    expect(id('teste illit')).toBeNull();
    expect(id('')).toBeNull();
  });

  it('the rulebook fallback has the same shape', () => {
    const m = clusterMatcher(RULEBOOK_V1_CLUSTERS);
    expect(m('kpop games')?.cluster.url).toBe('/kpop-games');
    expect(m('blackpink quiz')?.cluster.cluster).toBe('{group} quiz');
  });
});
