// W4.12 / V-ESSAYS-MAX - curated member essays as a magazine. Members draft +
// submit; curators publish (status='featured' = PUBLIC) and pick ONE hero
// (is_hero) per space. Only public essays are readable (RLS). Author profiles +
// roles merged separately (no FK).
import { createPublicReadClient, createServiceRoleClient } from '@/lib/supabase/server';
import { plainTextExcerpt, splitTipTapForFold } from '@/lib/verse/render-content';

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
/** Featured-essay head count: the reader-nav min-gate (V-MODES). */
export async function featuredEssayCount(groupId: number): Promise<number> {
  const db = createPublicReadClient();
  const { count } = await db.from('verse_essays').select('*', { count: 'exact', head: true }).eq('group_id', groupId).eq('status', 'featured');
  return count ?? 0;
}

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

// --- V-ESSAYS-MAX step 2: the magazine index ---
export interface EssayCard extends EssaySummary { dek: string; readingMin: number; authorRole: string | null; seriesId: number | null; isHero: boolean }
export interface EssaySeriesShelf { id: number; title: string; slug: string | null; essays: EssayCard[] }
export interface MagazineData { hero: (EssayCard & { commentCount: number }) | null; series: EssaySeriesShelf[]; latest: EssayCard[]; publicCount: number }

const readingMin = (words: number): number => Math.max(1, Math.round(words / 200));

/** Attach each author's space role (batch), for the role badge. */
async function attachRoles<T extends { authorId: string }>(rows: T[], groupId: number): Promise<Array<T & { authorRole: string | null }>> {
  if (!rows.length) return rows.map((r) => ({ ...r, authorRole: null }));
  const db = createServiceRoleClient();
  const { data } = await db.from('space_members').select('user_id, role, status').eq('group_id', groupId).in('user_id', [...new Set(rows.map((r) => r.authorId))]);
  const byId = new Map((data ?? []).filter((m: { status: string }) => m.status === 'active').map((m: { user_id: string; role: string }) => [m.user_id, m.role]));
  return rows.map((r) => ({ ...r, authorRole: byId.get(r.authorId) ?? null }));
}

/** The whole magazine for a space: hero + series shelves + latest, all min-gated. */
export async function getMagazine(groupId: number): Promise<MagazineData> {
  const db = createServiceRoleClient();
  const { data, error } = await db.from('verse_essays')
    .select('id, title, slug, status, author, content, featured_at, created_at, is_hero, series_id, series_order')
    .eq('group_id', groupId).eq('status', 'featured').order('featured_at', { ascending: false });
  // ISR bake law: this list DEFINES the magazine page. Throw on error so a
  // transient failure 500s (retried) instead of baking an empty magazine for 1h.
  if (error) throw new Error(`getMagazine(${groupId}): ${error.message}`);
  const raw = (data ?? []) as Array<{ id: number; title: string; slug: string | null; status: string; author: string; content: unknown; featured_at: string | null; created_at: string; is_hero: boolean; series_id: number | null; series_order: number }>;
  if (!raw.length) return { hero: null, series: [], latest: [], publicCount: 0 };

  const base = raw.map((r) => ({
    id: r.id, title: r.title, slug: r.slug, status: r.status, authorId: r.author, featuredAt: r.featured_at, createdAt: r.created_at,
    dek: plainTextExcerpt(r.content, 180), readingMin: readingMin(splitTipTapForFold(r.content).totalWords), seriesId: r.series_id, isHero: r.is_hero,
  }));
  const withAuthors = await attachAuthors(base);
  const cards = (await attachRoles(withAuthors, groupId)) as EssayCard[];
  const byId = new Map(cards.map((c) => [c.id, c] as const));

  const heroCard = cards.find((c) => c.isHero) ?? null;
  let hero: MagazineData['hero'] = null;
  if (heroCard) {
    const { count } = await db.from('verse_discussions').select('*', { count: 'exact', head: true }).eq('entity_type', 'essay').eq('entity_id', String(heroCard.id)).eq('status', 'visible');
    hero = { ...heroCard, commentCount: count ?? 0 };
  }

  // Series shelves: approved series with at least one public essay.
  const { data: seriesRows } = await db.from('verse_essay_series').select('id, title, slug, sort_order').eq('group_id', groupId).eq('status', 'approved').order('sort_order', { ascending: true });
  const series: EssaySeriesShelf[] = ((seriesRows ?? []) as Array<{ id: number; title: string; slug: string | null }>).map((s) => ({
    id: s.id, title: s.title, slug: s.slug,
    essays: raw.filter((r) => r.series_id === s.id).sort((a, b) => a.series_order - b.series_order).map((r) => byId.get(r.id)!).filter(Boolean),
  })).filter((s) => s.essays.length > 0);

  // Latest excludes the hero AND anything already shown in a series shelf, so no
  // essay reads twice on the index (editorial hierarchy stays clean).
  const shelved = new Set(series.flatMap((s) => s.essays.map((e) => e.id)));
  const latest = cards.filter((c) => !c.isHero && !shelved.has(c.id)).slice(0, 12);
  return { hero, series, latest, publicCount: cards.length };
}

// --- V-ESSAYS-MAX step 3: the essay page ---
export interface EssayPage extends EssayFull { cover: unknown; seriesId: number | null; authorRole: string | null; readingMin: number; seriesTitle: string | null }

/** One essay with everything the editorial page needs (service-role; the page
 *  enforces access for non-public statuses). */
export async function getEssayPage(id: number): Promise<EssayPage | null> {
  const db = createServiceRoleClient();
  const { data, error } = await db.from('verse_essays').select('id, group_id, title, slug, status, author, content, cover, featured_at, created_at, series_id').eq('id', id).maybeSingle();
  // ISR bake law: throw on a real query error so a transient failure does not
  // 404 a published essay (and flip its metadata to noindex); null = truly missing.
  if (error) throw new Error(`getEssayPage(${id}): ${error.message}`);
  if (!data) return null;
  const r = data as { id: number; group_id: number; title: string; slug: string | null; status: string; author: string; content: unknown; cover: unknown; featured_at: string | null; created_at: string; series_id: number | null };
  const [withAuthor] = await attachAuthors([{ id: r.id, title: r.title, slug: r.slug, status: r.status, authorId: r.author, featuredAt: r.featured_at, createdAt: r.created_at }]);
  const [withRole] = await attachRoles([withAuthor!], r.group_id);
  let seriesTitle: string | null = null;
  if (r.series_id) {
    const { data: s } = await db.from('verse_essay_series').select('title').eq('id', r.series_id).maybeSingle();
    seriesTitle = (s as { title: string } | null)?.title ?? null;
  }
  return { ...withRole!, content: r.content, groupId: r.group_id, cover: r.cover, seriesId: r.series_id, authorRole: withRole!.authorRole, readingMin: readingMin(splitTipTapForFold(r.content).totalWords), seriesTitle };
}

/** Related public essays: same series first, then other recent, excluding self. */
export async function getRelatedEssays(groupId: number, essayId: number, seriesId: number | null): Promise<EssaySummary[]> {
  const db = createServiceRoleClient();
  const { data } = await db.from('verse_essays').select('id, title, slug, status, author, featured_at, created_at, series_id').eq('group_id', groupId).eq('status', 'featured').neq('id', essayId).order('featured_at', { ascending: false }).limit(20);
  const rows = (data ?? []) as Array<{ id: number; title: string; slug: string | null; status: string; author: string; featured_at: string | null; created_at: string; series_id: number | null }>;
  rows.sort((a, b) => Number((b.series_id === seriesId) && seriesId != null) - Number((a.series_id === seriesId) && seriesId != null));
  const top = rows.slice(0, 4).map((r) => ({ id: r.id, title: r.title, slug: r.slug, status: r.status, authorId: r.author, featuredAt: r.featured_at, createdAt: r.created_at }));
  return attachAuthors(top);
}

/** Reaction summary for an essay: real-user count + whether the caller reacted. */
export async function getReactionSummary(essayId: number, userId: string | null): Promise<{ count: number; mine: boolean }> {
  const db = createServiceRoleClient();
  const { count } = await db.from('verse_essay_reactions').select('*', { count: 'exact', head: true }).eq('essay_id', essayId);
  let mine = false;
  if (userId) {
    const { data } = await db.from('verse_essay_reactions').select('id').eq('essay_id', essayId).eq('user_id', userId).maybeSingle();
    mine = !!data;
  }
  return { count: count ?? 0, mine };
}

// --- V-ESSAYS-MAX step 6: profile + featured-essay widget ---
export interface AuthorEssay { id: number; title: string; groupSlug: string; groupName: string }

/** An author's published essays across spaces (for their profile; feeds V-PROFILE-ONE). */
export async function getAuthorEssays(userId: string): Promise<AuthorEssay[]> {
  const db = createServiceRoleClient();
  const { data } = await db.from('verse_essays').select('id, title, featured_at, groups(slug, name)').eq('author', userId).eq('status', 'featured').order('featured_at', { ascending: false }).limit(20);
  const rows = (data ?? []) as Array<{ id: number; title: string; groups: { slug: string; name: string } | { slug: string; name: string }[] }>;
  return rows.map((r) => { const g = Array.isArray(r.groups) ? r.groups[0] : r.groups; return g ? { id: r.id, title: r.title, groupSlug: g.slug, groupName: g.name } : null; }).filter((x): x is AuthorEssay => !!x);
}

export interface HeroEssayCard { id: number; title: string; dek: string; authorName: string; readingMin: number }

/** The one featured hero essay for a space (for the home widget); null when none. */
export async function getHeroEssay(groupId: number): Promise<HeroEssayCard | null> {
  const db = createServiceRoleClient();
  const { data } = await db.from('verse_essays').select('id, title, author, content').eq('group_id', groupId).eq('status', 'featured').eq('is_hero', true).maybeSingle();
  if (!data) return null;
  const r = data as { id: number; title: string; author: string; content: unknown };
  const [withAuthor] = await attachAuthors([{ id: r.id, title: r.title, slug: null, status: 'featured', authorId: r.author, featuredAt: null, createdAt: '' }]);
  return { id: r.id, title: r.title, dek: plainTextExcerpt(r.content, 130), authorName: withAuthor?.author?.displayName || withAuthor?.author?.username || 'a fan', readingMin: readingMin(splitTipTapForFold(r.content).totalWords) };
}

/** Submitted essays awaiting review (curator queue). */
export async function getSubmittedEssays(groupId: number): Promise<EssaySummary[]> {
  const db = createServiceRoleClient();
  const { data } = await db.from('verse_essays').select('id, title, slug, status, author, featured_at, created_at').eq('group_id', groupId).eq('status', 'submitted').order('created_at', { ascending: true });
  return attachAuthors((data ?? []).map((r: { id: number; title: string; slug: string | null; status: string; author: string; featured_at: string | null; created_at: string }) => ({ id: r.id, title: r.title, slug: r.slug, status: r.status, authorId: r.author, featuredAt: r.featured_at, createdAt: r.created_at })));
}
