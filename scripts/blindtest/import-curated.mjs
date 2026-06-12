#!/usr/bin/env node
// ============================================================
// Import the curated tiered catalog into the LIVE quiz project.
// Retargets the source import-to-supabase.mjs at apps/quiz (service role).
//
// Requires migration 069 (tier column) applied first.
// Idempotent on deezer_track_id (Prefer: resolution=ignore-duplicates).
//
// Folds the backfill into the insert payload:
//   - group_id   : artist_name -> groups.name / groups.slug (normalized), else null
//   - is_curated : true for every imported row
//   - tier       : from songs-curated.json
//
// Run: node scripts/blindtest/import-curated.mjs
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- read quiz service-role creds from apps/quiz/.env.local -------------
const envPath = path.resolve(__dirname, '../../apps/quiz/.env.local');
const env = Object.fromEntries(
  fs.readFileSync(envPath, 'utf8').split('\n')
    .map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean)
    .map((m) => [m[1], m[2].trim()]),
);
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) { console.error('Missing SUPABASE url/service key in apps/quiz/.env.local'); process.exit(1); }
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

const norm = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

async function main() {
  const songs = JSON.parse(fs.readFileSync(path.join(__dirname, 'songs-curated.json'), 'utf8'));
  console.log(`Importing ${songs.length} songs into ${URL.replace('https://', '')} ...`);

  // --- groups map (name + slug -> id) ---
  const gRes = await fetch(`${URL}/rest/v1/groups?select=id,name,slug`, { headers: H });
  const groups = await gRes.json();
  const gmap = new Map();
  for (const g of groups) { if (g.name) gmap.set(norm(g.name), g.id); if (g.slug) gmap.set(norm(g.slug), g.id); }
  console.log(`Loaded ${groups.length} groups for group_id backfill.`);

  let matchedGroup = 0;
  const rows = songs.map((s) => {
    const gid = gmap.get(norm(s.artist_name)) ?? null;
    if (gid != null) matchedGroup++;
    return {
      deezer_track_id: s.deezer_track_id,
      title: s.title,
      artist_name: s.artist_name,
      album_name: s.album_name ?? null,
      album_cover_small: s.album_cover_small ?? null,
      album_cover_medium: s.album_cover_medium ?? null,
      album_cover_big: s.album_cover_big ?? null,
      preview_url: s.preview_url,
      duration: s.duration ?? null,
      deezer_rank: s.deezer_rank ?? 0,
      group_id: gid,
      gender: s.gender ?? null,
      generation: s.generation ?? null,
      is_title_track: s.is_title_track ?? null,
      year: s.year ?? null,
      wrong_answers_artist: s.wrong_answers_artist ?? [],
      wrong_answers_title: s.wrong_answers_title ?? [],
      difficulty: s.difficulty ?? 'medium',
      status: s.status ?? 'active',
      is_curated: true,
      tier: s.tier ?? null,
    };
  });

  const BATCH = 200;
  let inserted = 0, errors = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const res = await fetch(`${URL}/rest/v1/songs`, {
      method: 'POST',
      headers: { ...H, Prefer: 'resolution=ignore-duplicates,return=minimal' },
      body: JSON.stringify(batch),
    });
    if (res.ok) { inserted += batch.length; }
    else { errors++; console.error(`  batch ${i} failed: ${(await res.text()).slice(0, 300)}`); }
    if ((i / BATCH) % 5 === 0) console.log(`  ${Math.min(i + BATCH, rows.length)}/${rows.length}...`);
  }

  // --- verify final count ---
  const cRes = await fetch(`${URL}/rest/v1/songs?select=id`, { headers: { ...H, Prefer: 'count=exact', Range: '0-0' } });
  const total = cRes.headers.get('content-range')?.split('/')?.[1];

  console.log('\n========== IMPORT REPORT ==========');
  console.log(`Sent: ${inserted}, batch errors: ${errors}`);
  console.log(`group_id matched: ${matchedGroup}/${songs.length}`);
  console.log(`songs table total rows now: ${total}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
