// V-FOUNDATION F1 Phase C - seed two REAL proof pages in the bts space, then print their
// slugs. (1) an entity-bound member page (RM, idol id 1) with real sourced facts -> full
// DOCUMENT canvas (fact rail computes age + years active, auto-navbox from the roster);
// (2) a published STUB (no binding, no content) -> must be noindex + out of the sitemap.
// Idempotent: clears any prior zzz-f1-docproof-* first. Cleaned up by the -cleanup script.
//   pnpm -C apps/quiz exec tsx scripts/proof-vfoundation-f1-phasec-seed.mts
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

import { createPage, savePage, publishPage } from '../src/lib/verse/tree/data';

const env = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n').filter((l) => l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; }));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const AUTHOR = '00000000-0000-4000-8000-0000000f1c0c';
const SPACE = 1; // bts

// clear any prior run
const { data: prior } = await db.from('pages').select('id').eq('space_id', SPACE).ilike('slug', 'zzz-f1-docproof-%');
for (const p of (prior ?? []) as { id: number }[]) await db.from('pages').delete().eq('id', p.id);

// (1) the entity-bound member page (real facts, real binding to RM = idol id 1).
const m = await createPage(db, { spaceId: SPACE, type: 'member', title: 'zzz f1 docproof RM', createdBy: AUTHOR, entityKind: 'idol', entityId: 1 });
if (!m.page) { console.error('create failed', m.error); process.exit(1); }
const body = { version: 1 as const, blocks: [
  { id: 't0', type: 'text', html: 'RM (Kim Namjoon) is the leader and main rapper of BTS. Born on September 12, 1994 in Ilsan, he debuted with the group on June 13, 2013 under Big Hit Entertainment.' },
  { id: 'h1', type: 'heading', level: 2, text: 'Career' },
  { id: 't1', type: 'text', html: 'As leader he has co-written and produced across the discography, and released the solo studio albums Indigo and Right Place, Wrong Person.' },
  { id: 'h2', type: 'heading', level: 2, text: 'Solo releases' },
  { id: 'tbl', type: 'table', rows: [['Year', 'Release', 'Type'], ['2022', 'Indigo', 'Studio album'], ['2024', 'Right Place, Wrong Person', 'Studio album']] },
  { id: 'h3', type: 'heading', level: 2, text: 'Gallery' },
  { id: 't3', type: 'text', html: 'Photographs and era imagery live in the space gallery.' },
] };
await savePage(db, m.page.id, { blocks: body }, AUTHOR);
await publishPage(db, m.page.id);

// (2) a published STUB (empty, no binding).
const s = await createPage(db, { spaceId: SPACE, type: 'article', title: 'zzz f1 docproof stub', createdBy: AUTHOR });
if (s.page) await publishPage(db, s.page.id);

console.log(JSON.stringify({ memberSlug: m.page.slug, memberId: m.page.id, stubSlug: s.page?.slug, stubId: s.page?.id }));
