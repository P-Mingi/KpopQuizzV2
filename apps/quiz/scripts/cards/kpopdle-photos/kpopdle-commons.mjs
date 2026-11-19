#!/usr/bin/env node
// kpopdle-commons.mjs: replaces the photos of the Kpopdle idols (apps/quiz/public/idols, made by kpopdle-photos.mjs, licence "other", source not
// recorded) with the Commons photos of the KpopCards, cropped to the Kpopdle format. Run by the workflow Cards publish after the card files
// (input kpopdle_commons, "non" by default), or by the owner. The choice is made by commons-faces.mjs (read it first): only a live card photo of a
// subject that passed the age rule, with the verdict OK of lane PHOTOCHECK and the best rank, a named author and a free licence.
//
// What a run does (preview without --publish: it only reads and prints):
//   1. reads the Kpopdle idols (dle_entities of the game kpopdle-idol, idols with their Wikidata id), the card subjects (cards_entities), the live card
//      photos (cards_photos, status auto or approved) and the entity_images of site kpop, kind idol, all page by page (restAll);
//   2. chooses one photo per idol (selectFaces) from the verdict file (--verdicts <csv>: photo id, verdict, rank; a missing rank column stops the run);
//   3. for each chosen idol: the Commons original (one a second, checked against its sha1, kept in --cache-dir like the card files), cut to the 4:5 box
//      at the card photo's focal point (400 x 500, 800 x 1000, a 96 px square), uploaded to the public bucket entity-images (kpop/idol/<id>/), and the
//      row of entity_images upserted on (site_id, kind, slug) with source_url, author, license, license_url and commons_file (the credit of /credits);
//   4. for each idol with no such photo: the row the old script wrote for it (licence "other" with its note) is removed and its files with it, so the
//      game shows the drawn card (the colours of the group, the name set in type), never the old photo. A picture set by hand in the admin (any other
//      licence or note) is never touched.
// Every request is tried up to 4 times on a passing error (fetchRetry); every write is idempotent (an upload replaces, the row is an upsert, a
// delete of a missing row changes nothing). The service key comes from the environment only and is never printed or written.
//
//   node apps/quiz/scripts/cards/kpopdle-photos/kpopdle-commons.mjs --verdicts <photocheck.csv>              preview
//   node apps/quiz/scripts/cards/kpopdle-photos/kpopdle-commons.mjs --verdicts <photocheck.csv> --publish    publish
// Options: --cache-dir <folder> (the Commons originals, one file per sha1).

import { createHash } from 'node:crypto';
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { RETRY_STATUS, fetchRetry, retryWait } from '../card-files.mjs';
import { REPO, loadConfig, restAll, serviceHeaders } from './common.mjs';
import { KEEP, faceFields, isOldRow, parseVerdicts, selectFaces } from './commons-faces.mjs';
import { faceBox, thumbBox } from './face-box.mjs';

const BUCKET = 'entity-images';
const GAME = 'kpopdle-idol';
const UA = 'BunnyverseCards/1.0 (https://bunnyverse.org; hello@kpopquiz.org)';
export const UPSERT_QUERY = 'on_conflict=site_id,kind,slug';
export const UPSERT_PREFER = 'resolution=merge-duplicates,return=minimal';
const PHOTO_COLUMNS = 'id,entity_id,slot,status,author,licence,licence_url,source_page,file_url,sha1,focal_x,focal_y,source_width,source_height,news_only,event_name,modified';

const sha1Of = (buf) => createHash('sha1').update(buf).digest('hex');
const realSleep = (ms) => new Promise((ok) => setTimeout(ok, ms));

/** The Commons original of a photo: one request at a time and at least a second apart, up to 3 tries, checked against the recorded sha1; the file of
 *  that sha1 in the cache folder is used when it is there (the folder of the card files serves). */
export function createOriginals({ cacheDir = null, sleep = realSleep, gapMs = 1000, tries = 3 } = {}) {
  let last = 0;
  return async function original(p) {
    const cached = cacheDir ? path.join(cacheDir, p.sha1) : null;
    if (cached && existsSync(cached)) {
      const buf = await readFile(cached);
      if (sha1Of(buf) === p.sha1) return buf;
    }
    let buf = null;
    let why = '';
    for (let n = 1; n <= tries && !buf; n++) {
      const wait = last + gapMs - Date.now();
      if (wait > 0) await sleep(wait);
      last = Date.now();
      let retry = false;
      let retryAfter = null;
      try {
        const r = await fetch(p.file_url, { headers: { 'User-Agent': UA } });
        if (r.ok) buf = Buffer.from(await r.arrayBuffer());
        else { why = `GET original: ${r.status}`; retry = RETRY_STATUS.has(r.status); retryAfter = r.headers.get('retry-after'); }
      } catch (e) {
        why = `GET original: ${String(e?.message ?? e)}`; retry = true;
      }
      if (!buf && retry && n < tries) await sleep(retryWait(n, retryAfter));
      else if (!buf) break;
    }
    if (!buf) throw new Error(why);
    const got = sha1Of(buf);
    if (got !== p.sha1) throw new Error(`the Commons file changed (sha1 ${got}, recorded ${p.sha1}); refused`);
    if (cached) { await mkdir(cacheDir, { recursive: true }); await writeFile(cached, buf); }
    return buf;
  };
}

/** The three WebP files of a face from the original: the 4:5 box at the focal point at 400 x 500 and 800 x 1000, and the 96 px square. */
export async function renderFace(sharp, bytes, photo) {
  const upright = await sharp(bytes, { failOn: 'none' }).rotate().png({ compressionLevel: 1 }).toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = upright.info;
  const box = faceBox(w, h, Number(photo.focal_x), Number(photo.focal_y));
  const cut = () => sharp(upright.data).extract({ left: box.left, top: box.top, width: box.width, height: box.height });
  const sq = thumbBox(box);
  const webp = (s) => s.webp({ quality: 88, effort: 5 }).toBuffer();
  const [x1, x2, thumb] = await Promise.all([
    webp(cut().resize(400, 500, { fit: 'fill' })),
    webp(cut().resize(800, 1000, { fit: 'fill' })),
    webp(sharp(upright.data).extract({ left: box.left + sq.left, top: box.top + sq.top, width: sq.width, height: sq.height }).resize(96, 96, { fit: 'fill' })),
  ]);
  return { x1, x2, thumb, box, large: box.width >= 800 };
}

async function storage(cfg, method, p, body, sleep) {
  const res = await fetchRetry(() => fetch(`${cfg.url}/storage/v1/object/${BUCKET}${method === 'POST' ? `/${p}` : ''}`, {
    method,
    headers: serviceHeaders(cfg.serviceKey, method === 'POST' ? { 'Content-Type': 'image/webp', 'x-upsert': 'true', 'cache-control': 'max-age=31536000' } : { 'Content-Type': 'application/json' }),
    body: method === 'POST' ? body : JSON.stringify({ prefixes: p }),
  }), { sleep });
  if (!res.ok && method === 'POST') throw new Error(`storage HTTP ${res.status}`);
  return res.ok;
}

async function rest(cfg, method, query, body, { prefer = 'return=minimal', sleep } = {}) {
  const res = await fetchRetry(() => fetch(`${cfg.url}/rest/v1/entity_images?${query}`, {
    method, headers: serviceHeaders(cfg.serviceKey, { 'Content-Type': 'application/json', Prefer: prefer }), ...(body ? { body: JSON.stringify(body) } : {}),
  }), { sleep });
  if (!res.ok) throw new Error(`entity_images HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

const filesOf = (row) => [row.path, row.path?.replace(/\.webp$/, '-2x.webp'), row.thumb_path].filter(Boolean);

export async function main(argv = process.argv.slice(2), deps = {}) {
  const publish = argv.includes('--publish');
  const arg = (n) => { const i = argv.indexOf(n); return i >= 0 ? String(argv[i + 1] ?? '').trim() : ''; };
  const verdictFile = arg('--verdicts');
  if (!verdictFile) throw new Error('--verdicts <photocheck.csv> is required (the verdicts of lane PHOTOCHECK: photo id, verdict, rank)');
  if (!existsSync(verdictFile)) throw new Error(`the verdict file ${verdictFile} does not exist: nothing was read, nothing was written`);
  const verdicts = parseVerdicts(await readFile(verdictFile, 'utf8')); // a missing rank column throws here
  const cacheDir = arg('--cache-dir') ? path.resolve(arg('--cache-dir')) : null;
  const cfg = await loadConfig();
  if (!cfg.serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set (see the top of this file)');
  const sleep = deps.sleep;

  const dle = await restAll(cfg, 'dle_entities', `select=entity_id&game_id=eq.${GAME}&order=entity_id`, { sleep });
  const ids = dle.map((e) => Number(e.entity_id)).filter((n) => Number.isInteger(n) && n > 0);
  if (!ids.length) throw new Error(`the game ${GAME} has no idol`);
  const idolRows = await restAll(cfg, 'idols', `select=id,name,wikidata_qid,group_id&id=in.(${ids.join(',')})&order=id`, { sleep });
  const groups = await restAll(cfg, 'groups', 'select=id,name&site_id=eq.kpop&order=id', { sleep });
  const groupName = new Map(groups.map((g) => [g.id, g.name]));
  const entities = await restAll(cfg, 'cards_entities', 'select=id,kind,qid,active,age_lock&order=id', { sleep });
  const photos = await restAll(cfg, 'cards_photos', `select=${PHOTO_COLUMNS}&status=in.(auto,approved)&order=id`, { sleep });
  const existing = await restAll(cfg, 'entity_images', 'select=slug,path,thumb_path,license,license_note&site_id=eq.kpop&kind=eq.idol&order=slug', { sleep });
  const have = new Map(existing.map((r) => [String(r.slug), r]));

  const idols = idolRows.map((r) => ({ idol_id: r.id, name: r.name, group: groupName.get(r.group_id) ?? '', qid: r.wikidata_qid ?? null }))
    .sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name));
  const { chosen, keep } = selectFaces({ idols, entities, photos, verdicts });
  const toRemove = keep.filter((k) => { const r = have.get(String(k.idol.idol_id)); return r && isOldRow(r); });
  const left = keep.filter((k) => !toRemove.includes(k));

  console.log(`Kpopdle: ${idols.length} idols. ${chosen.length} get a Commons face, ${keep.length} keep the drawn card (${toRemove.length} of them lose the old photo).`);
  for (const c of chosen) console.log(`  ${publish ? 'publish' : 'would publish'}  ${c.idol.name} (${c.idol.group})  <- photo ${c.photo.id}, rank ${c.rank}`);
  const why = new Map();
  for (const k of keep) why.set(k.why, (why.get(k.why) ?? 0) + 1);
  for (const [w, n] of why) console.log(`  drawn card  ${n} x ${KEEP[w]}`);
  for (const k of toRemove) console.log(`  ${publish ? 'remove' : 'would remove'}  the old photo of ${k.idol.name} (${k.idol.group})`);
  const summary = { idols: idols.length, commons: chosen.length, drawn: keep.length, removed: toRemove.length, published: 0, errors: 0 };
  if (!publish) {
    console.log('\nPreview only: nothing was written. Run again with --publish to publish.');
    return summary;
  }

  const sharp = deps.sharp ?? (await import('sharp')).default;
  const original = createOriginals({ cacheDir, sleep: deps.sleep, gapMs: deps.gapMs });
  const report = [['idol_id', 'name', 'group', 'result', 'photo_id', 'rank', 'note']];
  for (const c of chosen) {
    const { idol, photo } = c;
    try {
      const r = await renderFace(sharp, await original(photo), photo);
      const base = `kpop/idol/${idol.idol_id}/${createHash('sha256').update(r.x1).digest('hex').slice(0, 16)}`;
      const paths = { p1: `${base}.webp`, p2: `${base}-2x.webp`, pt: `${base}-96.webp` };
      await storage(cfg, 'POST', paths.p1, r.x1, sleep); await storage(cfg, 'POST', paths.p2, r.x2, sleep); await storage(cfg, 'POST', paths.pt, r.thumb, sleep);
      await rest(cfg, 'POST', UPSERT_QUERY, [{ site_id: 'kpop', kind: 'idol', slug: String(idol.idol_id), created_by: null, ...faceFields(photo, paths) }], { prefer: UPSERT_PREFER, sleep });
      const old = have.get(String(idol.idol_id));
      if (old && old.path && old.path !== paths.p1) await storage(cfg, 'DELETE', filesOf(old), null, sleep).catch(() => false);
      summary.published++;
      report.push([idol.idol_id, idol.name, idol.group, 'published', photo.id, c.rank, r.large ? '' : 'original under 800 px wide: the 2x file is upscaled']);
    } catch (e) {
      summary.errors++;
      report.push([idol.idol_id, idol.name, idol.group, 'error', photo.id, c.rank, String(e.message).slice(0, 200)]);
      console.log(`  !! ${idol.name} (${idol.group}): ${e.message}`);
    }
    await new Promise((res) => setTimeout(res, deps.pauseMs ?? 80));
  }
  for (const k of toRemove) {
    const old = have.get(String(k.idol.idol_id));
    try {
      await rest(cfg, 'DELETE', `site_id=eq.kpop&kind=eq.idol&slug=eq.${String(k.idol.idol_id)}`, null, { sleep });
      await storage(cfg, 'DELETE', filesOf(old), null, sleep).catch(() => false);
      report.push([k.idol.idol_id, k.idol.name, k.idol.group, 'old photo removed', '', '', KEEP[k.why]]);
    } catch (e) {
      summary.errors++;
      report.push([k.idol.idol_id, k.idol.name, k.idol.group, 'error', '', '', `remove: ${String(e.message).slice(0, 200)}`]);
      console.log(`  !! ${k.idol.name} (${k.idol.group}): ${e.message}`);
    }
  }
  for (const k of left) report.push([k.idol.idol_id, k.idol.name, k.idol.group, 'drawn card', '', '', KEEP[k.why] + (k.detail ? ` (${k.detail})` : '')]);
  const csv = report.map((r) => r.map((v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v))).join(',')).join('\n');
  const reportFile = deps.reportFile ?? path.join(path.dirname(fileURLToPath(import.meta.url)), 'kpopdle-commons-report.csv');
  await writeFile(reportFile, `${csv}\n`);
  console.log(`\nDone. ${summary.published} Commons faces published, ${summary.errors} errors, ${keep.length} idols on the drawn card. Report: ${reportFile}`);
  const stepSummary = deps.stepSummary ?? process.env.GITHUB_STEP_SUMMARY;
  if (stepSummary) {
    await appendFile(stepSummary, `\n### Kpopdle Commons faces\n\n${summary.published} idols got a Commons face, ${keep.length} are on the drawn card (${toRemove.length} lost the old photo), ${summary.errors} errors.\n`);
  }
  return summary;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(`\nStopped: ${e.message}`); process.exit(1); });
}
export { REPO };
