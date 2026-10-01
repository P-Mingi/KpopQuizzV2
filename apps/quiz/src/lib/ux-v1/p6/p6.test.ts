import { describe, expect, it } from 'vitest';

import {
  challengeOutcome,
  challengePath,
  CODE_RE,
  parseAttemptInput,
  parseChallengeInput,
  questionsMatchSongs,
  shortCode,
} from './challenge';
import { popularSix } from './hub-data';
import { filterGroups, generateBody, groupPick, initials, isFixedPlaylist, playlistLabel } from './playlists';
import { comboLabel, comboTenths, scoreLabel, scoreRound, speedBonus, summarizeRun } from './points';

// P6 unit tests: display points (DESIGN-SPEC 17.6 formula), result labels (the live
// game's thresholds), playlist model (generate bodies identical to the live game),
// popular six (17.5), challenge validation (no forged answers reach a friend).

describe('points (17.6 formula, display only)', () => {
  it.each([
    [0, 100], [1999, 100], [2000, 100], [2800, 90], [6000, 50], [9990, 0], [10000, 0], [12000, 0], [-5, 0],
  ])('speed bonus at %i ms = %i', (ms, want) => { expect(speedBonus(ms)).toBe(want); });

  it('combo is x1.0 then +0.1 per right answer in a row, capped at x2.0', () => {
    expect([1, 2, 3, 10, 11, 20].map(comboTenths)).toEqual([10, 11, 12, 19, 20, 20]);
    expect(comboLabel(12)).toBe('x1.2');
  });

  it('a right answer is (100 + speed) x combo; a miss scores 0 and resets the combo', () => {
    expect(scoreRound({ correct: true, timeMs: 1500 }, 0)).toEqual({ points: 200, speed: 100, tenths: 10, streak: 1 });
    expect(scoreRound({ correct: true, timeMs: 1500 }, 1).points).toBe(220);
    expect(scoreRound({ correct: false, timeMs: 1500 }, 5)).toEqual({ points: 0, speed: 0, tenths: 0, streak: 0 });
  });

  it('a perfect fast 10-song run is 2,900 (15.4)', () => {
    const run = summarizeRun(Array.from({ length: 10 }, () => ({ correct: true, timeMs: 1000 })));
    expect(run.points).toBe(2900);
    expect(run.bestStreak).toBe(10);
    expect(run.avgMs).toBe(1000);
  });

  it('summarizes best streak, average and fastest over the right answers only', () => {
    const run = summarizeRun([
      { correct: true, timeMs: 1500 }, { correct: true, timeMs: 3000 }, { correct: false, timeMs: 10000 },
      { correct: true, timeMs: 1200 },
    ]);
    expect(run.correct).toBe(3);
    expect(run.bestStreak).toBe(2);
    expect(run.avgMs).toBe(1900);
    expect(run.fastestMs).toBe(1200);
    expect(run.points).toBe(200 + Math.round((100 + 88) * 1.1) + 0 + 200);
  });

  it('labels use the live game thresholds', () => {
    expect([scoreLabel(10, 10), scoreLabel(8, 10), scoreLabel(6, 10), scoreLabel(4, 10), scoreLabel(3, 10), scoreLabel(0, 0)])
      .toEqual(['Perfect ear', 'Sharp listener', 'Solid fan', 'Getting there', 'Keep listening', 'Keep listening']);
  });
});

describe('playlists', () => {
  it('sends generate exactly the live game body', () => {
    expect(generateBody({ playlist: 'bts', label: 'BTS' }, 15)).toEqual({ playlist: 'bts', count: 15, mode: 'challenge' });
    expect(generateBody(groupPick({ slug: 'stray-kids', name: 'Stray Kids', songs: 18 }), 10)).toEqual({ playlist: 'stray-kids', count: 10, mode: 'challenge' });
  });

  it('labels and fixed ids', () => {
    expect(playlistLabel('all')).toBe('All K-pop');
    expect(playlistLabel('gg')).toBe('Girl groups');
    expect(playlistLabel('4th-gen')).toBe('4th gen');
    expect(playlistLabel('bts')).toBeNull();
    expect(playlistLabel('bts', 'BTS')).toBe('BTS');
    expect(isFixedPlaylist('title-tracks')).toBe(true);
    expect(isFixedPlaylist('twice')).toBe(false);
  });

  it('filters by name, case-insensitive, and makes initials', () => {
    const g = [{ name: 'NCT 127' }, { name: 'NCT Dream' }, { name: 'aespa' }];
    expect(filterGroups(g, 'nct').map((x) => x.name)).toEqual(['NCT 127', 'NCT Dream']);
    expect(filterGroups(g, '  ').length).toBe(3);
    expect([initials('AKMU'), initials('Apink'), initials('NCT Dream'), initials('(G)I-DLE')]).toEqual(['AK', 'AP', 'ND', 'GI']);
  });

  it('popular six: blindtest plays first, then quiz plays, then the alphabetical order', () => {
    const groups = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((s) => ({ slug: s, name: s.toUpperCase(), songs: 12 }));
    const six = popularSix(groups, { blindtest: { h: 3, g: 1 }, quiz: { a: 10, c: 50, g: 999 } });
    expect(six.map((x) => x.slug)).toEqual(['h', 'g', 'c', 'a', 'b', 'd']);
  });
});

describe('challenge', () => {
  const song = (i: number) => ({ id: `00000000-0000-4000-8000-00000000000${i}`, title: `Song ${i}`, artist_name: `Group ${i}` });
  const songs = [1, 2, 3, 4, 5].map(song);
  const q = (i: number, type: 'title' | 'artist' = 'title') => {
    const s = song(i);
    const correct = type === 'title' ? s.title : s.artist_name;
    const other = type === 'title' ? ['Other A', 'Other B', 'Other C'] : ['Band A', 'Band B', 'Band C'];
    return {
      song_id: s.id, question_type: type, question_text: 'Name the song', correct_answer: correct,
      choices: [other[0], correct, other[1], other[2]],
      reveal: { title: s.title, artist: s.artist_name, album: null, cover: 'https://cdn-images.dzcdn.net/x.jpg' },
      album_cover_medium: null, album_cover_big: 'javascript:alert(1)',
    };
  };
  const body = { playlist: 'all', questions: [q(1), q(2, 'artist'), q(3), q(4), q(5)], score: 4, total: 5, points: 900, timeMs: 21000, bestCombo: 3 };

  it('accepts a real run and drops non-https media', () => {
    const input = parseChallengeInput(body);
    expect(input).not.toBeNull();
    expect(input?.questions[0]?.album_cover_big).toBeNull();
    expect(input?.questions[0]?.reveal.cover).toBe('https://cdn-images.dzcdn.net/x.jpg');
    expect(questionsMatchSongs(input!.questions, songs)).toBe(true);
  });

  it('rejects bad shapes', () => {
    expect(parseChallengeInput(null)).toBeNull();
    expect(parseChallengeInput({ ...body, questions: body.questions.slice(0, 4), total: 4 })).toBeNull(); // under 5
    expect(parseChallengeInput({ ...body, total: 6 })).toBeNull();
    expect(parseChallengeInput({ ...body, score: 6 })).toBeNull();
    expect(parseChallengeInput({ ...body, bestCombo: 5 })).toBeNull(); // combo above score
    expect(parseChallengeInput({ ...body, playlist: 'All K-pop' })).toBeNull();
    expect(parseChallengeInput({ ...body, questions: [q(1), q(1), q(3), q(4), q(5)] })).toBeNull(); // duplicate song
    const noCorrect = { ...q(2), choices: ['a', 'b', 'c', 'd'] };
    expect(parseChallengeInput({ ...body, questions: [q(1), noCorrect, q(3), q(4), q(5)] })).toBeNull();
  });

  it('refuses a forged correct answer or reveal', () => {
    const forged = { ...q(2), correct_answer: 'Other A' };
    const input = parseChallengeInput({ ...body, questions: [q(1), forged, q(3), q(4), q(5)] });
    expect(input).not.toBeNull();
    expect(questionsMatchSongs(input!.questions, songs)).toBe(false);
    expect(questionsMatchSongs(parseChallengeInput(body)!.questions, songs.slice(0, 4))).toBe(false); // unknown song
  });

  it('codes are 6 unambiguous characters and links open the hub', () => {
    for (let i = 0; i < 200; i++) expect(CODE_RE.test(shortCode())).toBe(true);
    expect(shortCode(() => 0)).toBe('AAAAAA');
    expect(challengePath('7KQ2PX')).toBe('/blindtest?c=7KQ2PX');
    expect(CODE_RE.test('7KQ2P0')).toBe(false);
  });

  it('attempts must match the frozen length', () => {
    expect(parseAttemptInput({ score: 3, total: 5, points: 600, timeMs: 12000, bestCombo: 2 }, 5)).toEqual({ score: 3, total: 5, points: 600, timeMs: 12000, bestCombo: 2 });
    expect(parseAttemptInput({ score: 3, total: 10, points: 600, timeMs: 12000, bestCombo: 2 }, 5)).toBeNull();
    expect(parseAttemptInput({ score: 3, total: 5, points: -1, timeMs: 12000, bestCombo: 2 }, 5)).toBeNull();
  });

  it('a tie beats the challenge, like the prototype', () => {
    const v = { creatorName: 'blink_edits', creatorScore: 9, creatorTotal: 10 };
    expect(challengeOutcome(9, v)).toEqual({ won: true, head: 'You beat blink_edits', tail: ' (9/10).' });
    expect(challengeOutcome(7, v)).toEqual({ won: false, head: 'blink_edits wins this one', tail: ' (9/10). Same songs, one more try?' });
  });
});
