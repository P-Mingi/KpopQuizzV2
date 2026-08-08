// V-FOUNDATION F1 Phase G - SEED the BTS tree from the database (C13 strangler). Real
// entity-bound pages for members / releases / tracks / eras / awards / tours, under parent
// index pages, honest emptiness where no content exists. NO fabricated content (covenant).
// Idempotent (re-runs skip existing entity pages). Published + parked behind VERSE_PUBLIC
// until relaunch; member pages carry a fact rail so they are indexable, the rest are honest
// shells (noindex until content). Reports EXACT counts per type.
//   pnpm -C apps/quiz exec tsx scripts/seed-vfoundation-f1-bts.mts
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

import { seedIndexPage, seedEntityPage } from '../src/lib/verse/tree/data';

const env = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n').filter((l) => l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; }));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const SPACE = 1; // bts

const all = async <T>(q: (from: number) => PromiseLike<{ data: T[] | null }>): Promise<T[]> => {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) { const { data } = await q(from); const rows = data ?? []; out.push(...rows); if (rows.length < 1000) break; }
  return out;
};
const tally = { created: {} as Record<string, number>, skipped: {} as Record<string, number> };
async function seed(type: string, kind: string, rows: { id: number; title: string }[], parentId: number | null, indexable: boolean): Promise<void> {
  for (const r of rows) {
    const res = await seedEntityPage(db, { spaceId: SPACE, type, entityKind: kind, entityId: r.id, title: r.title, parentId, indexable });
    tally[res][type] = (tally[res][type] ?? 0) + 1;
  }
}

// ---- parent index pages (structural; noindex, out of sitemap) ----
const iMembers = await seedIndexPage(db, SPACE, 'Members', 'members-index');
const iDisc = await seedIndexPage(db, SPACE, 'Discography', 'discography-index');
const iTracks = await seedIndexPage(db, SPACE, 'Songs', 'songs-index');
const iEras = await seedIndexPage(db, SPACE, 'Eras', 'eras-index');
const iAwards = await seedIndexPage(db, SPACE, 'Awards', 'awards-index');

// ---- members (fact rail -> indexable) ----
const members = await all<{ id: number; name: string }>((f) => db.from('idols').select('id, name').eq('group_id', SPACE).eq('active', true).range(f, f + 999));
await seed('member', 'idol', members.map((m) => ({ id: m.id, title: m.name })), iMembers.id, true);

// ---- releases (honest shells until content) ----
const albums = await all<{ id: number; title: string }>((f) => db.from('albums').select('id, title').eq('group_id', SPACE).range(f, f + 999));
await seed('release', 'album', albums.map((a) => ({ id: a.id, title: a.title })), iDisc.id, false);

// ---- tracks ----
const albumIds = albums.map((a) => a.id);
const tracks = albumIds.length
  ? await all<{ id: number; title: string }>((f) => db.from('album_tracks').select('id, title').in('album_id', albumIds).range(f, f + 999))
  : [];
await seed('track', 'track', tracks.map((t) => ({ id: t.id, title: t.title })), iTracks.id, false);

// ---- eras ----
const eras = await all<{ id: number; name: string }>((f) => db.from('eras').select('id, name').eq('group_id', SPACE).range(f, f + 999));
await seed('era', 'era', eras.map((e) => ({ id: e.id, title: e.name })), iEras.id, false);

// ---- awards ----
const awards = await all<{ id: number; award_name: string | null; ceremony: string | null; year: number | null; category: string | null }>(
  (f) => db.from('awards').select('id, award_name, ceremony, year, category').eq('group_id', SPACE).range(f, f + 999));
await seed('award', 'award', awards.map((a) => ({ id: a.id, title: (a.award_name || `${a.ceremony ?? ''} ${a.year ?? ''}`.trim() || a.category || 'Award') })), iAwards.id, false);

// ---- tours (0 rows -> honest emptiness) ----
const tours = await all<{ id: number; name: string }>((f) => db.from('tours').select('id, name').eq('group_id', SPACE).range(f, f + 999));
await seed('tour', 'tour', tours.map((t) => ({ id: t.id, title: t.name })), null, false);

const total = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);
console.log('=== V-FOUNDATION F1 Phase G - BTS seed (exact counts) ===');
console.log(`data present: members ${members.length}, releases ${albums.length}, tracks ${tracks.length}, eras ${eras.length}, awards ${awards.length}, tours ${tours.length}`);
console.log('CREATED:', JSON.stringify(tally.created), `= ${total(tally.created)}`);
console.log('SKIPPED (already seeded):', JSON.stringify(tally.skipped), `= ${total(tally.skipped)}`);
console.log('parent index pages: members-index, discography-index, songs-index, eras-index, awards-index');
