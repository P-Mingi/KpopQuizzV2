// Run O1 (ADM back): the shapes the admin routes answer and the display layer returns. ADM front codes against these.
import type { ImageKind, ImageLicense } from './constants';

/** The credit and licence the owner typed with an image. license_note is required for 'other'. */
export interface ImageMeta {
  readonly source_url: string;
  readonly author: string;
  readonly license: ImageLicense;
  readonly license_note?: string | null;
}

/** One stored image as the admin routes answer it ("image" of { ok, image }). */
export interface EntityImageDto {
  readonly kind: ImageKind;
  /** A series slug, or '<series slug>/<character slug>' for a character. */
  readonly slug: string;
  /** The public URL of the 1x WebP and of the 2x WebP. */
  readonly url: string;
  readonly url2x: string;
  readonly width: number;
  readonly height: number;
  /** 0 to 100, for object-position. */
  readonly focalX: number;
  readonly focalY: number;
  readonly license: ImageLicense;
  readonly author: string;
  readonly sourceUrl: string;
  readonly licenseNote: string | null;
  readonly updatedAt: string;
}

/** The columns read from public.entity_images (the display columns the browser roles may select too). */
export interface EntityImageRow {
  readonly site_id: string;
  readonly kind: ImageKind;
  readonly slug: string;
  readonly path: string;
  readonly width: number;
  readonly height: number;
  readonly focal_x: number | string;
  readonly focal_y: number | string;
  readonly license: ImageLicense;
  readonly author: string;
  readonly source_url: string;
  readonly license_note: string | null;
  readonly updated_at: string;
}

/** What a page shows for a series or a character: the owner's image, the bundled photo (series only), else null. */
export interface DisplayImage {
  readonly source: 'upload' | 'bundled';
  /** A public URL (upload) or a path of the app (bundled). */
  readonly url: string;
  /** The 2x file; null for the bundled photo. */
  readonly url2x: string | null;
  readonly width: number;
  readonly height: number;
  /** 0 to 100, for object-position. */
  readonly focalX: number;
  readonly focalY: number;
  /** The words of the picture; null when the data carries none (an upload: the page uses the name). */
  readonly alt: string | null;
  /** The credit to print: set for cc_by and cc_by_sa uploads and for the bundled photos that ask for one; else null. */
  readonly attribution: { readonly author: string; readonly license: string; readonly sourceUrl: string } | null;
  /** The licence key of an upload (for the credits page); null for the bundled photo. */
  readonly license: ImageLicense | null;
  readonly author: string | null;
  readonly sourceUrl: string | null;
}

/** One answer of the admin routes. */
export type AdminAnswer<T> = ({ ok: true } & T) | { error: string; code: string };
