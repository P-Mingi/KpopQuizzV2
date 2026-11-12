#!/usr/bin/env node
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
// and never uploaded, and its files leave the bucket (see the cleanup below). A missing `age` counts as ok.
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

import { ageOk, cutPlan, isGroup, partFileName, planRemovals } from './card-files.mjs';
import { SIZES } from './card-geometry.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));

const REPO = path.resolve(HERE, '../../../..');
function findSubjects() {
  const f = path.join(REPO, 'docs/design/cards/data/subjects.json');
  if (!existsSync(f)) throw new Error(`subjects.json not found at ${f}`);
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
const allSubjects = JSON.parse(readFileSync(findSubjects(), 'utf8'));
const chosen = allSubjects.filter((s) => !ONLY || ONLY.has(s.slug));
const leftOut = chosen.filter((s) => !ageOk(s));
const subjects = chosen.filter(ageOk);
for (const s of subjects) if (!s.original?.url || !s.original?.sha1) throw new Error(`${s.slug}: no Commons original in subjects.json (run fetch-originals.mts, then gen-subjects.mts)`);

let lastFetch = 0;
/** The Commons original of a subject, one request at a time and at least a second apart, checked against its recorded sha1. */
async function original(s) {
  const wait = lastFetch + 1000 - Date.now();
  if (wait > 0) await new Promise((ok) => setTimeout(ok, wait));
  lastFetch = Date.now();
  const r = await fetch(s.original.url, { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error(`GET ${s.original.url}: ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  const sha1 = createHash('sha1').update(buf).digest('hex');
  if (sha1 !== s.original.sha1) throw new Error(`${s.slug}: the Commons file changed (sha1 ${sha1}, recorded ${s.original.sha1}); refused, check it on ${s.photo.commons_page}`);
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
  const cells = [];
  for (const s of subjects) {
    const src = await original(s);
    const { parts } = await cut(src, s, s.focal.x, s.focal.y);
    const stem = `${s.slug}-${s.focal.x}-${s.focal.y}`;
    for (const p of parts) for (const [k, buf] of Object.entries(p.files)) writeFileSync(path.join(dir, partFileName(stem, p.part, k)), buf);
    for (const p of parts) {
      const label = p.part === 0 ? 'card' : `half ${p.part}/2`;
      console.log(`${s.slug.padEnd(14)} ${label.padEnd(9)} crop ${p.cropWidth}px wide ${p.has2x ? 'ok for 2x' : 'TOO SMALL FOR 2x'} (${p.files['1x'].length} B / ${p.files['2x'].length} B)`);
    }
    cells.push({ s, stem, parts: parts.map((p) => ({ part: p.part, cropWidth: p.cropWidth, has2x: p.has2x, kb1: Math.round(p.files['1x'].length / 1024), kb2: Math.round(p.files['2x'].length / 1024) })) });
  }
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const cell = ({ s, stem, parts }) => `<div class="c${parts.length > 1 ? ' pair' : ''}"><div class="im">${parts.map((p) => `<img src="${esc(partFileName(stem, p.part, '1x'))}" alt="${esc(s.name)}${p.part ? ` ${p.part}/2` : ''}">`).join('')}</div>
<b>${esc(s.name)}</b> <span class="m">${s.kind === 'idol' ? 'person' : 'group, pair of cards'}, focal ${s.focal.x}/${s.focal.y}</span>
${parts.map((p) => `<div class="m">${p.part ? `half ${p.part}/2: ` : ''}crop ${p.cropWidth}px, 1x ${p.kb1} KB, 2x ${p.kb2} KB${p.has2x ? '' : ' <span class="w">too small for 2x</span>'}</div>`).join('')}
<div class="m">${esc(s.photo.author)}, ${esc(s.photo.licence)}, cropped</div></div>`;
  const out = leftOut.length
    ? `<h2>left out (age rule): ${leftOut.length}</h2><ul>${leftOut.map((s) => `<li>${esc(s.slug)} (${esc(s.name)})${s.age?.reason ? `: ${esc(s.age.reason)}` : ''}</li>`).join('')}</ul>`
    : '';
  const html = `<!doctype html><meta charset="utf-8"><title>Cards photo preview</title>
<style>body{font:14px system-ui;margin:16px;background:#14121a;color:#eee}.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px}
.c{background:#201c2b;padding:8px;border-radius:8px}.c.pair{grid-column:span 2}.im{display:flex;gap:2px}.c img{flex:1;min-width:0;width:100%;aspect-ratio:5.5/8.5;object-fit:cover;border-radius:6px;display:block}
.w{color:#ffb454}.m{font-size:12px;opacity:.8}</style>
<h1>${cells.length} photos from their Commons originals: a person 5.5:8.5, a group a pair (11:8.5 split in two halves), 1x 320x495</h1><div class="g">
${cells.map(cell).join('\n')}
</div>
${out}`;
  writeFileSync(path.join(dir, 'index.html'), html);
  const nSmall = cells.reduce((n, c) => n + c.parts.filter((p) => !p.has2x).length, 0);
  console.log(`\n${cells.length} subjects (${leftOut.length} left out by the age rule), ${nSmall} card files too small for 2x. Contact sheet: ${path.join(dir, 'index.html')}`);
  for (const s of leftOut) console.log(`left out (age rule): ${s.slug}${s.age?.reason ? ` (${s.age.reason})` : ''}`);
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
  const rowsAll = await (await rest('cards_photos?select=id,source_path,focal_x,focal_y,small_2x,status,storage_path,file_focal_x,file_focal_y&status=in.(auto,approved)&source_path=like.images/group-photos/*&limit=1000')).json();
  const bySlug = new Map(rowsAll.map((r) => [r.source_path.replace(/^images\/group-photos\//, '').replace(/\.jpg$/, ''), r]));
  const upload = async (name, body) => {
    const r = await fetch(`${origin}/storage/v1/object/cards/${name}`, { method: 'POST', headers: { ...H, 'Content-Type': 'image/webp', 'x-upsert': 'true' }, body });
    if (!r.ok) throw new Error(`upload ${name}: ${r.status} ${(await r.text()).slice(0, 200)}`);
  };
  let done = 0, skipped = 0;
  for (const s of leftOut) console.log(`${s.slug}: left out (age rule), not cut, not uploaded`);
  for (const s of subjects) {
    const row = bySlug.get(s.slug);
    if (!row) { console.log(`${s.slug}: no cards_photos row, skipped`); skipped++; continue; }
    const stem = `${s.slug}-${row.focal_x}-${row.focal_y}`;
    if (row.storage_path === stem && row.file_focal_x === row.focal_x && row.file_focal_y === row.focal_y) { console.log(`${s.slug}: already cut at ${row.focal_x}/${row.focal_y}`); skipped++; continue; }
    const src = await original(s);
    const { parts } = await cut(src, s, row.focal_x, row.focal_y);
    const sent = [];
    for (const p of parts) {
      for (const k of p.has2x ? ['1x', '2x'] : ['1x']) { // no upscaled 2x file: the site uses the 1x file for a small half
        await upload(partFileName(stem, p.part, k), p.files[k]);
        sent.push(partFileName(stem, p.part, k).slice(stem.length));
      }
    }
    // The row is set only once every half is up.
    await rest(`cards_photos?id=eq.${row.id}`, { method: 'PATCH', body: JSON.stringify({ storage_path: stem, file_focal_x: row.focal_x, file_focal_y: row.focal_y }), headers: { Prefer: 'return=minimal' } });
    console.log(`${s.slug}: uploaded ${sent.join(' ')} at ${row.focal_x}/${row.focal_y}`);
    done++;
  }
  console.log(`\nuploaded ${done}, skipped ${skipped}`);

  // Cleanup: propose to delete what is not a file of a current stem of an included subject. Nothing is deleted without typing: delete
  const current = new Map();
  const skip = new Set();
  for (const s of subjects) {
    const row = bySlug.get(s.slug);
    if (row) current.set(s.slug, { group: isGroup(s), fx: row.focal_x, fy: row.focal_y });
    else skip.add(s.slug);
  }
  const names = await listBucket(origin, H);
  const { keep, remove } = planRemovals(names, { known: allSubjects.map((s) => s.slug), current, only: ONLY, skip });
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
