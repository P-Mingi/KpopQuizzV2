// V-DESIGN step 4 - a preset gallery: applies the four non-showcase presets to four
// real spaces so every mood can be verified light + dark. Mirrors the PRESET_DEFS
// apply fragments (minimal keeps the group colour). Re-runnable; presentation only.
//
//   node scripts/apply-preset-samples.mjs
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter((l) => l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; }),
);
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const samples = {
  'red-velvet': { version: 1, preset: 'minimal', frames: { default: 'outline', divider: 'none' }, banner: { treatment: 'solid' } },
  'twice':      { version: 1, preset: 'retro', accent: '#c2691f', frames: { default: 'outline', divider: 'dots' }, banner: { treatment: 'gradient' }, stickers: [{ id: 'house:stars:1', slot: 'banner-br' }] },
  'newjeans':   { version: 1, preset: 'y2k', accent: '#7c5cfc', frames: { default: 'soft-shadow', divider: 'wave' }, banner: { treatment: 'gradient' }, stickers: [{ id: 'house:sparkles:2', slot: 'banner-br' }] },
  'le-sserafim':{ version: 1, preset: 'dark', accent: '#6366f1', frames: { default: 'soft-shadow', divider: 'line' }, banner: { treatment: 'solid' }, stickers: [{ id: 'house:ring:1', slot: 'banner-br' }] },
};

for (const [slug, cfg] of Object.entries(samples)) {
  const { data: g } = await db.from('groups').select('id').eq('slug', slug).single();
  if (!g) { console.log(`${slug}: group not found`); continue; }
  const { error } = await db.from('verse_spaces').upsert({ group_id: g.id, presentation: cfg, updated_at: new Date().toISOString() }, { onConflict: 'group_id' });
  console.log(`${slug}: ${error ? 'ERR ' + error.message : `preset '${cfg.preset}' applied`}`);
}
