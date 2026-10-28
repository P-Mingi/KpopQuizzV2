#!/usr/bin/env node
// Run O1 (ADM back): promotes the admin images of fandomverse.org/anime from o1-dev to production. Copies the files of the Storage bucket
// 'entity-images' and the rows of public.entity_images (docs/pending-migrations/multisite/018-entity-images.sql must be applied on
// the target first). Idempotent: a file whose sha256 equals the target's is skipped, rows are upserted on (site_id, kind, slug) and
// a row that is already identical is left alone. Nothing is ever deleted on the target (rows and files that exist only there are
// reported as kept).
//
//   node scripts/anime/images/promote.mjs              dry run (the default): prints the plan, writes nothing
//   node scripts/anime/images/promote.mjs --dry-run    the same, explicit
//   node scripts/anime/images/promote.mjs --apply      writes: files first, then rows (a row never points to a missing file)
//
// Credentials come from the environment of whoever runs it, at run time. There is no file of ours that holds them and the values are
// never printed (only the project refs):
//   target (production):  PROMOTE_TARGET_URL and PROMOTE_TARGET_SERVICE_KEY   (the owner types them into the shell: read -rs)
//   source (o1-dev):      PROMOTE_SOURCE_URL and PROMOTE_SOURCE_SERVICE_KEY, else NEXT_PUBLIC_SUPABASE_URL and
//                         SUPABASE_SERVICE_ROLE_KEY, which `scripts/o1/env.sh dev -- <command>` exports.
// Refuses when source and target are the same project. created_by is not copied (user ids differ between projects).

import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const SITE = 'anime';
export const BUCKET = 'entity-images';
/** The production project: it is a target here, never a source (the direction is o1-dev to production). */
const PROD_REF = 'rdkgouofytwfdpbxbzio';
const PATH_OK = /^[a-z0-9][a-z0-9/_.-]*\.webp$/;
const SLUG_OK = /^[a-z0-9][a-z0-9-]{0,59}(\/[a-z0-9][a-z0-9-]{0,59})?$/;
const FIELDS = ['path', 'width', 'height', 'focal_x', 'focal_y', 'source_url', 'author', 'license', 'license_note'];

export const path2x = (p) => p.replace(/\.webp$/, '-2x.webp');
const sha = (buf) => createHash('sha256').update(buf).digest('hex');
const keyOf = (r) => `${r.site_id}|${r.kind}|${r.slug}`;
const same = (a, b) => FIELDS.every((f) => (f.startsWith('focal') ? Number(a[f]) === Number(b[f]) : (a[f] ?? null) === (b[f] ?? null)));

/** The project ref of a Supabase URL (its first host label), or null. Used to refuse a same-project run; never a secret. */
export function refOf(url) {
  try { return new URL(url).hostname.split('.')[0] || null; } catch { return null; }
}

/** Refuses a run whose source and target are the same project (same host, or same ref). Throws. */
export function assertDifferentProjects(sourceUrl, targetUrl) {
  const s = (() => { try { return new URL(sourceUrl); } catch { return null; } })();
  const t = (() => { try { return new URL(targetUrl); } catch { return null; } })();
  if (!s || !t) throw new Error('source and target must both be Supabase project URLs');
  if (s.host.toLowerCase() === t.host.toLowerCase() || refOf(sourceUrl) === refOf(targetUrl)) {
    throw new Error('refused: the source and the target are the same project');
  }
}

/**
 * The plan: what a run would write. Reads both sides through the adapters (listRows, download); writes nothing.
 * An adapter is { ref, listRows(), download(path) -> Buffer|null, upload(path, buf), upsertRows(rows) }.
 */
export async function buildPlan(source, target, { onProgress = () => {} } = {}) {
  const srcRows = (await source.listRows()).filter((r) => r.site_id === SITE);
  const tgtRows = (await target.listRows()).filter((r) => r.site_id === SITE);
  const tgt = new Map(tgtRows.map((r) => [keyOf(r), r]));
  const plan = { rows: [], files: [], keptRows: 0, bytesToCopy: 0 };
  for (const r of srcRows) {
    if (!PATH_OK.test(r.path) || r.path.includes('..') || !SLUG_OK.test(r.slug) || (r.kind !== 'series' && r.kind !== 'character')) {
      throw new Error(`refused: a source row has an unsafe kind, slug or path (${r.kind} ${r.slug})`);
    }
    const t = tgt.get(keyOf(r));
    plan.rows.push({ row: r, action: !t ? 'insert' : same(r, t) ? 'identical' : 'update' });
    for (const p of [r.path, path2x(r.path)]) {
      const bytes = await source.download(p);
      if (!bytes) throw new Error(`refused: the source row ${r.kind} ${r.slug} points to a file that is not in the source bucket (${p})`);
      const there = await target.download(p);
      const action = !there ? 'copy' : sha(there) === sha(bytes) ? 'identical' : 'overwrite';
      plan.files.push({ path: p, action, bytes: bytes.length });
      if (action !== 'identical') plan.bytesToCopy += bytes.length;
      onProgress(plan.files.length);
    }
  }
  const srcKeys = new Set(srcRows.map(keyOf));
  plan.keptRows = tgtRows.filter((r) => !srcKeys.has(keyOf(r))).length;
  return plan;
}

const count = (list, action) => list.filter((x) => x.action === action).length;

/** The lines of a plan (counts only). */
export function describePlan(plan, { apply, sourceRef, targetRef }) {
  const mb = (plan.bytesToCopy / (1024 * 1024)).toFixed(2);
  return [
    `${apply ? 'APPLY' : 'DRY RUN'} promote entity-images: ${sourceRef ?? '?'} -> ${targetRef ?? '?'} (site ${SITE}, bucket ${BUCKET})`,
    `rows:  ${count(plan.rows, 'insert')} insert, ${count(plan.rows, 'update')} update, ${count(plan.rows, 'identical')} identical, ${plan.keptRows} only on the target (kept)`,
    `files: ${count(plan.files, 'copy')} copy, ${count(plan.files, 'overwrite')} overwrite, ${count(plan.files, 'identical')} identical (${mb} MB to write)`,
    apply ? 'writing files first, then rows' : 'nothing written. Run again with --apply to write.',
  ];
}

/** Writes a plan: the files first (copy and overwrite), then the rows (insert and update, upsert on site_id, kind, slug). */
export async function applyPlan(plan, source, target) {
  for (const f of plan.files) {
    if (f.action === 'identical') continue;
    const bytes = await source.download(f.path);
    if (!bytes) throw new Error(`the source file disappeared during the run (${f.path})`);
    await target.upload(f.path, bytes);
  }
  const rows = plan.rows.filter((x) => x.action !== 'identical').map(({ row }) => ({
    site_id: row.site_id, kind: row.kind, slug: row.slug, path: row.path, width: row.width, height: row.height,
    focal_x: row.focal_x, focal_y: row.focal_y, source_url: row.source_url, author: row.author, license: row.license,
    license_note: row.license_note ?? null, created_by: null, created_at: row.created_at, updated_at: row.updated_at,
  }));
  if (rows.length) await target.upsertRows(rows);
  return { files: plan.files.filter((f) => f.action !== 'identical').length, rows: rows.length };
}

/** The real adapter over supabase-js (service role). The key is held in the client only. */
export async function supabaseAdapter(url, key) {
  const { createClient } = await import('@supabase/supabase-js');
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return {
    ref: refOf(url),
    async listRows() {
      const out = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await db.from('entity_images').select('*').eq('site_id', SITE).order('id', { ascending: true }).range(from, from + 999);
        if (error) throw new Error(`cannot read public.entity_images on ${refOf(url)} (is 018-entity-images.sql applied?): ${error.message}`);
        out.push(...data);
        if (data.length < 1000) return out;
      }
    },
    async download(path) {
      const { data, error } = await db.storage.from(BUCKET).download(path);
      if (error || !data) return null;
      return Buffer.from(await data.arrayBuffer());
    },
    async upload(path, buf) {
      const { error } = await db.storage.from(BUCKET).upload(path, buf, { contentType: 'image/webp', cacheControl: '31536000', upsert: true });
      if (error) throw new Error(`cannot write ${path} on ${refOf(url)}: ${error.message}`);
    },
    async upsertRows(rows) {
      const { error } = await db.from('entity_images').upsert(rows, { onConflict: 'site_id,kind,slug' });
      if (error) throw new Error(`cannot write public.entity_images on ${refOf(url)}: ${error.message}`);
    },
  };
}

export function parseArgs(argv) {
  const flags = new Set(argv);
  const unknown = argv.filter((a) => a !== '--apply' && a !== '--dry-run');
  if (unknown.length) throw new Error(`unknown argument ${unknown[0]} (use --dry-run or --apply)`);
  if (flags.has('--apply') && flags.has('--dry-run')) throw new Error('--apply and --dry-run exclude each other');
  return { apply: flags.has('--apply') };
}

export async function main(argv, env, deps = {}) {
  const { apply } = parseArgs(argv);
  const sUrl = env.PROMOTE_SOURCE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
  const sKey = env.PROMOTE_SOURCE_SERVICE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  const tUrl = env.PROMOTE_TARGET_URL;
  const tKey = env.PROMOTE_TARGET_SERVICE_KEY;
  if (!sUrl || !sKey) throw new Error('source credentials missing: run through `scripts/o1/env.sh dev -- node ...` or set PROMOTE_SOURCE_URL and PROMOTE_SOURCE_SERVICE_KEY');
  if (!tUrl || !tKey) throw new Error('target credentials missing: set PROMOTE_TARGET_URL and PROMOTE_TARGET_SERVICE_KEY in your shell (read -rs); they are never read from a file');
  assertDifferentProjects(sUrl, tUrl);
  if (refOf(sUrl) === PROD_REF) throw new Error('refused: production is the target of this script, never the source');
  const make = deps.adapter ?? supabaseAdapter;
  const source = await make(sUrl, sKey);
  const target = await make(tUrl, tKey);
  const plan = await buildPlan(source, target);
  const out = describePlan(plan, { apply, sourceRef: refOf(sUrl), targetRef: refOf(tUrl) });
  if (apply) {
    const done = await applyPlan(plan, source, target);
    out.push(`done: ${done.files} file(s) and ${done.rows} row(s) written`);
  }
  return { plan, lines: out };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main(process.argv.slice(2), process.env).then(({ lines }) => { console.log(lines.join('\n')); }, (e) => { console.error(`promote: ${e.message}`); process.exit(e.message.startsWith('unknown argument') || e.message.includes('exclude each other') || e.message.includes('credentials missing') ? 2 : 1); });
}
