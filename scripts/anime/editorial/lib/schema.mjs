// Run O1, lane E1a: the JSON Schema validator of the content checks (check C1), in plain JavaScript.
// It reads the same subset of draft 2020-12 as apps/quiz/scripts/o1/contract/json-schema.ts (the contract's
// validator, TypeScript, not importable from a plain node script) and gives the same answers; no dependency.
// Supported: $ref (<file>, <file>#/$defs/<name>, #/$defs/<name>), $defs, type, enum, const, properties, required,
// additionalProperties, items, minItems, maxItems, uniqueItems, contains, minLength, maxLength (code points),
// pattern (ECMAScript, u flag), minimum, maximum, minProperties, allOf, anyOf, oneOf, not, if, then, else.
//
// Beyond the contract validator: validate() takes an options object { unknownAsWarning } that moves the
// "unknown property" errors of additionalProperties:false to a separate list (used for the series data files,
// which extend the series fixture shape with fields such as official_url and wikidata_qid).

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolve(HERE, '../../../..');
/** Schemas of the lanes that are not part of the contract (lane PERS): the personality quiz of a series. Read whatever the contract folder is. */
export const EXTRA_SCHEMAS = [join(REPO_ROOT, 'scripts/anime/k1/personality.schema.json')];
export const CONTRACT_DIR = process.env.E1A_CONTRACT_DIR
  ? resolve(process.env.E1A_CONTRACT_DIR)
  : join(REPO_ROOT, 'docs/o1/contracts');

const isObj = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Loads every schemas/*.schema.json plus fixtures/series-fixture.schema.json into a registry keyed by file name. */
export function loadRegistry(contractDir = CONTRACT_DIR) {
  const registry = {};
  const dirs = [join(contractDir, 'schemas'), join(contractDir, 'fixtures')];
  for (const dir of dirs) {
    for (const name of readdirSync(dir)) {
      if (!name.endsWith('.schema.json')) continue;
      registry[name] = JSON.parse(readFileSync(join(dir, name), 'utf8'));
    }
  }
  for (const file of EXTRA_SCHEMAS) {
    const doc = JSON.parse(readFileSync(file, 'utf8'));
    registry[doc.$id] = doc;
  }
  extendFactSourceKinds(registry);
  return registry;
}

/** Owner decision D-105: "press" (Oricon, Anime News Network) is a source kind of a fact, kept in the files only. The contract
 * schema (docs/o1/contracts/schemas/fact.schema.json, owned by ORCH, see docs/o1/requests/K1.md) lists four kinds; the tools add
 * the fifth here so the contract file does not have to change before ORCH merges the request. */
export function extendFactSourceKinds(registry) {
  const kinds = registry['fact.schema.json']?.properties?.sources?.items?.properties?.source;
  if (kinds && Array.isArray(kinds.enum) && !kinds.enum.includes('press')) kinds.enum = [...kinds.enum, 'press'];
  return registry;
}

function resolveRef(ref, docId, registry) {
  const hash = ref.indexOf('#');
  const file = hash === -1 ? ref : ref.slice(0, hash);
  const pointer = hash === -1 ? '' : ref.slice(hash + 1);
  const doc = file === '' ? docId : file;
  let node = registry[doc];
  if (node === undefined) throw new Error(`unresolved $ref ${ref} (no document ${doc})`);
  if (pointer !== '') {
    if (!pointer.startsWith('/')) throw new Error(`unresolved $ref ${ref} (pointer must start with /)`);
    for (const part of pointer.slice(1).split('/')) {
      const key = part.replace(/~1/g, '/').replace(/~0/g, '~');
      node = isObj(node) ? node[key] : undefined;
      if (node === undefined) throw new Error(`unresolved $ref ${ref}`);
    }
  }
  if (typeof node !== 'boolean' && !isObj(node)) throw new Error(`unresolved $ref ${ref} (not a schema)`);
  return { doc, schema: node };
}

function typeOf(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  if (typeof v === 'number') return Number.isInteger(v) ? 'integer' : 'number';
  return typeof v;
}

const typeMatches = (want, v) => {
  const t = typeOf(v);
  return want === t || (want === 'number' && t === 'integer');
};

function canon(v) {
  if (Array.isArray(v)) return `[${v.map(canon).join(',')}]`;
  if (isObj(v)) return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canon(v[k])}`).join(',')}}`;
  return JSON.stringify(v);
}

const ptr = (path, key) => `${path}/${String(key).replace(/~/g, '~0').replace(/\//g, '~1')}`;
const regexCache = new Map();
const re = (pattern) => {
  let r = regexCache.get(pattern);
  if (!r) { r = new RegExp(pattern, 'u'); regexCache.set(pattern, r); }
  return r;
};

function check(schema, data, path, doc, reg, out, opts) {
  if (schema === true) return;
  if (schema === false) { out.push({ path, message: 'no value is allowed here' }); return; }
  const s = schema;
  if (typeof s.$ref === 'string') {
    const r = resolveRef(s.$ref, doc, reg);
    check(r.schema, data, path, r.doc, reg, out, opts);
  }
  if (s.type !== undefined) {
    const list = Array.isArray(s.type) ? s.type : [s.type];
    if (!list.some((t) => typeMatches(t, data))) { out.push({ path, message: `must be ${list.join(' or ')}, got ${typeOf(data)}` }); return; }
  }
  if (s.const !== undefined && canon(s.const) !== canon(data)) out.push({ path, message: `must equal ${JSON.stringify(s.const)}` });
  if (Array.isArray(s.enum) && !s.enum.some((e) => canon(e) === canon(data))) {
    out.push({ path, message: `must be one of ${s.enum.map((e) => JSON.stringify(e)).join(', ')}` });
  }
  if (typeof data === 'string') {
    const len = [...data].length;
    if (typeof s.minLength === 'number' && len < s.minLength) out.push({ path, message: `shorter than ${s.minLength}` });
    if (typeof s.maxLength === 'number' && len > s.maxLength) out.push({ path, message: `longer than ${s.maxLength}` });
    if (typeof s.pattern === 'string' && !re(s.pattern).test(data)) out.push({ path, message: `does not match ${s.pattern}` });
  }
  if (typeof data === 'number') {
    if (typeof s.minimum === 'number' && data < s.minimum) out.push({ path, message: `below ${s.minimum}` });
    if (typeof s.maximum === 'number' && data > s.maximum) out.push({ path, message: `above ${s.maximum}` });
  }
  if (Array.isArray(data)) {
    if (typeof s.minItems === 'number' && data.length < s.minItems) out.push({ path, message: `fewer than ${s.minItems} items` });
    if (typeof s.maxItems === 'number' && data.length > s.maxItems) out.push({ path, message: `more than ${s.maxItems} items` });
    if (s.uniqueItems === true) {
      const seen = new Set();
      data.forEach((d, i) => { const c = canon(d); if (seen.has(c)) out.push({ path: ptr(path, i), message: 'duplicate item' }); seen.add(c); });
    }
    if (s.items !== undefined) data.forEach((d, i) => check(s.items, d, ptr(path, i), doc, reg, out, opts));
    if (s.contains !== undefined && !data.some((d) => errorsOf(s.contains, d, path, doc, reg, opts).length === 0)) {
      out.push({ path, message: 'no item matches the contains rule' });
    }
  }
  if (isObj(data)) {
    const props = isObj(s.properties) ? s.properties : {};
    if (Array.isArray(s.required)) {
      for (const k of s.required) if (!(k in data)) out.push({ path, message: `missing ${k}` });
    }
    if (typeof s.minProperties === 'number' && Object.keys(data).length < s.minProperties) {
      out.push({ path, message: `fewer than ${s.minProperties} properties` });
    }
    for (const [k, v] of Object.entries(data)) {
      if (k in props) check(props[k], v, ptr(path, k), doc, reg, out, opts);
      else if (s.additionalProperties !== undefined) {
        if (s.additionalProperties === false) out.push({ path: ptr(path, k), message: 'unknown property', unknown: true });
        else check(s.additionalProperties, v, ptr(path, k), doc, reg, out, opts);
      }
    }
  }
  if (Array.isArray(s.allOf)) for (const sub of s.allOf) check(sub, data, path, doc, reg, out, opts);
  if (Array.isArray(s.anyOf) && !s.anyOf.some((sub) => errorsOf(sub, data, path, doc, reg, opts).length === 0)) {
    out.push({ path, message: 'matches none of anyOf' });
  }
  if (Array.isArray(s.oneOf)) {
    const results = s.oneOf.map((sub) => errorsOf(sub, data, path, doc, reg, opts));
    const ok = results.filter((r) => r.length === 0).length;
    if (ok !== 1) {
      const best = ok === 0 ? results.reduce((a, b) => (b.length < a.length ? b : a)) : [];
      out.push({ path, message: `matches ${ok} of oneOf (exactly 1 wanted)` }, ...best);
    }
  }
  if (s.not !== undefined && errorsOf(s.not, data, path, doc, reg, opts).length === 0) out.push({ path, message: 'matches the not rule' });
  if (s.if !== undefined) {
    const branch = errorsOf(s.if, data, path, doc, reg, opts).length === 0 ? s.then : s.else;
    if (branch !== undefined) check(branch, data, path, doc, reg, out, opts);
  }
}

function errorsOf(schema, data, path, doc, reg, opts) {
  const out = [];
  check(schema, data, path, doc, reg, out, opts);
  return out;
}

/**
 * Validates data against a document of the registry (`quiz-draft.schema.json`, or `<file>#/$defs/<name>`).
 * Returns { errors, warnings }: errors fail C1; with opts.unknownAsWarning an "unknown property" goes to warnings.
 * opts.dropRequired lists top level keys the schema requires but this kind of file does not carry (series files
 * have no quizzes).
 */
export function validate(docId, data, registry, opts = {}) {
  const base = resolveRef(docId, docId.split('#')[0], registry);
  let schema = base.schema;
  if (opts.dropRequired && isObj(schema) && Array.isArray(schema.required)) {
    schema = { ...schema, required: schema.required.filter((k) => !opts.dropRequired.includes(k)) };
  }
  const all = errorsOf(schema, data, '', base.doc, registry, opts);
  if (!opts.unknownAsWarning) return { errors: all.map(strip), warnings: [] };
  return { errors: all.filter((e) => !e.unknown).map(strip), warnings: all.filter((e) => e.unknown).map(strip) };
}

const strip = (e) => ({ path: e.path, message: e.message });
