// V-BUILDER-2 dev helper: dump a space's presentation_draft modules (id + style) so a
// style/reorder round-trip can be proven at the jsonb level. Run:
//   npx tsx scripts/vb2-dump-draft.mts <slug>
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
const { data: row } = await db.from('verse_spaces').select('presentation_draft').eq('group_id', gid).maybeSingle();
const draft = (row as { presentation_draft?: { modules?: Record<string, unknown>[] } } | null)?.presentation_draft ?? {};
const mods = draft.modules ?? [];
console.log(`presentation_draft for ${slug}: ${mods.length} modules`);
for (const m of mods) {
  const styleKeys = ['frame', 'background', 'radius', 'density', 'accent', 'textScale', 'divider'] as const;
  const style = Object.fromEntries(styleKeys.map((k) => [k, (m as Record<string, unknown>)[k]]).filter(([, v]) => v !== undefined));
  if (Object.keys(style).length) console.log(`  ${m.type} (${m.id}): ${JSON.stringify(style)}`);
}
