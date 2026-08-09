// V-FOUNDATION F3 - backfill is_stub for the seeded non-idol entity pages to the per-kind
// rule (railGrantsIndex): a release WITH a tracklist and an era WITH releases take the
// fact-rail exemption (indexable); a bare track / award stays a noindex stub until body prose.
// Idempotent: only rows whose stored is_stub disagrees with the rule are updated. Reads live
// richness; touches NO schema. Seeded shells have empty bodies, so the rail alone decides.
//   pnpm -C apps/quiz exec tsx scripts/backfill-vfoundation-f3-isstub.mts [--apply]
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { railGrantsIndex } from '../src/lib/verse/tree/factrail';
import { bodyIsSubstantial } from '../src/lib/verse/tree/blocks';

const env = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n').filter((l) => l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; }));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const SPACE = 1;
const APPLY = process.argv.includes('--apply');
const KINDS = ['album', 'track', 'era', 'award'] as const;

for (const kind of KINDS) {
  const { data } = await db.from('pages').select('id, slug, entity_id, is_stub, blocks')
    .eq('space_id', SPACE).eq('entity_kind', kind).eq('status', 'published').limit(1000);
  const rows = (data as { id: number; slug: string; entity_id: number; is_stub: boolean; blocks: unknown }[] | null) ?? [];
  let flipIndexable = 0, flipStub = 0, already = 0;
  for (const p of rows) {
    const railIndex = await railGrantsIndex(db, kind, p.entity_id);
    const substantial = bodyIsSubstantial(p.blocks as never);
    const wantStub = !(railIndex || substantial);
    if (wantStub === p.is_stub) { already += 1; continue; }
    if (!wantStub) flipIndexable += 1; else flipStub += 1;
    if (APPLY) await db.from('pages').update({ is_stub: wantStub }).eq('id', p.id);
  }
  console.log(`${kind.padEnd(6)} total=${String(rows.length).padStart(4)}  ->indexable=${flipIndexable}  ->stub=${flipStub}  unchanged=${already}${APPLY ? '  [APPLIED]' : '  [dry-run]'}`);
}
console.log(APPLY ? '\nbackfill applied.' : '\ndry-run only; pass --apply to write.');
