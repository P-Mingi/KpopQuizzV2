// V-FOUNDATION F1 Phase F - CONTROLLED tags, the lateral web (C7). Tags are faceted (a
// page carries several) and controlled: creating a tag is an EXPLICIT act (never free-form
// - that rots into fandom's category sprawl). Each tag gets an auto-generated index page
// (the list is a query, never hand-maintained). AUTO tags derive from the data (birth year,
// release type/year) and can never drift. Curators rename + merge; the pages follow.

import type { SupabaseClient } from '@supabase/supabase-js';

import { pageSlug } from './slug';
import type { PageRow } from './types';

export interface TagRow { id: number; space_id: number; key: string; label: string; kind: 'auto' | 'manual'; description: string | null }
export interface TagPageCard { slug: string; title: string; type: string; entity_kind: string | null }

export async function getTag(db: SupabaseClient, spaceId: number, key: string): Promise<TagRow | null> {
  const { data } = await db.from('space_tags').select('id, space_id, key, label, kind, description').eq('space_id', spaceId).eq('key', key).maybeSingle();
  return (data as TagRow | null) ?? null;
}
export async function listTags(db: SupabaseClient, spaceId: number): Promise<TagRow[]> {
  const { data } = await db.from('space_tags').select('id, space_id, key, label, kind, description').eq('space_id', spaceId).order('label').limit(1000);
  return (data as TagRow[] | null) ?? [];
}

/** Create a tag (explicit, controlled). Idempotent on (space_id, key): a repeat returns the
 * existing tag rather than erroring, so an auto-tag and a manual create never collide. */
export async function ensureTag(svc: SupabaseClient, spaceId: number, label: string, kind: 'auto' | 'manual', description?: string): Promise<TagRow | null> {
  const key = pageSlug(label);
  const existing = await getTag(svc, spaceId, key);
  if (existing) return existing;
  const row: Record<string, unknown> = { space_id: spaceId, key, label: label.trim().slice(0, 80), kind };
  if (description) row.description = description.slice(0, 500);
  const { data } = await svc.from('space_tags').insert(row).select('id, space_id, key, label, kind, description').single();
  return (data as TagRow | null) ?? null;
}

export async function attachTag(svc: SupabaseClient, pageId: number, tagId: number): Promise<void> {
  await svc.from('page_tags').upsert({ page_id: pageId, tag_id: tagId }, { onConflict: 'page_id,tag_id' });
}
export async function detachTag(svc: SupabaseClient, pageId: number, tagId: number): Promise<void> {
  await svc.from('page_tags').delete().eq('page_id', pageId).eq('tag_id', tagId);
}

/** The tag INDEX: published pages carrying the tag. Generated, never hand-maintained. */
export async function pagesForTag(db: SupabaseClient, spaceId: number, tagId: number, limit = 200): Promise<TagPageCard[]> {
  const { data: links } = await db.from('page_tags').select('page_id').eq('tag_id', tagId).limit(limit);
  const ids = (links as { page_id: number }[] | null ?? []).map((l) => l.page_id);
  if (ids.length === 0) return [];
  const { data: pages } = await db.from('pages').select('slug, title, type, entity_kind')
    .eq('space_id', spaceId).eq('status', 'published').in('id', ids).order('title');
  return (pages as TagPageCard[] | null) ?? [];
}

/** The tags a page carries (for the document foot). */
export async function tagsForPage(db: SupabaseClient, pageId: number): Promise<{ key: string; label: string }[]> {
  const { data: links } = await db.from('page_tags').select('tag_id').eq('page_id', pageId);
  const ids = (links as { tag_id: number }[] | null ?? []).map((l) => l.tag_id);
  if (ids.length === 0) return [];
  const { data: tags } = await db.from('space_tags').select('key, label').in('id', ids).order('label');
  return (tags as { key: string; label: string }[] | null) ?? [];
}

/** Neighbouring tags: tags that co-occur on the same pages as `tagId`, by co-occurrence. */
export async function relatedTags(db: SupabaseClient, spaceId: number, tagId: number, limit = 8): Promise<{ key: string; label: string }[]> {
  const { data: mine } = await db.from('page_tags').select('page_id').eq('tag_id', tagId).limit(500);
  const pageIds = (mine as { page_id: number }[] | null ?? []).map((m) => m.page_id);
  if (pageIds.length === 0) return [];
  const { data: co } = await db.from('page_tags').select('tag_id').in('page_id', pageIds).limit(2000);
  const counts = new Map<number, number>();
  for (const r of (co as { tag_id: number }[] | null ?? [])) { if (r.tag_id !== tagId) counts.set(r.tag_id, (counts.get(r.tag_id) ?? 0) + 1); }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([id]) => id);
  if (top.length === 0) return [];
  const { data: tags } = await db.from('space_tags').select('key, label').eq('space_id', spaceId).in('id', top);
  return (tags as { key: string; label: string }[] | null) ?? [];
}

/** Merge `fromId` INTO `intoId`: every page tagged from is retagged into; the merged tag is
 * deleted. The pages follow automatically (C7). Curator-gated at the API. */
export async function mergeTags(svc: SupabaseClient, fromId: number, intoId: number): Promise<void> {
  if (fromId === intoId) return;
  const { data: links } = await svc.from('page_tags').select('page_id').eq('tag_id', fromId);
  for (const l of (links as { page_id: number }[] | null ?? [])) {
    await svc.from('page_tags').upsert({ page_id: l.page_id, tag_id: intoId }, { onConflict: 'page_id,tag_id' });
  }
  await svc.from('page_tags').delete().eq('tag_id', fromId);
  await svc.from('space_tags').delete().eq('id', fromId);
}

export async function renameTag(svc: SupabaseClient, tagId: number, label: string, description?: string): Promise<{ ok: boolean; error?: string }> {
  const patch: Record<string, unknown> = { label: label.trim().slice(0, 80) };
  if (description !== undefined) patch.description = description ? description.slice(0, 500) : null;
  const { error } = await svc.from('space_tags').update(patch).eq('id', tagId);
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Derive + attach AUTO tags from a page's entity binding (never drifts). Best-effort. */
export async function applyAutoTags(svc: SupabaseClient, page: PageRow): Promise<string[]> {
  if (!page.entity_kind || page.entity_id == null) return [];
  const applied: string[] = [];
  const add = async (label: string): Promise<void> => {
    const tag = await ensureTag(svc, page.space_id, label, 'auto');
    if (tag) { await attachTag(svc, page.id, tag.id); applied.push(tag.label); }
  };
  if (page.entity_kind === 'idol') {
    const { data } = await svc.from('idols').select('birth_date').eq('id', page.entity_id).maybeSingle();
    const y = (data as { birth_date: string | null } | null)?.birth_date?.slice(0, 4);
    if (y && /^\d{4}$/.test(y)) await add(`${y}`);
  } else if (page.entity_kind === 'album') {
    const { data } = await svc.from('albums').select('release_date, type').eq('id', page.entity_id).maybeSingle();
    const a = data as { release_date: string | null; type: string | null } | null;
    const y = a?.release_date?.slice(0, 4);
    if (y && /^\d{4}$/.test(y)) await add(`${y}`);
    if (a?.type) await add(a.type);
  }
  return applied;
}
