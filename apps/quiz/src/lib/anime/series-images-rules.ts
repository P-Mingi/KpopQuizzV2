// Run O1 (IMG): the types and the licence rules of the free series photos. The data is docs/anime/images/<slug>.json, one file per
// series; scripts/gen-series-images.mts turns it into series-images.generated.ts, and series-images.test.ts holds the two equal.
// The generator reads this file, so it imports nothing from the generated map. Pure: no React, no I/O.

/** The credit that a licence asks to print next to the photo (CC BY and CC BY-SA): who, under what, and where to read both. */
export interface SeriesImageAttribution {
  readonly author: string;
  readonly license: string;
  readonly licenseUrl: string;
  readonly sourceUrl: string;
}

/** One entry of the generated map: a photo (file and alt set), or the title card (`fallback` set, nothing else). */
export interface SeriesImage {
  /** Public path of the WebP, `/series/<slug>.webp`; null for a fallback. */
  readonly file: string | null;
  /** What the photo shows, in plain words; null for a fallback. */
  readonly alt: string | null;
  /** The credit line to print, only when the licence requires it; null otherwise (the credits page lists every photo). */
  readonly attribution: SeriesImageAttribution | null;
  readonly fallback: 'title-card' | null;
}

/** Everything the credits page prints about one photo. */
export interface SeriesImageCredit {
  /** The name of the series (docs/anime/data/series), or the slug in words when the slug is not a series (the general mix). */
  readonly name: string;
  readonly file: string;
  readonly alt: string;
  readonly sourceUrl: string;
  readonly author: string;
  readonly license: string;
  readonly licenseUrl: string;
  /** YYYY-MM-DD, the day the photo was downloaded and its licence read on the page. */
  readonly retrieved: string;
  readonly attributionRequired: boolean;
}

/** The licences a photo may carry (owner rules, 2026-10-26): Unsplash, Pexels, and Commons files under CC0, public domain, CC BY, CC BY-SA. */
export const LICENSE_PATTERN = /^(Unsplash License|Pexels License|CC0( 1\.0)?|Public domain|CC BY(-SA)? [1-4]\.0)$/;

/** True for the licences that ask for a credit next to the photo: CC BY and CC BY-SA. The others are credited on /credits only. */
export function licenseRequiresAttribution(license: string): boolean {
  return /^CC BY(-SA)? /.test(license);
}

/** The words of the credit line, without the links: "Photo: <author>, <licence>". */
export function creditLine(a: Pick<SeriesImageAttribution, 'author' | 'license'>): string {
  return `Photo: ${a.author}, ${a.license}`;
}

/** A photo to show: the entry of a series that has one. */
export interface SeriesPhoto {
  readonly file: string;
  readonly alt: string;
  readonly attribution: SeriesImageAttribution | null;
}
