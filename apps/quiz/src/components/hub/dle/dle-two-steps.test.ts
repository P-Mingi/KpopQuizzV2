// Otakudle in two steps (L42, owner request of 2026-11-26): what the client reads in the play state, the words of both steps in both locales, the share text with both counts,
// the board of step 2 and the fallback to the one board game when the play state has no step field.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { dleCopy, gameCopy } from '@/lib/dle/copy';
import { dleGame } from '@/lib/dle/games';
import { shareText, shareTextSteps } from '@/lib/dle/share';
import { board1, board2, columnWords, hasSteps, offered, stepCopy, stepText, stepView } from '@/lib/dle/steps';
import type { DleGuess, DlePlayState, DlePoolEntity, DleStepColumn } from '@/lib/dle/types';

import { DleStepGrid } from './dle-game';

const cell = (key: string, status: 'correct' | 'near' | 'wrong', arrow: 'up' | 'down' | null = null, value?: { v: string | number | string[]; l?: string; lf?: string }) => ({ key, status, arrow, ...(value ? { value } : {}) });
const r1 = (...s: ('correct' | 'wrong')[]) => s.map((x, i) => cell(['series', 'genres', 'year', 'studio'][i]!, x));
const COLUMNS: DleStepColumn[] = [
  { key: 'gender', kind: 'single' },
  { key: 'village', kind: 'single', label: { en: 'Village', fr: 'Village' }, help: { en: 'Home village', fr: 'Village d’origine' } },
  { key: 'rank', kind: 'ordinal', label: { en: 'Rank', fr: 'Rang' }, help: { en: 'Rank, arrows', fr: 'Rang, flèches' } },
  { key: 'clans', kind: 'multi', label: { en: 'Clans', fr: 'Clans' }, help: { en: 'Clans', fr: 'Clans' } },
];
const G: DleGuess[] = [
  { id: 'a', result: r1('wrong', 'wrong', 'correct', 'wrong') },
  { id: 'b', result: r1('correct', 'correct', 'correct', 'correct'), step2: [cell('gender', 'correct', null, { v: 'male' }), cell('village', 'wrong', null, { v: 'Konoha' }), cell('rank', 'wrong', 'up', { v: 2, l: 'Genin', lf: 'Genin' }), cell('clans', 'near', null, { v: ['Uchiha', 'Uzumaki'] })] },
  { id: 'c', result: r1('wrong', 'wrong', 'wrong', 'wrong') },
  { id: 'd', result: r1('correct', 'correct', 'correct', 'correct'), step2: [cell('gender', 'correct'), cell('village', 'correct'), cell('rank', 'correct'), cell('clans', 'correct')] },
];
const FOUND: DlePlayState = {
  date: '2026-11-26', game_no: 5, status: 'won', guesses: G, hints: [], target: null, stats: null, step: 2, series: 'naruto', series_label: 'Naruto', step1_guesses: 2, step2_guesses: 2, step2_total: 12, step2_columns: COLUMNS,
};
const entity = (id: string, series: string): DlePoolEntity => ({ id, name: id, search: [], attrs: { series: { v: series } }, thumb: null });

describe('the play state without the step fields is the old game', () => {
  it('no step: not two boards, nothing found, every guess on the one board, every entity offered', () => {
    const old: DlePlayState = { date: '2026-11-26', game_no: 1, status: 'playing', guesses: [G[0]!], hints: [], target: null, stats: null };
    const v = stepView(old);
    expect(v.two).toBe(false);
    expect(v.found).toBe(false);
    expect(board1(old.guesses, v)).toEqual(old.guesses);
    expect(stepView(null).two).toBe(false);
    const all = [entity('a', 'Naruto'), entity('b', 'Bleach')];
    expect(offered(all, v)).toBe(all);
    const url = 'https://x/otakudle';
    expect(shareTextSteps(dleGame('otakudle'), 5, old.guesses, false, url, 'en', v)).toBe(shareText(dleGame('otakudle'), 5, old.guesses, false, url, 'en'));
  });

  it('step 1 (the field says so, no anime found yet) is two boards in waiting: one board, all guesses, all characters', () => {
    const v = stepView({ ...FOUND, step: 1, series: undefined, step2_columns: undefined });
    expect(v).toMatchObject({ two: true, found: false, anime: 0, character: 0 });
    expect(board1(G, v)).toEqual(G);
  });
});

describe('step 2', () => {
  const v = stepView(FOUND);
  it('reads the counts and the anime from the play state', () => {
    expect(v).toMatchObject({ two: true, found: true, series: 'naruto', seriesLabel: 'Naruto', anime: 2, character: 2, total: 12 });
    expect(v.columns).toHaveLength(4);
  });
  it('board 1 holds the guesses of other animes and the one that found the anime; board 2 the characters of the anime', () => {
    expect(board1(G, v).map((g) => g.id)).toEqual(['a', 'b', 'c']);
    expect(board2(G).map((g) => g.id)).toEqual(['b', 'd']);
  });
  it('the input offers only the characters of that anime once it is found', () => {
    const all = [entity('a', 'Bleach'), entity('b', 'Naruto'), entity('d', 'Naruto')];
    expect(offered(all, v).map((e) => e.id)).toEqual(['b', 'd']);
    expect(offered(all, stepView({ ...FOUND, step: 1 })).map((e) => e.id)).toEqual(['a', 'b', 'd']);
  });
  it('the words of the columns: gender is the app, the columns of the data carry both languages, One Piece and Dragon Ball use their own game', () => {
    const own = (id: 'otakudle-one-piece' | 'otakudle-dragon-ball') => gameCopy(id, 'fr').columns;
    expect(columnWords(COLUMNS[0]!, 'naruto', 'fr', own).label).toBe('Genre');
    expect(columnWords(COLUMNS[1]!, 'naruto', 'fr', own)).toEqual({ label: 'Village', help: 'Village d’origine' });
    expect(columnWords(COLUMNS[2]!, 'naruto', 'en', own).label).toBe('Rank');
    expect(columnWords({ key: 'haki', kind: 'multi' }, 'one-piece', 'fr', own).label).toBe('Haki');
    expect(columnWords({ key: 'bounty', kind: 'number' }, 'one-piece', 'fr', own).label).toBe('Prime');
  });
  it('the words of the values: ordinals in the language, lists joined, gender translated, the columns of One Piece through the app', () => {
    expect(stepText(COLUMNS[0]!, 'naruto', { v: 'female' }, 'fr')).toBe('Féminin');
    expect(stepText(COLUMNS[2]!, 'naruto', { v: 1, l: 'Academy student', lf: 'Élève de l’Académie' }, 'fr')).toBe('Élève de l’Académie');
    expect(stepText(COLUMNS[2]!, 'naruto', { v: 1, l: 'Academy student', lf: 'Élève de l’Académie' }, 'en')).toBe('Academy student');
    expect(stepText(COLUMNS[2]!, 'naruto', { v: 3, l: 'Chunin' }, 'fr')).toBe('Chunin');
    expect(stepText(COLUMNS[3]!, 'naruto', { v: ['Uchiha', 'Uzumaki'] }, 'en')).toBe('Uchiha, Uzumaki');
    expect(stepText({ key: 'height_cm', kind: 'number' }, 'one-piece', { v: 174 }, 'en')).toBe('174 cm');
    expect(stepText({ key: 'bounty', kind: 'number' }, 'one-piece', { v: 0, l: 'No bounty' }, 'en')).toBe('No bounty');
    expect(stepText(COLUMNS[1]!, 'naruto', null, 'en')).toBe('');
  });
  it('the share text says both counts and one line of counts per board, and never the answer', () => {
    const t = shareTextSteps(dleGame('otakudle'), 5, G, true, 'https://x/otakudle', 'en', v);
    expect(t.split('\n')).toEqual([
      'Otakudle by Bunnyverse #5 · Character of the day · found in 4 guesses (anime in 2, character in 2)',
      'Anime 1/4 · 4/4 · 0/4',
      'Character 1/4 · 4/4',
      'https://x/otakudle',
    ]);
    const fr = shareTextSteps(dleGame('otakudle'), 5, G, true, 'https://x/otakudle', 'fr', v);
    expect(fr.split('\n')[0]).toBe('Otakudle by Bunnyverse #5 · Personnage du jour · trouvé en 4 essais (anime en 2, personnage en 2)');
    expect(fr.split('\n')[2]).toBe('Personnage 1/4 · 4/4');
  });
  it('a play given up before the anime was found shares one board', () => {
    const t = shareTextSteps(dleGame('otakudle'), 5, [G[0]!, G[2]!], false, 'https://x/o', 'en', stepView({ ...FOUND, step: 1, status: 'given_up' }));
    expect(t.split('\n')).toEqual(['Otakudle by Bunnyverse #5 · Character of the day · gave up', 'Anime 1/4 · 0/4', 'https://x/o']);
  });
  it('only Otakudle across all series has two steps', () => {
    expect(hasSteps('otakudle')).toBe(true);
    expect(hasSteps('otakudle-one-piece')).toBe(false);
    expect(hasSteps('kpopdle-idol')).toBe(false);
  });
});

describe('the board of step 2', () => {
  const words = { right: 'Right', near: 'Close', wrong: 'Wrong', unknown: 'n/a', up: 'up', down: 'down' };
  const byId = new Map([['b', entity('b', 'Naruto')], ['d', entity('d', 'Naruto')]]);
  const html = (locale: 'en' | 'fr'): string => renderToStaticMarkup(createElement(DleStepGrid, { locale, game: 'otakudle', view: stepView(FOUND), guesses: board2(G), byId, wonId: 'd', fresh: null, words }));
  it('has its own header row (gender, then the columns of the anime), one row per guess, newest first, the values in the words of the language', () => {
    const out = html('en');
    expect(out.match(/<th scope="col"/g)).toHaveLength(5);
    expect(out).toContain('>Gender</th>');
    expect(out).toContain('>Village</th>');
    expect(out).toContain('>Rank</th>');
    expect(out.indexOf('>d</strong>')).toBeLessThan(out.indexOf('>b</strong>'));
    expect(out).toContain('Konoha');
    expect(out).toContain('Genin');
    expect(out).toContain('Uchiha, Uzumaki');
    expect(out).toContain('hub-dle-t-near');
    expect(out).toContain('hub-dle-rowhead-win');
    expect(html('fr')).toContain('>Genre</th>');
    expect(html('fr')).toContain('>Rang</th>');
  });
});

describe('the words and the page', () => {
  it('every string of both steps exists in both locales, with no dash and no ellipsis', () => {
    for (const l of ['en', 'fr'] as const) {
      const c = stepCopy(l);
      const strings = [c.bannerTitle(1, 'Naruto'), c.bannerTitle(3, 'Naruto'), c.bannerText(12), c.bannerText(null), c.board1Title, c.board2Title, c.board1Caption, c.board2Caption, c.placeholder('Naruto'), c.proposeLabel('Naruto'),
        c.wonLine(5, 2, 4), c.wonLine(1, 1, 1), c.gaveUpLine(3, null), c.gaveUpLine(3, 2), c.shareOutcome(5, 2, 4), c.shareLine1, c.shareLine2, c.emptyStep2, c.rowHead2, c.announceFound(2, 'Naruto'), c.stepSr(1), c.stepSr(2),
        dleCopy(l).emptyCells];
      for (const s of strings) { expect(s.length).toBeGreaterThan(2); expect(s).not.toMatch(new RegExp(`[${String.fromCharCode(0x2013, 0x2014, 0x2026)}]`)); }
    }
  });
  it('the sentences of the owner', () => {
    expect(stepCopy('fr').bannerTitle(2, 'Naruto') + ' ' + stepCopy('fr').bannerText(12)).toBe('Anime trouvé en 2 essais : Naruto. Trouve maintenant le personnage parmi ses 12.');
    expect(stepCopy('en').bannerTitle(2, 'Naruto') + ' ' + stepCopy('en').bannerText(12)).toBe('Anime found in 2 guesses: Naruto. Now find the character among its 12.');
    expect(stepCopy('fr').placeholder('Naruto')).toBe('Un personnage de Naruto');
    expect(stepCopy('fr').wonLine(6, 2, 4)).toBe('Trouvé en 6 essais : anime en 2, personnage en 4.');
    expect(stepCopy('en').wonLine(6, 2, 4)).toBe('Found in 6 guesses: anime in 2, character in 4.');
  });
  it('the how to play of Otakudle explains the two steps and the columns of each anime, in both languages', () => {
    for (const l of ['en', 'fr'] as const) {
      const w = gameCopy('otakudle', l);
      expect(w.how1).toMatch(l === 'en' ? /Step 1.*step 2/s : /Étape 1.*étape 2/s);
      expect(w.how1).toMatch(l === 'en' ? /columns of their own for each anime/ : /colonnes propres à chaque anime/);
      expect(w.how1).toMatch(/5 (and|et) 10/);
      expect(w.how2).toMatch(l === 'en' ? /one total/ : /seul total/);
      expect(`${w.how1} ${w.how2} ${w.dlgHow1}`).not.toMatch(new RegExp(`[${String.fromCharCode(0x2013, 0x2014, 0x2026)}]`));
    }
  });
  it('the game component hides every new element without the step fields, and keeps the solid yellow of the close cell', () => {
    const src = readFileSync(join(__dirname, 'dle-game.tsx'), 'utf8');
    expect(src).toContain('{sv.found ? (');
    expect(src).toContain('sv.two ? sc.board1Title : t.tries');
    const css = readFileSync(join(__dirname, '../../../styles/sites/hub/dle.css'), 'utf8');
    expect(css).toContain('--hub-dle-near: #EFC94C');
    expect(css).toContain('.hub-dle-stepbanner');
  });
});
