// Is this Deezer album a soundtrack (drama, film, series, webtoon or game OST)? Its cover is then
// most likely the key art of the show, which the game never displays (Mission U, part C). Pure, no
// import: read by isCoverHidden (lib/blind-test-curated.ts).
//
// The rules mirror docs/pending-migrations/songs-hide-cover.sql one for one (Postgres ~* with \m \M
// word boundaries there, /i with \b here), so the code hides exactly the albums the SQL flags, before
// and after the owner runs it. Matched on the real catalogue (2026-10-15): 147 albums, 177 songs, the
// list in docs/pending-migrations/songs-hide-cover-ALBUMS.md. Whole words only: "LOST", "Ghost",
// "nostalgia" or "Lost and Found" never read as OST, and "Drama" alone is an album title (aespa,
// 9Muses), not a soundtrack.

export interface SoundtrackRule {
  /** What the rule catches, for the reader and the albums list. */
  label: string;
  test: (albumName: string) => boolean;
}

const re = (pattern: RegExp) => (name: string): boolean => pattern.test(name);

export const SOUNDTRACK_RULES: readonly SoundtrackRule[] = [
  // "Original Television Soundtrack", "Original Sound Track", "FAST X Soundtrack", and the catalogue's
  // own typo "Original Television Sountrack".
  { label: 'soundtrack', test: re(/\bsound? ?tracks?\b/i) },
  // The word OST ("Perfect Crown OST Part.4"), but not an album titled just "OST": Ash Island's 2024
  // single "OST (Feat. CHANMINA)" is a song title, not a soundtrack.
  { label: 'OST', test: (name) => /\bost\b/i.test(name) && !/^\s*ost\s*$/i.test(name) },
  { label: 'from the Netflix', test: re(/\bfrom the netflix\b/i) },
  { label: 'Disney+ Original', test: re(/\bdisney\+ original\b/i) },
  // "Music from the HBO Original Series", "Music from the Original TV Series".
  { label: 'original / TV series', test: re(/\b(?:original|tv|television) series\b/i) },
  { label: 'from the series', test: re(/\bfrom the series\b/i) },
  { label: 'motion picture', test: re(/\bmotion pictures?\b/i) },
  // "Messy (From F1® The Movie)". A bare "MOVIE" or "The Movie Star" is an album title.
  { label: 'from ... the movie', test: re(/\bfrom\b[^()]*\bthe (?:movie|film)\b/i) },
];

/** The first rule an album name matches, or null when it is not a soundtrack. */
export function soundtrackRule(albumName: string | null | undefined): SoundtrackRule | null {
  if (typeof albumName !== 'string' || albumName.trim() === '') return null;
  return SOUNDTRACK_RULES.find((r) => r.test(albumName)) ?? null;
}

/** Is this album name a soundtrack (drama, film, series, webtoon or game OST)? */
export function isSoundtrackAlbum(albumName: string | null | undefined): boolean {
  return soundtrackRule(albumName) !== null;
}
