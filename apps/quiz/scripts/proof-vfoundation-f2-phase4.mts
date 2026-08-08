// V-FOUNDATION F2 Phase 4 receipt - amendment A2 (the editable fact rail) + the C5 substance
// rule + publish, a real prod round-trip on a member page bound to RM. Fact overrides ride the
// body jsonb (no schema change); computed fields stay LOCKED to the data. Cleaned up after.
//   pnpm -C apps/quiz exec tsx scripts/proof-vfoundation-f2-phase4.mts
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

import { createPage, savePage, publishPage, getPageById } from '../src/lib/verse/tree/data';
import { buildFactRail } from '../src/lib/verse/tree/factrail';

const env = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n').filter((l) => l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; }));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const SPACE = 1; const A = '00000000-0000-4000-8000-0000000f2040';
let failures = 0;
const check = (n: string, c: boolean, d = ''): void => { console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? `  -> ${d}` : ''}`); if (!c) failures += 1; };
const rowOf = (secs: Awaited<ReturnType<typeof buildFactRail>>, key: string) => secs?.flatMap((s) => s.rows).find((r) => r.key === key);

const { data: prior } = await db.from('pages').select('id').eq('space_id', SPACE).ilike('slug', 'zzz-f2-a2%');
for (const p of (prior ?? []) as { id: number }[]) await db.from('pages').delete().eq('id', p.id);

let pageId = 0;
try {
  const c = await createPage(db, { spaceId: SPACE, type: 'member', title: 'zzz f2 a2 rm', createdBy: A, entityKind: 'idol', entityId: 8 });
  pageId = c.page!.id;
  const now = new Date();

  // base (no overrides): fact rail from pure data.
  let page = (await getPageById(db, pageId))!;
  let facts = await buildFactRail(db, page, now);
  check('base Name row = the data value (Jisoo)', rowOf(facts, 'name')?.dd === 'Jisoo' && !rowOf(facts, 'name')?.edited, rowOf(facts, 'name')?.dd);
  check('Born is a COMPUTED row (auto), NOT editable (locked, A2)', rowOf(facts, 'born')?.auto === true && !rowOf(facts, 'born')?.editable, JSON.stringify(rowOf(facts, 'born')));
  check('Years active is computed + locked', rowOf(facts, 'years')?.auto === true && !rowOf(facts, 'years')?.editable, JSON.stringify(rowOf(facts, 'years')));

  // A2: a substantial body + fact overrides (name, from) + an ATTEMPT to override a computed key.
  const body = { version: 1, blocks: [
    { id: 'p1', type: 'paragraph', content: [{ text: 'RM is the leader and main rapper of BTS, born in Ilsan in 1994 and debuting with the group in 2013 under Big Hit.' }] },
    { id: 'h1', type: 'heading', level: 2, content: [{ text: 'Career' }] },
    { id: 'p2', type: 'paragraph', content: [{ text: 'He has released solo albums and produced across the discography over more than a decade of active work with the group and on his own.' }] },
  ], factOverrides: { fields: { name: 'RM (Kim Namjoon)', from: 'Ilsan, South Korea', born: 'HACK ATTEMPT', years: '999' }, photo: 'space/1/rm.webp' } };
  await savePage(db, pageId, { blocks: body as never }, A);
  page = (await getPageById(db, pageId))!;
  const stored = (page.blocks as { factOverrides?: { fields?: Record<string, string>; photo?: string } }).factOverrides;
  check('overrides persisted on the body (no schema change)', !!stored?.fields?.name, JSON.stringify(stored?.fields));
  check('FAIL-CLOSED: an override on a COMPUTED key (born/years) was DROPPED by the clamp', stored?.fields?.born === undefined && stored?.fields?.years === undefined, JSON.stringify(stored?.fields));
  check('photo override kept (ingest-copied path)', stored?.photo === 'space/1/rm.webp', String(stored?.photo));

  // reader applies the overrides.
  facts = await buildFactRail(db, page, now, stored);
  check('A2: Name shows the OVERRIDE, marked Edited', rowOf(facts, 'name')?.dd === 'RM (Kim Namjoon)' && rowOf(facts, 'name')?.edited === true, rowOf(facts, 'name')?.dd);
  check('A2: From shows the override', rowOf(facts, 'from')?.dd === 'Ilsan, South Korea', rowOf(facts, 'from')?.dd);
  check('A2: Born STILL computed from data (the hack never applied)', /age \d+/.test(rowOf(facts, 'born')?.dd ?? '') && rowOf(facts, 'born')?.dd !== 'HACK ATTEMPT', rowOf(facts, 'born')?.dd);

  // revert the name override -> back to data.
  const reverted = { ...body, factOverrides: { fields: { from: 'Ilsan, South Korea' }, photo: 'space/1/rm.webp' } };
  await savePage(db, pageId, { blocks: reverted as never }, A);
  page = (await getPageById(db, pageId))!;
  facts = await buildFactRail(db, page, now, (page.blocks as { factOverrides?: never }).factOverrides);
  check('revert: Name back to the data value (Jisoo), Edited cleared', rowOf(facts, 'name')?.dd === 'Jisoo' && !rowOf(facts, 'name')?.edited, rowOf(facts, 'name')?.dd);

  // publish: the substance rule + is_stub. A member (fact rail) is indexable regardless.
  const pub = await publishPage(db, pageId);
  check('publish -> status published', pub.page?.status === 'published', pub.page?.status);
  check('member page is indexable (fact rail exemption, is_stub false)', pub.page?.is_stub === false, String(pub.page?.is_stub));

} finally {
  if (pageId) await db.from('pages').delete().eq('id', pageId);
  const { data: left } = await db.from('pages').select('id').eq('space_id', SPACE).ilike('slug', 'zzz-f2-a2%');
  check('cleanup: no zzz-f2-a2 pages remain', (left?.length ?? 0) === 0, `${left?.length ?? 0}`);
}

console.log(`\nPhase 4 (A2 editable rail + substance + publish): ${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
