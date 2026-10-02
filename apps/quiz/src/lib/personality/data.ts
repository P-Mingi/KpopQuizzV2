// V12 G5: server reads for the personality pages. Cookie-free public reads (the
// anon key, RLS applies), so the pages stay ISR. Server only.
//
// Existing tables, read as they are (migration 118, never altered by this run):
//   personality_questions (ord, question, options jsonb, active)
//   personality_profiles  (group_id, member_name, member_slug, axes jsonb, ord, active)
//   personality_results   (group_id, member_name, user_id, created_at, result_day)
//   get_personality_counts(p_group_id, p_since): member_name + count, never rows
//
// Every read is caught: a database blip gives a 404 or hides the numbers, it never
// throws into a page (ISR fail-closed). A cached reader throws on an error so that
// a failed read is not stored.

import { unstable_cache } from 'next/cache';

import { CACHE_TTL } from '@/lib/db/cache-policy';
import { createPublicReadClient } from '@/lib/supabase/server';
import { realFandomName } from '@/lib/ux-v1/p3/model';

import { BRIDGE_RESULT_KEY, BRIDGE_SLUGS } from './bridge';
import { isGroupSlug, parseCounts, parseProfiles, parseQuestions } from './parse';

import type { AxisQuestion } from './engine';
import type { WmaProfile } from './parse';

export interface PersonalityGroup {
  id: number;
  slug: string;
  name: string;
  /** Real fandom name, or null. */
  fandom: string | null;
}

export interface WmaData {
  group: PersonalityGroup;
  questions: AxisQuestion[];
  profiles: WmaProfile[];
}

/** A "profile set" is at least two members: with one there is nothing to find out. */
export const MIN_PROFILES = 2;

function hasDbEnv(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

async function soft<T>(read: () => Promise<T>, fallback: T, what: string): Promise<T> {
  if (!hasDbEnv()) return fallback;
  try {
    return await read();
  } catch (err) {
    console.error(`[personality] ${what} failed:`, err instanceof Error ? err.message : 'unknown error');
    return fallback;
  }
}

function toGroup(row: unknown): PersonalityGroup | null {
  const r = row as { id?: unknown; slug?: unknown; name?: unknown; fandom_name?: unknown } | null;
  if (!r || typeof r.id !== 'number' || typeof r.slug !== 'string' || typeof r.name !== 'string') return null;
  return { id: r.id, slug: r.slug, name: r.name, fandom: realFandomName(typeof r.fandom_name === 'string' ? r.fandom_name : null) };
}

const readQuestions = unstable_cache(async (): Promise<AxisQuestion[]> => {
  const db = createPublicReadClient();
  const { data, error } = await db.from('personality_questions').select('ord, question, options').eq('active', true).order('ord').limit(100);
  if (error) throw new Error(error.message);
  return parseQuestions(data);
}, ['v12:g5:questions:v1'], { revalidate: CACHE_TTL.catalog, tags: ['personality'] });

const readGroupProfiles = unstable_cache(async (slug: string): Promise<{ group: PersonalityGroup; profiles: WmaProfile[] } | null> => {
  const db = createPublicReadClient();
  const g = await db.from('groups').select('id, slug, name, fandom_name').eq('slug', slug).maybeSingle();
  if (g.error) throw new Error(g.error.message);
  const group = toGroup(g.data);
  if (!group) return null;
  const p = await db.from('personality_profiles').select('member_name, member_slug, axes, ord')
    .eq('group_id', group.id).eq('active', true).order('ord').limit(100);
  if (p.error) throw new Error(p.error.message);
  return { group, profiles: parseProfiles(p.data) };
}, ['v12:g5:group-profiles:v1'], { revalidate: CACHE_TTL.catalog, tags: ['personality', 'groups'] });

const readSlugs = unstable_cache(async (): Promise<string[]> => {
  const db = createPublicReadClient();
  // One row per member: about a hundred rows today. Paged anyway (the 1000-row cap).
  const slugs = new Map<string, number>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('personality_profiles').select('group_id, groups!inner(slug)')
      .eq('active', true).order('id').range(from, from + 999);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as unknown as Array<{ groups: { slug?: unknown } | Array<{ slug?: unknown }> | null }>;
    for (const r of rows) {
      const g = Array.isArray(r.groups) ? r.groups[0] : r.groups;
      if (g && isGroupSlug(g.slug)) slugs.set(g.slug, (slugs.get(g.slug) ?? 0) + 1);
    }
    if (rows.length < 1000) break;
  }
  return [...slugs.entries()].filter(([, n]) => n >= MIN_PROFILES).map(([s]) => s).sort();
}, ['v12:g5:slugs:v1'], { revalidate: CACHE_TTL.catalog, tags: ['personality', 'groups'] });

const readCounts = unstable_cache(async (groupId: number): Promise<Record<string, number>> => {
  const db = createPublicReadClient();
  const { data, error } = await db.rpc('get_personality_counts', { p_group_id: groupId, p_since: null });
  if (error) throw new Error(error.message);
  return parseCounts(data);
}, ['v12:g5:counts:v1'], { revalidate: CACHE_TTL.stats, tags: ['personality'] });

const readBridgeGroups = unstable_cache(async (): Promise<PersonalityGroup[]> => {
  const db = createPublicReadClient();
  const { data, error } = await db.from('groups').select('id, slug, name, fandom_name').in('slug', BRIDGE_SLUGS);
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown[]).map(toGroup).filter((g): g is PersonalityGroup => g !== null);
}, ['v12:g5:bridge-groups:v1'], { revalidate: CACHE_TTL.catalog, tags: ['groups'] });

/** Everything a Which member are you page needs, or null (unknown group, no profile set, no questions, read failed). */
export async function getWmaData(slug: string): Promise<WmaData | null> {
  if (!isGroupSlug(slug)) return null;
  const [questions, gp] = await Promise.all([
    soft(() => readQuestions(), [] as AxisQuestion[], 'questions'),
    soft(() => readGroupProfiles(slug), null, 'profiles'),
  ]);
  if (!gp || gp.profiles.length < MIN_PROFILES || questions.length === 0) return null;
  return { group: gp.group, questions, profiles: gp.profiles };
}

/** Slugs of the groups that have a profile set, A to Z. Empty when the read fails. */
export async function getWmaGroupSlugs(): Promise<string[]> {
  return soft(() => readSlugs(), [] as string[], 'group list');
}

/** Real saved results per member name for one group, or null when the read fails. */
export async function getMemberCounts(groupId: number): Promise<Record<string, number> | null> {
  return soft<Record<string, number> | null>(() => readCounts(groupId), null, 'counts');
}

/** The six bridge groups that exist in `groups`. */
export async function getBridgeGroups(): Promise<PersonalityGroup[]> {
  return soft(() => readBridgeGroups(), [] as PersonalityGroup[], 'bridge groups');
}

/** Real saved bridge results per group slug, or null when any read fails. */
export async function getBridgeCounts(groups: readonly PersonalityGroup[]): Promise<Record<string, number> | null> {
  if (groups.length === 0) return null;
  const all = await Promise.all(groups.map((g) => getMemberCounts(g.id)));
  const out: Record<string, number> = {};
  for (let i = 0; i < groups.length; i += 1) {
    const counts = all[i];
    const g = groups[i];
    if (!counts || !g) return null;
    out[g.slug] = counts[BRIDGE_RESULT_KEY] ?? 0;
  }
  return out;
}
