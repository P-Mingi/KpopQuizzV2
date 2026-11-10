// Owner feedback 2026-11-08, item 6: "Le Terrier" / "The Burrow" is a label nowhere any more. URLs, route folders, component names and CSS classes keep their names.
// Owner, 2026-11-10 (home v4): the visible name is "Daily games" / "Jeux du jour" everywhere on the hub (was "Dle games" / "Jeux dle"), the /daily H1, title and
// description included (the hub is not indexed during the private launch).
import { describe, expect, it } from 'vitest';

import { COPY as H1_COPY } from '@/copy/hub/h1';

import { dleCopy } from './copy';
import { BURROW_SEO } from './seo';

import type { DleLocale } from './types';

const OLD = /burrow|terrier/i;

function strings(o: unknown, out: string[] = []): string[] {
  if (typeof o === 'string') out.push(o);
  else if (Array.isArray(o)) o.forEach((x) => strings(x, out));
  else if (o && typeof o === 'object') Object.values(o).forEach((x) => strings(x, out));
  return out;
}

describe('the page of the dle games has its new name', () => {
  it('the labels of the nav, the title, the breadcrumb and the way back', () => {
    expect(dleCopy('en').navBurrow).toBe('Daily games');
    expect(dleCopy('fr').navBurrow).toBe('Jeux du jour');
    expect(dleCopy('en').burrowH1).toBe('Daily games');
    expect(dleCopy('fr').burrowH1).toBe('Jeux du jour');
    expect(dleCopy('en').backToBurrow).toBe('Back to the daily games');
    expect(dleCopy('fr').backToBurrow).toBe('Retour aux jeux du jour');
    expect(dleCopy('en').aboutTitle).toBe('What are the daily games?');
    expect(dleCopy('fr').aboutTitle).toBe('C’est quoi, les jeux du jour ?');
  });

  for (const locale of ['en', 'fr'] as const satisfies readonly DleLocale[]) {
    it(`${locale}: no word of the copy, the metadata title and description says Burrow or Terrier`, () => {
      const t = dleCopy(locale);
      const texts = [...Object.values(t).filter((v): v is string => typeof v === 'string'), BURROW_SEO.title[locale], BURROW_SEO.description[locale]];
      expect(texts.filter((x) => OLD.test(x))).toEqual([]);
    });
  }

  it('the metadata of the page names the games, in both languages', () => {
    expect(BURROW_SEO.title.en).toBe('Daily games: K-pop and anime puzzles');
    expect(BURROW_SEO.title.fr).toBe('Jeux du jour : les énigmes K-pop et anime');
    // rule 2: one primary phrase shared by the title, the H1 and the description; the title fits 60 characters with " | Bunnyverse"
    for (const l of ['en', 'fr'] as const) {
      const phrase = dleCopy(l).burrowH1;
      expect(BURROW_SEO.title[l].startsWith(phrase), l).toBe(true);
      expect(BURROW_SEO.description[l].toLowerCase(), l).toContain(phrase.toLowerCase());
      expect(`${BURROW_SEO.title[l]} | Bunnyverse`.length, l).toBeLessThanOrEqual(60);
      expect(BURROW_SEO.description[l].length, l).toBeGreaterThanOrEqual(120);
      expect(BURROW_SEO.description[l].length, l).toBeLessThanOrEqual(160);
    }
  });

  it('the hub home: its tab, its group, its link and its footer', () => {
    const texts = strings(H1_COPY);
    expect(texts.filter((x) => OLD.test(x))).toEqual([]);
    // Home v4 (2026-11-10): the tab of the home and its footer line say "Daily games", as the dle pages do (navBurrow: their tab, footer, breadcrumb and links).
    expect(H1_COPY['hp.nav.burrow']).toBe('Daily games');
    expect(H1_COPY['hp.foot.burrow']).toBe('Daily games');
  });

  it('no visible word says "Dle games" or "Jeux dle" any more, in the copy of the hub, of the dle pages or in the /daily metadata', () => {
    const DLE = /\bdle games?\b|\bjeux? dle\b/i;
    for (const l of ['en', 'fr'] as const) {
      const t = dleCopy(l);
      const texts = [...strings(Object.values(t).filter((v) => typeof v === 'string')), BURROW_SEO.title[l], BURROW_SEO.description[l]];
      expect(texts.filter((x) => DLE.test(x)), l).toEqual([]);
    }
    expect(strings(H1_COPY).filter((x) => DLE.test(x))).toEqual([]);
  });

  it('the badge of the Daily games tab is read as "4 daily games left" / "4 jeux du jour restants" (integrator, 2026-11-10)', () => {
    expect(dleCopy('en').left(4)).toBe('4 daily games left');
    expect(dleCopy('en').left(1)).toBe('1 daily game left');
    expect(dleCopy('fr').left(4)).toBe('4 jeux du jour restants');
    expect(dleCopy('fr').left(1)).toBe('1 jeu du jour restant');
    expect(H1_COPY['hp.nav.burrowLeft']).toBe('{n} daily games left');
    expect(H1_COPY['hp.nav.burrowLeft1']).toBe('1 daily game left');
  });
});
