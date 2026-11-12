#!/usr/bin/env node
// Bunnyverse Cards: the owner's script for the card files (owner mission 2026-11-12, integrator review the same day). Tracked in the
// repository so it reaches the owner's checkout (out/ is git-ignored); it writes its previews under out/cards-tool/ at the repository root.
// Every card file is cut from the Commons ORIGINAL of the same photo (same Commons page, same licence, full size: subjects.json
// `original`, read by fetch-originals.mts), never from the 1,200 px copies of the bucket `images`. A downloaded original whose sha1
// differs from the recorded one is refused (the file changed on Commons: check it first).
//   node apps/quiz/scripts/cards/publish-card-files.mjs
//       preview: downloads the originals from Commons (one at a time, with a User-Agent naming the project), crops them to 5.5:8.5
//       around the default focal point, writes WebP 1x (320x495) and 2x (640x989) and a contact sheet to
//       out/cards-tool/preview/index.html. Reads Commons only. Writes nothing remote, needs no project address and no key.
//   CARDS_SUPABASE_URL=https://<project>.supabase.co node apps/quiz/scripts/cards/publish-card-files.mjs --publish
//       refuses without an explicit CARDS_SUPABASE_URL (no fallback on NEXT_PUBLIC_SUPABASE_URL or on any .env file), prints the
//       project host and asks to type it back before anything is sent, then asks for the service key (not echoed, never printed,
//       never written), reads the current focal points of cards_photos, cuts every original at those points, uploads to the public
//       bucket 'cards' as <slug>-<fx>-<fy>-1x.webp / -2x.webp, and sets storage_path (the stem), file_focal_x and file_focal_y.
// Options: --only slug1,slug2   limit to some subjects.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RATIO = 5.5 / 8.5;
const SIZES = { '1x': [320, 495], '2x': [640, 989] };
const MIN_2X = 640;

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
const subjects = JSON.parse(readFileSync(findSubjects(), 'utf8')).filter((s) => !ONLY || ONLY.has(s.slug));
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

/** The widest 5.5:8.5 window of the photo, placed by the focal point (fx, fy in 0..100). */
function cropBox(w, h, fx, fy) {
  let cw = Math.floor(Math.min(w, h * RATIO));
  let ch = Math.round(cw / RATIO);
  if (ch > h) { ch = h; cw = Math.floor(h * RATIO); }
  return { left: Math.round(((w - cw) * fx) / 100), top: Math.round(((h - ch) * fy) / 100), width: cw, height: ch };
}

async function cut(src, fx, fy) {
  const meta = await sharp(src).metadata();
  const box = cropBox(meta.width, meta.height, fx, fy);
  const base = sharp(src).extract(box);
  const out = {};
  for (const [k, [w, h]] of Object.entries(SIZES)) out[k] = await base.clone().resize(w, h, { fit: 'cover' }).webp({ quality: 82 }).toBuffer();
  return { files: out, cropWidth: box.width };
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
    const { files, cropWidth } = await cut(src, s.focal.x, s.focal.y);
    for (const [k, buf] of Object.entries(files)) writeFileSync(path.join(dir, `${s.slug}-${s.focal.x}-${s.focal.y}-${k}.webp`), buf);
    const small = cropWidth < MIN_2X;
    console.log(`${s.slug.padEnd(14)} crop ${cropWidth}px wide ${small ? 'TOO SMALL FOR 2x' : 'ok for 2x'} (${files['1x'].length} B / ${files['2x'].length} B)`);
    cells.push({ s, cropWidth, small, kb1: Math.round(files['1x'].length / 1024), kb2: Math.round(files['2x'].length / 1024) });
  }
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const html = `<!doctype html><meta charset="utf-8"><title>Cards photo preview</title>
<style>body{font:14px system-ui;margin:16px;background:#14121a;color:#eee}.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px}
.c{background:#201c2b;padding:8px;border-radius:8px}.c img{width:100%;aspect-ratio:5.5/8.5;object-fit:cover;border-radius:6px;display:block}
.w{color:#ffb454}.m{font-size:12px;opacity:.8}</style>
<h1>${cells.length} photos from their Commons originals, crop 5.5:8.5, 1x 320x495</h1><div class="g">
${cells.map(({ s, cropWidth, small, kb1, kb2 }) => `<div class="c"><img src="${esc(s.slug)}-${s.focal.x}-${s.focal.y}-1x.webp" alt="${esc(s.name)}">
<b>${esc(s.name)}</b> <span class="m">${s.kind === 'idol' ? 'person' : 'group'}, focal ${s.focal.x}/${s.focal.y}</span>
<div class="m">crop ${cropWidth}px, 1x ${kb1} KB, 2x ${kb2} KB</div>${small ? '<div class="w">too small for 2x</div>' : ''}
<div class="m">${esc(s.photo.author)}, ${esc(s.photo.licence)}, cropped</div></div>`).join('\n')}
</div>`;
  writeFileSync(path.join(dir, 'index.html'), html);
  const nSmall = cells.filter((c) => c.small).length;
  console.log(`\n${cells.length} subjects, ${nSmall} too small for 2x. Contact sheet: ${path.join(dir, 'index.html')}`);
}

async function publish() {
  const origin = projectOrigin();
  if (!process.stdin.isTTY) throw new Error('--publish needs a terminal (the host and the key are typed)');
  const host = new URL(origin).host;
  console.log(`Project host: ${host}`);
  console.log(`Files go to the public bucket 'cards' of this project, and the rows of cards_photos are updated there.`);
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
  let done = 0, skipped = 0;
  for (const s of subjects) {
    const row = bySlug.get(s.slug);
    if (!row) { console.log(`${s.slug}: no cards_photos row, skipped`); skipped++; continue; }
    const stem = `${s.slug}-${row.focal_x}-${row.focal_y}`;
    if (row.storage_path === stem && row.file_focal_x === row.focal_x && row.file_focal_y === row.focal_y) { console.log(`${s.slug}: already cut at ${row.focal_x}/${row.focal_y}`); skipped++; continue; }
    const src = await original(s);
    const { files, cropWidth } = await cut(src, row.focal_x, row.focal_y);
    const kinds = cropWidth < MIN_2X ? ['1x'] : ['1x', '2x']; // no upscaled 2x file: the site uses the 1x file for a small photo
    for (const k of kinds) {
      const r = await fetch(`${origin}/storage/v1/object/cards/${stem}-${k}.webp`, { method: 'POST', headers: { ...H, 'Content-Type': 'image/webp', 'x-upsert': 'true' }, body: files[k] });
      if (!r.ok) throw new Error(`upload ${stem}-${k}.webp: ${r.status} ${(await r.text()).slice(0, 200)}`);
    }
    await rest(`cards_photos?id=eq.${row.id}`, { method: 'PATCH', body: JSON.stringify({ storage_path: stem, file_focal_x: row.focal_x, file_focal_y: row.focal_y }), headers: { Prefer: 'return=minimal' } });
    console.log(`${s.slug}: uploaded ${kinds.join(' + ')} at ${row.focal_x}/${row.focal_y}`);
    done++;
  }
  console.log(`\nuploaded ${done}, skipped ${skipped}`);
}

(PUBLISH ? publish() : preview()).catch((e) => { console.error(String(e.message ?? e)); process.exit(1); });
