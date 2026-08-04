// V-BUILDER-2 step 6 dev proof helper: capture/restore a group's verse_content section
// row so an inline-text PUBLISH round-trip on the test space can be reverted byte-for-byte
// (keeps the published /verse/<slug> byte-identical). Read-only dump, exact-JSON restore.
//   npx tsx scripts/vb2-content-io.mts dump <slug> <section> <file>
//   npx tsx scripts/vb2-content-io.mts restore <file>
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter((l) => l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; }),
);
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const mode = process.argv[2];

if (mode === 'dump') {
  const slug = process.argv[3]!; const section = process.argv[4]!; const file = process.argv[5]!;
  const { data: g } = await db.from('groups').select('id').eq('slug', slug).maybeSingle();
  const gid = (g as { id: number }).id;
  const { data, error } = await db.from('verse_content').select('*')
    .eq('entity_type', 'group').eq('entity_id', String(gid)).eq('section_key', section).maybeSingle();
  if (error) { console.error(error); process.exit(1); }
  writeFileSync(file, JSON.stringify({ gid, section, row: data }, null, 2));
  const r = data as { current_revision_id: number | null } | null;
  console.log(`dumped verse_content group=${gid} section=${section} current_revision_id=${r?.current_revision_id} -> ${file}`);
} else if (mode === 'restore') {
  const file = process.argv[3]!;
  const { gid, section, row } = JSON.parse(readFileSync(file, 'utf8')) as { gid: number; section: string; row: { content: unknown; current_revision_id: number | null; updated_at: string; locked: boolean; locked_by: string | null; locked_at: string | null; lock_reason: string | null } };
  const { error } = await db.from('verse_content')
    .update({ content: row.content, current_revision_id: row.current_revision_id, updated_at: row.updated_at, locked: row.locked, locked_by: row.locked_by, locked_at: row.locked_at, lock_reason: row.lock_reason })
    .eq('entity_type', 'group').eq('entity_id', String(gid)).eq('section_key', section);
  if (error) { console.error(error); process.exit(1); }
  console.log(`restored verse_content group=${gid} section=${section} current_revision_id=${row.current_revision_id}`);
} else {
  console.error('usage: dump <slug> <section> <file> | restore <file>'); process.exit(2);
}
