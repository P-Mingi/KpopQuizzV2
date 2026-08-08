// V-FOUNDATION F1 Phase B receipt - PAGE CORE CRUD round-trip against PROD (bts space).
// Exercises the real service-role data path (lib/verse/tree/data), then HARD-DELETES the
// test pages (cascade revisions/redirects) so no test artifact persists (L-066 pattern).
// Test slugs are prefixed zzz-f1-test- so they are identifiable + never collide.
//   pnpm -C apps/quiz exec tsx scripts/proof-vfoundation-f1-phaseb.mts
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

import {
  createPage, savePage, renamePage, movePage, publishPage, trashPage, restorePage,
  revertToRevision, listRevisions, recentChanges, getPageById, resolveRedirect,
} from '../src/lib/verse/tree/data';
import { templateSections } from '../src/lib/verse/tree/templates';

const env = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n').filter((l) => l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; }));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

const AUTHOR = '00000000-0000-4000-8000-0000000f1b0b';  // a fixed test uuid (created_by has no FK)
let failures = 0;
const check = (name: string, cond: boolean, detail = ''): void => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? `  -> ${detail}` : ''}`);
  if (!cond) failures += 1;
};

const { data: bts } = await db.from('groups').select('id').eq('slug', 'bts').single();
const SPACE = (bts as { id: number }).id;
console.log(`bts space_id = ${SPACE}\n`);

const created: number[] = [];   // for cleanup
const oldSlugs: string[] = [];

try {
  // 1) CREATE (search-first, template-seeded) -------------------------------
  const c = await createPage(db, { spaceId: SPACE, type: 'member', title: 'zzz f1 test member', createdBy: AUTHOR });
  check('create returned a page', !!c.page, c.error ?? c.page?.slug);
  const page = c.page!; created.push(page.id); oldSlugs.push(page.slug);
  check('slug derived + shown before use', page.slug === 'zzz-f1-test-member', page.slug);
  check('status starts draft (C3)', page.status === 'draft', page.status);
  check('member template seeded (8 H2 headings)', (page.blocks.blocks?.length ?? 0) === templateSections('member').length,
    `${page.blocks.blocks?.length} blocks vs ${templateSections('member').length} sections`);
  check('new empty page is a STUB (C5: noindex until substance)', page.is_stub === true, String(page.is_stub));

  // search-first duplicate guard: a second create with the same title surfaces the existing.
  const dup = await createPage(db, { spaceId: SPACE, type: 'member', title: 'zzz f1 test member', createdBy: AUTHOR });
  check('duplicate create is REFUSED (search-first, no silent dupe)', !!dup.duplicate && dup.duplicate.id === page.id,
    dup.duplicate ? `-> existing #${dup.duplicate.id}` : 'created a duplicate!');

  // 2) SAVE content -> revision 2, stub clears --------------------------------
  const body = { version: 1 as const, blocks: [{ id: 'h-0', type: 'heading', level: 2, text: 'Overview' }, { id: 't-1', type: 'text', html: 'A real sourced intro paragraph.' }] };
  const s = await savePage(db, page.id, { blocks: body }, AUTHOR);
  check('save succeeded', !!s.page, s.error);
  check('save cleared the stub (has real content, C5)', s.page?.is_stub === false, String(s.page?.is_stub));
  let revs = await listRevisions(db, page.id);
  check('two revisions after create + one save (C3 append-only)', revs.length === 2, `${revs.length} revisions (rev ${revs.map((r) => r.rev).join(',')})`);

  // 3) RENAME (slug changes) -> eternal redirect, id stable -------------------
  const r = await renamePage(db, page.id, 'zzz f1 test idol', AUTHOR);
  check('rename kept the SAME page id (C2)', r.page?.id === page.id, `#${r.page?.id}`);
  check('rename changed the slug', r.page?.slug === 'zzz-f1-test-idol', r.page?.slug);
  check('rename wrote a redirect', r.redirected === true, String(r.redirected));
  if (r.page) oldSlugs.push(r.page.slug);
  const redir = await resolveRedirect(db, SPACE, 'zzz-f1-test-member');
  check('old slug now RESOLVES to the new slug (eternal redirect, C2)', redir === 'zzz-f1-test-idol', String(redir));

  // 4) MOVE under a parent -> parent_id changes, URL UNCHANGED ----------------
  const parent = await createPage(db, { spaceId: SPACE, type: 'index', title: 'zzz f1 test members index', createdBy: AUTHOR });
  const parentId = parent.page!.id; created.push(parentId); oldSlugs.push(parent.page!.slug);
  const slugBeforeMove = r.page!.slug;
  const mv = await movePage(db, page.id, parentId);
  check('move set the new parent', mv.page?.parent_id === parentId, `parent=${mv.page?.parent_id}`);
  check('move DID NOT change the slug/URL (C2)', mv.page?.slug === slugBeforeMove, mv.page?.slug);
  const cycle = await movePage(db, parentId, page.id);  // parent under its own child = cycle
  check('cycle move is refused', !!cycle.error, cycle.error ?? 'allowed a cycle!');

  // 5) ENTITY-BOUND page is indexable day 1 (not a stub) ----------------------
  const bound = await createPage(db, { spaceId: SPACE, type: 'member', title: 'zzz f1 test bound', createdBy: AUTHOR, entityKind: 'idol', entityId: 999999 });
  check('entity-bound page is NOT a stub day 1 (C5)', bound.page?.is_stub === false, String(bound.page?.is_stub));
  if (bound.page) { created.push(bound.page.id); oldSlugs.push(bound.page.slug); }

  // 6) PUBLISH / TRASH / RESTORE (C3 - no hard delete) ------------------------
  const pub = await publishPage(db, page.id);
  check('publish set status + published_at', pub.page?.status === 'published' && !!pub.page?.published_at, `${pub.page?.status} @ ${pub.page?.published_at}`);
  const tr = await trashPage(db, page.id);
  check('trash sets status=trash (never hard delete, C3)', tr.page?.status === 'trash', tr.page?.status);
  const rest = await restorePage(db, page.id);
  check('restore brings it back', rest.page?.status === 'draft', rest.page?.status);
  check('the row still exists after trash+restore (data survived)', !!(await getPageById(db, page.id)), 'exists');

  // 7) REVERT = a NEW revision (never destructive, C3) ------------------------
  revs = await listRevisions(db, page.id);
  const topBefore = revs[0]!.rev;
  const rv = await revertToRevision(db, page.id, 1, AUTHOR);
  check('revert produced a NEW revision (append-only, C3)', !rv.error, rv.error ?? 'ok');
  revs = await listRevisions(db, page.id);
  check('revision count grew (revert is not destructive)', revs[0]!.rev === topBefore + 1, `top rev now ${revs[0]!.rev}`);

  // 8) RECENT CHANGES feed (C3) ----------------------------------------------
  const changes = await recentChanges(db, SPACE, 50);
  check('recent-changes feed returns our edits', changes.some((c2) => c2.page_id === page.id), `${changes.length} changes in feed`);

} finally {
  // CLEANUP: hard-delete the test pages (cascade wipes their revisions) + redirects.
  for (const id of created) await db.from('pages').delete().eq('id', id);
  for (const slug of oldSlugs) await db.from('page_redirects').delete().eq('space_id', SPACE).eq('from_slug', slug);
  const { data: leftover } = await db.from('pages').select('id').eq('space_id', SPACE).ilike('slug', 'zzz-f1-test-%');
  check('cleanup: no zzz-f1-test pages remain', (leftover?.length ?? 0) === 0, `${leftover?.length ?? 0} leftover`);
}

console.log(`\nPhase B page-core CRUD: ${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
