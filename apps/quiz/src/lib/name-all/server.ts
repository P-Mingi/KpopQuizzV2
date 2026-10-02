// Name them all (V12 G6): the Supabase side. Server only.
//
// Reads:  groups (the row), idols (active members of the group, in `ord` order).
// Writes: name_all_member_results (migration 126, read as it is: one row per member
//         per finished round, group_id / member_name / found / round_id, no user
//         link). docs/pending-migrations/v12-g6-name-all.sql adds two nullable
//         columns (found_order, round_seconds) and name_all_round_stats().
// Until that file is applied: a round is stored in the shape of migration 126 and
// the result screen shows no community stat. Every call here is caught: a database
// blip never throws into the page or the route.

import { unstable_cache } from 'next/cache';

import { CACHE_TTL } from '@/lib/db/cache-policy';
import { createPublicReadClient, createServiceRoleClient } from '@/lib/supabase/server';

import { legacyRows, parseRawStats, publicStats, roundRows } from './round';
import { buildRoster } from './roster';
import { isNameAllGroup } from './spellings';

import type { NameAllMember } from './match';
import type { NameAllStats } from './round';
import type { IdolRow } from './roster';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface NameAllGroup {
  id: number;
  slug: string;
  name: string;
  fandom: string | null;
}

export interface NameAllSet {
  group: NameAllGroup;
  members: NameAllMember[];
}

async function readSet(slug: string): Promise<NameAllSet | null> {
  const db = createPublicReadClient();
  const { data: group, error: gErr } = await db.from('groups').select('id, slug, name, fandom_name').eq('slug', slug).maybeSingle();
  // ISR fail-closed: an error must not be cached as "this group has no page".
  if (gErr) throw new Error(`name-all ${slug}: group read: ${gErr.message}`);
  if (!group) return null;
  const { data: idols, error: iErr } = await db
    .from('idols')
    .select('name, name_romanized, name_hangul, ord')
    .eq('group_id', group.id)
    .eq('active', true)
    .is('detached_at', null)
    .order('ord', { ascending: true })
    .order('id', { ascending: true });
  if (iErr) throw new Error(`name-all ${slug}: idols read: ${iErr.message}`);
  const members = buildRoster(slug, (idols ?? []) as IdolRow[]);
  if (members.length < 2) return null;
  const fandom = typeof group.fandom_name === 'string' && group.fandom_name.trim() ? group.fandom_name.trim() : null;
  return { group: { id: group.id as number, slug: group.slug as string, name: group.name as string, fandom }, members };
}

const cachedSet = unstable_cache(readSet, ['db:name-all:set:v1'], { revalidate: CACHE_TTL.catalog, tags: ['groups'] });

/**
 * The group and its playable roster, or null when the group has no Name them all
 * page (not in NAME_ALL_GROUPS, unknown slug, or fewer than two active members).
 * Throws on a database error, so a blip is never cached as a 404.
 */
export async function getNameAllSet(slug: string): Promise<NameAllSet | null> {
  if (!isNameAllGroup(slug)) return null;
  return cachedSet(slug);
}

function service(): SupabaseClient | null {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  try { return createServiceRoleClient(); } catch { return null; }
}

async function readStats(groupId: number): Promise<unknown> {
  const db = service();
  if (!db) return null;
  try {
    const { data, error } = await db.rpc('name_all_round_stats', { p_group_id: groupId });
    return error ? null : data;
  } catch { return null; }
}

const cachedStats = unstable_cache(readStats, ['db:name-all:stats:v1'], { revalidate: CACHE_TTL.stats, tags: ['name-all'] });

/** The published aggregates of a group, or null (SQL not applied, too few rounds, an error). */
export async function getNameAllStats(set: NameAllSet): Promise<NameAllStats | null> {
  try {
    return publicStats(parseRawStats(await cachedStats(set.group.id)), set.members);
  } catch { return null; }
}

export type SaveResult = 'saved' | 'saved_legacy' | 'failed';

/** True when an insert failed only because found_order / round_seconds do not exist yet. */
export function missingV12Columns(error: { code?: string | null; message?: string | null }): boolean {
  if (error.code === 'PGRST204' || error.code === '42703') return true;
  return /found_order|round_seconds/.test(error.message ?? '');
}

/** Stores one finished round. Never throws. */
export async function saveRound(opts: { set: NameAllSet; found: readonly string[]; seconds: number; roundId: string; db?: SupabaseClient | null }): Promise<SaveResult> {
  const db = opts.db === undefined ? service() : opts.db;
  if (!db) return 'failed';
  const rows = roundRows({ groupId: opts.set.group.id, roundId: opts.roundId, roster: opts.set.members, found: opts.found, seconds: opts.seconds });
  try {
    const full = await db.from('name_all_member_results').insert(rows);
    if (!full.error) return 'saved';
    // PGRST204 / 42703: the two v12 columns are not there yet (pending SQL not applied).
    if (!missingV12Columns(full.error)) return 'failed';
    const legacy = await db.from('name_all_member_results').insert(legacyRows(rows));
    return legacy.error ? 'failed' : 'saved_legacy';
  } catch { return 'failed'; }
}
