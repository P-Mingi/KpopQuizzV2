// Today's Blindtest of the day board for the v11 hub (DESIGN-SPEC 16.7 "Today's
// board (your row: Play or your score)"). READ ONLY: the same rows the live
// GET /api/daily/blindtest/leaderboard reads (daily_blindtest_scores ranked by
// score desc, time asc, the RPC get_daily_bt_leaderboard), plus the public flair
// columns of those profiles. Never returns another user's id or email.

import type { SupabaseClient } from '@supabase/supabase-js';

import type { BoardMe, BoardResponse, BoardRow } from './board-types';

export const BOARD_TOP = 5;

export function todayUtc(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function msToUtcMidnight(now = new Date()): number {
  const next = new Date(now);
  next.setUTCHours(24, 0, 0, 0);
  return next.getTime() - now.getTime();
}

interface ProfileRow {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  name_accent: string | null;
  name_font: string | null;
  bias: string | null;
}

const PROFILE_COLS = 'id, username, display_name, avatar_url, name_accent, name_font, bias';

function nameOf(p: Pick<ProfileRow, 'display_name' | 'username'> | undefined): string {
  return p?.display_name || p?.username || 'Anonymous';
}

/**
 * `svc` reads (service role, same as the live leaderboard route); `userId` is the
 * signed-in viewer resolved from the session by the caller, or null.
 */
export async function readBoard(svc: SupabaseClient, userId: string | null, now = new Date()): Promise<BoardResponse> {
  const date = todayUtc(now);
  const [{ data: top }, { count }] = await Promise.all([
    svc.from('daily_blindtest_scores').select('user_id, score, time_ms').eq('date', date)
      .order('score', { ascending: false }).order('time_ms', { ascending: true }).limit(BOARD_TOP),
    svc.from('daily_blindtest_scores').select('user_id', { count: 'exact', head: true }).eq('date', date),
  ]);
  const topRows = (top ?? []) as { user_id: string; score: number; time_ms: number }[];

  const ids = [...new Set([...topRows.map((r) => r.user_id), ...(userId ? [userId] : [])])];
  const { data: profs } = ids.length
    ? await svc.from('profiles').select(PROFILE_COLS).in('id', ids)
    : { data: [] as ProfileRow[] };
  const byId = new Map(((profs ?? []) as ProfileRow[]).map((p) => [p.id, p]));

  const rows: BoardRow[] = topRows.map((r, i) => {
    const p = byId.get(r.user_id);
    return {
      rank: i + 1,
      name: nameOf(p),
      username: p?.username ?? null,
      avatarUrl: p?.avatar_url ?? null,
      accent: p?.name_accent ?? null,
      font: p?.name_font ?? null,
      bias: p?.bias ?? null,
      score: Number(r.score),
      timeMs: Number(r.time_ms),
    };
  });

  let me: BoardMe | null = null;
  if (userId) {
    const [{ data: mine }, { data: best }, { data: bt }] = await Promise.all([
      svc.from('daily_blindtest_scores').select('score, time_ms').eq('date', date).eq('user_id', userId).maybeSingle(),
      svc.from('daily_blindtest_scores').select('score').eq('user_id', userId).order('score', { ascending: false }).limit(1).maybeSingle(),
      svc.from('bt_players').select('rank_title').eq('user_id', userId).maybeSingle(),
    ]);
    let rank: number | null = null;
    if (mine) {
      const s = Number(mine.score);
      const t = Number(mine.time_ms);
      // Same rank rule as the live leaderboard: rows that beat me + 1.
      const { count: ahead } = await svc.from('daily_blindtest_scores').select('user_id', { count: 'exact', head: true })
        .eq('date', date).or(`score.gt.${s},and(score.eq.${s},time_ms.lt.${t})`);
      rank = (ahead ?? 0) + 1;
    }
    const p = byId.get(userId);
    me = {
      played: Boolean(mine),
      rank,
      score: mine ? Number(mine.score) : null,
      timeMs: mine ? Number(mine.time_ms) : null,
      best: best ? Number(best.score) : null,
      rankTitle: (bt?.rank_title as string | null | undefined) ?? null,
      name: nameOf(p),
      avatarUrl: p?.avatar_url ?? null,
    };
  }

  return { date, total: count ?? 0, resetsInMs: msToUtcMidnight(now), top: rows, me };
}
