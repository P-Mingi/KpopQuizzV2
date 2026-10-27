// V-UPGRADE-1 Phase A - the tiered-badge award engine. Computes each metric for a
// user from REAL activity (stored counters + derivable queries; NO new SQL
// functions or counters, per the A1 rulings) and grants every earned tier via an
// idempotent upsert into user_badges (the UNIQUE(user_id,badge_id) makes re-runs
// free). Called real-time from activity write paths, as a backstop on profile
// render, and once per user by the backfill script.

import { SITE_ID } from '@/lib/site/registry';
import { forSite } from '@/lib/site/scope';

import { BADGE_FAMILIES, isOneTime, type BadgeMetric } from './catalog';

import type { SupabaseClient } from '@supabase/supabase-js';
import type { SiteId } from '@/lib/site/types';

const YEAR_MS = 365.25 * 24 * 60 * 60 * 1000;

/** Compute every badge metric for one user. Returns 0 for anything absent. Each
 * metric maps to a stored column or a bounded query; the heavier scans (perfect
 * scores, sets, nesting, era stories, first-fan) fetch only the columns they need. */
export async function computeMetrics(db: SupabaseClient, userId: string, site: SiteId = SITE_ID): Promise<Record<BadgeMetric, number>> {
  const m: Record<BadgeMetric, number> = {
    quizzes_played: 0, perfect_scores: 0, blindtests_played: 0, personality_plays: 0,
    daily_streak_longest: 0, debate_votes: 0, quizzes_created: 0, plays_received: 0,
    distinct_groups_played: 0, wiki_pages: 0, sourced_overrides: 0, essays_published: 0,
    photocard_sets: 0, nest_depth: 0, era_stories: 0, contrib_streak: 0, first_fan: 0,
    founding_curator: 0, dual_citizen: 0, spaces_joined: 0, account_age_years: 0, completionist: 0,
  };

  // Run O1 (B3): a non-kpop site counts its own activity only (its membership counters, the plays of its own
  // quizzes). The kpop-only metrics (Verse, photocards, spaces, debates, group mastery) stay 0 there, so kpop
  // activity never earns a badge on another site.
  if (site !== 'kpop') return computeWorldMetrics(db, userId, site, m);

  // --- stored profile counters (one row) ---
  const { data: prof } = await db.from('profiles')
    .select('quizzes_played, blindtests_played, daily_streak_longest, total_quizzes_created, total_plays_received, created_at')
    .eq('id', userId).maybeSingle();
  const p = prof as { quizzes_played: number; blindtests_played: number; daily_streak_longest: number | null; total_quizzes_created: number; total_plays_received: number; created_at: string } | null;
  if (p) {
    // NOTE: quizzes_played is set from the plays table below, not this counter -
    // the counter is a first-completion cache that runs stale (a user with real
    // plays can read 0), which would UNDER-count. The plays scan is ground truth.
    m.blindtests_played = p.blindtests_played ?? 0;
    m.daily_streak_longest = p.daily_streak_longest ?? 0;
    m.quizzes_created = p.total_quizzes_created ?? 0;
    m.plays_received = p.total_plays_received ?? 0;
    m.account_age_years = Math.floor((Date.now() - new Date(p.created_at).getTime()) / YEAR_MS);
  }

  // --- simple derivable head counts ---
  const cPersonality = await db.from('personality_results').select('id', { count: 'exact', head: true }).eq('user_id', userId);
  m.personality_plays = cPersonality.count ?? 0;
  const cDebate = await db.from('debate_votes').select('id', { count: 'exact', head: true }).eq('user_id', userId);
  m.debate_votes = cDebate.count ?? 0;
  // distinct fandoms played: one row per (player, group) in player_group_mastery.
  const cGroups = await db.from('player_group_mastery').select('group_id', { count: 'exact', head: true }).eq('player_id', userId).gt('songs_played', 0);
  m.distinct_groups_played = cGroups.count ?? 0;
  const cWiki = await db.from('verse_pages').select('id', { count: 'exact', head: true }).eq('created_by', userId).eq('status', 'published');
  m.wiki_pages = cWiki.count ?? 0;
  const cSrc = await db.from('entity_overrides').select('id', { count: 'exact', head: true }).eq('author', userId).not('source_url', 'is', null);
  m.sourced_overrides = cSrc.count ?? 0;
  const cEssay = await forSite(db.from('verse_essays').select('id', { count: 'exact', head: true }), site).eq('author', userId).eq('status', 'featured');
  m.essays_published = cEssay.count ?? 0;
  const cSpaces = await db.from('space_members').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'active');
  m.spaces_joined = cSpaces.count ?? 0;

  // --- plays played (Marathoner) + perfect scores (Perfectionist): one scan of
  // the plays table (the ground truth), no col=col filter in PostgREST. ---
  {
    const { data } = await db.from('plays').select('score, total_questions').eq('player_id', userId);
    const rows = (data ?? []) as { score: number; total_questions: number }[];
    m.quizzes_played = rows.length;
    m.perfect_scores = rows.filter((r) => r.total_questions > 0 && r.score === r.total_questions).length;
  }

  // --- contribution streak: max over the user's space memberships ---
  {
    const { data } = await db.from('space_members').select('contrib_streak').eq('user_id', userId);
    m.contrib_streak = Math.max(0, ...((data ?? []) as { contrib_streak: number | null }[]).map((r) => r.contrib_streak ?? 0));
  }

  // --- era stories: distinct entities the user authored an era_story revision on ---
  {
    const { data } = await db.from('verse_revisions').select('entity_type, entity_id').eq('author', userId).eq('section_key', 'era_story');
    const set = new Set(((data ?? []) as { entity_type: string; entity_id: string }[]).map((r) => `${r.entity_type}:${r.entity_id}`));
    m.era_stories = set.size;
  }

  // --- photocard sets completed: groups where the user owns every published card ---
  {
    const { data: owned } = await db.from('photocard_collection').select('photocard_id').eq('user_id', userId).eq('state', 'owned');
    const ownedIds = new Set(((owned ?? []) as { photocard_id: number }[]).map((r) => r.photocard_id));
    if (ownedIds.size > 0) {
      const { data: cards } = await db.from('photocards').select('id, group_id').eq('status', 'published');
      const byGroup = new Map<number, { total: number; owned: number }>();
      for (const c of (cards ?? []) as { id: number; group_id: number }[]) {
        const g = byGroup.get(c.group_id) ?? { total: 0, owned: 0 };
        g.total += 1; if (ownedIds.has(c.id)) g.owned += 1;
        byGroup.set(c.group_id, g);
      }
      m.photocard_sets = [...byGroup.values()].filter((g) => g.total > 0 && g.owned === g.total).length;
    }
  }

  // --- nesting depth: longest parent chain that includes a page the user authored ---
  {
    const { data } = await db.from('verse_pages').select('id, parent_page_id, created_by');
    const rows = (data ?? []) as { id: number; parent_page_id: number | null; created_by: string }[];
    const parent = new Map<number, number | null>();
    const mine = new Set<number>();
    for (const r of rows) { parent.set(r.id, r.parent_page_id); if (r.created_by === userId) mine.add(r.id); }
    let best = 0;
    for (const id of mine) {
      let depth = 1; let cur = parent.get(id) ?? null; const seen = new Set<number>([id]);
      while (cur != null && !seen.has(cur) && depth < 64) { seen.add(cur); depth += 1; cur = parent.get(cur) ?? null; }
      if (depth > best) best = depth;
    }
    m.nest_depth = best;
  }

  // --- first fan: is the user among the first 50 joiners of any space? ---
  {
    const { data: mine } = await db.from('space_members').select('group_id, joined_at').eq('user_id', userId);
    for (const row of (mine ?? []) as { group_id: number; joined_at: string }[]) {
      const { count: earlier } = await db.from('space_members').select('id', { count: 'exact', head: true }).eq('group_id', row.group_id).lte('joined_at', row.joined_at);
      if ((earlier ?? 0) > 0 && (earlier ?? 0) <= 50) { m.first_fan = 1; break; }
    }
  }

  // --- dual citizen: real Play activity AND real Verse activity ---
  {
    const play = m.quizzes_played > 0 || m.quizzes_created > 0;
    const verse = m.wiki_pages > 0 || m.essays_published > 0 || m.spaces_joined > 0 || m.era_stories > 0;
    m.dual_citizen = play && verse ? 1 : 0;
  }

  return m; // completionist + founding_curator resolved in the grant step.
}

/** The metrics of a non-kpop site: the member's world counters and the plays of that site's quizzes. */
async function computeWorldMetrics(
  db: SupabaseClient,
  userId: string,
  site: SiteId,
  m: Record<BadgeMetric, number>,
): Promise<Record<BadgeMetric, number>> {
  const { data } = await db.from('world_memberships')
    .select('blindtests_played, daily_streak_longest, quizzes_created, plays_received, joined_at')
    .eq('user_id', userId).eq('site_id', site).maybeSingle();
  const w = data as { blindtests_played: number | null; daily_streak_longest: number | null; quizzes_created: number | null; plays_received: number | null; joined_at: string } | null;
  if (w) {
    m.blindtests_played = w.blindtests_played ?? 0;
    m.daily_streak_longest = w.daily_streak_longest ?? 0;
    m.quizzes_created = w.quizzes_created ?? 0;
    m.plays_received = w.plays_received ?? 0;
    m.account_age_years = Math.floor((Date.now() - new Date(w.joined_at).getTime()) / YEAR_MS);
  }
  // plays has no site column: the quiz the play belongs to says which site it was played on.
  const { data: plays } = await db.from('plays')
    .select('score, total_questions, quizzes!inner(site_id)')
    .eq('player_id', userId).eq('quizzes.site_id', site);
  const rows = (plays ?? []) as { score: number; total_questions: number }[];
  m.quizzes_played = rows.length;
  m.perfect_scores = rows.filter((r) => r.total_questions > 0 && r.score === r.total_questions).length;
  return m;
}

/** The badge ids for a family (one-time badge = the family key, else key_threshold). */
function familyBadgeIds(fam: (typeof BADGE_FAMILIES)[number]): string[] {
  return isOneTime(fam) ? [fam.key] : fam.tiers.map((t) => `${fam.key}_${t}`);
}

/** Grant every earned tier from PRECOMPUTED metrics. Idempotent. Returns the badge
 * ids newly granted. `founding_curator` is never auto-granted (manual). Split out
 * so a caller with metrics in hand (the profile shelf) grants without recomputing. */
export async function grantEarnedTiers(db: SupabaseClient, userId: string, metrics: Record<BadgeMetric, number>, site: SiteId = SITE_ID): Promise<string[]> {
  if (site !== 'kpop') return grantWorldTiers(db, userId, metrics, site);
  const earned: string[] = [];
  for (const fam of BADGE_FAMILIES) {
    if (fam.metric === 'founding_curator' || fam.metric === 'completionist') continue;
    const value = metrics[fam.metric];
    const ids = familyBadgeIds(fam);
    fam.tiers.forEach((threshold, i) => { if (value >= threshold) earned.push(ids[i]!); });
  }

  // Completionist: earned once the user holds >=1 badge in every category, judged
  // against what they will hold after this grant (existing + earned).
  const { data: existingRows } = await db.from('user_badges').select('badge_id').eq('user_id', userId);
  const existing = new Set(((existingRows ?? []) as { badge_id: string }[]).map((r) => r.badge_id));
  const willHold = new Set([...existing, ...earned]);
  const cats = new Set<string>();
  for (const fam of BADGE_FAMILIES) {
    if (familyBadgeIds(fam).some((id) => willHold.has(id))) cats.add(fam.category);
  }
  if (cats.has('play') && cats.has('verse') && cats.has('cross')) earned.push('completionist');

  const fresh = [...new Set(earned)].filter((id) => !existing.has(id));
  if (fresh.length) {
    await db.from('user_badges').upsert(
      fresh.map((badge_id) => ({ user_id: userId, badge_id })),
      { onConflict: 'user_id,badge_id', ignoreDuplicates: true },
    );
  }
  return fresh;
}

/**
 * A non-kpop site grants only the badges that site defines: badge_definitions rows with site_id = site and
 * id = <site>_<family id> (the convention of award_world_xp, 007). Until a world defines them nothing is granted.
 */
async function grantWorldTiers(db: SupabaseClient, userId: string, metrics: Record<BadgeMetric, number>, site: SiteId): Promise<string[]> {
  const earned: string[] = [];
  for (const fam of BADGE_FAMILIES) {
    if (fam.metric === 'founding_curator' || fam.metric === 'completionist') continue;
    const value = metrics[fam.metric];
    const ids = familyBadgeIds(fam);
    fam.tiers.forEach((threshold, i) => { if (value >= threshold) earned.push(`${site}_${ids[i]!}`); });
  }
  if (earned.length === 0) return [];
  const { data: defined } = await forSite(db.from('badge_definitions').select('id'), site).in('id', earned);
  const allowed = new Set(((defined ?? []) as { id: string }[]).map((r) => r.id));
  const { data: existingRows } = await db.from('user_badges').select('badge_id').eq('user_id', userId);
  const existing = new Set(((existingRows ?? []) as { badge_id: string }[]).map((r) => r.badge_id));
  const fresh = [...new Set(earned)].filter((id) => allowed.has(id) && !existing.has(id));
  if (fresh.length) {
    await db.from('user_badges').upsert(
      fresh.map((badge_id) => ({ user_id: userId, badge_id })),
      { onConflict: 'user_id,badge_id', ignoreDuplicates: true },
    );
  }
  return fresh;
}

/** Compute metrics for a user then grant every earned tier. The real-time entry
 * point (play route); callers that also need the metrics for display should call
 * computeMetrics + grantEarnedTiers to avoid the double compute. */
export async function checkTierBadges(db: SupabaseClient, userId: string, site: SiteId = SITE_ID): Promise<string[]> {
  return grantEarnedTiers(db, userId, await computeMetrics(db, userId, site), site);
}
