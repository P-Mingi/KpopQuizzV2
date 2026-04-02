#!/usr/bin/env node

// ============================================
// K-pop Song Database Population Script v2
// ============================================
// CHANGES from v1:
// - Supports deezer_artist_id field - skips search, fetches directly
// - Better search matching (verifies artist name similarity)
// - Deduplication by deezer_track_id
// - Also fetches album tracks for better coverage
//
// Run: node populate-songs.mjs
// Output: songs-database.json + artist-stats.json

import ARTISTS from './kpop-artists-catalog.mjs';
import fs from 'fs';

const DEEZER_API = 'https://api.deezer.com';
const RATE_LIMIT_MS = 300;
const MAX_TRACKS_PER_ARTIST = 200;

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
    console.error(`  Fetch error: ${err.message}`);
    return null;
  }
}

// Check if two names are similar enough (basic fuzzy match)
function nameMatch(a, b) {
  const normalize = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  return normalize(a) === normalize(b) ||
    normalize(a).includes(normalize(b)) ||
    normalize(b).includes(normalize(a));
}

async function findArtist(artist) {
  // If we have a direct Deezer artist ID, use it
  if (artist.deezer_artist_id) {
    const data = await deezerFetch(`${DEEZER_API}/artist/${artist.deezer_artist_id}`);
    if (data && data.id) {
      return { id: data.id, name: data.name };
    }
    console.warn(`  Direct ID ${artist.deezer_artist_id} failed for ${artist.name}`);
    return null;
  }

  // Otherwise search
  const searchQuery = artist.deezer_search;
  if (!searchQuery) {
    console.warn(`  No search query for ${artist.name}`);
    return null;
  }

  const data = await deezerFetch(
    `${DEEZER_API}/search/artist?q=${encodeURIComponent(searchQuery)}&limit=10`
  );

  if (!data || !data.data || data.data.length === 0) {
    console.warn(`  Not found: ${artist.name} (search: ${searchQuery})`);
    return null;
  }

  // Try to find a name match in results
  for (const result of data.data) {
    if (nameMatch(result.name, artist.name)) {
      return { id: result.id, name: result.name };
    }
  }

  // If no match, log what we found and skip (DON'T use first result blindly)
  const found = data.data.map(a => a.name).join(', ');
  console.warn(`  No match for "${artist.name}" in results: [${found}]`);
  console.warn(`  -> Skipping to avoid wrong data. Add deezer_artist_id manually.`);
  return null;
}

async function getArtistTracks(artistId) {
  const tracks = [];

  // Method 1: Artist top tracks
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

  // Method 2: Also get albums and their tracks for more coverage
  const albumsData = await deezerFetch(`${DEEZER_API}/artist/${artistId}/albums?limit=50`);
  if (albumsData && albumsData.data) {
    for (const album of albumsData.data.slice(0, 20)) {
      const albumTracks = await deezerFetch(`${DEEZER_API}/album/${album.id}/tracks?limit=50`);
      if (albumTracks && albumTracks.data) {
        for (const track of albumTracks.data) {
          if (track.preview && track.preview.length > 10 && !tracks.find(t => t.id === track.id)) {
            // Add album info to track
            track.album = { id: album.id, title: album.title, cover_small: album.cover_small, cover_medium: album.cover_medium, cover_big: album.cover_big };
            tracks.push(track);
          }
        }
      }
      if (tracks.length >= MAX_TRACKS_PER_ARTIST) break;
    }
  }

  return tracks.slice(0, MAX_TRACKS_PER_ARTIST);
}

function generateWrongAnswers(song, allSongs, allArtists) {
  const wrongArtists = [];
  const wrongTitles = [];

  const sameGenderArtists = allArtists
    .filter(a => a.name !== song.artist_name && a.gender === song.gender && a.songCount > 0)
    .sort(() => Math.random() - 0.5);

  const sameGen = sameGenderArtists.filter(a => a.generation === song.generation);
  const otherGen = sameGenderArtists.filter(a => a.generation !== song.generation);
  const candidates = [...sameGen, ...otherGen];

  for (const a of candidates.slice(0, 3)) {
    wrongArtists.push(a.name);
  }

  const sameArtistSongs = allSongs
    .filter(s => s.artist_name === song.artist_name && s.title !== song.title)
    .sort(() => Math.random() - 0.5);

  for (const s of sameArtistSongs.slice(0, 3)) {
    wrongTitles.push(s.title);
  }

  if (wrongTitles.length < 3) {
    const otherSongs = allSongs
      .filter(s => s.artist_name !== song.artist_name && s.gender === song.gender)
      .sort(() => Math.random() - 0.5);

    for (const s of otherSongs) {
      if (wrongTitles.length >= 3) break;
      if (!wrongTitles.includes(s.title)) wrongTitles.push(s.title);
    }
  }

  return { wrongArtists, wrongTitles };
}

async function main() {
  console.log('=== K-pop Song Database Population v2 ===');
  console.log(`Processing ${ARTISTS.length} artists...\n`);

  const allSongs = [];
  const artistStats = [];
  const seenTrackIds = new Set();
  let totalSkipped = 0;
  const notFound = [];

  for (let i = 0; i < ARTISTS.length; i++) {
    const artist = ARTISTS[i];
    const progress = `[${i + 1}/${ARTISTS.length}]`;
    const method = artist.deezer_artist_id ? 'ID' : 'search';

    console.log(`${progress} ${artist.name} (${method}: ${artist.deezer_artist_id || artist.deezer_search})`);

    const deezerArtist = await findArtist(artist);

    if (!deezerArtist) {
      notFound.push(artist.name);
      artistStats.push({ ...artist, songCount: 0, deezer_id: null });
      continue;
    }

    console.log(`  -> ${deezerArtist.name} (ID: ${deezerArtist.id})`);

    const tracks = await getArtistTracks(deezerArtist.id);
    let addedCount = 0;

    for (const track of tracks) {
      if (seenTrackIds.has(track.id)) {
        totalSkipped++;
        continue;
      }
      seenTrackIds.add(track.id);

      allSongs.push({
        deezer_track_id: track.id,
        title: track.title_short || track.title,
        artist_name: artist.name,
        album_name: track.album?.title || null,
        album_cover_small: track.album?.cover_small || null,
        album_cover_medium: track.album?.cover_medium || null,
        album_cover_big: track.album?.cover_big || null,
        preview_url: track.preview,
        duration: track.duration,
        deezer_rank: track.rank || 0,
        gender: artist.gender,
        generation: artist.generation,
        is_title_track: null,
        year: null,
        difficulty: 'medium',
        status: 'active',
      });

      addedCount++;
    }

    console.log(`  Added ${addedCount} songs`);
    artistStats.push({ ...artist, songCount: addedCount, deezer_id: deezerArtist.id });
  }

  console.log(`\n=== Generating wrong answers... ===`);
  for (let i = 0; i < allSongs.length; i++) {
    if (i % 500 === 0) console.log(`  ${i}/${allSongs.length}...`);
    const { wrongArtists, wrongTitles } = generateWrongAnswers(allSongs[i], allSongs, artistStats);
    allSongs[i].wrong_answers_artist = wrongArtists;
    allSongs[i].wrong_answers_title = wrongTitles;
  }

  fs.writeFileSync('songs-database.json', JSON.stringify(allSongs, null, 2));
  fs.writeFileSync('artist-stats.json', JSON.stringify(artistStats.sort((a, b) => b.songCount - a.songCount), null, 2));

  console.log('\n=== SUMMARY ===');
  console.log(`Total songs: ${allSongs.length}`);
  console.log(`Artists found: ${artistStats.filter(a => a.songCount > 0).length} / ${ARTISTS.length}`);
  console.log(`Duplicates skipped: ${totalSkipped}`);
  console.log(`\nBy gender:`);
  console.log(`  GG: ${allSongs.filter(s => s.gender === 'gg').length}`);
  console.log(`  BG: ${allSongs.filter(s => s.gender === 'bg').length}`);
  console.log(`  Solo F: ${allSongs.filter(s => s.gender === 'solo_female').length}`);
  console.log(`  Solo M: ${allSongs.filter(s => s.gender === 'solo_male').length}`);

  if (notFound.length > 0) {
    console.log(`\n!! NOT FOUND (${notFound.length}):`);
    for (const name of notFound) {
      console.log(`  - ${name}`);
    }
    console.log(`\nTo fix: search these artists on deezer.com, get their artist ID from the URL,`);
    console.log(`and add deezer_artist_id to the catalog. Then re-run.`);
  }

  console.log(`\nFiles: songs-database.json (${allSongs.length}) / artist-stats.json (${ARTISTS.length})`);
}

main().catch(console.error);
