// Owner feedback 2026-11-08, item 6: "Le Terrier" / "The Burrow" is a label nowhere any more: FR "Jeux dle", EN "Dle games". URLs, route folders, component names and CSS classes keep their names.
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
    expect(dleCopy('en').navBurrow).toBe('Dle games');
    expect(dleCopy('fr').navBurrow).toBe('Jeux dle');
    expect(dleCopy('en').burrowH1).toBe('Dle games');
    expect(dleCopy('fr').burrowH1).toBe('Jeux dle');
    expect(dleCopy('en').backToBurrow).toBe('Back to the Dle games');
    expect(dleCopy('fr').backToBurrow).toBe('Retour aux jeux dle');
  });

  for (const locale of ['en', 'fr'] as const satisfies readonly DleLocale[]) {
    it(`${locale}: no word of the copy, the metadata title and description says Burrow or Terrier`, () => {
      const t = dleCopy(locale);
      const texts = [...Object.values(t).filter((v): v is string => typeof v === 'string'), BURROW_SEO.title[locale], BURROW_SEO.description[locale]];
      expect(texts.filter((x) => OLD.test(x))).toEqual([]);
    });
  }

  it('the metadata of the page names the games, in both languages', () => {
    expect(BURROW_SEO.title.en).toBe('Dle games: daily K-pop and anime games');
    expect(BURROW_SEO.title.fr).toBe('Jeux dle : les jeux K-pop et anime du jour');
  });

  it('the hub home: its tab, its group, its link and its footer', () => {
    const texts = strings(H1_COPY);
    expect(texts.filter((x) => OLD.test(x))).toEqual([]);
    expect(H1_COPY['hp.nav.burrow']).toBe('Dle games');
  });
});
