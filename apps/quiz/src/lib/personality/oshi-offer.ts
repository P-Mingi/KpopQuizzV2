// Run O1 (OSHI): "Set as oshi" under a Which character are you result, on the anime build only. Kpop keeps its bias (a free text on
// profiles.bias through /api/auth/update-profile) and never loads this module: components/personality/quiz.tsx import()s it behind the
// site check. What it writes is per site and per series, never shared by the passport:
//  - the oshi of the series, one row per fan and series, in `favourite_characters` through RLS (lib/passport-ui/oshi.ts: refused above
//    the fan's spoiler progress, like the tiles and the settings);
//  - the oshi tag of this site, `world_memberships.tag_text` of the site's own row through update_my_membership (the same two writes as
//    Settings, in the same order). The fan's OtakuQuiz profile reads it as its oshi (profileForSite); the passport never carries it.
// The database is behind an interface so the rules are unit tested without one.

import { pickOshi } from '@/lib/passport-ui/oshi';
import { p1 } from '@/lib/passport-ui/copy';
import { SPOILER_FREE_VIEW, parseProgress, readGuestProgress } from '@/lib/anime/spoilers';

import type { OshiDb } from '@/lib/passport-ui/oshi';
import type { SpoilerProgress } from '@/lib/anime/types';
import type { SiteId } from '@/lib/site/types';

interface ReadQuery {
  select(columns: string): ReadQuery;
  eq(column: string, value: unknown): ReadQuery;
  maybeSingle(): PromiseLike<{ data: unknown; error: unknown }>;
}

/** The part of the Supabase browser client this module uses (tests pass a stand-in). */
export interface OshiOfferDb {
  auth: { getUser(): PromiseLike<{ data: { user: { id: string } | null } }> };
  from(table: 'groups' | 'characters' | 'series_progress'): ReadQuery;
  from(table: 'favourite_characters'): ReturnType<OshiDb['from']>;
  rpc(fn: 'ensure_membership' | 'update_my_membership', args: Record<string, unknown>): PromiseLike<{ error: unknown }>;
}

export type OshiOfferResult =
  | { readonly ok: true; readonly name: string }
  | { readonly ok: false; readonly reason: 'signed-out' | 'unknown' | 'spoiler' | 'error'; readonly message: string };

/** The longest oshi tag (the tag field of the membership and of the settings screen). */
export const OSHI_TAG_MAX = 40;

const fail = (reason: 'signed-out' | 'unknown' | 'spoiler' | 'error', message: string): OshiOfferResult => ({ ok: false, reason, message });

async function readProgress(db: OshiOfferDb, groupId: number, seriesSlug: string): Promise<SpoilerProgress> {
  try {
    const { data, error } = await db.from('series_progress').select('medium, arc_ord').eq('group_id', groupId).maybeSingle();
    if (!error && data) {
      const row = data as { medium?: unknown; arc_ord?: unknown };
      const p = parseProgress({ arc: row.arc_ord, scope: row.medium });
      if (p) return p;
    }
  } catch { /* fall through to the guest store */ }
  return readGuestProgress(seriesSlug) ?? SPOILER_FREE_VIEW;
}

/**
 * Makes the character of a result the oshi of the signed-in fan for that series. `characterSlug` is the result id (the
 * personality profile's member_slug is the character's slug). Resolves to a message to show, never throws.
 */
export async function saveOshiFromResult(
  db: OshiOfferDb,
  args: { readonly site: SiteId; readonly groupSlug: string; readonly characterSlug: string },
): Promise<OshiOfferResult> {
  try {
    const { data: auth } = await db.auth.getUser();
    if (!auth.user) return fail('signed-out', 'Sign in to set your oshi tag.');

    const g = await db.from('groups').select('id, name').eq('slug', args.groupSlug).eq('site_id', args.site).maybeSingle();
    const group = g.data as { id?: unknown; name?: unknown } | null;
    if (g.error || !group || typeof group.id !== 'number') return fail('unknown', 'Could not set your oshi tag. Try again.');
    const c = await db.from('characters').select('id, slug, name, spoiler_level').eq('group_id', group.id).eq('slug', args.characterSlug).maybeSingle();
    const ch = c.data as { id?: unknown; slug?: unknown; name?: unknown; spoiler_level?: unknown } | null;
    if (c.error || !ch || typeof ch.id !== 'number' || typeof ch.name !== 'string') return fail('unknown', 'Could not set your oshi tag. Try again.');

    const progress = await readProgress(db, group.id, args.groupSlug);
    const done = await pickOshi(db as unknown as OshiDb, {
      userId: auth.user.id,
      groupId: group.id,
      character: { id: ch.id, slug: String(ch.slug ?? args.characterSlug), name: ch.name, spoiler_level: typeof ch.spoiler_level === 'number' ? ch.spoiler_level : 0 },
      progress,
    });
    if (!done.ok) {
      return done.reason === 'spoiler'
        ? fail('spoiler', p1('oshi.refusedSpoiler', { name: typeof group.name === 'string' ? group.name : '' }, args.site))
        : fail('error', 'Could not set your oshi tag. Try again.');
    }

    // The tag of this site: the row exists once the fan has played here, ensure_membership makes it otherwise (as Settings does).
    await db.rpc('ensure_membership', { p_site: args.site, p_via: 'signup', p_via_code: null });
    const tag = await db.rpc('update_my_membership', { p_site: args.site, p_patch: { tag_text: ch.name.trim().slice(0, OSHI_TAG_MAX) } });
    if (tag.error) return fail('error', 'Could not set your oshi tag. Try again.');
    return { ok: true, name: ch.name };
  } catch {
    return fail('error', 'Could not set your oshi tag. Try again.');
  }
}
