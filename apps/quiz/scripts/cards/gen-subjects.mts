// Bunnyverse Cards, lane D (second brief): writes docs/design/cards/data/subjects.json from the two inputs of the October photo run
// (docs/design/growth-v12/run/group-photos.json and src/lib/ux-v1/a0/group-photo-credits.ts). No network, no database.
//   tsx scripts/cards/gen-subjects.mts            writes subjects.json, prints the cross-check of the two inputs
// Exit code 1 when the two inputs disagree (the mismatches are printed, never fixed silently).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { GROUP_PHOTO_CREDITS } from '../../src/lib/ux-v1/a0/group-photo-credits';
import { halves, pairBox } from './card-geometry.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
export const PHOTOS_JSON = path.join(REPO, 'docs/design/growth-v12/run/group-photos.json');
export const SUBJECTS_JSON = path.join(REPO, 'docs/design/cards/data/subjects.json');

/** The 18 soloists or members of the amendment, in its order. */
export const PEOPLE = [
  'bibi', 'chungha', 'heize', 'hwasa', 'hyuna', 'iu', 'jay-park', 'jennie', 'jeon-somi', 'jimin', 'jungkook', 'psy', 'rose', 'sunmi',
  'taeyang', 'taeyeon', 'v-bts', 'zico',
] as const;

export const CARD_RATIO = 5.5 / 8.5;
export const MIN_2X_WIDTH = 640;
export const BUCKET = 'images';
/** The Commons address of the original file (a stable redirect to it): the photo's real source, and no project host in the repository. */
export const commonsFileUrl = (file: string): string => `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file.replace(/ /g, '_'))}`;

interface Row {
  slug: string; name: string; url: string; width: number; height: number; commons_page: string; file: string; author: string;
  license: string; license_url: string; date: string;
}

export interface Subject {
  slug: string;
  name: string;
  kind: 'idol' | 'group';
  photo: {
    source: 'commons'; bucket: string; path: string; url: string; width: number; height: number; commons_page: string; file: string; author: string;
    licence: string; licence_url: string; share_alike: boolean; date: string;
  };
  /** The Commons ORIGINAL of the same photo (same page), full size: the card files are cut from it (integrator review 2026-11-12). */
  original: { url: string; width: number; height: number; mime: string; sha1: string };
  focal: { x: number; y: number };
  /** Width in px of the widest 5.5:8.5 crop of the Commons original. */
  crop_width: number;
  /** The crop is narrower than 640 px: no honest 2x file (the whole 5.5:8.5 crop; a group's halves have their own flag in `pair`). */
  small_2x: boolean;
  /** Lot 2: a group photo gives a pair of cards, the widest 11:8.5 window of the Commons original split in two; each half is checked
   *  for 2x on its own (card-geometry.mjs). Absent for a person. */
  pair?: { window_width: number; halves: Array<{ part: 1 | 2; crop_width: number; small_2x: boolean }> };
  /** Lot 2: the verdict of the age rule (docs/design/cards/data/age-check.json, scripts/cards/age-check.mts); null until it was run,
   *  and a subject without a verdict never gets a card. */
  age: { ok: boolean; reason: string | null; checked_on: string } | null;
}

export function cropWidth(width: number, height: number): number {
  return Math.floor(Math.min(width, height * CARD_RATIO));
}

interface OriginalRow { slug: string; page: string; url: string; width: number; height: number; mime: string; sha1: string; licenceMatches: boolean }
const ORIGINALS_JSON = path.join(REPO, 'docs/design/cards/data/originals.json');
const AGE_JSON = path.join(REPO, 'docs/design/cards/data/age-check.json');

/** The pair of a group photo of this size (the focal point moves the window, never its size). */
export function pairOf(width: number, height: number): NonNullable<Subject['pair']> {
  const box = pairBox(width, height, 50, 50);
  return {
    window_width: box.width,
    halves: halves(box).map((h: { part: number; width: number }) => ({ part: h.part === 1 ? 1 : 2, crop_width: h.width, small_2x: h.width < MIN_2X_WIDTH })),
  };
}

export function build(): { subjects: Subject[]; mismatches: string[] } {
  const rows = JSON.parse(readFileSync(PHOTOS_JSON, 'utf8')) as Row[];
  const originals = new Map((JSON.parse(readFileSync(ORIGINALS_JSON, 'utf8')) as OriginalRow[]).map((o) => [o.slug, o]));
  const mismatches: string[] = [];
  const bySlug = new Map(rows.map((r) => [r.slug, r]));
  if (rows.length !== 59 || bySlug.size !== 59) mismatches.push(`group-photos.json has ${rows.length} rows, ${bySlug.size} slugs (expected 59)`);
  const creditSlugs = Object.keys(GROUP_PHOTO_CREDITS);
  if (creditSlugs.length !== 59) mismatches.push(`group-photo-credits.ts has ${creditSlugs.length} slugs (expected 59)`);
  for (const s of bySlug.keys()) if (!(s in GROUP_PHOTO_CREDITS)) mismatches.push(`${s}: in the json, not in the credits file`);
  for (const s of creditSlugs) if (!bySlug.has(s)) mismatches.push(`${s}: in the credits file, not in the json`);
  for (const p of PEOPLE) if (!bySlug.has(p)) mismatches.push(`${p}: a listed person has no photo row`);
  for (const r of rows) {
    const c = GROUP_PHOTO_CREDITS[r.slug];
    if (!c) continue;
    if (c.author !== r.author) mismatches.push(`${r.slug}: author differs (json "${r.author}", credits "${c.author}")`);
    if (c.license !== r.license) mismatches.push(`${r.slug}: licence differs (json "${r.license}", credits "${c.license}")`);
    if (c.licenseUrl !== r.license_url) mismatches.push(`${r.slug}: licence url differs (json ${r.license_url}, credits ${c.licenseUrl})`);
    if (c.page !== r.commons_page) mismatches.push(`${r.slug}: Commons page differs (json ${r.commons_page}, credits ${c.page})`);
    const o = originals.get(r.slug);
    if (!o) mismatches.push(`${r.slug}: no Commons original in originals.json (run fetch-originals.mts)`);
    else if (o.page !== r.commons_page) mismatches.push(`${r.slug}: the original is not the same Commons page`);
    else if (!o.licenceMatches) mismatches.push(`${r.slug}: the licence on Commons is no longer the recorded one`);
  }
  const age = existsSync(AGE_JSON)
    ? (JSON.parse(readFileSync(AGE_JSON, 'utf8')) as { checked_on: string; subjects: Array<{ slug: string; ok: boolean; reason: string | null }> })
    : null;
  const ageOf = new Map((age?.subjects ?? []).map((a) => [a.slug, a]));
  if (age) for (const s of bySlug.keys()) if (!ageOf.has(s)) mismatches.push(`${s}: no verdict in age-check.json`);
  const people = new Set<string>(PEOPLE);
  const order = [...PEOPLE, ...rows.map((r) => r.slug).filter((s) => !people.has(s)).sort()];
  const subjects: Subject[] = [];
  for (const slug of order) {
    const r = bySlug.get(slug);
    if (!r) continue;
    const kind = people.has(slug) ? 'idol' : 'group';
    const o = originals.get(slug);
    if (!o) continue;
    const cw = cropWidth(o.width, o.height);
    const pair = kind === 'group' ? pairOf(o.width, o.height) : undefined;
    const a = ageOf.get(slug);
    subjects.push({
      slug, name: r.name, kind,
      photo: {
        source: 'commons', bucket: BUCKET, path: `group-photos/${slug}.jpg`, url: commonsFileUrl(r.file), width: r.width, height: r.height,
        commons_page: r.commons_page, file: r.file, author: r.author, licence: r.license, licence_url: r.license_url,
        share_alike: /\bSA\b/.test(r.license), date: r.date,
      },
      original: { url: o.url, width: o.width, height: o.height, mime: o.mime, sha1: o.sha1 },
      focal: kind === 'idol' ? { x: 50, y: 30 } : { x: 50, y: 50 },
      crop_width: cw, small_2x: cw < MIN_2X_WIDTH,
      ...(pair ? { pair } : {}),
      age: a && age ? { ok: a.ok, reason: a.reason, checked_on: age.checked_on } : null,
    });
  }
  return { subjects, mismatches };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { subjects, mismatches } = build();
  mkdirSync(path.dirname(SUBJECTS_JSON), { recursive: true });
  writeFileSync(SUBJECTS_JSON, `${JSON.stringify(subjects, null, 2)}\n`);
  const small = subjects.filter((s) => s.small_2x);
  console.log(`subjects: ${subjects.length} (${subjects.filter((s) => s.kind === 'idol').length} people, ${subjects.filter((s) => s.kind === 'group').length} groups)`);
  console.log(`small_2x: ${small.length} (the whole 5.5:8.5 crop)`);
  const halvesSmall = subjects.flatMap((s) => (s.pair?.halves ?? []).filter((h) => h.small_2x).map((h) => `${s.slug} ${h.part}/2`));
  console.log(`halves too small for 2x: ${halvesSmall.length}${halvesSmall.length ? ` (${halvesSmall.join(', ')})` : ''}`);
  const aged = subjects.filter((s) => s.age);
  console.log(aged.length ? `age rule: ${aged.filter((s) => s.age?.ok).length} in, ${aged.filter((s) => !s.age?.ok).length} out` : 'age rule: not run yet (age-check.json missing): no subject gets a card');
  console.log(mismatches.length === 0 ? 'inputs agree (59 slugs, author, licence, licence url, page)' : `MISMATCHES (${mismatches.length}):\n${mismatches.join('\n')}`);
  process.exit(mismatches.length === 0 ? 0 : 1);
}
