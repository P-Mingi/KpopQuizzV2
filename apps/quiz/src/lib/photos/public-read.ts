// Daily games step 2: the public reads of the licensed pictures, for the pages of bunnyverse.org (the home's image slots, /credits). They read
// only the two views of 022 with the public client: site_assets_public (the live version of each slot, never a draft, a scheduled or a
// retired one, never a picture whose licence is not verified) and entity_images_public (the verified pictures of entities). Fail closed:
// until 022 is applied, on any error, or with no Supabase settings at build time, a read answers nothing and the page keeps its fallback.
// Cached for one minute (the admin lives on another build, so its writes cannot expire this cache: "the banner changes within the minute").
import { unstable_cache } from 'next/cache';

import { fetchAllRows } from '@/lib/db/fetch-all';
import { publicUrl } from '@/lib/entity-images/store';
import { createPublicReadClient } from '@/lib/supabase/server';

import { isLicense, parseFocal } from './slots';

import type { ImageLicense } from './slots';

/** The cache of the public reads: the admin's writes show within this many seconds. */
export const PUBLIC_TTL = 60;

const SAFE_PATH = /^[a-z0-9][a-z0-9/_.-]*[.]webp$/;
const safePath = (p: unknown): string | null => (typeof p === 'string' && SAFE_PATH.test(p) && !p.includes('..') ? p : null);
const httpsOrNull = (u: unknown): string | null => {
  if (typeof u !== 'string') return null;
  try { return new URL(u).protocol === 'https:' ? u : null; } catch { return null; }
};

/** One live slot of site_assets_public, its values checked (a stored value is never trusted at a sink). */
export interface LiveAsset {
  readonly key: string;
  readonly type: 'banner' | 'card_image' | 'icon' | 'sticker';
  readonly page: string;
  readonly settings: Record<string, unknown>;
  /** Public URLs of the large, 400 px and 96 px files; null for a library icon. */
  readonly large: string | null;
  readonly mid: string | null;
  readonly thumb: string | null;
  readonly width: number | null;
  readonly height: number | null;
  readonly sourceUrl: string | null;
  readonly author: string | null;
  readonly license: ImageLicense | null;
  readonly licenseNote: string | null;
  readonly publishedAt: string | null;
}

interface AssetRow {
  key: unknown; type: unknown; page: unknown; settings: unknown; path: unknown; mid_path: unknown; thumb_path: unknown; width: unknown; height: unknown;
  source_url: unknown; author: unknown; license: unknown; license_note: unknown; published_at: unknown;
}

const TYPES = ['banner', 'card_image', 'icon', 'sticker'] as const;

export function toLiveAsset(r: AssetRow): LiveAsset | null {
  if (typeof r.key !== 'string' || typeof r.page !== 'string' || !(TYPES as readonly unknown[]).includes(r.type)) return null;
  const path = safePath(r.path);
  if (r.path !== null && r.path !== undefined && !path) return null;
  if (path && (!isLicense(r.license) || typeof r.author !== 'string')) return null;
  const mid = safePath(r.mid_path);
  const thumb = safePath(r.thumb_path);
  return {
    key: r.key, type: r.type as LiveAsset['type'], page: r.page,
    settings: r.settings && typeof r.settings === 'object' && !Array.isArray(r.settings) ? (r.settings as Record<string, unknown>) : {},
    large: path ? publicUrl(path) : null, mid: mid ? publicUrl(mid) : null, thumb: thumb ? publicUrl(thumb) : null,
    width: typeof r.width === 'number' ? r.width : null, height: typeof r.height === 'number' ? r.height : null,
    sourceUrl: httpsOrNull(r.source_url), author: typeof r.author === 'string' ? r.author : null,
    license: isLicense(r.license) ? r.license : null, licenseNote: typeof r.license_note === 'string' ? r.license_note : null,
    publishedAt: typeof r.published_at === 'string' ? r.published_at : null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the app's clients are untyped
type Db = any;

export async function loadLiveAssets(db: Db): Promise<LiveAsset[]> {
  const rows = await fetchAllRows<AssetRow>(() => db.from('site_assets_public')
    .select('key, type, page, settings, path, mid_path, thumb_path, width, height, source_url, author, license, license_note, published_at')
    .order('key', { ascending: true }));
  return rows.map(toLiveAsset).filter((a): a is LiveAsset => a !== null);
}

// A failed read throws inside the cache, so it is never kept: the next request tries again, and a page never stays empty for a whole
// cache period because of one blip.
const liveAssetsCached = unstable_cache(
  async (): Promise<LiveAsset[]> => loadLiveAssets(createPublicReadClient()),
  ['db:hub:site-assets-public:v1'],
  { revalidate: PUBLIC_TTL, tags: ['site-assets'] },
);

/** The live slots, or [] (022 not applied, a network error, no Supabase settings at build time, outside a request). */
export async function getLiveAssets(): Promise<LiveAsset[]> {
  try {
    return await liveAssetsCached();
  } catch (err) {
    console.error('[photos] site_assets_public read failed:', (err as Error)?.message ?? err);
    return [];
  }
}

/** The focal point of a slot as CSS object-position. */
export function assetPosition(a: Pick<LiveAsset, 'settings'>): string {
  const f = parseFocal(a.settings.focal);
  return `${Math.round(f.x)}% ${Math.round(f.y)}%`;
}

// ---- verified pictures of entities ----------------------------------------------------------------------------------------------------

export interface PublicPicture {
  readonly site: string;
  readonly kind: string;
  readonly slug: string;
  readonly url: string;
  readonly thumb: string | null;
  readonly position: string;
  readonly name: string | null;
  readonly sourceUrl: string;
  readonly author: string;
  readonly license: ImageLicense;
  readonly licenseNote: string | null;
  readonly updatedAt: string;
}

interface PictureRow {
  site_id: unknown; kind: unknown; slug: unknown; path: unknown; thumb_path: unknown; focal_x: unknown; focal_y: unknown; source_url: unknown;
  author: unknown; license: unknown; license_note: unknown; updated_at: unknown; name: unknown;
}

export function toPublicPicture(r: PictureRow): PublicPicture | null {
  const path = safePath(r.path);
  const source = httpsOrNull(r.source_url);
  if (!path || !source || !isLicense(r.license) || typeof r.author !== 'string' || typeof r.kind !== 'string' || typeof r.slug !== 'string' || typeof r.site_id !== 'string') return null;
  const thumb = safePath(r.thumb_path);
  const f = parseFocal({ x: Number(r.focal_x), y: Number(r.focal_y) });
  return {
    site: r.site_id, kind: r.kind, slug: r.slug, url: publicUrl(path), thumb: thumb ? publicUrl(thumb) : null,
    position: `${Math.round(f.x)}% ${Math.round(f.y)}%`, name: typeof r.name === 'string' && r.name.trim() ? r.name : null,
    sourceUrl: source, author: r.author, license: r.license, licenseNote: typeof r.license_note === 'string' ? r.license_note : null,
    updatedAt: typeof r.updated_at === 'string' ? r.updated_at : '',
  };
}

export async function loadPublicPictures(db: Db): Promise<PublicPicture[]> {
  const rows = await fetchAllRows<PictureRow>(() => db.from('entity_images_public')
    .select('site_id, kind, slug, path, thumb_path, focal_x, focal_y, source_url, author, license, license_note, updated_at, name')
    .order('kind', { ascending: true }).order('slug', { ascending: true }));
  return rows.map(toPublicPicture).filter((p): p is PublicPicture => p !== null);
}

const picturesCached = unstable_cache(
  async (): Promise<PublicPicture[]> => loadPublicPictures(createPublicReadClient()),
  ['db:hub:entity-images-public:v1'],
  { revalidate: PUBLIC_TTL * 5, tags: ['entity-images-public'] },
);

/** The verified pictures, or [] on any failure (never cached as a result). */
export async function getPublicPictures(): Promise<PublicPicture[]> {
  try {
    return await picturesCached();
  } catch (err) {
    console.error('[photos] entity_images_public read failed:', (err as Error)?.message ?? err);
    return [];
  }
}
