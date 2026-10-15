import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { generationSentence, buildAnswerChunks, buildAnswerFirst } from '@/lib/seo/answer-first';
import { mergeHubFaqs } from '@/lib/ux-v1/p3/faq';

import {
  confidenceLabel,
  eraYears,
  erasSummary,
  generationAnswer,
  generationAnswerText,
  generationCell,
  generationData,
  generationLead,
  generationShort,
  groupGeneration,
  ordinal,
  sourcesSentence,
} from './generations';
import { joinGenerationRows, rowHubHref } from './rows';
import { buildGenerationsTimelineSvg, escXml } from './timeline-svg';

import type { Group } from '@/lib/db/types';

// SEO Mission 2, part C (owner, 2026-10-15): one versioned file, one reader, the same words
// on the generations hub, its timeline image and the group hubs (rulebook 5.6).

const DASHES = /[\u2013\u2014]/;
const data = generationData();

describe('the generation file', () => {
  it('has every field each page needs, and no em or en dash', () => {
    const raw = readFileSync(fileURLToPath(new URL('./group-generations.json', import.meta.url)), 'utf8');
    expect(DASHES.test(raw)).toBe(false);
    expect(data.reviewed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(data.groups.length).toBeGreaterThan(0);
    for (const g of data.groups) {
      expect(g.wikidata, g.slug).toMatch(/^Q\d+$/);
      expect(g.wikipedia, g.slug).toMatch(/^https:\/\/en\.wikipedia\.org\/wiki\//);
      expect(g.debutYear, g.slug).toBeGreaterThanOrEqual(1990);
      expect(g.name.trim(), g.slug).not.toBe('');
      expect(g.slug, g.slug).not.toBe('general-kpop');
      if (!g.label) expect(g.unlabelled, g.slug).not.toBeNull();
    }
  });

  it('never gives a Wikidata id to two acts', () => {
    const ids = data.groups.map((g) => g.wikidata);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('labels a debut from 2023 on as the newest wave, never as a settled generation', () => {
    for (const g of data.groups) {
      if (!g.label) continue;
      if (g.debutYear >= 2023) expect(g.label.confidence, g.slug).toBe('newest');
      if (g.label.confidence === 'newest') {
        expect(g.debutYear, g.slug).toBeGreaterThanOrEqual(2023);
        // A number only when a named source uses it: the 5th, never another.
        if (g.label.generation != null) expect(g.label.generation, g.slug).toBe(5);
      }
    }
  });

  it('keeps every consensus label inside its era, where every dating agrees', () => {
    for (const g of data.groups) {
      if (g.label?.confidence !== 'consensus') continue;
      const era = data.eras.find((e) => e.generation === g.label!.generation);
      expect(era, g.slug).toBeDefined();
      const from = era!.startAlt ?? era!.start;
      expect(g.debutYear, g.slug).toBeGreaterThanOrEqual(from);
      if (era!.end != null) expect(g.debutYear, g.slug).toBeLessThanOrEqual(era!.end);
      // 2018 and 2019 sit on the debated 3rd/4th line: never consensus.
      expect([2018, 2019].includes(g.debutYear), g.slug).toBe(false);
    }
  });

  it('names a source for every label, and both views for a contested one', () => {
    for (const g of data.groups) {
      if (!g.label) continue;
      expect(g.label.sources.length, g.slug).toBeGreaterThan(0);
      for (const s of g.label.sources) expect(s.url, g.slug).toMatch(/^https:\/\//);
      if (g.label.confidence === 'contested') {
        expect(g.label.generation, g.slug).toBeNull();
        expect(g.label.range, g.slug).not.toBeNull();
        expect(g.label.sources.length, g.slug).toBeGreaterThanOrEqual(2);
      } else if (g.label.confidence !== 'newest') {
        expect(g.label.generation, g.slug).not.toBeNull();
      }
    }
  });

  it('has five eras in order, the 5th marked as not official', () => {
    expect(data.eras.map((e) => e.generation)).toEqual([1, 2, 3, 4, 5]);
    expect(data.eras.find((e) => e.generation === 5)!.official).toBe(false);
    for (const e of data.eras) expect(e.sources.length).toBeGreaterThan(0);
  });
});

describe('the one reader', () => {
  it('returns a record by slug, or null for a group the file does not cover', () => {
    expect(groupGeneration('bts')?.label?.generation).toBe(3);
    expect(groupGeneration('no-such-group')).toBeNull();
  });
});

describe('the words', () => {
  it('ordinals', () => {
    expect([1, 2, 3, 4, 5, 11, 12, 13, 21].map(ordinal)).toEqual(['1st', '2nd', '3rd', '4th', '5th', '11th', '12th', '13th', '21st']);
  });

  it('a consensus group gets the number', () => {
    const l = groupGeneration('bts')!.label!;
    expect(generationAnswer('BTS', l)).toBe('BTS is a 3rd generation K-pop group.');
    expect(generationLead('BTS', l)).toBe('BTS belongs to the 3rd generation of K-pop.');
    expect(generationShort(l)).toBe('3rd gen');
    expect(generationAnswerText('BTS', l)).toBe('BTS is a 3rd generation K-pop group. Source: Korea Times, 2025.');
  });

  it('Stray Kids is attributed, with the debate said', () => {
    const l = groupGeneration('stray-kids')!.label!;
    expect(l.confidence).toBe('attributed');
    const a = generationAnswer('Stray Kids', l);
    expect(a).toContain('commonly described as a 4th generation K-pop group');
    expect(a).toContain('debated');
  });

  it('a contested group shows both views and no number of its own', () => {
    const l = groupGeneration('itzy')!.label!;
    expect(generationAnswer('ITZY', l)).toMatch(/^Whether ITZY is a 3rd or 4th generation K-pop group is debated:/);
    expect(generationShort(l)).toBe('3rd or 4th gen');
    expect(generationCell(groupGeneration('itzy')!)).toBe('3rd or 4th');
  });

  it('the newest wave: a number only with a source, always not official', () => {
    const illit = groupGeneration('illit')!.label!;
    expect(generationAnswer('ILLIT', illit)).toContain('often labelled 5th generation, a label that is not official');
    expect(generationShort(illit)).toBe('Newest wave');
    const cortis = groupGeneration('cortis')!.label!;
    expect(cortis.generation).toBeNull();
    expect(generationAnswer('Cortis', cortis)).not.toMatch(/Cortis is .*5th/);
    expect(generationCell(groupGeneration('cortis')!)).toBe('Newest wave');
  });

  it('sources and labels', () => {
    expect(sourcesSentence([])).toBe('');
    expect(sourcesSentence(groupGeneration('itzy')!.label!.sources)).toMatch(/^Sources: .+; .+\.$/);
    expect(confidenceLabel('contested')).toBe('Contested');
  });

  it('era years in words, the same on every page', () => {
    expect(eraYears(data.eras[0]!)).toBe('1996 to 2002');
    expect(eraYears(data.eras[3]!)).toBe('around 2018 or 2020 to 2022');
    expect(eraYears(data.eras[4]!)).toBe('2023 on');
    expect(erasSummary()).toBe('1st gen 1996 to 2002, 2nd gen 2003 to 2011, 3rd gen 2012 to 2017 and 4th gen around 2018 or 2020 to 2022');
  });

  it('no em or en dash in any sentence', () => {
    for (const g of data.groups) {
      if (!g.label) continue;
      expect(DASHES.test(generationAnswerText(g.name, g.label)), g.slug).toBe(false);
      expect(DASHES.test(generationLead(g.name, g.label)), g.slug).toBe(false);
    }
  });
});

describe('the group hubs read the same field', () => {
  const group = (over: Partial<Group> & { slug: string; name: string }): Group =>
    ({ quiz_count: 3, fandom_name: 'fan', generation: null, ...over }) as unknown as Group;

  it('the file wins over groups.generation', () => {
    // groups.generation says "5th Gen" for ILLIT; the file says newest wave.
    const g = group({ slug: 'illit', name: 'ILLIT', generation: '5th Gen' });
    const chunk = buildAnswerChunks(g, { memberCount: null, songCount: 0 }).find((c) => c.question === 'What generation is ILLIT?');
    expect(chunk?.answer).toContain('newest wave');
    expect(chunk?.answer).not.toContain('5th Gen');
    expect(buildAnswerFirst(g, { memberCount: null, songCount: 0 })).toContain('ILLIT belongs to the newest wave of K-pop.');
  });

  it('a group the file does not cover keeps its current sentences', () => {
    expect(generationSentence({ slug: 'no-such-group', name: 'X', generation: '3rd Gen' }, 'answer')).toBe('X is a 3rd Gen K-pop group.');
    expect(generationSentence({ slug: 'no-such-group', name: 'X', generation: '3rd Gen' }, 'lead')).toBe('X belongs to the 3rd Gen of K-pop.');
    expect(generationSentence({ slug: 'no-such-group', name: 'X', generation: null }, 'answer')).toBeNull();
  });

  it('a solo artist in the file gets no generation sentence', () => {
    expect(groupGeneration('iu')?.unlabelled).toBe('solo');
    expect(generationSentence({ slug: 'iu', name: 'IU', generation: '2nd Gen' }, 'answer')).toBeNull();
  });

  it('the hub FAQ shows the linked answer when a chunk carries one', () => {
    const items = mergeHubFaqs([], [{ question: 'What generation is BTS?', answer: 'plain', a: 'linked' }]);
    expect(items[0]).toMatchObject({ q: 'What generation is BTS?', a: 'linked', inJsonLd: false });
    expect(mergeHubFaqs([], [{ question: 'Q?', answer: 'plain' }])[0]!.a).toBe('plain');
  });
});

describe('the table rows', () => {
  it('joins the directory to the file, oldest debut first, uncovered groups last', () => {
    const rows = joinGenerationRows([
      { slug: 'no-such-group', name: 'Zed', quizzes: 2 },
      { slug: 'illit', name: 'ILLIT', quizzes: 8 },
      { slug: 'bts', name: 'BTS', quizzes: 0 },
    ]);
    expect(rows.map((r) => r.slug)).toEqual(['bts', 'illit', 'no-such-group']);
    expect(rows[2]!.gen).toBeNull();
    expect(rowHubHref(rows[0]!)).toBeNull();
    expect(rowHubHref(rows[1]!)).toBe('/illit-quiz');
    expect(rowHubHref({ slug: 'bts', name: 'BTS', quizzes: null, gen: null })).toBe('/bts-quiz');
  });
});

describe('the timeline image', () => {
  const svg = buildGenerationsTimelineSvg(data);

  it('carries the credit and the licence inside the drawing', () => {
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
    expect(svg.trimEnd().endsWith('</svg>')).toBe(true);
    expect(svg).toContain('>kpopquiz.org</text>');
    expect(svg).toContain('CC BY 4.0');
  });

  it('draws every era from the data, the 5th as not official', () => {
    for (const e of data.eras) expect(svg).toContain(`>${ordinal(e.generation)} gen</text>`);
    expect(svg).toContain('2023 on (not official)');
    expect(svg).toContain('2018 or 2020 to 2022');
  });

  it('escapes text and has no em or en dash', () => {
    expect(escXml(`Girls' Generation & <b>`)).toBe('Girls&apos; Generation &amp; &lt;b&gt;');
    expect(DASHES.test(svg)).toBe(false);
    expect(/&(?!amp;|lt;|gt;|quot;|apos;)/.test(svg)).toBe(false);
  });
});
