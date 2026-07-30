// W-SEED (amended 2026-07-30) - starter lightstick collectibles for launch spaces.
// Lightsticks ONLY; photocards + merch stay empty by design (curator quests post
// launch). The honesty law holds: every entry's NAME is confirmed from FETCHED major
// music-press article body text, never from memory, and carries the press source_url.
// A launch space whose lightstick name could not be confirmed in fetched press text
// is LEFT OUT (not guessed).
//
// Confirmed this run (fetched Soompi article bodies):
//   BTS "ARMY Bomb" - name in body of soompi.com/article/1195479wpp; latest is
//   Version 4 per soompi.com/article/1817281wpp.
// Left out (no branded name in any fetched press body - checked Soompi + searched
//   Billboard/NME/Rolling Stone):
//   Stray Kids - press says only "official light stick" / "compass without direction".
//   BLACKPINK  - press says only "official light stick" / "toy hammer with two hearts".
//
//   node scripts/seed-lightsticks.mjs
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter((l) => l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; }),
);
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const SYSTEM_ACCOUNT = '67358f12-5068-4cd9-ba02-ad19fdadad73'; // owner/system (localdev), not a fake user

// ONLY entries whose name was confirmed in fetched press body text.
const LIGHTSTICKS = [
  {
    slug: 'bts', group_id: 1,
    name: 'ARMY Bomb',
    category: 'Official lightstick',
    version: 'Ver.4',
    source_url: 'https://www.soompi.com/article/1195479wpp/bts-reveals-teaser-3rd-version-official-light-stick-army-bomb',
    source_note: 'Name "Army Bomb" confirmed in the Soompi article body. Latest generation Version 4 per Soompi (soompi.com/article/1817281wpp). Text-first entry, no image (strict-legal).',
  },
];

let inserted = 0, skipped = 0;
for (const l of LIGHTSTICKS) {
  // Idempotent: one lightstick of this name per space.
  const { data: existing } = await db.from('collectibles')
    .select('id').eq('group_id', l.group_id).eq('kind', 'lightstick').eq('name', l.name).maybeSingle();
  if (existing) { console.log(`  ${l.slug}: "${l.name}" already present (id ${existing.id}) - skip`); skipped++; continue; }
  const { data, error } = await db.from('collectibles').insert({
    group_id: l.group_id, kind: 'lightstick', name: l.name, category: l.category,
    era: null, version: l.version, image_url: null, status: 'published',
    source_url: l.source_url, source_note: l.source_note, created_by: SYSTEM_ACCOUNT,
  }).select('id').single();
  if (error) { console.log(`  ${l.slug}: ERR ${error.message}`); continue; }
  console.log(`  ${l.slug}: seeded "${l.name}" (${l.version}) id ${data.id}  <- ${l.source_url}`);
  inserted++;
}
console.log(`\n${inserted} inserted, ${skipped} already present. Left out (no citable name): stray-kids, blackpink.`);
