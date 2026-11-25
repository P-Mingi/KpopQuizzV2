// SEO-LAUNCH-1 review (owner decisions of 2026-11-24): the sentences of the daily games say only what the code does. The pictures of the anime characters are not "licensed" (L38), the past
// days follow day.ts, the brand is "{Game} by Bunnyverse" in French too, the series metas carry their phrase once, and /daily opens with its answer block.
import { describe, expect, it } from 'vitest';

import { YESTERDAY_GRACE_HOURS } from './day';
import { builtGames } from './games';
import { GAME_SEO, burrowAnswerBlock } from './seo';
import { gameQuestions } from './seo-text';
import { MAILBOX } from '../site/registry';
import { FOUNDER } from '../seo/org';
import { HUB_ABOUT_ANSWER } from '../site/hub/about';
import { wordCount } from '../kpopcards/seo';
import { dleCopy, gameCopy } from './copy';

const DASH = new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`);
const hhmm = `${String(YESTERDAY_GRACE_HOURS).padStart(2, '0')}:00 UTC`;

describe('fix 1: no false licence claim on the anime games', () => {
  it('the anime answers say whose the pictures are and who to write to; Kpopdle keeps its licence line', () => {
    for (const g of builtGames()) for (const l of ['en', 'fr'] as const) {
      const text = gameQuestions(g.id, l).map((x) => x.a).join(' ');
      if (g.universe === 'anime') {
        expect(text, `${g.id} ${l}`).not.toMatch(/licen[cs]e|sans licence/i);
        expect(text, `${g.id} ${l}`).toContain(MAILBOX);
        expect(text, `${g.id} ${l}`).toMatch(l === 'en' ? /belong to their rights holders/ : /appartiennent à leurs ayants droit/);
      } else expect(text).toMatch(/licen[cs]/i);
    }
  });
  it('the how-to-play text of the anime games makes no licence claim either', () => {
    for (const g of builtGames().filter((x) => x.universe === 'anime')) for (const l of ['en', 'fr'] as const) {
      const c = gameCopy(g.id, l);
      expect(`${c.how2} ${c.noPhoto}`, `${g.id} ${l}`).not.toMatch(/(without|no|sans|aucun)[^.]*licen[cs]e|written licence|licence écrite/i);
    }
  });
});

describe('fix 4: past days, from day.ts', () => {
  it('says there is no archive, the grace hours from the constant, and when yesterday is shown', () => {
    for (const g of builtGames()) {
      const en = gameQuestions(g.id, 'en')[1]!.a;
      const fr = gameQuestions(g.id, 'fr')[1]!.a;
      expect(en.startsWith('No. ')).toBe(true);
      expect(en).toContain(`can still be finished until ${hhmm}`);
      expect(en).toContain(`From ${hhmm}, the page shows yesterday’s`);
      expect(fr.startsWith('Non. ')).toBe(true);
      expect(fr).toContain(`jusqu’à ${hhmm}`);
    }
  });
});

describe('fix 11 and 17: the brand and the link to /about', () => {
  it('French texts keep "{Game} by Bunnyverse"', () => {
    for (const g of Object.values(GAME_SEO)) expect(`${g!.app.fr}`).not.toMatch(/par Bunnyverse/);
  });
  it('the "Who makes" answer links Bunnyverse to /about in both languages', () => {
    for (const g of builtGames()) for (const l of ['en', 'fr'] as const) {
      const q = gameQuestions(g.id, l)[2]!;
      expect(q.link).toEqual({ text: 'Bunnyverse', href: '/about' });
      expect(q.a.startsWith('Bunnyverse')).toBe(true);
    }
  });
});

describe('fix 18: the series metas', () => {
  it('carry "{Series} character guessing game" once, 120 to 160 characters', () => {
    for (const g of builtGames().filter((x) => x.series)) {
      const d = GAME_SEO[g.id]!.description.en;
      expect(d.toLowerCase().split(`${g.series!.name} character guessing game`.toLowerCase()).length - 1, d).toBe(1);
      for (const l of ['en', 'fr'] as const) {
        expect(GAME_SEO[g.id]!.description[l].length).toBeGreaterThanOrEqual(120);
        expect(GAME_SEO[g.id]!.description[l].length).toBeLessThanOrEqual(160);
      }
    }
  });
});

describe('fix 16: the answer block of /daily', () => {
  it('has 40 to 60 words, the count and the names of the games from the code, the date, and no answer', () => {
    for (const l of ['en', 'fr'] as const) {
      const text = burrowAnswerBlock(l, l === 'en' ? 'Tuesday 24 November' : 'Mardi 24 novembre');
      expect(wordCount(text), text).toBeGreaterThanOrEqual(40);
      expect(wordCount(text), text).toBeLessThanOrEqual(60);
      expect(text).toContain(String(builtGames().length));
      expect(text).toContain('Kpopdle by Bunnyverse');
      expect(text).toContain('Otakudle by Bunnyverse');
      for (const g of builtGames().filter((x) => x.series)) expect(text).toContain(`${g.brand} ${g.series!.name}`);
      expect(text).toContain(l === 'en' ? 'Tuesday 24 November' : 'mardi 24 novembre');
      expect(text).not.toMatch(DASH);
    }
  });
  it('the lead of the page types no number of games', () => {
    expect(JSON.stringify(dleCopy('en'))).not.toMatch(/Two games/);
    expect(JSON.stringify(dleCopy('fr'))).not.toMatch(/Deux jeux/);
  });
});

describe('fix 2: the answer block of /about', () => {
  it('has 40 to 60 words, builds the founder from FOUNDER, and claims no blanket review', () => {
    expect(wordCount(HUB_ABOUT_ANSWER)).toBeGreaterThanOrEqual(40);
    expect(wordCount(HUB_ABOUT_ANSWER)).toBeLessThanOrEqual(60);
    expect(HUB_ABOUT_ANSWER).toContain(`run by ${FOUNDER.name}, ${FOUNDER.role.charAt(0).toLowerCase()}${FOUNDER.role.slice(1)}`);
    expect(HUB_ABOUT_ANSWER).not.toMatch(/before anything is published|reviews before/i);
    expect(HUB_ABOUT_ANSWER).toMatch(/Wikidata, MusicBrainz and Wikipedia/);
    expect(HUB_ABOUT_ANSWER).not.toMatch(DASH);
  });
});
