// Run O1 (ADM back): the constants of the admin images of bunnyverse.org/anime. Pure, no I/O. The table is public.entity_images
// (docs/pending-migrations/multisite/018-entity-images.sql) and the Storage bucket is 'entity-images'.

export const IMAGE_SITE = 'anime' as const;
export const BUCKET = 'entity-images';

export type ImageKind = 'series' | 'character';
export const IMAGE_KINDS: readonly ImageKind[] = ['series', 'character'];

export const LICENSES = ['cc0', 'public_domain', 'cc_by', 'cc_by_sa', 'own_photo', 'licensed', 'other'] as const;
export type ImageLicense = (typeof LICENSES)[number];

/**
 * The licences the owner can pick for an image (owner decision of 2026-11-02, CR-021): CC0, public domain, CC BY, CC BY-SA, other free
 * licence. 'own_photo' and 'licensed' stay valid in the database for what it already holds and for the banners, icons and stickers.
 */
export const FREE_LICENSES = ['cc0', 'public_domain', 'cc_by', 'cc_by_sa', 'other'] as const;
export type FreeLicense = (typeof FREE_LICENSES)[number];

/** Licences that need a credit on /credits (never on a page or in a game). The database says the same with entity_images.needs_credit. */
export const ATTRIBUTION_LICENSES: readonly ImageLicense[] = ['cc_by', 'cc_by_sa'];

export interface ImageSize { readonly w: number; readonly h: number }
export interface KindSizes { readonly x1: ImageSize; readonly x2: ImageSize }

/**
 * The fixed sizes of the stored WebP, 1x and 2x. cover = the series photo box of the bundled photos (736x981, 3:4, the files of
 * public/series). portrait: the character tile of the series page is an 80 px circle (p3-member-face) that crops any picture by
 * object-position, so it fixes no portrait ratio; the personality result and a character page need a portrait, so it is 3:4 too.
 */
export const SIZES: Readonly<Record<ImageKind, KindSizes>> = {
  series: { x1: { w: 736, h: 981 }, x2: { w: 1472, h: 1962 } },
  character: { x1: { w: 360, h: 480 }, x2: { w: 720, h: 960 } },
};

/** A source picture smaller than half of the 1x box in either side is refused (it would be a blur once enlarged). */
export const MIN_SOURCE_FRACTION = 0.5;

/** The most bytes of an uploaded or imported source file. */
export const MAX_SOURCE_BYTES = 8 * 1024 * 1024;
/** The most pixels sharp decodes (a decompression bomb guard). */
export const MAX_SOURCE_PIXELS = 50_000_000;
/** The most bytes of one stored output file (the bucket limit is 4 MB). */
export const MAX_OUTPUT_BYTES = 4 * 1024 * 1024;

export const IMPORT_TIMEOUT_MS = 10_000;
export const IMPORT_MAX_REDIRECTS = 3;

export const MAX_AUTHOR = 200;
export const MAX_NOTE = 500;
export const MAX_SOURCE_URL = 2000;

/** The default focal point: the middle. */
export const DEFAULT_FOCAL = 50;

export function sizesOf(kind: ImageKind): KindSizes {
  return SIZES[kind];
}

/** The path of the 2x file: the 1x path with -2x before the extension. */
export function path2x(path: string): string {
  return path.replace(/\.webp$/, '-2x.webp');
}

/** The cache tag of one image; every write of that image revalidates it. */
export function imageTag(kind: ImageKind, slug: string, site: string = IMAGE_SITE): string {
  return `entity-image:${site}:${kind}:${slug}`;
}

/**
 * The tag of the list read of the display (lib/anime/entity-images-read.ts keeps every image row of the site in one cached read, because
 * a page needs the pictures of a whole series and the layout needs all of them). One scheme for both sides: every write expires this tag
 * and the tag of the image it touched (tagsOfImage), so whatever the display reads, per image or as a list, is fresh at once.
 */
export const IMAGES_LIST_TAG = `entity-images:${IMAGE_SITE}`;

/** Every tag a write of one image expires: its own and the list's. */
export function tagsOfImage(kind: ImageKind, slug: string, site: string = IMAGE_SITE): string[] {
  return [imageTag(kind, slug, site), IMAGES_LIST_TAG];
}

/** The bucket folder of an image: anime/series/<series> or anime/character/<series>/<character>. */
export function folderOf(kind: ImageKind, slug: string, site: string = IMAGE_SITE): string {
  return `${site}/${kind}/${slug}`;
}

/** The words printed for a licence (the credits page and the attribution line). */
export const LICENSE_LABEL: Readonly<Record<ImageLicense, string>> = {
  cc0: 'CC0',
  public_domain: 'Public domain',
  cc_by: 'CC BY',
  cc_by_sa: 'CC BY-SA',
  own_photo: 'Own photo',
  licensed: 'Licensed by the rights holder',
  other: 'Other licence',
};

/** The display columns of public.entity_images: the column grants of the browser roles list exactly these. */
export const DISPLAY_COLUMNS = 'site_id, kind, slug, path, width, height, focal_x, focal_y, license, author, source_url, license_note, updated_at';

/** The columns the admin reads with the service role: the display ones and the two credit columns of CR-021 the browser roles cannot select. */
export const ADMIN_COLUMNS = `${DISPLAY_COLUMNS}, license_url, commons_file`;
