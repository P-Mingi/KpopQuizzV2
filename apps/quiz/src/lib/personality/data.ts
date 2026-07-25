import { createPublicReadClient } from '@/lib/supabase/server';

import type { PersonalityQuestion, PersonalityProfile } from './engine';

// Server data access for the personality quizzes. Cookie-free public reads so
// the programmatic pages stay ISR-cacheable.

export interface PersonalityGroup {
  id: number;
  name: string;
  slug: string;
  display_color: string;
  text_color: string;
  logo_url: string | null;
}

export async function getPersonalityQuestions(): Promise<PersonalityQuestion[]> {
  const db = createPublicReadClient();
  const { data } = await db
    .from('personality_questions')
    .select('ord, question, options')
    .eq('active', true)
    .order('ord');
  return (data ?? []) as unknown as PersonalityQuestion[];
}

export async function getGroupProfiles(groupId: number): Promise<PersonalityProfile[]> {
  const db = createPublicReadClient();
  const { data } = await db
    .from('personality_profiles')
    .select('member_name, member_slug, photo_url, axes, trait_lines, ord')
    .eq('group_id', groupId)
    .eq('active', true)
    .order('ord');
  return (data ?? []) as unknown as PersonalityProfile[];
}

interface RawPGroupRow {
  group_id: number;
  groups: PersonalityGroup | PersonalityGroup[] | null;
}

/** Every group that has an active personality profile set (the launch top-15). */
export async function getPersonalityGroups(): Promise<PersonalityGroup[]> {
  const db = createPublicReadClient();
  const { data } = await db
    .from('personality_profiles')
    .select('group_id, groups!inner(id, name, slug, display_color, text_color, logo_url)')
    .eq('active', true);
  const map = new Map<number, PersonalityGroup>();
  for (const r of (data ?? []) as unknown as RawPGroupRow[]) {
    const g = Array.isArray(r.groups) ? r.groups[0] : r.groups;
    if (g) map.set(g.id, g);
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function getPersonalityGroupBySlug(
  slug: string,
): Promise<{ group: PersonalityGroup; profiles: PersonalityProfile[] } | null> {
  const db = createPublicReadClient();
  const { data: group } = await db
    .from('groups')
    .select('id, name, slug, display_color, text_color, logo_url')
    .eq('slug', slug)
    .maybeSingle();
  if (!group) return null;
  const profiles = await getGroupProfiles(group.id);
  if (profiles.length === 0) return null; // group has no personality set = not active
  return { group: group as PersonalityGroup, profiles };
}

export interface PersonalityGroupTile extends PersonalityGroup {
  faces: string[]; // up to 5 member photo URLs, for the hub member-face strip
}

/** Active personality groups with a few member faces each (games hub tiles). */
export async function getPersonalityGroupTiles(): Promise<PersonalityGroupTile[]> {
  const db = createPublicReadClient();
  const { data } = await db
    .from('personality_profiles')
    .select('group_id, photo_url, ord, groups!inner(id, name, slug, display_color, text_color, logo_url)')
    .eq('active', true)
    .order('ord');
  const map = new Map<number, PersonalityGroupTile>();
  for (const r of (data ?? []) as unknown as (RawPGroupRow & { photo_url: string | null })[]) {
    const g = Array.isArray(r.groups) ? r.groups[0] : r.groups;
    if (!g) continue;
    let tile = map.get(g.id);
    if (!tile) { tile = { ...g, faces: [] }; map.set(g.id, tile); }
    if (r.photo_url && tile.faces.length < 5) tile.faces.push(r.photo_url);
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** Real per-member run counts. `sinceDays` gates the monthly window. */
export async function getMemberCounts(
  groupId: number,
  sinceDays?: number,
): Promise<Record<string, number>> {
  const db = createPublicReadClient();
  const since = sinceDays != null ? new Date(Date.now() - sinceDays * 86400000).toISOString() : null;
  const { data } = await db.rpc('get_personality_counts', { p_group_id: groupId, p_since: since });
  const out: Record<string, number> = {};
  for (const row of (data ?? []) as { member_name: string; cnt: number }[]) {
    out[row.member_name] = Number(row.cnt);
  }
  return out;
}
