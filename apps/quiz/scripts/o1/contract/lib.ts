// Run O1 contract o1-contract-v1: the pure logic of gen-contract-types.mts and check-contract.mts.
//
// A "snapshot" is the catalog of a database read by SNAPSHOT_SQL: one entry per object, keyed
// `<kind>:<schema>.<name>...`, with `v` (what the contract freezes and check-contract compares) and
// `m` (facts the type generator needs and the comparison ignores: column order, argument modes,
// policy expressions). The contract is the delta that schema.sql makes, section by section
// (`-- @file` blocks), on top of a base (schema.base.sql on a local cluster, or a branch's own schema).
// No process, file or network access here: the scripts do that, these functions are unit tested in
// apps/quiz/src/lib/site/contract.test.ts.

export interface SnapshotEntry {
  readonly v: Readonly<Record<string, unknown>>;
  readonly m: Readonly<Record<string, unknown>> | null;
}
export type Snapshot = Readonly<Record<string, SnapshotEntry>>;

/** Grantees a contract ACL speaks about; the owner role differs between a local cluster and Supabase. */
export const ACL_ROLES = ['PUBLIC', 'anon', 'authenticated', 'service_role'] as const;

const ident = (s: string): string => {
  if (!/^[a-z_][a-z0-9_]*$/.test(s)) throw new Error(`not a plain identifier: ${s}`);
  return s;
};

/** Expression listing `<grantee>:<privilege>` of an aclitem[] for ACL_ROLES, MAINTAIN dropped (Postgres 17+ only). */
function aclExpr(acl: string, kind: 'r' | 'f' | 'n', owner: string, only?: string): string {
  const grantee = `(case when a.grantee = 0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end)`;
  const roles = ACL_ROLES.map((r) => `'${r}'`).join(', ');
  const priv = only ? ` and a.privilege_type = '${only}'` : ` and a.privilege_type <> 'MAINTAIN'`;
  return `(select coalesce(jsonb_agg(x order by x), '[]'::jsonb) from (select distinct ${grantee} || ':' || a.privilege_type as x
      from aclexplode(coalesce(${acl}, acldefault('${kind}', ${owner}))) a where ${grantee} in (${roles})${priv}) s)`;
}

/**
 * One query that returns the snapshot of the given schemas as a single JSON object. Postgres 15 and
 * later (Supabase today, Postgres 18 locally). Not-null rows of pg_constraint (Postgres 18) are left
 * out: nullability is read from the column.
 */
export function snapshotSql(schemas: readonly string[]): string {
  const list = schemas.map((s) => `'${ident(s)}'`).join(', ');
  return `with ns as (select oid, nspname from pg_namespace where nspname in (${list})),
items as (
  select 'schema:' || n.nspname as k,
    jsonb_build_object('acl', ${aclExpr('n2.nspacl', 'n', 'n2.nspowner')}) as v, null::jsonb as m
  from ns n join pg_namespace n2 on n2.oid = n.oid
  union all
  select 'rel:' || n.nspname || '.' || c.relname,
    jsonb_build_object('kind', c.relkind::text, 'rls', c.relrowsecurity, 'forceRls', c.relforcerowsecurity,
      'options', coalesce(to_jsonb(c.reloptions), '[]'::jsonb), 'acl', ${aclExpr('c.relacl', 'r', 'c.relowner')}),
    null::jsonb
  from pg_class c join ns n on n.oid = c.relnamespace where c.relkind in ('r', 'p', 'v', 'm', 'f')
  union all
  select 'col:' || n.nspname || '.' || c.relname || '.' || a.attname,
    jsonb_build_object('type', format_type(a.atttypid, a.atttypmod), 'notNull', a.attnotnull,
      'default', pg_get_expr(d.adbin, d.adrelid), 'identity', a.attidentity::text, 'generated', a.attgenerated::text),
    jsonb_build_object('ord', a.attnum, 'typeName', format_type(a.atttypid, null))
  from pg_attribute a join pg_class c on c.oid = a.attrelid join ns n on n.oid = c.relnamespace
    left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
  where c.relkind in ('r', 'p', 'v', 'm', 'f') and a.attnum > 0 and not a.attisdropped
  union all
  select 'con:' || n.nspname || '.' || c.relname || '.' || co.conname,
    jsonb_build_object('type', co.contype::text, 'def', pg_get_constraintdef(co.oid)), null::jsonb
  from pg_constraint co join pg_class c on c.oid = co.conrelid join ns n on n.oid = c.relnamespace
  where co.contype in ('p', 'u', 'f', 'c', 'x')
  union all
  select 'idx:' || n.nspname || '.' || ic.relname, jsonb_build_object('def', pg_get_indexdef(i.indexrelid)), null::jsonb
  from pg_index i join pg_class ic on ic.oid = i.indexrelid join ns n on n.oid = ic.relnamespace
  union all
  select 'fn:' || n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')',
    jsonb_build_object('kind', p.prokind::text, 'args', pg_get_function_arguments(p.oid),
      'result', pg_get_function_result(p.oid), 'security', case when p.prosecdef then 'definer' else 'invoker' end,
      'config', coalesce(to_jsonb(p.proconfig), '[]'::jsonb), 'acl', ${aclExpr('p.proacl', 'f', 'p.proowner', 'EXECUTE')}),
    jsonb_build_object('name', p.proname, 'retType', format_type(p.prorettype, null), 'retSet', p.proretset,
      'nDefaults', p.pronargdefaults,
      'params', (select coalesce(jsonb_agg(jsonb_build_object(
          'name', coalesce(p.proargnames[i], ''),
          'type', format_type(coalesce(p.proallargtypes[i], p.proargtypes[i - 1]), null),
          'mode', coalesce(p.proargmodes[i]::text, 'i')) order by i), '[]'::jsonb)
        from generate_series(1, coalesce(array_length(p.proallargtypes, 1), p.pronargs)) as i))
  from pg_proc p join ns n on n.oid = p.pronamespace where p.prokind in ('f', 'p')
  union all
  select 'trg:' || n.nspname || '.' || c.relname || '.' || t.tgname, jsonb_build_object('def', pg_get_triggerdef(t.oid)), null::jsonb
  from pg_trigger t join pg_class c on c.oid = t.tgrelid join ns n on n.oid = c.relnamespace where not t.tgisinternal
  union all
  select 'pol:' || n.nspname || '.' || c.relname || '.' || po.polname,
    jsonb_build_object('cmd', po.polcmd::text, 'permissive', po.polpermissive,
      'roles', (select coalesce(jsonb_agg(r order by r), '[]'::jsonb)
        from (select case when x = 0 then 'PUBLIC' else pg_get_userbyid(x) end as r from unnest(po.polroles) as x) s)),
    jsonb_build_object('using', pg_get_expr(po.polqual, po.polrelid), 'check', pg_get_expr(po.polwithcheck, po.polrelid))
  from pg_policy po join pg_class c on c.oid = po.polrelid join ns n on n.oid = c.relnamespace
  union all
  select 'type:' || n.nspname || '.' || t.typname,
    jsonb_build_object('kind', t.typtype::text,
      'labels', (select coalesce(jsonb_agg(e.enumlabel order by e.enumsortorder), '[]'::jsonb) from pg_enum e where e.enumtypid = t.oid),
      'base', case when t.typtype = 'd' then format_type(t.typbasetype, t.typtypmod) end), null::jsonb
  from pg_type t join ns n on n.oid = t.typnamespace where t.typtype in ('e', 'd')
)
select coalesce(jsonb_object_agg(k, jsonb_build_object('v', v, 'm', m)), '{}'::jsonb)::text from items;`;
}

/** Schemas a snapshot reads by default: the contract's two (public, passport). */
export const CONTRACT_SCHEMAS = ['public', 'passport'] as const;

// ---------------------------------------------------------------------------------------------
// schema.sql sections

export interface Section {
  readonly file: string;
  readonly sql: string;
}

/**
 * Splits schema.sql on its `-- @file <name>` markers. The text before the first marker (the header,
 * comments only) joins the first section. Throws on a duplicate name or no marker.
 */
export function splitSections(sql: string): Section[] {
  const lines = sql.split('\n');
  const out: { file: string; lines: string[] }[] = [];
  let pre: string[] = [];
  for (const line of lines) {
    const m = /^-- @file (\S+)\s*$/.exec(line);
    if (m) {
      if (out.some((s) => s.file === m[1])) throw new Error(`duplicate @file ${m[1]}`);
      out.push({ file: m[1]!, lines: out.length === 0 ? [...pre, line] : [line] });
      pre = [];
    } else if (out.length === 0) pre.push(line);
    else out[out.length - 1]!.lines.push(line);
  }
  if (out.length === 0) throw new Error('no "-- @file" marker');
  return out.map((s) => ({ file: s.file, sql: s.lines.join('\n') }));
}

/** `schema.name` of every function a section creates or replaces (the contract freezes its signature). */
export function functionsNamed(sql: string): string[] {
  const out = new Set<string>();
  for (const m of sql.matchAll(/^\s*create\s+(?:or\s+replace\s+)?function\s+([a-z_][a-z0-9_]*)\.([a-z_][a-z0-9_]*)\s*\(/gim)) {
    out.add(`${m[1]!.toLowerCase()}.${m[2]!.toLowerCase()}`);
  }
  return [...out];
}

// ---------------------------------------------------------------------------------------------
// The contract: what schema.sql changes, per section

export interface ContractItem {
  readonly key: string;
  /** The @file section that last created or changed the object. */
  readonly file: string;
  /** Present with this value, or absent (`null`: the section drops it). */
  readonly v: Readonly<Record<string, unknown>> | null;
  /** True when the object did not exist in the base. */
  readonly isNew: boolean;
}
export interface Contract {
  readonly items: readonly ContractItem[];
  readonly files: readonly string[];
}

/** Stable JSON: object keys sorted, so two catalogs compare by value. */
export function stable(x: unknown): string {
  if (Array.isArray(x)) return `[${x.map(stable).join(',')}]`;
  if (x && typeof x === 'object') {
    const o = x as Record<string, unknown>;
    return `{${Object.keys(o).sort().map((k) => `${JSON.stringify(k)}:${stable(o[k])}`).join(',')}}`;
  }
  return JSON.stringify(x ?? null);
}

const fnName = (key: string): string | null => {
  const m = /^fn:([a-z0-9_]+\.[a-z0-9_]+)\(/.exec(key);
  return m ? m[1]! : null;
};

/**
 * The contract from consecutive snapshots: `snaps[0]` is the base, `snaps[i]` the catalog after
 * section `sections[i - 1]`. A key belongs to the last section that created, changed or dropped it;
 * a function a section names in CREATE [OR REPLACE] FUNCTION belongs to it even when nothing changed.
 */
export function contractFrom(snaps: readonly Snapshot[], sections: readonly Section[]): Contract {
  if (snaps.length !== sections.length + 1) throw new Error('one snapshot per section, plus the base');
  const base = snaps[0]!;
  const owner = new Map<string, string>();
  sections.forEach((sec, i) => {
    const before = snaps[i]!;
    const after = snaps[i + 1]!;
    const named = new Set(functionsNamed(sec.sql));
    for (const k of new Set([...Object.keys(before), ...Object.keys(after)])) {
      const a = before[k];
      const b = after[k];
      const changed = !a || !b || stable(a.v) !== stable(b.v);
      const fn = fnName(k);
      if (changed || (fn !== null && named.has(fn) && b)) owner.set(k, sec.file);
    }
  });
  const last = snaps[snaps.length - 1]!;
  const items: ContractItem[] = [...owner.entries()]
    .filter(([k]) => last[k] !== undefined || base[k] !== undefined)
    .map(([key, file]) => ({ key, file, v: last[key]?.v ?? null, isNew: base[key] === undefined }))
    .sort((x, y) => (x.key < y.key ? -1 : x.key > y.key ? 1 : 0));
  return { items, files: sections.map((s) => s.file) };
}

// ---------------------------------------------------------------------------------------------
// Comparing a database with the contract

export interface Diff {
  readonly key: string;
  readonly file: string;
  /** missing: the contract object is absent; present: an object the contract drops still exists; changed: a field differs. */
  readonly kind: 'missing' | 'present' | 'changed';
  readonly field?: string;
  readonly expected?: unknown;
  readonly actual?: unknown;
}
export interface Comparison {
  readonly diffs: readonly Diff[];
  /** Sections none of whose new objects exist in the target (only with `appliedOnly`). */
  readonly notApplied: readonly string[];
  readonly checked: number;
}

/**
 * Compares a target snapshot with the contract. With `appliedOnly`, the objects of a section that
 * created new objects and none of whose new objects exist in the target are skipped (the lane has not
 * applied that file yet); every object of a section that is partly there is still required.
 */
export function compareContract(contract: Contract, target: Snapshot, appliedOnly = false): Comparison {
  const notApplied = new Set<string>();
  if (appliedOnly) {
    for (const f of contract.files) {
      const fresh = contract.items.filter((i) => i.file === f && i.isNew && i.v !== null);
      if (fresh.length > 0 && fresh.every((i) => target[i.key] === undefined)) notApplied.add(f);
    }
  }
  const diffs: Diff[] = [];
  let checked = 0;
  for (const it of contract.items) {
    if (notApplied.has(it.file)) continue;
    checked++;
    const t = target[it.key];
    if (it.v === null) {
      if (t) diffs.push({ key: it.key, file: it.file, kind: 'present' });
      continue;
    }
    if (!t) {
      diffs.push({ key: it.key, file: it.file, kind: 'missing' });
      continue;
    }
    for (const field of Object.keys(it.v).sort()) {
      const e = it.v[field];
      const a = t.v[field];
      if (stable(e) !== stable(a)) diffs.push({ key: it.key, file: it.file, kind: 'changed', field, expected: e, actual: a });
    }
  }
  return { diffs, notApplied: [...notApplied], checked };
}

export function formatDiff(d: Diff): string {
  if (d.kind === 'missing') return `missing  ${d.key}  (${d.file})`;
  if (d.kind === 'present') return `present  ${d.key}  (${d.file} drops it)`;
  return `changed  ${d.key} ${d.field}: expected ${stable(d.expected)}, found ${stable(d.actual)}  (${d.file})`;
}

// ---------------------------------------------------------------------------------------------
// The stand-in base against production's catalog copy (gate G3)

/** Markers of schema.base.sql: the platform stand-in (roles, schemas, auth, storage) ends where the public stand-ins begin. */
export const BASE_PUBLIC_MARKER = '-- Public tables (only what schema.sql reads)';
export const BASE_ROWS_MARKER = '-- Rows schema.sql and the fixtures need';

/**
 * Splits schema.base.sql into its platform part (what a copy of production's public schema needs
 * under it: the Supabase roles, schemas, default privileges, auth and storage), its public stand-ins
 * and its rows. Throws when a marker is missing or out of order.
 */
export function baseParts(baseSql: string): { platform: string; publicStandIn: string; rows: string } {
  const p = baseSql.indexOf(`\n${BASE_PUBLIC_MARKER}`);
  const r = baseSql.indexOf(`\n${BASE_ROWS_MARKER}`);
  if (p < 0 || r < 0 || r < p) throw new Error('schema.base.sql: the public and rows markers are missing or out of order');
  return { platform: baseSql.slice(0, p + 1), publicStandIn: baseSql.slice(p + 1, r + 1), rows: baseSql.slice(r + 1) };
}

/** Loaded right after production's catalog copy: undoes the session settings the copy sets before schema.sql loads. */
export const PROD_COPY_RESET = 'reset check_function_bodies;\nreset search_path;\nreset client_min_messages;\n';

export interface ContractDelta {
  readonly key: string;
  /** Only in the first contract, only in the second, or in both with a different section, novelty or value. */
  readonly kind: 'onlyA' | 'onlyB' | 'differs';
  readonly a?: ContractItem;
  readonly b?: ContractItem;
}

/** Item-by-item difference of two contracts built from the same schema.sql on two bases. */
export function compareContracts(a: Contract, b: Contract): ContractDelta[] {
  const am = new Map(a.items.map((i) => [i.key, i]));
  const bm = new Map(b.items.map((i) => [i.key, i]));
  const out: ContractDelta[] = [];
  for (const key of [...new Set([...am.keys(), ...bm.keys()])].sort()) {
    const x = am.get(key);
    const y = bm.get(key);
    if (x && !y) out.push({ key, kind: 'onlyA', a: x });
    else if (y && !x) out.push({ key, kind: 'onlyB', b: y });
    else if (x && y && stable(x) !== stable(y)) out.push({ key, kind: 'differs', a: x, b: y });
  }
  return out;
}

export function formatDelta(d: ContractDelta, labels: readonly [string, string]): string {
  if (d.kind === 'onlyA') return `${labels[0]} only  ${d.key}  (${d.a!.file})`;
  if (d.kind === 'onlyB') return `${labels[1]} only  ${d.key}  (${d.b!.file})`;
  const fields = ['file', 'isNew'].filter((f) => stable((d.a as unknown as Record<string, unknown>)[f]) !== stable((d.b as unknown as Record<string, unknown>)[f]));
  const v = Object.keys({ ...(d.a!.v ?? {}), ...(d.b!.v ?? {}) }).sort()
    .filter((f) => stable(d.a!.v?.[f]) !== stable(d.b!.v?.[f]))
    .map((f) => `${f}: ${labels[0]} ${stable(d.a!.v?.[f])}, ${labels[1]} ${stable(d.b!.v?.[f])}`);
  const head = fields.map((f) => `${f}: ${labels[0]} ${stable((d.a as unknown as Record<string, unknown>)[f])}, ${labels[1]} ${stable((d.b as unknown as Record<string, unknown>)[f])}`);
  return `differs  ${d.key}  ${[...head, ...v].join('; ')}`;
}

// ---------------------------------------------------------------------------------------------
// TypeScript types of the contract objects

/** Literal union of a single-column `col IN (...)` text check, as Postgres prints it; null otherwise. */
export function checkUnion(def: string): { column: string; values: string[] } | null {
  const m = /^CHECK \(\(([a-z_][a-z0-9_]*) = ANY \(ARRAY\[(.+)\]\)\)\)$/.exec(def.trim());
  if (!m) return null;
  const values: string[] = [];
  for (const part of m[2]!.split(/,\s*/)) {
    const v = /^'((?:[^']|'')*)'::text$/.exec(part.trim());
    if (!v) return null;
    values.push(v[1]!.replace(/''/g, "'"));
  }
  return { column: m[1]!, values };
}

const STRING_TYPES = new Set([
  'text', 'character varying', 'character', 'uuid', 'citext', 'date', 'time without time zone', 'time with time zone',
  'timestamp without time zone', 'timestamp with time zone', 'interval', 'inet', 'cidr', 'bytea', 'name', '"char"',
]);
const NUMBER_TYPES = new Set(['smallint', 'integer', 'bigint', 'real', 'double precision', 'numeric', 'oid']);

/** The TypeScript type of a Postgres type name (format_type without typmod). Unknown types throw. */
export function tsType(pgType: string, enums: Readonly<Record<string, readonly string[]>> = {}): string {
  const t = pgType.replace(/\(.*\)/, '').trim();
  if (t.endsWith('[]')) {
    const inner = tsType(t.slice(0, -2), enums);
    return /[| ]/.test(inner) ? `(${inner})[]` : `${inner}[]`;
  }
  if (STRING_TYPES.has(t)) return 'string';
  if (NUMBER_TYPES.has(t)) return 'number';
  if (t === 'boolean') return 'boolean';
  if (t === 'json' || t === 'jsonb') return 'Json';
  if (t === 'void') return 'undefined';
  const e = enums[t] ?? enums[`public.${t}`];
  if (e) return e.map((x) => `'${x.replace(/'/g, "\\'")}'`).join(' | ');
  throw new Error(`no TypeScript type for Postgres type ${pgType}`);
}

interface Param { readonly name: string; readonly type: string; readonly mode: string }

export interface TypesInput {
  readonly contract: Contract;
  readonly snapshot: Snapshot;
  /** Lines written under the generated header (source hashes, base, Postgres version). */
  readonly header: readonly string[];
}

/**
 * The text of lib/db/contract.types.ts, shaped like Supabase's generated `Database` type: maps keyed by
 * the frozen SQL names (never a new identifier built from them, so no naming trap of naming.md can
 * appear): ContractTables (Row and Insert per table the contract creates), ContractAddedColumns (the
 * columns added to an existing table), ContractViews, ContractFunctions (Args and Returns per callable
 * function), and the helpers TableRow, TableInsert, ViewRow, FnArgs, FnReturns. Deterministic.
 */
export function renderTypes({ contract, snapshot, header }: TypesInput): string {
  const items = new Map(contract.items.map((i) => [i.key, i]));
  const fileOrder = new Map(contract.files.map((f, i) => [f, i]));
  const rels = contract.items.filter((i) => i.key.startsWith('rel:') && i.v !== null);
  const enums: Record<string, string[]> = {};
  for (const [k, e] of Object.entries(snapshot)) {
    if (k.startsWith('type:') && e.v.kind === 'e') enums[k.slice(5)] = e.v.labels as string[];
  }
  const relName = (key: string): string => key.slice(key.indexOf(':') + 1);
  const unions = (qualified: string): Map<string, string[]> => {
    const out = new Map<string, string[]>();
    for (const [k, e] of Object.entries(snapshot)) {
      if (!k.startsWith(`con:${qualified}.`) || e.v.type !== 'c') continue;
      const u = checkUnion(String(e.v.def));
      if (u) out.set(u.column, u.values);
    }
    return out;
  };
  const columnsOf = (qualified: string, only?: (k: string) => boolean): { name: string; e: SnapshotEntry }[] =>
    Object.entries(snapshot)
      .filter(([k]) => k.startsWith(`col:${qualified}.`) && k.split('.').length === 3 && (!only || only(k)))
      .map(([k, e]) => ({ name: k.split('.')[2]!, e }))
      .sort((a, b) => Number(a.e.m?.ord) - Number(b.e.m?.ord));
  const colType = (c: { name: string; e: SnapshotEntry }, u: Map<string, string[]>): string => {
    const values = u.get(c.name);
    const base = values && String(c.e.m?.typeName) === 'text'
      ? values.map((x) => `'${x.replace(/'/g, "\\'")}'`).join(' | ')
      : tsType(String(c.e.m?.typeName ?? c.e.v.type), enums);
    return c.e.v.notNull ? base : `${base} | null`;
  };
  const fileOf = (key: string): string => items.get(key)?.file ?? '';
  const byFile = (a: ContractItem, b: ContractItem): number =>
    (fileOrder.get(a.file) ?? 0) - (fileOrder.get(b.file) ?? 0) || (a.key < b.key ? -1 : 1);

  const out: string[] = [
    '// GENERATED by apps/quiz/scripts/o1/gen-contract-types.mts from docs/o1/contracts/schema.sql. Do not edit:',
    '// change schema.sql (a CR after the o1-contract-v1 tag), then regenerate.',
    ...header.map((h) => `// ${h}`),
    '// Types only, keyed by the frozen SQL names. Nothing on the kpop path imports this file until the owner',
    '// lanes wire their objects. The comment above each entry names the schema.sql section (@file) it comes from.',
    '/* eslint-disable */',
    '',
    'export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];',
    '',
  ];

  const tables = rels.filter((r) => r.isNew && ['r', 'p'].includes(String(r.v!.kind))).sort(byFile);
  const views = rels.filter((r) => ['v', 'm'].includes(String(r.v!.kind))).sort(byFile);

  out.push('/** The tables the contract creates. */', 'export interface ContractTables {');
  for (const t of tables) {
    const q = relName(t.key);
    const u = unions(q);
    const cols = columnsOf(q);
    out.push(`  /** ${t.file} */`, `  '${q}': {`, '    Row: {');
    for (const c of cols) out.push(`      ${c.name}: ${colType(c, u)};`);
    out.push('    };', '    Insert: {');
    for (const c of cols) {
      if (c.e.v.generated) continue;
      const optional = !c.e.v.notNull || c.e.v.default !== null || Boolean(c.e.v.identity);
      out.push(`      ${c.name}${optional ? '?' : ''}: ${colType(c, u)};`);
    }
    out.push('    };', '  };');
  }
  out.push('}', '');

  const altered = new Map<string, ContractItem[]>();
  for (const it of contract.items) {
    if (!it.key.startsWith('col:') || !it.isNew || it.v === null) continue;
    const q = it.key.slice(4).split('.').slice(0, 2).join('.');
    if (tables.some((t) => relName(t.key) === q) || views.some((v) => relName(v.key) === q)) continue;
    altered.set(q, [...(altered.get(q) ?? []), it]);
  }
  out.push('/** The columns the contract adds to existing tables (the rest of each row is today\'s type). */', 'export interface ContractAddedColumns {');
  for (const q of [...altered.keys()].sort()) {
    const keys = new Set(altered.get(q)!.map((i) => i.key));
    const u = unions(q);
    const files = [...new Set(altered.get(q)!.map((i) => i.file))].sort((x, y) => (fileOrder.get(x) ?? 0) - (fileOrder.get(y) ?? 0)).join(', ');
    out.push(`  /** ${files} */`, `  '${q}': {`);
    for (const c of columnsOf(q, (k) => keys.has(k))) out.push(`    ${c.name}: ${colType(c, u)};`);
    out.push('  };');
  }
  out.push('}', '');

  out.push('/** The views the contract creates (view columns are nullable). */', 'export interface ContractViews {');
  for (const v of views) {
    const q = relName(v.key);
    out.push(`  /** ${fileOf(v.key)} */`, `  '${q}': {`);
    for (const c of columnsOf(q)) out.push(`    ${c.name}: ${colType(c, new Map())};`);
    out.push('  };');
  }
  out.push('}', '');

  out.push('/** The callable functions the contract creates or replaces (trigger functions are left out). */', 'export interface ContractFunctions {');
  const seen = new Set<string>();
  const fns = contract.items.filter((i) => i.key.startsWith('fn:') && i.v !== null).sort(byFile);
  for (const f of fns) {
    const e = snapshot[f.key];
    if (!e?.m || e.m.retType === 'trigger') continue;
    const fname = String(e.m.name);
    if (seen.has(fname)) throw new Error(`overloaded contract function ${fname}: give it its own name`);
    seen.add(fname);
    const params = (e.m.params as Param[]) ?? [];
    const inputs = params.filter((p) => ['i', 'b', 'v'].includes(p.mode));
    const outputs = params.filter((p) => ['o', 'b', 't'].includes(p.mode));
    const nDefaults = Number(e.m.nDefaults ?? 0);
    out.push(`  /** ${f.file}; ${f.key.slice(3)}; security ${String(e.v.security)} */`, `  ${fname}: {`);
    if (inputs.length === 0) out.push('    Args: Record<string, never>;');
    else {
      out.push('    Args: {');
      inputs.forEach((p, i) => {
        if (!p.name) throw new Error(`unnamed argument in ${f.key}`);
        out.push(`      ${p.name}${i >= inputs.length - nDefaults ? '?' : ''}: ${tsType(p.type, enums)};`);
      });
      out.push('    };');
    }
    let ret: string;
    if (outputs.length > 0) {
      const row = `{ ${outputs.map((p) => `${p.name}: ${tsType(p.type, enums)} | null`).join('; ')} }`;
      ret = e.m.retSet ? `${row}[]` : row;
    } else {
      const t = tsType(String(e.m.retType), enums);
      ret = t === 'undefined' ? 'undefined' : e.m.retSet ? `${/[| ]/.test(t) ? `(${t})` : t}[]` : `${t} | null`;
    }
    out.push(`    Returns: ${ret};`, '  };');
  }
  out.push('}', '');

  out.push(
    "export type TableRow<K extends keyof ContractTables> = ContractTables[K]['Row'];",
    "export type TableInsert<K extends keyof ContractTables> = ContractTables[K]['Insert'];",
    'export type ViewRow<K extends keyof ContractViews> = ContractViews[K];',
    "export type FnArgs<K extends keyof ContractFunctions> = ContractFunctions[K]['Args'];",
    "export type FnReturns<K extends keyof ContractFunctions> = ContractFunctions[K]['Returns'];",
    '',
  );
  return out.join('\n');
}

/** The `schema.sql sha256 <hex16>` stamp of a generated file, or null. */
export function stampOf(text: string): string | null {
  const m = /^\/\/ schema\.sql sha256 ([0-9a-f]{16})\b/m.exec(text);
  return m ? m[1]! : null;
}
