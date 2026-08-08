// V-FOUNDATION F1 Phase B - THE PAGE CORE server model (C1-C3, C6). Curator-gated CRUD
// over the `pages` tree with append-only history, trash (never hard delete), and eternal
// redirects. All writes go through the SERVICE ROLE from curator-gated API routes; this
// module is pure data access (no auth - the routes gate). Reads use whatever client is
// passed (public-read client for readers, service role for drafts).
//
// LAWS honored: C2 flat slugs + eternal redirects (rename writes a redirect, move keeps
// the URL); C3 every save = one revision, revert = a new revision, delete = trash;
// C5 is_stub computed here so the sitemap stays one cheap partial scan; 1000-row cap
// respected (recent-changes + listings are bounded/paginated by the caller).

import type { SupabaseClient } from '@supabase/supabase-js';

import { pageSlug, uniqueSlug, isValidSlug } from './slug';
import { templateBody, isPageType } from './templates';
import { syncPageLinks, resolveGhostsTo } from './links';
import { applyAutoTags } from './tags';
import { clampBlocks, bodyIsSubstantial } from './blocks';
import { PAGE_BODY_EMPTY } from './types';
import type { PageBody, PageRow, PageRevisionRow, RecentChange, PageStatus } from './types';

const PAGE_COLS = 'id, space_id, parent_id, slug, type, title, status, blocks, entity_kind, entity_id, is_stub, created_by, published_at, created_at, updated_at';

export interface CreatePageInput {
  spaceId: number;
  type: string;
  title: string;
  createdBy: string;            // uuid
  parentId?: number | null;
  entityKind?: string | null;
  entityId?: number | null;
  slug?: string;                // optional explicit slug; else derived from the title
}

export interface CreatePageResult {
  page?: PageRow;
  error?: string;
  duplicate?: { id: number; slug: string; title: string };  // search-first: a same-slug page already exists
}

// ------------------------------------------------------------------ stub rule (C5)
// A page is a STUB (noindex, out of sitemap) until it is substantial. Two ways to qualify:
//   1. it carries a FACT RAIL (an entity kind the reader renders sourced facts for - idol
//      today); those are indexable day 1 (members).
//   2. its BODY meets the real substance bar (F2): a real intro + a section + enough words -
//      the SAME rule the editor's substance meter shows (lib/verse/tree/blocks.substanceOf).
// A kind can carry a fact rail only if a reader builder exists for it; extend as they land.
const FACT_RAIL_KINDS = new Set(['idol']);
export function entityHasFactRail(entityKind: string | null | undefined): boolean {
  return !!entityKind && FACT_RAIL_KINDS.has(entityKind);
}
export function computeIsStub(body: PageBody, hasFactRail: boolean): boolean {
  if (hasFactRail) return false;
  return !bodyIsSubstantial(body as never);
}

// ------------------------------------------------------------------ reads
export async function getPageBySlug(db: SupabaseClient, spaceId: number, slug: string): Promise<PageRow | null> {
  const { data } = await db.from('pages').select(PAGE_COLS).eq('space_id', spaceId).eq('slug', slug).maybeSingle();
  return (data as PageRow | null) ?? null;
}
export async function getPageById(db: SupabaseClient, id: number): Promise<PageRow | null> {
  const { data } = await db.from('pages').select(PAGE_COLS).eq('id', id).maybeSingle();
  return (data as PageRow | null) ?? null;
}
export async function listChildren(db: SupabaseClient, spaceId: number, parentId: number | null): Promise<PageRow[]> {
  let q = db.from('pages').select(PAGE_COLS).eq('space_id', spaceId).order('title');
  q = parentId == null ? q.is('parent_id', null) : q.eq('parent_id', parentId);
  const { data } = await q.limit(1000);
  return (data as PageRow[] | null) ?? [];
}

/** Resolve an eternal redirect (C2): returns the live slug for an old slug, or null. */
export async function resolveRedirect(db: SupabaseClient, spaceId: number, fromSlug: string): Promise<string | null> {
  const { data } = await db.from('page_redirects').select('to_page_id').eq('space_id', spaceId).eq('from_slug', fromSlug).maybeSingle();
  const toId = (data as { to_page_id: number } | null)?.to_page_id;
  if (!toId) return null;
  const target = await getPageById(db, toId);
  return target?.slug ?? null;
}

// ------------------------------------------------------------------ create (search-first)
export async function createPage(svc: SupabaseClient, input: CreatePageInput): Promise<CreatePageResult> {
  const type = isPageType(input.type) ? input.type : null;
  if (!type) return { error: `Unknown page type "${input.type}".` };
  const title = input.title.trim();
  if (!title || title.length > 200) return { error: 'A page needs a title (1 to 200 characters).' };

  const base = input.slug && isValidSlug(input.slug) ? input.slug : pageSlug(title);
  // search-first: never silently duplicate. If the derived slug is taken, surface the
  // existing page so the caller can offer "go to it" instead of minting slug-2.
  const existing = await getPageBySlug(svc, input.spaceId, base);
  if (existing && existing.status !== 'trash') {
    return { duplicate: { id: existing.id, slug: existing.slug, title: existing.title } };
  }
  const slug = await uniqueSlug(svc, input.spaceId, base);

  const body = templateBody(type);
  const row = {
    space_id: input.spaceId,
    parent_id: input.parentId ?? null,
    slug,
    type,
    title,
    status: 'draft' as PageStatus,
    blocks: body,
    entity_kind: input.entityKind ?? null,
    entity_id: input.entityId ?? null,
    is_stub: computeIsStub(body, entityHasFactRail(input.entityKind)),
    created_by: input.createdBy,
  };
  const { data, error } = await svc.from('pages').insert(row).select(PAGE_COLS).single();
  if (error || !data) return { error: error?.message ?? 'Could not create the page.' };
  const page = data as PageRow;
  await writeRevision(svc, page, input.createdBy);   // C3: creation is revision 1
  await syncPageLinks(svc, page);                     // C6: store this page's outbound links
  await resolveGhostsTo(svc, page);                   // C6: ghost links waiting for this slug go blue
  await applyAutoTags(svc, page).catch(() => {});     // C7: data-derived tags (birth year, release type)
  return { page };
}

// ------------------------------------------------------------------ revisions (C3)
async function nextRev(svc: SupabaseClient, pageId: number): Promise<number> {
  const { data } = await svc.from('page_revisions').select('rev').eq('page_id', pageId).order('rev', { ascending: false }).limit(1);
  const top = (data as { rev: number }[] | null)?.[0]?.rev ?? 0;
  return top + 1;
}
async function writeRevision(svc: SupabaseClient, page: PageRow, author: string): Promise<number> {
  const rev = await nextRev(svc, page.id);
  await svc.from('page_revisions').insert({
    page_id: page.id, space_id: page.space_id, rev, title: page.title, blocks: page.blocks, author,
  });
  return rev;
}

/** Save the body/title. Appends a revision, updates the page, recomputes is_stub (C3/C5). */
export async function savePage(
  svc: SupabaseClient, pageId: number, patch: { title?: string; blocks?: PageBody }, author: string,
): Promise<{ page?: PageRow; error?: string }> {
  const cur = await getPageById(svc, pageId);
  if (!cur) return { error: 'Page not found.' };
  const title = (patch.title ?? cur.title).trim();
  if (!title || title.length > 200) return { error: 'Title must be 1 to 200 characters.' };
  // F2: clamp the body to the v1 block model FAIL-CLOSED (unknown/locked-widget kinds dropped,
  // inline runs mark-whitelisted, image paths must be ingest-copied). A raw API call can never
  // smuggle an unknown block or an unsafe href into a page.
  const raw = patch.blocks ?? cur.blocks ?? PAGE_BODY_EMPTY;
  const blocks = clampBlocks(raw).body as unknown as PageBody;
  const { data, error } = await svc.from('pages')
    .update({ title, blocks, is_stub: computeIsStub(blocks, entityHasFactRail(cur.entity_kind)), updated_at: new Date().toISOString() })
    .eq('id', pageId).select(PAGE_COLS).single();
  if (error || !data) return { error: error?.message ?? 'Save failed.' };
  const page = data as PageRow;
  await writeRevision(svc, page, author);
  await syncPageLinks(svc, page);                    // C6: the body changed -> refresh its links
  return { page };
}

export async function listRevisions(db: SupabaseClient, pageId: number, limit = 50): Promise<PageRevisionRow[]> {
  const { data } = await db.from('page_revisions').select('id, page_id, space_id, rev, title, blocks, author, created_at')
    .eq('page_id', pageId).order('rev', { ascending: false }).limit(limit);
  return (data as PageRevisionRow[] | null) ?? [];
}

/** Revert = a NEW revision carrying an old revision's body (never destructive, C3). */
export async function revertToRevision(svc: SupabaseClient, pageId: number, rev: number, author: string): Promise<{ page?: PageRow; error?: string }> {
  const { data } = await svc.from('page_revisions').select('title, blocks').eq('page_id', pageId).eq('rev', rev).maybeSingle();
  const target = data as { title: string; blocks: PageBody } | null;
  if (!target) return { error: `Revision ${rev} not found.` };
  return savePage(svc, pageId, { title: target.title, blocks: target.blocks }, author);
}

// ------------------------------------------------------------------ rename / move (C2)
/** Rename: the title (and thus the slug) may change. A slug change writes an eternal
 * redirect (old_slug -> this page) and appends a revision. The page id never changes. */
export async function renamePage(svc: SupabaseClient, pageId: number, newTitle: string, author: string): Promise<{ page?: PageRow; error?: string; redirected?: boolean }> {
  const cur = await getPageById(svc, pageId);
  if (!cur) return { error: 'Page not found.' };
  const title = newTitle.trim();
  if (!title || title.length > 200) return { error: 'Title must be 1 to 200 characters.' };
  const nextBase = pageSlug(title);
  let slug = cur.slug;
  let redirected = false;
  if (nextBase !== cur.slug) {
    slug = await uniqueSlug(svc, cur.space_id, nextBase, cur.id);
    // eternal redirect from the OLD slug (idempotent on the unique (space_id, from_slug)).
    await svc.from('page_redirects').upsert(
      { space_id: cur.space_id, from_slug: cur.slug, to_page_id: cur.id },
      { onConflict: 'space_id,from_slug' },
    );
    redirected = true;
  }
  const { data, error } = await svc.from('pages')
    .update({ title, slug, updated_at: new Date().toISOString() })
    .eq('id', pageId).select(PAGE_COLS).single();
  if (error || !data) return { error: error?.message ?? 'Rename failed.' };
  const page = data as PageRow;
  await writeRevision(svc, page, author);
  if (redirected) await resolveGhostsTo(svc, page);  // C6: ghosts wanting the new slug resolve
  return { page, redirected };
}

/** Move: parent_id changes; the slug/URL is UNTOUCHED (C2 - move never changes the URL).
 * Guards against a cycle (a page cannot become its own ancestor). */
export async function movePage(svc: SupabaseClient, pageId: number, newParentId: number | null): Promise<{ page?: PageRow; error?: string }> {
  const cur = await getPageById(svc, pageId);
  if (!cur) return { error: 'Page not found.' };
  if (newParentId != null) {
    if (newParentId === pageId) return { error: 'A page cannot be its own parent.' };
    // walk up from the proposed parent; if we meet pageId, the move would cycle.
    let hop: number | null = newParentId;
    for (let i = 0; i < 100 && hop != null; i += 1) {
      if (hop === pageId) return { error: 'That move would put the page inside its own subtree.' };
      const parent = await getPageById(svc, hop);
      hop = parent?.parent_id ?? null;
    }
  }
  const { data, error } = await svc.from('pages')
    .update({ parent_id: newParentId, updated_at: new Date().toISOString() })
    .eq('id', pageId).select(PAGE_COLS).single();
  if (error || !data) return { error: error?.message ?? 'Move failed.' };
  return { page: data as PageRow };
}

// ------------------------------------------------------------------ status (C3 / publish)
async function setStatus(svc: SupabaseClient, pageId: number, status: PageStatus, publish = false): Promise<{ page?: PageRow; error?: string }> {
  const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (publish) {
    const cur = await getPageById(svc, pageId);
    if (cur && !cur.published_at) patch.published_at = new Date().toISOString();  // first publish only
  }
  const { data, error } = await svc.from('pages').update(patch).eq('id', pageId).select(PAGE_COLS).single();
  if (error || !data) return { error: error?.message ?? 'Status change failed.' };
  return { page: data as PageRow };
}
export const publishPage = (svc: SupabaseClient, pageId: number) => setStatus(svc, pageId, 'published', true);
export const trashPage   = (svc: SupabaseClient, pageId: number) => setStatus(svc, pageId, 'trash');
export const restorePage = (svc: SupabaseClient, pageId: number) => setStatus(svc, pageId, 'draft');

// ------------------------------------------------------------------ seeding (C13, Phase G)
// Seed an entity-bound page from the database (members, releases, tracks, eras, awards...).
// Idempotent by (space, entity_kind, entity_id): re-running never duplicates. Published +
// sourced; is_stub reflects honest emptiness (indexable only when it carries real facts -
// a fact rail today = idol pages; the rest are honest shells, noindex until content). No
// fabricated content, ever (the covenant).
const SEED_AUTHOR = '00000000-0000-4000-8000-000000005eed';

export async function seedIndexPage(svc: SupabaseClient, spaceId: number, title: string, slug: string): Promise<PageRow> {
  const existing = await getPageBySlug(svc, spaceId, slug);
  if (existing) return existing;
  const { data } = await svc.from('pages').insert({
    space_id: spaceId, parent_id: null, slug, type: 'index', title,
    status: 'published', blocks: PAGE_BODY_EMPTY, is_stub: true, created_by: SEED_AUTHOR, published_at: new Date().toISOString(),
  }).select(PAGE_COLS).single();
  return data as PageRow;
}

export async function seedEntityPage(svc: SupabaseClient, input: {
  spaceId: number; type: string; entityKind: string; entityId: number; title: string; parentId: number | null; indexable: boolean;
}): Promise<'created' | 'skipped'> {
  const { data: existing } = await svc.from('pages').select('id')
    .eq('space_id', input.spaceId).eq('entity_kind', input.entityKind).eq('entity_id', input.entityId).maybeSingle();
  if (existing) return 'skipped';
  const title = input.title.trim().slice(0, 200) || 'Untitled';
  const slug = await uniqueSlug(svc, input.spaceId, pageSlug(title));
  const body = templateBody(input.type);
  const { data } = await svc.from('pages').insert({
    space_id: input.spaceId, parent_id: input.parentId, slug, type: input.type, title,
    status: 'published', blocks: body, entity_kind: input.entityKind, entity_id: input.entityId,
    is_stub: !input.indexable, created_by: SEED_AUTHOR, published_at: new Date().toISOString(),
  }).select(PAGE_COLS).single();
  if (!data) return 'skipped';
  const page = data as PageRow;
  await writeRevision(svc, page, SEED_AUTHOR);
  await applyAutoTags(svc, page).catch(() => {});
  return 'created';
}

// ------------------------------------------------------------------ recent changes (C3)
export async function recentChanges(svc: SupabaseClient, spaceId: number, limit = 50): Promise<RecentChange[]> {
  const { data: revs } = await svc.from('page_revisions')
    .select('page_id, rev, title, author, created_at')
    .eq('space_id', spaceId).order('created_at', { ascending: false }).limit(Math.min(limit, 1000));
  const rows = (revs as Omit<RecentChange, 'slug' | 'type' | 'status'>[] | null) ?? [];
  if (rows.length === 0) return [];
  const ids = [...new Set(rows.map((r) => r.page_id))];
  const { data: pages } = await svc.from('pages').select('id, slug, type, status').in('id', ids);
  const byId = new Map((pages as { id: number; slug: string; type: string; status: PageStatus }[] ?? []).map((p) => [p.id, p]));
  return rows.map((r) => {
    const p = byId.get(r.page_id);
    return { ...r, slug: p?.slug ?? '', type: p?.type ?? '', status: p?.status ?? 'trash' };
  });
}
