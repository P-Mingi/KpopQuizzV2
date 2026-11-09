// O1 audit 03 P0-4: one test per decision rule of section 5, on made-up URLs, then the CSV readers, the templates,
// the merge proposals and the script (nothing written outside its output folder).
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  decide, mergeTargets, normalizeUrl, parseCsv, parsePerformanceExport, parseReasonExport, reasonFromFileName, templateOf,
  triageCsv, triageMarkdown, TRIAGE_COLUMNS, type PageFacts, type TriageRow,
} from './gsc-triage';

const U = (path: string): string => `https://kpopquiz.org${path}`;

/** A healthy, indexable, self-canonical page: the baseline every rule test bends. */
function page(path: string, over: Partial<PageFacts> = {}): PageFacts {
  return {
    url: U(path), reason: 'crawled-currently-not-indexed', template: templateOf(U(path)), status: 200, xRobotsTag: '', metaRobots: '',
    canonical: U(path), inSitemap: false, words: 800, questions: 10, plays: 50, clicks: 0, impressions: 5, inbound: 5, guarded: false, ...over,
  };
}

describe('rule 1: in the sitemap but not 200, indexable, self-canonical -> FIX-SITEMAP', () => {
  it('a sitemap URL that redirects', () => expect(decide(page('/q/a', { inSitemap: true, status: 301 })).action).toBe('FIX-SITEMAP'));
  it('a sitemap URL that is noindex', () => expect(decide(page('/q/a', { inSitemap: true, metaRobots: 'noindex, follow' })).action).toBe('FIX-SITEMAP'));
  it('a sitemap URL canonical to another page', () => expect(decide(page('/q/a', { inSitemap: true, canonical: U('/q/b') })).action).toBe('FIX-SITEMAP'));
  it('a healthy sitemap URL is not caught by it', () => expect(decide(page('/q/a', { inSitemap: true })).action).not.toBe('FIX-SITEMAP'));
});

describe('rule 2: chain, loop, generic dump or non-200 target -> FIX-REDIRECT', () => {
  const hop = (url: string, status: number, location: string | null) => ({ url, status, location });
  it('a chain', () => expect(decide(page('/old', { status: 301, hops: [hop(U('/old'), 301, U('/mid')), hop(U('/mid'), 301, U('/new')), hop(U('/new'), 200, null)] })).action).toBe('FIX-REDIRECT'));
  it('a loop', () => expect(decide(page('/a', { status: 301, hops: [hop(U('/a'), 301, U('/b')), hop(U('/b'), 301, U('/a')), hop(U('/a'), 301, U('/b'))] })).action).toBe('FIX-REDIRECT'));
  it('a dump on the home page', () => expect(decide(page('/q/gone', { status: 301, hops: [hop(U('/q/gone'), 301, U('/')), hop(U('/'), 200, null)] })).action).toBe('FIX-REDIRECT'));
  it('a target that answers 404', () => expect(decide(page('/old', { status: 301, hops: [hop(U('/old'), 301, U('/new')), hop(U('/new'), 404, null)] })).action).toBe('FIX-REDIRECT'));
});

describe('rule 3: 404 or 410 with clicks or guarded -> RESTORE', () => {
  it('with clicks', () => { const d = decide(page('/q/a', { status: 404, clicks: 3 })); expect(d.action).toBe('RESTORE'); expect(d.ownerOk).toBe('required'); });
  it('guarded', () => expect(decide(page('/q/a', { status: 410, guarded: true })).action).toBe('RESTORE'));
});

describe('rule 4: expected states -> EXPECTED', () => {
  it('an allowlisted noindex (search)', () => expect(decide(page('/search', { metaRobots: 'noindex' })).action).toBe('EXPECTED'));
  it('a documented noindex (the news list)', () => expect(decide(page('/news', { metaRobots: 'noindex, follow' })).action).toBe('EXPECTED'));
  it('a one-hop redirect to a 200', () => expect(decide(page('/blind-test', { status: 301, hops: [{ url: U('/blind-test'), status: 301, location: U('/blindtest') }, { url: U('/blindtest'), status: 200, location: null }] })).action).toBe('EXPECTED'));
  it('a canonical to a 200 indexable URL', () => expect(decide(page('/blindtest/classic-2', { canonical: U('/blindtest/classic'), canonicalTargetOk: true })).action).toBe('EXPECTED'));
  it('a removed page without clicks', () => expect(decide(page('/q/a', { status: 404 })).action).toBe('EXPECTED'));
});

describe('rule 5: any other noindex -> DOCUMENT or REMOVE-NOINDEX', () => {
  it('a quiz page that is noindex is a defect', () => expect(decide(page('/q/a', { metaRobots: 'noindex' })).action).toBe('REMOVE-NOINDEX'));
  it('a page type indexed by no rule is documented', () => expect(decide(page('/fixtureband-name-all-members', { metaRobots: 'noindex' })).action).toBe('DOCUMENT'));
});

describe('rule 6: a duplicate cluster over 60% -> MERGE-301', () => {
  it('names the target', () => {
    const d = decide(page('/q/dup-b', { duplicate: { overlap: 0.9, target: U('/q/dup-a') } }));
    expect(d.action).toBe('MERGE-301');
    expect(d.why).toContain('/q/dup-a');
    expect(d.ownerOk).toBe('no');
  });
  it('needs the owner when the loser has clicks', () => expect(decide(page('/q/dup-b', { clicks: 4, duplicate: { overlap: 0.9, target: U('/q/dup-a') } })).ownerOk).toBe('required'));
  it('60% exactly is not a merge', () => expect(decide(page('/q/dup-b', { duplicate: { overlap: 0.6, target: U('/q/dup-a') } })).action).not.toBe('MERGE-301'));
});

describe('rule 7: thin, 0 impressions, a template that needs demand -> NOINDEX-PROPOSE', () => {
  it('a blind test group page', () => expect(decide(page('/blindtest/group-fixture', { words: 180, impressions: 0 })).action).toBe('NOINDEX-PROPOSE'));
  it('not when it has impressions', () => expect(decide(page('/blindtest/group-fixture', { words: 180, impressions: 9 })).action).toBe('ENRICH'));
  it('not on a quiz page, whatever its size', () => expect(decide(page('/q/a', { words: 120, impressions: 0 })).action).toBe('ENRICH'));
  it('needs the owner when guarded', () => expect(decide(page('/blindtest/group-fixture', { words: 180, impressions: 0, guarded: true })).ownerOk).toBe('required'));
});

describe('rules 8 to 10', () => {
  it('8: crawled, not indexed -> ENRICH', () => { const d = decide(page('/q/a')); expect(d.action).toBe('ENRICH'); expect(d.nextAction).toBe('enrich'); });
  it('9: discovered with under 3 inbound links -> RELINK', () => { const d = decide(page('/q/a', { reason: 'discovered-currently-not-indexed', inbound: 2 })); expect(d.action).toBe('RELINK'); expect(d.nextAction).toBe('relink'); });
  it('9: discovered with enough inbound links falls through', () => expect(decide(page('/q/a', { reason: 'discovered-currently-not-indexed', inbound: 3 })).action).toBe('INVESTIGATE'));
  it('10: anything else -> INVESTIGATE', () => expect(decide(page('/q/a', { reason: 'soft-404' })).action).toBe('INVESTIGATE'));
});

describe('order: first match wins', () => {
  it('a sitemap URL that is a 404 with clicks is FIX-SITEMAP, not RESTORE', () => expect(decide(page('/q/a', { inSitemap: true, status: 404, clicks: 5 })).action).toBe('FIX-SITEMAP'));
  it('a noindex quiz that is also a duplicate is REMOVE-NOINDEX (5 before 6)', () => expect(decide(page('/q/a', { metaRobots: 'noindex', duplicate: { overlap: 1, target: U('/q/b') } })).action).toBe('REMOVE-NOINDEX'));
});

describe('inputs', () => {
  it('parseCsv reads quotes, doubled quotes, CRLF and a BOM', () => {
    expect(parseCsv('﻿a,"b,1","say ""hi"""\r\nc,d,e\r\n')).toEqual([['a', 'b,1', 'say "hi"'], ['c', 'd', 'e']]);
  });
  it('normalizeUrl: https, apex, no hash, no trailing slash, query kept; other hosts are null', () => {
    expect(normalizeUrl('http://www.kpopquiz.org/q/a/#x')).toBe('https://kpopquiz.org/q/a');
    expect(normalizeUrl('https://kpopquiz.org/quizzes?page=2#t')).toBe('https://kpopquiz.org/quizzes?page=2');
    expect(normalizeUrl('https://kpopquiz.org/')).toBe('https://kpopquiz.org/');
    expect(normalizeUrl('https://example.com/q/a')).toBeNull();
  });
  it('the reason comes from the file name', () => {
    expect(reasonFromFileName('Crawled - currently not indexed-2026-11-20.csv')).toBe('crawled-currently-not-indexed');
    expect(reasonFromFileName('/x/Excluded by noindex tag-kpopquiz.org-2026-11-20.csv')).toBe('excluded-by-noindex-tag');
  });
  it('parseReasonExport and parsePerformanceExport', () => {
    expect(parseReasonExport('Not found (404)-2026-11-20.csv', 'URL,Last crawled\nhttps://kpopquiz.org/q/a/,2026-11-01\nhttps://other.org/x,2026')).toEqual([{ url: U('/q/a'), reason: 'not-found-404' }]);
    expect(parsePerformanceExport('Top pages,Clicks,Impressions,CTR,Position\nhttps://kpopquiz.org/q/a,3,"1,200",0.2%,9')).toEqual([{ url: U('/q/a'), clicks: 3, impressions: 1200 }]);
    // The French console names the columns "Pages les plus populaires" and "Clics".
    expect(parsePerformanceExport('Pages les plus populaires,Clics,Impressions,CTR,Position\nhttps://kpopquiz.org/q/a,7,40,17.5%,3')).toEqual([{ url: U('/q/a'), clicks: 7, impressions: 40 }]);
  });
});

describe('templateOf', () => {
  const sourced = new Set(['bts']);
  const cases: Array<[string, string]> = [
    ['/q/some-quiz', 'q'], ['/bts-quiz', 'hub'], ['/bts-trivia', 'trivia-sourced'], ['/twice-trivia', 'trivia-derived'],
    ['/blindtest/group-twice', 'bt-group'], ['/blindtest/classic', 'bt-mode'], ['/blindtest/ranked', 'utility'],
    ['/twice-name-all-members', 'name-all'], ['/which-twice-member-are-you', 'which-member'], ['/trending', 'list'],
    ['/quizzes/popular-today', 'list'], ['/fr/blind-test-kpop', 'landing-lang'], ['/verse/bts', 'verse'], ['/u/someone', 'profile'],
    ['/search', 'utility'], ['/quizzes?group=bts', 'facet'], ['/pt/quizzes', 'legacy'], ['/blind-test', 'legacy'], ['/api/x', 'api'],
    ['/articles/kpop-generations-explained', 'content'], ['/', 'home'],
  ];
  it.each(cases)('%s is %s', (path, want) => expect(templateOf(U(path), sourced)).toBe(want));
});

describe('mergeTargets (the clusters file of the duplicates audit)', () => {
  it('keeps the quiz with more plays and names it as the target of the other', () => {
    const m = mergeTargets([{ overlaps: [{ a: 'x-2', b: 'x', share: 1 }], quizzes: [{ slug: 'x-2', plays: 105, questions: 10, created: '2026-09-22' }, { slug: 'x', plays: 80, questions: 10, created: '2026-09-01' }] }]);
    expect([...m.entries()]).toEqual([[U('/q/x'), { overlap: 1, target: U('/q/x-2') }]]);
  });
  it('ties on plays go to the older, then to the one with more questions', () => {
    const older = mergeTargets([{ overlaps: [{ a: 'a', b: 'b', share: 0.8 }], quizzes: [{ slug: 'a', plays: 5, created: '2026-09-02' }, { slug: 'b', plays: 5, created: '2026-09-01' }] }]);
    expect(older.get(U('/q/a'))?.target).toBe(U('/q/b'));
    const longer = mergeTargets([{ overlaps: [{ a: 'a', b: 'b', share: 0.8 }], quizzes: [{ slug: 'a', plays: 5, created: '2026-09-01', questions: 12 }, { slug: 'b', plays: 5, created: '2026-09-01', questions: 10 }] }]);
    expect(longer.get(U('/q/b'))?.target).toBe(U('/q/a'));
  });
  it('a pair at 60% or less is not proposed; an empty file gives an empty map', () => {
    expect(mergeTargets([{ overlaps: [{ a: 'a', b: 'b', share: 0.6 }], quizzes: [{ slug: 'a' }, { slug: 'b' }] }]).size).toBe(0);
    expect(mergeTargets([]).size).toBe(0);
  });
});

describe('outputs', () => {
  const row = (f: PageFacts): TriageRow => ({ ...f, ...decide(f) });
  it('the CSV has the columns of section 5 and quotes what needs it', () => {
    const csv = triageCsv([row(page('/q/a', { canonical: U('/q/a?x=1,2') }))]);
    expect(csv.split('\n')[0]).toBe(TRIAGE_COLUMNS.join(','));
    expect(csv).toContain('"https://kpopquiz.org/q/a?x=1,2"');
  });
  it('triage.md counts template by action and lists the owner items', () => {
    const md = triageMarkdown([row(page('/q/a')), row(page('/q/b', { status: 404, clicks: 2 }))], '2026-11-20');
    expect(md).toContain('| q |');
    expect(md).toContain('Needs the owner (1)');
    expect(md).toContain('RESTORE https://kpopquiz.org/q/b');
  });
});

describe('the script', () => {
  it('gives every exported URL an action and writes nothing outside its output folder', () => {
    const work = mkdtempSync(join(tmpdir(), 'gsc-triage-'));
    try {
      const inDir = join(work, 'in');
      cpSync(join(__dirname, 'gsc-triage-fixtures'), inDir, { recursive: true });
      const out = join(work, 'out');
      execFileSync('npx', ['tsx', 'scripts/seo-gsc-triage.mts', '--in', inDir, '--out', out, '--no-fetch'], { cwd: join(__dirname, '../../..'), stdio: 'pipe' });
      expect(readdirSync(out).sort()).toEqual(['triage.csv', 'triage.md']);
      expect(readdirSync(inDir).sort()).toEqual(readdirSync(join(__dirname, 'gsc-triage-fixtures')).sort());
      const lines = readFileSync(join(out, 'triage.csv'), 'utf8').trim().split('\n').slice(1);
      expect(lines.length).toBe(7); // 4 + 2 + 1 distinct exported URLs
      for (const l of lines) expect(l).toMatch(/,(FIX-SITEMAP|FIX-REDIRECT|RESTORE|EXPECTED|DOCUMENT|REMOVE-NOINDEX|MERGE-301|NOINDEX-PROPOSE|ENRICH|RELINK|INVESTIGATE),/);
      expect(existsSync(join(inDir, 'triage'))).toBe(false);
    } finally { rmSync(work, { recursive: true, force: true }); }
  }, 60000);
});
