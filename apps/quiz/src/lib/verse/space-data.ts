// Verse public read queries. Cookie-free (createPublicReadClient) so /verse
// pages stay ISR-cacheable. Every query is NANO-cheap and min-gated: a group
// with no seeded data simply does not appear as a space.
import { createPublicReadClient } from '@/lib/supabase/server';

export interface SpaceTile {
  group_id: number;
  name: string;
  slug: string;
  fandom_name: string;
  display_color: string | null;
  text_color: string | null;
  logo_url: string | null;
  memberCount: number;
  albumCount: number;
  is_launch: boolean;
  est_year: number | null;
  /** First member portrait: the card's visual (V-POLISH: imagery is the organ). */
  photo_url: string | null;
}

/**
 * Whole-catalog totals for the V-HOME numbers. Head counts (count:'exact',
 * head:true) so they are ROBUST past the 1000-row select cap and cheap (no rows
 * fetched). releases = every catalogued album (the catalog claim, not tile scope).
 */
export async function getCatalogTotals(): Promise<{ idols: number; releases: number }> {
  const db = createPublicReadClient();
  const [{ count: idols }, { count: releases }] = await Promise.all([
    db.from('idols').select('*', { count: 'exact', head: true }).eq('active', true),
    db.from('albums').select('*', { count: 'exact', head: true }),
  ]);
  return { idols: idols ?? 0, releases: releases ?? 0 };
}

/**
 * The spaces directory: every group that has seeded Verse data (>=1 published
 * idol). Launch spaces first, then by member richness. Real data only.
 */
export async function getVerseDirectory(): Promise<SpaceTile[]> {
  const db = createPublicReadClient();

  const [{ data: idols }, { data: albums }, { data: groups }, { data: spaces }] = await Promise.all([
    db.from('idols').select('group_id, photo_url, ord').eq('active', true).order('ord'),
    db.from('albums').select('group_id'),
    db.from('groups').select('id, name, slug, fandom_name, display_color, text_color, logo_url'),
    db.from('verse_spaces').select('group_id, is_launch, est_year'),
  ]);

  const memberBy = new Map<number, number>();
  const photoBy = new Map<number, string>();
  for (const r of (idols ?? []) as { group_id: number; photo_url: string | null }[]) {
    memberBy.set(r.group_id, (memberBy.get(r.group_id) ?? 0) + 1);
    if (r.photo_url && !photoBy.has(r.group_id)) photoBy.set(r.group_id, r.photo_url);
  }
  const albumBy = new Map<number, number>();
  for (const r of (albums ?? []) as { group_id: number }[]) albumBy.set(r.group_id, (albumBy.get(r.group_id) ?? 0) + 1);
  const spaceBy = new Map<number, { is_launch: boolean; est_year: number | null }>();
  for (const r of (spaces ?? []) as { group_id: number; is_launch: boolean; est_year: number | null }[]) spaceBy.set(r.group_id, r);
  const groupBy = new Map<number, { id: number; name: string; slug: string; fandom_name: string; display_color: string | null; text_color: string | null; logo_url: string | null }>();
  for (const g of (groups ?? []) as never[]) groupBy.set((g as { id: number }).id, g);

  const tiles: SpaceTile[] = [];
  for (const [gid, count] of memberBy) {
    const g = groupBy.get(gid);
    if (!g) continue;
    const sp = spaceBy.get(gid);
    tiles.push({
      group_id: gid, name: g.name, slug: g.slug, fandom_name: g.fandom_name,
      display_color: g.display_color, text_color: g.text_color, logo_url: g.logo_url,
      memberCount: count, albumCount: albumBy.get(gid) ?? 0,
      is_launch: sp?.is_launch ?? false, photo_url: photoBy.get(gid) ?? null, est_year: sp?.est_year ?? null,
    });
  }
  tiles.sort((a, b) =>
    (b.is_launch ? 1 : 0) - (a.is_launch ? 1 : 0)
    || b.memberCount - a.memberCount
    || a.name.localeCompare(b.name));
  return tiles;
}

/* ======================================================================
   V-POLISH step 8 (audit item 4) - the V-HOME content plan's data layer.
   Everything below is honest data we already hold or one cheap computation:
   no fake content, min-gates preserved by the page.
   ====================================================================== */

export interface TodayItem { kind: 'birthday' | 'debut' | 'release'; label: string; sub: string; href: string; }

/** Today in K-pop: birthdays (7-day window), debut + release anniversaries
 * (today, any year), across every group with a space. Sorted soonest-first,
 * today's events leading. */
export async function getTodayInKpop(limit = 6): Promise<TodayItem[]> {
  const db = createPublicReadClient();
  const today = new Date();
  const mmdd = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const daysUntil = (md: string): number => {
    const [m, d] = md.split('-').map(Number);
    const target = new Date(today.getFullYear(), (m ?? 1) - 1, d ?? 1);
    if (target < new Date(today.getFullYear(), today.getMonth(), today.getDate())) target.setFullYear(target.getFullYear() + 1);
    return Math.round((target.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / 86400_000);
  };
  const [{ data: idols }, { data: albums }, { data: groups }] = await Promise.all([
    db.from('idols').select('name, birth_date, group_id').eq('active', true).not('birth_date', 'is', null),
    db.from('albums').select('title, release_date, group_id').not('release_date', 'is', null),
    db.from('groups').select('id, name, slug, fandom_name, inception_date'),
  ]);
  const gBy = new Map(((groups ?? []) as { id: number; name: string; slug: string; fandom_name: string; inception_date: string | null }[]).map((g) => [g.id, g]));
  const items: (TodayItem & { inDays: number })[] = [];
  for (const i of (idols ?? []) as { name: string; birth_date: string; group_id: number }[]) {
    const g = gBy.get(i.group_id);
    if (!g || i.birth_date.length < 10) continue;
    const inDays = daysUntil(i.birth_date.slice(5, 10));
    if (inDays > 7) continue;
    items.push({ kind: 'birthday', inDays, label: inDays === 0 ? `Happy birthday, ${i.name}` : `${i.name}'s birthday`, sub: inDays === 0 ? g.name : `in ${inDays} day${inDays === 1 ? '' : 's'}`, href: `/verse/${g.slug}/members` });
  }
  for (const g of gBy.values()) {
    if (!g.inception_date || g.inception_date.slice(5, 10) !== mmdd) continue;
    const years = today.getFullYear() - Number(g.inception_date.slice(0, 4));
    if (years > 0) items.push({ kind: 'debut', inDays: 0, label: `${years} years of ${g.name}`, sub: 'debut anniversary today', href: `/verse/${g.slug}` });
  }
  for (const a of (albums ?? []) as { title: string; release_date: string; group_id: number }[]) {
    const g = gBy.get(a.group_id);
    if (!g || a.release_date.slice(5, 10) !== mmdd) continue;
    const years = today.getFullYear() - Number(a.release_date.slice(0, 4));
    if (years > 0) items.push({ kind: 'release', inDays: 0, label: `${a.title} turns ${years}`, sub: `${g.name} · released ${a.release_date.slice(0, 4)}`, href: `/verse/${g.slug}/discography` });
  }
  return items.sort((a, b) => a.inDays - b.inDays).slice(0, limit);
}

export interface NewestPage { title: string; slug: string; groupSlug: string; fandom: string; publishedAt: string | null; }

/** The newest published wiki pages across every space. */
export async function getNewestWikiPages(limit = 4): Promise<NewestPage[]> {
  const db = createPublicReadClient();
  const { data: pages } = await db.from('verse_pages')
    .select('title, slug, group_id, published_at')
    .eq('status', 'published').order('published_at', { ascending: false }).limit(limit);
  const rows = (pages ?? []) as { title: string; slug: string; group_id: number; published_at: string | null }[];
  if (!rows.length) return [];
  const { data: groups } = await db.from('groups').select('id, slug, fandom_name').in('id', [...new Set(rows.map((r) => r.group_id))]);
  const gBy = new Map(((groups ?? []) as { id: number; slug: string; fandom_name: string }[]).map((g) => [g.id, g]));
  return rows.flatMap((r) => {
    const g = gBy.get(r.group_id);
    return g ? [{ title: r.title, slug: r.slug, groupSlug: g.slug, fandom: g.fandom_name, publishedAt: r.published_at }] : [];
  });
}

export interface ActivityRow { label: string; sub: string; href: string; at: string; }

/** The latest real edits across the Verse (group sections + wiki pages), with
 * author display names. The live signal the home page lacked. */
export async function getLatestVerseActivity(limit = 3): Promise<ActivityRow[]> {
  const db = createPublicReadClient();
  const { data: revs } = await db.from('verse_revisions')
    .select('entity_type, entity_id, section_key, author, created_at')
    .in('entity_type', ['group', 'page'])
    .order('created_at', { ascending: false }).limit(limit * 3);
  const rows = (revs ?? []) as { entity_type: string; entity_id: string; section_key: string; author: string | null; created_at: string }[];
  if (!rows.length) return [];
  const groupIds = [...new Set(rows.filter((r) => r.entity_type === 'group').map((r) => Number(r.entity_id)).filter(Number.isFinite))];
  const pageIds = [...new Set(rows.filter((r) => r.entity_type === 'page').map((r) => Number(r.entity_id)).filter(Number.isFinite))];
  const authorIds = [...new Set(rows.map((r) => r.author).filter((a): a is string => !!a))];
  const [{ data: groups }, { data: pages }, { data: profs }] = await Promise.all([
    groupIds.length ? db.from('groups').select('id, slug, fandom_name').in('id', groupIds) : Promise.resolve({ data: [] }),
    pageIds.length ? db.from('verse_pages').select('id, title, slug, group_id').in('id', pageIds) : Promise.resolve({ data: [] }),
    authorIds.length ? db.from('profiles').select('id, username, display_name').in('id', authorIds) : Promise.resolve({ data: [] }),
  ]);
  const pBy = new Map(((pages ?? []) as { id: number; title: string; slug: string; group_id: number }[]).map((p) => [p.id, p]));
  const pageGroupIds = [...new Set([...pBy.values()].map((p) => p.group_id))].filter((id) => !groupIds.includes(id));
  const { data: moreGroups } = pageGroupIds.length ? await db.from('groups').select('id, slug, fandom_name').in('id', pageGroupIds) : { data: [] };
  const gBy = new Map((([...(groups ?? []), ...(moreGroups ?? [])]) as { id: number; slug: string; fandom_name: string }[]).map((g) => [g.id, g]));
  const aBy = new Map(((profs ?? []) as { id: number | string; username: string | null; display_name: string | null }[]).map((p) => [String(p.id), p.display_name ?? p.username ?? 'a fan']));
  const out: ActivityRow[] = [];
  for (const r of rows) {
    if (out.length >= limit) break;
    const who = r.author ? (aBy.get(r.author) ?? 'a fan') : 'a fan';
    if (r.entity_type === 'group') {
      const g = gBy.get(Number(r.entity_id));
      if (!g) continue;
      out.push({ label: `${g.fandom_name} ${r.section_key} updated`, sub: `by ${who}`, href: `/verse/${g.slug}`, at: r.created_at });
    } else {
      const p = pBy.get(Number(r.entity_id));
      if (!p) continue;
      const g2 = gBy.get(p.group_id);
      out.push({ label: `${p.title} edited`, sub: `by ${who}`, href: g2 ? `/verse/${g2.slug}/wiki/${p.slug}` : '/verse', at: r.created_at });
    }
  }
  return out;
}
