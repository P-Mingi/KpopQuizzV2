#!/usr/bin/env node
// Run O1 (ADM back): promotes the admin images of bunnyverse.org from o1-dev to production. Copies the files of the Storage bucket
// 'entity-images' and the rows of public.entity_images (018, 019, 022) and public.site_assets (022: banners, card images, icons,
// stickers). Docs/pending-migrations/multisite/018-entity-images.sql must be applied on the target first; the kpop kinds and the
// site assets need 019 and 022 there too (a dry run says what the target lacks). Idempotent: a file whose sha256 equals the target's is
// skipped, rows are upserted on their natural key and a row that is already identical is left alone. Nothing is ever deleted on the
// target (rows and files that exist only there are reported as kept).
//
//   node scripts/anime/images/promote.mjs                    dry run (the default): prints the plan, writes nothing
//   node scripts/anime/images/promote.mjs --dry-run          the same, explicit
//   node scripts/anime/images/promote.mjs --apply            writes: files first, then rows (a row never points to a missing file)
//   node scripts/anime/images/promote.mjs --apply --skip-unmapped
//                                                            the same, and a row that is unmapped, ambiguous or invalid is skipped
//                                                            and listed instead of stopping the run (without the flag --apply refuses)
//
// What is carried, per site and kind:
//   anime series, character    the slug is text (series slug, '<series slug>/<character slug>'): kept as it is, but it must exist in the target
//                              (groups, series, characters), else the row is unmapped (it would be an orphan).
//   kpop idol, group, agency   the slug is the numeric id of the row, and ids may differ between projects. Each row is mapped by a stable
//                              natural key: group = groups.slug, idol = (groups.slug of its group, idols.name), agency = agencies.name.
//                              No entity found in the target, or more than one on either side: the row is unmapped / ambiguous, never
//                              copied blind.
//   site_assets (all sites)    one row per version of a key. Natural key (key, created_at), which the copy preserves. A key or created_at that
//                              repeats on either side is ambiguous and refused. The live version of a key is the latest published one, so
//                              the plan lists the keys whose live version a run would change.
// Every row is checked against the SQL check rules client side BEFORE any file is copied. A row that breaks one is listed as invalid.
// Files of an entity row: the 1x file (path), the 2x file (path with -2x) and the 96 px thumbnail (thumb_path, '<hash>-96.webp'). Files of a
// site asset: path, mid_path, thumb_path.
//
// Credentials come from the environment of whoever runs it, at run time. There is no file of ours that holds them and the values are
// never printed (only the project refs):
//   target (production):  PROMOTE_TARGET_URL and PROMOTE_TARGET_SERVICE_KEY   (the owner types them into the shell: read -rs)
//   source (o1-dev):      PROMOTE_SOURCE_URL and PROMOTE_SOURCE_SERVICE_KEY, else NEXT_PUBLIC_SUPABASE_URL and
//                         SUPABASE_SERVICE_ROLE_KEY, which `scripts/o1/env.sh dev -- <command>` exports.
// Refuses when source and target are the same project, and when the source is production. created_by is not copied (user ids differ
// between projects).

import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const SITE = 'anime';
export const KPOP_SITE = 'kpop';
export const BUCKET = 'entity-images';
/** The production project: it is a target here, never a source (the direction is o1-dev to production). */
const PROD_REF = 'rdkgouofytwfdpbxbzio';
const PATH_OK = /^[a-z0-9][a-z0-9/_.-]*\.webp$/;
const SLUG_OK = /^[a-z0-9][a-z0-9-]{0,59}(\/[a-z0-9][a-z0-9-]{0,59})?$/;
const ID_SLUG_OK = /^[1-9][0-9]{0,18}$/;
const LICENSES = ['cc0', 'public_domain', 'cc_by', 'cc_by_sa', 'own_photo', 'licensed', 'other'];
const ANIME_KINDS = ['series', 'character'];
const KPOP_KINDS = ['idol', 'group', 'agency'];
const ASSET_TYPES = ['banner', 'card_image', 'icon', 'sticker'];
/** The columns 019 and 018 (CR-021) added: a target built before them cannot hold these values. */
const EXTRA_FIELDS = ['license_url', 'commons_file', 'license_verified', 'thumb_path'];
const FIELDS = ['path', 'width', 'height', 'focal_x', 'focal_y', 'source_url', 'author', 'license', 'license_note', ...EXTRA_FIELDS];
const ASSET_FIELDS = ['type', 'page', 'settings', 'path', 'mid_path', 'thumb_path', 'width', 'height', 'source_url', 'author', 'license', 'license_note', 'license_verified', 'published_at', 'retired_at'];
const LIST_CAP = 100;

export const path2x = (p) => p.replace(/\.webp$/, '-2x.webp');
const sha = (buf) => createHash('sha256').update(buf).digest('hex');
const keyOf = (r) => `${r.site_id}|${r.kind}|${r.slug}`;
const ts = (v) => (v == null ? null : Date.parse(v));
const sortKeys = (v) => (Array.isArray(v) ? v.map(sortKeys) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortKeys(v[k])])) : v);
const stable = (v) => JSON.stringify(sortKeys(v ?? null));
const fieldSame = (f, a, b) => {
  if (f.startsWith('focal')) return Number(a[f]) === Number(b[f]);
  if (f === 'license_verified') return Boolean(a[f]) === Boolean(b[f]);
  return (a[f] ?? null) === (b[f] ?? null);
};
const same = (a, b) => FIELDS.every((f) => fieldSame(f, a, b));
const assetSame = (a, b) => ASSET_FIELDS.every((f) => {
  if (f === 'settings') return stable(a[f]) === stable(b[f]);
  if (f === 'published_at' || f === 'retired_at') return ts(a[f]) === ts(b[f]);
  return fieldSame(f, a, b);
});
const nonDefault = (r, f) => (f === 'license_verified' ? Boolean(r[f]) : (r[f] ?? null) !== null);
const group = (list, keyFn) => { const m = new Map(); for (const x of list) { const k = keyFn(x); (m.get(k) ?? m.set(k, []).get(k)).push(x); } return m; };

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

// ---------------------------------------------------------------------------------------------------------------------------------
// Client-side copies of the SQL check rules (018 + 019 + 022). They run on the row as it will be written, before any file is copied.
// ---------------------------------------------------------------------------------------------------------------------------------

/** The problems of an entity_images row (value rules only; the shape of the kind, slug and paths is refused earlier). */
export function entityProblems(r, kind) {
  const p = [];
  const num = (v) => typeof v === 'number' || (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v)));
  if (!Number.isInteger(Number(r.width)) || !(Number(r.width) > 0)) p.push('width must be a positive integer');
  if (!Number.isInteger(Number(r.height)) || !(Number(r.height) > 0)) p.push('height must be a positive integer');
  for (const f of ['focal_x', 'focal_y']) if (!num(r[f]) || Number(r[f]) < 0 || Number(r[f]) > 100) p.push(`${f} must be between 0 and 100`);
  if (r.source_url != null) {
    if (!/^https?:\/\//.test(r.source_url) || r.source_url.length > 2000) p.push('source_url must start with http(s):// and hold 2000 characters at most');
    else if (KPOP_KINDS.includes(kind) && !/^https:\/\//.test(r.source_url)) p.push('source_url of an idol, group or agency picture must be https');
  }
  if (r.author != null && (r.author.trim().length < 1 || r.author.length > 200)) p.push('author must hold 1 to 200 characters');
  if (!LICENSES.includes(r.license)) p.push('license is not one of the allowed licences');
  if (r.license_note != null && r.license_note.length > 500) p.push('license_note holds more than 500 characters');
  if (r.license_url != null && (!/^https:\/\//.test(r.license_url) || r.license_url.length > 2000)) p.push('license_url must be https and hold 2000 characters at most');
  if (r.commons_file != null && (!/^File:/.test(r.commons_file) || r.commons_file.length > 300)) p.push('commons_file must start with File: and hold 300 characters at most');
  if (r.license === 'other' && (r.license_note == null || r.license_note.trim() === '')) p.push('license other needs a license_note');
  if ((r.license === 'cc_by' || r.license === 'cc_by_sa') && r.author == null) p.push('license cc_by and cc_by_sa need an author');
  if (r.license_verified && !r.thumb_path) p.push('a verified row needs its 96 px file (thumb_path)');
  if (ANIME_KINDS.includes(kind) && (kind === 'series') === r.slug.includes('/')) p.push(kind === 'series' ? 'a series slug has no /' : 'a character slug is <series>/<character>');
  return p;
}

/** The problems of a site_assets row (022's checks). */
export function assetProblems(r) {
  const p = [];
  if (r.width != null && !(Number(r.width) > 0)) p.push('width must be positive');
  if (r.height != null && !(Number(r.height) > 0)) p.push('height must be positive');
  if (!r.settings || typeof r.settings !== 'object' || Array.isArray(r.settings)) p.push('settings must be a JSON object');
  else if (JSON.stringify(r.settings).length > 8192) p.push('settings holds more than 8192 bytes');
  if (r.source_url != null && (!/^https:\/\//.test(r.source_url) || r.source_url.length > 2000)) p.push('source_url must be https and hold 2000 characters at most');
  if (r.author != null && (r.author.trim().length < 1 || r.author.length > 200)) p.push('author must hold 1 to 200 characters');
  if (r.license != null && !LICENSES.includes(r.license)) p.push('license is not one of the allowed licences');
  if (r.license_note != null && r.license_note.length > 500) p.push('license_note holds more than 500 characters');
  if (r.type !== 'icon' && r.path == null) p.push('only an icon may have no file');
  if (r.path == null && (r.mid_path != null || r.thumb_path != null || r.width != null || r.height != null)) p.push('a row with no file has no sizes or other files');
  if (r.path != null && (r.width == null || r.height == null)) p.push('a row with a file needs its width and height');
  if (r.path != null && (r.author == null || r.license == null || (r.source_url == null && r.license !== 'own_photo'))) p.push('a picture needs an author, a licence and a source page (own_photo needs no source page)');
  if (r.license === 'other' && (r.license_note == null || r.license_note.trim() === '')) p.push('license other needs a license_note');
  if (r.published_at != null && r.path != null && !r.license_verified) p.push('a published picture needs license_verified');
  if (!['banner', 'card_image'].includes(r.type) && r.license != null && !['own_photo', 'licensed'].includes(r.license)) p.push('an icon or a sticker is own_photo or licensed');
  return p;
}

const unsafe = (r) => new Error(`refused: a source row has an unsafe kind, slug or path (${r.kind} ${r.slug})`);

/** Which rows this script carries: 'anime' (series, character), 'kpop' (idol, group, agency), or null (ignored). Throws on an unsafe anime or kpop row. */
function classify(r) {
  const paths = [r.path, ...(r.thumb_path ? [r.thumb_path] : [])];
  const pathsOk = paths.every((x) => typeof x === 'string' && PATH_OK.test(x) && !x.includes('..'));
  if (r.site_id === SITE) {
    if (!pathsOk || !SLUG_OK.test(r.slug) || !ANIME_KINDS.includes(r.kind)) throw unsafe(r);
    return 'anime';
  }
  if (r.site_id === KPOP_SITE && KPOP_KINDS.includes(r.kind)) {
    if (!pathsOk || !ID_SLUG_OK.test(String(r.slug))) throw unsafe(r);
    return 'kpop';
  }
  return null;
}

// ---------------------------------------------------------------------------------------------------------------------------------
// Mapping of the entities of a row by a stable natural key
// ---------------------------------------------------------------------------------------------------------------------------------

/** Indexes of one side's entities. refs = { groups, series, characters, idols, agencies } as read by listRefs (agencies null when 022 is missing). */
function indexRefs(refs) {
  const groups = refs.groups ?? [];
  return {
    groupById: new Map(groups.map((g) => [String(g.id), g])),
    groupsBySlug: group(groups, (g) => `${g.site_id}|${g.slug}`),
    seriesIds: new Set((refs.series ?? []).map((s) => String(s.group_id))),
    charactersByKey: group(refs.characters ?? [], (c) => `${c.group_id}|${c.slug}`),
    idolById: new Map((refs.idols ?? []).map((i) => [String(i.id), i])),
    idolsByKey: group(refs.idols ?? [], (i) => `${i.group_id}|${i.name}`),
    agencyById: new Map((refs.agencies ?? []).map((a) => [String(a.id), a])),
    agenciesByName: group(refs.agencies ?? [], (a) => a.name),
  };
}

/**
 * The target slug of a source row, or a refusal. Returns { slug, label } or { unmapped: reason, label }.
 * anime: the slug is kept, but the series (and character) must exist in the target. kpop: by group slug, (group slug, idol name), agency name.
 */
function mapRow(r, S, T, tgtAgenciesReady) {
  if (r.site_id === SITE) {
    const [seriesSlug, charSlug] = r.slug.split('/');
    const label = r.slug;
    if (!T) return { slug: r.slug, label };
    const gs = T.groupsBySlug.get(`${SITE}|${seriesSlug}`) ?? [];
    if (gs.length > 1) return { unmapped: `ambiguous: ${gs.length} anime groups carry the slug ${seriesSlug} in the target`, label };
    if (gs.length === 0 || !T.seriesIds.has(String(gs[0].id))) return { unmapped: `the series ${seriesSlug} does not exist in the target (the row would be an orphan)`, label };
    if (r.kind === 'character') {
      const cs = T.charactersByKey.get(`${gs[0].id}|${charSlug}`) ?? [];
      if (cs.length === 0) return { unmapped: `the character ${charSlug} of ${seriesSlug} does not exist in the target (the row would be an orphan)`, label };
      if (cs.length > 1) return { unmapped: `ambiguous: ${cs.length} characters ${charSlug} in ${seriesSlug} in the target`, label };
    }
    return { slug: r.slug, label };
  }
  const id = String(r.slug);
  const lab = `${r.kind} #${id}`;
  if (!S || !T) return { unmapped: 'the entities of the source or the target could not be read', label: lab };
  if (!tgtAgenciesReady) return { unmapped: 'the target has no agencies or site_assets table (022 is not applied there)', label: lab };
  const one = (list, what, side) => {
    if (list.length > 1) return `ambiguous: ${list.length} ${what} match in the ${side}`;
    return null;
  };
  if (r.kind === 'group') {
    const sg = S.groupById.get(id);
    if (!sg || sg.site_id !== KPOP_SITE) return { unmapped: 'the source has no kpop group with this id (orphan row in the source)', label: lab };
    const label = `group ${sg.slug}`;
    const tg = T.groupsBySlug.get(`${KPOP_SITE}|${sg.slug}`) ?? [];
    const amb = one(tg, `kpop groups with the slug ${sg.slug}`, 'target');
    if (amb) return { unmapped: amb, label };
    if (!tg.length) return { unmapped: `no kpop group with the slug ${sg.slug} in the target`, label };
    return { slug: String(tg[0].id), label };
  }
  if (r.kind === 'idol') {
    const si = S.idolById.get(id);
    if (!si) return { unmapped: 'the source has no idol with this id (orphan row in the source)', label: lab };
    const sg = S.groupById.get(String(si.group_id));
    if (!sg || sg.site_id !== KPOP_SITE) return { unmapped: 'the group of the source idol is not a kpop group', label: `idol ${si.name}` };
    const label = `idol ${si.name} (${sg.slug})`;
    const srcDup = S.idolsByKey.get(`${si.group_id}|${si.name}`) ?? [];
    const sAmb = one(srcDup, `idols named ${si.name} in ${sg.slug}`, 'source');
    if (sAmb) return { unmapped: sAmb, label };
    const tgs = T.groupsBySlug.get(`${KPOP_SITE}|${sg.slug}`) ?? [];
    const gAmb = one(tgs, `kpop groups with the slug ${sg.slug}`, 'target');
    if (gAmb) return { unmapped: gAmb, label };
    if (!tgs.length) return { unmapped: `no kpop group with the slug ${sg.slug} in the target`, label };
    const ti = T.idolsByKey.get(`${tgs[0].id}|${si.name}`) ?? [];
    const iAmb = one(ti, `idols named ${si.name} in ${sg.slug}`, 'target');
    if (iAmb) return { unmapped: iAmb, label };
    if (!ti.length) return { unmapped: `no idol named ${si.name} in ${sg.slug} in the target`, label };
    return { slug: String(ti[0].id), label };
  }
  const sa = S.agencyById.get(id);
  if (!sa) return { unmapped: 'the source has no agency with this id (orphan row in the source)', label: lab };
  const label = `agency ${sa.name}`;
  const srcDup = S.agenciesByName.get(sa.name) ?? [];
  const sAmb = one(srcDup, `agencies named ${sa.name}`, 'source');
  if (sAmb) return { unmapped: sAmb, label };
  const ta = T.agenciesByName.get(sa.name) ?? [];
  const aAmb = one(ta, `agencies named ${sa.name}`, 'target');
  if (aAmb) return { unmapped: aAmb, label };
  if (!ta.length) return { unmapped: `no agency named ${sa.name} in the target`, label };
  return { slug: String(ta[0].id), label };
}

/** A readable name of a target-only row (names, never URLs). */
function labelTargetRow(r, T) {
  if (!T) return r.slug;
  if (r.kind === 'group') { const g = T.groupById.get(String(r.slug)); return g ? `group ${g.slug}` : `group #${r.slug}`; }
  if (r.kind === 'idol') { const i = T.idolById.get(String(r.slug)); const g = i && T.groupById.get(String(i.group_id)); return i ? `idol ${i.name}${g ? ` (${g.slug})` : ''}` : `idol #${r.slug}`; }
  if (r.kind === 'agency') { const a = T.agencyById.get(String(r.slug)); return a ? `agency ${a.name}` : `agency #${r.slug}`; }
  return r.slug;
}

// ---------------------------------------------------------------------------------------------------------------------------------
// Site assets: live version of a key
// ---------------------------------------------------------------------------------------------------------------------------------

/** The live row of each key: the latest published at or before now, never retired, a picture only when its licence is verified (site_assets_public). */
function liveOf(rows) {
  const now = Date.now();
  const best = new Map();
  for (const r of rows) {
    if (r.retired_at != null || r.published_at == null || ts(r.published_at) > now) continue;
    if (r.path != null && !r.license_verified) continue;
    const cur = best.get(r.key);
    if (!cur || ts(r.published_at) > ts(cur.published_at) || (ts(r.published_at) === ts(cur.published_at) && ts(r.created_at) > ts(cur.created_at))) best.set(r.key, r);
  }
  return best;
}
const liveName = (r) => (r ? (r.path ?? 'no file (icon)') : 'none');

// ---------------------------------------------------------------------------------------------------------------------------------
// The plan
// ---------------------------------------------------------------------------------------------------------------------------------

/**
 * The plan: what a run would write. Reads both sides through the adapters; writes nothing. An adapter is
 * { ref, listRows(), download(path) -> Buffer|null, upload(path, buf), upsertRows(rows) } and, for the full run,
 * { capabilities(), listRefs(), listAssets(), insertAssets(rows), updateAssets(rows) }. An adapter without them is a test double of the
 * anime-only flow: no existence check of the series, no kpop mapping, no assets.
 */
export async function buildPlan(source, target, { onProgress = () => {} } = {}) {
  const capsOf = async (a) => ({ extraColumns: true, agencies: true, assets: true, ...(a.capabilities ? await a.capabilities() : {}) });
  const sCaps = await capsOf(source);
  const tCaps = await capsOf(target);
  const writeExtra = tCaps.extraColumns !== false;
  const kpopReady = tCaps.agencies !== false && tCaps.assets !== false;

  const srcAll = await source.listRows();
  const tgtAll = await target.listRows();
  const S = source.listRefs ? indexRefs(await source.listRefs()) : null;
  const T = target.listRefs ? indexRefs(await target.listRefs()) : null;

  const plan = {
    rows: [], files: [], keptRows: 0, kept: [], unmapped: [], invalid: [], ignored: 0, bytesToCopy: 0, writeExtra, kpopReady,
    schemaNotes: [],
    assets: { available: false, rows: [], unmapped: [], invalid: [], kept: 0, liveChanges: [] },
  };
  if (!writeExtra) plan.schemaNotes.push('the target lacks license_url, commons_file, license_verified or thumb_path (018 of CR-021 or 019 is not applied there): rows that use them are invalid');
  if (!kpopReady) plan.schemaNotes.push('the target lacks agencies or site_assets (022 is not applied there): the kpop kinds and the site assets cannot be written');

  // 1. Entity rows: shape (throws on an unsafe row), mapping, value rules. Nothing is copied yet.
  const tgt = new Map(tgtAll.filter((r) => r.site_id === SITE || r.site_id === KPOP_SITE).map((r) => [keyOf(r), r]));
  const wanted = [];
  const seenTargets = new Map();
  const claimed = new Set();
  for (const r of srcAll) {
    const scope = classify(r);
    if (!scope) { plan.ignored += 1; continue; }
    const m = mapRow(r, S, T, kpopReady);
    const base = { site_id: r.site_id, kind: r.kind, slug: String(r.slug), label: m.label };
    if (m.unmapped) { plan.unmapped.push({ ...base, reason: m.unmapped }); continue; }
    const out = { ...r, slug: m.slug };
    const problems = entityProblems(out, r.kind);
    if (!writeExtra) for (const f of EXTRA_FIELDS) if (nonDefault(r, f)) problems.push(`the target has no column ${f} and the row uses it`);
    if (problems.length) { plan.invalid.push({ ...base, problems }); claimed.add(keyOf(out)); continue; }
    const tk = keyOf(out);
    if (seenTargets.has(tk)) {
      plan.unmapped.push({ ...base, reason: `ambiguous: this row and the source row ${seenTargets.get(tk)} map to the same target row` });
      continue;
    }
    seenTargets.set(tk, `${r.kind} #${r.slug}`);
    wanted.push({ row: out, source: r, label: m.label });
  }

  // 2. Files of the valid rows, then the row actions. A missing source file refuses the whole plan (before anything is written).
  const fileInfo = new Map();
  const addFile = async (p, what) => {
    if (fileInfo.has(p)) return;
    const bytes = await source.download(p);
    if (!bytes) throw new Error(`refused: the source row ${what} points to a file that is not in the source bucket (${p})`);
    const there = await target.download(p);
    const action = !there ? 'copy' : sha(there) === sha(bytes) ? 'identical' : 'overwrite';
    fileInfo.set(p, { path: p, action, bytes: bytes.length });
    plan.files.push(fileInfo.get(p));
    if (action !== 'identical') plan.bytesToCopy += bytes.length;
    onProgress(plan.files.length);
  };
  for (const w of wanted) {
    const t = tgt.get(keyOf(w.row));
    plan.rows.push({ row: w.row, label: w.label, action: !t ? 'insert' : same(w.row, t) ? 'identical' : 'update' });
    const what = `${w.source.kind} ${w.source.slug}`;
    for (const p of [w.row.path, path2x(w.row.path), ...(w.row.thumb_path ? [w.row.thumb_path] : [])]) await addFile(p, what);
  }
  const written = new Set([...claimed, ...wanted.map((w) => keyOf(w.row))]);
  for (const [k, t] of tgt) {
    if (written.has(k)) continue;
    // A target row is "only on the target" when no source row maps onto it (including a source row that could not be mapped: those are listed above).
    plan.kept.push({ site_id: t.site_id, kind: t.kind, slug: t.slug, label: labelTargetRow(t, T) });
  }
  plan.keptRows = plan.kept.length;

  // 3. Site assets.
  const srcAssets = source.listAssets ? await source.listAssets() : null;
  if (srcAssets) {
    const tgtAssets = (target.listAssets ? await target.listAssets() : null) ?? [];
    const a = plan.assets;
    a.available = true;
    const tByKey = group(tgtAssets, (r) => `${r.key}|${ts(r.created_at)}`);
    const sByKey = group(srcAssets, (r) => `${r.key}|${ts(r.created_at)}`);
    const matched = new Set();
    const merged = tgtAssets.map((r) => ({ ...r }));
    for (const r of srcAssets) {
      const label = `${r.key}${r.published_at ? '' : ' (draft)'} ${r.created_at}`;
      const base = { key: r.key, label };
      for (const f of [r.path, r.mid_path, r.thumb_path]) {
        if (f != null && (!PATH_OK.test(f) || f.includes('..'))) throw new Error(`refused: a source site asset has an unsafe path (${r.key})`);
      }
      if (!/^[a-z0-9][a-z0-9:/_-]{0,100}$/.test(r.key) || !ASSET_TYPES.includes(r.type) || !/^[a-z0-9][a-z0-9/-]{0,80}$/.test(r.page ?? '')) {
        a.invalid.push({ ...base, problems: ['key, type or page break its check'] });
        continue;
      }
      if (!kpopReady) { a.unmapped.push({ ...base, reason: 'the target has no site_assets table (022 is not applied there)' }); continue; }
      if (ts(r.created_at) == null) { a.invalid.push({ ...base, problems: ['created_at is missing'] }); continue; }
      const nk = `${r.key}|${ts(r.created_at)}`;
      if ((sByKey.get(nk) ?? []).length > 1) { a.unmapped.push({ ...base, reason: 'ambiguous: several source versions of this key share one created_at' }); continue; }
      const hits = tByKey.get(nk) ?? [];
      if (hits.length > 1) { a.unmapped.push({ ...base, reason: 'ambiguous: several target versions of this key share one created_at' }); continue; }
      const problems = assetProblems(r);
      if (problems.length) { a.invalid.push({ ...base, problems }); continue; }
      const t = hits[0] ?? null;
      const action = !t ? 'insert' : assetSame(r, t) ? 'identical' : 'update';
      a.rows.push({ row: r, label, action, id: t?.id ?? null });
      if (t) matched.add(t.id);
      const copy = { ...r, created_by: null };
      if (t) { const i = merged.findIndex((x) => x.id === t.id); if (i >= 0) merged[i] = { ...t, ...copy, id: t.id }; } else merged.push(copy);
      for (const [p, w] of [[r.path, 'path'], [r.mid_path, 'mid_path'], [r.thumb_path, 'thumb_path']]) if (p) await addFile(p, `site asset ${r.key} (${w})`);
    }
    a.kept = tgtAssets.filter((t) => !matched.has(t.id)).length;
    const before = liveOf(tgtAssets);
    const after = liveOf(merged);
    for (const [k, row] of after) {
      const was = before.get(k);
      if (!was || was.created_at !== row.created_at || was.path !== row.path) a.liveChanges.push({ key: k, from: liveName(was), to: liveName(row) });
    }
  } else if (source.listAssets) {
    plan.schemaNotes.push('the source has no site_assets table (022 is not applied there): no site asset is carried');
  }
  return plan;
}

const count = (list, action) => list.filter((x) => x.action === action).length;
/** Rows that stop --apply: unmapped, ambiguous or invalid, entity rows and site assets alike. */
export const blockedCount = (plan) => plan.unmapped.length + plan.invalid.length + plan.assets.unmapped.length + plan.assets.invalid.length;

function listLines(title, items, fmt) {
  if (!items.length) return [];
  const out = [`${title} (${items.length}):`];
  for (const x of items.slice(0, LIST_CAP)) out.push(`  ${fmt(x)}`);
  if (items.length > LIST_CAP) out.push(`  ... and ${items.length - LIST_CAP} more`);
  return out;
}

/** The lines of a plan: counts first (three lines), then the detail per site and kind, what is unmapped, invalid or only on the target. */
export function describePlan(plan, { apply, sourceRef, targetRef, skipUnmapped = false }) {
  const mb = (plan.bytesToCopy / (1024 * 1024)).toFixed(2);
  const lines = [
    `${apply ? 'APPLY' : 'DRY RUN'} promote entity-images: ${sourceRef ?? '?'} -> ${targetRef ?? '?'} (sites ${SITE} and ${KPOP_SITE}, bucket ${BUCKET})`,
    `rows:  ${count(plan.rows, 'insert')} insert, ${count(plan.rows, 'update')} update, ${count(plan.rows, 'identical')} identical, ${plan.keptRows} only on the target (kept)`,
    `files: ${count(plan.files, 'copy')} copy, ${count(plan.files, 'overwrite')} overwrite, ${count(plan.files, 'identical')} identical (${mb} MB to write)`,
  ];
  const kinds = new Map();
  const bump = (site, kind, k) => { const id = `${site} ${kind}`; const o = kinds.get(id) ?? { insert: 0, update: 0, identical: 0, kept: 0, unmapped: 0, invalid: 0 }; o[k] += 1; kinds.set(id, o); };
  for (const r of plan.rows) bump(r.row.site_id, r.row.kind, r.action);
  for (const r of plan.kept) bump(r.site_id, r.kind, 'kept');
  for (const r of plan.unmapped) bump(r.site_id, r.kind, 'unmapped');
  for (const r of plan.invalid) bump(r.site_id, r.kind, 'invalid');
  for (const [id, o] of [...kinds].sort((a, b) => a[0].localeCompare(b[0]))) {
    lines.push(`  ${id}: ${o.insert} insert, ${o.update} update, ${o.identical} identical, ${o.kept} only on the target, ${o.unmapped} unmapped, ${o.invalid} invalid`);
  }
  if (plan.ignored) lines.push(`  ${plan.ignored} source row(s) of other sites or kinds are not carried by this script`);
  const a = plan.assets;
  if (a.available) {
    lines.push(`assets: ${count(a.rows, 'insert')} insert, ${count(a.rows, 'update')} update, ${count(a.rows, 'identical')} identical, ${a.kept} only on the target (kept), ${a.unmapped.length} unmapped, ${a.invalid.length} invalid`);
  }
  for (const n of plan.schemaNotes) lines.push(`schema: ${n}`);
  lines.push(...listLines('unmapped rows (not copied)', plan.unmapped, (x) => `${x.site_id} ${x.kind} ${x.label}: ${x.reason}`));
  lines.push(...listLines('invalid rows (not copied)', plan.invalid, (x) => `${x.site_id} ${x.kind} ${x.label}: ${x.problems.join('; ')}`));
  lines.push(...listLines('unmapped site assets (not copied)', a.unmapped, (x) => `${x.label}: ${x.reason}`));
  lines.push(...listLines('invalid site assets (not copied)', a.invalid, (x) => `${x.label}: ${x.problems.join('; ')}`));
  lines.push(...listLines('only on the target (kept, never deleted)', plan.kept, (x) => `${x.site_id} ${x.kind} ${x.label}`));
  lines.push(...listLines('site asset keys whose live version changes', a.liveChanges, (x) => `${x.key}: ${x.from} -> ${x.to}`));
  const blocked = blockedCount(plan);
  if (blocked && !skipUnmapped) lines.push(`BLOCKED: ${blocked} row(s) are unmapped, ambiguous or invalid. --apply refuses until they are fixed, or add --skip-unmapped to skip them and list them.`);
  if (blocked && skipUnmapped) lines.push(`${blocked} row(s) are unmapped, ambiguous or invalid and would be skipped (--skip-unmapped).`);
  lines.push(apply ? 'writing files first, then rows' : 'nothing written. Run again with --apply to write.');
  return lines;
}

const entityRow = (row, extra) => ({
  site_id: row.site_id, kind: row.kind, slug: row.slug, path: row.path, width: row.width, height: row.height,
  focal_x: row.focal_x, focal_y: row.focal_y, source_url: row.source_url, author: row.author, license: row.license,
  license_note: row.license_note ?? null, created_by: null, created_at: row.created_at, updated_at: row.updated_at,
  ...(extra ? { license_url: row.license_url ?? null, commons_file: row.commons_file ?? null, license_verified: Boolean(row.license_verified), thumb_path: row.thumb_path ?? null } : {}),
});
const assetRow = (row) => ({
  key: row.key, type: row.type, page: row.page, settings: row.settings, path: row.path ?? null, mid_path: row.mid_path ?? null,
  thumb_path: row.thumb_path ?? null, width: row.width ?? null, height: row.height ?? null, source_url: row.source_url ?? null,
  author: row.author ?? null, license: row.license ?? null, license_note: row.license_note ?? null, license_verified: Boolean(row.license_verified),
  published_at: row.published_at ?? null, retired_at: row.retired_at ?? null, created_by: null, created_at: row.created_at, updated_at: row.updated_at,
});

/**
 * Writes a plan: the files first (copy and overwrite), then the entity rows (upsert on site_id, kind, slug), then the site assets (insert,
 * or update of the matched target row). Refuses a plan that has unmapped or invalid rows unless skipUnmapped is set. Returns the counts and what was skipped.
 */
export async function applyPlan(plan, source, target, { skipUnmapped = false } = {}) {
  const blocked = blockedCount(plan);
  if (blocked && !skipUnmapped) throw new Error(`refused: ${blocked} row(s) are unmapped, ambiguous or invalid (run the dry run to list them, or pass --skip-unmapped to skip them)`);
  for (const f of plan.files) {
    if (f.action === 'identical') continue;
    const bytes = await source.download(f.path);
    if (!bytes) throw new Error(`the source file disappeared during the run (${f.path})`);
    await target.upload(f.path, bytes);
  }
  const rows = plan.rows.filter((x) => x.action !== 'identical').map(({ row }) => entityRow(row, plan.writeExtra !== false));
  if (rows.length) await target.upsertRows(rows);
  const inserts = plan.assets.rows.filter((x) => x.action === 'insert').map((x) => assetRow(x.row));
  const updates = plan.assets.rows.filter((x) => x.action === 'update').map((x) => ({ id: x.id, ...assetRow(x.row) }));
  if (inserts.length) await target.insertAssets(inserts);
  if (updates.length) await target.updateAssets(updates);
  const skipped = [
    ...plan.unmapped.map((x) => `${x.site_id} ${x.kind} ${x.label}: ${x.reason}`),
    ...plan.invalid.map((x) => `${x.site_id} ${x.kind} ${x.label}: ${x.problems.join('; ')}`),
    ...plan.assets.unmapped.map((x) => `site asset ${x.label}: ${x.reason}`),
    ...plan.assets.invalid.map((x) => `site asset ${x.label}: ${x.problems.join('; ')}`),
  ];
  // assets and skipped appear only when non-empty, so an anime-only run keeps the { files, rows } shape.
  const assets = inserts.length + updates.length;
  return { files: plan.files.filter((f) => f.action !== 'identical').length, rows: rows.length, ...(assets ? { assets } : {}), ...(skipped.length ? { skipped } : {}) };
}

const isMissingTable = (e) => e && (e.code === '42P01' || e.code === 'PGRST205' || /does not exist|schema cache/i.test(e.message ?? ''));

/** The real adapter over supabase-js (service role). The key is held in the client only. */
export async function supabaseAdapter(url, key) {
  const { createClient } = await import('@supabase/supabase-js');
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const ref = refOf(url);
  /** All rows of a table, paged by 1000 (the PostgREST cap). Returns null when the table does not exist and allowMissing is set. */
  async function all(table, cols, order, { allowMissing = false } = {}) {
    const out = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await db.from(table).select(cols).order(order, { ascending: true }).range(from, from + 999);
      if (error) {
        if (allowMissing && isMissingTable(error)) return null;
        throw new Error(`cannot read public.${table} on ${ref}${table === 'entity_images' ? ' (is 018-entity-images.sql applied?)' : ''}: ${error.message}`);
      }
      out.push(...data);
      if (data.length < 1000) return out;
    }
  }
  const probe = async (table, cols) => !(await db.from(table).select(cols).limit(0)).error;
  return {
    ref,
    async capabilities() {
      return {
        extraColumns: await probe('entity_images', EXTRA_FIELDS.join(',')),
        agencies: await probe('agencies', 'id'),
        assets: await probe('site_assets', 'id'),
      };
    },
    async listRows() { return all('entity_images', '*', 'id'); },
    async listRefs() {
      return {
        groups: await all('groups', 'id, slug, name, site_id', 'id'),
        series: await all('series', 'group_id', 'group_id', { allowMissing: true }),
        characters: await all('characters', 'id, group_id, slug', 'id', { allowMissing: true }),
        idols: await all('idols', 'id, group_id, name', 'id'),
        agencies: await all('agencies', 'id, slug, name', 'id', { allowMissing: true }),
      };
    },
    async listAssets() { return all('site_assets', '*', 'id', { allowMissing: true }); },
    async download(path) {
      const { data, error } = await db.storage.from(BUCKET).download(path);
      if (error || !data) return null;
      return Buffer.from(await data.arrayBuffer());
    },
    async upload(path, buf) {
      const { error } = await db.storage.from(BUCKET).upload(path, buf, { contentType: 'image/webp', cacheControl: '31536000', upsert: true });
      if (error) throw new Error(`cannot write ${path} on ${ref}: ${error.message}`);
    },
    async upsertRows(rows) {
      for (let i = 0; i < rows.length; i += 200) {
        const { error } = await db.from('entity_images').upsert(rows.slice(i, i + 200), { onConflict: 'site_id,kind,slug' });
        if (error) throw new Error(`cannot write public.entity_images on ${ref}: ${error.message}`);
      }
    },
    async insertAssets(rows) {
      for (let i = 0; i < rows.length; i += 200) {
        const { error } = await db.from('site_assets').insert(rows.slice(i, i + 200));
        if (error) throw new Error(`cannot write public.site_assets on ${ref}: ${error.message}`);
      }
    },
    async updateAssets(rows) {
      // id is a GENERATED ALWAYS identity column, so an upsert that names it is refused: one update per row.
      for (const { id, ...fields } of rows) {
        const { error } = await db.from('site_assets').update(fields).eq('id', id);
        if (error) throw new Error(`cannot update public.site_assets on ${ref}: ${error.message}`);
      }
    },
  };
}

export function parseArgs(argv) {
  const flags = new Set(argv);
  const unknown = argv.filter((a) => a !== '--apply' && a !== '--dry-run' && a !== '--skip-unmapped');
  if (unknown.length) throw new Error(`unknown argument ${unknown[0]} (use --dry-run, --apply or --skip-unmapped)`);
  if (flags.has('--apply') && flags.has('--dry-run')) throw new Error('--apply and --dry-run exclude each other');
  return { apply: flags.has('--apply'), ...(flags.has('--skip-unmapped') ? { skipUnmapped: true } : {}) };
}

export async function main(argv, env, deps = {}) {
  const { apply, skipUnmapped = false } = parseArgs(argv);
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
  const out = describePlan(plan, { apply, sourceRef: refOf(sUrl), targetRef: refOf(tUrl), skipUnmapped });
  if (apply) {
    if (blockedCount(plan) && !skipUnmapped) {
      const e = new Error(`refused: ${blockedCount(plan)} row(s) are unmapped, ambiguous or invalid; nothing was written`);
      e.lines = out;
      throw e;
    }
    const done = await applyPlan(plan, source, target, { skipUnmapped });
    out.push(`done: ${done.files} file(s), ${done.rows} row(s) and ${done.assets ?? 0} site asset(s) written`);
    if (done.skipped) out.push(...listLines('skipped (not written)', done.skipped, (x) => x));
  }
  return { plan, lines: out };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main(process.argv.slice(2), process.env).then(({ lines }) => { console.log(lines.join('\n')); }, (e) => {
    if (e.lines) console.error(e.lines.join('\n'));
    console.error(`promote: ${e.message}`);
    process.exit(e.message.startsWith('unknown argument') || e.message.includes('exclude each other') || e.message.includes('credentials missing') ? 2 : 1);
  });
}
