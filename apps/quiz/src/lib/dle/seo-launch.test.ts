// SEO-LAUNCH-1 lane D (owner, 2026-11-23): the keywords without a new page, the questions under the game, the names "{Game} by Bunnyverse" in the JSON-LD, and a failed read that is not a game that is off.
import { afterEach, describe, expect, it, vi } from 'vitest';

import { builtGames } from './games';
import { dleCopy, gameCopy } from './copy';
import { isDleOff, settleDleRead } from './read';
import { BURROW_SEO, GAME_SEO, gameAnswerBlock, gameJsonLd } from './seo';
import { gameIntro, gameQuestions } from './seo-text';

const LOCALES = ['en', 'fr'] as const;
const SUFFIX = ' | Bunnyverse';

afterEach(() => vi.unstubAllEnvs());

describe('titles, H1 and metas of the daily games', () => {
  it('follow the table of agent 2 section 4: 60 characters or fewer with the suffix, metas of 120 to 160, no Wordle, no competitor', () => {
    expect(GAME_SEO.otakudle!.title.en).toBe('Otakudle: Guess the Anime Character of the Day');
    expect(GAME_SEO['otakudle-one-piece']!.title.en).toBe('One Piece Character Guessing Game: Otakudle');
    expect(GAME_SEO['otakudle-dragon-ball']!.title.en).toBe('Dragon Ball Character Guessing Game: Otakudle');
    expect(BURROW_SEO.title.en).toBe('Daily K-pop and Anime Games: Kpopdle, Otakudle');
    expect(dleCopy('en').burrowH1).toBe('Daily K-pop and anime games');
    for (const l of LOCALES) {
      const rows = [BURROW_SEO, ...builtGames().map((g) => GAME_SEO[g.id]!)];
      for (const r of rows) {
        expect(`${r.title[l]}${SUFFIX}`.length, r.title[l]).toBeLessThanOrEqual(60);
        expect(r.description[l].length, r.description[l]).toBeGreaterThanOrEqual(120);
        expect(r.description[l].length, r.description[l]).toBeLessThanOrEqual(160);
        expect(`${r.title[l]} ${r.description[l]}`).not.toMatch(/wordle|[\u2013\u2014]|onepiecedle|loldle|idoldle/i);
      }
      for (const g of builtGames()) expect(gameCopy(g.id, l).h1, g.id).not.toMatch(/wordle/i);
    }
  });
});

describe('the words under the game', () => {
  it('"A Wordle-style game" is written once on the page of Kpopdle, and nowhere else', () => {
    const text = (id: Parameters<typeof gameIntro>[0], l: 'en' | 'fr'): string =>
      [gameIntro(id, l), gameAnswerBlock(id, l, 200, '2026-11-23', 40), ...gameQuestions(id, l).flatMap((x) => [x.q, x.a])].join(' ');
    expect(text('kpopdle-idol', 'en').match(/A Wordle-style game/g)).toHaveLength(1);
    for (const g of builtGames()) {
      if (g.id !== 'kpopdle-idol') expect(text(g.id, 'en'), g.id).not.toMatch(/wordle/i);
      expect(text(g.id, 'fr'), g.id).not.toMatch(/wordle/i);
    }
  });

  it('each game has its three questions, answered in the first sentence, with the brand and no dash', () => {
    for (const g of builtGames()) for (const l of LOCALES) {
      const qs = gameQuestions(g.id, l);
      expect(qs, `${g.id} ${l}`).toHaveLength(3);
      for (const x of qs) {
        expect(x.q, x.q).toMatch(/\?$/);
        expect(x.a.length, x.q).toBeGreaterThan(40);
        expect(`${x.q} ${x.a}`).not.toMatch(/[\u2013\u2014]/);
      }
      const label = g.series ? `${g.brand} ${g.series.name}` : g.brand;
      expect(qs[0]!.q).toContain(label);
      expect(qs[2]!.a.startsWith(`Bunnyverse ${l === 'en' ? 'makes' : 'fait'} ${label}`), `${g.id} ${l}`).toBe(true);
    }
    expect(gameQuestions('kpopdle-idol', 'en').map((x) => x.q)).toEqual(['When does Kpopdle reset?', 'Can I play past days?', 'Who makes Kpopdle?']);
  });

  it('the answer block names "{Game} by Bunnyverse" and carries the real size of the pool and its date', () => {
    expect(gameAnswerBlock('kpopdle-idol', 'en', 216, '2026-11-23')).toMatch(/^Kpopdle by Bunnyverse is a free daily K-pop idol guessing game\./);
    expect(gameAnswerBlock('otakudle', 'en', 750, '2026-11-23', 40)).toMatch(/^Otakudle by Bunnyverse is a free daily anime character guessing game\./);
    expect(gameAnswerBlock('otakudle', 'en', 750, '2026-11-23', 40)).toContain('750 characters from 40 series on 23 November 2026');
  });
});

describe('the JSON-LD of a game', () => {
  it('names the game "{Game} by Bunnyverse", with the short names as alternateName, and no rating', () => {
    const k = gameJsonLd('kpopdle-idol', 'en');
    expect(k.name).toBe('Kpopdle by Bunnyverse');
    expect(k.alternateName).toEqual(['Kpopdle', 'Kpopdle Idol of the day']);
    expect(gameJsonLd('otakudle', 'en').name).toBe('Otakudle by Bunnyverse');
    expect(JSON.stringify(k)).not.toMatch(/aggregateRating|numberOfPlayers|wordle/i);
  });
});

describe('a failed read is not a game that is off', () => {
  it('only the answers of the game itself are "off"', () => {
    for (const m of ['dle_unavailable', 'dle_pool_too_small: 3 targets, 40 needed', 'dle_no_schedule', 'dle_unknown_game']) expect(isDleOff(new Error(m)), m).toBe(true);
    for (const m of ['fetch failed', 'canceling statement due to statement timeout', 'Could not find the function public.dle_day', '']) expect(isDleOff(new Error(m)), m).toBe(false);
    expect(isDleOff(undefined)).toBe(false);
  });

  it('settles an off game to null, throws any other failure so ISR keeps the last good page, and answers null during the build', () => {
    expect(settleDleRead(new Error('dle_unavailable'))).toBeNull();
    expect(() => settleDleRead(new Error('fetch failed'))).toThrow('fetch failed');
    expect(() => settleDleRead('boom')).toThrow('boom');
    vi.stubEnv('NEXT_PHASE', 'phase-production-build');
    expect(settleDleRead(new Error('fetch failed'))).toBeNull();
  });
});
