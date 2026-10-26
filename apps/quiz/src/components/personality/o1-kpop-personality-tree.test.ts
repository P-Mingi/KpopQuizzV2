import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { clientRefsOf, flightTree } from '@/lib/o1-flight-tree';

// Run O1, lane PERS-2: the kpop Which member are you page /personality/[group] must keep what it produced before the shared blocks
// (about.tsx, quiz.tsx) took the words of the site. Compared with __o1_kpop_personality_tree__/page.json, written ONLY from the base
// commit 0ac079b (never from the head): O1_WRITE_TREE=1 writes it, a plain run compares.
//   exports   the exports of the page module
//   metadata  what generateMetadata returns
//   tree      the React Flight tree of the page, walked like the serializer (client components as "$L" with their props, server
//             components expanded: so the props of quiz.tsx and the whole output of about.tsx are in it)
//   graph     the local modules reached by the static runtime imports of the page, of quiz.tsx and of about.tsx

const DIR = fileURLToPath(new URL('./__o1_kpop_personality_tree__/', import.meta.url));
const FILE = `${DIR}page.json`;
const WRITE = process.env.O1_WRITE_TREE === '1';
const SRC = fileURLToPath(new URL('../..', import.meta.url));

const flags = globalThis as { __v12?: boolean };

const AX = (energy: number): Record<string, number> => ({ energy, chaos: 50, care: 50, craft: 50, heart: 50, spotlight: 50 });
const NAMES = ['RM', 'Jin', 'Suga'];
const VIEW = {
  quiz: 'wma', groupSlug: 'bts', kicker: 'Which member are you', kickerIcon: 'users',
  title: { before: 'Which ', em: 'BTS', after: ' member are you?' },
  lead: 'Eight questions about you.', meta: ['2 questions', 'About 2 minutes'], cta: 'Start', eyebrow: 'You are', who: 'ARMY',
  questions: [1, 2].map((n) => ({ text: `Question ${n}?`, options: [{ text: 'Quiet', icon: 'users' }, { text: 'Loud', icon: 'music' }] })),
  engine: { kind: 'axes', questions: [], profiles: NAMES.map((name, i) => ({ id: name.toLowerCase(), name, axes: AX(i * 40) })) },
  results: NAMES.map((name) => ({ id: name.toLowerCase(), name, role: 'Leader', description: `About ${name}.`, traits: ['Calm', 'Loyal'], photo: null })),
  distribution: { total: 140, rows: [{ id: 'rm', label: 'RM', pct: 54.29 }, { id: 'jin', label: 'Jin', pct: 30 }, { id: 'suga', label: 'Suga', pct: 15.71 }] },
  shareUrl: 'https://kpopquiz.org/which-bts-member-are-you', shareKicker: 'Which BTS member are you', biasOffer: true,
};

vi.mock('@/lib/ux-v12', () => ({ isUxV12: () => flags.__v12 === true }));
vi.mock('@/lib/personality/server', () => ({
  SITE: 'https://kpopquiz.org',
  getWmaPage: async (slug: string) => (slug === 'bts' ? { group: { id: 3, slug: 'bts', name: 'BTS', fandom: 'ARMY' }, view: VIEW, blindtestSongs: 40 } : null),
}));
vi.mock('@/lib/db/queries/groups', () => ({ getAllGroups: async () => [{ slug: 'bts', name: 'BTS' }, { slug: 'twice', name: 'TWICE' }, { slug: 'stray-kids', name: 'Stray Kids' }] }));
vi.mock('@/lib/personality/data', () => ({ getWmaGroupSlugs: async () => ['bts', 'twice', 'stray-kids'] }));
vi.mock('@/lib/ux-v1/p6/hub-data', () => ({
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
const PAGE = `${SRC}app/(site)/personality/[group]/page.tsx`;
const QUIZ = `${SRC}components/personality/quiz.tsx`;
const ABOUT = `${SRC}components/personality/about.tsx`;

beforeAll(async () => {
  const found = await clientRefsOf([PAGE]);
  expect(found.unloaded).toEqual([]);
  refs = found.refs;
});

afterAll(() => {
  flags.__v12 = undefined as unknown as boolean;
});

describe('the kpop Which member are you page keeps its output', () => {
  it('exports, metadata, Flight tree (props of quiz.tsx, output of about.tsx) and module graph', async () => {
    flags.__v12 = true;
    const mod = (await import('@/app/(site)/personality/[group]/page')) as unknown as {
      default: (p: unknown) => Promise<unknown>;
      generateMetadata: (p: unknown) => Promise<unknown>;
    };
    const props = { params: Promise.resolve({ group: 'bts' }) };
    const tree = await flightTree(await mod.default(props), { client: refs });
    const got = {
      exports: Object.keys(mod).sort(),
      metadata: await mod.generateMetadata(props),
      tree,
      graph: { page: graphOf(PAGE), quiz: graphOf(QUIZ), about: graphOf(ABOUT) },
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
