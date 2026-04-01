#!/usr/bin/env node

// ============================================
// K-pop Song Database Population Script
// ============================================
// Run: node populate-songs.mjs
// Output: songs-database.json (ready for Supabase import)
//
// This script:
// 1. Searches Deezer for each K-pop artist
// 2. Fetches ALL their tracks (with pagination)
// 3. Filters for tracks with 30s preview URLs
// 4. Generates wrong answers for each song
// 5. Outputs a JSON file ready for database import

import ARTISTS from './kpop-artists-catalog.mjs';
import fs from 'fs';

const DEEZER_API = 'https://api.deezer.com';
const RATE_LIMIT_MS = 300; // Deezer rate limit: ~50 req/5s
const MAX_TRACKS_PER_ARTIST = 200;

// ============================================
// Deezer API Helpers
// ============================================

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function deezerFetch(url) {
  await sleep(RATE_LIMIT_MS);
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`  HTTP ${res.status} for ${url}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error(`  Fetch error for ${url}: ${err.message}`);
    return null;
  }
}

// Search for an artist and get their Deezer artist ID
async function findArtist(searchQuery, artistName) {
  const data = await deezerFetch(
    `${DEEZER_API}/search/artist?q=${encodeURIComponent(searchQuery)}&limit=5`
  );

  if (!data || !data.data || data.data.length === 0) {
    console.warn(`  Artist not found: ${artistName} (search: ${searchQuery})`);
    return null;
  }

  // Try exact match first
  const exact = data.data.find(
    a => a.name.toLowerCase() === artistName.toLowerCase()
  );
  if (exact) return exact;

  // Fallback to first result
  return data.data[0];
}

// Get all tracks for an artist (with pagination)
async function getArtistTracks(artistId) {
  const tracks = [];
  let url = `${DEEZER_API}/artist/${artistId}/top?limit=100`;

  while (url && tracks.length < MAX_TRACKS_PER_ARTIST) {
    const data = await deezerFetch(url);
    if (!data || !data.data) break;

    for (const track of data.data) {
      if (track.preview && track.preview.length > 10) {
        tracks.push(track);
      }
    }

    url = data.next || null;
  }

  // Also search for more tracks via search
  const searchData = await deezerFetch(
    `${DEEZER_API}/search/track?q=artist:"${encodeURIComponent(artistId)}"&limit=100`
  );

  if (searchData && searchData.data) {
    for (const track of searchData.data) {
      if (
        track.preview &&
        track.preview.length > 10 &&
        !tracks.find(t => t.id === track.id)
      ) {
        tracks.push(track);
      }
    }
  }

  return tracks;
}

// ============================================
// Wrong Answer Generation
// ============================================

function generateWrongAnswers(song, allSongs, allArtists) {
  const wrongArtists = [];
  const wrongTitles = [];

  // Wrong artists: same gender + similar generation
  const sameGenderArtists = allArtists
    .filter(a =>
      a.name !== song.artist_name &&
      a.gender === song.gender &&
      a.songCount > 0
    )
    .sort(() => Math.random() - 0.5);

  // Prefer same generation, then nearby
  const sameGen = sameGenderArtists.filter(a => a.generation === song.generation);
  const otherGen = sameGenderArtists.filter(a => a.generation !== song.generation);
  const candidates = [...sameGen, ...otherGen];

  for (const a of candidates.slice(0, 3)) {
    wrongArtists.push(a.name);
  }

  // Wrong titles: other songs by the SAME artist
  const sameArtistSongs = allSongs
    .filter(s => s.artist_name === song.artist_name && s.title !== song.title)
    .sort(() => Math.random() - 0.5);

  for (const s of sameArtistSongs.slice(0, 3)) {
    wrongTitles.push(s.title);
  }

  // If not enough wrong titles from same artist, grab from same gender
  if (wrongTitles.length < 3) {
    const otherSongs = allSongs
      .filter(s => s.artist_name !== song.artist_name && s.gender === song.gender)
      .sort(() => Math.random() - 0.5);

    for (const s of otherSongs) {
      if (wrongTitles.length >= 3) break;
      if (!wrongTitles.includes(s.title)) {
        wrongTitles.push(s.title);
      }
    }
  }

  return { wrongArtists, wrongTitles };
}

// ============================================
// Main Population Logic
// ============================================

async function main() {
  console.log('=== K-pop Song Database Population ===');
  console.log(`Processing ${ARTISTS.length} artists...\n`);

  const allSongs = [];
  const artistStats = [];
  const seenTrackIds = new Set();
  let totalSkipped = 0;

  for (let i = 0; i < ARTISTS.length; i++) {
    const artist = ARTISTS[i];
    const progress = `[${i + 1}/${ARTISTS.length}]`;

    console.log(`${progress} Searching: ${artist.name} (${artist.deezer_search})`);

    // Find artist on Deezer
    const deezerArtist = await findArtist(artist.deezer_search, artist.name);

    if (!deezerArtist) {
      artistStats.push({ ...artist, songCount: 0, deezer_id: null });
      continue;
    }

    console.log(`  Found: ${deezerArtist.name} (ID: ${deezerArtist.id})`);

    // Get all tracks
    const tracks = await getArtistTracks(deezerArtist.id);
    let addedCount = 0;

    for (const track of tracks) {
      // Skip duplicates
      if (seenTrackIds.has(track.id)) {
        totalSkipped++;
        continue;
      }
      seenTrackIds.add(track.id);

      allSongs.push({
        deezer_track_id: track.id,
        title: track.title_short || track.title,
        artist_name: artist.name,  // Use our canonical name, not Deezer's
        album_name: track.album?.title || null,
        album_cover_small: track.album?.cover_small || null,
        album_cover_medium: track.album?.cover_medium || null,
        album_cover_big: track.album?.cover_big || null,
        preview_url: track.preview,
        duration: track.duration,
        gender: artist.gender,
        generation: artist.generation,
        is_title_track: null, // Will be set manually or via heuristic
        year: null, // Deezer doesn't always provide release year in search
        difficulty: 'medium',
        status: 'active',
      });

      addedCount++;
    }

    console.log(`  Added ${addedCount} songs (${tracks.length - addedCount} skipped as dupes)`);
    artistStats.push({ ...artist, songCount: addedCount, deezer_id: deezerArtist.id });
  }

  console.log(`\n=== Generating wrong answers... ===`);

  // Generate wrong answers for all songs
  for (let i = 0; i < allSongs.length; i++) {
    if (i % 500 === 0) console.log(`  Processing ${i}/${allSongs.length}...`);

    const { wrongArtists, wrongTitles } = generateWrongAnswers(
      allSongs[i],
      allSongs,
      artistStats
    );

    allSongs[i].wrong_answers_artist = wrongArtists;
    allSongs[i].wrong_answers_title = wrongTitles;
  }

  // ============================================
  // Output
  // ============================================

  // Save full song database
  fs.writeFileSync(
    'songs-database.json',
    JSON.stringify(allSongs, null, 2)
  );

  // Save artist stats
  fs.writeFileSync(
    'artist-stats.json',
    JSON.stringify(artistStats.sort((a, b) => b.songCount - a.songCount), null, 2)
  );

  // Print summary
  console.log('\n=== SUMMARY ===');
  console.log(`Total songs: ${allSongs.length}`);
  console.log(`Total artists: ${artistStats.filter(a => a.songCount > 0).length} / ${ARTISTS.length}`);
  console.log(`Duplicates skipped: ${totalSkipped}`);
  console.log(`\nBy gender:`);
  console.log(`  Girl groups: ${allSongs.filter(s => s.gender === 'gg').length}`);
  console.log(`  Boy groups: ${allSongs.filter(s => s.gender === 'bg').length}`);
  console.log(`  Solo female: ${allSongs.filter(s => s.gender === 'solo_female').length}`);
  console.log(`  Solo male: ${allSongs.filter(s => s.gender === 'solo_male').length}`);
  console.log(`\nBy generation:`);
  console.log(`  1st gen: ${allSongs.filter(s => s.generation === '1st').length}`);
  console.log(`  2nd gen: ${allSongs.filter(s => s.generation === '2nd').length}`);
  console.log(`  3rd gen: ${allSongs.filter(s => s.generation === '3rd').length}`);
  console.log(`  4th gen: ${allSongs.filter(s => s.generation === '4th').length}`);
  console.log(`  5th gen: ${allSongs.filter(s => s.generation === '5th').length}`);
  console.log(`\nTop 20 artists by song count:`);
  for (const a of artistStats.slice(0, 20)) {
    console.log(`  ${a.name}: ${a.songCount} songs`);
  }
  console.log(`\nFiles saved:`);
  console.log(`  songs-database.json (${allSongs.length} songs)`);
  console.log(`  artist-stats.json (${artistStats.length} artists)`);
  console.log(`\nNext: Import songs-database.json into Supabase via the admin panel.`);
}

main().catch(console.error);
