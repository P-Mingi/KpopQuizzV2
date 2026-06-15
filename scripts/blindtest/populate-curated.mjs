#!/usr/bin/env node
// ============================================================
// Curated, tiered K-pop blindtest catalog builder (B10 data)
// ------------------------------------------------------------
// For each artist in kpop-artists-catalog.mjs: fetch Deezer ARTIST TOP TRACKS
// (keyless, 300ms self-rate-limit, NO album crawl), junk-filter, cap the best
// ~N by rank, tier each song, recompute wrong answers, write songs-curated.json.
//
// Run: node scripts/blindtest/populate-curated.mjs
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ARTISTS from '../../apps/blindtest/docs/kpop-artists-catalog.mjs';
import { CANON } from './iconic-canon.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEEZER = 'https://api.deezer.com';
const RATE_LIMIT_MS = 300;
const FETCH_LIMIT = 40;   // top tracks pulled per artist before filtering
const CAP_PER_ARTIST = 18; // best-by-rank kept per artist after filtering

// ---- junk filter -------------------------------------------------------
// Drop remixes / instrumentals / live / versions / edits / skits. Word
// boundaries where a bare substring would nuke real titles (\blive\b keeps
// "Alive"; MR handled separately so "Mr. Simple"/"Mr. Taxi" survive).
const JUNK = /\b(?:remix|instrumental|inst|acoustic|karaoke|ver|live|edit|interlude|intro|outro|skit|reverb|nightcore|slowed|demo|remaster(?:ed)?)\b|sped\s?up|\b8d\b/i;
const MR_JUNK = /\bmr\s*removed\b|\(\s*mr\s*\)/i;
const isJunk = (title) => JUNK.test(title) || MR_JUNK.test(title);

// ---- normalization (for canon match + title de-dupe) -------------------
function stripDiacritics(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
function normTitle(s) {
  return stripDiacritics(String(s))
    .replace(/\([^)]*\)/g, ' ').replace(/\[[^\]]*\]/g, ' ') // drop parentheticals
    .replace(/\b(?:feat|ft|with)\b.*$/i, ' ')               // drop featuring
    .toLowerCase().replace(/[^a-z0-9]/g, '');
}
function normArtist(s) {
  return stripDiacritics(String(s)).toLowerCase().replace(/[^a-z0-9]/g, '');
}
const canonKey = (artist, title) => `${normArtist(artist)}|${normTitle(title)}`;
const CANON_SET = new Set(CANON.map((c) => canonKey(c.artist, c.title)));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function deezer(url) {
  await sleep(RATE_LIMIT_MS);
  try {
    const res = await fetch(url);
    if (!res.ok) { console.error(`  HTTP ${res.status} ${url}`); return null; }
    return await res.json();
  } catch (e) { console.error(`  fetch error ${e.message}`); return null; }
}

function nameMatch(a, b) {
  const x = normArtist(a), y = normArtist(b);
  return x === y || x.includes(y) || y.includes(x);
}

async function resolveArtistId(artist) {
  if (artist.deezer_artist_id) return artist.deezer_artist_id;
  if (!artist.deezer_search) return null;
  const data = await deezer(`${DEEZER}/search/artist?q=${encodeURIComponent(artist.deezer_search)}&limit=10`);
  if (!data?.data?.length) return null;
  const hit = data.data.find((r) => nameMatch(r.name, artist.name));
  return hit ? hit.id : null;
}

// ---- main --------------------------------------------------------------
async function main() {
  console.log(`Building curated catalog from ${ARTISTS.length} artists (cap ${CAP_PER_ARTIST}/artist)...\n`);

  const songs = [];
  const seenTrackIds = new Set();
  let junkDropped = 0;
  const notFound = [];

  for (let i = 0; i < ARTISTS.length; i++) {
    const artist = ARTISTS[i];
    const id = await resolveArtistId(artist);
    if (!id) { notFound.push(artist.name); console.log(`[${i + 1}/${ARTISTS.length}] ${artist.name} - NOT FOUND`); continue; }

    const data = await deezer(`${DEEZER}/artist/${id}/top?limit=${FETCH_LIMIT}`);
    const tracks = (data?.data ?? [])
      .filter((t) => t.preview && typeof t.preview === 'string' && t.preview.length > 10)
      .filter((t) => !isJunk(t.title_short ?? t.title))
      .filter((t) => { if (seenTrackIds.has(t.id)) return false; seenTrackIds.add(t.id); return true; });

    // keep best-by-rank, capped
    tracks.sort((a, b) => (b.rank ?? 0) - (a.rank ?? 0));
    const kept = tracks.slice(0, CAP_PER_ARTIST);

    for (const t of kept) {
      songs.push({
        deezer_track_id: t.id,
        title: t.title_short ?? t.title,
        artist_name: artist.name,
        album_name: t.album?.title ?? null,
        album_cover_small: t.album?.cover_small ?? null,
        album_cover_medium: t.album?.cover_medium ?? null,
        album_cover_big: t.album?.cover_big ?? null,
        preview_url: t.preview,
        duration: t.duration ?? null,
        deezer_rank: t.rank ?? 0,
        gender: artist.gender,
        generation: artist.generation,
        is_title_track: null,
        year: null,
        difficulty: 'medium',
        status: 'active',
        wrong_answers_artist: [],
        wrong_answers_title: [],
        tier: null,
      });
    }
    junkDropped += (data?.data?.length ?? 0) - tracks.length;
    console.log(`[${i + 1}/${ARTISTS.length}] ${artist.name} - kept ${kept.length}`);
  }

  // ---- TIER assignment -------------------------------------------------
  // iconic = canon match. Else by deezer_rank percentile across the whole set.
  const ranks = songs.map((s) => s.deezer_rank).sort((a, b) => a - b);
  const n = ranks.length;
  const pctOf = (rank) => {
    // share of songs with a strictly lower rank => higher rank = higher pct
    let lo = 0, hi = n;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (ranks[mid] < rank) lo = mid + 1; else hi = mid; }
    return n > 1 ? lo / (n - 1) : 1;
  };
  const P = { popular: 0.75, medium: 0.40, hard: 0.10 }; // cut points (percentile of rank)
  const TITLE_BOOST = 0.55; // title track + this percentile -> popular (inert: is_title_track null)

  let iconicMatched = 0;
  for (const s of songs) {
    if (CANON_SET.has(canonKey(s.artist_name, s.title))) { s.tier = 'iconic'; iconicMatched++; continue; }
    const p = pctOf(s.deezer_rank);
    if (p >= P.popular || (s.is_title_track && p >= TITLE_BOOST)) s.tier = 'popular';
    else if (p >= P.medium) s.tier = 'medium';
    else if (p >= P.hard) s.tier = 'hard';
    else s.tier = 'unknown';
  }

  // ---- wrong answers (same-gender artists / same-artist+gender titles) --
  const byGender = {};
  const titlesByArtist = {};
  const artistsByGender = {};
  for (const s of songs) {
    (byGender[s.gender] ??= []).push(s);
    (titlesByArtist[s.artist_name] ??= new Set()).add(s.title);
  }
  for (const [g, arr] of Object.entries(byGender)) {
    artistsByGender[g] = [...new Set(arr.map((s) => s.artist_name))];
  }
  const sample = (arr, k) => [...arr].sort(() => Math.random() - 0.5).slice(0, k);
  for (const s of songs) {
    s.wrong_answers_artist = sample(artistsByGender[s.gender].filter((a) => a !== s.artist_name), 3);
    const own = [...(titlesByArtist[s.artist_name] ?? [])].filter((t) => t !== s.title);
    let titles = sample(own, 3);
    if (titles.length < 3) {
      const pool = byGender[s.gender].filter((x) => x.artist_name !== s.artist_name).map((x) => x.title);
      titles = [...new Set([...titles, ...sample(pool, 12)])].slice(0, 3);
    }
    s.wrong_answers_title = titles;
  }

  // ---- write + report --------------------------------------------------
  const outPath = path.join(__dirname, 'songs-curated.json');
  fs.writeFileSync(outPath, JSON.stringify(songs, null, 2));

  const tierCounts = {}; const genCounts = {};
  for (const s of songs) { tierCounts[s.tier] = (tierCounts[s.tier] ?? 0) + 1; genCounts[s.generation] = (genCounts[s.generation] ?? 0) + 1; }
  const cut = (p) => ranks[Math.min(n - 1, Math.round(p * (n - 1)))];

  console.log('\n========== REPORT ==========');
  console.log(`Total songs: ${n}`);
  console.log(`Artists not found: ${notFound.length}${notFound.length ? ' -> ' + notFound.join(', ') : ''}`);
  console.log(`Junk tracks dropped: ${junkDropped}`);
  console.log(`Canon size: ${CANON.length}, iconic matched in set: ${iconicMatched}`);
  console.log('\nTier counts:', JSON.stringify(tierCounts));
  console.log('Generation counts:', JSON.stringify(genCounts));
  console.log('\nPercentile cut points (deezer_rank):');
  console.log(`  popular >= p75 rank=${cut(0.75)}`);
  console.log(`  medium  [p40,p75) rank=[${cut(0.40)}, ${cut(0.75)})`);
  console.log(`  hard    [p10,p40) rank=[${cut(0.10)}, ${cut(0.40)})`);
  console.log(`  unknown < p10 rank<${cut(0.10)}`);
  for (const tier of ['iconic', 'popular', 'medium', 'hard', 'unknown']) {
    const ex = songs.filter((s) => s.tier === tier).slice(0, 5).map((s) => `${s.artist_name} - ${s.title}`);
    console.log(`\n[${tier}] samples:`); ex.forEach((e) => console.log('  ' + e));
  }
  console.log(`\nWrote ${outPath}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
