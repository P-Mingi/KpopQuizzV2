import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { countWords } from '@/lib/seo/answer-first';
import { musicGroupEntity, officialSite, wikidataGroup } from '@/lib/seo/wikidata';

import { BTS_FACTS } from './facts/bts';
import { flagshipSlug, generationLabel, hubPlus, hubPlusAnswer, renderableRows, resolveSource } from './hub-plus';

import type { HubFacts } from './facts/types';

// SEO Mission 2 part B: the strengthened /bts-quiz. The facts render only verified and sourced
// (two sources for a load-bearing fact, one official or Wikidata, never a fan database), they
// agree with the Wikidata record the script fetched, and no QID is typed in code.

const BANNED = /kprofiles|fandom\.com|namu\.wiki|allkpop|soompi/i;
const DASHES = /[\u2013\u2014]/;

describe('BTS facts', () => {
  const bts = hubPlus('bts')!;

  it('every load-bearing row renders, with two sources and one official or Wikidata', () => {
    const rows = renderableRows(bts.facts);
    expect(rows.map((r) => r.key)).toEqual(['members', 'debut', 'label', 'fandom']);
    for (const r of rows) {
      expect(r.sources.length, r.key).toBeGreaterThanOrEqual(2);
      expect(r.sources.some((s) => s.kind === 'official' || s.kind === 'wikidata'), r.key).toBe(true);
    }
  });

  it('no source is a fan database, every link is https, no dash in any text', () => {
    const urls = [
      ...renderableRows(bts.facts).flatMap((r) => r.sources.map((s) => s.url)),
      ...bts.facts.members.map((m) => resolveSource('bts', m.source)!.url),
      ...bts.facts.generation.sources.map((s) => resolveSource('bts', s)!.url),
    ];
    for (const u of urls) {
      expect(u).toMatch(/^https:\/\//);
      expect(u).not.toMatch(BANNED);
    }
    const texts = [bts.facts.summary, bts.h1, bts.subtitle, bts.startLabel, bts.scope, ...bts.facts.rows.flatMap((r) => [r.label, r.value]), ...bts.facts.members.flatMap((m) => [m.stageName, m.role])];
    for (const t of texts) expect(t).not.toMatch(DASHES);
  });

  it('agrees with the fetched Wikidata record: 7 members, the debut date, Big Hit Music', () => {
    const wd = wikidataGroup('bts')!;
    expect(wd).not.toBeNull();
    expect(BTS_FACTS.members).toHaveLength(wd.members.length);
    expect(BTS_FACTS.rows.find((r) => r.key === 'members')!.value.startsWith(`${wd.members.length}:`)).toBe(true);
    expect(wd.inception).toBe('2013-06-13');
    expect(BTS_FACTS.rows.find((r) => r.key === 'debut')!.value).toMatch(/^13 June 2013\b/);
    expect(wd.recordLabels.some((l) => (l.label ?? '').replace(/\s+/g, '').toLowerCase() === 'bighitmusic')).toBe(true);
    expect(BTS_FACTS.rows.find((r) => r.key === 'label')!.value.replace(/\s+/g, '').toLowerCase()).toContain('bighitmusic');
  });

  it('public roles only: no real names, no birth dates', () => {
    for (const m of BTS_FACTS.members) {
      expect(m.role).not.toMatch(/\d{4}|born|Kim |Park |Jeon |Jung Ho|Min Yoon/);
    }
  });
});

describe('renderableRows', () => {
  const base: HubFacts = { ...BTS_FACTS, rows: [] };
  it('drops a draft row, a row with one source, and a row without an official or Wikidata source', () => {
    const facts: HubFacts = {
      ...base,
      rows: [
        { key: 'members', label: 'Members', value: 'x', status: 'draft', loadBearing: true, sources: BTS_FACTS.rows[0]!.sources },
        { key: 'debut', label: 'Debut', value: 'x', status: 'verified', loadBearing: true, sources: [{ kind: 'wikipedia', label: 'W', url: 'https://en.wikipedia.org/wiki/BTS' }] },
        { key: 'label', label: 'Label', value: 'x', status: 'verified', loadBearing: true, sources: [{ kind: 'wikipedia', label: 'W', url: 'https://en.wikipedia.org/wiki/BTS' }, { kind: 'outlet', label: 'O', url: 'https://example.org' }] },
      ],
    };
    expect(renderableRows(facts)).toEqual([]);
  });
  it('drops a row whose Wikidata source cannot be resolved (a group with no fetched item)', () => {
    const facts: HubFacts = { ...base, slug: 'no-such-group', rows: [BTS_FACTS.rows[0]!] };
    expect(renderableRows(facts)).toEqual([]);
  });
});

describe('Wikidata entity', () => {
  it('sameAs: the fetched item, the Wikipedia article and the official site', () => {
    const e = musicGroupEntity('bts', 'BTS')!;
    const wd = wikidataGroup('bts')!;
    expect(e['@type']).toBe('MusicGroup');
    expect(officialSite(wd)).toMatch(/^https:\/\//);
    expect(e.sameAs).toEqual([wd.wikidata, wd.wikipedia, officialSite(wd)]);
    expect(wd.wikidata).toBe(`https://www.wikidata.org/wiki/${wd.qid}`);
  });
  it('a group that is not in the fetched file gets no entity', () => {
    expect(musicGroupEntity('no-such-group', 'X')).toBeNull();
  });
  it('no QID is typed in the code that renders the hub', () => {
    for (const rel of ['./facts/bts.ts', './hub-plus.ts', '../seo/wikidata.ts', '../../components/group/ux-v1/hub-plus.tsx', '../../components/group/ux-v1/hub.tsx']) {
      const src = readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');
      expect(src, rel).not.toMatch(/\bQ\d{4,}\b/);
    }
  });
});

describe('the answer block', () => {
  const bts = hubPlus('bts')!;
  it('is 40 to 60 words with every number present, and names the primary phrase', () => {
    const a = hubPlusAnswer({ name: 'BTS', scope: bts.scope, published: 29, pooledAvg: 64, attempts: 9712, songs: 120, asOfMonth: 'October 2026' });
    expect(countWords(a)).toBeGreaterThanOrEqual(40);
    expect(countWords(a)).toBeLessThanOrEqual(60);
    expect(a).toContain('BTS quiz');
    expect(a).toContain('29 free BTS quizzes');
    expect(a).toContain('9,712 scored attempts, fans average 64% (as of October 2026)');
    expect(a).not.toMatch(DASHES);
  });
  it('leaves out a number under its floor instead of estimating it', () => {
    const a = hubPlusAnswer({ name: 'BTS', scope: bts.scope, published: 1, pooledAvg: null, attempts: 12, songs: 0, asOfMonth: 'October 2026' });
    expect(a).toContain('1 free BTS quiz made');
    expect(a).not.toMatch(/average|attempts|songs/);
  });
});

describe('flagship and generation', () => {
  const bts = hubPlus('bts')!;
  it('the Team test leads once it is published, else the most played quiz', () => {
    expect(flagshipSlug(bts, new Set(['a', 'bts-army-level-test']), 'a')).toBe('bts-army-level-test');
    expect(flagshipSlug(bts, new Set(['a']), 'a')).toBe('a');
    expect(flagshipSlug(bts, new Set(), null)).toBeNull();
  });
  it('reads groups.generation as the page writes it', () => {
    expect(generationLabel('3rd Gen')).toBe('3rd generation');
    expect(generationLabel('4th generation')).toBe('4th generation');
    expect(generationLabel(null)).toBeNull();
    expect(generationLabel('newest')).toBeNull();
  });
  it('only listed hubs are strengthened', () => {
    expect(hubPlus('aespa')).toBeNull();
    expect(hubPlus('bts')!.h1).toBe('BTS quiz');
  });
});
