// Owner feedback 2026-11-08, item 5: "Yesterday's character was X" under the input of each game. The line carries day n-1 and never the day being played.
import { describe, expect, it } from 'vitest';

import { gameCopy } from './copy';
import { addDays } from './day';
import { yesterdayName, yesterdayWasText } from './yesterday';

import type { DleDay, DlePublicEntity } from './types';

const ent = (name: string): DlePublicEntity => ({ id: name.toLowerCase(), name, attrs: {}, thumb: null }) as unknown as DlePublicEntity;
const day = (date: string, no: number, y: { date: string; game_no: number; name: string } | null): Pick<DleDay, 'date' | 'game_no' | 'yesterday'> => ({
  date, game_no: no, yesterday: y ? { date: y.date, game_no: y.game_no, answer: ent(y.name) } : null,
});

describe('yesterdayName', () => {
  it('day d returns the answer of d-1', () => {
    expect(yesterdayName(day('2026-11-08', 20, { date: '2026-11-07', game_no: 19, name: 'Yesterday Girl' }))).toBe('Yesterday Girl');
    // Across a month and a year.
    expect(yesterdayName(day('2027-01-01', 60, { date: '2026-12-31', game_no: 59, name: 'New Year' }))).toBe('New Year');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
  });

  it('nothing when d-1 has no game (dle_day gave no yesterday)', () => {
    expect(yesterdayName(day('2026-11-08', 1, null))).toBeNull();
    expect(yesterdayName(null)).toBeNull();
    expect(yesterdayName(undefined)).toBeNull();
  });

  it('never the answer of the day being played, nor of any other day than d-1', () => {
    expect(yesterdayName(day('2026-11-08', 20, { date: '2026-11-08', game_no: 20, name: 'Today Answer' }))).toBeNull();
    expect(yesterdayName(day('2026-11-08', 20, { date: '2026-11-09', game_no: 21, name: 'Tomorrow Answer' }))).toBeNull();
    expect(yesterdayName(day('2026-11-08', 20, { date: '2026-11-06', game_no: 18, name: 'Two Days Ago' }))).toBeNull();
    // The date of the day right, the game number not the previous one: refused too.
    expect(yesterdayName(day('2026-11-08', 20, { date: '2026-11-07', game_no: 20, name: 'Wrong Number' }))).toBeNull();
  });

  it('an answer with no name gives no line', () => {
    expect(yesterdayName(day('2026-11-08', 20, { date: '2026-11-07', game_no: 19, name: '  ' }))).toBeNull();
  });
});

describe('yesterdayWasText, with the line each game already has', () => {
  it('Kpopdle says idol, in the typography of the French copy (curly apostrophe)', () => {
    expect(yesterdayWasText('en', gameCopy('kpopdle-idol', 'en').yesterdayLine, 'Karina')).toBe('Yesterday’s idol was Karina');
    expect(yesterdayWasText('fr', gameCopy('kpopdle-idol', 'fr').yesterdayLine, 'Karina')).toBe('L’idol d’hier était Karina');
  });

  it('Otakudle and the series games say character', () => {
    expect(yesterdayWasText('en', gameCopy('otakudle', 'en').yesterdayLine, 'Luffy')).toBe('Yesterday’s character was Luffy');
    expect(yesterdayWasText('fr', gameCopy('otakudle', 'fr').yesterdayLine, 'Luffy')).toBe('Le personnage d’hier était Luffy');
    expect(yesterdayWasText('en', gameCopy('otakudle-one-piece', 'en').yesterdayLine, 'Zoro')).toBe('Yesterday’s One Piece character was Zoro');
    expect(yesterdayWasText('fr', gameCopy('otakudle-dragon-ball', 'fr').yesterdayLine, 'Goku')).toBe('Le personnage Dragon Ball d’hier était Goku');
  });
});

describe('the line under the input, in the markup of the game', () => {
  const render = async (game: 'kpopdle-idol' | 'otakudle-one-piece', locale: 'en' | 'fr', yesterday: string | null): Promise<string> => {
    const { createElement } = await import('react');
    const { renderToStaticMarkup } = await import('react-dom/server');
    const { DleGame } = await import('@/components/hub/dle/dle-game');
    const pool = { game, universe: game === 'kpopdle-idol' ? 'kpop' : 'anime', attributes: [], entities: [] } as never;
    return renderToStaticMarkup(createElement(DleGame, { locale, game, gameNo: 5, stats: null, pool, pictures: {}, quizLinks: {}, kpopName: 'KpopQuiz', ...(yesterday === null ? {} : { yesterday }) }));
  };

  it('Kpopdle: the idol, EN and FR, right under the input', async () => {
    expect(await render('kpopdle-idol', 'en', 'Karina')).toContain('<p class="hub-dle-yline">Yesterday’s idol was Karina</p>');
    expect(await render('kpopdle-idol', 'fr', 'Karina')).toContain('<p class="hub-dle-yline">L’idol d’hier était Karina</p>');
  });

  it('a series game: the character; no line when there is no yesterday', async () => {
    expect(await render('otakudle-one-piece', 'en', 'Zoro')).toContain('Yesterday’s One Piece character was Zoro');
    expect(await render('otakudle-one-piece', 'en', null)).not.toContain('hub-dle-yline');
  });
});
