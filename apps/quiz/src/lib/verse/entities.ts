// W3K.4 - read model for the new entity types. The public read client only ever sees
// status='published' rows (RLS from migration 130), so the reader surfaces are the
// publish gate: no draft leaks, no empty doorway pages. Admin surfaces use the
// service-role client to see and edit drafts.
import { cache } from 'react';

import { createPublicReadClient, createServiceRoleClient } from '@/lib/supabase/server';
import { SCENES, SCENE_LIST } from '@/lib/verse/entity-types';

import type { SceneKind } from '@/lib/verse/entity-types';

export interface SceneRow { id: number; [k: string]: unknown; }

/** Published counts per scene for a group (drives which tabs appear). */
export const sceneCounts = cache(async (groupId: number): Promise<Record<SceneKind, number>> => {
  const db = createPublicReadClient();
  const entries = await Promise.all(SCENE_LIST.map(async (s) => {
    const { count } = await db.from(s.table).select('id', { count: 'exact', head: true }).eq('group_id', groupId);
    return [s.kind, count ?? 0] as const;
  }));
  return Object.fromEntries(entries) as Record<SceneKind, number>;
});

/** Published rows of one scene for a group (public read; RLS enforces published-only). */
export async function getScene(kind: SceneKind, groupId: number): Promise<SceneRow[]> {
  const s = SCENES[kind];
  const db = createPublicReadClient();
  const { data, error } = await db.from(s.table).select('*').eq('group_id', groupId).order('created_at', { ascending: false });
  // ISR bake law: this list IS the scene page. A swallowed error would bake the
  // empty state for an hour; throw so the request 500s and retries instead.
  if (error) throw new Error(`getScene(${kind}, ${groupId}): ${error.message}`);
  return (data ?? []) as SceneRow[];
}

/** One published entity by id (public read; returns null for drafts / missing). */
export async function getSceneEntity(kind: SceneKind, id: number): Promise<SceneRow | null> {
  const s = SCENES[kind];
  const db = createPublicReadClient();
  const { data, error } = await db.from(s.table).select('*').eq('id', id).maybeSingle();
  // ISR bake law (matches getScene above): a swallowed error would bake a
  // notFound() over a real published entity for an hour. Throw so it 500s + retries.
  if (error) throw new Error(`getSceneEntity(${kind}, ${id}): ${error.message}`);
  return (data as SceneRow) ?? null;
}

/** Admin: one entity by id regardless of status (service-role, drafts included). */
export async function adminGetSceneEntity(kind: SceneKind, id: number): Promise<SceneRow | null> {
  const s = SCENES[kind];
  const db = createServiceRoleClient();
  const { data } = await db.from(s.table).select('*').eq('id', id).maybeSingle();
  return (data as SceneRow) ?? null;
}
