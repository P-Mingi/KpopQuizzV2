// The signed-in fan's own rows of the v11 leaderboard (P9): their fandom's place in
// the war and the points they added this week, their rank among players (XP) and
// among creators (plays received). READ ONLY: selects and head counts, nothing is
// written. Only the viewer's own public fields leave the server (privacy fail-closed:
// no user id, no email).

import { getFandomWarMap } from '@/lib/db/queries/community';

import { avatarOf, fandomLabel, levelLine, realFandomName } from './format';

import type { SupabaseClient } from '@supabase/supabase-js';
import type { AvatarView } from './format';

export interface P9Standing {
  signedIn: boolean;
  me: null | { username: string; href: string; avatar: AvatarView; accent: string | null; font: string | null; bias: string | null };
  /** null = no main group picked in Settings. */
  war: null | { slug: string; href: string; fandom: string; group: string; rank: number | null; points: number };
  player: null | { rank: number | null; xp: number; line: string };
  creator: null | { rank: number | null; quizzes: number; plays: number };
}

export const SIGNED_OUT: P9Standing = { signedIn: false, me: null, war: null, player: null, creator: null };

interface OwnProfile {
  username: string;
  avatar_url: string | null;
  avatar_kind: string | null;
  avatar_ref: string | null;
  xp: number | null;
  ult_groups: string[] | null;
  total_quizzes_created: number | null;
  total_plays_received: number | null;
  name_accent: string | null;
  name_font: string | null;
  bias: string | null;
}

/** Last 7 days, the war map's own window (get_fandom_war_map: now() - 7 days). */
export function weekStart(now: Date): string {
  return new Date(now.getTime() - 7 * 86_400_000).toISOString();
}

/** Rank = 1 + the number of rows strictly above (ties share a rank). */
export function rankFrom(countAbove: number | null): number | null {
  return countAbove === null ? null : countAbove + 1;
}

/**
 * The viewer's standing. `db` is the request's cookie client (RLS as the viewer);
 * `userId` comes from auth.getUser() on the server, never from the request.
 */
export async function readStanding(db: SupabaseClient, userId: string, now: Date = new Date()): Promise<P9Standing> {
  const { data: prof, error } = await db
    .from('profiles')
    .select('username, avatar_url, avatar_kind, avatar_ref, xp, ult_groups, total_quizzes_created, total_plays_received, name_accent, name_font, bias')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw new Error(`[p9 standing] profile: ${error.message}`);
  if (!prof) return SIGNED_OUT;
  const p = prof as OwnProfile;
  const xp = p.xp ?? 0;
  const quizzes = p.total_quizzes_created ?? 0;
  const plays = p.total_plays_received ?? 0;
  const mainSlug = Array.isArray(p.ult_groups) && typeof p.ult_groups[0] === 'string' ? p.ult_groups[0] : null;

  const [playersAbove, creatorsAbove, group] = await Promise.all([
    xp > 0
      ? db.from('profiles').select('id', { count: 'exact', head: true }).gt('xp', xp).then((r) => r.count ?? null)
      : Promise.resolve(null),
    quizzes > 0
      ? db.from('profiles').select('id', { count: 'exact', head: true }).gt('total_quizzes_created', 0).gt('total_plays_received', plays).then((r) => r.count ?? null)
      : Promise.resolve(null),
    mainSlug
      ? db.from('groups').select('id, slug, name, fandom_name, generation').eq('slug', mainSlug).maybeSingle().then((r) => (r.data as { id: number; slug: string; name: string; fandom_name: string | null; generation: string | null } | null))
      : Promise.resolve(null),
  ]);

  let war: P9Standing['war'] = null;
  if (group) {
    const [board, mine] = await Promise.all([
      getFandomWarMap(90),
      // The viewer's quiz plays on this group's quizzes in the war's window: each is one point.
      db.from('plays').select('id, quizzes!inner(group_id)', { count: 'exact', head: true })
        .eq('player_id', userId)
        .gt('created_at', weekStart(now))
        .eq('quizzes.group_id', group.id)
        .then((r) => r.count ?? 0),
    ]);
    const i = board.findIndex((g) => g.slug === group.slug);
    war = {
      slug: group.slug,
      href: `/${group.slug}-quiz`,
      fandom: fandomLabel(group).name,
      group: group.name,
      rank: i >= 0 ? i + 1 : null,
      points: mine,
    };
  }

  const facts = group ? realFandomName(group.fandom_name) : null;
  return {
    signedIn: true,
    me: { username: p.username, href: `/u/${encodeURIComponent(p.username)}`, avatar: avatarOf(p), accent: p.name_accent, font: p.name_font, bias: p.bias },
    war,
    player: { rank: xp > 0 ? rankFrom(playersAbove) : null, xp, line: levelLine(xp, facts) },
    creator: { rank: quizzes > 0 ? rankFrom(creatorsAbove) : null, quizzes, plays },
  };
}
