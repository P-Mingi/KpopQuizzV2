// Self-test of twins.mts (rule 18): each fixture tree gives its expected exit and exactly its expected violations.
// Fixture trees are written to a temporary folder at test time: the partial copy of components/ux-v1/panel.tsx is
// made from the real file there and never committed, so the repository itself holds no copy for the check to find.
// The scenarios call the command line's main() in this process (one TypeScript load); the last test spawns the real
// command for its process exit codes.
// Run: node --test apps/quiz/scripts/o1/twins.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { main, normalizedLines, parseSource, SHINGLE } from './twins.mts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(HERE, 'twins.mts');
const PANEL = fs.readFileSync(path.join(HERE, '../../src/components/ux-v1/panel.tsx'), 'utf8');
const S = 'apps/quiz/src/app/sites/[site]';

const TWINS = {
  version: 'test',
  differenceCodes: { T: 'theme', B: 'brand', V: 'vocabulary', C: 'copy', F: 'features off', N: 'no K-pop' },
  pages: [
    { id: '1', site: 'anime', route: '/', file: `${S}/page.tsx`, twin: 'app/(site)/page.tsx', mustImport: ['@/components/ux-v1/panel'], allowed: ['T', 'B', 'V', 'C'] },
    {
      id: '3', site: 'anime', route: '/{series}-quiz', file: `${S}/[slug]/page.tsx`, twin: 'app/(site)/[slug]/page.tsx',
      mustImport: ['@/components/group/ux-v1/hub', '@/components/group/ux-v1/hub-quizzes', '@/components/ux-v1/panel'], allowed: ['T', 'B', 'V', 'C', 'F', 'N'],
    },
    { id: '37', site: 'anime', route: 'technical', file: [`${S}/[...rest]/page.tsx`, `${S}/robots.txt/route.ts`], twin: null, mustImport: [], allowed: [] },
  ],
};

// The shared components of the fixture (the real panel.tsx, a small shared hub that renders hub-quizzes).
const SHARED = {
  'apps/quiz/src/components/ux-v1/panel.tsx': PANEL,
  'apps/quiz/src/components/ux-v1/icon.tsx': "export type UxIconName = 'star';\nexport function Icon({ name }: { name: UxIconName }) { return <i data-icon={name} />; }\n",
  'apps/quiz/src/components/group/ux-v1/hub-quizzes.tsx': "export function HubQuizzes({ items }: { items: string[] }) {\n  return <ul className=\"ux-hubq\">{items.map((t) => <li key={t}>{t}</li>)}</ul>;\n}\n",
  'apps/quiz/src/components/group/ux-v1/hub.tsx': "import { HubQuizzes } from './hub-quizzes';\nexport function GroupHub({ name, quizzes, slots }: { name: string; quizzes: string[]; slots?: React.ReactNode }) {\n  return <main className=\"ux-hub\"><h1>{name}</h1>{slots}<HubQuizzes items={quizzes} /></main>;\n}\n",
};

// A clean anime tree: ordinary imports, short JSX patterns, a module of the page's own folder, a technical row.
const CLEAN = {
  ...SHARED,
  [`${S}/page.tsx`]: "import { Panel, UxRow } from '@/components/ux-v1/panel';\n\nexport default function Home() {\n  return (\n    <Panel title=\"Popular series\">\n      <div className=\"ux-rows\">\n        <UxRow href=\"/q/a\" title=\"First quiz\" />\n        <UxRow href=\"/q/b\" title=\"Second quiz\" />\n      </div>\n    </Panel>\n  );\n}\n",
  [`${S}/[slug]/series-hub.tsx`]: "import { GroupHub } from '@/components/group/ux-v1/hub';\nexport function SeriesHub({ name }: { name: string }) {\n  return <GroupHub name={name} quizzes={['a', 'b']} />;\n}\n",
  [`${S}/[slug]/page.tsx`]: "import { Panel } from '@/components/ux-v1/panel';\nimport { SeriesHub } from './series-hub';\n\nexport default async function Page({ params }: { params: Promise<{ slug: string }> }) {\n  const { slug } = await params;\n  return <Panel title=\"Series facts\"><SeriesHub name={slug} /></Panel>;\n}\n",
  [`${S}/[...rest]/page.tsx`]: "import { notFound } from 'next/navigation';\nexport default function Rest(): never { notFound(); }\n",
  [`${S}/robots.txt/route.ts`]: "export function GET() { return new Response('User-agent: *\\nAllow: /\\n'); }\n",
  [`${S}/_parts/page.tsx`]: "export const privateFolderIsNotARoute = true;\n",
};

/** The Panel and UxBox functions of the real panel.tsx, as a fork would take them: renamed, comments dropped, reindented. */
function forkedPanel({ withUxBox = true, uxBoxBody = true } = {}) {
  const start = PANEL.indexOf('export function Panel(');
  const box = PANEL.indexOf('export function UxBox(');
  const end = PANEL.indexOf('/** Three numbers');
  assert.ok(start > 0 && box > start && end > box, 'panel.tsx still has Panel, then UxBox, then UxStatsRow');
  let block = PANEL.slice(start, withUxBox ? end : box).replace(/\/\*\*[\s\S]*?\*\//g, '');
  if (withUxBox && !uxBoxBody) block = block.replace(/(export function UxBox\([^\n]*\{)\n[^\n]*\n\}/, '$1\n  return null;\n}');
  block = block.replace(/\bPanel\b/g, 'SeriesPanel').replace(/\bUxBox\b/g, 'SeriesBox').replace(/\bTag\b/g, 'El')
    .replace(/\bH\b/g, 'Heading').replace(/PanelProps/g, 'SeriesPanelProps');
  return block.split('\n').map((l) => (l ? `  ${l}` : l)).join('\n');
}

function page(withCopy) {
  return "import { Panel } from '@/components/ux-v1/panel';\nimport { Icon } from '@/components/ux-v1/icon';\nimport type { UxIconName } from '@/components/ux-v1/icon';\n\n"
    + "interface SeriesPanelProps { title?: React.ReactNode; icon?: UxIconName; aside?: React.ReactNode; sub?: React.ReactNode; children: React.ReactNode; as?: 'section' | 'div' | 'aside'; titleAs?: 'h2' | 'h3'; label?: string; className?: string }\n\n"
    + `${withCopy}\n\nexport default function Home() {\n  return <Panel title="Series"><SeriesPanel title="Arcs" icon="star">x</SeriesPanel><SeriesBox>y</SeriesBox></Panel>;\n}\n`;
}

function tree(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'twins-'));
  for (const [rel, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), text);
  }
  return root;
}

/** main() with its console captured: the command line's exact output and exit code, in this process. */
function cli(argv) {
  const out = [];
  const log = console.log;
  const err = console.error;
  console.log = (...a) => out.push(a.join(' '));
  console.error = (...a) => out.push(a.join(' '));
  try { return { code: main(argv), stdout: `${out.join('\n')}\n` }; } finally { console.log = log; console.error = err; }
}

function run(files, { twins = TWINS, baseline = null } = {}) {
  const root = tree(files);
  const tw = path.join(root, 'twins.json');
  fs.writeFileSync(tw, typeof twins === 'string' ? twins : JSON.stringify(twins));
  const bl = path.join(root, 'baseline.json');
  if (baseline) fs.writeFileSync(bl, JSON.stringify(baseline));
  const out = path.join(root, 'out.json');
  const r = cli(['--root', root, '--twins', tw, '--baseline', baseline ? bl : path.join(root, 'none.json'), '--json', out]);
  const json = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, 'utf8')) : null;
  fs.rmSync(root, { recursive: true, force: true });
  return { code: r.code, stdout: r.stdout.split(root).join('<root>'), json, kinds: (json?.violations ?? []).map((v) => v.kind) };
}

const meaningful = (code) => normalizedLines(parseSource('x.tsx', code)).length;

test('clean tree: ordinary imports, short JSX, own-folder module, technical row, private folder: exit 0', () => {
  const r = run(CLEAN);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.deepEqual(r.kinds, []);
  assert.match(r.stdout, /twins: ok/);
  assert.equal(r.json.counts.screens, 3, 'page, [slug]/page and [...rest]/page (not _parts, not route.ts)');
});

test('planted unlisted page: exit 1, unlisted-page only', () => {
  const r = run({ ...CLEAN, [`${S}/fan-wall/page.tsx`]: "export default function FanWall() { return <section>Wall</section>; }\n" });
  assert.equal(r.code, 1);
  assert.deepEqual(r.kinds, ['unlisted-page']);
  assert.equal(r.json.violations[0].file, `${S}/fan-wall/page.tsx`);
});

test('page missing an import: exit 1, missing-import for the hub and what it renders', () => {
  const r = run({ ...CLEAN, [`${S}/[slug]/page.tsx`]: "import { Panel } from '@/components/ux-v1/panel';\nexport default function Page() {\n  return <Panel title=\"Series\"><main className=\"series-hub\">Own hub</main></Panel>;\n}\n" });
  assert.equal(r.code, 1);
  assert.deepEqual(r.kinds, ['missing-import', 'missing-import']);
  assert.deepEqual(r.json.violations.map((v) => v.detail.split(' ')[3]).sort(), ['@/components/group/ux-v1/hub', '@/components/group/ux-v1/hub-quizzes']);
});

test('partial copy of components/ux-v1/panel.tsx (Panel and UxBox, renamed, no comments): exit 1, copy only', () => {
  const fork = forkedPanel();
  assert.ok(meaningful(fork) >= SHINGLE, `the fork has ${meaningful(fork)} meaningful lines`);
  const r = run({ ...CLEAN, [`${S}/page.tsx`]: page(fork) });
  assert.equal(r.code, 1, r.stdout);
  assert.deepEqual(r.kinds, ['copy']);
  assert.equal(r.json.violations[0].file, `${S}/page.tsx`);
  assert.match(r.json.violations[0].detail, /copies apps\/quiz\/src\/components\/ux-v1\/panel\.tsx: \d+ meaningful lines/);
});

test('threshold: 7 meaningful lines of panel.tsx pass, the same block with its 8th line fails', () => {
  const seven = forkedPanel({ uxBoxBody: false });
  const eight = forkedPanel();
  assert.equal(meaningful(seven) - meaningful(eight), -1);
  const r7 = run({ ...CLEAN, [`${S}/page.tsx`]: page(seven) });
  assert.equal(r7.code, 0, r7.stdout);
  const r8 = run({ ...CLEAN, [`${S}/page.tsx`]: page(eight) });
  assert.equal(r8.code, 1, r8.stdout);
  assert.deepEqual(r8.kinds, ['copy']);
});

test('a copy outside app/sites (an anime fork in components/) fails too', () => {
  const r = run({ ...CLEAN, 'apps/quiz/src/components/anime/series-panel.tsx': page(forkedPanel()) });
  assert.equal(r.code, 1);
  assert.deepEqual(r.kinds, ['copy']);
  assert.equal(r.json.violations[0].file, 'apps/quiz/src/components/anime/series-panel.tsx');
});

test('counting rules: a type-only import, an unused import and a side-effect import do not count', () => {
  const home = (imp, body) => ({ ...CLEAN, [`${S}/page.tsx`]: `${imp}\nexport default function Home() { return ${body}; }\n` });
  for (const files of [
    home("import type { UxRow } from '@/components/ux-v1/panel';", '<section>Home</section>'),
    home("import { Panel } from '@/components/ux-v1/panel';", '<section>Home</section>'),
    home("import '@/components/ux-v1/panel';", '<section>Home</section>'),
  ]) {
    const r = run(files);
    assert.equal(r.code, 1);
    assert.deepEqual(r.kinds, ['missing-import']);
  }
  // A dynamic import and an `export ... from` count; so does a relative path to the same module.
  for (const files of [
    home("import dynamic from 'next/dynamic';\nconst P = dynamic(() => import('@/components/ux-v1/panel').then((m) => m.Panel));", '<P title="x">y</P>'),
    { ...CLEAN, [`${S}/page.tsx`]: "export { default } from './home';\n", [`${S}/home.tsx`]: "import { Panel } from '../../../components/ux-v1/panel';\nexport default function Home() { return <Panel title=\"x\">y</Panel>; }\n" },
  ]) {
    const r = run(files);
    assert.equal(r.code, 0, r.stdout);
  }
});

test('a wrapper outside the page folder does not count (no anime version of the hub)', () => {
  const r = run({
    ...CLEAN,
    'apps/quiz/src/components/anime/series-hub.tsx': "import { GroupHub } from '@/components/group/ux-v1/hub';\nexport function SeriesHub({ name }: { name: string }) { return <GroupHub name={name} quizzes={[]} />; }\n",
    [`${S}/[slug]/page.tsx`]: "import { Panel } from '@/components/ux-v1/panel';\nimport { SeriesHub } from '@/components/anime/series-hub';\nexport default function Page() { return <Panel title=\"x\"><SeriesHub name=\"x\" /></Panel>; }\n",
  });
  assert.equal(r.code, 1);
  assert.deepEqual(r.kinds, ['missing-import', 'missing-import']);
});

test('a technical row (no twin) whose file renders JSX: exempt-renders', () => {
  const r = run({ ...CLEAN, [`${S}/[...rest]/page.tsx`]: "export default function Rest() { return <div>Nothing here</div>; }\n" });
  assert.equal(r.code, 1);
  assert.deepEqual(r.kinds, ['exempt-renders']);
});

test('a mustImport module missing from the tree: mustimport-unresolved', () => {
  const twins = structuredClone(TWINS);
  twins.pages[0].mustImport.push('@/components/ux-v1/gone');
  const r = run(CLEAN, { twins });
  assert.equal(r.code, 1);
  assert.deepEqual(r.kinds, ['mustimport-unresolved']);
});

test('baseline: a kpop copy of the base passes within its recorded size and fails when it grows', () => {
  const oldFile = 'apps/quiz/src/components/quiz/old-panel.tsx';
  const files = { ...CLEAN, [oldFile]: page(forkedPanel()) };
  const first = run(files);
  assert.deepEqual(first.kinds, ['copy']);
  const lines = first.json.violations[0].detail.match(/: (\d+) meaningful/)[1];
  const baseline = { shingle: SHINGLE, pairs: [{ files: ['apps/quiz/src/components/ux-v1/panel.tsx', oldFile], lines: Number(lines) }] };
  const within = run(files, { baseline });
  assert.equal(within.code, 0, within.stdout);
  assert.equal(within.json.known.length, 1);
  const grown = PANEL.slice(PANEL.indexOf('export function Panel('), PANEL.indexOf('interface UxRowProps')).replace(/\/\*\*[\s\S]*?\*\//g, '');
  const more = run({ ...files, [oldFile]: page(grown.replace(/\bPanel\b/g, 'SeriesPanel').replace(/\bUxBox\b/g, 'SeriesBox')) }, { baseline });
  assert.equal(more.code, 1, more.stdout);
  assert.match(more.json.violations[0].detail, new RegExp(`base had ${lines}\\)`));
  // A baseline of another shingle size is ignored (re-measure after a threshold change).
  assert.equal(run(files, { baseline: { ...baseline, shingle: SHINGLE + 1 } }).code, 1);
});

test('exit 2: no pages array, unreadable JSON, a row without file, missing arguments', () => {
  assert.equal(run(CLEAN, { twins: { version: 1 } }).code, 2);
  assert.equal(run(CLEAN, { twins: '{not json' }).code, 2);
  assert.equal(run(CLEAN, { twins: { pages: [{ id: 'x', mustImport: [] }] } }).code, 2);
  assert.equal(run(CLEAN, { twins: { pages: [{ id: 'x', file: 'app/sites/[site]/page.tsx', mustImport: 'no' }] } }).code, 2);
  assert.equal(cli([]).code, 2);
});

test('deterministic: the same tree gives the same output twice', () => {
  const files = { ...CLEAN, [`${S}/page.tsx`]: page(forkedPanel()), [`${S}/fan-wall/page.tsx`]: "export default function F() { return <p>x</p>; }\n" };
  const a = run(files);
  const b = run(files);
  assert.equal(a.stdout, b.stdout);
  assert.deepEqual(a.kinds, ['copy', 'unlisted-page']);
});

test('the command itself (as check.sh runs it): process exit 0 clean, 1 on a violation, 2 without arguments', () => {
  const root = tree({ ...CLEAN, [`${S}/fan-wall/page.tsx`]: "export default function F() { return <p>x</p>; }\n" });
  const tw = path.join(root, 'twins.json');
  fs.writeFileSync(tw, JSON.stringify(TWINS));
  const none = path.join(root, 'none.json');
  const go = (args) => spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });
  try {
    const bad = go(['--root', root, '--twins', tw, '--baseline', none]);
    assert.equal(bad.status, 1, bad.stdout + bad.stderr);
    assert.match(bad.stdout, /FAIL unlisted-page apps\/quiz\/src\/app\/sites\/\[site\]\/fan-wall\/page\.tsx/);
    fs.rmSync(path.join(root, S, 'fan-wall'), { recursive: true });
    const ok = go(['--root', root, '--twins', tw, '--baseline', none]);
    assert.equal(ok.status, 0, ok.stdout + ok.stderr);
    assert.equal(go([]).status, 2);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
