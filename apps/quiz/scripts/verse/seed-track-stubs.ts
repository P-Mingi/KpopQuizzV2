// MISSION Task B - de-stub every BTS (space_id=1) type='track' page that is still is_stub=true
// (~184). Replace the 4 empty headings with a minimal, DB-TRUE body: Overview heading + one
// album/date paragraph (album linked to its Verse release page) + divider + a source note.
// Idempotent: re-running overwrites a page ONLY when its body changed, and bumps exactly one
// revision per changed page. Covenant: DB facts only, never invented. Nothing pushed to git.
//
//   pnpm -C apps/quiz exec tsx scripts/verse/seed-track-stubs.ts            (dry run, no writes)
//   pnpm -C apps/quiz exec tsx scripts/verse/seed-track-stubs.ts --apply    (writes to the DB)
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(readFileSync(new URL('../../.env.local', import.meta.url), 'utf8').split('\n').filter((l) => l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; }));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

const SPACE = 1;
const AUTHOR = '00000000-0000-4000-8000-000000005eed';
const APPLY = process.argv.includes('--apply');
// Belt-and-braces skip list (these are already is_stub=false, but never touch them).
const SKIP_SLUGS = new Set(['no', 'boy-in-luv', 'danger', 'i-need-u', 'run', 'blood-sweat-and-tears', 'dna', 'mic-drop', 'fake-love', 'boy-with-luv', 'on', 'life-goes-on', 'dynamite']);

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function longDate(iso: string | null): string | null {
  const m = iso?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${MONTHS[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}` : null;
}
// canonical JSON (deep-sorted keys) so re-run comparison ignores key order in stored jsonb.
function canon(v: unknown): string {
  const sort = (x: unknown): unknown => Array.isArray(x) ? x.map(sort)
    : (x && typeof x === 'object') ? Object.fromEntries(Object.keys(x as object).sort().map((k) => [k, sort((x as Record<string, unknown>)[k])])) : x;
  return JSON.stringify(sort(v));
}

type Run = { text: string; marks?: string[]; link?: { toSlug: string } };
function buildBody(pageId: number, title: string, albumTitle: string, albumSlug: string | null, date: string | null): { version: 1; blocks: unknown[] } {
  const albumRun: Run = albumSlug ? { text: albumTitle, link: { toSlug: albumSlug } } : { text: albumTitle };
  const tail: Run = date ? { text: `, released ${date}.` } : { text: '.' };
  return {
    version: 1,
    blocks: [
      { id: `h-${pageId}-0`, type: 'heading', level: 2, content: [{ text: 'Overview' }] },
      { id: `p-${pageId}-1`, type: 'paragraph', content: [{ text: `${title} is a track on ` }, albumRun, tail] },
      { id: `d-${pageId}-2`, type: 'divider' },
      { id: `p-${pageId}-3`, type: 'paragraph', content: [
        { text: 'Sources. ', marks: ['b'] },
        { text: 'Album and release date from the KpopVerse database (Wikidata, MusicBrainz, CC0). Prose written for KpopVerse, not copied. This page grows as there is more sourced to say. Corrections welcome, this is a wiki.' },
      ] },
    ],
  };
}

async function main(): Promise<void> {
  // 1. all track pages (to confirm the skip-list is untouched too).
  const { data: allTracks } = await db.from('pages').select('id, slug, title, entity_id, parent_id, is_stub, blocks').eq('space_id', SPACE).eq('type', 'track').limit(2000);
  const tracks = (allTracks ?? []) as { id: number; slug: string; title: string; entity_id: number | null; parent_id: number | null; is_stub: boolean; blocks: unknown }[];
  const stubs = tracks.filter((t) => t.is_stub && !SKIP_SLUGS.has(t.slug));

  // 2. album_tracks for the bound entities.
  const atIds = [...new Set(stubs.map((t) => t.entity_id).filter((x): x is number => x != null))];
  const { data: atRows } = await db.from('album_tracks').select('id, album_id, title').in('id', atIds.length ? atIds : [-1]);
  const atById = new Map(((atRows ?? []) as { id: number; album_id: number; title: string }[]).map((r) => [r.id, r]));

  // 3. ALL BTS album_tracks (for the earliest-by-title multi-album rule) + albums.
  const { data: btsAlbums } = await db.from('albums').select('id, title, release_date').eq('group_id', SPACE);
  const albById = new Map(((btsAlbums ?? []) as { id: number; title: string; release_date: string | null }[]).map((a) => [a.id, a]));
  const { data: allAt } = await db.from('album_tracks').select('album_id, title').in('album_id', [...albById.keys()].length ? [...albById.keys()] : [-1]);
  // title -> earliest album (by release_date) among BTS albums.
  const earliestByTitle = new Map<string, { id: number; title: string; release_date: string | null }>();
  for (const r of ((allAt ?? []) as { album_id: number; title: string }[])) {
    const alb = albById.get(r.album_id); if (!alb) continue;
    const cur = earliestByTitle.get(r.title);
    const rd = alb.release_date ?? '9999-99-99';
    if (!cur || rd < (cur.release_date ?? '9999-99-99')) earliestByTitle.set(r.title, alb);
  }

  // 4. release page title -> slug.
  const { data: relPages } = await db.from('pages').select('slug, title').eq('space_id', SPACE).eq('type', 'release');
  const slugByAlbumTitle = new Map(((relPages ?? []) as { slug: string; title: string }[]).map((r) => [r.title, r.slug]));

  let enriched = 0, unchanged = 0, noAlbumMatch = 0, noEntity = 0, diverged = 0;
  const samples: string[] = [];
  for (const page of stubs) {
    const at = page.entity_id != null ? atById.get(page.entity_id) : undefined;
    if (!at) { noEntity += 1; continue; }
    // earliest album for this track's title (falls back to the page's OWN album).
    const ownAlbum = albById.get(at.album_id) ?? null;
    const earliest = earliestByTitle.get(at.title) ?? ownAlbum;
    const album = earliest ?? ownAlbum;
    if (!album) { noEntity += 1; continue; }
    if (ownAlbum && earliest && earliest.id !== ownAlbum.id) diverged += 1;
    const albumSlug = slugByAlbumTitle.get(album.title) ?? null;
    if (!albumSlug) noAlbumMatch += 1;
    const body = buildBody(page.id, page.title, album.title, albumSlug, longDate(album.release_date));

    if (canon(body) === canon(page.blocks)) { unchanged += 1; continue; }

    if (samples.length < 6) samples.push(`${page.slug} -> ${album.title}${albumSlug ? ` [${albumSlug}]` : ' (plain, no page)'}${album.release_date ? ` (${longDate(album.release_date)})` : ' (no date)'}`);

    if (APPLY) {
      const { data: maxRow } = await db.from('page_revisions').select('rev').eq('page_id', page.id).order('rev', { ascending: false }).limit(1);
      const nextRev = ((maxRow as { rev: number }[] | null)?.[0]?.rev ?? 0) + 1;
      const nowIso = new Date().toISOString();
      const up = await db.from('pages').update({ blocks: body, is_stub: false, updated_at: nowIso }).eq('id', page.id);
      if (up.error) { console.error(`FAIL update ${page.slug}: ${up.error.message}`); continue; }
      const rev = await db.from('page_revisions').insert({ page_id: page.id, space_id: SPACE, rev: nextRev, title: page.title, blocks: body, author: AUTHOR, created_at: nowIso });
      if (rev.error) { console.error(`FAIL revision ${page.slug}: ${rev.error.message}`); continue; }
    }
    enriched += 1;
  }

  console.log(`MODE: ${APPLY ? 'APPLY (DB writes)' : 'DRY RUN (no writes)'}`);
  console.log(`track pages total: ${tracks.length}  (is_stub=false: ${tracks.filter((t) => !t.is_stub).length})`);
  console.log(`stubs scanned (excl. skip-list): ${stubs.length}`);
  console.log(`  enriched (changed): ${enriched}`);
  console.log(`  skipped-unchanged (byte-identical): ${unchanged}`);
  console.log(`  skipped-title-track (skip-list, is_stub true): ${tracks.filter((t) => t.is_stub && SKIP_SLUGS.has(t.slug)).length}`);
  console.log(`  no matching album page (link dropped -> plain text): ${noAlbumMatch}`);
  console.log(`  no entity/album resolvable: ${noEntity}`);
  console.log(`  earliest-album diverged from own album: ${diverged}`);
  console.log(`sample enriched:\n  ${samples.join('\n  ')}`);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
