// Verse curator overrides - read-time precedence + conflict detection.
//
// Canonical precedence (W0 finding 2): a curator value in entity_overrides ALWAYS
// wins over the ingested column value at read time. Ingestion refreshes the
// column freely; it never writes entity_overrides. A "conflict" is when the
// current ingested column value differs from the override value - surfaced in
// admin so a human can reconcile. Nothing is auto-overwritten either way.
import type { SupabaseClient } from '@supabase/supabase-js';

export type VerseEntityType = 'group' | 'group_unit' | 'idol' | 'album' | 'album_track' | 'song';

export interface OverrideRow {
  entity_type: VerseEntityType;
  entity_id: string;
  field: string;
  value: string | null;
  author: string;
}

const key = (entityId: string | number, field: string) => `${entityId}:${field}`;

/** Load overrides for a set of entities as a lookup map: `${id}:${field}` -> OverrideRow. */
export async function loadOverrides(
  svc: SupabaseClient,
  entityType: VerseEntityType,
  entityIds: Array<string | number>,
): Promise<Map<string, OverrideRow>> {
  const map = new Map<string, OverrideRow>();
  if (!entityIds.length) return map;
  const { data } = await svc
    .from('entity_overrides')
    .select('entity_type,entity_id,field,value,author')
    .eq('entity_type', entityType)
    .in('entity_id', entityIds.map(String));
  for (const r of (data ?? []) as OverrideRow[]) map.set(key(r.entity_id, r.field), r);
  return map;
}

/** Effective value = override if present, else the ingested column value. */
export function effectiveValue<T>(
  overrides: Map<string, OverrideRow>,
  entityId: string | number,
  field: string,
  ingested: T,
): T | string {
  const o = overrides.get(key(entityId, field));
  return o ? (o.value as unknown as T) : ingested;
}

/** True when a curator override exists whose value differs from the ingested one. */
export function isConflict(
  overrides: Map<string, OverrideRow>,
  entityId: string | number,
  field: string,
  ingested: unknown,
): boolean {
  const o = overrides.get(key(entityId, field));
  if (!o) return false;
  return String(o.value ?? '') !== String(ingested ?? '');
}

/**
 * Compute all live override/ingestion conflicts for one entity type. Reads the
 * override rows, fetches the referenced entities, and compares field by field.
 * Used by the admin conflict queue.
 */
export async function findConflicts(
  svc: SupabaseClient,
  entityType: VerseEntityType,
  table: string,
): Promise<Array<{ entity_id: string; field: string; ingested: string; override: string; author: string }>> {
  const { data: ovs } = await svc
    .from('entity_overrides')
    .select('entity_id,field,value,author')
    .eq('entity_type', entityType);
  const rows = (ovs ?? []) as Array<{ entity_id: string; field: string; value: string | null; author: string }>;
  if (!rows.length) return [];
  const ids = [...new Set(rows.map((r) => r.entity_id))];
  const { data: ents } = await svc.from(table).select('*').in('id', ids);
  const byId = new Map<string, Record<string, unknown>>((ents ?? []).map((e: Record<string, unknown>) => [String(e.id), e]));
  const out: Array<{ entity_id: string; field: string; ingested: string; override: string; author: string }> = [];
  for (const r of rows) {
    const ent = byId.get(String(r.entity_id));
    const ingested = ent ? ent[r.field] : undefined;
    if (String(ingested ?? '') !== String(r.value ?? '')) {
      out.push({ entity_id: r.entity_id, field: r.field, ingested: String(ingested ?? ''), override: String(r.value ?? ''), author: r.author });
    }
  }
  return out;
}
