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
// Options: --only slug1,slug2   limit to some subjects (the cleanup then looks at the objects of those slugs only).
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

import { cutPlan, partFileName, planRemovals, stemOf } from './card-files.mjs';
import { SIZES } from './card-geometry.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));

const REPO = path.resolve(HERE, '../../../..');
function dataFile(name) {
  const f = path.join(REPO, 'docs/design/cards/data', name);
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
const photosFile = JSON.parse(readFileSync(dataFile('photos.json'), 'utf8'));
/** Every slug lots 2 and 3 know: the cleanup proposes the files of a known slug that has no live photo (a subject left out). */
const KNOWN = [...new Set([...JSON.parse(readFileSync(dataFile('subjects.json'), 'utf8')).map((s) => s.slug), ...photosFile.subjects.map((s) => s.slug)])];
const chosen = photosFile.subjects.filter((s) => !ONLY || ONLY.has(s.slug));
const LIVE = new Set(['approved', 'auto']);
const CUT = new Set(['approved', 'auto', 'pending']);
const isGroup = (s) => s.kind !== 'idol';
/** The photo of photos.json behind a cards_photos row (same source page). */
const byPage = new Map(photosFile.subjects.flatMap((s) => s.photos.filter((p) => p.status !== 'out').map((p) => [p.page, { s, p }])));
for (const s of chosen) for (const p of s.photos) if (CUT.has(p.status) && (!p.url || !p.sha1)) throw new Error(`${s.slug} photo ${p.slot}: no original address or sha1 in photos.json (run verify-photos.mts)`);

let lastFetch = 0;
/** The Commons original of a photo, one request at a time and at least a second apart, checked against its recorded sha1. */
async function original(s, p) {
  const wait = lastFetch + 1000 - Date.now();
  if (wait > 0) await new Promise((ok) => setTimeout(ok, wait));
  lastFetch = Date.now();
  const r = await fetch(p.url, { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error(`GET ${p.url}: ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  const sha1 = createHash('sha1').update(buf).digest('hex');
  if (sha1 !== p.sha1) throw new Error(`${s.slug} photo ${p.slot}: the Commons file changed (sha1 ${sha1}, recorded ${p.sha1}); refused, check it on ${p.page}`);
  return buf;
}

function ask(prompt) {
  return new Promise((resolve) => {
    process.stdout.write(prompt);
    process.stdin.resume(); process.stdin.setEncoding('utf8');
    process.stdin.once('data', (d) => { process.stdin.pause(); resolve(String(d).trim()); });
  });
}

/** Cuts a subject at a focal point: a person gives one part (0), a group its two halves (1, 2), each with its 1x and 2x WebP. */
async function cut(src, s, fx, fy) {
  const meta = await sharp(src).metadata();
  const plan = cutPlan(isGroup(s), meta.width, meta.height, fx, fy);
  const parts = [];
  for (const p of plan.parts) {
    const base = sharp(src).extract({ left: p.left, top: p.top, width: p.width, height: p.height });
    const files = {};
    for (const [k, [w, h]] of Object.entries(SIZES)) files[k] = await base.clone().resize(w, h, { fit: 'cover' }).webp({ quality: 82 }).toBuffer();
    parts.push({ part: p.part, files, cropWidth: p.cropWidth, has2x: p.has2x });
  }
  return { parts, window: plan.window };
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
    for (const p of s.photos.filter((x) => CUT.has(x.status))) {
      const src = await original(s, p);
      const { parts } = await cut(src, s, p.focal.x, p.focal.y);
      const stem = stemOf(s.slug, p.slot, p.focal.x, p.focal.y);
      for (const q of parts) for (const [k, buf] of Object.entries(q.files)) writeFileSync(path.join(dir, partFileName(stem, q.part, k)), buf);
      for (const q of parts) {
        const label = q.part === 0 ? 'card' : `half ${q.part}/2`;
        if (!q.has2x) nSmall++;
        console.log(`${s.slug.padEnd(14)} photo ${p.slot} ${p.status.padEnd(8)} ${label.padEnd(9)} crop ${q.cropWidth}px wide ${q.has2x ? 'ok for 2x' : 'TOO SMALL FOR 2x'}`);
      }
      nCut++;
      cells.push({ p, stem, parts: parts.map((q) => ({ part: q.part, cropWidth: q.cropWidth, has2x: q.has2x })) });
    }
    blocks.push({ s, cells, out: s.photos.filter((x) => x.status === 'out') });
  }
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const cell = (s, { p, stem, parts }) => `<div class="c${parts.length > 1 ? ' pair' : ''}${p.status === 'pending' ? ' rv' : ''}"><div class="im">${parts.map((q) => `<img src="${esc(partFileName(stem, q.part, '1x'))}" alt="${esc(s.name)} photo ${p.slot}${q.part ? ` ${q.part}/2` : ''}">`).join('')}</div>
<b>photo ${p.slot}</b> <span class="m">${esc(p.status === 'pending' ? 'to review' : p.status)}, quality ${p.quality}${p.stage ? ', stage' : ''}${p.full_ok ? ', full art ok' : ''}, focal ${p.focal.x}/${p.focal.y}</span>
<div class="m">${esc(p.date)}${p.event ? `, ${esc(p.event)}` : ''}</div>
${parts.map((q) => `<div class="m">${q.part ? `half ${q.part}/2: ` : ''}crop ${q.cropWidth}px${q.has2x ? '' : ' <span class="w">too small for 2x</span>'}</div>`).join('')}
${p.status === 'pending' ? `<div class="m w">${esc(p.review.join('; '))}</div>` : ''}
<div class="m">${esc(p.author)}, ${esc(p.licence)}, <a href="${esc(p.page)}">source</a></div></div>`;
  const block = ({ s, cells, out }) => `<h2>${esc(s.name)} <span class="m">${s.kind === 'idol' ? 'person' : 'group, a pair per edition'}, ${cells.length} photos${s.returning ? ', returning group' : ''}</span></h2>
<div class="g">${cells.map((c) => cell(s, c)).join('\n')}</div>
${out.length ? `<ul class="m">${out.map((p) => `<li>left out: <a href="${esc(p.page)}">${esc(p.file ?? p.page)}</a>: ${esc(p.reasons.join('; '))}</li>`).join('')}</ul>` : ''}`;
  const html = `<!doctype html><meta charset="utf-8"><title>Cards photo preview, lot 3</title>
<style>body{font:14px system-ui;margin:16px;background:#14121a;color:#eee}a{color:#9cf}.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px}
.c{background:#201c2b;padding:8px;border-radius:8px}.c.rv{outline:2px dashed #ffb454}.c.pair{grid-column:span 2}.im{display:flex;gap:2px}.c img{flex:1;min-width:0;width:100%;aspect-ratio:5.5/8.5;object-fit:cover;border-radius:6px;display:block}
.w{color:#ffb454}.m{font-size:12px;opacity:.8}h2{margin-top:28px}</style>
<h1>${nCut} photos of ${chosen.length} subjects from their Commons originals (dashed: waiting for your review in the admin)</h1>
${blocks.map(block).join('\n')}`;
  writeFileSync(path.join(dir, 'index.html'), html);
  const left = photosFile.left_out.filter((l) => !ONLY || ONLY.has(l.slug));
  console.log(`\n${nCut} photos cut, ${nSmall} card files too small for 2x. Contact sheet: ${path.join(dir, 'index.html')}`);
  for (const l of left) console.log(`left out: ${l.slug} (${l.reason})`);
}

/** The objects of the bucket 'cards' (Storage API list, paged), top-level names only. */
async function listBucket(origin, H) {
  const names = [];
  for (let offset = 0; ; offset += 1000) {
    const r = await fetch(`${origin}/storage/v1/object/list/cards`, { method: 'POST', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify({ prefix: '', limit: 1000, offset, sortBy: { column: 'name', order: 'asc' } }) });
    if (!r.ok) throw new Error(`list bucket cards: ${r.status} ${(await r.text()).slice(0, 200)}`);
    const page = await r.json();
    for (const o of page) if (o.id !== null && o.id !== undefined) names.push(o.name); // a null id is a folder
    if (page.length < 1000) break;
  }
  return names;
}

async function publish() {
  const origin = projectOrigin();
  if (!process.stdin.isTTY) throw new Error('--publish needs a terminal (the host and the key are typed)');
  const host = new URL(origin).host;
  console.log(`Project host: ${host}`);
  console.log(`Files go to the public bucket 'cards' of this project, the rows of cards_photos are updated there, and old files may be proposed for deletion.`);
  const typed = await ask(`Type the project host to continue: `);
  if (typed !== host) throw new Error('refused: the host typed does not match; nothing was sent');
  const key = await readSecret('Supabase service key (typed, not shown): ');
  if (!key) throw new Error('no key');
  const H = { apikey: key, Authorization: `Bearer ${key}` };
  const rest = async (p, init = {}) => {
    const r = await fetch(`${origin}/rest/v1/${p}`, { ...init, headers: { ...H, 'Content-Type': 'application/json', ...(init.headers ?? {}) } });
    if (!r.ok) throw new Error(`${init.method ?? 'GET'} ${p.split('?')[0]}: ${r.status} ${(await r.text()).slice(0, 200)}`);
    return r;
  };
  const rowsAll = await (await rest('cards_photos?select=id,entity_id,slot,source_page,focal_x,focal_y,status,storage_path,file_focal_x,file_focal_y&status=in.(auto,approved)&order=id&limit=2000')).json();
  const slugOf = (row) => row.entity_id.replace(/^(idol|group):/, '');
  const rows = rowsAll.filter((r) => !ONLY || ONLY.has(slugOf(r)));
  const upload = async (name, body) => {
    const r = await fetch(`${origin}/storage/v1/object/cards/${name}`, { method: 'POST', headers: { ...H, 'Content-Type': 'image/webp', 'x-upsert': 'true' }, body });
    if (!r.ok) throw new Error(`upload ${name}: ${r.status} ${(await r.text()).slice(0, 200)}`);
  };
  let done = 0, skipped = 0;
  for (const row of rows) {
    const hit = byPage.get(row.source_page);
    const slug = slugOf(row);
    if (!hit) { console.log(`${slug} photo ${row.slot}: not in photos.json, skipped`); skipped++; continue; }
    const { s, p } = hit;
    const stem = stemOf(slug, row.slot, row.focal_x, row.focal_y);
    if (row.storage_path === stem && row.file_focal_x === row.focal_x && row.file_focal_y === row.focal_y) { console.log(`${slug} photo ${row.slot}: already cut at ${row.focal_x}/${row.focal_y}`); skipped++; continue; }
    const src = await original(s, p);
    const { parts } = await cut(src, s, row.focal_x, row.focal_y);
    const sent = [];
    for (const q of parts) {
      for (const k of q.has2x ? ['1x', '2x'] : ['1x']) { // no upscaled 2x file: the site uses the 1x file for a small card
        await upload(partFileName(stem, q.part, k), q.files[k]);
        sent.push(partFileName(stem, q.part, k).slice(stem.length));
      }
    }
    // The row is set only once every part is up; its cards then enter the packs (trigger cards_photos_ready of 103).
    await rest(`cards_photos?id=eq.${row.id}`, { method: 'PATCH', body: JSON.stringify({ storage_path: stem, file_focal_x: row.focal_x, file_focal_y: row.focal_y }), headers: { Prefer: 'return=minimal' } });
    console.log(`${slug} photo ${row.slot}: uploaded ${sent.join(' ')} at ${row.focal_x}/${row.focal_y}`);
    done++;
  }
  console.log(`\nuploaded ${done}, skipped ${skipped}`);

  // Cleanup: propose to delete what is not a file of a live photo at its current focal point. Nothing is deleted without typing: delete
  const current = new Map();
  for (const row of rows) {
    const slug = slugOf(row);
    const list = current.get(slug) ?? [];
    list.push({ slot: row.slot, group: row.entity_id.startsWith('group:'), fx: row.focal_x, fy: row.focal_y });
    current.set(slug, list);
  }
  const names = await listBucket(origin, H);
  const { keep, remove } = planRemovals(names, { known: KNOWN, current, only: ONLY });
  console.log(`\nbucket cards: ${names.length} objects, ${keep.length} current files kept, ${remove.length} proposed for deletion${ONLY ? ` (only ${[...ONLY].join(', ')})` : ''}`);
  if (remove.length === 0) return;
  for (const r of remove) console.log(`  ${r.name}  (${r.why})`);
  const go = await ask(`\nType delete to delete these ${remove.length} files from the public bucket 'cards' (anything else: nothing is deleted): `);
  if (go !== 'delete') { console.log('nothing deleted'); return; }
  for (let i = 0; i < remove.length; i += 100) {
    const batch = remove.slice(i, i + 100).map((r) => r.name);
    const r = await fetch(`${origin}/storage/v1/object/cards`, { method: 'DELETE', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify({ prefixes: batch }) });
    if (!r.ok) throw new Error(`delete from cards: ${r.status} ${(await r.text()).slice(0, 200)}`);
  }
  console.log(`deleted ${remove.length} files`);
}

(PUBLISH ? publish() : preview()).catch((e) => { console.error(String(e.message ?? e)); process.exit(1); });
