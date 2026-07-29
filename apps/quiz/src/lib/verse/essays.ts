// W4.12 - curated member essays. Members draft + submit; curators feature or reject.
// Only featured essays are public (RLS). Author profiles merged separately (no FK).
import { createPublicReadClient, createServiceRoleClient } from '@/lib/supabase/server';

export interface EssayAuthor { username: string | null; displayName: string | null; avatarUrl: string | null; avatarBg: string | null; avatarText: string | null }
export interface EssaySummary { id: number; title: string; slug: string | null; status: string; author: EssayAuthor | null; authorId: string; featuredAt: string | null; createdAt: string }
export interface EssayFull extends EssaySummary { content: unknown; groupId: number }

const PROF_COLS = 'id, username, display_name, avatar_url, avatar_bg, avatar_text';
type Prof = { id: string; username: string | null; display_name: string | null; avatar_url: string | null; avatar_bg: string | null; avatar_text: string | null };
const toAuthor = (p: Prof | undefined): EssayAuthor | null => p ? { username: p.username, displayName: p.display_name, avatarUrl: p.avatar_url, avatarBg: p.avatar_bg, avatarText: p.avatar_text } : null;

async function attachAuthors<T extends { authorId: string }>(rows: T[]): Promise<Array<T & { author: EssayAuthor | null }>> {
  if (rows.length === 0) return [];
  const db = createServiceRoleClient();
  const { data } = await db.from('profiles').select(PROF_COLS).in('id', [...new Set(rows.map((r) => r.authorId))]);
  const byId = new Map((data ?? []).map((p: Prof) => [p.id, p]));
  return rows.map((r) => ({ ...r, author: toAuthor(byId.get(r.authorId)) }));
}

/** Featured essays for a space (public / ISR). */
export async function getFeaturedEssays(groupId: number): Promise<EssaySummary[]> {
  const db = createPublicReadClient();
  const { data } = await db.from('verse_essays').select('id, title, slug, status, author, featured_at, created_at').eq('group_id', groupId).eq('status', 'featured').order('featured_at', { ascending: false });
  const rows = (data ?? []).map((r: { id: number; title: string; slug: string | null; status: string; author: string; featured_at: string | null; created_at: string }) => ({ id: r.id, title: r.title, slug: r.slug, status: r.status, authorId: r.author, featuredAt: r.featured_at, createdAt: r.created_at }));
  return attachAuthors(rows);
}

/** One essay by id (service-role; caller enforces access for non-featured). */
export async function getEssay(id: number): Promise<EssayFull | null> {
  const db = createServiceRoleClient();
  const { data } = await db.from('verse_essays').select('id, group_id, title, slug, status, author, content, featured_at, created_at').eq('id', id).maybeSingle();
  if (!data) return null;
  const r = data as { id: number; group_id: number; title: string; slug: string | null; status: string; author: string; content: unknown; featured_at: string | null; created_at: string };
  const [withAuthor] = await attachAuthors([{ id: r.id, title: r.title, slug: r.slug, status: r.status, authorId: r.author, featuredAt: r.featured_at, createdAt: r.created_at }]);
  return { ...withAuthor!, content: r.content, groupId: r.group_id };
}

/** A user's own essays (any status). */
export async function getUserEssays(userId: string, groupId: number): Promise<EssaySummary[]> {
  const db = createServiceRoleClient();
  const { data } = await db.from('verse_essays').select('id, title, slug, status, author, featured_at, created_at').eq('author', userId).eq('group_id', groupId).order('updated_at', { ascending: false });
  return attachAuthors((data ?? []).map((r: { id: number; title: string; slug: string | null; status: string; author: string; featured_at: string | null; created_at: string }) => ({ id: r.id, title: r.title, slug: r.slug, status: r.status, authorId: r.author, featuredAt: r.featured_at, createdAt: r.created_at })));
}

/** Submitted essays awaiting review (curator queue). */
export async function getSubmittedEssays(groupId: number): Promise<EssaySummary[]> {
  const db = createServiceRoleClient();
  const { data } = await db.from('verse_essays').select('id, title, slug, status, author, featured_at, created_at').eq('group_id', groupId).eq('status', 'submitted').order('created_at', { ascending: true });
  return attachAuthors((data ?? []).map((r: { id: number; title: string; slug: string | null; status: string; author: string; featured_at: string | null; created_at: string }) => ({ id: r.id, title: r.title, slug: r.slug, status: r.status, authorId: r.author, featuredAt: r.featured_at, createdAt: r.created_at })));
}
