// Run O1 contract o1-contract-v1: the validator of the content formats (docs/o1/contracts/formats.md, JSON Schemas
// in docs/o1/contracts/schemas/). It reads the subset of JSON Schema draft 2020-12 those files use and nothing more,
// so no dependency is needed (rule 14): a schema with any other keyword is refused by `unknownKeywords`, which the
// contract test runs on every schema file. E1's check C1 and the lanes' own tests import `validate` from here.
// Pure: no file, process or network access (the caller loads the files into a registry keyed by file name).
//
// Supported: $schema, $id, $ref (`<file>`, `<file>#/$defs/<name>`, `#/$defs/<name>`), $defs, $comment, title,
// description, examples, type, enum, const, properties, required, additionalProperties, items, minItems, maxItems,
// uniqueItems, contains, minLength, maxLength (in code points), pattern (ECMAScript, `u` flag), minimum, maximum,
// minProperties, allOf, anyOf, oneOf, not, if, then, else.

export type JsonSchema = boolean | { readonly [keyword: string]: unknown };
export type SchemaRegistry = Readonly<Record<string, JsonSchema>>;

export interface SchemaError {
  /** JSON pointer of the value in the data (`` for the root). */
  readonly path: string;
  readonly message: string;
}

export const SUPPORTED_KEYWORDS: ReadonlySet<string> = new Set([
  '$schema', '$id', '$ref', '$defs', '$comment', 'title', 'description', 'examples',
  'type', 'enum', 'const', 'properties', 'required', 'additionalProperties', 'items', 'minItems', 'maxItems',
  'uniqueItems', 'contains', 'minLength', 'maxLength', 'pattern', 'minimum', 'maximum', 'minProperties',
  'allOf', 'anyOf', 'oneOf', 'not', 'if', 'then', 'else',
]);

const SCHEMA_MAPS = ['properties', '$defs'] as const;
const SCHEMA_LISTS = ['allOf', 'anyOf', 'oneOf'] as const;
const SCHEMA_ONE = ['items', 'contains', 'not', 'if', 'then', 'else', 'additionalProperties'] as const;
const TYPES = new Set(['object', 'array', 'string', 'number', 'integer', 'boolean', 'null']);

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Keywords outside the supported subset, and malformed `type` or `pattern` values, with their schema pointer. */
export function unknownKeywords(schema: JsonSchema, at = '#'): string[] {
  if (typeof schema === 'boolean') return [];
  const out: string[] = [];
  for (const [k, v] of Object.entries(schema)) {
    if (!SUPPORTED_KEYWORDS.has(k)) { out.push(`${at}/${k}`); continue; }
    if (k === 'type') {
      const list = Array.isArray(v) ? v : [v];
      if (list.length === 0 || !list.every((t) => typeof t === 'string' && TYPES.has(t))) out.push(`${at}/type (bad value)`);
    }
    if (k === 'pattern') {
      try { new RegExp(String(v), 'u'); } catch { out.push(`${at}/pattern (does not compile)`); }
    }
  }
  for (const k of SCHEMA_MAPS) {
    const m = schema[k];
    if (isObj(m)) for (const [name, sub] of Object.entries(m)) out.push(...unknownKeywords(sub as JsonSchema, `${at}/${k}/${name}`));
  }
  for (const k of SCHEMA_LISTS) {
    const l = schema[k];
    if (Array.isArray(l)) l.forEach((sub, i) => out.push(...unknownKeywords(sub as JsonSchema, `${at}/${k}/${i}`)));
  }
  for (const k of SCHEMA_ONE) {
    const sub = schema[k];
    if (typeof sub === 'boolean' || isObj(sub)) out.push(...unknownKeywords(sub as JsonSchema, `${at}/${k}`));
  }
  return out;
}

/** Every `$ref` of a schema that does not resolve in the registry (`<doc>: <ref>`). */
export function unresolvedRefs(docId: string, registry: SchemaRegistry): string[] {
  const out: string[] = [];
  const walk = (s: unknown): void => {
    if (Array.isArray(s)) { s.forEach(walk); return; }
    if (!isObj(s)) return;
    if (typeof s.$ref === 'string') {
      try { resolveRef(s.$ref, docId, registry); } catch (e) { out.push(`${docId}: ${(e as Error).message}`); }
    }
    for (const v of Object.values(s)) walk(v);
  };
  walk(registry[docId]);
  return out;
}

function resolveRef(ref: string, docId: string, registry: SchemaRegistry): { doc: string; schema: JsonSchema } {
  const hash = ref.indexOf('#');
  const file = hash === -1 ? ref : ref.slice(0, hash);
  const pointer = hash === -1 ? '' : ref.slice(hash + 1);
  const doc = file === '' ? docId : file;
  let node: unknown = registry[doc];
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
  return { doc, schema: node as JsonSchema };
}

function typeOf(v: unknown): string {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  if (typeof v === 'number') return Number.isInteger(v) ? 'integer' : 'number';
  return typeof v;
}

const typeMatches = (want: string, v: unknown): boolean => {
  const t = typeOf(v);
  return want === t || (want === 'number' && t === 'integer');
};

/** Canonical JSON (object keys sorted): equality of `const`, `enum` and `uniqueItems`. */
function canon(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canon).join(',')}]`;
  if (isObj(v)) return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canon(v[k])}`).join(',')}}`;
  return JSON.stringify(v);
}

const ptr = (path: string, key: string | number): string => `${path}/${String(key).replace(/~/g, '~0').replace(/\//g, '~1')}`;

function check(schema: JsonSchema, data: unknown, path: string, doc: string, reg: SchemaRegistry, out: SchemaError[]): void {
  if (schema === true) return;
  if (schema === false) { out.push({ path, message: 'no value is allowed here' }); return; }
  const s = schema;
  if (typeof s.$ref === 'string') {
    const r = resolveRef(s.$ref, doc, reg);
    check(r.schema, data, path, r.doc, reg, out);
  }
  if (s.type !== undefined) {
    const list = (Array.isArray(s.type) ? s.type : [s.type]) as string[];
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
    if (typeof s.pattern === 'string' && !new RegExp(s.pattern, 'u').test(data)) out.push({ path, message: `does not match ${s.pattern}` });
  }
  if (typeof data === 'number') {
    if (typeof s.minimum === 'number' && data < s.minimum) out.push({ path, message: `below ${s.minimum}` });
    if (typeof s.maximum === 'number' && data > s.maximum) out.push({ path, message: `above ${s.maximum}` });
  }
  if (Array.isArray(data)) {
    if (typeof s.minItems === 'number' && data.length < s.minItems) out.push({ path, message: `fewer than ${s.minItems} items` });
    if (typeof s.maxItems === 'number' && data.length > s.maxItems) out.push({ path, message: `more than ${s.maxItems} items` });
    if (s.uniqueItems === true) {
      const seen = new Set<string>();
      data.forEach((d, i) => { const c = canon(d); if (seen.has(c)) out.push({ path: ptr(path, i), message: 'duplicate item' }); seen.add(c); });
    }
    if (s.items !== undefined) data.forEach((d, i) => check(s.items as JsonSchema, d, ptr(path, i), doc, reg, out));
    if (s.contains !== undefined && !data.some((d) => errorsOf(s.contains as JsonSchema, d, path, doc, reg).length === 0)) {
      out.push({ path, message: 'no item matches the contains rule' });
    }
  }
  if (isObj(data)) {
    const props = isObj(s.properties) ? s.properties : {};
    if (Array.isArray(s.required)) {
      for (const k of s.required as string[]) if (!(k in data)) out.push({ path, message: `missing ${k}` });
    }
    if (typeof s.minProperties === 'number' && Object.keys(data).length < s.minProperties) {
      out.push({ path, message: `fewer than ${s.minProperties} properties` });
    }
    for (const [k, v] of Object.entries(data)) {
      if (k in props) check(props[k] as JsonSchema, v, ptr(path, k), doc, reg, out);
      else if (s.additionalProperties !== undefined) {
        if (s.additionalProperties === false) out.push({ path: ptr(path, k), message: 'unknown property' });
        else check(s.additionalProperties as JsonSchema, v, ptr(path, k), doc, reg, out);
      }
    }
  }
  if (Array.isArray(s.allOf)) for (const sub of s.allOf) check(sub as JsonSchema, data, path, doc, reg, out);
  if (Array.isArray(s.anyOf) && !s.anyOf.some((sub) => errorsOf(sub as JsonSchema, data, path, doc, reg).length === 0)) {
    out.push({ path, message: 'matches none of anyOf' });
  }
  if (Array.isArray(s.oneOf)) {
    const results = s.oneOf.map((sub) => errorsOf(sub as JsonSchema, data, path, doc, reg));
    const ok = results.filter((r) => r.length === 0).length;
    if (ok !== 1) {
      // The closest branch (fewest errors) explains a miss best.
      const best = ok === 0 ? results.reduce((a, b) => (b.length < a.length ? b : a)) : [];
      out.push({ path, message: `matches ${ok} of oneOf (exactly 1 wanted)` }, ...best);
    }
  }
  if (s.not !== undefined && errorsOf(s.not as JsonSchema, data, path, doc, reg).length === 0) out.push({ path, message: 'matches the not rule' });
  if (s.if !== undefined) {
    const branch = errorsOf(s.if as JsonSchema, data, path, doc, reg).length === 0 ? s.then : s.else;
    if (branch !== undefined) check(branch as JsonSchema, data, path, doc, reg, out);
  }
}

function errorsOf(schema: JsonSchema, data: unknown, path: string, doc: string, reg: SchemaRegistry): SchemaError[] {
  const out: SchemaError[] = [];
  check(schema, data, path, doc, reg, out);
  return out;
}

/**
 * Validates `data` against the document `docId` of the registry (a file name such as `quiz-draft.schema.json`, or
 * `<file>#/$defs/<name>`). Returns every error found; an empty list means valid. Throws on an unresolved `$ref`.
 */
export function validate(docId: string, data: unknown, registry: SchemaRegistry): SchemaError[] {
  const r = resolveRef(docId, docId.split('#')[0] ?? docId, registry);
  return errorsOf(r.schema, data, '', r.doc, registry);
}

/**
 * A data file of a content lane is one entry or an array of entries of the format its name ends with
 * (`<name>.<format>.json`, formats.md 1). Returns the format, or null when the name follows no format of `formats`.
 */
export function formatOfFile(fileName: string, formats: readonly string[]): string | null {
  const m = /\.([a-z-]+)\.json$/.exec(fileName);
  return m && formats.includes(m[1]!) ? m[1]! : null;
}

/** Validates a data file's parsed content: one entry or every entry of an array (paths prefixed by the index). */
export function validateEntries(format: string, content: unknown, registry: SchemaRegistry): SchemaError[] {
  const id = `${format}.schema.json`;
  if (!Array.isArray(content)) return validate(id, content, registry);
  return content.flatMap((entry, i) => validate(id, entry, registry).map((e) => ({ ...e, path: `/${i}${e.path}` })));
}
