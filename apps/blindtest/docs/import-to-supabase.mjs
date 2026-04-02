#!/usr/bin/env node

// Import songs-database.json directly into Supabase
// Run: node import-to-supabase.mjs

import fs from 'fs';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://fvyuznnyugznzfskgcvy.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('Set SUPABASE_SERVICE_ROLE_KEY env var first.');
  console.error('Run: export SUPABASE_SERVICE_ROLE_KEY="your-key-here"');
  process.exit(1);
}

const songs = JSON.parse(fs.readFileSync('songs-database.json', 'utf-8'));
console.log(`Importing ${songs.length} songs into Supabase...`);

const BATCH_SIZE = 200;
let totalInserted = 0;
let totalErrors = 0;

for (let i = 0; i < songs.length; i += BATCH_SIZE) {
  const batch = songs.slice(i, i + BATCH_SIZE).map(s => ({
    deezer_track_id: s.deezer_track_id,
    title: s.title,
    artist_name: s.artist_name,
    album_name: s.album_name || null,
    album_cover_small: s.album_cover_small || null,
    album_cover_medium: s.album_cover_medium || null,
    album_cover_big: s.album_cover_big || null,
    preview_url: s.preview_url,
    duration: s.duration || null,
    deezer_rank: s.deezer_rank || 0,
    gender: s.gender || null,
    generation: s.generation || null,
    wrong_answers_artist: s.wrong_answers_artist || [],
    wrong_answers_title: s.wrong_answers_title || [],
    difficulty: s.difficulty || 'medium',
    status: s.status || 'active',
  }));

  const res = await fetch(`${SUPABASE_URL}/rest/v1/songs`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=ignore-duplicates',
    },
    body: JSON.stringify(batch),
  });

  if (res.ok) {
    totalInserted += batch.length;
  } else {
    const err = await res.text();
    console.error(`Batch ${i}-${i + batch.length} failed: ${err.slice(0, 200)}`);
    totalErrors++;
  }

  if ((i / BATCH_SIZE) % 10 === 0) {
    console.log(`  ${totalInserted} / ${songs.length} inserted...`);
  }
}

console.log(`\nDone! Inserted: ${totalInserted}, Errors: ${totalErrors}`);
console.log(`\nNext: run the difficulty assignment SQL in Supabase SQL editor:`);
console.log(`  UPDATE songs SET difficulty = 'easy' WHERE deezer_rank >= 500000;`);
console.log(`  UPDATE songs SET difficulty = 'medium' WHERE deezer_rank BETWEEN 100000 AND 499999;`);
console.log(`  UPDATE songs SET difficulty = 'hard' WHERE deezer_rank BETWEEN 1 AND 99999;`);
