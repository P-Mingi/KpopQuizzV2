// Run O1 (IMG): the build side of the series photos. Reads the rows of docs/anime/images/*.json, checks each one, and renders
// src/lib/anime/series-images.generated.ts. Used by scripts/gen-series-images.mts and by series-images.test.ts, and by nothing
// that ships to the browser. Reads files only through the helpers at the end and the `fileExists` the caller passes in.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { LICENSE_PATTERN, licenseRequiresAttribution } from './series-images-rules';

import type { SeriesImage, SeriesImageCredit } from './series-images-rules';

export interface ImageRow {
  /** The name of the data file, for the messages ("death-note.json"). */
  readonly name: string;
  readonly json: unknown;
}

export interface BuiltImages {
  readonly images: Readonly<Record<string, SeriesImage>>;
  readonly credits: Readonly<Record<string, SeriesImageCredit>>;
}

export interface BuildOptions {
  /** True when the public path (`/series/<slug>.webp`) exists in apps/quiz/public. */
  readonly fileExists: (publicPath: string) => boolean;
  /** The series name by slug (docs/anime/data/series), for the credits page; a slug not in it is printed as words. */
  readonly names?: Readonly<Record<string, string>> | undefined;
}

const words = (slug: string): string => slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
const isHttps = (v: string): boolean => {
  try { return new URL(v).protocol === 'https:'; } catch { return false; }
};
/** No en or em dash and no emoji in anything that is printed (CLAUDE.md). */
const BANNED_TEXT = /[\u2013\u2014]|\p{Extended_Pictographic}/u;

/**
 * Builds the two maps from the rows. Throws one Error listing every problem found (a file name and what is wrong), so a
 * missing field, an unknown licence, a credit rule that disagrees with the licence, or a listed file that is not in
 * public/series/ stops the generator and fails the test.
 */
export function buildSeriesImages(rows: readonly ImageRow[], opts: BuildOptions): BuiltImages {
  const problems: string[] = [];
  const images: Record<string, SeriesImage> = {};
  const credits: Record<string, SeriesImageCredit> = {};
  const bad = (name: string, what: string): void => { problems.push(`${name}: ${what}`); };

  for (const { name, json } of [...rows].sort((a, b) => a.name.localeCompare(b.name))) {
    if (typeof json !== 'object' || json === null || Array.isArray(json)) { bad(name, 'not an object'); continue; }
    const d = json as Record<string, unknown>;
    const slug = str(d.slug);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) { bad(name, 'slug is missing or not a slug'); continue; }
    if (`${slug}.json` !== name) bad(name, `slug "${slug}" does not match the file name`);
    if (images[slug]) { bad(name, `slug "${slug}" listed twice`); continue; }
    if (!str(d.why)) bad(name, 'why is missing');
    for (const [k, v] of Object.entries(d)) if (typeof v === 'string' && BANNED_TEXT.test(v)) bad(name, `${k} holds an en dash, an em dash or an emoji`);

    if (d.fallback !== undefined) {
      if (d.fallback !== 'title-card') bad(name, 'fallback must be "title-card"');
      for (const k of ['file', 'source_url', 'author', 'license', 'license_url', 'retrieved', 'alt', 'attribution_required']) {
        if (d[k] !== undefined) bad(name, `a title-card fallback has no ${k}`);
      }
      images[slug] = { file: null, alt: null, attribution: null, fallback: 'title-card' };
      continue;
    }

    const file = str(d.file);
    const sourceUrl = str(d.source_url);
    const author = str(d.author);
    const license = str(d.license);
    const licenseUrl = str(d.license_url);
    const retrieved = str(d.retrieved);
    const alt = str(d.alt);
    if (file !== `/series/${slug}.webp`) bad(name, `file must be /series/${slug}.webp`);
    else if (!opts.fileExists(file)) bad(name, `${file} is not in public/series/`);
    if (!sourceUrl) bad(name, 'source_url is missing'); else if (!isHttps(sourceUrl)) bad(name, 'source_url is not an https URL');
    if (!author) bad(name, 'author is missing');
    if (!license) bad(name, 'license is missing'); else if (!LICENSE_PATTERN.test(license)) bad(name, `license "${license}" is not an allowed licence`);
    if (!licenseUrl) bad(name, 'license_url is missing'); else if (!isHttps(licenseUrl)) bad(name, 'license_url is not an https URL');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(retrieved)) bad(name, 'retrieved is missing or not YYYY-MM-DD');
    if (!alt) bad(name, 'alt is missing');
    const required = licenseRequiresAttribution(license);
    if (d.attribution_required !== required) bad(name, `attribution_required must be ${required} for "${license}"`);

    images[slug] = {
      file,
      alt,
      attribution: required ? { author, license, licenseUrl, sourceUrl } : null,
      fallback: null,
    };
    credits[slug] = { name: opts.names?.[slug] ?? words(slug), file, alt, sourceUrl, author, license, licenseUrl, retrieved, attributionRequired: required };
  }

  if (problems.length > 0) throw new Error(`docs/anime/images is not valid:\n${problems.map((p) => `  ${p}`).join('\n')}`);
  return { images, credits };
}

const q = (v: string | null): string => (v === null ? 'null' : JSON.stringify(v));

/** The text of src/lib/anime/series-images.generated.ts for the built maps (keys sorted, so the file is stable). */
export function renderSeriesImages(built: BuiltImages): string {
  const slugs = Object.keys(built.images).sort();
  const imageRows = slugs.map((s) => {
    const e = built.images[s]!;
    const a = e.attribution;
    const attribution = a ? `{ author: ${q(a.author)}, license: ${q(a.license)}, licenseUrl: ${q(a.licenseUrl)}, sourceUrl: ${q(a.sourceUrl)} }` : 'null';
    return `  ${q(s)}: { file: ${q(e.file)}, alt: ${q(e.alt)}, attribution: ${attribution}, fallback: ${q(e.fallback)} },`;
  }).join('\n');
  const creditRows = Object.keys(built.credits).sort().map((s) => {
    const c = built.credits[s]!;
    return `  ${q(s)}: { name: ${q(c.name)}, file: ${q(c.file)}, alt: ${q(c.alt)}, sourceUrl: ${q(c.sourceUrl)}, author: ${q(c.author)}, license: ${q(c.license)}, licenseUrl: ${q(c.licenseUrl)}, retrieved: ${q(c.retrieved)}, attributionRequired: ${c.attributionRequired} },`;
  }).join('\n');
  return `// GENERATED by scripts/gen-series-images.mts from docs/anime/images/*.json. Do not edit by hand: run the script again.
// The free photo of each series, by series slug (a series with "fallback": "title-card" shows the generated title card), and the
// credit of each photo for the credits page. src/lib/anime/series-images.test.ts holds this equal to the data.

import type { SeriesImage, SeriesImageCredit } from './series-images-rules';

export const SERIES_IMAGES: Readonly<Record<string, SeriesImage>> = {${imageRows ? `\n${imageRows}\n` : ''}};

export const SERIES_IMAGE_CREDITS: Readonly<Record<string, SeriesImageCredit>> = {${creditRows ? `\n${creditRows}\n` : ''}};
`;
}

/** The rows of a docs/anime/images directory (none when it does not exist yet). */
export function readImageRows(dir: string): ImageRow[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((n) => n.endsWith('.json')).sort().map((name) => ({ name, json: JSON.parse(readFileSync(join(dir, name), 'utf8')) as unknown }));
}

/** The series name by slug from docs/anime/data/series/*.json (`group.slug`, `group.name`). */
export function readSeriesNames(dir: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!existsSync(dir)) return out;
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.json')).sort()) {
    const g = (JSON.parse(readFileSync(join(dir, f), 'utf8')) as { group?: { slug?: unknown; name?: unknown } }).group;
    if (typeof g?.slug === 'string' && typeof g.name === 'string') out[g.slug] = g.name;
  }
  return out;
}
