// V-BUILDER-2 dev helper: reset a space's presentation_draft to empty (fresh canvas).
// Dev-only; NOT a gate. Run: npx tsx scripts/vb2-reset-draft.mts <slug>
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter((l) => l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; }),
);
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const slug = process.argv[2] ?? 'bts';
const { data: g } = await db.from('groups').select('id').eq('slug', slug).maybeSingle();
const gid = (g as { id: number } | null)?.id;
if (!gid) { console.error('no group', slug); process.exit(1); }
await db.from('verse_spaces').update({ presentation_draft: {} }).eq('group_id', gid);
console.log(`presentation_draft reset to {} for ${slug} (group ${gid})`);
