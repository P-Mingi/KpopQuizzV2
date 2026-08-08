// V-FOUNDATION F1 Phase F receipt - CONTROLLED tags + the lateral web (C7), a prod round-
// trip. Create a controlled tag -> attach to pages -> the auto-index lists them -> related
// tags co-occur -> data-derived auto-tags -> merge (the pages follow). Cleaned up after.
//   pnpm -C apps/quiz exec tsx scripts/proof-vfoundation-f1-phasef.mts
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

import { createPage } from '../src/lib/verse/tree/data';
import { ensureTag, attachTag, pagesForTag, relatedTags, tagsForPage, mergeTags, renameTag, getTag } from '../src/lib/verse/tree/tags';

const env = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n').filter((l) => l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; }));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const SPACE = 1; const A = '00000000-0000-4000-8000-0000000f1f0f';
let failures = 0;
const check = (n: string, c: boolean, d = ''): void => { console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? `  -> ${d}` : ''}`); if (!c) failures += 1; };

// clear priors
for (const t of ['zzz-f1-vocal', 'zzz-f1-rap', 'zzz-f1-1994']) await db.from('space_tags').delete().eq('space_id', SPACE).eq('key', t);
const { data: pp } = await db.from('pages').select('id').eq('space_id', SPACE).ilike('slug', 'zzz-f1-tag-%');
for (const p of (pp ?? []) as { id: number }[]) await db.from('pages').delete().eq('id', p.id);

const created: number[] = []; const tagIds: number[] = [];
try {
  // two published pages; one bound to RM (idol 1) so auto-tags derive.
  const p1 = await createPage(db, { spaceId: SPACE, type: 'member', title: 'zzz f1 tag RM', createdBy: A, entityKind: 'idol', entityId: 1 });
  const p2 = await createPage(db, { spaceId: SPACE, type: 'article', title: 'zzz f1 tag two', createdBy: A });
  created.push(p1.page!.id, p2.page!.id);
  await db.from('pages').update({ status: 'published', is_stub: false }).in('id', created);

  // 1) CONTROLLED create (explicit) + attach to both -> the auto-index.
  const vocal = await ensureTag(db, SPACE, 'zzz f1 vocal', 'manual', 'The main vocalists.');
  tagIds.push(vocal!.id);
  await attachTag(db, p1.page!.id, vocal!.id); await attachTag(db, p2.page!.id, vocal!.id);
  const idx = await pagesForTag(db, SPACE, vocal!.id);
  check('tag index lists the tagged pages (generated, not hand-kept)', idx.length === 2, `${idx.length} pages`);
  check('a page reports its tags (document foot)', (await tagsForPage(db, p1.page!.id)).some((t) => t.key === vocal!.key), 'ok');

  // 2) idempotent create: the same tag is returned, never duplicated (controlled).
  const again = await ensureTag(db, SPACE, 'zzz f1 vocal', 'manual');
  check('creating the same tag again returns the SAME tag (no sprawl)', again!.id === vocal!.id, `#${again!.id}`);

  // 3) related tags: a second tag on p1 co-occurs with vocal.
  const rap = await ensureTag(db, SPACE, 'zzz f1 rap', 'manual'); tagIds.push(rap!.id);
  await attachTag(db, p1.page!.id, rap!.id);
  const rel = await relatedTags(db, SPACE, vocal!.id);
  check('related tags surface co-occurring tags', rel.some((r) => r.key === rap!.key), JSON.stringify(rel.map((r) => r.key)));

  // 4) AUTO tags from data: p1 is bound to RM (born 1994) -> a "1994" auto tag was applied at create.
  const p1tags = await tagsForPage(db, p1.page!.id);
  check('auto-tag derived from data (RM birth year 1994)', p1tags.some((t) => t.label === '1994'), JSON.stringify(p1tags.map((t) => t.label)));
  const y = await getTag(db, SPACE, '1994');
  check('the auto tag is marked kind=auto', y?.kind === 'auto', y?.kind);

  // 5) MERGE rap INTO vocal: p1's rap tag becomes vocal; rap is deleted; pages follow.
  await mergeTags(db, rap!.id, vocal!.id);
  check('merged tag is gone', !(await getTag(db, SPACE, rap!.key)), 'deleted');
  const idx2 = await pagesForTag(db, SPACE, vocal!.id);
  check('after merge the pages still resolve under the surviving tag', idx2.length === 2, `${idx2.length} pages`);

  // 6) rename (the pages follow automatically - same id).
  const rn = await renameTag(db, vocal!.id, 'Main Vocals');
  check('rename succeeds (pages follow, same tag id)', rn.ok && (await getTag(db, SPACE, vocal!.key))?.label === 'Main Vocals', 'ok');

} finally {
  for (const id of created) await db.from('pages').delete().eq('id', id);
  for (const t of ['zzz-f1-vocal', 'zzz-f1-rap', '1994']) await db.from('space_tags').delete().eq('space_id', SPACE).eq('key', t);
  const { data: lt } = await db.from('space_tags').select('id').eq('space_id', SPACE).ilike('key', 'zzz-f1-%');
  const { data: lp } = await db.from('pages').select('id').eq('space_id', SPACE).ilike('slug', 'zzz-f1-%');
  check('cleanup: no zzz-f1 tags or pages remain', (lt?.length ?? 0) === 0 && (lp?.length ?? 0) === 0, `tags=${lt?.length ?? 0} pages=${lp?.length ?? 0}`);
}

console.log(`\nPhase F controlled tags: ${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
