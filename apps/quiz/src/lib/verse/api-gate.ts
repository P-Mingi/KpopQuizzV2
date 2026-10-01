// The server-side gate of every /api/verse/* WRITE route (R1, decision 26).
//
// The Verse pages are gated twice: VERSE_PUBLIC (the whole Verse is hidden until
// relaunch) and LIVE_SPACES (a parked space is a 404), both lifted only for a
// global admin (verse/[slug]/layout.tsx). The middleware does not run on /api/,
// so the write routes checked neither: a hand-crafted request could write rows
// for a hidden Verse or a parked space. Every write handler now starts with
// verseWriteGate(req). It finds the space from what the request names: a group
// id or slug, a row whose table carries group_id (thread, page, essay, poll,
// photocard, collectible) or a wiki entity. A multipart route passes the group
// id it read from its form to verseSpaceGate. A request that names only its own
// row id (review a suggestion, resolve a flag, edit an essay by id) is covered
// by the hidden-Verse gate and by that route's own curator check.
//
// Denied = 404 { error: 'not_found' }, the same answer a page gives.

import { NextResponse } from 'next/server';

import { createServiceRoleClient } from '@/lib/supabase/server';

import { resolveEntityGroupId } from './curate';
import { isVerseAdmin } from './roles';
import { spaceUnpublished, verseHidden } from './visibility';

const GROUP_ID_KEYS = ['group_id', 'groupId'] as const;
const SLUG_KEYS = ['group_slug', 'groupSlug', 'space_slug', 'spaceSlug'] as const;
// A request that names a row instead of its space: the row's table has group_id.
const ROW_SOURCES = [
  { keys: ['thread_id', 'threadId'], table: 'verse_threads' },
  { keys: ['page_id', 'pageId'], table: 'verse_pages' },
  { keys: ['essay_id', 'essayId'], table: 'verse_essays' },
  { keys: ['poll_id', 'pollId'], table: 'space_polls' },
  { keys: ['photocard_id'], table: 'photocards' },
  { keys: ['collectible_id'], table: 'collectibles' },
] as const;

export interface SpaceRef {
  groupId: number | null;
  slug: string | null;
  /** A row whose table carries group_id (a thread, a page, an essay, a poll, a card). */
  row: { table: string; id: number } | null;
  /** A wiki entity (entity_type + entity_id), resolved by resolveEntityGroupId. */
  entity: { type: string; id: string } | null;
}

/** The space a request names in its JSON body or its query string (pure). */
export function spaceRefFrom(...sources: (Record<string, unknown> | URLSearchParams | null | undefined)[]): SpaceRef {
  const ref: SpaceRef = { groupId: null, slug: null, row: null, entity: null };
  for (const source of sources) {
    if (!source) continue;
    const get = (key: string): unknown => (source instanceof URLSearchParams ? source.get(key) : source[key]);
    const positiveInt = (v: unknown): number | null => {
      if (typeof v !== 'number' && typeof v !== 'string') return null;
      const n = Number(v);
      return Number.isInteger(n) && n > 0 ? n : null;
    };
    for (const key of GROUP_ID_KEYS) {
      if (ref.groupId === null) ref.groupId = positiveInt(get(key));
    }
    for (const key of SLUG_KEYS) {
      const v = get(key);
      if (ref.slug === null && typeof v === 'string' && v.length > 0) ref.slug = v;
    }
    for (const src of ROW_SOURCES) {
      for (const key of src.keys) {
        const id = positiveInt(get(key));
        if (ref.row === null && id !== null) ref.row = { table: src.table, id };
      }
    }
    const type = get('entity_type');
    const id = get('entity_id');
    if (ref.entity === null && typeof type === 'string' && type.length > 0 && (typeof id === 'string' || typeof id === 'number') && String(id).length > 0) {
      ref.entity = { type, id: String(id) };
    }
  }
  return ref;
}

/**
 * Pure decision. `hidden` = the Verse is hidden (VERSE_PUBLIC is not 'true');
 * `parked` = the request targets a space outside LIVE_SPACES (null = the request
 * names no space); `unknownSpace` = it names a group id that does not exist.
 */
export function verseGateDecision(input: { hidden: boolean; parked: boolean | null; unknownSpace?: boolean; admin: boolean }): 'allow' | 'deny' {
  if (input.admin) return 'allow';
  if (input.hidden) return 'deny';
  if (input.unknownSpace) return 'deny';
  return input.parked ? 'deny' : 'allow';
}

const DENIED = (): NextResponse => NextResponse.json({ error: 'not_found' }, { status: 404 });

const slugById = new Map<number, string>();

/** Slug of a group id, cached for the life of the instance (slugs do not change). */
async function slugOf(groupId: number): Promise<string | null> {
  const hit = slugById.get(groupId);
  if (hit) return hit;
  const { data } = await createServiceRoleClient().from('groups').select('slug').eq('id', groupId).maybeSingle();
  const slug = typeof data?.slug === 'string' ? data.slug : null;
  if (slug) slugById.set(groupId, slug);
  return slug;
}

/** Group id of the row or entity a request names; undefined = it names none. */
async function groupIdOf(ref: SpaceRef): Promise<number | null | undefined> {
  if (ref.groupId !== null) return ref.groupId;
  if (ref.row) {
    const { data } = await createServiceRoleClient().from(ref.row.table).select('group_id').eq('id', ref.row.id).maybeSingle();
    const n = Number((data as { group_id?: unknown } | null)?.group_id);
    return Number.isInteger(n) && n > 0 ? n : null;
  }
  if (ref.entity) return resolveEntityGroupId(ref.entity.type, ref.entity.id);
  return undefined;
}

async function gate(ref: SpaceRef): Promise<NextResponse | null> {
  const hidden = verseHidden();
  // While the Verse is hidden nothing else matters: one admin check, no lookup.
  if (hidden) return (await isVerseAdmin()) ? null : DENIED();

  let parked: boolean | null = null;
  let unknownSpace = false;
  if (ref.slug) parked = spaceUnpublished(ref.slug);
  if (parked !== true) {
    const groupId = await groupIdOf(ref);
    if (groupId === null) unknownSpace = true;
    else if (groupId !== undefined) {
      const slug = await slugOf(groupId);
      if (!slug) unknownSpace = true;
      else parked = spaceUnpublished(slug);
    }
  }
  if (!parked && !unknownSpace) return null;
  return verseGateDecision({ hidden, parked, unknownSpace, admin: await isVerseAdmin() }) === 'allow' ? null : DENIED();
}

/**
 * First line of every /api/verse write handler. Returns the 404 to send, or null
 * to go on. Reads a COPY of a JSON body (the handler still reads its own), never a
 * multipart one (an upload route passes its group id to verseSpaceGate instead).
 */
export async function verseWriteGate(req: Request): Promise<NextResponse | null> {
  let body: Record<string, unknown> | null = null;
  if (!verseHidden() && (req.headers.get('content-type') ?? '').includes('application/json')) {
    try {
      const parsed: unknown = await req.clone().json();
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) body = parsed as Record<string, unknown>;
    } catch { /* the handler answers its own bad_json */ }
  }
  let query: URLSearchParams | null = null;
  try { query = new URL(req.url).searchParams; } catch { /* no query */ }
  return gate(spaceRefFrom(body, query));
}

/** For a route that learns its space from a row it loaded (or from a multipart form). */
export async function verseSpaceGate(groupId: number | null | undefined): Promise<NextResponse | null> {
  const n = Number(groupId);
  return gate({ groupId: Number.isInteger(n) && n > 0 ? n : null, slug: null, row: null, entity: null });
}
