// Run O1, lane E1a: finds the files, tells their kind, normalizes the facts files and builds the context the
// checks run in (the facts of the same series, the series data, the whole corpus, the inspiration titles).
//
// Kinds (formats.md and the brief of lot f):
//   series  docs/anime/data/series/<slug>.json            the series fixture shape without quizzes
//   facts   docs/anime/data/facts/<slug>.json             facts of C/schemas/fact.schema.json plus the source excerpts
//   quiz    docs/anime/data/quizzes/<slug>/<quiz>.json    a quiz draft (one entry or an array)
//   daily   docs/anime/data/daily/<batch>.json            daily bank rows (an array, or one row)
//
// The contract leaves the facts file layout open. This loader reads: an array of facts, an object { slug?, facts: [...],
// excerpts?: { <fact id>: text } }, or an object keyed by fact id. A fact may carry the source text it rests on as
// excerpt, source_excerpt, source_text, excerpts or source_excerpts (a string or a list), or inside a source entry;
// fact_id is read as id, spoiler_arc and spoiler_scope as spoiler, revision_id as the Wikipedia ref. Each such
// reading is reported as a C1 warning, so the lanes can move to the canonical names.

import { existsSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { basename, join, relative, resolve, sep } from 'node:path';
import { REPO_ROOT, loadRegistry } from './schema.mjs';
import { THRESHOLDS } from './thresholds.mjs';
import { hostOf } from './text.mjs';

export const KINDS = ['series', 'facts', 'quiz', 'daily'];
const DIR_KIND = { series: 'series', facts: 'facts', quizzes: 'quiz', daily: 'daily' };
const EXCERPT_KEYS = ['excerpt', 'source_excerpt', 'source_text', 'excerpts', 'source_excerpts'];
const REVISION_KEYS = ['revision_id', 'revision', 'revid', 'rev_id', 'oldid'];

const isObj = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
export const DEFAULT_DATA_DIR = join(REPO_ROOT, 'docs/anime/data');
export const DEFAULT_INSPIRATION = join(REPO_ROOT, 'scripts/anime/editorial/data/inspiration-titles.json');

export function readJson(path) {
  try {
    const text = readFileSync(path, 'utf8').replace(/^\u{feff}/u, '');
    return { data: JSON.parse(text) };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

/** Every .json file under the given files and folders, sorted. Explicit files are marked. */
export function collectFiles(paths) {
  const out = new Map();
  const walk = (p, explicit) => {
    const st = statSync(p);
    if (st.isDirectory()) {
      for (const name of readdirSync(p).sort()) {
        // A withdrawn quiz or daily row (owner, 2026-10-24) is kept for the record, never checked nor compared (C9) with the live corpus.
        if (name.startsWith('.') || name === 'node_modules' || name === 'withdrawn') continue;
        walk(join(p, name), false);
      }
    } else if (p.endsWith('.json')) {
      const key = realpathSync(p);
      if (!out.has(key)) out.set(key, { path: resolve(p), explicit });
    }
  };
  for (const p of paths) {
    if (!existsSync(p)) throw new Error(`no such file or folder: ${p}`);
    walk(p, true);
  }
  return [...out.values()].sort((a, b) => a.path.localeCompare(b.path));
}

export const relPath = (p) => {
  const r = relative(REPO_ROOT, p);
  return r.startsWith('..') ? p : r.split(sep).join('/');
};

function dirParts(file) {
  return relPath(file).split('/').slice(0, -1);
}

/** The data folder a file sits in (the one holding series, facts, quizzes and daily), or null. */
export function inferDataDir(file) {
  const parts = resolve(file).split(sep);
  for (let i = parts.length - 2; i >= 1; i -= 1) {
    if (parts[i] === 'data' && DIR_KIND[parts[i + 1]]) return parts.slice(0, i + 1).join(sep) || sep;
  }
  return null;
}

export function detectKind(file, data) {
  const dirs = dirParts(file);
  for (let i = dirs.length - 1; i >= 0; i -= 1) if (DIR_KIND[dirs[i]]) return DIR_KIND[dirs[i]];
  const first = Array.isArray(data) ? data[0] : data;
  if (!isObj(first)) return null;
  if (isObj(first.group) && isObj(first.series) && Array.isArray(first.arcs)) return 'series';
  if ('account' in first && Array.isArray(first.questions)) return 'quiz';
  if (Array.isArray(first.questions) && 'category' in first) return 'daily';
  if (Array.isArray(first.facts) || (isObj(first.entity) && 'sources' in first && 'value' in first)) return 'facts';
  if (!Array.isArray(data) && Object.values(data).length > 0 && Object.values(data).every((v) => isObj(v) && 'sources' in v)) return 'facts';
  return null;
}

const asList = (v) => (Array.isArray(v) ? v : v === undefined || v === null ? [] : [v]).filter((s) => typeof s === 'string' && s.trim() !== '');

/** One raw fact to the clean fact the schema validates, its excerpts, and the aliases that were read. */
function cleanFact(raw, keyId) {
  const aliases = [];
  const f = {};
  const excerpts = [];
  if (!isObj(raw)) return { fact: raw, excerpts, aliases };
  for (const [k, v] of Object.entries(raw)) {
    if (k === 'fact_id') { aliases.push('fact_id read as id'); if (!('id' in raw)) f.id = v; continue; }
    if (EXCERPT_KEYS.includes(k)) { excerpts.push(...asList(v)); continue; }
    if (k === 'spoiler_arc' || k === 'spoiler_scope') continue;
    if (k === '$comment') continue;
    if (k === 'sources' && Array.isArray(v)) {
      f.sources = v.map((s) => {
        if (!isObj(s)) return s;
        const c = {};
        for (const [sk, sv] of Object.entries(s)) {
          if (EXCERPT_KEYS.includes(sk)) { excerpts.push(...asList(sv)); continue; }
          if (REVISION_KEYS.includes(sk)) { aliases.push(`${sk} read as ref`); if (!('ref' in s)) c.ref = String(sv); continue; }
          c[sk] = sk === 'ref' && typeof sv === 'number' ? String(sv) : sv;
        }
        if (!('source' in c) && typeof c.url === 'string') {
          const h = hostOf(c.url);
          const kind = h.endsWith('wikipedia.org') ? 'wikipedia' : h.endsWith('wikidata.org') ? 'wikidata' : h.endsWith('musicbrainz.org') ? 'musicbrainz' : (h.endsWith('oricon.co.jp') || h.endsWith('animenewsnetwork.com')) ? 'press' : 'official';
          aliases.push('source kind read from the host');
          c.source = kind;
        }
        return c;
      });
      continue;
    }
    f[k] = v;
  }
  if (!('id' in f) && keyId) f.id = keyId;
  if (!('spoiler' in f) && ('spoiler_arc' in raw || 'spoiler_scope' in raw)) {
    aliases.push('spoiler_arc and spoiler_scope read as spoiler');
    f.spoiler = { arc: raw.spoiler_arc, scope: raw.spoiler_scope };
  }
  return { fact: f, excerpts, aliases };
}

/** A facts file in any of the accepted layouts: { slug, facts: [{ fact, excerpts, aliases }], problems }. */
export function normalizeFactsFile(raw, file) {
  const problems = [];
  let list = null;
  let wrapper = {};
  let keyed = false;
  if (Array.isArray(raw)) list = raw.map((r) => [r, null]);
  else if (isObj(raw) && Array.isArray(raw.facts)) { list = raw.facts.map((r) => [r, null]); wrapper = raw; }
  else if (isObj(raw) && Object.values(raw).length > 0 && Object.values(raw).every((v) => isObj(v) && 'sources' in v)) {
    list = Object.entries(raw).map(([k, v]) => [v, k]); keyed = true;
  } else problems.push('not an array of facts, an object with a facts array, or an object keyed by fact id');
  const byId = isObj(wrapper.excerpts) ? wrapper.excerpts : isObj(wrapper.source_text) ? wrapper.source_text : {};
  const facts = (list ?? []).map(([r, keyId], index) => {
    const c = cleanFact(r, keyId);
    const fid = isObj(c.fact) ? c.fact.id : undefined;
    if (fid !== undefined && byId[fid] !== undefined) c.excerpts.push(...asList(byId[fid]));
    if (keyed) c.aliases.push('object keyed by fact id');
    return { ...c, index };
  });
  const dirName = basename(file, '.json');
  const slug = typeof wrapper.slug === 'string' ? wrapper.slug : dirParts(file).includes('facts') ? dirName : (facts[0]?.fact?.entity?.group_slug ?? dirName);
  return { slug, facts, problems };
}

/** The entries (items) of a data file by kind. */
export function expandItems(file, kind, data) {
  const rel = relPath(file);
  const mk = (entry, index, many) => ({ kind, file: rel, abs: file, index: many ? index : null, ref: many ? `${rel}:${index + 1}` : rel, data: entry });
  if (kind === 'series') return [mk(data, 0, false)];
  if (kind === 'facts') return [mk(data, 0, false)];
  let list = [data];
  let many = false;
  if (Array.isArray(data)) { list = data; many = true; }
  else if (isObj(data) && Array.isArray(data.quizzes)) { list = data.quizzes; many = true; }
  else if (isObj(data) && Array.isArray(data.rows)) { list = data.rows; many = true; }
  return list.map((e, i) => mk(e, i, many));
}

export function itemSlug(item) {
  const d = item.data;
  if (item.kind === 'series') return d?.group?.slug ?? null;
  if (item.kind === 'facts') return d?.slug ?? null;
  return d?.group_slug ?? null;
}

export function itemTitle(item) {
  const d = item.data;
  if (item.kind === 'series') return d?.series?.title_en ?? d?.group?.name ?? basename(item.file);
  if (item.kind === 'facts') return `Facts of ${d?.slug ?? basename(item.file, '.json')}`;
  return typeof d?.title === 'string' ? d.title : basename(item.file);
}

export function loadInspiration(path) {
  if (!path || !existsSync(path)) return [];
  const r = readJson(path);
  if (r.error || !r.data) return [];
  const list = Array.isArray(r.data) ? r.data : Array.isArray(r.data.titles) ? r.data.titles : [];
  return list.map((t) => (typeof t === 'string' ? t : t?.title)).filter((t) => typeof t === 'string' && t.trim() !== '');
}

/**
 * Builds the context of a run: every file of the data folder plus the targets, parsed once.
 * options: { dataDir, inspiration, allowDraftFacts, now, contractDir }
 */
export function buildContext(targets, options = {}) {
  const dataDir = options.dataDir ? resolve(options.dataDir) : (targets.map((t) => inferDataDir(t.path)).find(Boolean) ?? DEFAULT_DATA_DIR);
  const registry = loadRegistry(options.contractDir);
  const files = new Map();
  const add = (p, explicit) => {
    const key = realpathSync(p);
    if (files.has(key)) { if (explicit) files.get(key).explicit = true; return; }
    const r = readJson(p);
    const kind = r.error ? null : detectKind(resolve(p), r.data);
    files.set(key, { path: resolve(p), explicit, parseError: r.error ?? null, data: r.data, kind });
  };
  if (existsSync(dataDir)) for (const f of collectFiles([dataDir])) add(f.path, false);
  for (const t of targets) add(t.path, true);

  const series = new Map();
  const facts = new Map();
  const factIndex = new Map();
  const corpus = [];
  const officialHosts = new Set();
  for (const f of [...files.values()].sort((a, b) => a.path.localeCompare(b.path))) {
    if (f.parseError || !f.kind) continue;
    if (f.kind === 'series' && isObj(f.data) && isObj(f.data.group)) {
      const slug = f.data.group.slug;
      if (typeof slug === 'string' && !series.has(slug)) series.set(slug, { slug, data: f.data, file: relPath(f.path) });
      const u = f.data.series?.official_url;
      if (typeof u === 'string') officialHosts.add(hostOf(u));
    } else if (f.kind === 'facts') {
      const nf = normalizeFactsFile(f.data, f.path);
      const entry = { ...nf, file: relPath(f.path) };
      if (!facts.has(nf.slug)) facts.set(nf.slug, entry);
      for (const x of nf.facts) {
        const id = x.fact?.id;
        if (typeof id === 'string') {
          if (!factIndex.has(id)) factIndex.set(id, []);
          factIndex.get(id).push({ fact: x.fact, excerpts: x.excerpts, slug: nf.slug, file: entry.file, index: x.index });
        }
        for (const s of Array.isArray(x.fact?.sources) ? x.fact.sources : []) {
          if (isObj(s) && s.source === 'official' && typeof s.url === 'string') officialHosts.add(hostOf(s.url));
        }
      }
    } else if (f.kind === 'quiz' || f.kind === 'daily') {
      for (const it of expandItems(f.path, f.kind, f.data)) corpus.push(it);
    }
  }
  return {
    thresholds: { ...THRESHOLDS, ...(options.thresholds ?? {}) },
    registry,
    dataDir,
    now: options.now ?? new Date().toISOString(),
    allowDraftFacts: Boolean(options.allowDraftFacts),
    inspiration: loadInspiration(options.inspiration ?? DEFAULT_INSPIRATION),
    files,
    series,
    facts,
    factIndex,
    corpus,
    officialHosts,
  };
}
