// Lane OTK-E (owner request of 2026-11-26: Otakudle in two steps): the data of step 2, one file per series in docs/anime/data/dle/step2/, checked against the contract of the request:
// every column of a series has a value for every character of its pool (the characters of its series file), kinds and ordinals valid, labels in English and French, no dash, and every source
// is en.wikipedia.org or an official site, never a Fandom wiki or a fan database. The checks are the ones of scripts/o1/launch/dle-step2.mjs (which the generator runs too) and are repeated here
// in plain form, so a weakened validator cannot pass a file.
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { LEGACY_SETS, l04Characters, setId, sourceKind, validateSeries } from '../../../../../scripts/o1/launch/dle-step2.mjs';
import { MIGRATIONS } from './pglite-harness';
import { STEP_VALUE_FR_KEYS, stepValueFr } from './step-value-fr';

const REPO = path.resolve(MIGRATIONS, '../../..');
const DATA = path.join(REPO, 'docs/anime/data/dle/step2');
const SERIES = path.join(REPO, 'docs/anime/data/series');
const L04 = l04Characters(readFileSync(path.join(MIGRATIONS, 'launch/L04-K1-series.sql'), 'utf8'));
const DASHES = [0x2013, 0x2014, 0x2026].map((c) => String.fromCharCode(c));

interface Col { key: string; kind: string; label: { en: string; fr: string }; help: { en: string; fr: string }; order?: 'arcs' | { v: number; label: { en: string; fr: string } }[]; near_distance?: number }
interface Ch { slug: string; name: string; values: Record<string, unknown>; sources: Record<string, string[]> }
interface File { series_slug: string; columns: Col[]; characters: Ch[] }
interface SeriesFile { group: { slug: string }; arcs: { ord: number; name: string }[]; characters: { slug: string }[] }

const slugs = readdirSync(SERIES).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)).filter((s) => !(s in LEGACY_SETS)).sort();
const read = (slug: string): { raw: string; data: File; series: SeriesFile } => {
  const raw = readFileSync(path.join(DATA, `${slug}.json`), 'utf8');
  return { raw, data: JSON.parse(raw) as File, series: { ...(JSON.parse(readFileSync(path.join(SERIES, `${slug}.json`), 'utf8')) as SeriesFile), characters: L04.get(slug) ?? [] } };
};
const FORBIDDEN = /fandom\.com|wikia|myanimelist|anilist|kitsu|anidb|tvtropes|fanlore|wikidata|namu\.wiki/i;

describe('the data of step 2', () => {
  it('has one file for each of the 48 series other than One Piece and Dragon Ball, and no other file', () => {
    expect(slugs).toHaveLength(48);
    expect(readdirSync(DATA).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)).sort()).toEqual(slugs);
    expect(readdirSync(DATA).filter((f) => !f.endsWith('.json'))).toEqual([]);
  });

  it.each(slugs)('%s: the contract of the request holds', (slug) => {
    const { raw, data, series } = read(slug);
    expect(validateSeries(data, series, raw)).toEqual([]);
    expect(data.series_slug).toBe(slug);
    // 2 to 4 columns of its own, gender is the engine's
    expect(data.columns.length).toBeGreaterThanOrEqual(2);
    expect(data.columns.length).toBeLessThanOrEqual(4);
    expect(data.columns.map((c) => c.key)).not.toContain('gender');
    expect(new Set(data.columns.map((c) => c.key)).size).toBe(data.columns.length);
    // every character of the data is a character of the site (L04), once; the pool is covered in full by the proof on PGlite (otakudle-two-steps.test.ts)
    const site = new Set(series.characters.map((c) => c.slug));
    expect(new Set(data.characters.map((c) => c.slug)).size).toBe(data.characters.length);
    for (const c of data.characters) expect(site.has(c.slug), `${slug}.${c.slug} is not in L04`).toBe(true);
    const arcs = new Set(series.arcs.map((a) => a.ord));
    for (const col of data.columns) {
      expect(['single', 'multi', 'ordinal', 'number'], `${slug}.${col.key} kind`).toContain(col.kind);
      for (const l of [col.label, col.help]) { expect(typeof l.en).toBe('string'); expect(l.en.length).toBeGreaterThan(1); expect(typeof l.fr).toBe('string'); expect(l.fr.length).toBeGreaterThan(1); }
      if (col.kind === 'ordinal' && col.order !== 'arcs') {
        const steps = col.order as { v: number; label: { en: string; fr: string } }[];
        expect(steps.length).toBeGreaterThanOrEqual(2);
        expect(new Set(steps.map((o) => o.v)).size).toBe(steps.length);
        for (const o of steps) { expect(Number.isInteger(o.v)).toBe(true); expect(o.label.en.length).toBeGreaterThan(0); expect(o.label.fr.length).toBeGreaterThan(0); }
      }
      for (const ch of data.characters) {
        const v = ch.values[col.key];
        const where = `${slug}.${ch.slug}.${col.key}`;
        expect(v, where).not.toBeUndefined();
        expect(v, where).not.toBeNull();
        if (col.kind === 'single') expect(typeof v === 'string' && v.trim().length > 0, where).toBe(true);
        if (col.kind === 'multi') { expect(Array.isArray(v) && v.length > 0 && v.every((x) => typeof x === 'string' && x.trim().length > 0), where).toBe(true); expect(new Set(v as string[]).size, where).toBe((v as string[]).length); }
        if (col.kind === 'number') expect(typeof v === 'number' && Number.isFinite(v), where).toBe(true);
        if (col.kind === 'ordinal') {
          const ok = col.order === 'arcs' ? arcs.has(v as number) : (col.order as { v: number }[]).some((o) => o.v === v);
          expect(ok, where).toBe(true);
        }
        // sourced: at least one URL, each en.wikipedia.org or an official site
        const src = ch.sources[col.key];
        expect(Array.isArray(src) && src.length > 0, `${where} has a source`).toBe(true);
        for (const u of src!) {
          const url = new URL(u);
          expect(url.protocol, where).toBe('https:');
          expect(url.hostname, where).not.toMatch(FORBIDDEN);
          expect(sourceKind(u), `${where} ${u}`).not.toBeNull();
        }
      }
      expect(Object.keys(data.characters[0]!.values).sort()).toEqual(data.columns.map((c) => c.key).sort());
    }
    for (const d of DASHES) expect(raw.includes(d), `${slug} has a dash or an ellipsis character`).toBe(false);
  });

  it('the French page shows no English common word: every value is a proper noun as stored or has its French word', () => {
    const COMMON = new Set(['none', 'human', 'other', 'others', 'not', 'stated', 'student', 'students', 'family', 'school', 'team', 'squad', 'division', 'army', 'military', 'police', 'kingdom', 'empire', 'academy', 'council', 'club', 'group', 'crew', 'staff', 'party', 'guild', 'company', 'house', 'office', 'hospital', 'store', 'shop', 'city', 'hall', 'hero', 'heroes', 'villain', 'villains', 'demon', 'demons', 'spirit', 'main', 'support', 'supporting', 'character', 'characters', 'member', 'members', 'worker', 'leader', 'president', 'secretary', 'treasurer', 'captain', 'classmate', 'classmates', 'civilian', 'civilians', 'the', 'of', 'and', 'or', 'with', 'no', 'yes', 'former', 'minor', 'major', 'recurring', 'real', 'world', 'person', 'works', 'for', 'him', 'neither', 'one', 'pilot', 'pilots', 'a', 'an', 'as', 'is']);
    const known = new Set(STEP_VALUE_FR_KEYS);
    const left = new Set<string>();
    for (const slug of slugs) {
      const { data } = read(slug);
      for (const c of data.columns) {
        if (c.kind !== 'single' && c.kind !== 'multi') continue;
        for (const ch of data.characters) for (const x of [ch.values[c.key]].flat() as string[]) {
          if (known.has(x)) { expect(stepValueFr(x).length).toBeGreaterThan(0); continue; }
          if (x.toLowerCase().split(/[^a-z]+/).some((w) => COMMON.has(w))) left.add(`${slug}.${c.key}: ${x}`);
        }
      }
    }
    expect([...left].sort()).toEqual([]);
    expect(stepValueFr('Not stated')).toBe('Non précisé');
    expect(stepValueFr('Human')).toBe('Humain');
    expect(stepValueFr('Konohagakure')).toBe('Konohagakure');
    expect(stepValueFr('Survey Corps')).toBe('Survey Corps');
    for (const k of STEP_VALUE_FR_KEYS) for (const d of DASHES) expect(stepValueFr(k).includes(d)).toBe(false);
  });

  it('every set has its own game id, short enough for dle_games, and none is the one of One Piece or Dragon Ball', () => {
    const ids = slugs.map(setId);
    expect(new Set(ids).size).toBe(48);
    for (const id of ids) expect(id).toMatch(/^otakudle-s-[a-z0-9-]{1,30}$/);
    expect(setId('one-piece')).toBe('otakudle-one-piece');
    expect(setId('dragon-ball')).toBe('otakudle-dragon-ball');
    expect(setId('that-time-i-got-reincarnated-as-a-slime')).toBe('otakudle-s-that-time-i-got-reincarnated-a');
  });

  it('the validator refuses what the contract forbids', () => {
    const { data, series } = read(slugs[0]!);
    const copy = (): File => JSON.parse(JSON.stringify(data)) as File;
    const bad = (f: File, raw?: string): string[] => validateSeries(f, series, raw ?? JSON.stringify(f));
    const a = copy(); delete a.characters[0]!.values[a.columns[0]!.key];
    expect(bad(a).join()).toMatch(/no value/);
    const b = copy(); b.characters[0]!.sources[b.columns[0]!.key] = ['https://wikia.fandom.com/wiki/X'];
    expect(bad(b).join()).toMatch(/neither a Wikipedia page nor an official site/);
    const c = copy(); c.characters[0]!.sources[c.columns[0]!.key] = ['https://example.wikimedia.org/wiki/X'];
    expect(bad(c).join()).toMatch(/neither/);
    // Wikipedia in any language is a source (owner's rule)
    expect(sourceKind('https://zh.wikipedia.org/wiki/X')).toBe('wikipedia');
    expect(sourceKind('https://en.wikipedia.org/wiki/X')).toBe('wikipedia');
    expect(sourceKind('https://bleach.fandom.com/wiki/X')).toBeNull();
    expect(sourceKind('https://myanimelist.net/anime/1')).toBeNull();
    const d = copy(); d.columns[0]!.label.fr = '';
    expect(bad(d).join()).toMatch(/label needs en and fr/);
    const e = copy(); e.columns[0]!.kind = 'tree';
    expect(bad(e).join()).toMatch(/kind/);
    const f = copy(); f.characters[0]!.slug = 'not-a-character';
    expect(bad(f).join()).toMatch(/not in the series file/);
    const g = copy();
    expect(bad(g, `${JSON.stringify(g)}${DASHES[1]}`).join()).toMatch(/dash/);
    const h = copy(); h.columns.push({ key: 'gender', kind: 'single', label: { en: 'G', fr: 'G' }, help: { en: 'G', fr: 'G' } });
    expect(bad(h).join()).toMatch(/gender/);
  });
});
