// W1.4 - MusicBrainz backfill: discography FILTER + tracklist + song matching.
//
// Reads ONLY checked seeds with an MBID. For each group, launch/flagship first:
//   1. Fetch release-groups (primary type Album|EP only - singles/broadcast are
//      dropped at the query).
//   2. FILTER (W0 finding 5): drop secondary-typed noise (live/compilation/
//      remix/dj-mix); dedupe same-title reissues keeping the earliest, flagging
//      the survivor for curator review.
//   3. For each kept album fetch its releases (inc=recordings): pick the
//      canonical release, read the tracklist, decide region KR/JP/other, and
//      flag albums that have multiple releases (versions) for review.
//   4. Song matching (W0 finding 6): a title-cleanup normalizer links each track
//      to our songs catalog within the same group. Ambiguous (multi-match) ->
//      left null, never guessed.
// Every written fact gets an entity_sources row. Canonical precedence holds: we
// never touch group/song identity; albums/tracks are new rows.
//
// Rate: 1.1s/request, retry on 5xx. Resumable via tmp manifest.
// Usage:  node scripts/verse/03-musicbrainz-backfill.mjs [--fresh]
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const UA = 'KpopQuizVerse-W1-Backfill/1.0 ( kaspermaiden@gmail.com )';
const BASE = 'https://musicbrainz.org/ws/2';
const PACE = 1100;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const MANIFEST = join(tmpdir(), 'verse_musicbrainz_backfill.json');
const FRESH = process.argv.includes('--fresh');

// Secondary types that mark a release group as version/reissue noise.
const NOISE_SECONDARY = new Set(['Compilation', 'Live', 'Remix', 'DJ-mix', 'Mixtape/Street', 'Demo']);

async function mb(path) {
  const url = `${BASE}/${path}${path.includes('?') ? '&' : '?'}fmt=json`;
  for (let attempt = 0; attempt < 4; attempt++) {
    const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': 'application/json' } });
    if (r.status === 503 || r.status >= 500) { await sleep(2500); continue; }
    if (!r.ok) throw new Error(`MB ${r.status} ${path}`);
    await sleep(PACE);
    return r.json();
  }
  throw new Error(`MB retries exhausted ${path}`);
}

function dbClient() {
  const envPath = process.env.QUIZ_ENV || '/Users/louis/IT/Dev/projects/KpopQuizzV2/apps/quiz/.env.local';
  const env = Object.fromEntries(readFileSync(envPath, 'utf8').split('\n').filter(l => l.includes('=')).map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; }));
  return import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } }));
}

// Title-cleanup normalizer (W0 finding 6): strip parens/brackets, feat credits,
// version/inst suffixes, punctuation. Lowercase alnum.
function normTitle(t) {
  return (t || '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\b(feat|ft|featuring)\.?.*$/i, ' ')
    .replace(/\s-\s.*$/, ' ')          // "Song - Live" / "- Inst." tails
    .replace(/[^a-z0-9가-힣]/gi, '')
    .toLowerCase();
}

function pickCanonicalRelease(releases) {
  if (!releases?.length) return { rel: null, region: 'other', versionCount: 0 };
  const score = r => (r.status === 'Official' ? 2 : 0) + (r.country === 'KR' ? 2 : (r.country === 'JP' ? 1 : 0));
  const sorted = [...releases].sort((a, b) => score(b) - score(a) || (a.date || '9999').localeCompare(b.date || '9999'));
  const rel = sorted[0];
  let region = 'other';
  const lang = JSON.stringify(rel['text-representation'] || {});
  if (rel.country === 'KR' || /kor/i.test(lang)) region = 'kr';
  else if (rel.country === 'JP' || /jpn/i.test(lang)) region = 'jp';
  return { rel, region, versionCount: releases.length };
}

async function loadSongsByGroup(db, groupIds) {
  const map = {};
  let from = 0;
  while (true) {
    const { data } = await db.from('songs').select('id,title,group_id').eq('status', 'active').in('group_id', groupIds).range(from, from + 999);
    if (!data || !data.length) break;
    for (const s of data) (map[s.group_id] ||= []).push({ id: s.id, norm: normTitle(s.title) });
    if (data.length < 1000) break; from += 1000;
  }
  return map;
}

async function getOrInsertAlbum(db, row) {
  if (row.musicbrainz_mbid) {
    const { data: ex } = await db.from('albums').select('id').eq('musicbrainz_mbid', row.musicbrainz_mbid).maybeSingle();
    if (ex?.id) { await db.from('albums').update({ ...row, updated_at: new Date().toISOString() }).eq('id', ex.id); return ex.id; }
  }
  const { data, error } = await db.from('albums').insert(row).select('id').single();
  if (error) throw new Error('album insert: ' + error.message);
  return data.id;
}

async function main() {
  const db = await dbClient();
  const { data: seeds } = await db.from('verse_seed_ids')
    .select('group_id,musicbrainz_mbid,checked_at,confidence,groups(slug,name)')
    .not('checked_at', 'is', null).not('musicbrainz_mbid', 'is', null);
  // launch/flagship-first ordering: HIGH-confidence flagship groups first.
  const checked = (seeds || []).sort((a, b) => a.group_id - b.group_id);
  console.log(`Checked+MBID groups: ${checked.length}`);
  if (!checked.length) { console.log('Nothing to ingest (gate).'); return; }

  const done = (!FRESH && existsSync(MANIFEST)) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : {};
  const songsByGroup = await loadSongsByGroup(db, checked.map(s => s.group_id));
  const report = [];

  for (const s of checked) {
    const gid = s.group_id, mbid = s.musicbrainz_mbid, slug = s.groups?.slug || gid;
    if (done[gid]) { console.log(`  skip ${slug} (manifest)`); continue; }
    try {
      const rgResp = await mb(`release-group?artist=${mbid}&type=album|ep&limit=100`);
      const rgs = rgResp['release-groups'] || [];
      // filter: drop secondary-typed noise
      const clean = rgs.filter(rg => !(rg['secondary-types'] || []).some(t => NOISE_SECONDARY.has(t)));
      const droppedNoise = rgs.length - clean.length;
      // dedupe same-title reissues: keep earliest first-release-date
      const byTitle = {};
      for (const rg of clean) {
        const k = normTitle(rg.title);
        if (!byTitle[k] || (rg['first-release-date'] || '9999') < (byTitle[k]['first-release-date'] || '9999')) {
          byTitle[k] = { ...rg, _dupes: (byTitle[k]?._dupes || 0) + (byTitle[k] ? 1 : 0) };
        } else { byTitle[k]._dupes = (byTitle[k]._dupes || 0) + 1; }
      }
      const kept = Object.values(byTitle);

      const songs = songsByGroup[gid] || [];
      let albumsInserted = 0, tracksTotal = 0, tracksLinked = 0, withTracklist = 0, flagged = 0;
      for (const rg of kept) {
        const relResp = await mb(`release?release-group=${rg.id}&inc=recordings&limit=25`);
        const { rel, region, versionCount } = pickCanonicalRelease(relResp.releases || []);
        const release_date = rg['first-release-date'] && rg['first-release-date'].length >= 10 ? rg['first-release-date'] : null;
        // Flag only genuinely AMBIGUOUS cases for a curator. Multiple pressings
        // (versionCount > 1) are NORMAL for K-pop and are NOT flagged - we
        // already picked the canonical release. Ambiguous = a same-title reissue
        // (which release group is canonical?), an undetermined region, or a
        // missing date. versionCount is still recorded for context.
        const reissue = (rg._dupes || 0) > 0;
        const unknownRegion = region === 'other';
        const noDate = !release_date;
        const review = reissue || unknownRegion || noDate;
        if (review) flagged++;
        const albumRow = {
          group_id: gid,
          title: rg.title,
          release_date,
          type: (rg['primary-type'] || 'album').toLowerCase() === 'ep' ? 'ep' : 'album',
          region,
          cover_source: 'MusicBrainz release-group ' + rg.id,
          musicbrainz_mbid: rg.id,
          review_flag: review,
          review_reason: review ? [
            reissue ? `${rg._dupes} same-title reissue(s)` : null,
            unknownRegion ? 'region undetermined' : null,
            noDate ? 'no release date' : null,
            versionCount > 1 ? `(${versionCount} pressings)` : null,
          ].filter(Boolean).join('; ') : null,
        };
        const albumId = await getOrInsertAlbum(db, albumRow);
        albumsInserted++;
        await db.from('entity_sources').upsert(
          ['title', 'release_date', 'region'].map(field => ({ entity_type: 'album', entity_id: String(albumId), field, source: 'musicbrainz', source_ref: rg.id, fetched_at: new Date().toISOString() })),
          { onConflict: 'entity_type,entity_id,field,source' });

        const tracks = rel?.media?.[0]?.tracks || [];
        if (tracks.length) withTracklist++;
        // replace tracklist for idempotency
        await db.from('album_tracks').delete().eq('album_id', albumId);
        const trackRows = [];
        for (let i = 0; i < tracks.length; i++) {
          const tt = tracks[i]?.title || '';
          tracksTotal++;
          const n = normTitle(tt);
          const matches = songs.filter(x => x.norm && (x.norm === n || x.norm.includes(n) || n.includes(x.norm)) && n.length > 2);
          const songId = matches.length === 1 ? matches[0].id : null; // ambiguity -> null, never guess
          if (songId) tracksLinked++;
          trackRows.push({ album_id: albumId, position: i + 1, title: tt, song_id: songId, musicbrainz_mbid: tracks[i]?.recording?.id || null });
        }
        if (trackRows.length) await db.from('album_tracks').insert(trackRows);
      }

      done[gid] = true;
      writeFileSync(MANIFEST, JSON.stringify(done, null, 2));
      const line = { slug, rgs: rgs.length, droppedNoise, kept: kept.length, albumsInserted, withTracklist, tracksTotal, tracksLinked, flagged };
      report.push(line);
      console.log(`  ${slug.padEnd(14)} RGs=${line.rgs} droppedNoise=${droppedNoise} kept=${kept.length} tracklists=${withTracklist}/${kept.length} tracks=${tracksTotal} linked=${tracksLinked} flagged=${flagged}`);
    } catch (e) {
      console.error(`  ERROR ${slug}: ${e.message}`);
    }
  }

  console.log(`\n=== MUSICBRAINZ BACKFILL DONE ===`);
  const sum = (k) => report.reduce((a, r) => a + r[k], 0);
  console.log(`groups: ${report.length} | albums kept: ${sum('albumsInserted')} | dropped noise RGs: ${sum('droppedNoise')} | flagged for review: ${sum('flagged')}`);
  console.log(`tracks: ${sum('tracksTotal')} | linked to our songs: ${sum('tracksLinked')} (${sum('tracksTotal') ? (sum('tracksLinked') / sum('tracksTotal') * 100).toFixed(0) : 0}%)`);
  writeFileSync(join(tmpdir(), 'verse_mb_report.json'), JSON.stringify(report, null, 2));
}

main();
