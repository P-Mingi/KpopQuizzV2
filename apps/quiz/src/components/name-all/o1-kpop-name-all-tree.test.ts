import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { clientRefsOf, flightTree } from '@/lib/o1-flight-tree';

// Run O1, lane O1 (fix of lot a): the kpop Name them all page /{group}-name-all-members must keep what it produced before the anime
// words were added. Three things are compared with the file of __o1_kpop_name_all_tree__/page.json, written ONLY from the base
// commit 894cb7c (never from the head): O1_WRITE_TREE=1 writes it, a plain run compares.
//   exports   the exports of the page module (metadata, viewport, dynamic... would change the head meta tags)
//   metadata  what generateMetadata returns for the page
//   tree      the React Flight tree of the page, walked like the serializer (client components as "$L", with their props: so the
//             props passed into game.tsx and the children of the server components are in it)
//   graph     the local modules reached by the static runtime imports of the page, and of game.tsx (the client bundle)

const DIR = fileURLToPath(new URL('./__o1_kpop_name_all_tree__/', import.meta.url));
const FILE = `${DIR}page.json`;
const WRITE = process.env.O1_WRITE_TREE === '1';
const SRC = fileURLToPath(new URL('../..', import.meta.url));

const flags = globalThis as { __v12?: boolean };

const MEMBERS = ['RM', 'Jin', 'Suga', 'J-Hope', 'Jimin', 'V', 'Jungkook'].map((name) => ({ name, spellings: [name, name.toLowerCase(), `${name} (alt)`] }));
const SET = { group: { id: 3, slug: 'bts', name: 'BTS', fandom: 'ARMY' }, members: MEMBERS };

vi.mock('@/lib/ux-v12', () => ({ isUxV12: () => flags.__v12 === true }));
vi.mock('@/lib/name-all/server', () => ({
  getNameAllSet: async (slug: string) => (slug === 'bts' ? SET : null),
  getNameAllStats: async () => ({ rounds: 1234, perfectPct: 31, namedFirst: 'RM' }),
}));
vi.mock('@/lib/db/queries/groups', () => ({ getAllGroups: async () => [{ slug: 'bts', name: 'BTS' }, { slug: 'twice', name: 'TWICE' }, { slug: 'stray-kids', name: 'Stray Kids' }] }));
vi.mock('@/lib/personality/data', () => ({ getWmaGroupSlugs: async () => ['bts'] }));
vi.mock('@/lib/ux-v1/p6/hub-data', () => ({
  getPlayableGroups: async () => [{ slug: 'bts' }],
  settle: async <T>(read: () => Promise<T>, fallback: T) => {
    try { return { value: await read(), ok: true }; } catch { return { value: fallback, ok: false }; }
  },
}));

const EXTENSIONS = ['', '.ts', '.tsx', '/index.ts', '/index.tsx'];
const IMPORT_RE = /\b(?:import|export)\s+(?!type\b)[^'";]*?\sfrom\s*['"]([^'"]+)['"]|\bimport\s*['"]([^'"]+)['"]/g;

function resolveLocal(spec: string, from: string): string | null {
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

/** The local modules of the static runtime import graph of `entry` (type-only imports are not part of it). */
function graphOf(entry: string): string[] {
  const seen = new Set<string>();
  const queue = [entry];
  while (queue.length > 0) {
    const file = queue.pop() as string;
    if (seen.has(file)) continue;
    seen.add(file);
    for (const m of readFileSync(file, 'utf8').matchAll(IMPORT_RE)) {
      const dep = resolveLocal(m[1] ?? m[2] ?? '', file);
      if (dep !== null && /\.(?:ts|tsx)$/.test(dep)) queue.push(dep);
    }
  }
  return [...seen].map((f) => relative(SRC, f)).sort();
}

let refs: Map<unknown, string>;
const PAGE = `${SRC}app/(site)/name-all/[group]/page.tsx`;
const GAME = `${SRC}components/name-all/game.tsx`;

beforeAll(async () => {
  const found = await clientRefsOf([PAGE]);
  expect(found.unloaded).toEqual([]);
  refs = found.refs;
});

afterAll(() => {
  flags.__v12 = undefined as unknown as boolean;
});

describe('the kpop Name them all page keeps its output', () => {
  it('exports, metadata, Flight tree (with the props of game.tsx) and module graph', async () => {
    flags.__v12 = true;
    const mod = (await import('@/app/(site)/name-all/[group]/page')) as unknown as {
      default: (p: unknown) => Promise<unknown>;
      generateMetadata: (p: unknown) => Promise<unknown>;
    };
    const props = { params: Promise.resolve({ group: 'bts' }), searchParams: Promise.resolve({ via: 'pretty' }) };
    const tree = await flightTree(await mod.default(props), { client: refs });
    const got = {
      exports: Object.keys(mod).sort(),
      metadata: await mod.generateMetadata(props),
      metadataDirect: await mod.generateMetadata({ params: Promise.resolve({ group: 'bts' }), searchParams: Promise.resolve({}) }),
      tree,
      graph: { page: graphOf(PAGE), game: graphOf(GAME) },
    };
    const text = `${JSON.stringify(got, null, 1)}\n`;
    if (WRITE) {
      mkdirSync(DIR, { recursive: true });
      writeFileSync(FILE, text);
      return;
    }
    expect(JSON.parse(text)).toEqual(JSON.parse(readFileSync(FILE, 'utf8')));
  });
});
