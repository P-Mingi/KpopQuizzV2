import { redirect } from 'next/navigation';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { findConflicts } from '@/lib/verse/overrides';

import { VerseAdmin } from './verse-admin';

import type { SupabaseClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export interface SeedRow {
  group_id: number;
  slug: string;
  name: string;
  wikidata_qid: string | null;
  musicbrainz_mbid: string | null;
  confidence: string | null;
  checked_at: string | null;
  idols: number;
  albums: number;
  flaggedAlbums: number;
  flaggedIdols: number;
}

export interface FlaggedAlbum { id: number; group: string; title: string; type: string; region: string; review_reason: string | null; }
export interface FlaggedIdol { id: number; group: string; name: string; wikidata_qid: string | null; review_reason: string | null; }
export interface ConflictRow { entity_id: string; field: string; ingested: string; override: string; author: string; entity_type: string; }

async function headCount(svc: SupabaseClient, table: string, notNull?: string): Promise<number> {
  let q = svc.from(table).select('*', { count: 'exact', head: true });
  if (notNull) q = q.not(notNull, 'is', null);
  const { count } = await q;
  return count ?? 0;
}

export default async function VerseAdminPage(): Promise<React.ReactElement> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.id)) redirect('/');

  const svc = createServiceRoleClient();

  // Pull small arrays once and tally in JS (avoids per-group COUNT storms).
  const [{ data: idolRows }, { data: albumRows }, tracksTotal, tracksLinked, unitsTotal, sourcesTotal, overridesTotal] = await Promise.all([
    svc.from('idols').select('group_id,active,needs_review'),
    svc.from('albums').select('group_id,review_flag'),
    headCount(svc, 'album_tracks'),
    headCount(svc, 'album_tracks', 'song_id'),
    headCount(svc, 'group_units'),
    headCount(svc, 'entity_sources'),
    headCount(svc, 'entity_overrides'),
  ]);
  const idols = (idolRows ?? []) as Array<{ group_id: number; active: boolean; needs_review: boolean }>;
  const albums = (albumRows ?? []) as Array<{ group_id: number; review_flag: boolean }>;

  const perGroup = new Map<number, { idols: number; albums: number; flaggedAlbums: number; flaggedIdols: number }>();
  const bump = (gid: number) => {
    if (!perGroup.has(gid)) perGroup.set(gid, { idols: 0, albums: 0, flaggedAlbums: 0, flaggedIdols: 0 });
    return perGroup.get(gid)!;
  };
  for (const i of idols) { const b = bump(i.group_id); if (i.active) b.idols++; if (i.needs_review) b.flaggedIdols++; }
  for (const a of albums) { const b = bump(a.group_id); b.albums++; if (a.review_flag) b.flaggedAlbums++; }

  const { data: seeds } = await svc
    .from('verse_seed_ids')
    .select('group_id,wikidata_qid,musicbrainz_mbid,confidence,checked_at,groups(slug,name)')
    .order('group_id');
  const seedRows: SeedRow[] = ((seeds ?? []) as unknown as Array<{ group_id: number; wikidata_qid: string | null; musicbrainz_mbid: string | null; confidence: string | null; checked_at: string | null; groups: { slug: string; name: string } | null }>)
    .map((s) => {
      const b = perGroup.get(s.group_id) ?? { idols: 0, albums: 0, flaggedAlbums: 0, flaggedIdols: 0 };
      return {
        group_id: s.group_id, slug: s.groups?.slug ?? String(s.group_id), name: s.groups?.name ?? '',
        wikidata_qid: s.wikidata_qid, musicbrainz_mbid: s.musicbrainz_mbid, confidence: s.confidence,
        checked_at: s.checked_at, ...b,
      };
    });

  const { data: fAlbums } = await svc
    .from('albums')
    .select('id,title,type,region,review_reason,groups(name)')
    .eq('review_flag', true).order('group_id').limit(200);
  const flaggedAlbumRows: FlaggedAlbum[] = ((fAlbums ?? []) as unknown as Array<{ id: number; title: string; type: string; region: string; review_reason: string | null; groups: { name: string } | null }>)
    .map((a) => ({ id: a.id, group: a.groups?.name ?? '', title: a.title, type: a.type, region: a.region, review_reason: a.review_reason }));

  const { data: fIdols } = await svc
    .from('idols')
    .select('id,name,wikidata_qid,review_reason,groups(name)')
    // Wikidata mismatches only; curator-created members have their own queue (/admin/member-review).
    .eq('needs_review', true).or('origin.is.null,origin.neq.curator').order('group_id').limit(200);
  const flaggedIdolRows: FlaggedIdol[] = ((fIdols ?? []) as unknown as Array<{ id: number; name: string; wikidata_qid: string | null; review_reason: string | null; groups: { name: string } | null }>)
    .map((i) => ({ id: i.id, group: i.groups?.name ?? '', name: i.name, wikidata_qid: i.wikidata_qid, review_reason: i.review_reason }));

  const conflictSets = await Promise.all([
    findConflicts(svc, 'group', 'groups'),
    findConflicts(svc, 'idol', 'idols'),
    findConflicts(svc, 'album', 'albums'),
  ]);
  const conflicts: ConflictRow[] = [
    ...conflictSets[0].map((c) => ({ ...c, entity_type: 'group' })),
    ...conflictSets[1].map((c) => ({ ...c, entity_type: 'idol' })),
    ...conflictSets[2].map((c) => ({ ...c, entity_type: 'album' })),
  ];

  const counts = {
    idolsTotal: idols.length,
    idolsActive: idols.filter((i) => i.active).length,
    idolsFlagged: idols.filter((i) => i.needs_review).length,
    albumsTotal: albums.length,
    albumsFlagged: albums.filter((a) => a.review_flag).length,
    tracksTotal, tracksLinked, unitsTotal, sourcesTotal, overridesTotal,
    seededGroups: seedRows.length, checkedGroups: seedRows.filter((r) => r.checked_at).length,
  };

  return (
    <VerseAdmin
      counts={counts}
      seeds={seedRows}
      flaggedAlbums={flaggedAlbumRows}
      flaggedIdols={flaggedIdolRows}
      conflicts={conflicts}
    />
  );
}
