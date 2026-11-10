import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { COPY } from '@/copy/hub/h1';

import { cardView, HomeLede } from './home-day';
import { dayCounts, gameState, TODO } from './home-day-logic';

import type { GameCardLabels } from './home-day';
import type { DayGame, GameState } from './home-day-logic';
import type { LocalHistory } from '@/lib/dle/local';

// Home v4 (2026-11-10, HOME-AUDIT.md P1-3): the honest daily counter. Pure rules first, then the words of a card.

const TODAY = '2026-11-10';
const states = (kpopdle: GameState, otakudle: GameState): Readonly<Record<DayGame, GameState>> => ({ kpopdle, otakudle });
const done = (guesses = 4, won = true): GameState => ({ kind: 'done', won, guesses });

describe('the state of a game today', () => {
  const history: LocalHistory = { 'kpopdle-idol': { [TODAY]: { won: true, guesses: 4 }, '2026-11-09': { won: false, guesses: 9 } }, otakudle: { '2026-11-09': { won: true, guesses: 3 } } };

  it('is finished only by a finished play of today on this device (another day does not count)', () => {
    expect(gameState(history, {}, 'kpopdle', TODAY)).toEqual({ kind: 'done', won: true, guesses: 4 });
    expect(gameState(history, {}, 'otakudle', TODAY)).toEqual(TODO);
  });

  it('is in progress when the server says guesses were made and nothing is finished; a finished play wins over it', () => {
    expect(gameState({}, { otakudle: 3 }, 'otakudle', TODAY)).toEqual({ kind: 'prog', guesses: 3 });
    expect(gameState({}, { otakudle: 0 }, 'otakudle', TODAY)).toEqual(TODO);
    expect(gameState(history, { kpopdle: 2 }, 'kpopdle', TODAY)).toEqual({ kind: 'done', won: true, guesses: 4 });
  });

  it('a given-up game is finished too (the streak holds, the game is no longer to play)', () => {
    expect(gameState({ otakudle: { [TODAY]: { won: false, guesses: 12 } } }, {}, 'otakudle', TODAY)).toEqual({ kind: 'done', won: false, guesses: 12 });
  });
});

describe('the counter of the day', () => {
  const both = ['kpopdle', 'otakudle'] as const;

  it('counts the games and the quizzes the server tracks, so the signed-in fan sees 0 of 4 and can reach 4 of 4 (audit P1-3)', () => {
    const start = dayCounts(states(TODO, TODO), both, { total: 2, done: 0 });
    expect(start).toEqual({ done: 0, total: 4, left: 4, next: 'kpopdle' });
    const mid = dayCounts(states(done(), TODO), both, { total: 2, done: 1 });
    expect(mid).toEqual({ done: 2, total: 4, left: 2, next: 'otakudle' });
    const all = dayCounts(states(done(), done(1)), both, { total: 2, done: 2 });
    expect(all).toEqual({ done: 4, total: 4, left: 0, next: null });
  });

  it('can reach y of y with the games alone, as a guest sees it (no quiz is tracked for a guest: the server cannot know)', () => {
    expect(dayCounts(states(done(), done()), both, { total: 0, done: 0 })).toEqual({ done: 2, total: 2, left: 0, next: null });
  });

  it('the next game is the first not finished, a game in progress included', () => {
    expect(dayCounts(states({ kind: 'prog', guesses: 2 }, TODO), both, { total: 0, done: 0 }).next).toBe('kpopdle');
    expect(dayCounts(states(done(), { kind: 'prog', guesses: 2 }), both, { total: 0, done: 0 }).next).toBe('otakudle');
  });

  it('counts only the games of the home: with the daily games closed there is no game to finish, only the quizzes', () => {
    expect(dayCounts(states(done(), done()), [], { total: 2, done: 1 })).toEqual({ done: 1, total: 2, left: 1, next: null });
  });
});

describe('the words of a game card', () => {
  const labels: GameCardLabels = {
    play: 'Play Kpopdle', cont: 'Continue Kpopdle', result: COPY['hp.today.seeResult'], todo: COPY['hp.today.stateTodo'], prog: COPY['hp.today.stateProg'], won: COPY['hp.today.stateWon'], lost: COPY['hp.today.stateLost'],
    metaTodo: COPY['hp.today.metaTodo'], metaProg: COPY['hp.today.metaProg'], metaWon: COPY['hp.today.metaWon'], metaWon1: COPY['hp.today.metaWon1'], metaLost: COPY['hp.today.metaLost'],
  };

  it('not started: the chip, "Unlimited tries" and a solid call to action', () => {
    expect(cardView(TODO, labels)).toEqual({ chip: 'Not started', meta: 'Unlimited tries', cta: 'Play Kpopdle', solid: true, tone: 'todo' });
  });

  it('in progress: the number of guesses so far, and "Continue" as the solid action', () => {
    expect(cardView({ kind: 'prog', guesses: 3 }, labels)).toEqual({ chip: 'In progress', meta: '3 guesses so far', cta: 'Continue Kpopdle', solid: true, tone: 'prog' });
  });

  it('solved: the real number of tries from the device, and the action becomes the outline "See your result"', () => {
    expect(cardView(done(4), labels)).toEqual({ chip: 'Solved', meta: 'Solved in 4 tries', cta: 'See your result', solid: false, tone: 'done' });
    expect(cardView(done(1), labels).meta).toBe('Solved in 1 try');
    expect(cardView(done(7, false), labels)).toMatchObject({ chip: 'Gave up', meta: 'Gave up after 7 guesses', solid: false, tone: 'done' });
  });
});

describe('the line of the hero', () => {
  it('draws the welcome alone on the server (nothing is known before the browser reads the device)', () => {
    const html = renderToStaticMarkup(createElement(HomeLede, { welcome: 'Welcome back, @mingi.', games: ['kpopdle', 'otakudle'], quizzes: { total: 2, done: 1 }, left1: '1 game left today.', leftN: '{n} games left today.', allDone: 'All done for today.' }));
    expect(html).toBe('Welcome back, @mingi.');
  });
});
