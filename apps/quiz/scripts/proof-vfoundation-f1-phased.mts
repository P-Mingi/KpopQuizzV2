// V-FOUNDATION F1 Phase D receipt - the GHOST-LINK engine (C6), a real prod round-trip.
// A links to a not-yet-existing page -> a GHOST (red link) + a WANTED entry; create the
// target -> the ghost resolves (goes blue) + a BACKLINK appears; orphan detection. Test
// pages hard-deleted after (0 leftover).
//   pnpm -C apps/quiz exec tsx scripts/proof-vfoundation-f1-phased.mts
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

import { createPage, savePage } from '../src/lib/verse/tree/data';
import { wantedPages, backlinksFor, orphanPages } from '../src/lib/verse/tree/links';

const env = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n').filter((l) => l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; }));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const SPACE = 1; const AUTHOR = '00000000-0000-4000-8000-0000000f1d0d';
const GHOST = 'zzz-f1-ghosttarget';
let failures = 0;
const check = (n: string, c: boolean, d = ''): void => { console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? `  -> ${d}` : ''}`); if (!c) failures += 1; };

// clear priors
const { data: prior } = await db.from('pages').select('id').eq('space_id', SPACE).ilike('slug', 'zzz-f1-%');
for (const p of (prior ?? []) as { id: number }[]) await db.from('pages').delete().eq('id', p.id);

const created: number[] = [];
try {
  // A links to a page that does not exist yet -> a GHOST link.
  const a = await createPage(db, { spaceId: SPACE, type: 'article', title: 'zzz f1 linker A', createdBy: AUTHOR });
  created.push(a.page!.id);
  await savePage(db, a.page!.id, { blocks: { version: 1, blocks: [
    { id: 't', type: 'text', html: 'See also:' },
    { id: 'l', type: 'link', to_slug: GHOST, label: 'Ghost Target' },
  ] } }, AUTHOR);

  const { data: link1 } = await db.from('page_links').select('to_page_id, to_slug').eq('from_page_id', a.page!.id).eq('to_slug', GHOST).maybeSingle();
  check('link stored on save (C6)', !!link1, JSON.stringify(link1));
  check('target missing -> it is a GHOST (to_page_id NULL, red link)', (link1 as { to_page_id: number | null } | null)?.to_page_id === null, String((link1 as { to_page_id: number | null } | null)?.to_page_id));

  const wanted1 = await wantedPages(db, SPACE, 50);
  check('the ghost appears in WANTED pages, by demand', wanted1.some((w) => w.toSlug === GHOST && w.demand >= 1),
    JSON.stringify(wanted1.find((w) => w.toSlug === GHOST)));

  // create the wanted page (its slug = the ghost target) -> the ghost resolves.
  const b = await createPage(db, { spaceId: SPACE, type: 'article', title: 'zzz f1 ghosttarget', createdBy: AUTHOR, slug: GHOST });
  created.push(b.page!.id);
  check('the created page took the wanted slug', b.page?.slug === GHOST, b.page?.slug);

  const { data: link2 } = await db.from('page_links').select('to_page_id').eq('from_page_id', a.page!.id).eq('to_slug', GHOST).maybeSingle();
  check('GHOST RESOLVED: the red link is now blue (to_page_id = new page)', (link2 as { to_page_id: number | null } | null)?.to_page_id === b.page!.id,
    `to_page_id=${(link2 as { to_page_id: number | null } | null)?.to_page_id} (B=${b.page!.id})`);

  const wanted2 = await wantedPages(db, SPACE, 50);
  check('the resolved page LEFT the wanted list', !wanted2.some((w) => w.toSlug === GHOST), `${wanted2.length} still wanted`);

  // publish both, so A is a PUBLIC backlink to B (a draft linker is not surfaced).
  await db.from('pages').update({ status: 'published' }).in('id', [a.page!.id, b.page!.id]);
  const back = await backlinksFor(db, b.page!.id);
  check('B now shows a BACKLINK from A (what-links-here, C6)', back.count >= 1 && back.sample.some((s) => s.slug === a.page!.slug),
    `count=${back.count} sample=${JSON.stringify(back.sample.map((s) => s.slug))}`);

  // orphan detection: A (published) has no inbound links -> orphan; B is linked -> not.
  const orphans = await orphanPages(db, SPACE, 200);
  check('A is an ORPHAN (nothing links to it)', orphans.some((o) => o.id === a.page!.id), `${orphans.length} orphans`);
  check('B is NOT an orphan (A links to it)', !orphans.some((o) => o.id === b.page!.id), 'ok');

} finally {
  for (const id of created) await db.from('pages').delete().eq('id', id);
  const { data: left } = await db.from('pages').select('id').eq('space_id', SPACE).ilike('slug', 'zzz-f1-%');
  check('cleanup: no zzz-f1 test pages remain', (left?.length ?? 0) === 0, `${left?.length ?? 0} leftover`);
}

console.log(`\nPhase D ghost-link engine: ${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
