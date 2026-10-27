// Run O1, lot H2b: Top fans, the five best fans of the week on both sites (Plan.dc.html, section 3.D): the XP earned this week, public
// profiles only, Team accounts out.
//
// Who may appear (privacy fails closed): a member with a PUBLIC STAMP, that is world_memberships.show_elsewhere true on an activated,
// not banned membership of KpopQuiz or OtakuQuiz (the switch the passport already uses for what other sites may see: public_passport
// applies the same rule). Only the XP of public stamps counts, and the sites shown are the public stamps. The level is printed only when
// passport_prefs.show_passport_level is true, else null. Active or retired Team accounts (editorial_accounts, any row) are excluded; if
// that list cannot be read the block fails (the last good value or nothing), it never shows a list it could not check.
// The default of show_elsewhere is false, so a board starts small and grows with the fans who opt in.
//
// XP of the week:
//   'snapshots'  XP now minus XP on the oldest daily snapshot of the last 7 days (docs/pending-migrations/hub/002-xp-daily-snapshots.sql)
//                when that table exists and has a snapshot at least one day old. No XP ledger exists; this is the exact figure.
//   'plays'      without the table: the XP of the quiz plays of the last 7 UTC days, as the play route awards it (10, +5 from 70%, +15 at
//                100%), once per player and quiz. An estimate (other XP sources are ignored, and a quiz first played before the window
//                counts again), used for the ranking only: no XP number is printed on the page.

import { fetchAllRows } from '@/lib/db/fetch-all';
import { getLevelInfo } from '@/lib/constants';
import { createServiceRoleClient } from '@/lib/supabase/server';

import { hubCached } from './cache';
import { chunk, DAY_MS, HUB_SITES, isHubSite, must, resolveOrigins, utcDate } from './util';

import type { HubOpts, HubOrigins, HubSite, HubTopFan, HubTopFans } from './types';

type Db = ReturnType<typeof createServiceRoleClient>;

export const TOP_FANS_SIZE = 5;
export const TOP_FANS_DAYS = 7;

export interface Stamp { readonly user_id: string; readonly site_id: HubSite; readonly xp: number | null }
export interface ProfileInfo { readonly id: string; readonly username: string | null; readonly xp: number | null; readonly banned_at: string | null }

/** XP of one first completion, as the play route awards it. */
export function playXp(score: number, total: number): number {
  const pct = total > 0 ? Math.min(1, Math.max(0, score / total)) : 0;
  return 10 + (pct >= 0.7 ? 5 : 0) + (pct >= 1 ? 15 : 0);
}

const key = (user: string, site: string): string => `${user}:${site}`;

export interface RankInput {
  readonly stamps: readonly Stamp[];
  readonly profiles: ReadonlyMap<string, ProfileInfo>;
  /** Users whose level is public. */
  readonly levelPublic: ReadonlySet<string>;
  readonly teamIds: ReadonlySet<string>;
  /** XP of the week per `user:site`. */
  readonly weekXp: ReadonlyMap<string, number>;
  readonly origins: HubOrigins;
}

/** The pure ranking: public stamps only, Team out, banned out, no username out, best week first, ties by handle. */
export function rankFans(input: RankInput): HubTopFan[] {
  const byUser = new Map<string, Stamp[]>();
  for (const s of input.stamps) {
    if (input.teamIds.has(s.user_id)) continue;
    const list = byUser.get(s.user_id) ?? [];
    list.push(s);
    byUser.set(s.user_id, list);
  }
  const rows: Array<{ handle: string; week: number; level: number | null; kpop: boolean; anime: boolean }> = [];
  for (const [user, stamps] of byUser) {
    const p = input.profiles.get(user);
    const handle = p?.username?.trim();
    if (!p || p.banned_at || !handle) continue;
    const week = stamps.reduce((sum, s) => sum + (input.weekXp.get(key(user, s.site_id)) ?? 0), 0);
    if (week <= 0) continue;
    const total = stamps.reduce((sum, s) => sum + Math.max(0, s.site_id === 'kpop' ? (p.xp ?? 0) : (s.xp ?? 0)), 0);
    rows.push({
      handle,
      week,
      level: input.levelPublic.has(user) ? getLevelInfo(total, 'hub').level : null,
      kpop: stamps.some((s) => s.site_id === 'kpop'),
      anime: stamps.some((s) => s.site_id === 'anime'),
    });
  }
  rows.sort((a, b) => b.week - a.week || (a.handle < b.handle ? -1 : 1));
  return rows.slice(0, TOP_FANS_SIZE).map((r, i) => ({
    rank: i + 1,
    handle: r.handle,
    initial: r.handle.charAt(0).toUpperCase(),
    level: r.level,
    kpop: r.kpop,
    anime: r.anime,
    href: `${input.origins.hub}/u/${r.handle}`,
  }));
}

async function loadTeamIds(db: Db): Promise<Set<string>> {
  // site-scope: the Team accounts of every site are left out of the board, so the list is deliberately not filtered by site
  const rows = await fetchAllRows<{ user_id: string }>(() => db.from('editorial_accounts').select('user_id').order('user_id'));
  return new Set(rows.map((r) => r.user_id));
}

async function loadStamps(db: Db): Promise<Stamp[]> {
  const rows = await fetchAllRows<{ user_id: string; site_id: string; xp: number | null }>(() =>
    db.from('world_memberships').select('user_id, site_id, xp').in('site_id', HUB_SITES).eq('show_elsewhere', true)
      .not('activated_at', 'is', null).is('banned_at', null).order('user_id').order('site_id'));
  return rows.filter((r): r is Stamp => isHubSite(r.site_id));
}

async function loadProfiles(db: Db, ids: readonly string[]): Promise<Map<string, ProfileInfo>> {
  const out = new Map<string, ProfileInfo>();
  for (const part of chunk(ids, 100)) {
    for (const p of must<ProfileInfo[]>(await db.from('profiles').select('id, username, xp, banned_at').in('id', part), 'profiles')) out.set(p.id, p);
  }
  return out;
}

async function loadLevelPublic(db: Db, ids: readonly string[]): Promise<Set<string>> {
  const out = new Set<string>();
  for (const part of chunk(ids, 100)) {
    for (const r of must<Array<{ user_id: string; show_passport_level: boolean | null }>>(
      await db.from('passport_prefs').select('user_id, show_passport_level').in('user_id', part), 'passport_prefs')) {
      if (r.show_passport_level === true) out.add(r.user_id);
    }
  }
  return out;
}

/** XP now minus the snapshot of the oldest day in the last 7 that has one; null when there is no usable snapshot (or no table). */
export async function weekXpFromSnapshots(db: Db, stamps: readonly Stamp[], profiles: ReadonlyMap<string, ProfileInfo>, now: Date): Promise<Map<string, number> | null> {
  const today = utcDate(now);
  const first = utcDate(new Date(now.getTime() - TOP_FANS_DAYS * DAY_MS));
  let rows: Array<{ day: string; user_id: string; site_id: string; xp: number }>;
  try {
    rows = [];
    for (const part of chunk([...new Set(stamps.map((s) => s.user_id))], 100)) {
      const got = await fetchAllRows<{ day: string; user_id: string; site_id: string; xp: number }>(() =>
        db.from('xp_daily_snapshots').select('day, user_id, site_id, xp').in('user_id', part).gte('day', first).lt('day', today).order('day').order('user_id').order('site_id'));
      rows.push(...got);
    }
    const any = await db.from('xp_daily_snapshots').select('day').gte('day', first).lt('day', today).order('day').limit(1);
    if (any.error) return null;
    const baseline = (any.data as Array<{ day: string }> | null)?.[0]?.day;
    if (!baseline) return null;
    const base = new Map<string, number>();
    for (const r of rows) if (r.day === baseline) base.set(key(r.user_id, r.site_id), r.xp);
    const out = new Map<string, number>();
    for (const s of stamps) {
      const now_ = s.site_id === 'kpop' ? (profiles.get(s.user_id)?.xp ?? 0) : (s.xp ?? 0);
      out.set(key(s.user_id, s.site_id), Math.max(0, now_ - (base.get(key(s.user_id, s.site_id)) ?? 0)));
    }
    return out;
  } catch {
    return null;
  }
}

/** The estimate from the quiz plays of the last 7 days (see the header). */
export async function weekXpFromPlays(db: Db, stamps: readonly Stamp[], now: Date): Promise<Map<string, number>> {
  const since = `${utcDate(new Date(now.getTime() - (TOP_FANS_DAYS - 1) * DAY_MS))}T00:00:00Z`;
  const sites = new Map<string, Set<string>>();
  for (const s of stamps) {
    const set = sites.get(s.user_id) ?? new Set<string>();
    set.add(s.site_id);
    sites.set(s.user_id, set);
  }
  const out = new Map<string, number>();
  for (const part of chunk([...sites.keys()], 50)) {
    const rows = await fetchAllRows<{ player_id: string; quiz_id: string; score: number; total_questions: number; quizzes: { site_id: string } | Array<{ site_id: string }> | null }>(() =>
      db.from('plays').select('player_id, quiz_id, score, total_questions, quizzes!inner(site_id)').in('player_id', part).gte('created_at', since).order('created_at').order('id'));
    const seen = new Set<string>();
    for (const r of rows) {
      const q = Array.isArray(r.quizzes) ? r.quizzes[0] : r.quizzes;
      const site = q?.site_id;
      if (!site || !sites.get(r.player_id)?.has(site)) continue;
      const once = `${r.player_id}:${r.quiz_id}`;
      if (seen.has(once)) continue;
      seen.add(once);
      out.set(key(r.player_id, site), (out.get(key(r.player_id, site)) ?? 0) + playXp(r.score ?? 0, r.total_questions ?? 0));
    }
  }
  return out;
}

export async function readTopFans(origins: HubOrigins, now: Date, db: Db): Promise<HubTopFans | null> {
  const teamIds = await loadTeamIds(db);
  const all = await loadStamps(db);
  const stamps = all.filter((s) => !teamIds.has(s.user_id));
  if (stamps.length === 0) return null;
  const ids = [...new Set(stamps.map((s) => s.user_id))];
  const [profiles, levelPublic] = await Promise.all([loadProfiles(db, ids), loadLevelPublic(db, ids)]);
  const snap = await weekXpFromSnapshots(db, stamps, profiles, now);
  const weekXp = snap ?? (await weekXpFromPlays(db, stamps, now));
  const fans = rankFans({ stamps, profiles, levelPublic, teamIds, weekXp, origins });
  return fans.length > 0 ? { fans, basis: snap ? 'snapshots' : 'plays' } : null;
}

const cached = hubCached('top-fans', (origins: HubOrigins) => readTopFans(origins, new Date(), createServiceRoleClient()));

/** The top fans of the week, cached one hour (tag hub:top-fans). */
export async function getTopFans(opts?: HubOpts): Promise<HubTopFans | null> {
  return cached(resolveOrigins(opts));
}

