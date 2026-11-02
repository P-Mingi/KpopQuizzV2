// ADMIN-1 review: the columns an admin may write on blind_test_songs, the ones the POST route inserts (admin-lock.static.test.ts pins the two
// lists together). PUT writes with the service role, so anything else a body carries (id, created_at, an unknown column) never reaches it.
export const SONG_WRITE_FIELDS = [
  'title', 'artist', 'group_id', 'youtube_id', 'year', 'is_title_track', 'gender', 'generation',
  'clip_intro', 'clip_chorus', 'clip_verse', 'clip_bridge', 'wrong_answers', 'status',
] as const;

/** The allowed columns the body really carries: a field left out stays as it is in the row. */
export function pickSongFields(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const field of SONG_WRITE_FIELDS) if (Object.hasOwn(body, field)) out[field] = body[field];
  return out;
}
