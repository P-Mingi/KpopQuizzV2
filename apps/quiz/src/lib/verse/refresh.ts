// Verse weekly delta refresh (used by /api/cron/verse-refresh).
//
// - Re-fetches group fields from Wikidata (ALLOWLIST only) and updates the
//   ingested columns. Detects NEW MusicBrainz albums since last run and inserts
//   them (filtered, review-flagged).
// - NEVER writes entity_overrides. A curator override always wins at read; when
//   a fresh ingested value differs from an existing override, that is counted as
//   a conflict and surfaced (never auto-overwritten).
// - Rate-limited (MusicBrainz 1 req/sec) and fail-soft per group.
import type { SupabaseClient } from '@supabase/supabase-js';

// Group-field property allowlist (P571/P264/P495/P856) is enforced inline in the
// SPARQL below; see lib/verse/allowlist.ts for the canonical list.
const WD_UA = 'KpopQuizVerse-Refresh/1.0 ( kaspermaiden@gmail.com )';
const MB_UA = 'KpopQuizVerse-Refresh/1.0 ( kaspermaiden@gmail.com )';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const NOISE_SECONDARY = new Set(['Compilation', 'Live', 'Remix', 'DJ-mix', 'Mixtape/Street', 'Demo']);

export interface RefreshStats {
  groups: number;
  fieldsUpdated: number;
  newAlbums: number;
  conflicts: number;
  errors: string[];
}

async function sparql(query: string): Promise<Record<string, { value: string }>[]> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const r = await fetch(`https://query.wikidata.org/sparql?query=${encodeURIComponent(query)}&format=json`, {
      headers: { 'User-Agent': WD_UA, Accept: 'application/sparql-results+json' },
    });
    if (r.status === 429 || r.status >= 500) { await sleep(2000); continue; }
    if (!r.ok) throw new Error(`SPARQL ${r.status}`);
    await sleep(350);
    return (await r.json()).results.bindings;
  }
  throw new Error('SPARQL retries exhausted');
}

async function mb(path: string): Promise<Record<string, unknown>> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const r = await fetch(`https://musicbrainz.org/ws/2/${path}${path.includes('?') ? '&' : '?'}fmt=json`, {
      headers: { 'User-Agent': MB_UA, Accept: 'application/json' },
    });
    if (r.status >= 500) { await sleep(2500); continue; }
    if (!r.ok) throw new Error(`MB ${r.status}`);
    await sleep(1100);
    return r.json();
  }
  throw new Error('MB retries exhausted');
}

async function refreshGroupFields(
  svc: SupabaseClient,
  groupId: number,
  qid: string,
): Promise<{ updated: number; conflicts: number }> {
  const rows = await sparql(`
SELECT ?inception ?labelLabel ?countryLabel ?website WHERE {
  OPTIONAL { wd:${qid} wdt:P571 ?inception. }
  OPTIONAL { wd:${qid} wdt:P264 ?label. }
  OPTIONAL { wd:${qid} wdt:P495 ?country. }
  OPTIONAL { wd:${qid} wdt:P856 ?website. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}`);
  const vals: Record<string, string | null> = { inception_date: null, record_label: null, origin_country: null, official_website: null };
  for (const r of rows) {
    if (r.inception && !vals.inception_date) vals.inception_date = r.inception.value.slice(0, 10);
    if (r.labelLabel && !vals.record_label) vals.record_label = r.labelLabel.value;
    if (r.countryLabel && !vals.origin_country) vals.origin_country = r.countryLabel.value;
    if (r.website && !vals.official_website) vals.official_website = r.website.value;
  }
  // detect conflicts against existing overrides (never overwrite them)
  const { data: ovs } = await svc.from('entity_overrides').select('field,value').eq('entity_type', 'group').eq('entity_id', String(groupId));
  const ovMap = new Map((ovs ?? []).map((o: { field: string; value: string | null }) => [o.field, o.value]));
  let conflicts = 0;
  for (const [field, v] of Object.entries(vals)) {
    if (ovMap.has(field) && String(ovMap.get(field) ?? '') !== String(v ?? '')) conflicts++;
  }
  await svc.from('groups').update(vals).eq('id', groupId);
  const srcRows = Object.entries(vals).filter(([, v]) => v != null).map(([field]) => ({
    entity_type: 'group', entity_id: String(groupId), field, source: 'wikidata',
    source_ref: qid, fetched_at: new Date().toISOString(),
  }));
  if (srcRows.length) await svc.from('entity_sources').upsert(srcRows, { onConflict: 'entity_type,entity_id,field,source' });
  const updated = Object.values(vals).filter((v) => v != null).length;
  return { updated, conflicts };
}

async function insertNewAlbums(
  svc: SupabaseClient,
  groupId: number,
  mbid: string,
  maxTracklists: number,
): Promise<number> {
  const resp = await mb(`release-group?artist=${mbid}&type=album|ep&limit=100`);
  const rgs = ((resp['release-groups'] as Record<string, unknown>[]) ?? [])
    .filter((rg) => !((rg['secondary-types'] as string[]) ?? []).some((t) => NOISE_SECONDARY.has(t)));
  const { data: existing } = await svc.from('albums').select('musicbrainz_mbid').eq('group_id', groupId);
  const known = new Set((existing ?? []).map((a: { musicbrainz_mbid: string | null }) => a.musicbrainz_mbid));
  let inserted = 0, tracklistBudget = maxTracklists;
  for (const rg of rgs) {
    const rgId = rg.id as string;
    if (known.has(rgId)) continue;
    const frd = rg['first-release-date'] as string | undefined;
    const { data: alb } = await svc.from('albums').insert({
      group_id: groupId,
      title: rg.title as string,
      release_date: frd && frd.length >= 10 ? frd : null,
      type: String(rg['primary-type'] ?? 'album').toLowerCase() === 'ep' ? 'ep' : 'album',
      region: 'kr',
      cover_source: 'MusicBrainz release-group ' + rgId,
      musicbrainz_mbid: rgId,
      review_flag: true,
      review_reason: 'New release detected by weekly refresh; confirm region/canonical.',
    }).select('id').single();
    inserted++;
    if (alb?.id) {
      await svc.from('entity_sources').upsert(
        ['title', 'release_date'].map((field) => ({ entity_type: 'album', entity_id: String(alb.id), field, source: 'musicbrainz', source_ref: rgId, fetched_at: new Date().toISOString() })),
        { onConflict: 'entity_type,entity_id,field,source' });
      if (tracklistBudget > 0) {
        tracklistBudget--;
        try {
          const relResp = await mb(`release?release-group=${rgId}&inc=recordings&limit=25`);
          const rel = ((relResp.releases as Record<string, unknown>[]) ?? [])[0];
          const tracks = ((rel?.media as Record<string, unknown>[])?.[0]?.tracks as Record<string, unknown>[]) ?? [];
          const rows = tracks.map((t, i) => ({ album_id: alb.id, position: i + 1, title: (t.title as string) ?? '', musicbrainz_mbid: (t.recording as { id?: string })?.id ?? null }));
          if (rows.length) await svc.from('album_tracks').insert(rows);
        } catch { /* tracklist is best-effort on refresh */ }
      }
    }
  }
  return inserted;
}

export async function runVerseRefresh(svc: SupabaseClient, opts: { maxGroups?: number; maxNewTracklists?: number; groupId?: number } = {}): Promise<RefreshStats> {
  const stats: RefreshStats = { groups: 0, fieldsUpdated: 0, newAlbums: 0, conflicts: 0, errors: [] };
  let query = svc
    .from('verse_seed_ids')
    .select('group_id,wikidata_qid,musicbrainz_mbid,updated_at,groups(slug)')
    .not('checked_at', 'is', null)
    .order('updated_at', { ascending: true });
  if (opts.groupId) query = query.eq('group_id', opts.groupId);
  const { data: seeds } = await query;
  let list = seeds ?? [];
  if (opts.maxGroups) list = list.slice(0, opts.maxGroups);

  for (const s of list as unknown as Array<{ group_id: number; wikidata_qid: string | null; musicbrainz_mbid: string | null; groups: { slug: string } | null }>) {
    const slug = s.groups?.slug ?? String(s.group_id);
    try {
      if (s.wikidata_qid) {
        const { updated, conflicts } = await refreshGroupFields(svc, s.group_id, s.wikidata_qid);
        stats.fieldsUpdated += updated;
        stats.conflicts += conflicts;
      }
      if (s.musicbrainz_mbid) {
        stats.newAlbums += await insertNewAlbums(svc, s.group_id, s.musicbrainz_mbid, opts.maxNewTracklists ?? 5);
      }
      await svc.from('verse_seed_ids').update({ updated_at: new Date().toISOString() }).eq('group_id', s.group_id);
      stats.groups++;
    } catch (e) {
      stats.errors.push(`${slug}: ${(e as Error).message}`);
    }
  }
  return stats;
}
