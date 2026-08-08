// V-FOUNDATION F1 Phase C part 2 (C11) - migrate the bts space home into a PORTAL page
// and PROVE the rebind is lossless: the composition the home renders from the portal page
// (pages.blocks) is byte-identical to the one it rendered from verse_spaces.presentation.
// This is a REAL migration (the bts portal page persists - C11 migrates bts).
//   pnpm -C apps/quiz exec tsx scripts/proof-vfoundation-f1-phasec2.mts
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

import { presentationToComposition } from '../src/lib/verse/composition/convert';
import { validatePresentation } from '../src/lib/verse/presentation/validate';
import { upsertPortalPage, getPortalComposition, PORTAL_SLUG } from '../src/lib/verse/tree/portal';

const env = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n').filter((l) => l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; }));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const SPACE = 1; // bts
const AUTHOR = '00000000-0000-4000-8000-00000000110c';
let failures = 0;
const check = (name: string, cond: boolean, detail = ''): void => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? `  -> ${detail}` : ''}`); if (!cond) failures += 1; };

// 1) the legacy live presentation + the composition the home renders TODAY.
const { data: row } = await db.from('verse_spaces').select('presentation').eq('group_id', SPACE).maybeSingle();
const live = validatePresentation((row as { presentation?: unknown } | null)?.presentation ?? { version: 1 });
const compBefore = presentationToComposition(live.value ?? { version: 1 });
check('bts has a validated live presentation', live.ok, `${(live.value?.modules?.length ?? 0)} modules`);

// 2) MIGRATE: mirror it into the portal page (the re-pointed write target, C11).
await upsertPortalPage(db, SPACE, live.value ?? { version: 1 }, AUTHOR);

// 3) the portal page row + the composition the home renders AFTER the rebind.
const { data: portal } = await db.from('pages').select('id, slug, type, status, is_stub, blocks').eq('space_id', SPACE).eq('slug', PORTAL_SLUG).maybeSingle();
const p = portal as { id: number; slug: string; type: string; status: string; is_stub: boolean } | null;
check('portal page exists (slug=home, type=portal)', p?.type === 'portal' && p?.slug === PORTAL_SLUG, `${p?.slug}/${p?.type}`);
check('portal page is published + not a stub', p?.status === 'published' && p?.is_stub === false, `${p?.status} stub=${p?.is_stub}`);

const compAfter = await getPortalComposition(db, SPACE);
check('home renders from the portal page (composition present)', !!compAfter, compAfter ? 'ok' : 'null');

// 4) PARITY: the composition is byte-identical before (verse_spaces) and after (portal).
check('C11 REBIND IS LOSSLESS: portal composition === legacy composition (byte parity)',
  JSON.stringify(compAfter) === JSON.stringify(compBefore),
  JSON.stringify(compAfter) === JSON.stringify(compBefore) ? 'identical' : 'DIVERGED');

// 5) idempotent: a second migrate does not change the row shape.
await upsertPortalPage(db, SPACE, live.value ?? { version: 1 }, AUTHOR);
const { count } = await db.from('pages').select('id', { count: 'exact', head: true }).eq('space_id', SPACE).eq('slug', PORTAL_SLUG);
check('idempotent: exactly one portal page after a re-run', count === 1, `${count} portal pages`);

console.log(`\nPhase C part 2 (C11 portal rebind): ${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
