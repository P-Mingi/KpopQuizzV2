// o1: the proof tool of lot (b). It walks a React element tree the way the React Flight serializer writes it (the RSC
// payload of a page), so that two versions of a shared component can be compared on the shape the browser downloads,
// not only on the HTML they render to. Test support only: nothing in the app imports it.
//
//  - A host element becomes ["$", type, key, props]. Every prop is kept, an undefined one is written "$undefined",
//    and `children` is kept exactly as authored (one child stays one child, an array stays an array, in order).
//  - A server function component is called (an async one is awaited) and the value it returns is walked in its place.
//    A keyless fragment is replaced by its children, as Flight does.
//  - A client component (a module whose first statement is 'use client') is never called. It becomes
//    ["$L", name, props], and [..., key] as a fourth entry only when it has a key. Its props, children included, are
//    walked like any other value.
//  - The key path and the implicit slot of Flight (a keyed element returned by a keyless server component is wrapped
//    in an array, a key is inherited from the keyed component that returned it) are kept.

import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export type FlightValue = null | boolean | number | string | FlightValue[] | { [key: string]: FlightValue };

/** The client components of a render, by identity, with the name they are written with. */
export type ClientRefs = ReadonlyMap<unknown, string>;

export interface FlightOptions {
  readonly client?: ClientRefs;
}

interface Slot {
  readonly keyPath: string | null;
  readonly implicit: boolean;
}

const TOP: Slot = { keyPath: null, implicit: false };
const ELEMENT_TYPES = [Symbol.for('react.transitional.element'), Symbol.for('react.element')];
const FRAGMENT = Symbol.for('react.fragment');
const MEMO = Symbol.for('react.memo');
const FORWARD_REF = Symbol.for('react.forward_ref');

interface ElementLike {
  readonly $$typeof: symbol;
  readonly type: unknown;
  readonly key: string | null;
  readonly props: Record<string, unknown>;
}

function isElement(v: unknown): v is ElementLike {
  return typeof v === 'object' && v !== null && ELEMENT_TYPES.includes((v as { $$typeof?: symbol }).$$typeof as symbol);
}

function isThenable(v: unknown): v is PromiseLike<unknown> {
  return typeof v === 'object' && v !== null && typeof (v as { then?: unknown }).then === 'function';
}

function typeName(t: unknown): string {
  if (typeof t === 'function') return (t as { displayName?: string; name?: string }).displayName ?? (t as { name?: string }).name ?? 'Anonymous';
  return String(t);
}

/** The tree of `node` as the Flight serializer would write it (see the header). */
export async function flightTree(node: unknown, opts: FlightOptions = {}): Promise<FlightValue> {
  const client = opts.client ?? new Map<unknown, string>();

  async function props(p: Record<string, unknown>): Promise<{ [key: string]: FlightValue }> {
    const out: { [key: string]: FlightValue } = {};
    for (const k of Object.keys(p)) out[k] = await value(p[k], TOP);
    return out;
  }

  async function element(el: ElementLike, slot: Slot): Promise<FlightValue> {
    const { type, key } = el;
    const p = el.props;
    if (typeof type === 'symbol') {
      if (type === FRAGMENT && key === null) {
        return value(p.children, { keyPath: slot.keyPath, implicit: slot.keyPath === null ? true : slot.implicit });
      }
      return host(`$S${type.description ?? ''}`, key, p, slot);
    }
    if (typeof type === 'string') return host(type, key, p, slot);
    if (client.has(type)) {
      const name = client.get(type) as string;
      const keyed = combine(slot.keyPath, key);
      const row: FlightValue[] = ['$L', name, await props(p)];
      if (keyed !== null) row.push(keyed);
      return slot.implicit && keyed !== null ? [row] : row;
    }
    if (typeof type === 'function') {
      const inner: Slot = key !== null
        ? { keyPath: slot.keyPath === null ? key : `${slot.keyPath},${key}`, implicit: slot.implicit }
        : { keyPath: slot.keyPath, implicit: slot.keyPath === null ? true : slot.implicit };
      const out = await (type as (props: Record<string, unknown>) => unknown)(p);
      return value(out, inner);
    }
    if (typeof type === 'object' && type !== null) {
      const t = type as { $$typeof?: symbol; type?: unknown; render?: (props: Record<string, unknown>, ref: unknown) => unknown };
      if (t.$$typeof === MEMO) return element({ ...el, type: t.type }, slot);
      if (t.$$typeof === FORWARD_REF && t.render) return value(await t.render(p, undefined), slot);
    }
    throw new Error(`flightTree: cannot walk an element of type ${typeName(type)}`);
  }

  async function host(type: string, key: string | null, p: Record<string, unknown>, slot: Slot): Promise<FlightValue> {
    const keyed = combine(slot.keyPath, key);
    const row: FlightValue = ['$', type, keyed, await props(p)];
    return slot.implicit && keyed !== null ? [row] : row;
  }

  async function value(v: unknown, slot: Slot): Promise<FlightValue> {
    if (v === undefined) return '$undefined';
    if (v === null) return null;
    switch (typeof v) {
      case 'string': return v.startsWith('$') ? `$${v}` : v;
      case 'boolean': return v;
      case 'number':
        if (Number.isNaN(v)) return '$NaN';
        if (v === Infinity) return '$Infinity';
        if (v === -Infinity) return '$-Infinity';
        return Object.is(v, -0) ? '$-0' : v;
      case 'bigint': return `$n${v.toString(10)}`;
      case 'symbol': return `$S${v.description ?? ''}`;
      case 'function': throw new Error(`flightTree: a function (${typeName(v)}) cannot be serialised`);
      default: break;
    }
    if (isElement(v)) return element(v, slot);
    if (isThenable(v)) return value(await v, slot);
    if (Array.isArray(v)) {
      const out: FlightValue[] = [];
      for (const item of v) out.push(await value(item, TOP));
      return out;
    }
    if (v instanceof Date) return `$D${v.toISOString()}`;
    const proto = Object.getPrototypeOf(v) as unknown;
    if (proto !== Object.prototype && proto !== null) throw new Error('flightTree: only plain objects can be serialised');
    return props(v as Record<string, unknown>);
  }

  return value(node, TOP);
}

function combine(path: string | null, key: string | null): string | null {
  if (key === null) return path;
  return path === null ? key : `${path},${key}`;
}

// ------------------------------------------------------------------
// Which components are client components
// ------------------------------------------------------------------

/** True when the first statement of a module's source is the 'use client' directive. */
export function isClientSource(source: string): boolean {
  return /^\s*(?:(?:\/\/[^\n]*\n|\/\*[\s\S]*?\*\/)\s*)*['"]use client['"]/.test(source);
}

const SRC = fileURLToPath(new URL('..', import.meta.url));
const EXTENSIONS = ['', '.ts', '.tsx', '/index.ts', '/index.tsx'];
const IMPORT_RE = /\b(?:import|export)\s+(?!type\b)[^'";]*?\sfrom\s*['"]([^'"]+)['"]|\bimport\s*['"]([^'"]+)['"]/g;

function resolveSpecifier(spec: string, from: string): string | null {
  let base: string;
  if (spec.startsWith('@/')) base = join(SRC, spec.slice(2));
  else if (spec.startsWith('.')) base = resolve(dirname(from), spec);
  else return null;
  for (const ext of EXTENSIONS) {
    const file = base + ext;
    if (existsSync(file) && statSync(file).isFile()) return file;
  }
  return null;
}

/** The files of the static import graph of `entries` that are client modules (the walk stops at each of them). */
export function clientModulesOf(entries: readonly string[]): string[] {
  const seen = new Set<string>();
  const clients: string[] = [];
  const queue = [...entries];
  while (queue.length > 0) {
    const file = queue.pop() as string;
    if (seen.has(file)) continue;
    seen.add(file);
    const source = readFileSync(file, 'utf8');
    if (isClientSource(source) && !entries.includes(file)) {
      clients.push(file);
      continue;
    }
    for (const m of source.matchAll(IMPORT_RE)) {
      const dep = resolveSpecifier(m[1] ?? m[2] ?? '', file);
      if (dep !== null && /\.(?:ts|tsx)$/.test(dep)) queue.push(dep);
    }
  }
  return clients.sort();
}

/**
 * The client components a render of `entries` can meet: every function or component object exported by a client module
 * reachable from them, plus next/link and next/image (client components of Next). `unloaded` lists the client modules
 * that could not be imported (their components would then be called, which fails loudly).
 */
export async function clientRefsOf(entries: readonly string[]): Promise<{ refs: Map<unknown, string>; unloaded: string[] }> {
  const refs = new Map<unknown, string>();
  const unloaded: string[] = [];
  const add = (v: unknown, name: string): void => {
    const isComponent = typeof v === 'function' || (typeof v === 'object' && v !== null && typeof (v as { $$typeof?: unknown }).$$typeof === 'symbol');
    if (isComponent && !refs.has(v)) refs.set(v, name);
  };
  add(((await import('next/link')) as { default: unknown }).default, 'Link');
  add(((await import('next/image')) as { default: unknown }).default, 'Image');
  for (const file of clientModulesOf(entries)) {
    try {
      const ns = (await import(/* @vite-ignore */ file)) as Record<string, unknown>;
      for (const [name, v] of Object.entries(ns)) add(v, name === 'default' ? typeName(v) : name);
    } catch {
      unloaded.push(file);
    }
  }
  return { refs, unloaded };
}
