// W5.2 - seed the three photocard-collection badges into badge_definitions.
// Idempotent (upsert on id). icon is left null so the passport badge shelf draws
// the coloured letter-chip fallback (no PNG art needed); icon_type still carries a
// themed glyph for anywhere that reads it. Grants happen in checkCollectionBadges.
//
//   node scripts/seed-collection-badges.mjs
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter((l) => l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; }),
);

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const BADGES = [
  { id: 'pc_first',     name: 'First Card',  description: 'Started a photocard collection.',            icon_type: 'star',  color_bg: '#F3ECFB', color_stroke: '#B79BE0', color_text: '#4A2E73', sort_order: 30, icon: null },
  { id: 'pc_collector', name: 'Collector',   description: 'Owns 25 or more photocards.',                icon_type: 'stack', color_bg: '#E7F1FB', color_stroke: '#8FB6E4', color_text: '#274A70', sort_order: 31, icon: null },
  { id: 'pc_set',       name: 'Full Set',    description: "Completed every card of a group's set.",  icon_type: 'gem',   color_bg: '#FBECF2', color_stroke: '#E29BBB', color_text: '#732E4E', sort_order: 32, icon: null },
];

const { error } = await db.from('badge_definitions').upsert(BADGES, { onConflict: 'id' });
if (error) { console.error('seed failed:', error.message); process.exit(1); }

const { data } = await db.from('badge_definitions').select('id, name, sort_order').in('id', BADGES.map((b) => b.id)).order('sort_order');
console.log('seeded collection badges:');
for (const b of data ?? []) console.log(`  ${b.id.padEnd(14)} ${b.name}  (sort ${b.sort_order})`);
