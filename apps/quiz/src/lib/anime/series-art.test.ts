import { describe, expect, it } from 'vitest';

import {
  ART_BOX, ART_DARK_TEXT, ART_LIGHT_TEXT, ART_PALETTE, ART_PATTERNS, ART_PATTERN_MAX_OPACITY, artFor, artMonogram, blend, contrast, fitArtText, slugOfTitle, wrapWords,
} from './series-art';

// Lane O2: the series art is deterministic, readable at WCAG AA, and never cuts a title.

const SERIES: ReadonlyArray<readonly [string, string]> = [
  ['apothecary-diaries', 'The Apothecary Diaries'], ['attack-on-titan', 'Attack on Titan'], ['bleach', 'Bleach'], ['blue-lock', 'Blue Lock'],
  ['chainsaw-man', 'Chainsaw Man'], ['cowboy-bebop', 'Cowboy Bebop'], ['dandadan', 'Dandadan'], ['death-note', 'Death Note'],
  ['demon-slayer', 'Demon Slayer: Kimetsu no Yaiba'], ['dragon-ball', 'Dragon Ball'], ['evangelion', 'Neon Genesis Evangelion'],
  ['frieren', "Frieren: Beyond Journey's End"], ['fullmetal-alchemist', 'Fullmetal Alchemist'], ['haikyu', 'Haikyu!!'],
  ['hunter-x-hunter', 'Hunter × Hunter'], ['jojo', "JoJo's Bizarre Adventure"], ['jujutsu-kaisen', 'Jujutsu Kaisen'],
  ['kagurabachi', 'Kagurabachi'], ['kaiju-no-8', 'Kaiju No. 8'], ['my-hero-academia', 'My Hero Academia'], ['naruto', 'Naruto'],
  ['omniscient-readers-viewpoint', "Omniscient Reader's Viewpoint"], ['one-piece', 'One Piece'], ['one-punch-man', 'One-Punch Man'],
  ['oshi-no-ko', 'Oshi no Ko'], ['sailor-moon', 'Sailor Moon'], ['solo-leveling', 'Solo Leveling'], ['spy-x-family', 'Spy × Family'],
  ['tower-of-god', 'Tower of God'], ['vinland-saga', 'Vinland Saga'],
];

describe('the palette', () => {
  it.each(ART_PALETTE.map((c) => [c.name, c] as const))('%s holds AA with its text colour, even under the pattern at its strongest', (_name, c) => {
    expect(c.text === ART_LIGHT_TEXT || c.text === ART_DARK_TEXT).toBe(true);
    expect(contrast(c.text, c.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(c.text, blend(c.text, c.bg, ART_PATTERN_MAX_OPACITY))).toBeGreaterThanOrEqual(4.5);
  });

  it('names every colour once and every hex once', () => {
    expect(new Set(ART_PALETTE.map((c) => c.name)).size).toBe(ART_PALETTE.length);
    expect(new Set(ART_PALETTE.map((c) => c.bg)).size).toBe(ART_PALETTE.length);
  });
});

describe('the pick by slug', () => {
  it('is deterministic and ignores case and spaces around the slug', () => {
    for (const [slug] of SERIES) expect(artFor(slug)).toEqual(artFor(slug));
    expect(artFor(' Death-Note ')).toEqual(artFor('death-note'));
  });

  it('gives each of the 30 series of the catalog its own colour and pattern pair, and uses most of the palette', () => {
    const pairs = SERIES.map(([slug]) => `${artFor(slug).index}/${artFor(slug).patternIndex}`);
    expect(new Set(pairs).size).toBe(SERIES.length);
    expect(new Set(SERIES.map(([slug]) => artFor(slug).index)).size).toBeGreaterThanOrEqual(16);
    // two neighbours of the A to Z list never share a colour
    for (let i = 1; i < SERIES.length; i++) expect(artFor(SERIES[i]![0]).index, SERIES[i]![0]).not.toBe(artFor(SERIES[i - 1]![0]).index);
    expect(artFor('anime-mix').color.bg).toMatch(/^#/);
    expect(new Set(SERIES.map(([slug]) => artFor(slug).patternIndex)).size).toBe(ART_PATTERNS.length);
  });

  it('draws every pattern as a short path inside the box of each size', () => {
    for (const p of ART_PATTERNS) {
      for (const size of ['avatar', 'card', 'hub'] as const) {
        const { w, h, unit } = ART_BOX[size];
        const d = p.d(w, h, unit);
        expect(d.length, `${p.key} ${size}`).toBeGreaterThan(20);
        expect(d.length, `${p.key} ${size}`).toBeLessThan(2600);
        expect(d).not.toMatch(/NaN|undefined|Infinity/);
      }
    }
  });
});

describe('the title', () => {
  it('never loses a word, on any size, for the longest names of the catalog', () => {
    for (const [, title] of SERIES) {
      for (const [maxLines, max, min, width, height] of [[2, 28, 14, 280, 72], [3, 40, 16, 256, 116]] as const) {
        const t = fitArtText(title, width, height, maxLines, max, min);
        expect(t.lines.join(' ').replace(/\s+/g, ' ')).toBe(title);
        expect(t.lines.length, title).toBeLessThanOrEqual(maxLines);
        expect(t.fontSize).toBeGreaterThanOrEqual(min);
      }
    }
  });

  it('wraps on word breaks and cuts only a word longer than a line', () => {
    expect(wrapWords("Omniscient Reader's Viewpoint", 19)).toEqual(["Omniscient Reader's", 'Viewpoint']);
    expect(wrapWords('Supercalifragilistic', 8)).toEqual(['Supercal', 'ifragili', 'stic']);
  });

  it('makes a two letter monogram', () => {
    expect(artMonogram('Death Note')).toBe('DN');
    expect(artMonogram("Omniscient Reader's Viewpoint")).toBe('OR');
    expect(artMonogram('The Apothecary Diaries')).toBe('AD');
    expect(artMonogram('Attack on Titan')).toBe('AT');
    expect(artMonogram('Naruto')).toBe('Na');
    expect(artMonogram('Oshi no Ko')).toBe('OK');
    expect(artMonogram('')).toBe('?');
  });

  it('gives a title the slug it would have', () => {
    expect(slugOfTitle("Frieren: Beyond Journey's End")).toBe('frieren-beyond-journey-s-end');
  });
});
