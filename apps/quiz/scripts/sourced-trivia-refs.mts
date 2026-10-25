// The references of the sourced trivia files (src/lib/trivia/sourced/*.json), read, never typed
// (SEO Mission 2, part E; rulebook sections 5.6 and 7):
//   - wikidata: the Wikidata item linked from the group's Wikipedia article (Wikipedia API,
//     pageprops.wikibase_item, redirects followed);
//   - groupsData: what the site already shows for the group, read from the database with the
//     public anon key like the pages: groups.name, groups.generation, and the member count of
//     the published Name them all game.
// The fact-lint (npm run check:fact-lint) checks every fact against these two, so a fact can
// never contradict the group data the rest of the site shows.
//
// Read-only by default: prints every difference and exits 1 when there is one (a nightly job
// can run it as `npm run check:fact-lint-refs`). With --write it rewrites only the wikidata
// and groupsData fields of each file. It never writes to the database.
//
//   npx tsx scripts/sourced-trivia-refs.mts           # check
//   npx tsx scripts/sourced-trivia-refs.mts --write   # refresh the references
//
// Requests carry a generic User-Agent and nothing about the person running the script.

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { createClient } from '@supabase/supabase-js';

const DIR = fileURLToPath(new URL('../src/lib/trivia/sourced/', import.meta.url));
const UA = 'Mozilla/5.0';

// Prefer .env.local when it exists (local runs), else the process env (CI), as check-indexability does.
const env: Record<string, string | undefined> = (() => {
  try {
    return Object.fromEntries(
      readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
        .split('\n').filter((l) => l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; }),
    );
  } catch {
    return process.env;
  }
})();

interface FileRefs {
  group: string;
  wikipedia: string;
  wikidata: string | null;
  groupsData: { name: string; generation: string | null; memberCount: number | null; readAt: string };
}

function titleOf(url: string): string {
  return decodeURIComponent(new URL(url).pathname.replace(/^\/wiki\//, '')).replace(/_/g, ' ');
}

async function qidFor(title: string): Promise<string> {
  const params = new URLSearchParams({ action: 'query', format: 'json', redirects: '1', prop: 'pageprops', ppprop: 'wikibase_item', titles: title });
  let res = await fetch(`https://en.wikipedia.org/w/api.php?${params}`, { headers: { 'User-Agent': UA } });
  // Wikimedia rate-limits generic clients: wait and retry a few times instead of failing.
  for (let attempt = 1; res.status === 429 && attempt <= 4; attempt++) {
    const wait = Math.min(60, Number(res.headers.get('retry-after')) || 10 * attempt);
    await new Promise((r) => setTimeout(r, wait * 1000));
    res = await fetch(`https://en.wikipedia.org/w/api.php?${params}`, { headers: { 'User-Agent': UA } });
  }
  if (!res.ok) throw new Error(`Wikipedia API ${res.status}`);
  const body = (await res.json()) as { query: { pages: Record<string, { pageprops?: { wikibase_item?: string } }> } };
  return Object.values(body.query.pages)[0]?.pageprops?.wikibase_item ?? '';
}

async function main(): Promise<void> {
  const write = process.argv.includes('--write');
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are needed (read-only).');
  const db = createClient(url, key, { auth: { persistSession: false } });
  const today = new Date().toISOString().slice(0, 10);

  let diffs = 0;
  for (const name of readdirSync(DIR).filter((f) => f.endsWith('.json')).sort()) {
    const path = `${DIR}${name}`;
    const data = JSON.parse(readFileSync(path, 'utf8')) as FileRefs & Record<string, unknown>;
    let fileDiffs = 0;
    const say = (msg: string): void => { console.log(`${data.group}: ${msg}`); diffs++; fileDiffs++; };

    const qid = await qidFor(titleOf(data.wikipedia));
    if (!/^Q\d+$/.test(qid)) say(`no Wikidata item for ${data.wikipedia}`);
    else if (qid !== data.wikidata) { say(`wikidata stored ${data.wikidata ?? '(none)'}, Wikipedia links ${qid}`); if (write) data.wikidata = qid; }
    // A fact that cites Wikidata cites the group item: its URL is written here too, never typed.
    if (/^Q\d+$/.test(qid)) {
      const itemUrl = `https://www.wikidata.org/wiki/${qid}`;
      for (const f of (data.facts as Array<{ id: string; sources?: Array<{ type: string; url: string }> }> | undefined) ?? []) {
        for (const s of f.sources ?? []) {
          if (s.type === 'wikidata' && s.url !== itemUrl) { say(`${f.id}: Wikidata source ${s.url}, group item ${itemUrl}`); if (write) s.url = itemUrl; }
        }
      }
    }

    const { data: g, error } = await db.from('groups').select('id, name, generation').eq('slug', data.group).maybeSingle();
    if (error || !g) throw new Error(`groups row for ${data.group}: ${error?.message ?? 'not found'}`);
    const { data: game } = await db.from('games').select('content').eq('group_id', g.id).eq('game_type', 'name_all_members').eq('status', 'published').limit(1).maybeSingle();
    const members = ((game?.content as { members?: Array<{ name?: string }> } | null)?.members ?? []).filter((m) => typeof m?.name === 'string' && m.name.trim());
    const live = { name: g.name as string, generation: (g.generation as string | null) ?? null, memberCount: members.length > 0 ? members.length : null };
    const stored = data.groupsData;
    for (const k of ['name', 'generation', 'memberCount'] as const) {
      if (stored?.[k] !== live[k]) say(`groupsData.${k} stored ${JSON.stringify(stored?.[k])}, database ${JSON.stringify(live[k])}`);
    }
    if (write && fileDiffs > 0) {
      data.groupsData = { ...live, readAt: today };
      writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  if (write) console.log(diffs > 0 ? `updated ${diffs} reference(s)` : 'references already current');
  else if (diffs > 0) process.exit(1);
  else console.log('sourced trivia references match Wikidata and the groups data');
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
