import { describe, expect, it } from 'vitest';

import { STATIC_MODES } from '@/lib/blind-test-modes';

import { legacyGenerateBody, legacyModeRun, roundFromGenerate } from './legacy-round';

// What POST /api/blind-test/generate answers today (a stubbed body with the
// route's own field names).
const question = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  song_id: 'b1f0c7c2-0000-4000-8000-000000000001',
  question_type: 'title',
  question_text: 'Name the song',
  preview_url: 'https://cdnt-preview.dzcdn.net/api/1/1/abc.mp3',
  album_cover_medium: 'https://cdn-images.dzcdn.net/images/cover/x/250x250.jpg',
  album_cover_big: 'https://cdn-images.dzcdn.net/images/cover/x/500x500.jpg',
  correct_answer: 'Dynamite',
  choices: ['Butter', 'Dynamite', 'DNA', 'Fake Love'],
  reveal: { title: 'Dynamite', artist: 'BTS', album: 'BE', cover: 'https://cdn-images.dzcdn.net/images/cover/x/500x500.jpg' },
  ...over,
});
const body = (questions: unknown[], over: Record<string, unknown> = {}): Record<string, unknown> => ({
  questions, playlist: 'all', mode: 'challenge', difficulty: 'all', timer_duration: 10, songs_count: 10,
  all_artists: ['BTS'], all_titles: ['Dynamite'], ...over,
});

describe('roundFromGenerate', () => {
  it('maps the current response to a playable round', () => {
    const round = roundFromGenerate(body([
      question(),
      question({ song_id: 's2', question_type: 'artist', question_text: 'Which group is this?', correct_answer: 'BLACKPINK',
        choices: ['TWICE', 'aespa', 'BLACKPINK', 'IVE'], reveal: { title: 'Pink Venom', artist: 'BLACKPINK', album: null, cover: null } }),
    ]));
    expect(round).not.toBeNull();
    expect(round!.timer).toBe(10);
    expect(round!.songs).toHaveLength(2);
    expect(round!.songs[0]).toMatchObject({
      song_id: 'b1f0c7c2-0000-4000-8000-000000000001', correct_index: 1, title: 'Dynamite', artist: 'BTS',
      question_text: 'Name the song', preview_url: 'https://cdnt-preview.dzcdn.net/api/1/1/abc.mp3',
    });
    expect(round!.songs[0]!.choices[round!.songs[0]!.correct_index]).toBe('Dynamite');
    // An artist question: the right choice is the artist, the reveal still names the song.
    expect(round!.songs[1]).toMatchObject({ correct_index: 2, title: 'Pink Venom', artist: 'BLACKPINK', question_text: 'Which group is this?' });
    // No cover in the reveal: the album cover of the question is used.
    expect(round!.songs[1]!.cover).toBe('https://cdn-images.dzcdn.net/images/cover/x/500x500.jpg');
  });

  it('the shape the old player expected ({ songs: [...] } with YouTube ids) is not a round', () => {
    expect(roundFromGenerate({ mode_id: 'classic', songs: [{ song_id: 'x', youtube_id: 'abc', clip_start: 30, choices: ['a', 'b'] }] })).toBeNull();
  });

  it('an error body, an empty list and junk are not a round', () => {
    expect(roundFromGenerate({ error: 'Not enough songs' })).toBeNull();
    expect(roundFromGenerate(body([]))).toBeNull();
    expect(roundFromGenerate(null)).toBeNull();
    expect(roundFromGenerate('nope')).toBeNull();
    expect(roundFromGenerate({ questions: 'nope' })).toBeNull();
  });

  it('drops a question it could not play or score, keeps the others', () => {
    const round = roundFromGenerate(body([
      question({ song_id: 'no-preview', preview_url: '' }),
      question({ song_id: 'http-preview', preview_url: 'http://insecure.example/x.mp3' }),
      question({ song_id: 'answer-missing', correct_answer: 'Not A Choice' }),
      question({ song_id: 'one-choice', choices: ['Dynamite'] }),
      null,
      question({ song_id: 'good' }),
    ]));
    expect(round!.songs.map((s) => s.song_id)).toEqual(['good']);
  });

  it('keeps the timer inside what a 30 second preview can serve', () => {
    expect(roundFromGenerate(body([question()], { timer_duration: 15 }))!.timer).toBe(15);
    expect(roundFromGenerate(body([question()], { timer_duration: 999 }))!.timer).toBe(30);
    expect(roundFromGenerate(body([question()], { timer_duration: 0 }))!.timer).toBe(3);
    expect(roundFromGenerate(body([question()], { timer_duration: undefined }))!.timer).toBe(10);
  });
});

describe('legacyGenerateBody', () => {
  it('every static mode page asks generate for a playlist it serves', () => {
    const served = new Set(['all', 'gg', 'bg', 'solo', '1st-gen', '2nd-gen', '3rd-gen', '4th-gen', '5th-gen', 'title-tracks', 'hits', 'deep']);
    for (const mode of STATIC_MODES) {
      const req = legacyGenerateBody(mode.id);
      expect(req, mode.id).not.toBeNull();
      expect(served.has(req!.playlist), `${mode.id} -> ${req!.playlist}`).toBe(true);
      expect(req!.count).toBeGreaterThanOrEqual(5);
      expect(req!.count).toBeLessThanOrEqual(15);
      expect(req!.mode).toBe('challenge');
      // The old request ({ mode_id }) is gone: generate ignores it and would serve 'all'.
      expect(req).not.toHaveProperty('mode_id');
    }
  });

  it('a group mode asks for its group, an unknown id for nothing', () => {
    expect(legacyGenerateBody('group-stray-kids')).toEqual({ playlist: 'stray-kids', count: 10, mode: 'challenge' });
    expect(legacyModeRun('group-stray-kids')!.pick.label).toBe('Stray Kids');
    expect(legacyGenerateBody('not-a-mode')).toBeNull();
  });
});
