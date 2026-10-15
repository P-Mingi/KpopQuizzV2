import { describe, expect, it } from 'vitest';

import { isSoundtrackAlbum, soundtrackRule, SOUNDTRACK_RULES } from './soundtrack-album';

// Mission U, part C: the album-name classifier behind isCoverHidden. Every name below is a real
// `songs.album_name`, read from the catalogue on 2026-10-15 (docs/pending-migrations/
// songs-hide-cover-ALBUMS.md), the mission's own examples included.

const SOUNDTRACKS: ReadonlyArray<[string, string]> = [
  // The three the mission names.
  ['Our Beloved Summer (Original Television Soundtrack), Pt. 5', 'soundtrack'],
  ['Perfect Crown OST Part.4', 'OST'],
  ['Boyfriend on Demand Part 2 (Soundtrack from the Netflix Series)', 'soundtrack'],
  // More from the catalogue, one per shape.
  ['Crash Landing on You OST Part 11', 'OST'],
  ['CART OST', 'OST'],
  ['Falling (Run On OST Part.10)', 'OST'],
  ['All About Eve (MBC DRAMA) OST', 'OST'],
  ['THE GIRLS (BLACKPINK THE GAME OST)', 'OST'],
  ['Hotel del Luna (Original Television Soundtrack) Pt. 13', 'soundtrack'],
  ['SISYPHUS: THE MYTH (Original Television Soundtracks, Pt. 3)', 'soundtrack'],
  ["The story of Park’s marriage contract (Original Television Sountrack)", 'soundtrack'],
  ['School 2017 (Orignial Television Soundtrack)', 'soundtrack'],
  ['You are my destiny, Pt.6 (Original Sound Track)', 'soundtrack'],
  ['Kiss Sixth Sense, Pt. 1 (Original Soundtrack from the Disney+ Original)', 'soundtrack'],
  ['KPOPPED (Apple TV+ Original Series Soundtrack) Vol. 1', 'soundtrack'],
  ['Angel Pt. 2 (feat. Jimin of BTS, Charlie Puth and Muni Long / FAST X Soundtrack) (FAST X Soundtrack)', 'soundtrack'],
  ['Melting (Maybe Meant to Be X DINDIN, YUJU) (Original Webtoon Soundtrack)', 'soundtrack'],
  ['꽃보다 남자 (Original Television Soundtrack) Pt. 2', 'soundtrack'],
  ['Flame (from the Netflix Series "Jentry Chau vs the Underworld")', 'from the Netflix'],
  ['HWARANG, Pt. 2 (Music from the Original TV Series)', 'original / TV series'],
  ['The Idol Episode 4 (Music from the HBO Original Series)', 'original / TV series'],
  ['Come Play (Kordhell Remix) (from the series Arcane League of Legends)', 'from the series'],
  ['K-POPS! (Music from and inspired by K-POPS! Motion Picture)', 'motion picture'],
  ['Aftertaste (Inspired by the Original Motion Picture K-POPS!)', 'motion picture'],
  ['Messy (From F1® The Movie)', 'from ... the movie'],
];

const NOT_SOUNDTRACKS: readonly string[] = [
  // The traps the mission names.
  'Drama - The 4th Mini Album', // aespa
  'LOST', // 9Muses
  'Lost and Found', // VERIVERY
  'nostalgia', // VICTON, JUNNY
  'Ghost', // BABYMONSTER
  // More real near misses from the catalogue.
  'DRAMA', // 9Muses
  'OST', // Ash Island: a single whose song is titled "OST (Feat. CHANMINA)"
  'lost', // Dvwn
  'Ghost Light (Nightcore)', // EVERGLOW
  'Ghost of You', // Ash Island
  'MOVIE', // JUNNY
  'The Movie Star', // Bewhy
  'Like A Film : 4 Songs', // Giriboy
  'Filmhaye Farsi', // THE BOYZ
  "SERIES 'O' [ROUND 3 : WHOLE]", // VERIVERY
  "LOSE YOUR SHXT ('Hearts' Series Vol. 3)", // YOUNG POSSE
  'My Style (Hidden Track)', // Brown Eyed Girls
  'Sound-G Sign', // Brown Eyed Girls
  'Now (Original by Fin.K.L)', // ONEUS
  // Ordinary albums.
  'Love Yourself 轉 \'Tear\'', // BTS
  'GOLDEN HOUR : Part.3', // ATEEZ
  'The Chaos Chapter: FREEZE', // TXT
  'Goals (FIFA World Cup 2026™)', // Lisa
];

describe('isSoundtrackAlbum: real soundtrack albums', () => {
  it.each(SOUNDTRACKS)('%s -> %s', (name, rule) => {
    expect(isSoundtrackAlbum(name)).toBe(true);
    expect(soundtrackRule(name)?.label).toBe(rule);
  });

  it('is case insensitive', () => {
    expect(isSoundtrackAlbum('perfect crown ost part.4')).toBe(true);
    expect(isSoundtrackAlbum('OUR BELOVED SUMMER (ORIGINAL TELEVISION SOUNDTRACK), PT. 5')).toBe(true);
  });
});

describe('isSoundtrackAlbum: albums that only look like one', () => {
  it.each(NOT_SOUNDTRACKS.map((n) => [n]))('%s is not a soundtrack', (name) => {
    expect(isSoundtrackAlbum(name)).toBe(false);
    expect(soundtrackRule(name)).toBeNull();
  });

  it('no album name, no soundtrack', () => {
    for (const v of [null, undefined, '', '   ']) expect(isSoundtrackAlbum(v)).toBe(false);
  });
});

describe('the rule list', () => {
  it('has the eight rules of docs/pending-migrations/songs-hide-cover.sql, in its order', () => {
    expect(SOUNDTRACK_RULES.map((r) => r.label)).toEqual([
      'soundtrack', 'OST', 'from the Netflix', 'Disney+ Original', 'original / TV series', 'from the series', 'motion picture', 'from ... the movie',
    ]);
  });

  it('the SQL file carries one line per rule, with the same patterns', async () => {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const sql = readFileSync(fileURLToPath(new URL('../../../../docs/pending-migrations/songs-hide-cover.sql', import.meta.url)), 'utf8');
    for (const line of [
      String.raw`album_name ~* '\msound? ?tracks?\M'`,
      String.raw`(album_name ~* '\most\M' and album_name !~* '^\s*ost\s*$')`,
      String.raw`album_name ~* '\mfrom the netflix\M'`,
      String.raw`album_name ~* '\mdisney\+ original\M'`,
      String.raw`album_name ~* '\m(original|tv|television) series\M'`,
      String.raw`album_name ~* '\mfrom the series\M'`,
      String.raw`album_name ~* '\mmotion pictures?\M'`,
      String.raw`album_name ~* '\mfrom\M[^()]*\mthe (movie|film)\M'`,
    ]) expect(sql, line).toContain(line);
  });
});
