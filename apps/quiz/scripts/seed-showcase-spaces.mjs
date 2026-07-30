// W-CUSTOM step 11 - the two showcase spaces (the proof artifact). Two REAL spaces
// configured radically differently from the one fixed skeleton: same structure, URL
// scheme, head tags, JSON-LD and seo_critical content; utterly different faces. Both
// configs pass the same server validation. Re-runnable.
//
//   node scripts/seed-showcase-spaces.mjs
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter((l) => l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; }),
);
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// STAY (Stray Kids): NEON - magenta, sharp frames, dotted dividers, quote-led,
// sparkle/star banner stickers, 5 tabs.
const strayKids = {
  version: 1, preset: 'neon', accent: '#c026d3',
  frames: { default: 'sharp', divider: 'dots' },
  tabs: ['home', 'members', 'discography', 'essays', 'community'],
  modules: [
    { type: 'quote', zone: 'main', order: 0, props: { text: 'Eight members, one fire. STAY, forever.', attribution: 'STAY masthead' } },
    { type: 'members', zone: 'main', order: 1 },
    { type: 'discography', zone: 'main', order: 2 },
    { type: 'game_widgets', zone: 'main', order: 3 },
    { type: 'countdown', zone: 'side', order: 0 },
    { type: 'stats', zone: 'side', order: 1 },
    { type: 'on_this_day', zone: 'side', order: 2 },
  ],
  stickers: [
    { id: 'house:sparkles:1', slot: 'banner-tr', scale: 1.4, rotate: 12 },
    { id: 'house:stars:2', slot: 'banner-bl', scale: 1.1, rotate: -8 },
  ],
};

// ATINY (ATEEZ): SOFT - pink, rounded frames, wave dividers, members-led, heart
// banner stickers, 6 tabs.
const ateez = {
  version: 1, preset: 'soft', accent: '#e26aa0',
  frames: { default: 'rounded', divider: 'wave' },
  tabs: ['home', 'members', 'discography', 'timeline', 'community', 'about'],
  modules: [
    { type: 'members', zone: 'main', order: 0 },
    { type: 'quote', zone: 'main', order: 1, props: { text: 'From the Halateez world to ours. ATINY sails on.', attribution: 'an ATINY' } },
    { type: 'discography', zone: 'main', order: 2 },
    { type: 'stats', zone: 'side', order: 0 },
    { type: 'countdown', zone: 'side', order: 1 },
    { type: 'masthead', zone: 'side', order: 2 },
  ],
  stickers: [
    { id: 'house:hearts:1', slot: 'banner-tl', scale: 1.3, rotate: -10 },
    { id: 'house:hearts:2', slot: 'banner-br', scale: 1.0, rotate: 15 },
  ],
};

for (const [slug, cfg] of [['stray-kids', strayKids], ['ateez', ateez]]) {
  const { data: g } = await db.from('groups').select('id').eq('slug', slug).single();
  if (!g) { console.log(`${slug}: group not found`); continue; }
  const { error } = await db.from('verse_spaces').upsert({ group_id: g.id, presentation: cfg, updated_at: new Date().toISOString() }, { onConflict: 'group_id' });
  console.log(`${slug}: ${error ? 'ERR ' + error.message : `showcase applied (${cfg.preset}, ${cfg.modules.length} modules, ${cfg.tabs.length} tabs)`}`);
}
