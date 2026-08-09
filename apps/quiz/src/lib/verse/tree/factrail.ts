// V-FOUNDATION F1 Phase C / F3 - the FACT RAIL. A grouped infobox for entity-bound pages,
// built from the ONE relational source of truth, with COMPUTED fields (age, track count, era
// release count) that are always current and never hand-copied (our unfair advantage over
// fandom's hand-duplicated, drifting infoboxes). Every computed row is marked auto = derived
// from data. Absent data -> the row is omitted (honest emptiness, min-gate), never faked.
// F3 extends buildFactRail to dispatch on entity_kind (idol / album / track / era / award),
// each rail sourced from REAL DB data only (covenant), with links to the sibling tree pages.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { PageRow } from './types';

// F2 A2 + F3: each row carries a stable key. `auto` = a COMPUTED field (age, years active, track
// count, era release count) - LOCKED, never editable. `editable` rows can carry a per-field
// curator OVERRIDE (Data -> Edited grammar); `edited` marks that an override is in force.
// Overrides ride the page body jsonb (no schema change), so a typed fact can never silently
// contradict the DB. `href` (single) / `links` (a list) make a row a LINK to a sibling tree
// page; linked rows are DATA, never free-text editable (an override would break the link).
export interface FactLink { label: string; href: string }
export interface FactRow { key: string; dt: string; dd: string; auto?: boolean; editable?: boolean; edited?: boolean; href?: string; links?: FactLink[] }
export interface FactSection { heading: string; rows: FactRow[] }
export interface FactOverrides { fields?: Record<string, string>; photo?: string }
/** The editable (non-computed, non-linked) fact keys - the only ones a curator override may
 * touch. Computed keys (born, years, rel_tracks, era_releases) and linked keys (rel_era,
 * rel_artist, trk_album, era_prev, era_next, awd_recipient) are DELIBERATELY absent, so the
 * fail-closed clamp (blocks.clampFactOverrides) drops any override aimed at them. */
export const EDITABLE_FACT_KEYS = [
  'name', 'from', 'positions', 'debut', 'fandom',                   // idol
  'rel_type', 'rel_released',                                       // release (album)
  'trk_no', 'trk_released',                                         // track
  'era_years', 'era_concept',                                      // era
  'awd_ceremony', 'awd_year', 'awd_category', 'awd_result',        // award
] as const;

type RowOpts = { auto?: boolean; href?: string; links?: FactLink[] };
type RowFn = (key: string, dt: string, baseDd: string, opts?: RowOpts) => FactRow;

function yearsBetween(fromIso: string | null | undefined, now: Date): number | null {
  if (!fromIso) return null;
  const m = fromIso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const from = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  let y = now.getFullYear() - from.getFullYear();
  const md = now.getMonth() - from.getMonth() || now.getDate() - from.getDate();
  if (md < 0) y -= 1;
  return y >= 0 ? y : null;
}

function fmtDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}`;
}
function yearOf(iso: string | null | undefined): string | null {
  return iso?.match(/^(\d{4})/)?.[1] ?? null;
}
const RELEASE_TYPE: Record<string, string> = { ep: 'EP', album: 'Album', single: 'Single', compilation: 'Compilation', mixtape: 'Mixtape' };
function titleCase(s: string | null | undefined): string | null { return s ? s.charAt(0).toUpperCase() + s.slice(1) : null; }

// resolve the space slug (space_id REFERENCES groups(id)); links are /verse/<spaceSlug>/<pageSlug>.
async function spaceSlugOf(db: SupabaseClient, spaceId: number): Promise<string | null> {
  const { data } = await db.from('groups').select('slug').eq('id', spaceId).maybeSingle();
  return (data as { slug: string | null } | null)?.slug ?? null;
}
// resolve the published tree-page slug for a bound entity (or null -> the link degrades to text).
async function slugForEntity(db: SupabaseClient, spaceId: number, kind: string, entityId: number): Promise<string | null> {
  const { data } = await db.from('pages').select('slug')
    .eq('space_id', spaceId).eq('entity_kind', kind).eq('entity_id', entityId).eq('status', 'published').maybeSingle();
  return (data as { slug: string | null } | null)?.slug ?? null;
}

/** Build the grouped infobox for a page's entity binding (idol / album / track / era / award);
 * other kinds return null. `ov` applies per-field curator overrides (A2) on editable rows;
 * computed + linked rows are never overridden. */
export async function buildFactRail(db: SupabaseClient, page: PageRow, now: Date, ov?: FactOverrides): Promise<FactSection[] | null> {
  if (page.entity_id == null || !page.entity_kind) return null;
  const fields = ov?.fields ?? {};
  const row: RowFn = (key, dt, baseDd, opts) => {
    const linked = !!(opts?.href || opts?.links);
    const editable = !opts?.auto && !linked && (EDITABLE_FACT_KEYS as readonly string[]).includes(key);
    const overridden = editable && typeof fields[key] === 'string' && fields[key]!.trim() !== '';
    return {
      key, dt, dd: overridden ? fields[key]! : baseDd,
      ...(opts?.auto ? { auto: true } : {}),
      ...(editable ? { editable: true } : {}),
      ...(overridden ? { edited: true } : {}),
      ...(opts?.href ? { href: opts.href } : {}),
      ...(opts?.links ? { links: opts.links } : {}),
    };
  };
  switch (page.entity_kind) {
    case 'idol': return idolRail(db, page, now, row);
    case 'album': return releaseRail(db, page, row);
    case 'track': return trackRail(db, page, row);
    case 'era': return eraRail(db, page, row);
    case 'award': return awardRail(db, page, row);
    default: return null;
  }
}

// ---------------------------------------------------------------- idol (F1)
async function idolRail(db: SupabaseClient, page: PageRow, now: Date, row: RowFn): Promise<FactSection[] | null> {
  const { data: idol } = await db.from('idols')
    .select('name, name_hangul, birth_date, nationality, positions, group_id')
    .eq('id', page.entity_id!).maybeSingle();
  if (!idol) return null;
  const i = idol as { name: string; name_hangul: string | null; birth_date: string | null; nationality: string | null; positions: string[] | null; group_id: number };

  const { data: group } = await db.from('groups').select('name, fandom_name, inception_date').eq('id', i.group_id).maybeSingle();
  const g = group as { name: string; fandom_name: string | null; inception_date: string | null } | null;

  const sections: FactSection[] = [];
  const personal: FactRow[] = [];
  if (i.name) personal.push(row('name', 'Name', i.name));
  const born = fmtDate(i.birth_date);
  const age = yearsBetween(i.birth_date, now);
  if (born) personal.push(row('born', 'Born', age != null ? `${born} (age ${age})` : born, { auto: age != null }));
  if (i.nationality) personal.push(row('from', 'From', i.nationality));
  if (personal.length) sections.push({ heading: 'Personal', rows: personal });

  if (g) {
    const grp: FactRow[] = [];
    const debut = fmtDate(g.inception_date);
    const active = yearsBetween(g.inception_date, now);
    if (debut) grp.push(row('debut', 'Debut', debut));
    if (active != null) grp.push(row('years', 'Years active', `${active} years`, { auto: true }));
    const pos = (i.positions ?? []).filter(Boolean);
    if (pos.length) grp.push(row('positions', 'Positions', pos.join(', ')));
    if (g.fandom_name) grp.push(row('fandom', 'Fandom', g.fandom_name));
    if (grp.length) sections.push({ heading: g.name, rows: grp });
  }
  return sections.length ? sections : null;
}

// ---------------------------------------------------------------- release / album (F3)
async function releaseRail(db: SupabaseClient, page: PageRow, row: RowFn): Promise<FactSection[] | null> {
  const { data: album } = await db.from('albums')
    .select('title, release_date, type, era_id, group_id').eq('id', page.entity_id!).maybeSingle();
  if (!album) return null;
  const a = album as { title: string; release_date: string | null; type: string | null; era_id: number | null; group_id: number };
  const spaceSlug = await spaceSlugOf(db, page.space_id);

  const { count: trackCount } = await db.from('album_tracks').select('id', { count: 'exact', head: true }).eq('album_id', page.entity_id!);
  const { data: group } = await db.from('groups').select('name').eq('id', a.group_id).maybeSingle();
  const gName = (group as { name: string } | null)?.name ?? null;

  let eraName: string | null = null, eraHref: string | undefined;
  if (a.era_id != null) {
    const { data: era } = await db.from('eras').select('name').eq('id', a.era_id).maybeSingle();
    eraName = (era as { name: string } | null)?.name ?? null;
    if (eraName && spaceSlug) { const s = await slugForEntity(db, page.space_id, 'era', a.era_id); if (s) eraHref = `/verse/${spaceSlug}/${s}`; }
  }

  const rows: FactRow[] = [];
  const type = a.type ? (RELEASE_TYPE[a.type.toLowerCase()] ?? titleCase(a.type)) : null;
  if (type) rows.push(row('rel_type', 'Type', type));
  const released = fmtDate(a.release_date);
  if (released) rows.push(row('rel_released', 'Released', released));
  if ((trackCount ?? 0) > 0) rows.push(row('rel_tracks', 'Tracks', String(trackCount), { auto: true }));
  if (eraName) rows.push(row('rel_era', 'Era', eraName, eraHref ? { href: eraHref } : undefined));
  if (gName) rows.push(row('rel_artist', 'Primary artist', gName, spaceSlug ? { href: `/verse/${spaceSlug}` } : undefined));
  // Label is not stored on albums (honest emptiness) - omitted; a curator writes it in the body.
  return rows.length ? [{ heading: 'Release', rows }] : null;
}

// ---------------------------------------------------------------- track (F3)
async function trackRail(db: SupabaseClient, page: PageRow, row: RowFn): Promise<FactSection[] | null> {
  const { data: track } = await db.from('album_tracks')
    .select('title, album_id, position, song_id').eq('id', page.entity_id!).maybeSingle();
  if (!track) return null;
  const t = track as { title: string; album_id: number; position: number | null; song_id: number | null };
  const spaceSlug = await spaceSlugOf(db, page.space_id);

  // Album(s) this track appears on. A recording (song_id) can sit on several albums - list them.
  let albumIds = [t.album_id];
  if (t.song_id != null) {
    const { data: sibs } = await db.from('album_tracks').select('album_id').eq('song_id', t.song_id);
    const ids = [...new Set((sibs as { album_id: number }[] | null ?? []).map((r) => r.album_id))];
    if (ids.length) albumIds = ids;
  }
  const { data: albums } = await db.from('albums').select('id, title, release_date').in('id', albumIds);
  const albumRows = (albums as { id: number; title: string; release_date: string | null }[] | null) ?? [];
  const links: FactLink[] = [];
  if (spaceSlug) for (const al of albumRows) { const s = await slugForEntity(db, page.space_id, 'album', al.id); if (s) links.push({ label: al.title, href: `/verse/${spaceSlug}/${s}` }); }
  const primary = albumRows.find((al) => al.id === t.album_id) ?? albumRows[0];

  const rows: FactRow[] = [];
  const albumLabel = albumRows.map((al) => al.title).join(', ');
  if (albumLabel) rows.push(row('trk_album', albumRows.length > 1 ? 'Albums' : 'Album', albumLabel, links.length ? { links } : undefined));
  if (t.position != null) rows.push(row('trk_no', 'Track number', String(t.position)));
  const released = fmtDate(primary?.release_date);
  if (released) rows.push(row('trk_released', 'Released', released));
  // Duration + credits are not stored (honest emptiness) - omitted until a curator writes them.
  return rows.length ? [{ heading: 'Track', rows }] : null;
}

// ---------------------------------------------------------------- era / chapter (F3)
async function eraRail(db: SupabaseClient, page: PageRow, row: RowFn): Promise<FactSection[] | null> {
  const { data: era } = await db.from('eras')
    .select('name, concept, period_start, period_end, ord, group_id').eq('id', page.entity_id!).maybeSingle();
  if (!era) return null;
  const e = era as { name: string; concept: string | null; period_start: string | null; period_end: string | null; ord: number | null; group_id: number };
  const spaceSlug = await spaceSlugOf(db, page.space_id);

  // releases in this era (AUTO count + a linked list)
  const { count: relCount } = await db.from('albums').select('id', { count: 'exact', head: true }).eq('era_id', page.entity_id!);
  const { data: rels } = await db.from('albums').select('id, title, release_date').eq('era_id', page.entity_id!).order('release_date').limit(500);
  const relRows = (rels as { id: number; title: string; release_date: string | null }[] | null) ?? [];
  const relLinks: FactLink[] = [];
  if (spaceSlug) for (const r of relRows) { const s = await slugForEntity(db, page.space_id, 'album', r.id); if (s) relLinks.push({ label: r.title, href: `/verse/${spaceSlug}/${s}` }); }

  // preceding / following era by ordinal within the group
  const neighbour = async (ord: number): Promise<{ name: string; id: number } | null> => {
    if (e.ord == null) return null;
    const { data } = await db.from('eras').select('id, name').eq('group_id', e.group_id).eq('ord', ord).maybeSingle();
    return (data as { id: number; name: string } | null) ?? null;
  };
  const prev = e.ord != null ? await neighbour(e.ord - 1) : null;
  const next = e.ord != null ? await neighbour(e.ord + 1) : null;

  const rows: FactRow[] = [];
  const startY = yearOf(e.period_start), endY = yearOf(e.period_end);
  const years = startY ? (endY && endY !== startY ? `${startY}-${endY}` : startY) : null;
  if (years) rows.push(row('era_years', 'Years', years));
  if ((relCount ?? 0) > 0) rows.push(row('era_releases', (relCount === 1 ? 'Release' : 'Releases'), String(relCount), relLinks.length ? { auto: true, links: relLinks } : { auto: true }));
  if (e.concept) rows.push(row('era_concept', 'Concept', e.concept));
  if (prev) { const s = spaceSlug ? await slugForEntity(db, page.space_id, 'era', prev.id) : null; rows.push(row('era_prev', 'Preceded by', prev.name, s ? { href: `/verse/${spaceSlug}/${s}` } : undefined)); }
  if (next) { const s = spaceSlug ? await slugForEntity(db, page.space_id, 'era', next.id) : null; rows.push(row('era_next', 'Followed by', next.name, s ? { href: `/verse/${spaceSlug}/${s}` } : undefined)); }
  return rows.length ? [{ heading: 'Era', rows }] : null;
}

// ---------------------------------------------------------------- award (F3)
async function awardRail(db: SupabaseClient, page: PageRow, row: RowFn): Promise<FactSection[] | null> {
  const { data: award } = await db.from('awards')
    .select('award_name, category, ceremony, year, result, group_id, idol_id').eq('id', page.entity_id!).maybeSingle();
  if (!award) return null;
  const w = award as { award_name: string | null; category: string | null; ceremony: string | null; year: number | null; result: string | null; group_id: number; idol_id: number | null };
  const spaceSlug = await spaceSlugOf(db, page.space_id);

  // recipient: a member (idol_id) links to the member page; otherwise the group -> the space home.
  let recipient: string | null = null, recipHref: string | undefined;
  if (w.idol_id != null) {
    const { data: idol } = await db.from('idols').select('name').eq('id', w.idol_id).maybeSingle();
    recipient = (idol as { name: string } | null)?.name ?? null;
    if (recipient && spaceSlug) { const s = await slugForEntity(db, page.space_id, 'idol', w.idol_id); if (s) recipHref = `/verse/${spaceSlug}/${s}`; }
  }
  if (!recipient) {
    const { data: group } = await db.from('groups').select('name').eq('id', w.group_id).maybeSingle();
    recipient = (group as { name: string } | null)?.name ?? null;
    if (recipient && spaceSlug) recipHref = `/verse/${spaceSlug}`;
  }

  const rows: FactRow[] = [];
  if (w.ceremony) rows.push(row('awd_ceremony', 'Ceremony', w.ceremony));
  if (w.year != null) rows.push(row('awd_year', 'Year', String(w.year)));
  if (w.category) rows.push(row('awd_category', 'Category', w.category));
  if (w.result) rows.push(row('awd_result', 'Result', titleCase(w.result)!));
  if (recipient) rows.push(row('awd_recipient', 'Recipient', recipient, recipHref ? { href: recipHref } : undefined));
  return rows.length ? [{ heading: 'Award', rows }] : null;
}

/** Whether the fact rail ALONE justifies indexability (the Phase G exemption, per kind, F3):
 * idol always; a release with a real tracklist; an era with releases; track + award stay the
 * CONSERVATIVE stub-until-body (they need real prose to index). Reads live richness from the DB. */
export async function railGrantsIndex(db: SupabaseClient, entityKind: string | null | undefined, entityId: number | null | undefined): Promise<boolean> {
  if (!entityKind || entityId == null) return false;
  if (entityKind === 'idol') return true;
  if (entityKind === 'album') { const { count } = await db.from('album_tracks').select('id', { count: 'exact', head: true }).eq('album_id', entityId); return (count ?? 0) > 0; }
  if (entityKind === 'era') { const { count } = await db.from('albums').select('id', { count: 'exact', head: true }).eq('era_id', entityId); return (count ?? 0) > 0; }
  return false;   // track, award: conservative (flag for Cowork to rule)
}
