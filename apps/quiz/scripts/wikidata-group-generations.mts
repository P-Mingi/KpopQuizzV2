// Wikidata ids of src/lib/generations/group-generations.json, fetched, never typed (rulebook
// section 7: "Fetch Wikidata IDs programmatically. Never hand-type a QID").
//
// For every act of the file, reads the Wikidata item linked to its Wikipedia article
// (Wikipedia API, pageprops.wikibase_item, redirects followed) and compares it with the
// stored id. Read-only by default: prints the differences and exits 1 when there is one.
// With --write it rewrites the wikidata fields in place (nothing else in the file changes).
//
//   npx tsx scripts/wikidata-group-generations.mts           # check
//   npx tsx scripts/wikidata-group-generations.mts --write   # refresh the ids
//
// Requests carry a generic User-Agent and nothing about the person running the script.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const FILE = fileURLToPath(new URL('../src/lib/generations/group-generations.json', import.meta.url));
const UA = 'Mozilla/5.0';
const BATCH = 40;

type Group = { wikipedia: string; wikidata: string };
type Data = { groups: Record<string, Group> };

function titleOf(url: string): string {
  const path = new URL(url).pathname.replace(/^\/wiki\//, '');
  return decodeURIComponent(path).replace(/_/g, ' ');
}

async function qidsFor(titles: string[]): Promise<Map<string, string>> {
  const params = new URLSearchParams({
    action: 'query', format: 'json', redirects: '1', prop: 'pageprops', ppprop: 'wikibase_item', titles: titles.join('|'),
  });
  const res = await fetch(`https://en.wikipedia.org/w/api.php?${params}`, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Wikipedia API ${res.status}`);
  const body = (await res.json()) as {
    query: {
      normalized?: Array<{ from: string; to: string }>;
      redirects?: Array<{ from: string; to: string }>;
      pages: Record<string, { title: string; pageprops?: { wikibase_item?: string } }>;
    };
  };
  const norm = new Map((body.query.normalized ?? []).map((n) => [n.from, n.to]));
  const redir = new Map((body.query.redirects ?? []).map((n) => [n.from, n.to]));
  const byTitle = new Map(Object.values(body.query.pages).map((p) => [p.title, p.pageprops?.wikibase_item ?? '']));
  const out = new Map<string, string>();
  for (const t of titles) {
    const n = norm.get(t) ?? t;
    out.set(t, byTitle.get(redir.get(n) ?? n) ?? '');
  }
  return out;
}

async function main(): Promise<void> {
  const write = process.argv.includes('--write');
  const text = readFileSync(FILE, 'utf8');
  const data = JSON.parse(text) as Data;
  const entries = Object.entries(data.groups);
  const found = new Map<string, string>();
  for (let i = 0; i < entries.length; i += BATCH) {
    const titles = entries.slice(i, i + BATCH).map(([, g]) => titleOf(g.wikipedia));
    for (const [t, q] of await qidsFor(titles)) found.set(t, q);
    await new Promise((r) => setTimeout(r, 1000));
  }
  let diffs = 0;
  for (const [slug, g] of entries) {
    const q = found.get(titleOf(g.wikipedia)) ?? '';
    if (!/^Q\d+$/.test(q)) {
      console.log(`${slug}: no Wikidata item for ${g.wikipedia}`);
      diffs++;
      continue;
    }
    if (q !== g.wikidata) {
      console.log(`${slug}: stored ${g.wikidata || '(none)'}, Wikipedia links ${q}`);
      diffs++;
      if (write) g.wikidata = q;
    }
  }
  if (write && diffs > 0) {
    writeFileSync(FILE, `${JSON.stringify(data, null, 2)}\n`);
    console.log(`wrote ${FILE}`);
  }
  console.log(`${entries.length} acts checked, ${diffs} difference(s)`);
  if (!write && diffs > 0) process.exit(1);
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
