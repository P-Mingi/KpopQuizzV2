#!/usr/bin/env node
// character-thumbs.mjs (owner, 2026-11-23): makes the missing 96 px file of every anime character picture, so L38 can put them live.
//
// Why: a character picture shows only once its licence is checked, and the database refuses the check on a picture with no 96 px file
// (entity_images_verified_thumb_check of 022). The 1,068 pictures of the import of 2026-11-11 were made before the 96 px files existed, so
// L38-l1-character-pictures-live.sql could check none of them. This script makes those files; then L38, run again, checks them all.
//
// For each row of public.entity_images with site_id anime, kind character and no thumb_path, in id order:
//   1. it downloads the picture's own file (its path in the bucket "entity-images");
//   2. it cuts a 96 by 96 square around the picture's focal point (focal_x, focal_y, the point the owner set in the admin, 50/50 by default)
//      and saves it as WebP next to the file, named as the admin names it: <path without .webp>-96.webp;
//   3. it writes that name into thumb_path, only where thumb_path is still empty (a picture saved again in the admin meanwhile is left alone).
// Nothing else is changed: not the file, not the licence, not the check (L38 does the check, with its log and its rollback).
//
// Run, from the repo folder (Node 18 or newer):
//   read -rs SUPABASE_SERVICE_ROLE_KEY && export SUPABASE_SERVICE_ROLE_KEY     (paste the key, nothing shows, press Enter)
//   node apps/quiz/scripts/cards/character-thumbs/character-thumbs.mjs              preview: how many pictures lack the file (reads only)
//   node apps/quiz/scripts/cards/character-thumbs/character-thumbs.mjs --publish    make the files
// Then run docs/pending-migrations/multisite/launch/L38-l1-character-pictures-live.sql again in the SQL Editor.
// The service key is never printed or written. Each read, download, upload and write is tried up to 4 times on a passing error (fetchRetry of
// ../card-files.mjs); a picture that still fails is listed in the report and left as it was. A second run makes only what is still missing.
// The report: character-thumbs-report.csv next to this file (not committed).

import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { fetchRetry } from '../card-files.mjs';
import { loadConfig, restAll, serviceHeaders } from '../kpopdle-photos/common.mjs';

const BUCKET = 'entity-images';
export const THUMB = 96;
const SAFE_PATH = /^[a-z0-9][a-z0-9/_.-]*\.webp$/;

/** The name of the 96 px file of a picture, as the admin names it (lib/photos/store.ts: <base>.webp and <base>-96.webp). */
export function thumbPathOf(p) {
  if (typeof p !== 'string' || !SAFE_PATH.test(p) || p.includes('..')) return null;
  return p.replace(/\.webp$/, '-96.webp');
}

/** The square to cut, in a picture of w by h scaled so that its short side is 96: centred on the focal point, kept inside the picture. */
export function squareAround(w, h, fx = 50, fy = 50) {
  const scale = THUMB / Math.min(w, h);
  const sw = Math.max(THUMB, Math.round(w * scale));
  const sh = Math.max(THUMB, Math.round(h * scale));
  const clamp = (v, max) => Math.min(Math.max(v, 0), max);
  const left = clamp(Math.round((Number(fx) / 100) * sw - THUMB / 2), sw - THUMB);
  const top = clamp(Math.round((Number(fy) / 100) * sh - THUMB / 2), sh - THUMB);
  return { sw, sh, left, top };
}

export async function renderThumb(sharp, bytes, fx, fy) {
  const meta = await sharp(bytes, { failOn: 'none' }).metadata();
  if (!meta.width || !meta.height) throw new Error('not an image');
  const { sw, sh, left, top } = squareAround(meta.width, meta.height, fx, fy);
  return sharp(bytes, { failOn: 'none' }).resize(sw, sh, { fit: 'fill' }).extract({ left, top, width: THUMB, height: THUMB }).webp({ quality: 86, effort: 5 }).toBuffer();
}

async function download(cfg, p, sleep) {
  const res = await fetchRetry(() => fetch(`${cfg.url}/storage/v1/object/${BUCKET}/${p}`, { headers: serviceHeaders(cfg.serviceKey) }), { sleep });
  if (!res.ok) throw new Error(`download HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function upload(cfg, p, bytes, sleep) {
  const res = await fetchRetry(() => fetch(`${cfg.url}/storage/v1/object/${BUCKET}/${p}`, {
    method: 'POST', headers: serviceHeaders(cfg.serviceKey, { 'Content-Type': 'image/webp', 'x-upsert': 'true', 'cache-control': 'max-age=31536000' }), body: bytes,
  }), { sleep });
  if (!res.ok) throw new Error(`upload HTTP ${res.status}`);
}

async function setThumb(cfg, id, thumbPath, sleep) {
  const q = `id=eq.${id}&site_id=eq.anime&kind=eq.character&thumb_path=is.null`;
  const res = await fetchRetry(() => fetch(`${cfg.url}/rest/v1/entity_images?${q}`, {
    method: 'PATCH', headers: serviceHeaders(cfg.serviceKey, { 'Content-Type': 'application/json', Prefer: 'return=minimal' }), body: JSON.stringify({ thumb_path: thumbPath }),
  }), { sleep });
  if (!res.ok) throw new Error(`entity_images HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

export async function main(argv = process.argv.slice(2), deps = {}) {
  const publish = argv.includes('--publish');
  const cfg = await loadConfig();
  if (!cfg.serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set in this terminal (see the top of this file)');

  const rows = await restAll(cfg, 'entity_images', 'select=id,slug,path,focal_x,focal_y&site_id=eq.anime&kind=eq.character&thumb_path=is.null&order=id', { sleep: deps.sleep });
  const ready = rows.filter((r) => thumbPathOf(r.path));
  const bad = rows.filter((r) => !thumbPathOf(r.path));
  console.log(`Anime character pictures without their 96 px file: ${rows.length}. ${ready.length} can get one${bad.length ? `, ${bad.length} have a file name this script does not trust` : ''}.`);
  for (const r of ready.slice(0, 5)) console.log(`  ${publish ? 'make' : 'would make'}  ${r.slug}  ->  ${thumbPathOf(r.path)}`);
  if (ready.length > 5) console.log(`  ... and ${ready.length - 5} more`);
  if (!publish) {
    console.log('\nPreview only: nothing was written. Run again with --publish to make the files.');
    return { missing: rows.length, ready: ready.length, made: 0, errors: 0 };
  }

  const sharp = deps.sharp ?? (await import('sharp')).default;
  const report = [['id', 'slug', 'thumb_path', 'result']];
  for (const r of bad) report.push([r.id, r.slug, '', 'skipped: file name not trusted']);
  let made = 0;
  let errors = 0;
  let next = 0;
  const one = async (r) => {
    const tp = thumbPathOf(r.path);
    try {
      const thumb = await renderThumb(sharp, await download(cfg, r.path, deps.sleep), r.focal_x ?? 50, r.focal_y ?? 50);
      await upload(cfg, tp, thumb, deps.sleep);
      await setThumb(cfg, r.id, tp, deps.sleep);
      made++;
      report.push([r.id, r.slug, tp, 'made']);
      if (made % 100 === 0) console.log(`  ${made} made...`);
    } catch (e) {
      errors++;
      report.push([r.id, r.slug, tp, `error: ${e.message}`]);
      console.log(`  !! ${r.slug}: ${e.message}`);
    }
  };
  // Four at a time: about four minutes for a thousand pictures, gentle on the project.
  const worker = async () => { while (next < ready.length) { const r = ready[next++]; await one(r); } };
  await Promise.all(Array.from({ length: Math.min(deps.workers ?? 4, ready.length || 1) }, worker));

  const csv = report.map((x) => x.map((v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v))).join(',')).join('\n');
  const reportFile = deps.reportFile ?? path.join(path.dirname(fileURLToPath(import.meta.url)), 'character-thumbs-report.csv');
  await writeFile(reportFile, `${csv}\n`);
  console.log(`\nDone. ${made} files made, ${errors} errors. Report: ${reportFile}`);
  console.log('Next: run docs/pending-migrations/multisite/launch/L38-l1-character-pictures-live.sql again in the SQL Editor.');
  return { missing: rows.length, ready: ready.length, made, errors };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(`character-thumbs: ${e.message}`); process.exit(1); });
}
