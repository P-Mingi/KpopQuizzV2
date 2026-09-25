// Server side of "Challenge a friend" (routes in app/api/ux-v1/p6/challenge/**).
// Reads with the service role like the live daily routes; writes go ONLY to the
// two challenge tables (mig 046: challenges, challenge_attempts), never to a
// profile, a play, XP or a streak.

import { createServerClient } from '@/lib/supabase/server';

import { CHALLENGE_TTL_MS, challengePath, questionsMatchSongs, shortCode } from './challenge';
import { playlistLabel, isFixedPlaylist } from './playlists';

import type { ChallengeInput, ChallengeView, FrozenQuestion } from './challenge';
import type { SupabaseClient } from '@supabase/supabase-js';

/** The signed-in viewer's public name (display name or username), or null for guests. */
export async function viewerName(): Promise<string | null> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('profiles').select('display_name, username').eq('id', user.id).maybeSingle();
  return (data?.display_name as string | null) || (data?.username as string | null) || null;
}

export type CreateResult =
  | { ok: true; code: string; path: string; expiresAt: string }
  | { ok: false; status: number; error: string };

/** Validate the questions against `songs`, then insert the challenge with a fresh code. */
export async function createChallenge(svc: SupabaseClient, input: ChallengeInput, creatorName: string | null, now = new Date()): Promise<CreateResult> {
  const ids = input.questions.map((q) => q.song_id);
  const { data: songs, error: songErr } = await svc.from('songs').select('id, title, artist_name').in('id', ids).eq('status', 'active');
  if (songErr) return { ok: false, status: 503, error: 'unavailable' };
  if (!questionsMatchSongs(input.questions, (songs ?? []) as { id: string; title: string; artist_name: string }[])) {
    return { ok: false, status: 400, error: 'invalid_questions' };
  }
  if (!isFixedPlaylist(input.playlist)) {
    const { data: g } = await svc.from('groups').select('id').eq('slug', input.playlist).maybeSingle();
    if (!g) return { ok: false, status: 400, error: 'invalid_playlist' };
  }
  const expiresAt = new Date(now.getTime() + CHALLENGE_TTL_MS).toISOString();
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = shortCode();
    const { error } = await svc.from('challenges').insert({
      short_code: code,
      playlist: input.playlist,
      mode: 'challenge',
      difficulty: 'all',
      questions: input.questions,
      creator_player_id: null,
      creator_name: creatorName ?? 'A fan',
      creator_score: input.points,
      creator_correct: input.score,
      creator_total: input.total,
      creator_time: Math.round(input.timeMs / 100) / 10,
      creator_best_combo: input.bestCombo,
      expires_at: expiresAt,
    });
    if (!error) return { ok: true, code, path: challengePath(code), expiresAt };
    if (error.code !== '23505') return { ok: false, status: 503, error: 'unavailable' }; // not a code collision
  }
  return { ok: false, status: 503, error: 'unavailable' };
}

interface ChallengeRow {
  id: string;
  short_code: string;
  playlist: string;
  questions: FrozenQuestion[];
  creator_name: string;
  creator_correct: number;
  creator_total: number;
  expires_at: string;
}

export async function findChallenge(svc: SupabaseClient, code: string): Promise<ChallengeRow | null> {
  const { data } = await svc
    .from('challenges')
    .select('id, short_code, playlist, questions, creator_name, creator_correct, creator_total, expires_at')
    .eq('short_code', code)
    .maybeSingle();
  return (data as ChallengeRow | null) ?? null;
}

/** Re-fetch fresh preview URLs from Deezer (stored links expire), like the generate route. */
async function freshPreviews(svc: SupabaseClient, ids: string[]): Promise<Map<string, string>> {
  const { data } = await svc.from('songs').select('id, deezer_track_id, preview_url').in('id', ids);
  const rows = (data ?? []) as { id: string; deezer_track_id: number; preview_url: string }[];
  const out = new Map<string, string>();
  await Promise.all(rows.map(async (s) => {
    let url = s.preview_url;
    try {
      const res = await fetch(`https://api.deezer.com/track/${s.deezer_track_id}`);
      const t = (await res.json()) as { preview?: string };
      if (typeof t.preview === 'string' && t.preview.length > 10) url = t.preview;
    } catch {
      // keep the stored URL
    }
    out.set(s.id, url);
  }));
  return out;
}

export async function challengeView(svc: SupabaseClient, row: ChallengeRow, now = new Date()): Promise<ChallengeView> {
  const expired = Date.parse(row.expires_at) <= now.getTime();
  let label = playlistLabel(row.playlist);
  if (!label) {
    const { data: g } = await svc.from('groups').select('name').eq('slug', row.playlist).maybeSingle();
    label = (g?.name as string | undefined) ?? 'K-pop';
  }
  let questions: ChallengeView['questions'] = [];
  if (!expired) {
    const previews = await freshPreviews(svc, row.questions.map((q) => q.song_id));
    questions = row.questions.map((q) => ({ ...q, preview_url: previews.get(q.song_id) ?? '' }));
  }
  return {
    code: row.short_code,
    playlist: row.playlist,
    label,
    creatorName: row.creator_name,
    creatorScore: row.creator_correct,
    creatorTotal: row.creator_total,
    expiresAt: row.expires_at,
    expired,
    questions,
  };
}
