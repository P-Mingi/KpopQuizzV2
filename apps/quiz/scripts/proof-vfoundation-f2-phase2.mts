// V-FOUNDATION F2 Phase 2 receipt - the DOCUMENT BLOCK ENGINE. A real prod round-trip:
// the save clamp is FAIL-CLOSED (unknown + locked-widget kinds dropped), block ids are
// STABLE across a reorder, the C5 substance rule flips is_stub both ways, and inline runs
// are XSS-safe (a javascript: href + an unknown mark are stripped). Cleaned up after.
//   pnpm -C apps/quiz exec tsx scripts/proof-vfoundation-f2-phase2.mts
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

import { createPage, savePage, getPageById } from '../src/lib/verse/tree/data';

const env = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n').filter((l) => l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; }));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const SPACE = 1; const A = '00000000-0000-4000-8000-0000000f2020';
let failures = 0;
const check = (n: string, c: boolean, d = ''): void => { console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? `  -> ${d}` : ''}`); if (!c) failures += 1; };

const { data: prior } = await db.from('pages').select('id').eq('space_id', SPACE).ilike('slug', 'zzz-f2-%');
for (const p of (prior ?? []) as { id: number }[]) await db.from('pages').delete().eq('id', p.id);

let pageId = 0;
try {
  const c = await createPage(db, { spaceId: SPACE, type: 'article', title: 'zzz f2 engine', createdBy: A });
  pageId = c.page!.id;
  check('a fresh article is a stub (template only, no substance)', c.page!.is_stub === true, String(c.page!.is_stub));

  // a substantial body with EVERY v1 kind + a LOCKED widget + an UNKNOWN kind + XSS attempts.
  const rich = { version: 1, blocks: [
    { id: 'k1', type: 'paragraph', content: [{ text: 'Jungkook is the main vocalist and youngest member of BTS, born in Busan in 1997 and debuting in 2013.' }] },
    { id: 'k2', type: 'heading', level: 2, content: [{ text: 'Career' }] },
    { id: 'k3', type: 'paragraph', content: [
      { text: 'He released solo work and toured widely, with several records across the group discography and his own singles over many active years of performing.' },
      { text: 'evil', marks: ['b', 'sneaky-xss-mark'], link: { href: 'javascript:alert(1)' } },
    ] },
    { id: 'k4', type: 'list', items: [[{ text: 'One' }], [{ text: 'Two' }]] },
    { id: 'k5', type: 'quote', content: [{ text: 'A real quote.' }], cite: 'Someone' },
    { id: 'k6', type: 'callout', content: [{ text: 'A highlighted note.' }] },
    { id: 'k7', type: 'divider' },
    { id: 'k8', type: 'image', path: 'space/1/x.webp', alt: 'photo' },
    { id: 'k9', type: 'table', rows: [['Year', 'Fact'], ['2013', 'Debut']] },
    { id: 'k10', type: 'paragraph', content: [{ text: 'See also ', }, { text: 'GOLDEN', link: { toSlug: 'zzz-f2-golden' } }, { text: ' for the album.' }] },
    { id: 'w1', type: 'timeline', content: [{ text: 'locked widget' }] },   // LOCKED -> must be dropped
    { id: 'u1', type: 'bogus-kind', content: [{ text: 'unknown' }] },       // UNKNOWN -> must be dropped
  ] };
  const s = await savePage(db, pageId, { blocks: rich as never }, A);
  check('save accepted', !!s.page, s.error);
  const saved = (await getPageById(db, pageId))!.blocks.blocks as Record<string, unknown>[];
  const kinds = saved.map((b) => b.type);
  check('FAIL-CLOSED: locked widget (timeline) + unknown kind dropped', !kinds.includes('timeline') && !kinds.includes('bogus-kind'), JSON.stringify(kinds));
  check('all 10 v1 blocks kept', saved.length === 10, `${saved.length} blocks`);
  check('STABLE ids preserved (k1..k10)', saved.map((b) => b.id).join(',') === 'k1,k2,k3,k4,k5,k6,k7,k8,k9,k10', saved.map((b) => b.id).join(','));

  // XSS: the javascript: href + the unknown mark were stripped; the safe mark survived.
  const k3 = saved.find((b) => b.id === 'k3') as { content: { text: string; marks?: string[]; link?: unknown }[] };
  const evilRun = k3.content.find((r) => r.text === 'evil')!;
  check('XSS: javascript: href stripped (no link stored)', evilRun.link === undefined, JSON.stringify(evilRun.link));
  check('XSS: unknown mark stripped, safe mark kept', JSON.stringify(evilRun.marks) === JSON.stringify(['b']), JSON.stringify(evilRun.marks));

  check('substance met -> is_stub FALSE (indexable)', s.page!.is_stub === false, String(s.page!.is_stub));

  // inline [[ link fed the ledger (ghost, since target absent).
  const { data: link } = await db.from('page_links').select('to_page_id, to_slug').eq('from_page_id', pageId).eq('to_slug', 'zzz-f2-golden').maybeSingle();
  check('inline run link stored a ghost page_link', !!link && (link as { to_page_id: number | null }).to_page_id === null, JSON.stringify(link));

  // thin body -> is_stub flips back TRUE.
  const thin = { version: 1, blocks: [{ id: 'k1', type: 'paragraph', content: [{ text: 'Too short.' }] }] };
  const s2 = await savePage(db, pageId, { blocks: thin as never }, A);
  check('thin body -> is_stub TRUE (noindex, C5 both directions)', s2.page!.is_stub === true, String(s2.page!.is_stub));

  // reorder keeps ids.
  const reordered = { version: 1, blocks: [
    { id: 'k2', type: 'heading', level: 2, content: [{ text: 'Career' }] },
    { id: 'k1', type: 'paragraph', content: [{ text: 'Jungkook is the main vocalist and youngest member of BTS, born in Busan in 1997 and debuting in 2013.' }] },
  ] };
  await savePage(db, pageId, { blocks: reordered as never }, A);
  const after = (await getPageById(db, pageId))!.blocks.blocks as Record<string, unknown>[];
  check('reorder keeps every block id (skeleton law)', after.map((b) => b.id).join(',') === 'k2,k1', after.map((b) => b.id).join(','));

} finally {
  if (pageId) await db.from('pages').delete().eq('id', pageId);
  const { data: left } = await db.from('pages').select('id').eq('space_id', SPACE).ilike('slug', 'zzz-f2-%');
  check('cleanup: no zzz-f2 pages remain', (left?.length ?? 0) === 0, `${left?.length ?? 0}`);
}

console.log(`\nPhase 2 block engine: ${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
