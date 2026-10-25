import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { generationClaims, generationNumber, lintTriviaFile, memberCountClaims } from './lint';
import { SOURCED_TRIVIA_MIN, allSourcedTriviaFiles, getSourcedTrivia, parseSourcedTriviaFile, verifiedFacts } from './store';
import { TRIVIA_LEVELS } from './types';

import type { LintCode } from './lint';
import type { SourcedFact, SourcedTriviaFile } from './types';

// SEO Mission 2, part E (owner, 2026-10-15): the fact-lint. `npm run check:fact-lint` runs this
// file; a nightly job can run it too. Every sourced trivia file must lint clean: no duplicate,
// no fragment without a subject, member counts and generations that agree with the groups data,
// and a source on every item (two for a load-bearing fact).

const DIR = fileURLToPath(new URL('./', import.meta.url));
const JSON_FILES = readdirSync(DIR).filter((f) => f.endsWith('.json')).sort();

describe('the sourced trivia files on disk', () => {
  it('are all read by the store, none silently skipped', () => {
    expect(JSON_FILES.length).toBeGreaterThan(0);
    const groups = allSourcedTriviaFiles().map((f) => `${f.group}.json`).sort();
    expect(groups).toEqual(JSON_FILES);
  });

  for (const name of JSON_FILES) {
    describe(name, () => {
      const raw = JSON.parse(readFileSync(`${DIR}${name}`, 'utf8')) as Record<string, unknown> & { facts: unknown[] };
      const file = parseSourcedTriviaFile(raw);

      it('parses, with every item kept (none dropped as malformed)', () => {
        expect(file).not.toBeNull();
        expect(file!.facts.length).toBe(raw.facts.length);
        expect(`${file!.group}.json`).toBe(name);
      });

      it('lints clean', () => {
        const issues = lintTriviaFile(file!);
        expect(issues.map((i) => `${i.code} ${i.id}: ${i.message}`)).toEqual([]);
      });

      it('has a wikidata id and groups data written by the references script', () => {
        expect(file!.wikidata).toMatch(/^Q\d+$/);
        expect(file!.groupsData.readAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });
    });
  }
});

describe('the store', () => {
  it('builds a sourced page only from verified items, at or above the floor', () => {
    for (const file of allSourcedTriviaFiles()) {
      const verified = verifiedFacts(file);
      expect(verified.every((f) => f.status === 'verified' && f.sources.length > 0 && f.verifiedBy && f.verifiedAt)).toBe(true);
      expect(getSourcedTrivia(file.group) !== null).toBe(verified.length >= SOURCED_TRIVIA_MIN);
    }
  });

  it('serves /bts-trivia from the sourced file, with every bank filled', () => {
    const bts = getSourcedTrivia('bts');
    expect(bts).not.toBeNull();
    for (const level of TRIVIA_LEVELS) {
      expect(verifiedFacts(bts!).filter((f) => f.level === level).length, level).toBeGreaterThanOrEqual(3);
    }
  });

  it('never renders a candidate or rejected item', () => {
    const base = getSourcedTrivia('bts')!;
    const withDraft: SourcedTriviaFile = { ...base, facts: [...base.facts, { ...base.facts[0]!, id: 'bts-draft', question: 'Is this a BTS draft?', status: 'candidate' }] };
    expect(verifiedFacts(withDraft).some((f) => f.id === 'bts-draft')).toBe(false);
  });

  it('drops a malformed item and never throws on a malformed file', () => {
    expect(parseSourcedTriviaFile(null)).toBeNull();
    expect(parseSourcedTriviaFile({ version: 2 })).toBeNull();
    const base = JSON.parse(readFileSync(`${DIR}bts.json`, 'utf8')) as { facts: unknown[] };
    const broken = { ...base, facts: [...base.facts, { id: 'x', level: 'impossible' }] };
    expect(parseSourcedTriviaFile(broken)!.facts.length).toBe(base.facts.length);
  });
});

// ---- the rules, each caught on a fixture ------------------------------------------------------

const SRC_WP = { url: 'https://en.wikipedia.org/wiki/Example', type: 'wikipedia' as const, publisher: 'Wikipedia', title: 'Example' };
const SRC_OFF = { url: 'https://ibighit.com/bts', type: 'official' as const, publisher: 'BIGHIT MUSIC', title: 'BTS' };

function fact(over: Partial<SourcedFact> = {}): SourcedFact {
  return {
    id: 'ex-1', level: 'easy', question: 'Who is the leader of Example?', answer: 'Ana',
    text: 'Ana is the leader of Example, a K-pop group.', sources: [SRC_WP], loadBearing: false,
    status: 'verified', verifiedBy: 'Claude (sources opened 2026-10-15)', verifiedAt: '2026-10-15', ...over,
  };
}

function fixture(facts: SourcedFact[], over: Partial<SourcedTriviaFile> = {}): SourcedTriviaFile {
  return {
    version: 1, group: 'example', reviewed: '2026-10-15', wikipedia: 'https://en.wikipedia.org/wiki/Example',
    officialSite: null, wikidata: 'Q1', members: ['Ana', 'Bo', 'Cy', 'Di'],
    groupsData: { name: 'Example', generation: '4th Gen', memberCount: 4, readAt: '2026-10-15' }, facts, ...over,
  };
}

const codes = (file: SourcedTriviaFile): LintCode[] => lintTriviaFile(file).map((i) => i.code);

describe('fact-lint rules', () => {
  it('passes a clean item', () => {
    expect(codes(fixture([fact()]))).toEqual([]);
  });

  it('catches a duplicate question, text or id', () => {
    expect(codes(fixture([fact(), fact({ id: 'ex-2', text: 'Ana leads Example, a K-pop group from Seoul.' })]))).toContain('duplicate-question');
    expect(codes(fixture([fact(), fact({ id: 'ex-2', question: 'Which Example member leads the group?' })]))).toContain('duplicate-text');
    expect(codes(fixture([fact(), fact({ question: 'Which Example member leads?', text: 'Ana leads Example on stage and off.' })]))).toContain('duplicate-id');
  });

  it('catches a fragment without a subject', () => {
    expect(codes(fixture([fact({ text: 'He majored in modern dance at a school in Busan.' })]))).toContain('subjectless');
    expect(codes(fixture([fact({ text: 'Majored in modern dance at a school.' })]))).toContain('subjectless');
    expect(codes(fixture([fact({ question: 'Who leads the group on stage?' })]))).toContain('subjectless');
    expect(codes(fixture([fact({ text: 'Ana leads Example.' })]))).toContain('subjectless');
  });

  it('catches a member count that disagrees with the groups data', () => {
    expect(codes(fixture([fact({ text: 'Example has five members and Ana is its leader.' })]))).toContain('member-count');
    expect(codes(fixture([fact({ text: 'Ana leads Example, a five-member group.' })]))).toContain('member-count');
    expect(codes(fixture([fact({ text: 'Ana leads Example, a quintet from Seoul.' })]))).toContain('member-count');
    expect(codes(fixture([fact({ text: 'Example has four members and Ana is its leader.' })]))).toEqual([]);
    expect(codes(fixture([fact()], { members: ['Ana', 'Bo', 'Cy'] }))).toContain('member-count');
  });

  it('lets only a load-bearing item state a member count the groups data does not have', () => {
    const noCount = { groupsData: { name: 'Example', generation: '4th Gen', memberCount: null, readAt: '2026-10-15' } };
    const claim = 'Example has four members: Ana, Bo, Cy and Di.';
    expect(codes(fixture([fact({ text: claim })], noCount))).toContain('member-count');
    expect(codes(fixture([fact({ text: claim, loadBearing: true, sources: [SRC_WP, SRC_OFF] })], noCount))).toEqual([]);
    expect(codes(fixture([fact({ text: 'Example has five members, led by Ana.', loadBearing: true, sources: [SRC_WP, SRC_OFF] })], noCount))).toContain('member-count');
  });

  it('accepts a text that opens with a lowercase group name', () => {
    const lower = { groupsData: { name: 'exa', generation: null, memberCount: 4, readAt: '2026-10-15' } };
    expect(codes(fixture([fact({ question: 'Who leads exa?', text: 'exa is led by Ana, its leader since debut.' })], lower))).toEqual([]);
  });

  it('catches a generation that disagrees with the groups data', () => {
    expect(codes(fixture([fact({ text: 'Ana leads Example, a 3rd generation group.' })]))).toContain('generation');
    expect(codes(fixture([fact({ text: 'Ana leads Example, a fourth generation group.' })]))).toEqual([]);
    const noGen = fixture([fact({ text: 'Ana leads Example, a 4th gen group.' })], { groupsData: { name: 'Example', generation: null, memberCount: 4, readAt: '2026-10-15' } });
    expect(codes(noGen)).toContain('generation');
  });

  it('catches a missing, foreign or banned source', () => {
    expect(codes(fixture([fact({ sources: [] })]))).toContain('source-missing');
    expect(codes(fixture([fact({ sources: [{ ...SRC_WP, url: 'http://en.wikipedia.org/wiki/Example' }] })]))).toContain('source-missing');
    expect(codes(fixture([fact({ sources: [{ ...SRC_WP, url: 'https://www.example-blog.com/ana' }] })]))).toContain('source-host');
    expect(codes(fixture([fact({ sources: [{ ...SRC_WP, url: 'https://kprofiles.com/example-members-profile/' }] })]))).toContain('source-banned');
    expect(codes(fixture([fact({ sources: [{ ...SRC_WP, url: 'https://kpop.fandom.com/wiki/Example' }] })]))).toContain('source-banned');
    expect(codes(fixture([fact({ sources: [{ url: 'https://www.wikidata.org/wiki/Q2', type: 'wikidata', publisher: 'Wikidata', title: 'Example' }] })]))).toContain('source-host');
  });

  it('asks two sources on two hosts, one official or Wikidata, for a load-bearing fact', () => {
    expect(codes(fixture([fact({ loadBearing: true })]))).toContain('load-bearing');
    expect(codes(fixture([fact({ loadBearing: true, sources: [SRC_WP, { ...SRC_WP, url: 'https://en.wikipedia.org/wiki/Ana' }] })]))).toContain('load-bearing');
    expect(codes(fixture([fact({ loadBearing: true, sources: [SRC_WP, SRC_OFF] })]))).toEqual([]);
  });

  it('asks who verified an item and when', () => {
    expect(codes(fixture([fact({ verifiedBy: null })]))).toContain('verification');
    expect(codes(fixture([fact({ verifiedAt: '15/10/2026' })]))).toContain('verification');
    expect(codes(fixture([fact({ verifiedBy: null, status: 'candidate' })]))).toEqual([]);
  });

  it('catches an em or en dash anywhere', () => {
    expect(codes(fixture([fact({ answer: 'Ana \u2014 the leader' })]))).toContain('dash');
    expect(codes(fixture([fact({ text: 'Ana leads Example from 2020 \u2013 today.' })]))).toContain('dash');
  });

  it('reads counts and generations the way the copy writes them', () => {
    expect(memberCountClaims('BTS has seven members. A seven-member act, a septet.')).toEqual([7, 7, 7]);
    expect(memberCountClaims('offers from seven companies, the second member of BTS')).toEqual([]);
    expect(memberCountClaims('nominated for Best Pop Duo/Group Performance')).toEqual([]);
    expect(memberCountClaims('the South Korean septet')).toEqual([7]);
    expect(generationClaims('a 3rd generation group, a third-gen act')).toEqual([3, 3]);
    expect(generationNumber('3rd Gen')).toBe(3);
    expect(generationNumber(null)).toBeNull();
  });
});
