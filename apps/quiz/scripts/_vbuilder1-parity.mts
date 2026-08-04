// V-BUILDER-1 step 1 parity proof (throwaway harness): for bts + stray-kids + ateez,
// round-trip presentation -> Composition -> presentation and assert (a) the resolved
// placements the renderer consumes are byte-identical, (b) all page-level meta is
// preserved verbatim, (c) every block has a stable, non-index id.
//   pnpm -C apps/quiz exec tsx scripts/_vbuilder1-parity.mts
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

import { presentationToComposition, compositionToPresentation } from '../src/lib/verse/composition/convert';
import { resolvePlacements, placementsForZone } from '../src/lib/verse/presentation/resolve';
import { validatePresentation } from '../src/lib/verse/presentation/validate';
import type { Presentation } from '../src/lib/verse/presentation/types';

const env = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n').filter((l) => l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; }));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

// render-relevant fields of a placement (order is only a sort key -> excluded).
const renderSig = (ps: ReturnType<typeof resolvePlacements>) =>
  (['main', 'side'] as const).map((z) => placementsForZone(ps, z).map((m) => ({ type: m.type, zone: m.zone, hidden: m.hidden ?? false, frame: m.frame ?? null, mode: m.mode ?? null, props: m.props ?? null })));

const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const stripModules = (p: Presentation) => { const { modules, ...rest } = p; void modules; return rest; };

let allPass = true;
for (const slug of ['bts', 'stray-kids', 'ateez']) {
  const { data: g } = await db.from('groups').select('id').eq('slug', slug).maybeSingle();
  if (!g) { console.log(`SKIP ${slug}: no group`); continue; }
  const { data: row } = await db.from('verse_spaces').select('presentation').eq('group_id', (g as { id: number }).id).maybeSingle();
  const raw = (row as { presentation?: unknown } | null)?.presentation;
  const p = validatePresentation(raw ?? {}).value; // the live, validated presentation

  const comp = presentationToComposition(p);
  const p2 = compositionToPresentation(comp);

  // (a) byte-parity of the renderer input
  const renderParity = eq(renderSig(resolvePlacements(p)), renderSig(resolvePlacements(p2)));
  // (b) meta preserved verbatim
  const metaParity = eq(stripModules(p), stripModules(p2));
  // (c) stable, unique, non-index ids
  const ids = comp.sections.flatMap((s) => s.blocks.map((b) => b.id));
  const idsOk = ids.every((id) => /^blk-[a-z_]+-\d+$/.test(id)) && new Set(ids).size === ids.length;

  const pass = renderParity && metaParity && idsOk;
  allPass = allPass && pass;
  console.log(`${pass ? 'PASS' : 'FAIL'} ${slug.padEnd(11)} modules=${(p.modules ?? []).length} blocks=${ids.length}  render-parity=${renderParity} meta-lossless=${metaParity} stable-ids=${idsOk}`);
  if (!pass) {
    if (!renderParity) console.log('   render diff:', JSON.stringify(renderSig(resolvePlacements(p))), '\n   vs         ', JSON.stringify(renderSig(resolvePlacements(p2))));
    if (!metaParity) console.log('   meta diff:', JSON.stringify(stripModules(p)), '\n   vs       ', JSON.stringify(stripModules(p2)));
  }
}
console.log(allPass ? '\nALL PASS: converter is lossless + byte-parity on the renderer input.' : '\nFAILURES above.');
process.exit(allPass ? 0 : 1);
