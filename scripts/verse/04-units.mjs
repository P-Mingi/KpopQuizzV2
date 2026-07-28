// W1 - seed group_units (NCT-style parent group -> units). Data-driven; extend
// UNITS as more multi-unit groups are added. Owner decision: NCT umbrella is the
// group, 127/Dream/U/Wish/DoJaeJung are units under it. MBIDs are human-verified.
import { readFileSync } from 'fs';

const UNITS = {
  // parent group slug -> units
  nct: [
    { name: 'NCT 127', slug: 'nct-127', musicbrainz_mbid: '9d17d14a-e81c-410e-a90b-b02b0a9de6f8' },
    { name: 'NCT DREAM', slug: 'nct-dream', musicbrainz_mbid: 'dc7c8277-d4b6-4bca-bdfe-50eee42536ac' },
    { name: 'NCT U', slug: 'nct-u', musicbrainz_mbid: 'dfa98803-0f8e-4aac-a3d2-a2614db30074' },
    { name: 'NCT WISH', slug: 'nct-wish', musicbrainz_mbid: 'fb175979-152f-4f32-bf8b-08aa86c24fe3' },
    { name: 'NCT DOJAEJUNG', slug: 'nct-dojaejung', musicbrainz_mbid: '37cc872c-22e8-43e1-abc3-5b0f31631acb' },
  ],
};

const envPath = process.env.QUIZ_ENV || '/Users/louis/IT/Dev/projects/KpopQuizzV2/apps/quiz/.env.local';
const env = Object.fromEntries(readFileSync(envPath, 'utf8').split('\n').filter(l => l.includes('=')).map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; }));
const { createClient } = await import('@supabase/supabase-js');
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

let total = 0;
for (const [slug, units] of Object.entries(UNITS)) {
  const { data: g } = await db.from('groups').select('id,name').eq('slug', slug).single();
  if (!g) { console.log(`  parent group '${slug}' not found, skipping`); continue; }
  for (const u of units) {
    const { error } = await db.from('group_units').upsert({
      parent_group_id: g.id, name: u.name, slug: u.slug, musicbrainz_mbid: u.musicbrainz_mbid,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'parent_group_id,name' });
    if (error) console.error('  err', u.name, error.message); else { total++; console.log(`  ${g.name} -> ${u.name}`); }
  }
}
console.log(`Seeded ${total} units.`);
