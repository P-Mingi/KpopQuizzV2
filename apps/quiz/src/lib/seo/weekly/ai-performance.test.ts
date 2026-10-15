import { describe, expect, it } from 'vitest';

import { compareFamilies, computeFamilies, parseAiPagesCsv, parseAiQueriesCsv, parseCount, parseCsv, parseShare } from './ai-performance';
import { AI_QUERIES_CSV, TARGETS_MD } from './fixtures';
import { parseTargets } from './targets';

import type { AiQueryRow } from './ai-performance';

const clusters = parseTargets(TARGETS_MD);
const row = (query: string, citations: number, share: number | null): AiQueryRow => ({ query, intent: '', topic: '', citations, share });

describe('parseCsv', () => {
  it('handles the BOM, CRLF, quotes and commas inside quotes', () => {
    const rows = parseCsv('﻿"a","b, c"\r\n"x ""y""",2\r\n');
    expect(rows).toEqual([['a', 'b, c'], ['x "y"', '2']]);
  });

  it('keeps a new line inside a quoted field and skips blank lines', () => {
    expect(parseCsv('a,"line1\nline2"\n\n\nb,c')).toEqual([['a', 'line1\nline2'], ['b', 'c']]);
  });
});

describe('numbers of the export', () => {
  it('parseShare reads percents and fractions', () => {
    expect(parseShare('25.01%')).toBe(0.2501);
    expect(parseShare('25,01 %')).toBe(0.2501);
    expect(parseShare('0.2501')).toBe(0.2501);
    expect(parseShare('37')).toBe(0.37);
    expect(parseShare('1')).toBe(0.01);
    expect(parseShare('0%')).toBe(0);
    expect(parseShare('')).toBeNull();
    expect(parseShare('n/a')).toBeNull();
    expect(parseShare('140%')).toBeNull();
  });

  it('parseCount reads thousands separators', () => {
    expect(parseCount('453')).toBe(453);
    expect(parseCount('1,234')).toBe(1234);
    expect(parseCount('1 234')).toBe(1234);
    expect(parseCount('1.234')).toBe(1234);
    expect(parseCount('12.5')).toBeNull();
    expect(parseCount('-3')).toBeNull();
    expect(parseCount('')).toBeNull();
  });
});

describe('parseAiQueriesCsv', () => {
  it('reads the real export format', () => {
    const out = parseAiQueriesCsv(AI_QUERIES_CSV);
    expect(out.error).toBeNull();
    expect(out.skipped).toBe(0);
    expect(out.rows).toHaveLength(16);
    expect(out.rows[2]).toEqual({ query: 'kpop generations', intent: 'Informational', topic: 'Music Genres (Pop, Rock, Hip-Hop, Classical)', citations: 465, share: 0.1906 });
  });

  it('refuses a file without the needed columns, in French', () => {
    expect(parseAiQueriesCsv('a,b\n1,2').error).toMatch(/Colonnes introuvables/);
    expect(parseAiQueriesCsv('').error).toBe('Fichier vide.');
  });

  it('skips unreadable and duplicate rows', () => {
    const out = parseAiQueriesCsv('Grounding Query,Citations,Citation Share\nbts quiz,10,5%\nbts quiz,11,5%\n,3,1%\nkpop,abc,2%');
    expect(out.rows).toHaveLength(1);
    expect(out.skipped).toBe(3);
  });
});

describe('parseAiPagesCsv', () => {
  it('finds a URL or Page column and the citations', () => {
    const out = parseAiPagesCsv('"Page","Citations","Citation Share"\r\n"https://kpopquiz.org/bts-quiz","1,200","12.5%"\r\n');
    expect(out.rows).toEqual([{ url: 'https://kpopquiz.org/bts-quiz', citations: 1200, share: 0.125 }]);
    expect(parseAiPagesCsv('"URL","Citations"\n"https://kpopquiz.org/","7"').rows[0]).toEqual({ url: 'https://kpopquiz.org/', citations: 7, share: null });
  });
});

describe('computeFamilies (Copilot query families)', () => {
  it('computes citations, implied total, share and gap for one query', () => {
    const r = computeFamilies([row('kpop games', 453, 0.0513)], clusters);
    const games = r.families.find((f) => f.id === 'kpop games')!;
    expect(games.citations).toBe(453);
    expect(games.impliedTotal).toBeCloseTo(453 / 0.0513, 6); // 8,830.4
    expect(games.share).toBeCloseTo(0.0513, 10);
    expect(games.gap).toBeCloseTo(453 / 0.0513 - 453, 6); // 8,377.4: "about 8,400 going elsewhere"
    expect(Math.round(games.gap!)).toBe(8377);
  });

  it('sums a family: share = citations / implied total, not the mean of shares', () => {
    const r = computeFamilies([row('kpop generations', 465, 0.1906), row('kpop generations timeline', 161, 0.2835), row('generations of kpop', 91, 0.3297)], clusters);
    const gen = r.families.find((f) => f.id === 'kpop generations')!;
    const implied = 465 / 0.1906 + 161 / 0.2835 + 91 / 0.3297;
    expect(gen.queryCount).toBe(3);
    expect(gen.citations).toBe(717);
    expect(gen.impliedTotal).toBeCloseTo(implied, 6);
    expect(gen.share).toBeCloseTo(717 / implied, 10);
    expect(gen.gap).toBeCloseTo(implied - 717, 6);
  });

  it('counts a query without share, but leaves it out of implied, share and gap', () => {
    const r = computeFamilies([row('kpop trivia', 254, 0.1822), row('kpop questions', 40, null), row('kpop trivia night', 10, 0)], clusters);
    const t = r.families.find((f) => f.id === 'kpop trivia')!;
    expect(t.citations).toBe(304);
    expect(t.citationsWithShare).toBe(254);
    expect(t.impliedTotal).toBeCloseTo(254 / 0.1822, 6);
    expect(t.share).toBeCloseTo(0.1822, 10);
  });

  it('has no share for a family whose queries all lack one', () => {
    const t = computeFamilies([row('kpop test', 5, null)], clusters).families[0]!;
    expect(t.impliedTotal).toBeNull();
    expect(t.share).toBeNull();
    expect(t.gap).toBeNull();
  });

  it('puts every row of the real export in a family or in "other", and totals them all', () => {
    const rows = parseAiQueriesCsv(AI_QUERIES_CSV).rows;
    const r = computeFamilies(rows, clusters);
    const sum = r.families.reduce((s, f) => s + f.citations, 0) + r.other.citations;
    expect(sum).toBe(r.total.citations);
    expect(r.total.citations).toBe(rows.reduce((s, x) => s + x.citations, 0));
    const ids = Object.fromEntries(r.families.map((f) => [f.id, f.topQueries]));
    expect(ids['bts trivia']).toEqual(['bts trivia', 'bts trivia games']);
    expect(ids['kpop generations']).toEqual(['kpop generations', 'kpop generations timeline', 'generations of kpop']);
    expect(ids['bts quiz']).toEqual(['bts test']);
    expect(ids['bts army test']).toEqual(['bts army test']);
    expect(ids['{group} quiz']).toEqual(['stray kids test']);
    expect(ids['{group} games']).toEqual(['stray kids games online']);
    expect(ids['name them all']).toEqual(['sporcle kpop']);
    // "bts qui" (cut by Bing) and the Portuguese "teste illit" match no cluster.
    expect(r.other.topQueries).toEqual(['bts qui', 'teste illit']);
    // Families sorted by citations, the biggest first.
    expect(r.families.map((f) => f.citations)).toEqual([...r.families.map((f) => f.citations)].sort((a, b) => b - a));
  });

  it('compares two months in share points', () => {
    const prev = computeFamilies([row('kpop games', 453, 0.0513)], clusters);
    const cur = computeFamilies([row('kpop games', 600, 0.08)], clusters);
    const d = compareFamilies(cur, prev).get('kpop games')!;
    expect(d.sharePoints).toBe(2.9);
    expect(d.citationsDelta).toBe(147);
    expect(compareFamilies(cur, null).size).toBe(0);
  });
});
