// Bunnyverse Cards lot 3 (owner decision 2026-11-13, "one edition, one photo"): checks the photos the researchers proposed and writes
// docs/design/cards/data/photos.json, the input of 103-catalog-photos.sql (scripts/cards/gen-catalog3-sql.mts).
//
//   ../../node_modules/.bin/tsx scripts/cards/verify-photos.mts --candidates <dir> --lineups <lineups.json> [--confirm <birth-confirm.json>] [--today YYYY-MM-DD]
//
// For every subject of lot 2 that is in the game, and every group lot 2 left out only because someone was under 18 on its old photo's
// date, it reads <dir>/<slug>.json (the researchers' candidates) and:
// 1. asks the Commons API, for the photo of lots 1 and 2 and every Commons candidate: the original file (address, size, sha1, type), its
//    licence, author and date, its categories and templates. Ten titles a request, one request a second, a User-Agent naming the project.
// 2. leaves a photo OUT when: its licence is not CC0, public domain, CC BY, CC BY-SA or KOGL Type 1; no author is named; a deletion
//    request, a copyright violation or a missing permission is on the file; the file is gone or not a JPEG, PNG or WebP; the age rule
//    fails on its date (everyone in it 18 or older on that date AND today, lot 2's rule, from the PRIVATE lineup file, never copied here);
//    it repeats another photo of the subject (same sha1, or the same day without two different events: owner rule, another file AND
//    another event or date); it is beyond the six photos a subject can use.
// 3. marks a photo PENDING (the owner's "To review" tab) when the script cannot decide alone: not a Commons file (Flickr, Korea.net,
//    DVIDS), Korea.net's "news only", a licence review still open on Commons, a group photo without the whole lineup, a month-only date,
//    a file date that differs from the description. Everything else is AUTO.
// The lineup file and the birth confirmations stay outside the repository (refused inside it); photos.json holds verdicts and photo
// credits only, no birth date.
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { REPO, arg, commonsInfo, fileOfPage, outsideRepo } from './commons-io.mts';
import { checkSubject, type CandidateFile, type Confirmation, type Lot2Subject, type ResearchRow, type Status } from '../../src/lib/cards/photo-checks';

export const PHOTOS_JSON = path.join(REPO, 'docs/design/cards/data/photos.json');
const SUBJECTS_JSON = path.join(REPO, 'docs/design/cards/data/subjects.json');
const AGE_JSON = path.join(REPO, 'docs/design/cards/data/age-check.json');

/** The groups lot 2 left out ONLY because someone was under 18 on the old photo's date (integrator brief lot 3, part A). */
export const RETURNING = ['akmu', 'billlie', 'fromis-9', 'illit', 'kara', 'loona', 'nct', 'tws', 'fifty-fifty', 't-ara'] as const;

async function main(): Promise<void> {
  const dir = arg('--candidates');
  const lineups = arg('--lineups');
  const confirmFile = arg('--confirm');
  const today = arg('--today') ?? new Date().toISOString().slice(0, 10);
  if (!dir || !lineups) {
    console.error('usage: tsx scripts/cards/verify-photos.mts --candidates <dir> --lineups <lineups.json> [--confirm <birth-confirm.json>] [--today YYYY-MM-DD]');
    process.exit(2);
  }
  for (const f of [lineups, confirmFile].filter(Boolean) as string[]) {
    if (!outsideRepo(f)) throw new Error(`refused: ${f} holds birth dates and must stay outside the repository`);
  }
  const research = JSON.parse(readFileSync(lineups, 'utf8')) as ResearchRow[];
  const confirm = confirmFile && existsSync(confirmFile) ? (JSON.parse(readFileSync(confirmFile, 'utf8')) as Confirmation[]) : [];
  const lot2 = JSON.parse(readFileSync(SUBJECTS_JSON, 'utf8')) as Lot2Subject[];
  const ageLot2 = JSON.parse(readFileSync(AGE_JSON, 'utf8')) as { subjects: Array<{ slug: string; ok: boolean }> };
  const inLot2 = new Set(ageLot2.subjects.filter((s) => s.ok).map((s) => s.slug));
  const wanted = lot2.filter((s) => inLot2.has(s.slug) || (RETURNING as readonly string[]).includes(s.slug));

  const candidates = new Map<string, CandidateFile>();
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    const c = JSON.parse(readFileSync(path.join(dir, f), 'utf8')) as CandidateFile;
    candidates.set(c.slug, c);
  }
  const titles = new Set<string>();
  for (const s of wanted) {
    if (inLot2.has(s.slug)) titles.add(`File:${s.photo.file}`);
    for (const c of candidates.get(s.slug)?.photos ?? []) {
      if (c.source !== 'commons') continue;
      const file = c.file ?? fileOfPage(c.page);
      if (file) { c.file = file; titles.add(`File:${file}`); }
    }
  }
  console.log(`asking Commons about ${titles.size} files`);
  const info = await commonsInfo([...titles]);

  const subjects = [];
  const leftOut: Array<{ slug: string; reason: string }> = [];
  for (const s of wanted) {
    const cand = candidates.get(s.slug);
    const ex = cand?.existing;
    const existing = inLot2.has(s.slug) && s.original
      ? {
          slot: 1, source: 'commons' as const, page: s.photo.commons_page, file: s.photo.file, url: s.original.url, width: s.original.width,
          height: s.original.height, sha1: s.original.sha1, author: s.photo.author, author_url: null, licence: s.photo.licence,
          licence_url: s.photo.licence_url, share_alike: s.photo.share_alike, date: s.photo.date, date_precision: 'day' as const,
          event: ex?.event ?? null, stage: !!ex?.stage, quality: ex?.quality ?? 3, focal: s.focal,
          source_path: `${s.photo.bucket}/${s.photo.path}`, news_only: false,
        }
      : null;
    const checked = checkSubject({
      slug: s.slug, kind: s.kind, existing, candidates: cand?.photos ?? [], info, research: research.find((r) => r.slug === s.slug) ?? null,
      confirm, today,
    });
    // The photo of lots 1 and 2 keeps the credit recorded then (Commons may word the author differently), unless it is now out.
    if (existing && checked[0]) {
      const c0 = checked[0];
      if (c0.status !== 'out') Object.assign(c0, { author: existing.author, licence: existing.licence, licence_url: existing.licence_url, share_alike: existing.share_alike, url: existing.url, sha1: existing.sha1 });
    }
    const live = checked.filter((p) => p.status !== 'out');
    if (!live.length) leftOut.push({ slug: s.slug, reason: checked.length ? 'no photo passes the checks' : 'no photo found' });
    subjects.push({
      slug: s.slug, name: s.name, kind: s.kind, end_year: s.disbanded?.year ?? null, returning: !inLot2.has(s.slug),
      shortfall: cand?.shortfall ?? null, photos: checked,
    });
  }
  const file = {
    checked_on: today,
    rules: 'owner decision 2026-11-13: one edition, one photo (another file AND another event or date); editions open from the bottom; 2 photos to enter the packs; best photo on the highest edition; Stage a stage photo when there is one; Full Art an honest 2x. Licences CC0, public domain, CC BY, CC BY-SA, KOGL Type 1, named author, no deletion request. Age rule of lot 2 on each photo date and today (verdicts only).',
    sources: 'Wikimedia Commons API (imageinfo, extmetadata, categories, templates), read on the day above; candidates from the lot 3 researchers',
    subjects,
    left_out: leftOut,
  };
  writeFileSync(PHOTOS_JSON, `${JSON.stringify(file, null, 1)}\n`);
  const all = subjects.flatMap((s) => s.photos);
  const count = (st: Status) => all.filter((p) => p.status === st).length;
  console.log(`${subjects.length} subjects, ${all.length} photos: ${count('approved')} kept from lot 2, ${count('auto')} auto, ${count('pending')} to review, ${count('out')} out`);
  for (const s of subjects) {
    const st = (x: Status) => s.photos.filter((p) => p.status === x).length;
    console.log(`${s.slug.padEnd(14)} ${String(st('approved') + st('auto')).padStart(2)} live, ${st('pending')} to review, ${st('out')} out${s.returning ? ' (returning)' : ''}`);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((e) => { console.error(String(e?.message ?? e)); process.exit(1); });
}
