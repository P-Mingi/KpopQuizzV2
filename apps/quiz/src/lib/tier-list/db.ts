import { unstable_cache } from 'next/cache';

import { createPublicReadClient, createServiceRoleClient } from '@/lib/supabase/server';

import { getBankItems } from './bank';
import { canViewOwned } from './publish';
import { fandomAgrees, type ItemConsensus } from './aggregate';
import { encodeBoard, type SharedBoard } from './share-state';

import type { Placements, SubjectKind, Tier, TierListItem, Visibility } from './types';

// DB READ layer for persisted tier lists (migration 146). Cookie-free client
// (PERF doctrine) so pages stay static/ISR-cacheable; RLS on the anon key means
// these reads only ever see PUBLIC + UNLISTED rows (a private row returns null,
// which the page turns into notFound). Writes live in actions.ts (service role /
// creator-scoped), never here.

export interface StoredList {
  id: string;
  slug: string;
  title: string;
  creatorId: string | null;
  anonId: string | null;
  subjectGroupId: number | null;
  subjectKind: SubjectKind;
  tiers: Tier[];
  placements: Placements;
  visibility: Visibility;
  views: number;
  likes: number;
  createdAt: string;
  updatedAt: string;
}

interface Row {
  id: string; slug: string; title: string; creator_id: string | null; anon_id: string | null;
  subject_group_id: number | null; subject_kind: SubjectKind; tiers: Tier[]; placements: Placements;
  visibility: Visibility; views: number; likes: number; created_at: string; updated_at: string;
}

export function rowToStored(r: Row): StoredList {
  return {
    id: r.id, slug: r.slug, title: r.title, creatorId: r.creator_id, anonId: r.anon_id,
    subjectGroupId: r.subject_group_id, subjectKind: r.subject_kind,
    tiers: Array.isArray(r.tiers) ? r.tiers : [], placements: (r.placements ?? {}) as Placements,
    visibility: r.visibility, views: r.views, likes: r.likes, createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

const LIST_COLS = 'id,slug,title,creator_id,anon_id,subject_group_id,subject_kind,tiers,placements,visibility,views,likes,created_at,updated_at';

/** One list by slug. Anon RLS => only public/unlisted resolve; private -> null. */
export async function getListBySlug(slug: string): Promise<StoredList | null> {
  const db = createPublicReadClient();
  const { data } = await db.from('tier_lists').select(LIST_COLS).eq('slug', slug).maybeSingle();
  return data ? rowToStored(data as Row) : null;
}

/**
 * Owner read for a PRIVATE (or any owned) list. The public/ISR page uses the
 * cookie-free client, which RLS hides a private row from - so a creator saving
 * private could not see it. This reads the row with the service role and returns
 * it ONLY when the viewer is its owner (session user, or the anon cookie id for a
 * logged-out creator); a non-owner gets null (the caller 404s). Used only by the
 * dynamic, noindex owner-view route, never by the public ISR page.
 */
export async function getOwnedListBySlug(
  slug: string,
  viewer: { userId: string | null; anonId: string | null },
): Promise<StoredList | null> {
  if (!viewer.userId && !viewer.anonId) return null;
  const admin = createServiceRoleClient();
  const { data } = await admin.from('tier_lists').select(LIST_COLS).eq('slug', slug).maybeSingle();
  if (!data) return null;
  const row = data as Row;
  if (!canViewOwned({ creator_id: row.creator_id, anon_id: row.anon_id }, viewer)) return null;
  return rowToStored(row);
}

/** All PUBLIC slugs, for generateStaticParams + the sitemap. */
export const getPublicSlugs = unstable_cache(
  async (): Promise<{ slug: string; updatedAt: string }[]> => {
    const db = createPublicReadClient();
    const { data } = await db.from('tier_lists').select('slug,updated_at')
      .eq('visibility', 'public').order('created_at', { ascending: false }).limit(2000);
    return (data ?? []).map((r: { slug: string; updated_at: string }) => ({ slug: r.slug, updatedAt: r.updated_at }));
  },
  ['tier-list:public-slugs:v1'],
  { revalidate: 300, tags: ['tier-lists'] },
);

/** Public lists for a subject (community/subject page + fandom-agrees source). */
export const getPublicListsForSubject = unstable_cache(
  async (groupId: number, kind: SubjectKind): Promise<StoredList[]> => {
    const db = createPublicReadClient();
    const { data } = await db.from('tier_lists').select(LIST_COLS)
      .eq('visibility', 'public').eq('subject_group_id', groupId).eq('subject_kind', kind)
      .order('likes', { ascending: false }).order('created_at', { ascending: false }).limit(200);
    return (data ?? []).map((r) => rowToStored(r as Row));
  },
  ['tier-list:subject-lists:v1'],
  { revalidate: 300, tags: ['tier-lists'] },
);

export interface RecentList { slug: string; title: string; likes: number; views: number; subjectGroupId: number | null; subjectKind: SubjectKind }

/** Newest public lists, for the hub's trending strip. */
export const getRecentPublicLists = unstable_cache(
  async (limit = 8): Promise<RecentList[]> => {
    const db = createPublicReadClient();
    const { data } = await db.from('tier_lists').select('slug,title,likes,views,subject_group_id,subject_kind')
      .eq('visibility', 'public').order('created_at', { ascending: false }).limit(limit);
    return ((data ?? []) as Array<{ slug: string; title: string; likes: number; views: number; subject_group_id: number | null; subject_kind: SubjectKind }>)
      .map((r) => ({ slug: r.slug, title: r.title, likes: r.likes, views: r.views, subjectGroupId: r.subject_group_id, subjectKind: r.subject_kind }));
  },
  ['tier-list:recent:v1'],
  { revalidate: 300, tags: ['tier-lists'] },
);

// One coloured tier row of the community card's mini board preview: the tier
// label + colour, the first couple of members' initials, and how many more.
export interface CommunityTierRow { label: string; color: string; chips: string[]; more: number }
// A recent public tier list, shaped for the Community "Recent tier lists" box.
export interface CommunityTierList {
  slug: string;
  title: string;
  likes: number;
  views: number;
  authorName: string | null;
  authorAvatarUrl: string | null;
  authorBg: string;
  authorText: string;
  authorInitial: string;
  rows: CommunityTierRow[];
}

function chipInitials(name: string): string {
  const clean = name.trim();
  if (!clean) return '?';
  const parts = clean.split(/\s+/);
  if (parts.length >= 2 && parts[0]![0] && parts[1]![0]) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  return clean.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || clean.slice(0, 2).toUpperCase();
}

/**
 * The newest public tier lists for the Community "Recent tier lists" box, each
 * with its real author (from profiles) and a compact top-3-tier board preview
 * (real member initials from the bank). Cached like the other reads (ISR, 5 min),
 * so the profile + bank reads run once per revalidation, not per request.
 */
export const getRecentTierListsForCommunity = unstable_cache(
  async (limit = 4): Promise<CommunityTierList[]> => {
    const db = createPublicReadClient();
    const { data } = await db.from('tier_lists').select(LIST_COLS)
      .eq('visibility', 'public').order('created_at', { ascending: false }).limit(limit);
    const lists = (data ?? []).map((r) => rowToStored(r as Row));
    if (lists.length === 0) return [];

    // Batch the authors so N lists cost one profiles read, not N.
    const creatorIds = [...new Set(lists.map((l) => l.creatorId).filter((id): id is string => !!id))];
    const authorById = new Map<string, { name: string; avatarUrl: string | null; bg: string; text: string }>();
    if (creatorIds.length > 0) {
      const { data: profs } = await db.from('profiles')
        .select('id, username, display_name, avatar_url, avatar_bg, avatar_text').in('id', creatorIds);
      for (const p of (profs ?? []) as Array<{ id: string; username: string | null; display_name: string | null; avatar_url: string | null; avatar_bg: string | null; avatar_text: string | null }>) {
        authorById.set(p.id, {
          name: p.display_name || p.username || 'anonymous',
          avatarUrl: p.avatar_url,
          bg: p.avatar_bg || '#ED93B1',
          text: p.avatar_text || '#FFFFFF',
        });
      }
    }

    const out: CommunityTierList[] = [];
    for (const l of lists) {
      const items = await getBankItems(l.subjectGroupId, l.subjectKind);
      const byId = new Map(items.map((i) => [i.id, i] as const));
      const rows: CommunityTierRow[] = [];
      for (const t of [...l.tiers].sort((a, b) => a.ord - b.ord)) {
        const named = (l.placements[t.label] ?? []).map((id) => byId.get(id)).filter((i): i is TierListItem => !!i);
        if (named.length === 0) continue;
        const shown = named.slice(0, 2);
        rows.push({ label: t.label, color: t.color, chips: shown.map((i) => chipInitials(i.name)), more: named.length - shown.length });
        if (rows.length >= 3) break;
      }
      if (rows.length === 0) continue; // nothing placed yet: not a card worth showing
      const author = l.creatorId ? authorById.get(l.creatorId) : undefined;
      out.push({
        slug: l.slug,
        title: l.title,
        likes: l.likes,
        views: l.views,
        authorName: author?.name ?? null,
        authorAvatarUrl: author?.avatarUrl ?? null,
        authorBg: author?.bg ?? '#E7DFF5',
        authorText: author?.text ?? '#8A7BB0',
        authorInitial: (author?.name ?? 'A').charAt(0).toUpperCase(),
        rows,
      });
    }
    return out;
  },
  ['tier-list:community-recent:v1'],
  { revalidate: 300, tags: ['tier-lists'] },
);

/** Distinct public subjects (for the community index of tier-list subjects). */
export const getPublicSubjects = unstable_cache(
  async (): Promise<{ groupId: number; kind: SubjectKind; count: number }[]> => {
    const db = createPublicReadClient();
    const { data } = await db.from('tier_lists').select('subject_group_id,subject_kind')
      .eq('visibility', 'public').not('subject_group_id', 'is', null).limit(2000);
    const tally = new Map<string, { groupId: number; kind: SubjectKind; count: number }>();
    for (const r of (data ?? []) as { subject_group_id: number; subject_kind: SubjectKind }[]) {
      const key = `${r.subject_group_id}:${r.subject_kind}`;
      const cur = tally.get(key);
      if (cur) cur.count += 1;
      else tally.set(key, { groupId: r.subject_group_id, kind: r.subject_kind, count: 1 });
    }
    return [...tally.values()].sort((a, b) => b.count - a.count);
  },
  ['tier-list:public-subjects:v1'],
  { revalidate: 300, tags: ['tier-lists'] },
);

/**
 * Resolve the item metadata (name + image) referenced by one or more boards.
 * Bank items come from the shared subject read; custom ids (`custom:<assetId>`)
 * are looked up in tier_list_assets (approved OR the caller's own are visible via
 * RLS; on the anon read path only approved resolve, which is what a public page
 * needs). Missing ids fall back to a name-less placeholder so the board still
 * renders (the maker/OG initials tile handles a null image).
 */
export async function resolveItems(subjectGroupId: number | null, subjectKind: SubjectKind, placementsList: Placements[]): Promise<Map<string, TierListItem>> {
  const byId = new Map<string, TierListItem>();
  const bank = subjectKind !== 'blank' && subjectGroupId != null ? await getBankItems(subjectGroupId, subjectKind) : [];
  for (const it of bank) byId.set(it.id, it);

  const customAssetIds = new Set<string>();
  for (const p of placementsList) {
    for (const ids of Object.values(p)) {
      for (const id of ids) {
        if (id.startsWith('custom:') && !byId.has(id)) customAssetIds.add(id.slice('custom:'.length));
      }
    }
  }
  if (customAssetIds.size > 0) {
    const db = createPublicReadClient();
    const { data } = await db.from('tier_list_assets').select('id,name,image_url').in('id', [...customAssetIds]);
    for (const a of (data ?? []) as { id: string; name: string; image_url: string }[]) {
      byId.set(`custom:${a.id}`, { id: `custom:${a.id}`, kind: 'custom', name: a.name, image_url: a.image_url });
    }
  }
  return byId;
}

/** The creator byline for a public list (or null for an anonymous list). */
export async function getCreatorByline(creatorId: string | null): Promise<{ name: string; username: string | null; avatarUrl: string | null } | null> {
  if (!creatorId) return null;
  const db = createPublicReadClient();
  const { data } = await db.from('profiles').select('username,display_name,avatar_url').eq('id', creatorId).maybeSingle();
  if (!data) return null;
  const d = data as { username: string | null; display_name: string | null; avatar_url: string | null };
  return { name: d.display_name || d.username || 'A fan', username: d.username, avatarUrl: d.avatar_url };
}

/** Build a shareable board (share-state shape) from a stored row + resolved items. */
export function storedToShared(list: StoredList, itemMap: Map<string, TierListItem>): SharedBoard {
  const ids = new Set<string>();
  for (const arr of Object.values(list.placements)) for (const id of arr) ids.add(id);
  const items = [...ids].map((id) => itemMap.get(id) ?? { id, kind: 'custom' as const, name: '?', image_url: null });
  return { title: list.title, tiers: list.tiers, placements: list.placements, items, subjectGroupId: list.subjectGroupId, subjectKind: list.subjectKind };
}

/** The `?d=` for the OG card of a stored list (ranked items only). */
export function encodeStoredForOg(list: StoredList, itemMap: Map<string, TierListItem>): string {
  return encodeBoard(storedToShared(list, itemMap));
}

/** The `?d=` for a remix link (whole set on an empty board). */
export function encodeStoredForRemix(list: StoredList, itemMap: Map<string, TierListItem>): string {
  return encodeBoard(storedToShared(list, itemMap), { allItems: true });
}

/**
 * "Where the fandom agrees" for a subject, computed at read time (no counter
 * table) under unstable_cache over the cookie-free client. Returns the consensus
 * plus the resolved item metadata so the UI can render faces.
 */
export const getFandomConsensus = unstable_cache(
  async (groupId: number, kind: SubjectKind, tierOrder: string[]): Promise<{ consensus: ItemConsensus[]; items: Record<string, TierListItem>; listCount: number }> => {
    const lists = await getPublicListsForSubject(groupId, kind);
    const placements = lists.map((l) => l.placements);
    const consensus = fandomAgrees(placements, tierOrder);
    const itemMap = await resolveItems(groupId, kind, placements);
    const items: Record<string, TierListItem> = {};
    for (const c of consensus) {
      const it = itemMap.get(c.itemId);
      if (it) items[c.itemId] = it;
    }
    return { consensus, items, listCount: lists.length };
  },
  ['tier-list:consensus:v1'],
  { revalidate: 300, tags: ['tier-lists'] },
);
