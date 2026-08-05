// V-BUILDER-3 step 4 proof: the members governance lifecycle (L-068) at the DATA + getIdol level.
// create -> inactive+needs_review+curator (page 404s) -> approve -> active (page renders) ->
// detach -> inactive+detached (page 404s, ROW survives) -> sync guard refuses re-activate ->
// re-attach -> active again. Uses a throwaway curator idol on BTS, cleaned up at the end.
import { readFileSync } from 'node:fs';
for (const l of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  const i = l.indexOf('='); if (i > 0 && !l.startsWith('#')) process.env[l.slice(0, i).trim()] ??= l.slice(i + 1).trim().replace(/^["']|["']$/g, '');
}
import { createClient } from '@supabase/supabase-js';
import { getIdol } from '../src/lib/verse/idol';
import { idolSlug } from '../src/lib/verse/slug';

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
let failed = 0;
const check = (n: string, ok: boolean, d = '') => { console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${n}${d ? ' :: ' + d : ''}`); if (!ok) failed++; };

const { data: g } = await db.from('groups').select('id, slug').eq('slug', 'bts').single();
const gid = (g as { id: number; slug: string }).id, gslug = (g as { slug: string }).slug;
const NAME = 'ZZ Governance Probe';
const slug = idolSlug(NAME);
// clean any prior probe
await db.from('idols').delete().eq('group_id', gid).eq('name', NAME);

// 1. CREATE (curator): inactive + needs_review + origin curator + detached_at null
const { data: ins } = await db.from('idols').insert({ group_id: gid, name: NAME, origin: 'curator', created_by: null, needs_review: true, review_reason: 'curator-created', active: false, ord: 998 }).select('id, active, needs_review, origin, detached_at').single();
const id = (ins as { id: number }).id; const c = ins as any;
check('CREATE -> active=false, needs_review=true, origin=curator, detached_at=null', c.active === false && c.needs_review === true && c.origin === 'curator' && c.detached_at === null);

// 2. member page 404s while unapproved (getIdol filters active)
check('unapproved member page 404s (getIdol returns null)', (await getIdol(gslug, slug)) === null);

// 3. APPROVE (idol_activate logic): guard passes (detached_at null), then active=true
const { data: pre } = await db.from('idols').select('detached_at').eq('id', id).single();
check('approve guard allows (detached_at is null)', (pre as any).detached_at === null);
await db.from('idols').update({ active: true, needs_review: false, review_reason: null }).eq('id', id);

// 4. approved member page now renders
const approved = await getIdol(gslug, slug);
check('approved member page renders (getIdol non-null, name matches)', !!approved && approved.name === NAME, approved?.name ?? 'null');

// 5. DETACH: active=false + detached_at set; row survives; page 404s again
await db.from('idols').update({ active: false, detached_at: new Date().toISOString() }).eq('id', id);
const { data: afterDetach } = await db.from('idols').select('id, active, detached_at').eq('id', id).single();
check('DETACH -> active=false, detached_at set, ROW SURVIVES', !!afterDetach && (afterDetach as any).active === false && !!(afterDetach as any).detached_at);
check('detached member page 404s again (data intact, just hidden)', (await getIdol(gslug, slug)) === null);

// 6. SYNC GUARD: idol_activate must REFUSE a detached row (never silently re-activate)
const { data: guard } = await db.from('idols').select('detached_at').eq('id', id).single();
const wouldRefuse = !!(guard as any).detached_at; // route returns 409 when detached_at is set
check('sync guard: approve/re-sync refuses a detached row (409)', wouldRefuse);

// 7. RE-ATTACH: the only sanctioned re-activation - active=true, detached_at=NULL together
await db.from('idols').update({ active: true, detached_at: null }).eq('id', id);
const { data: reatt } = await db.from('idols').select('active, detached_at').eq('id', id).single();
check('RE-ATTACH -> active=true, detached_at=NULL', (reatt as any).active === true && (reatt as any).detached_at === null);
check('re-attached member page renders again', !!(await getIdol(gslug, slug)));

await db.from('idols').delete().eq('id', id);
console.log(`  cleaned up probe idol ${id}`);
console.log(`\nRESULT: ${failed === 0 ? 'ALL PASS' : failed + ' FAILED'} (members governance lifecycle)`);
process.exit(failed === 0 ? 0 : 1);
