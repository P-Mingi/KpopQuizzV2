#!/usr/bin/env node
// Bunnyverse Cards LOT 3 (owner decision 2026-11-13, "one edition, one photo"): the script now reads docs/design/cards/data/photos.json
// (verify-photos.mts), several photos a subject, one per edition. Each photo has its own files: slot 1, the photo of lots 1 and 2, keeps the
// stem <slug>-<fx>-<fy> (its published files stay valid); a lot 3 photo is <slug>-s<slot>-<fx>-<fy>. The preview cuts every photo that
// is not out, the ones waiting for the owner included (marked "to review"), and lists the photos left out with their reasons; --publish
// cuts the LIVE photos of cards_photos (auto or approved) at their current focal point; a photo the owner approves later in the admin is
// cut on the next run. The cleanup keeps the files of every live photo and proposes the rest (a refused or dropped photo, an old focal
// point, the subjects left out). Everything below about the project address, the host, the key and the cleanup is unchanged.
// Bunnyverse Cards: the owner's script for the card files (owner mission 2026-11-12, integrator review the same day). Tracked in the
// repository so it reaches the owner's checkout (out/ is git-ignored); it writes its previews under out/cards-tool/ at the repository root.
// Every card file is cut from the Commons ORIGINAL of the same photo (same Commons page, same licence, full size: subjects.json
// `original`, read by fetch-originals.mts), never from the 1,200 px copies of the bucket `images`. A downloaded original whose sha1
// differs from the recorded one is refused (the file changed on Commons: check it first).
// Lot 2 (owner idea, 2026-11-12): a PERSON gives one card, the widest 5.5:8.5 window of the photo. A GROUP gives a PAIR of cards: the widest
// 11:8.5 window of the photo (two cards side by side) placed by the ONE focal point of the group's photo, split down the middle: half 1 is
// the left, half 2 the right. Each half is sized to 1x 320x495 and 2x 640x989 WebP, and a half gets its 2x only when it is at least 640 px
// wide in the original (no upscaled 2x file). Files: a person <stem>-1x.webp / -2x.webp, a group <stem>-h1-1x.webp / -h1-2x.webp / -h2-1x.webp
// / -h2-2x.webp, with stem = <slug>-<fx>-<fy>. The geometry is scripts/cards/card-geometry.mjs, the pure rules scripts/cards/card-files.mjs.
// A subject that fails the age rule (subjects.json `age.ok` false: a person in the photo under 18 today or on the photo date) is never cut
// and never uploaded, and its files leave the bucket (see the cleanup below). No verdict (the age check was not run) counts as a failure.
//   node apps/quiz/scripts/cards/publish-card-files.mjs
//       preview: downloads the originals from Commons (one at a time, with a User-Agent naming the project), cuts them around the default
//       focal point, writes WebP 1x and 2x and a contact sheet to out/cards-tool/preview/index.html (a pair is shown as its two halves side
//       by side, with the crop width and the 2x of each half; the subjects left out by the age rule are listed apart). Reads Commons only.
//       Writes nothing remote, needs no project address and no key.
//   CARDS_SUPABASE_URL=https://<project>.supabase.co node apps/quiz/scripts/cards/publish-card-files.mjs --publish
//       refuses without an explicit CARDS_SUPABASE_URL (no fallback on NEXT_PUBLIC_SUPABASE_URL or on any .env file), prints the
//       project host and asks to type it back before anything is sent, then asks for the service key (not echoed, never printed,
//       never written), reads the current focal points of cards_photos, cuts every included original at those points, uploads to the
//       public bucket 'cards', and sets storage_path (the stem), file_focal_x and file_focal_y (a group: once both halves are up).
//       Then the cleanup: it lists the bucket (Storage API, service key) and PROPOSES to delete every object that is not a file of a current
//       stem of an included subject: the files of excluded subjects, the old whole-card files of a group, the files at an old focal point.
//       Names are matched exactly (nct- is also the start of nct-wish-). It prints the list and deletes only if you type: delete
//   Started by the wrapper `pnpm --filter quiz owner:cards` (scripts/cards/owner-cards.mjs), which has already shown the host and had it typed
//       back: the wrapper sets CARDS_SUPABASE_URL, CARDS_HOST_CONFIRMED (the host it had typed, compared here with the host of
//       CARDS_SUPABASE_URL; equal = the typing is not asked a second time) and CARDS_SERVICE_KEY (the key, taken from the environment of this
//       child process only instead of being typed). Started by hand none of these exist: the host and the key are typed as above.
// Lot 7 (owner, 2026-11-17): a group photo gives `parts` cards, 2 (halves, -h1 -h2) or 3 (thirds, 5.5 x 8.5 each, -t1 to -t3), and a panorama,
// the whole window (<stem>-p2-1x.webp, <stem>-p3-1x.webp; its 2x only when every part has its 2x). --publish cuts coalesce(parts, 2) parts and
// the panorama, then sets storage_path, file_focal_x/y, file_parts and file_pano in ONE PATCH (only the columns the database has: before
// file 118 the script behaves as before). A photo whose files match its focal point and parts and has file_pano is skipped; a pair cut before
// lot 7 at its current focal point only gains its -p2 panorama (its halves stay valid and are not uploaded again).
// Options: --only slug1,slug2   limit to some subjects (the cleanup then looks at the objects of those slugs only).
// The non-interactive mode (integrator, 2026-11-17: the owner publishes from GitHub Actions, .github/workflows/cards-publish.yml):
//   CARDS_SUPABASE_URL=https://<project>.supabase.co CARDS_SERVICE_KEY=... node apps/quiz/scripts/cards/publish-card-files.mjs --publish
//       --non-interactive --host <project host> [--keep-going] [--cache-dir <folder>] [--report <file.json>]
//   Nothing is typed and no terminal is needed: the host comes from --host (it must be the host of CARDS_SUPABASE_URL, else nothing is sent),
//   the service key from CARDS_SERVICE_KEY only (never printed, never written). The cleanup only LISTS in this mode: it never deletes.
//   Every request to the project (the rows, each upload, each PATCH, the bucket list) is tried up to 4 times on a passing error (a status of
//       RETRY_STATUS: 408, 429, 5xx, Cloudflare's 520 to 524; or the network), after the server's Retry-After (at most 60 s), else 5 s then
//       20 s (lot CPUB-RETRY: a 520 on one upload stopped the first run). Each one is idempotent: an upload replaces (x-upsert), a PATCH sets
//       the same values again. A 400, 401, 403, 404, 409 or 413 is not tried again.
//   --keep-going (either mode): a photo whose original fails (download failed after its tries, the Commons file changed: another sha1, an
//       unreadable image), or whose upload or PATCH still fails after its tries, is skipped, listed with its reason, and the run goes on; the
//       run then ends with exit code 2. A failed photo keeps its row unchanged (the PATCH comes last). Guards, exit 1 at once: a 401, 403 or
//       404 of the project (the key, the bucket: every photo would fail), or 5 photos in a row failing on the project.
//   --cache-dir <folder>: the Commons originals, one file per recorded sha1 (a file that no longer has its sha1 is downloaded again); a
//       second run downloads only what is missing.
//   --report <file.json>: the counts (photos, cards, panoramas), the failed photos and why, the cleanup's counts; written at the end and
//       when the run stops. scripts/cards/publish-summary.mjs turns it into the job summary.
//   CARDS_DATA_DIR (tests): another folder with the layout of docs/design/cards/data.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

import { RETRY_STATUS, cutPlan, fetchRetry, fileAction, filePatch, mergePhotoFiles, panoFileName, partFileName, planRemovals, retryWait, stemOf } from './card-files.mjs';
import { SIZES, panoSizes } from './card-geometry.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));

const REPO = path.resolve(HERE, '../../../..');
const DATA_DIR = process.env.CARDS_DATA_DIR ? path.resolve(process.env.CARDS_DATA_DIR) : null;
function dataFile(name) {
  const f = path.join(DATA_DIR ?? path.join(REPO, 'docs/design/cards/data'), name);
  if (!existsSync(f)) throw new Error(`${name} not found at ${f}${name === 'photos.json' ? ' (run verify-photos.mts first)' : ''}`);
  return f;
}

/** The Supabase project address for --publish: CARDS_SUPABASE_URL only, explicit, never a fallback. */
function projectOrigin() {
  const v = (process.env.CARDS_SUPABASE_URL ?? '').trim();
  if (!v) throw new Error('refused: --publish needs CARDS_SUPABASE_URL=https://<project>.supabase.co set explicitly (no fallback on any other variable or .env file)');
  const u = new URL(v);
  if (u.protocol !== 'https:') throw new Error('refused: CARDS_SUPABASE_URL must be an https address');
  return u.origin;
}
const UA = 'BunnyverseCards/1.0 (https://bunnyverse.org; hello@kpopquiz.org)';

const args = process.argv.slice(2);
const PUBLISH = args.includes('--publish');
const onlyArg = args.indexOf('--only');
const ONLY = onlyArg >= 0 ? new Set((args[onlyArg + 1] ?? '').split(',').filter(Boolean)) : null;
const argValue = (name) => { const i = args.indexOf(name); return i >= 0 ? String(args[i + 1] ?? '').trim() : null; };
const NON_INTERACTIVE = args.includes('--non-interactive');
const KEEP_GOING = args.includes('--keep-going');
const HOST_ARG = argValue('--host');
const CACHE_DIR = argValue('--cache-dir') ? path.resolve(argValue('--cache-dir')) : null;
const REPORT_FILE = argValue('--report') ? path.resolve(argValue('--report')) : null;
// Lot 6 (the photo harvest): lot 3's photos.json and, when it exists, lot6/photos.json are read as one (new subjects, new photos of known ones).
const lot6Dir = DATA_DIR ? path.join(DATA_DIR, 'lot6') : path.join(REPO, 'docs/design/cards/data/lot6');
const lot6Photos = existsSync(path.join(lot6Dir, 'photos.json')) ? JSON.parse(readFileSync(path.join(lot6Dir, 'photos.json'), 'utf8')) : null;
const lot6Slugs = existsSync(path.join(lot6Dir, 'subjects.json')) ? JSON.parse(readFileSync(path.join(lot6Dir, 'subjects.json'), 'utf8')).map((s) => s.slug) : [];
// Lot 7: the preview reads each group photo's cards (2 or 3) and the focal point its window needs from lot7/parts.json (the data of 118, by
// source page); a photo that file rejects is not cut. --publish reads the database instead (parts and focal_x/y of cards_photos).
const lot7File = DATA_DIR ? path.join(DATA_DIR, 'lot7/parts.json') : path.join(REPO, 'docs/design/cards/data/lot7/parts.json');
const LOT7 = new Map(existsSync(lot7File) ? JSON.parse(readFileSync(lot7File, 'utf8')).photos.map((e) => [e.page, e]) : []);
const photosFile = mergePhotoFiles(JSON.parse(readFileSync(dataFile('photos.json'), 'utf8')), lot6Photos);
/** Every slug lots 2, 3 and 6 know: the cleanup proposes the files of a known slug that has no live photo (a subject left out, a locked pocket). */
const KNOWN = [...new Set([...JSON.parse(readFileSync(dataFile('subjects.json'), 'utf8')).map((s) => s.slug), ...lot6Slugs, ...(lot6Photos?.subjects ?? []).map((s) => s.slug), ...photosFile.subjects.map((s) => s.slug)])];
const chosen = photosFile.subjects.filter((s) => !ONLY || ONLY.has(s.slug));
const LIVE = new Set(['approved', 'auto']);
const CUT = new Set(['approved', 'auto', 'pending']);
const isGroup = (s) => s.kind !== 'idol';
/** The photo of photos.json behind a cards_photos row (same source page). */
const byPage = new Map(photosFile.subjects.flatMap((s) => s.photos.filter((p) => p.status !== 'out').map((p) => [p.page, { s, p }])));
for (const s of chosen) for (const p of s.photos) if (CUT.has(p.status) && (!p.url || !p.sha1)) throw new Error(`${s.slug} photo ${p.slot}: no original address or sha1 in photos.json (run verify-photos.mts)`);

/** A failure of one photo's source (its Commons original or its image): --keep-going skips that photo and goes on. */
class PhotoError extends Error {}
const sha1Of = (buf) => createHash('sha1').update(buf).digest('hex');
const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));
const TRIES = 3;

let lastFetch = 0;
/** The Commons original of a photo, one request at a time and at least a second apart, checked against its recorded sha1. A download that
 *  fails on the network or with a busy status is tried up to 3 times. With --cache-dir, the file of that sha1 is used when it is there. */
async function original(s, p) {
  const cached = CACHE_DIR ? path.join(CACHE_DIR, p.sha1) : null;
  if (cached && existsSync(cached)) {
    const buf = readFileSync(cached);
    if (sha1Of(buf) === p.sha1) return buf;
  }
  let buf = null, why = '';
  for (let n = 1; n <= TRIES && !buf; n++) {
    const wait = lastFetch + 1000 - Date.now();
    if (wait > 0) await sleep(wait);
    lastFetch = Date.now();
    let retry = false, retryAfter = null;
    try {
      const r = await fetch(p.url, { headers: { 'User-Agent': UA } });
      if (r.ok) buf = Buffer.from(await r.arrayBuffer());
      else { why = `GET ${p.url}: ${r.status}`; retry = RETRY_STATUS.has(r.status); retryAfter = r.headers.get('retry-after'); }
    } catch (e) {
      why = `GET ${p.url}: ${String(e?.message ?? e)}`; retry = true;
    }
    if (!buf && retry && n < TRIES) await sleep(retryWait(n, retryAfter));
    else if (!buf) break;
  }
  if (!buf) throw new PhotoError(why);
  const sha1 = sha1Of(buf);
  if (sha1 !== p.sha1) throw new PhotoError(`${s.slug} photo ${p.slot}: the Commons file changed (sha1 ${sha1}, recorded ${p.sha1}); refused, check it on ${p.page}`);
  if (cached) { mkdirSync(CACHE_DIR, { recursive: true }); writeFileSync(cached, buf); }
  return buf;
}

function ask(prompt) {
  return new Promise((resolve) => {
    process.stdout.write(prompt);
    process.stdin.resume(); process.stdin.setEncoding('utf8');
    process.stdin.once('data', (d) => { process.stdin.pause(); resolve(String(d).trim()); });
  });
}

/** Cuts a subject at a focal point: a person gives one part (0), a group its `n` parts (halves 1-2 or thirds 1-3), each with its 1x and 2x WebP,
 *  and its panorama (the whole window; `pano.files['2x']` only when every part has its 2x). `onlyPano`: no part is encoded (a pair cut before lot 7). */
async function cut(src, s, fx, fy, n = 2, onlyPano = false) {
  const meta = await sharp(src).metadata();
  const plan = cutPlan(isGroup(s), meta.width, meta.height, fx, fy, n);
  const encode = async (box, sizes, only) => {
    const base = sharp(src).extract({ left: box.left, top: box.top, width: box.width, height: box.height });
    const files = {};
    for (const [k, [w, h]] of Object.entries(sizes)) if (!only || only.includes(k)) files[k] = await base.clone().resize(w, h, { fit: 'cover' }).webp({ quality: 82 }).toBuffer();
    return files;
  };
  const parts = [];
  for (const p of plan.parts) parts.push({ part: p.part, files: onlyPano ? {} : await encode(p, SIZES), cropWidth: p.cropWidth, has2x: p.has2x });
  const pano = plan.pano ? { files: await encode(plan.pano, panoSizes(n), plan.pano.has2x ? null : ['1x']), has2x: plan.pano.has2x } : null;
  return { parts, pano, window: plan.window };
}

function readSecret(prompt) {
  return new Promise((resolve, reject) => {
    if (!process.stdin.isTTY) return reject(new Error('--publish needs a terminal (the key is typed, not piped)'));
    process.stdout.write(prompt);
    let s = '';
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    const on = (ch) => {
      for (const c of ch) {
        if (c === '\r' || c === '\n') {
          process.stdin.setRawMode(false); process.stdin.pause(); process.stdin.off('data', on); process.stdout.write('\n');
          return resolve(s.trim());
        }
        if (c === '\u0003') process.exit(130);
        if (c === '\u007f') s = s.slice(0, -1); else s += c;
      }
    };
    process.stdin.on('data', on);
  });
}

async function preview() {
  const dir = path.join(REPO, 'out/cards-tool/preview');
  mkdirSync(dir, { recursive: true });
  const blocks = [];
  let nSmall = 0, nCut = 0;
  for (const s of chosen) {
    const cells = [];
    for (const p0 of s.photos.filter((x) => CUT.has(x.status))) {
      const l7 = isGroup(s) ? LOT7.get(p0.page) : undefined;
      if (l7?.rejected) continue;
      const p = l7 ? { ...p0, focal: l7.focal ?? p0.focal } : p0;
      const src = await original(s, p);
      const n = l7?.parts === 3 ? 3 : 2;
      const { parts, pano } = await cut(src, s, p.focal.x, p.focal.y, n);
      const stem = stemOf(s.slug, p.slot, p.focal.x, p.focal.y);
      for (const q of parts) for (const [k, buf] of Object.entries(q.files)) writeFileSync(path.join(dir, partFileName(stem, q.part, k, n)), buf);
      if (pano) for (const [k, buf] of Object.entries(pano.files)) writeFileSync(path.join(dir, panoFileName(stem, n, k)), buf);
      for (const q of parts) {
        const label = q.part === 0 ? 'card' : `${q.part}/${n}`;
        if (!q.has2x) nSmall++;
        console.log(`${s.slug.padEnd(14)} photo ${p.slot} ${p.status.padEnd(8)} ${label.padEnd(9)} crop ${q.cropWidth}px wide ${q.has2x ? 'ok for 2x' : 'TOO SMALL FOR 2x'}`);
      }
      nCut++;
      if (pano) console.log(`${s.slug.padEnd(14)} photo ${p.slot} ${p.status.padEnd(8)} panorama ${(`${pano.has2x ? 'ok for 2x' : 'TOO SMALL FOR 2x'}`)}`);
      cells.push({ p, stem, n, parts: parts.map((q) => ({ part: q.part, cropWidth: q.cropWidth, has2x: q.has2x })), pano: pano ? { has2x: pano.has2x } : null });
    }
    blocks.push({ s, cells, out: s.photos.filter((x) => x.status === 'out') });
  }
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const cell = (s, { p, stem, n, parts, pano }) => `<div class="c${parts.length > 1 ? ` pair${n === 3 ? ' tri' : ''}` : ''}${p.status === 'pending' ? ' rv' : ''}"><div class="im">${parts.map((q) => `<img src="${esc(partFileName(stem, q.part, '1x', n))}" alt="${esc(s.name)} photo ${p.slot}${q.part ? ` ${q.part}/${n}` : ''}">`).join('')}</div>
${pano ? `<div class="pano"><img src="${esc(panoFileName(stem, n, '1x'))}" alt="${esc(s.name)} photo ${p.slot} panorama"></div>` : ''}
<b>photo ${p.slot}</b> <span class="m">${esc(p.status === 'pending' ? 'to review' : p.status)}, quality ${p.quality}${p.stage ? ', stage' : ''}${p.full_ok ? ', full art ok' : ''}, focal ${p.focal.x}/${p.focal.y}</span>
<div class="m">${esc(p.date)}${p.event ? `, ${esc(p.event)}` : ''}</div>
${parts.map((q) => `<div class="m">${q.part ? `${q.part}/${n}: ` : ''}crop ${q.cropWidth}px${q.has2x ? '' : ' <span class="w">too small for 2x</span>'}</div>`).join('')}
${pano ? `<div class="m">panorama: the whole window${pano.has2x ? ', has its 2x' : ' <span class="w">no 2x (a part is too small)</span>'}</div>` : ''}
${p.status === 'pending' ? `<div class="m w">${esc(p.review.join('; '))}</div>` : ''}
<div class="m">${esc(p.author)}, ${esc(p.licence)}, <a href="${esc(p.page)}">source</a></div></div>`;
  const block = ({ s, cells, out }) => `<h2>${esc(s.name)} <span class="m">${s.kind === 'idol' ? 'person' : 'group, 2 or 3 cards and a panorama per edition'}, ${cells.length} photos${s.returning ? ', returning group' : ''}</span></h2>
<div class="g">${cells.map((c) => cell(s, c)).join('\n')}</div>
${out.length ? `<ul class="m">${out.map((p) => `<li>left out: <a href="${esc(p.page)}">${esc(p.file ?? p.page)}</a>: ${esc(p.reasons.join('; '))}</li>`).join('')}</ul>` : ''}`;
  const html = `<!doctype html><meta charset="utf-8"><title>Cards photo preview, lot 3</title>
<style>body{font:14px system-ui;margin:16px;background:#14121a;color:#eee}a{color:#9cf}.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px}
.c{background:#201c2b;padding:8px;border-radius:8px}.c.rv{outline:2px dashed #ffb454}.c.pair{grid-column:span 2}.c.tri{grid-column:span 3}.pano img{width:100%;aspect-ratio:auto;margin-top:4px;border-radius:6px;display:block}.im{display:flex;gap:2px}.c img{flex:1;min-width:0;width:100%;aspect-ratio:5.5/8.5;object-fit:cover;border-radius:6px;display:block}
.w{color:#ffb454}.m{font-size:12px;opacity:.8}h2{margin-top:28px}</style>
<h1>${nCut} photos of ${chosen.length} subjects from their Commons originals (dashed: waiting for your review in the admin)</h1>
${blocks.map(block).join('\n')}`;
  writeFileSync(path.join(dir, 'index.html'), html);
  const left = photosFile.left_out.filter((l) => !ONLY || ONLY.has(l.slug));
  console.log(`\n${nCut} photos cut, ${nSmall} card files too small for 2x. Contact sheet: ${path.join(dir, 'index.html')}`);
  for (const l of left) console.log(`left out: ${l.slug} (${l.reason})`);
}

/** A request to the Supabase project that failed after its tries: `status` is its HTTP status, null when the network failed. */
class SupabaseError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}
/** A status of the project that would fail for every photo (the key, the bucket): the run stops at once, --keep-going or not. */
const FATAL_STATUS = new Set([401, 403, 404]);
/** --keep-going stops after this many photos in a row failing on the project. */
const SUPABASE_FAILS_IN_A_ROW = 5;

/** One request to the project, with its tries (fetchRetry): the answer when it is ok, else a SupabaseError named `what`. */
async function projectFetch(what, url, init) {
  let r;
  try {
    r = await fetchRetry(() => fetch(url, init));
  } catch (e) {
    throw new SupabaseError(`${what}: ${String(e?.message ?? e)}`, null);
  }
  if (!r.ok) throw new SupabaseError(`${what}: ${r.status} ${(await r.text()).slice(0, 200)}`, r.status);
  return r;
}

/** The objects of the bucket 'cards' (Storage API list, paged), top-level names only. */
async function listBucket(origin, H) {
  const names = [];
  for (let offset = 0; ; offset += 1000) {
    const r = await projectFetch('list bucket cards', `${origin}/storage/v1/object/list/cards`, { method: 'POST', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify({ prefix: '', limit: 1000, offset, sortBy: { column: 'name', order: 'asc' } }) });
    const page = await r.json();
    for (const o of page) if (o.id !== null && o.id !== undefined) names.push(o.name); // a null id is a folder
    if (page.length < 1000) break;
  }
  return names;
}

/** What the run did, for --report (and the job summary): counts and names only, never a secret. */
const report = {
  mode: NON_INTERACTIVE ? 'non-interactive' : 'interactive', host: null, keepGoing: KEEP_GOING,
  photos: { uploaded: 0, upToDate: 0, notInData: 0, failed: 0 }, cards: 0, panoramas: 0, failed: [],
  cleanup: null, stopped: null,
};
/** The service key, once read: any message that would carry it (an error body echoing a header) shows [redacted] instead. */
let SECRET = null;
const redact = (t) => (SECRET ? String(t).split(SECRET).join('[redacted]') : String(t));
function writeReport() {
  if (!REPORT_FILE) return;
  mkdirSync(path.dirname(REPORT_FILE), { recursive: true });
  writeFileSync(REPORT_FILE, `${JSON.stringify(report, null, 2)}\n`);
}

async function publish() {
  const origin = projectOrigin();
  const host = new URL(origin).host;
  if (NON_INTERACTIVE) {
    // nothing is typed: the host comes from --host, and it must be the host of CARDS_SUPABASE_URL
    if (!HOST_ARG) throw new Error('refused: --non-interactive needs --host <project host>; nothing was sent');
    if (HOST_ARG !== host) throw new Error('refused: --host does not match the host of CARDS_SUPABASE_URL; nothing was sent');
  } else if (!process.stdin.isTTY) throw new Error('--publish needs a terminal (the host and the key are typed)');
  report.host = host;
  console.log(`Project host: ${host}`);
  console.log(`Files go to the public bucket 'cards' of this project, the rows of cards_photos are updated there, and old files may be proposed for deletion.`);
  const confirmed = (process.env.CARDS_HOST_CONFIRMED ?? '').trim();
  if (NON_INTERACTIVE) {
    console.log('Host given by --host (non-interactive: nothing is typed, the cleanup only lists).');
  } else if (confirmed) {
    // the wrapper already had this host typed back; it must still be the host of CARDS_SUPABASE_URL
    if (confirmed !== host) throw new Error('refused: CARDS_HOST_CONFIRMED does not match the host of CARDS_SUPABASE_URL; nothing was sent');
    console.log('Host already confirmed by owner-cards.');
  } else {
    const typed = await ask(`Type the project host to continue: `);
    if (typed !== host) throw new Error('refused: the host typed does not match; nothing was sent');
  }
  const key = NON_INTERACTIVE ? (process.env.CARDS_SERVICE_KEY ?? '').trim()
    : (process.env.CARDS_SERVICE_KEY ?? '').trim() || await readSecret('Supabase service key (typed, not shown): ');
  if (!key) throw new Error(NON_INTERACTIVE ? 'refused: --non-interactive needs CARDS_SERVICE_KEY in the environment; nothing was sent' : 'no key');
  SECRET = key;
  const H = { apikey: key, Authorization: `Bearer ${key}` };
  const rest = (p, init = {}) => projectFetch(`${init.method ?? 'GET'} ${p.split('?')[0]}`, `${origin}/rest/v1/${p}`, { ...init, headers: { ...H, 'Content-Type': 'application/json', ...(init.headers ?? {}) } });
  const rowsAll = await (await rest('cards_photos?select=*&status=in.(auto,approved)&order=id&limit=2000')).json();
  const slugOf = (row) => row.entity_id.replace(/^(idol|group):/, '');
  const rows = rowsAll.filter((r) => !ONLY || ONLY.has(slugOf(r)));
  const upload = (name, body) => projectFetch(`upload ${name}`, `${origin}/storage/v1/object/cards/${name}`, { method: 'POST', headers: { ...H, 'Content-Type': 'image/webp', 'x-upsert': 'true' }, body });
  let done = 0, skipped = 0, failsInARow = 0;
  for (const row of rows) {
    const hit = byPage.get(row.source_page);
    const slug = slugOf(row);
    if (!hit) { console.log(`${slug} photo ${row.slot}: not in photos.json, skipped`); skipped++; report.photos.notInData++; continue; }
    const { s, p } = hit;
    const stem = stemOf(slug, row.slot, row.focal_x, row.focal_y);
    // select=* gives the lot 7 columns (parts, file_parts, file_pano) only once file 118 is applied; before it the script is what it was.
    const { parts: n, action } = fileAction(row, stem, isGroup(s));
    if (action === 'skip') { console.log(`${slug} photo ${row.slot}: already cut at ${row.focal_x}/${row.focal_y}${isGroup(s) && 'file_pano' in row ? ` in ${n}, with its panorama` : ''}`); skipped++; report.photos.upToDate++; continue; }
    let parts, pano;
    try {
      const src = await original(s, p);
      ({ parts, pano } = await cut(src, s, row.focal_x, row.focal_y, n, action === 'pano'));
    } catch (e) {
      // --keep-going: this photo's original failed (download, sha1, image); its row is left as it is and the run goes on
      const reason = redact(e?.message ?? e);
      if (!KEEP_GOING) throw e;
      report.failed.push({ slug, slot: row.slot, page: row.source_page, reason });
      report.photos.failed++;
      console.log(`${slug} photo ${row.slot}: FAILED, skipped (--keep-going): ${reason}`);
      continue;
    }
    const sent = [];
    try {
      if (action === 'full') {
        for (const q of parts) {
          for (const k of q.has2x ? ['1x', '2x'] : ['1x']) { // no upscaled 2x file: the site uses the 1x file for a small card
            await upload(partFileName(stem, q.part, k, n), q.files[k]);
            sent.push(partFileName(stem, q.part, k, n).slice(stem.length));
          }
        }
      }
      // The panorama: its 1x always, its 2x only when every part has its 2x.
      if (pano && 'file_pano' in row) {
        for (const k of pano.has2x ? ['1x', '2x'] : ['1x']) {
          await upload(panoFileName(stem, n, k), pano.files[k]);
          sent.push(panoFileName(stem, n, k).slice(stem.length));
        }
      }
      // The row is set only once every part and the panorama are up, in ONE PATCH; its cards then enter the packs (trigger cards_photos_ready of 103).
      const body = filePatch({ stem, fx: row.focal_x, fy: row.focal_y, parts: n, pano: Boolean(pano) && 'file_pano' in row }, { fileParts: 'file_parts' in row, filePano: 'file_pano' in row });
      await rest(`cards_photos?id=eq.${row.id}`, { method: 'PATCH', body: JSON.stringify(body), headers: { Prefer: 'return=minimal' } });
    } catch (e) {
      // --keep-going: an upload or the PATCH still failed after its tries; the row was not set (the PATCH comes last) and the run goes on,
      // unless the project refuses the key or the bucket (401, 403, 404) or 5 photos in a row failed on it
      if (!KEEP_GOING || !(e instanceof SupabaseError) || FATAL_STATUS.has(e.status)) throw e;
      const reason = redact(e.message);
      report.failed.push({ slug, slot: row.slot, page: row.source_page, reason });
      report.photos.failed++;
      failsInARow++;
      console.log(`${slug} photo ${row.slot}: FAILED on the project, skipped (--keep-going): ${reason}`);
      if (failsInARow >= SUPABASE_FAILS_IN_A_ROW) throw new Error(`stopped: ${failsInARow} photos in a row failed on the project (the last: ${reason})`);
      continue;
    }
    failsInARow = 0;
    console.log(`${slug} photo ${row.slot}: uploaded ${sent.join(' ')} at ${row.focal_x}/${row.focal_y}`);
    done++;
    report.photos.uploaded++;
    if (action === 'full') report.cards += parts.length;
    if (pano && 'file_pano' in row) report.panoramas++;
  }
  console.log(`\nuploaded ${done}, skipped ${skipped}${report.failed.length ? `, failed ${report.failed.length}` : ''}`);
  const code = report.failed.length ? 2 : 0;

  // Cleanup: propose to delete what is not a file of a live photo at its current focal point. Nothing is deleted without typing: delete
  const current = new Map();
  for (const row of rows) {
    const slug = slugOf(row);
    const list = current.get(slug) ?? [];
    list.push({ slot: row.slot, group: row.entity_id.startsWith('group:'), fx: row.focal_x, fy: row.focal_y, parts: row.parts === 3 ? 3 : 2 });
    current.set(slug, list);
  }
  const names = await listBucket(origin, H);
  const { keep, remove } = planRemovals(names, { known: KNOWN, current, only: ONLY });
  console.log(`\nbucket cards: ${names.length} objects, ${keep.length} current files kept, ${remove.length} proposed for deletion${ONLY ? ` (only ${[...ONLY].join(', ')})` : ''}`);
  report.cleanup = { objects: names.length, kept: keep.length, proposed: remove.length, deleted: 0 };
  if (remove.length === 0) return code;
  for (const r of remove) console.log(`  ${r.name}  (${r.why})`);
  if (NON_INTERACTIVE) { console.log('non-interactive: nothing deleted (this mode only lists; run the script by hand in a terminal to delete)'); return code; }
  const go = await ask(`\nType delete to delete these ${remove.length} files from the public bucket 'cards' (anything else: nothing is deleted): `);
  if (go !== 'delete') { console.log('nothing deleted'); return code; }
  for (let i = 0; i < remove.length; i += 100) {
    const batch = remove.slice(i, i + 100).map((r) => r.name);
    const r = await fetch(`${origin}/storage/v1/object/cards`, { method: 'DELETE', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify({ prefixes: batch }) });
    if (!r.ok) throw new Error(`delete from cards: ${r.status} ${(await r.text()).slice(0, 200)}`);
  }
  console.log(`deleted ${remove.length} files`);
  report.cleanup.deleted = remove.length;
  return code;
}

// Exit codes: 0 done; 1 stopped (a refusal, a Supabase error, or a photo's failure without --keep-going); 2 done, but photos failed (--keep-going).
(PUBLISH ? publish() : preview())
  .then((code) => { if (PUBLISH) writeReport(); if (code) process.exit(code); })
  .catch((e) => {
    report.stopped = redact(e?.message ?? e);
    if (PUBLISH) writeReport();
    console.error(redact(e?.message ?? e));
    process.exit(1);
  });
