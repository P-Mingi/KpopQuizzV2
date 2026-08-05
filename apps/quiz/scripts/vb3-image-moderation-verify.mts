// V-BUILDER-3 step 3 proof: the RENDER GATE is fail-closed. resolveSpaceImage returns a URL
// only for an ACTIVE image; a hidden/removed/unknown path or an external URL resolves to null
// (render nothing, never a broken img, never a hotlink). Uses a throwaway row (cleaned up).
//   npx tsx scripts/vb3-image-moderation-verify.mts
import { readFileSync } from 'node:fs';
for (const l of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  const i = l.indexOf('='); if (i > 0 && !l.startsWith('#')) process.env[l.slice(0, i).trim()] ??= l.slice(i + 1).trim().replace(/^["']|["']$/g, '');
}
import { createClient } from '@supabase/supabase-js';
import { resolveSpaceImage } from '../src/lib/verse/space-image';

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
let failed = 0;
const check = (name: string, cond: boolean, detail = '') => { console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? ' :: ' + detail : ''}`); if (!cond) failed++; };

const { data: g } = await db.from('groups').select('id').eq('slug', 'bts').maybeSingle();
const gid = (g as { id: number }).id;
const path = `images/${gid}/TEST-MODERATION-${Date.now()}.png`;
const { data: ins } = await db.from('verse_space_assets').insert({ space_id: gid, kind: 'image', storage_path: path, hash: `testhash-${Date.now()}`, mime: 'image/png', bytes: 1, uploaded_by: null, source: 'upload', status: 'active' }).select('id').single();
const id = (ins as { id: number }).id;
try {
  check('ACTIVE image resolves to our storage URL', /\.supabase\.co\/storage\/.*verse-space-assets/.test((await resolveSpaceImage(path)) ?? ''));
  await db.from('verse_space_assets').update({ status: 'hidden' }).eq('id', id);
  check('HIDDEN image resolves to null (fail-closed takedown)', (await resolveSpaceImage(path)) === null);
  await db.from('verse_space_assets').update({ status: 'removed' }).eq('id', id);
  check('REMOVED image resolves to null', (await resolveSpaceImage(path)) === null);
  check('unknown path resolves to null', (await resolveSpaceImage('images/999/does-not-exist.png')) === null);
  check('an external URL never resolves (no hotlink)', (await resolveSpaceImage('https://i.pinimg.com/x.jpg')) === null);
} finally {
  await db.from('verse_space_assets').delete().eq('id', id); // cleanup the throwaway row
}
console.log(`\nRESULT: ${failed === 0 ? 'ALL PASS' : failed + ' FAILED'} (render gate fail-closed)`);
process.exit(failed === 0 ? 0 : 1);
