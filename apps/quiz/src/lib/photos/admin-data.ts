// Daily games step 2: the reads of the Photos tab of the admin (service role: it sees the pictures whose licence is not verified yet, and
// the site_assets drafts). Server only; the page has already checked the admin. Every read is paged past the 1000-row cap. A table that is
// not there yet (022, or 011 for the anime tabs) is said so, never filled with made-up rows: the tab shows that sentence instead.
import { fetchAllRows } from '@/lib/db/fetch-all';
import { seriesImageOf } from '@/lib/anime/series-images';
import { withBasePath } from '@/lib/site/base-path';

import { publicUrl } from '@/lib/entity-images/store';

import type { PhotoKind, TabId } from './slots';
import type { Db } from './store';

/** What the database holds of the step 2 schema. */
export interface PhotoSchema {
  /** entity_images: missing, 018 only (no license_verified, thumb_path), with 019's columns but the kinds of 018, or with 022. */
  readonly entityImages: 'missing' | '018' | '019' | '022';
  readonly agencies: boolean;
  readonly siteAssets: boolean;
  /** The anime tables of 011 (series, characters). */
  readonly anime: boolean;
}

export interface AdminImage {
  readonly url: string;
  readonly thumbUrl: string | null;
  readonly focalX: number;
  readonly focalY: number;
  readonly sourceUrl: string;
  readonly author: string;
  readonly license: string;
  readonly licenseNote: string | null;
  readonly verified: boolean;
}

export interface AdminRow {
  readonly kind: PhotoKind;
  readonly slug: string;
  readonly name: string;
  /** The third column of the board: the group of an idol, the agency of a group, the groups of an agency, the series of a character. */
  readonly context: string;
  /** A picture the site already had with no licence in the database (an idol's file, a group's logo, a series' bundled photo). */
  readonly legacy: { readonly url: string; readonly sourceUrl: string | null; readonly author: string | null } | null;
  /** The record waits for the owner's review (idols.needs_review), or is new (an agency nobody filled yet). */
  readonly review: boolean;
  readonly fresh: boolean;
  readonly image: AdminImage | null;
}

export interface AssetVersion {
  readonly id: number;
  readonly key: string;
  readonly type: string;
  readonly page: string;
  readonly settings: Record<string, unknown>;
  readonly url: string | null;
  readonly thumbUrl: string | null;
  readonly sourceUrl: string | null;
  readonly author: string | null;
  readonly license: string | null;
  readonly licenseNote: string | null;
  readonly verified: boolean;
  readonly publishedAt: string | null;
  readonly createdAt: string;
}

export interface AgencyOption { readonly id: number; readonly name: string }

export interface PhotosAdminData {
  readonly schema: PhotoSchema;
  readonly rows: Readonly<Record<Exclude<TabId, 'banners' | 'icons' | 'stickers'>, readonly AdminRow[]>>;
  readonly assets: readonly AssetVersion[];
  readonly agencies: readonly AgencyOption[];
}

interface ImageRow {
  site_id: string; kind: string; slug: string; path: string; focal_x: number | string; focal_y: number | string;
  source_url: string; author: string; license: string; license_note: string | null; license_verified?: boolean; thumb_path?: string | null;
}

/** The catch-all kpop group (general K-pop quizzes), never a real group. */
const CATCH_ALL_GROUP = 'general-kpop';

const IMAGE_COLUMNS = 'site_id, kind, slug, path, focal_x, focal_y, source_url, author, license, license_note';

/** Is this error a missing table or column (PostgREST and Postgres codes)? Anything else is a real failure. */
function missing(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  return ['42P01', '42703', 'PGRST200', 'PGRST204', 'PGRST205'].includes(error.code ?? '') || /does not exist|could not find/i.test(error.message ?? '');
}

async function probe(db: Db, table: string, columns: string): Promise<boolean> {
  // One retry: a network blip must not read as "the table is missing", nor fail the whole tab at once.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const { error } = await db.from(table).select(columns).limit(1);
    if (!error) return true;
    if (missing(error)) return false;
  }
  throw new Error(`photos admin: ${table} could not be read`);
}

async function readImages(db: Db): Promise<{ state: PhotoSchema['entityImages']; rows: ImageRow[] }> {
  if (!(await probe(db, 'entity_images', 'id'))) return { state: 'missing', rows: [] };
  const full = await probe(db, 'entity_images', 'license_verified, thumb_path');
  const cols = full ? `${IMAGE_COLUMNS}, license_verified, thumb_path` : IMAGE_COLUMNS;
  const rows = await fetchAllRows<ImageRow>(() => db.from('entity_images').select(cols).order('id', { ascending: true }));
  return { state: full ? '019' : '018', rows };
}

function imageOf(r: ImageRow | undefined): AdminImage | null {
  if (!r) return null;
  return {
    url: publicUrl(r.path),
    thumbUrl: r.thumb_path ? publicUrl(r.thumb_path) : null,
    focalX: Number(r.focal_x), focalY: Number(r.focal_y),
    sourceUrl: r.source_url, author: r.author, license: r.license, licenseNote: r.license_note,
    verified: r.license_verified === true,
  };
}

interface IdolRow { id: number; name: string; group_id: number; photo_url: string | null; needs_review: boolean }
interface GroupRow { id: number; name: string; slug: string; logo_url: string | null; record_label: string | null; needs_review: boolean | null }
interface AgencyRow { id: number; name: string; parent_id: number | null; official_url: string | null; sources: string[] | null }
interface SeriesRow { group_id: number }
interface CharRow { group_id: number; slug: string; name: string }
interface AssetRow {
  id: number; key: string; type: string; page: string; settings: Record<string, unknown> | null; path: string | null; thumb_path: string | null;
  source_url: string | null; author: string | null; license: string | null; license_note: string | null; license_verified: boolean;
  published_at: string | null; created_at: string; retired_at: string | null;
}

/** A legacy picture of the site, by its path: a file of public/ (served on this build under its base path) or a full address. */
function legacyUrl(raw: string | null | undefined): string | null {
  const v = (raw ?? '').trim();
  if (!v) return null;
  if (/^https:\/\//.test(v)) return v;
  if (v.startsWith('/')) return withBasePath(v.split('/').map((p, i) => (i === 0 ? p : encodeURIComponent(p))).join('/'));
  return null;
}

const byName = (a: { name: string }, b: { name: string }): number => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' });

export async function loadPhotosAdmin(db: Db): Promise<PhotosAdminData> {
  const img = await readImages(db);
  const [hasAgencies, hasAssets, hasSeries, hasChars] = await Promise.all([
    probe(db, 'agencies', 'id'), probe(db, 'site_assets', 'id'), probe(db, 'series', 'group_id'), probe(db, 'characters', 'id'),
  ]);
  // 019's columns are there; the kinds of 022 are there when its agencies table is (022 does both in one transaction).
  const entityImages: PhotoSchema['entityImages'] = img.state === 'missing' || img.state === '018' ? img.state : hasAgencies ? '022' : '019';
  const schema: PhotoSchema = { entityImages, agencies: hasAgencies, siteAssets: hasAssets, anime: hasSeries && hasChars };

  const imageMap = new Map(img.rows.map((r) => [`${r.kind}|${r.slug}`, r]));
  const [groups, idols, animeGroups] = await Promise.all([
    fetchAllRows<GroupRow>(() => db.from('groups').select('id, name, slug, logo_url, record_label, needs_review').eq('site_id', 'kpop').order('id', { ascending: true })),
    fetchAllRows<IdolRow>(() => db.from('idols').select('id, name, group_id, photo_url, needs_review').order('id', { ascending: true })),
    schema.anime
      ? fetchAllRows<{ id: number; name: string; slug: string }>(() => db.from('groups').select('id, name, slug').eq('site_id', 'anime').order('id', { ascending: true }))
      : Promise.resolve([]),
  ]);
  const groupById = new Map(groups.map((g) => [g.id, g]));

  const idolRows: AdminRow[] = idols.map((i): AdminRow => ({
    kind: 'idol', slug: String(i.id), name: i.name, context: groupById.get(i.group_id)?.name ?? '',
    legacy: legacyUrl(i.photo_url) ? { url: legacyUrl(i.photo_url)!, sourceUrl: null, author: null } : null,
    review: i.needs_review, fresh: false, image: imageOf(imageMap.get(`idol|${i.id}`)),
  }));
  idolRows.sort((a, b) => byName({ name: a.context }, { name: b.context }) || byName(a, b));

  // The catch-all group of the kpop quizzes that name no group is not a group: no picture (the group games leave it out too).
  const groupRows: AdminRow[] = groups.filter((g) => g.slug !== CATCH_ALL_GROUP).map((g): AdminRow => ({
    kind: 'group', slug: String(g.id), name: g.name, context: (g.record_label ?? '').trim(),
    legacy: legacyUrl(g.logo_url) ? { url: legacyUrl(g.logo_url)!, sourceUrl: null, author: null } : null,
    review: g.needs_review === true, fresh: false, image: imageOf(imageMap.get(`group|${g.id}`)),
  })).sort(byName);

  const groupsOfLabel = new Map<string, string[]>();
  for (const g of groups) {
    const label = (g.record_label ?? '').trim();
    if (!label) continue;
    groupsOfLabel.set(label, [...(groupsOfLabel.get(label) ?? []), g.name]);
  }
  let agencies: AgencyRow[] = [];
  if (hasAgencies) agencies = await fetchAllRows<AgencyRow>(() => db.from('agencies').select('id, name, parent_id, official_url, sources').order('id', { ascending: true }));
  // Before 022 there is no agencies table: the tab lists the labels the groups cite, by name, and saving waits for the table.
  const labelRows: AdminRow[] = hasAgencies
    ? agencies.map((a) => ({
      kind: 'agency' as const, slug: String(a.id), name: a.name, context: (groupsOfLabel.get(a.name) ?? []).sort((x, y) => x.localeCompare(y, 'en')).join(', '),
      legacy: null, review: false, fresh: a.parent_id === null && !a.official_url && (a.sources ?? []).length === 0, image: imageOf(imageMap.get(`agency|${a.id}`)),
    })).sort(byName)
    : [...groupsOfLabel.entries()].map(([name, list]) => ({
      kind: 'agency' as const, slug: '', name, context: list.sort((x, y) => x.localeCompare(y, 'en')).join(', '), legacy: null, review: false, fresh: true, image: null,
    })).sort(byName);

  let seriesRows: AdminRow[] = [];
  let charRows: AdminRow[] = [];
  if (schema.anime) {
    const [series, chars] = await Promise.all([
      fetchAllRows<SeriesRow>(() => db.from('series').select('group_id').order('group_id', { ascending: true })),
      fetchAllRows<CharRow>(() => db.from('characters').select('group_id, slug, name, id').order('group_id', { ascending: true }).order('id', { ascending: true })),
    ]);
    const anime = new Map(animeGroups.map((g) => [g.id, g]));
    seriesRows = series.flatMap((s) => {
      const g = anime.get(s.group_id);
      if (!g) return [];
      const bundled = seriesImageOf(g.slug);
      return [{
        kind: 'series' as const, slug: g.slug, name: g.name, context: '',
        legacy: bundled ? { url: bundled.file, sourceUrl: bundled.attribution?.sourceUrl ?? null, author: bundled.attribution?.author ?? null } : null,
        review: false, fresh: false, image: imageOf(imageMap.get(`series|${g.slug}`)),
      }];
    }).sort(byName);
    const countOf = new Map<number, number>();
    charRows = chars.flatMap((c) => {
      const g = anime.get(c.group_id);
      if (!g) return [];
      countOf.set(c.group_id, (countOf.get(c.group_id) ?? 0) + 1);
      const slug = `${g.slug}/${c.slug}`;
      return [{ kind: 'character' as const, slug, name: c.name, context: g.name, legacy: null, review: false, fresh: false, image: imageOf(imageMap.get(`character|${slug}`)) }];
    });
    seriesRows = seriesRows.map((r) => {
      const g = animeGroups.find((x) => x.slug === r.slug);
      const n = g ? countOf.get(g.id) ?? 0 : 0;
      return { ...r, context: n === 1 ? '1 personnage' : `${n} personnages` };
    });
  }

  let assets: AssetVersion[] = [];
  if (hasAssets) {
    const rows = await fetchAllRows<AssetRow>(() => db.from('site_assets')
      .select('id, key, type, page, settings, path, thumb_path, source_url, author, license, license_note, license_verified, published_at, created_at, retired_at')
      .is('retired_at', null).order('key', { ascending: true }).order('id', { ascending: false }));
    assets = rows.map((r) => ({
      id: Number(r.id), key: r.key, type: r.type, page: r.page, settings: r.settings ?? {},
      url: r.path ? publicUrl(r.path) : null, thumbUrl: r.thumb_path ? publicUrl(r.thumb_path) : null,
      sourceUrl: r.source_url, author: r.author, license: r.license, licenseNote: r.license_note, verified: r.license_verified,
      publishedAt: r.published_at, createdAt: r.created_at,
    }));
  }

  return {
    schema,
    rows: { idols: idolRows, groups: groupRows, labels: labelRows, chars: charRows, series: seriesRows },
    assets,
    agencies: agencies.map((a) => ({ id: a.id, name: a.name })).sort(byName),
  };
}
