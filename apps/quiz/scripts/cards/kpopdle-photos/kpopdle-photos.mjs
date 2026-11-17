#!/usr/bin/env node
// kpopdle-photos.mjs: gives the Kpopdle idols the photos kpopquiz.org already uses (apps/quiz/public/idols, the pictures of the member
// pages), so the game shows a face next to each name. Owner-run. Moved from out/otaku-refs-tool/ into the repo (lot 3 DLE); same behaviour.
//
// For each idol of the game "kpopdle-idol" the photo is, in this order:
//   1. the file of its kpopquiz.org page (idols.photo_url = "/idols/<file>"), or
//   2. a file of apps/quiz/public/idols named "<idol> <group>.jpg" ("Jackson GOT7.jpg", "Cha Eun-woo ASTRO.jpg"); a file that fits two
//      idols, or two files that fit one idol, are left out and listed.
// An idol that already has a picture (set in the admin's Idols tab, or by an earlier run) is skipped; --replace replaces it.
// More photos later: put "<idol> <group>.jpg" files in any folder and run with --idols-dir <folder> (only the idols still without a
// picture get one; their note then says "supplied by the owner", not "already used on kpopquiz.org").
// Each photo is cropped on its face (sharp's "attention") and saved as WebP at the admin's sizes for an idol: 400x500, 800x1000 and
// a 96 px square, in the public bucket "entity-images" at kpop/idol/<id>/, with its row in entity_images (verified, so the game uses
// it). Licence written as it is: "other", note "Photo already used on kpopquiz.org (/idols/<file>); supplied by the owner, source not
// recorded." The game picks the pictures up at its next nightly refresh (00:05 UTC); kpopquiz.org's own pages do not change.
//
// Run, from the repo folder (Node 18 or newer):
//   read -rs SUPABASE_SERVICE_ROLE_KEY && export SUPABASE_SERVICE_ROLE_KEY     (paste the key, nothing shows, press Enter)
//   node apps/quiz/scripts/cards/kpopdle-photos/kpopdle-photos.mjs              preview: which idol gets which file, who has none (reads only)
//   node apps/quiz/scripts/cards/kpopdle-photos/kpopdle-photos.mjs --publish    publish
// Options: --replace (replace the picture of an idol that already has one), --idols-dir <folder> (more photos than the site's).
// The service key is never printed or written. An idol left without a photo is not an error: the game shows its designed card (the colours of
// the group, the name set in type), never initials on a flat block. sharp comes from the repo's node_modules (a dependency of the workspace).
// Lot CPUB-RETRY (integrator, 2026-11-17): each read (restAll), each upload and each write of entity_images is tried up to 4 times on a passing error (fetchRetry
// of ../card-files.mjs: 408, 429, 5xx, Cloudflare's 520 to 524, the network; Retry-After respected, at most 60 s). Each one is idempotent
// before it is tried again: an upload replaces (x-upsert), the PATCH sets the same values, and the new row is an upsert on the table's
// unique key (on_conflict=site_id,kind,slug, Prefer resolution=merge-duplicates): a POST whose answer was lost after the insert does not
// make a second row. The DELETE of the old files stays best effort.

import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { fetchRetry } from '../card-files.mjs';
import { REPO, loadConfig, restAll, serviceHeaders } from './common.mjs';

const BUCKET = 'entity-images';
const GAME = 'kpopdle-idol';
const BOX = { w: 400, h: 500 }; // PHOTO_BOX.idol in apps/quiz/src/lib/photos/slots.ts
const THUMB = 96;
const IMAGE_FILE = /\.(jpe?g|png|webp)$/i;
const NAME_ALIASES = { jayb: ['jb'] };

export const norm = (s) => String(s ?? '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

/** Every (name, group) reading of a file name: "Bang Chan STRYKIDS.jpg" -> bang / chanstrykids, bangchan / strykids. */
function readings(file) {
  const words = file.replace(/\.[a-z0-9]+$/i, '').trim().split(/\s+/);
  const out = [];
  for (let k = 1; k < words.length; k++) out.push({ name: norm(words.slice(0, k).join(' ')), group: norm(words.slice(k).join(' ')) });
  return out;
}
const groupFits = (fileGroup, g) => fileGroup === g || (g.length >= 3 && fileGroup.startsWith(g));
function nameFits(fileName, idolName) {
  if (!fileName || !idolName) return false;
  if (fileName === idolName || (NAME_ALIASES[idolName] ?? []).includes(fileName)) return true;
  return (fileName.length >= 3 && idolName.endsWith(fileName)) || (idolName.length >= 3 && fileName.endsWith(idolName));
}

/** idols: [{ id, name, group, photo_url }]; files: names in public/idols. Returns one entry per idol: { idol, file, how } or { idol, problem }. */
export function matchPhotos(idols, files) {
  const byLower = new Map(files.map((f) => [f.toLowerCase(), f]));
  const out = new Map();
  const used = new Set();
  for (const i of idols) {
    const p = typeof i.photo_url === 'string' && i.photo_url.startsWith('/idols/') ? decodeURIComponent(i.photo_url.slice(7)).toLowerCase() : null;
    const f = p ? byLower.get(p) : null;
    if (f) { out.set(i.id, { idol: i, file: f, how: 'its kpopquiz.org page' }); used.add(f); }
  }
  const claims = new Map();
  for (const i of idols) {
    if (out.has(i.id)) continue;
    const g = norm(i.group); const n = norm(i.name);
    const hits = files.filter((f) => !used.has(f) && readings(f).some((r) => groupFits(r.group, g) && nameFits(r.name, n)));
    if (hits.length > 1) { out.set(i.id, { idol: i, problem: `several files fit: ${hits.join(', ')}` }); continue; }
    if (hits.length === 0) { out.set(i.id, { idol: i, problem: null }); continue; }
    out.set(i.id, { idol: i, file: hits[0], how: 'file name' });
    claims.set(hits[0], [...(claims.get(hits[0]) ?? []), i.id]);
  }
  for (const [file, ids] of claims) {
    if (ids.length < 2) continue;
    for (const id of ids) out.set(id, { idol: out.get(id).idol, problem: `${file} fits ${ids.length} idols` });
  }
  return idols.map((i) => out.get(i.id));
}

async function render(sharp, bytes) {
  const base = () => sharp(bytes, { failOn: 'none' }).rotate();
  const meta = await base().metadata();
  const crop = (w, h) => base().resize(w, h, { fit: 'cover', position: sharp.strategy?.attention ?? 'centre' }).webp({ quality: 88, effort: 5 }).toBuffer();
  const [x1, x2, thumb] = await Promise.all([crop(BOX.w, BOX.h), crop(BOX.w * 2, BOX.h * 2), crop(THUMB, THUMB)]);
  return { x1, x2, thumb, small: Math.min(meta.width ?? 0, meta.height ?? 0) < BOX.w };
}

async function upload(cfg, p, bytes, sleep) {
  const res = await fetchRetry(() => fetch(`${cfg.url}/storage/v1/object/${BUCKET}/${p}`, {
    method: 'POST', headers: serviceHeaders(cfg.serviceKey, { 'Content-Type': 'image/webp', 'x-upsert': 'true', 'cache-control': 'max-age=31536000' }), body: bytes,
  }), { sleep });
  if (!res.ok) throw new Error(`storage HTTP ${res.status}`);
}

/** The new row of an idol is an upsert on UNIQUE (site_id, kind, slug): tried again after a lost answer, it never makes a second row. */
export const UPSERT_QUERY = 'on_conflict=site_id,kind,slug';
export const UPSERT_PREFER = 'resolution=merge-duplicates,return=minimal';

async function rest(cfg, method, query, body, { prefer = 'return=minimal', sleep } = {}) {
  const res = await fetchRetry(() => fetch(`${cfg.url}/rest/v1/entity_images?${query}`, {
    method, headers: serviceHeaders(cfg.serviceKey, { 'Content-Type': 'application/json', Prefer: prefer }), ...(body ? { body: JSON.stringify(body) } : {}),
  }), { sleep });
  if (!res.ok) throw new Error(`entity_images HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

async function publishOne(cfg, sharp, item, dir, old, fromSite, sleep) {
  const { x1, x2, thumb, small } = await render(sharp, await readFile(path.join(dir, item.file)));
  const base = `kpop/idol/${item.idol.id}/${createHash('sha256').update(x1).digest('hex').slice(0, 16)}`;
  const p1 = `${base}.webp`; const p2 = `${base}-2x.webp`; const pt = `${base}-96.webp`;
  await upload(cfg, p1, x1, sleep); await upload(cfg, p2, x2, sleep); await upload(cfg, pt, thumb, sleep);
  const fields = {
    path: p1, width: BOX.w, height: BOX.h, thumb_path: pt, focal_x: 50, focal_y: 50, source_url: null, author: null, license: 'other',
    license_url: null, commons_file: null, license_verified: true,
    license_note: fromSite ? `Photo already used on kpopquiz.org (/idols/${item.file}); supplied by the owner, source not recorded.`
      : `Photo supplied by the owner (${item.file}), source not recorded.`,
  };
  const q = `site_id=eq.kpop&kind=eq.idol&slug=eq.${item.idol.id}`;
  if (old) await rest(cfg, 'PATCH', q, fields, { sleep });
  else await rest(cfg, 'POST', UPSERT_QUERY, [{ site_id: 'kpop', kind: 'idol', slug: String(item.idol.id), created_by: null, ...fields }], { prefer: UPSERT_PREFER, sleep });
  if (old && old.path && old.path !== p1) {
    await fetch(`${cfg.url}/storage/v1/object/${BUCKET}`, {
      method: 'DELETE', headers: serviceHeaders(cfg.serviceKey, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({ prefixes: [old.path, old.path.replace(/\.webp$/, '-2x.webp'), old.thumb_path].filter(Boolean) }),
    }).catch(() => null);
  }
  return { small };
}

export async function main(argv = process.argv.slice(2), deps = {}) {
  const publish = argv.includes('--publish');
  const replace = argv.includes('--replace');
  const i = argv.indexOf('--idols-dir');
  const siteDir = deps.siteDir ?? path.join(REPO, 'apps', 'quiz', 'public', 'idols');
  const dir = i >= 0 && argv[i + 1] ? path.resolve(argv[i + 1]) : siteDir;
  const fromSite = path.resolve(dir) === path.resolve(siteDir);
  if (!existsSync(dir)) throw new Error(`no photo folder at ${dir} (run from the repo, or pass --idols-dir <folder>)`);
  const files = (await readdir(dir)).filter((f) => IMAGE_FILE.test(f) && !f.startsWith('.'));
  const cfg = await loadConfig();
  if (!cfg.serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set in this terminal (see the top of this file)');

  const entities = await restAll(cfg, 'dle_entities', `select=entity_id&game_id=eq.${GAME}`, { sleep: deps.sleep });
  const ids = entities.map((e) => Number(e.entity_id)).filter((n) => Number.isInteger(n) && n > 0);
  if (!ids.length) throw new Error(`the game ${GAME} has no idol`);
  const idols = await restAll(cfg, 'idols', `select=id,name,photo_url,group_id&id=in.(${ids.join(',')})&order=id`, { sleep: deps.sleep });
  const groups = await restAll(cfg, 'groups', 'select=id,name&site_id=eq.kpop&order=id', { sleep: deps.sleep });
  const groupName = new Map(groups.map((g) => [g.id, g.name]));
  const existing = await restAll(cfg, 'entity_images', 'select=slug,path,thumb_path&site_id=eq.kpop&kind=eq.idol', { sleep: deps.sleep });
  const have = new Map(existing.map((r) => [String(r.slug), r]));

  const list = idols.map((x) => ({ id: x.id, name: x.name, group: groupName.get(x.group_id) ?? '', photo_url: x.photo_url }))
    .sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name));
  const matched = matchPhotos(list, files);
  const ready = []; const skipped = []; const none = [];
  for (const m of matched) {
    if (have.has(String(m.idol.id)) && !replace) { skipped.push(m); continue; }
    if (!m.file) { none.push(m); continue; }
    ready.push(m);
  }

  console.log(`Kpopdle: ${list.length} idols. ${ready.length} get a photo, ${skipped.length} already have one, ${none.length} have none.`);
  for (const m of ready) console.log(`  ${publish ? 'publish' : 'would publish'}  ${m.idol.name} (${m.idol.group})  <- ${m.file}  [${m.how}]`);
  for (const m of skipped) console.log(`  kept     ${m.idol.name} (${m.idol.group}): already has a picture (--replace to replace it)`);
  for (const m of none) console.log(`  none     ${m.idol.name} (${m.idol.group})${m.problem ? `: ${m.problem}` : ''}`);
  if (!publish) {
    console.log('\nPreview only: nothing was written. Run again with --publish to publish.');
    return { ready: ready.length, skipped: skipped.length, none: none.length, published: 0 };
  }

  const sharp = deps.sharp ?? (await import('sharp')).default;
  const report = [['idol_id', 'name', 'group', 'file', 'result']];
  let published = 0;
  for (const m of ready) {
    try {
      const r = await publishOne(cfg, sharp, m, dir, have.get(String(m.idol.id)) ?? null, fromSite, deps.sleep);
      published++;
      report.push([m.idol.id, m.idol.name, m.idol.group, m.file, r.small ? 'published, small source: may look soft' : 'published']);
      if (published % 20 === 0) console.log(`  ${published} published...`);
    } catch (e) {
      report.push([m.idol.id, m.idol.name, m.idol.group, m.file, `error: ${e.message}`]);
      console.log(`  !! ${m.idol.name} (${m.idol.group}): ${e.message}`);
    }
    await new Promise((res) => setTimeout(res, deps.pauseMs ?? 80));
  }
  for (const m of none) report.push([m.idol.id, m.idol.name, m.idol.group, '', m.problem ? `no photo: ${m.problem}` : 'no photo']);
  const csv = report.map((r) => r.map((v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v))).join(',')).join('\n');
  const reportFile = deps.reportFile ?? path.join(path.dirname(fileURLToPath(import.meta.url)), 'kpopdle-photos-report.csv');
  await writeFile(reportFile, `${csv}\n`);
  console.log(`\nDone. ${published} published, ${ready.length - published} errors, ${none.length} without a photo. Report: ${reportFile}`);
  console.log('Kpopdle shows them after its next nightly refresh (00:05 UTC).');
  return { ready: ready.length, skipped: skipped.length, none: none.length, published };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(`\nStopped: ${e.message}`); process.exit(1); });
}
