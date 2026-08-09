// V-FOUNDATION F3 Phase 1 receipt - the four non-idol fact rails, built from REAL seeded BTS
// entities (album / track / era / award). Proves: rows sourced from the DB, AUTO rows computed +
// locked, links to sibling tree pages, the A2 override grammar reaches the new editable keys, the
// fail-closed clamp drops an override on an AUTO/linked key, and the per-kind railGrantsIndex.
//   pnpm -C apps/quiz exec tsx scripts/proof-vfoundation-f3-phase1.mts
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

import { buildFactRail, railGrantsIndex, EDITABLE_FACT_KEYS } from '../src/lib/verse/tree/factrail';
import { clampBlocks } from '../src/lib/verse/tree/blocks';
import type { PageRow } from '../src/lib/verse/tree/types';

const env = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n').filter((l) => l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; }));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const SPACE = 1;
let failures = 0;
const check = (n: string, c: boolean, d = ''): void => { console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? `  -> ${d}` : ''}`); if (!c) failures += 1; };
const now = new Date();
type Row = NonNullable<Awaited<ReturnType<typeof buildFactRail>>>[number]['rows'][number];
const flat = (secs: Awaited<ReturnType<typeof buildFactRail>>): Row[] => (secs ?? []).flatMap((s) => s.rows);
const rowOf = (secs: Awaited<ReturnType<typeof buildFactRail>>, key: string): Row | undefined => flat(secs).find((r) => r.key === key);

// pick a real seeded page for an entity kind, preferring a rich one.
async function pickPage(kind: string, preferId?: number): Promise<PageRow | null> {
  if (preferId != null) {
    const { data } = await db.from('pages').select('*').eq('space_id', SPACE).eq('entity_kind', kind).eq('entity_id', preferId).eq('status', 'published').maybeSingle();
    if (data) return data as PageRow;
  }
  const { data } = await db.from('pages').select('*').eq('space_id', SPACE).eq('entity_kind', kind).eq('status', 'published').order('entity_id').limit(1);
  return (data as PageRow[] | null)?.[0] ?? null;
}
const show = (label: string, secs: Awaited<ReturnType<typeof buildFactRail>>): void => {
  console.log(`\n--- ${label} ---`);
  for (const s of secs ?? []) { console.log(`  [${s.heading}]`); for (const r of s.rows) console.log(`    ${r.dt}: ${r.dd}${r.auto ? ' (auto)' : ''}${r.editable ? ' (editable)' : ''}${r.href ? `  -> ${r.href}` : ''}${r.links ? `  -> [${r.links.map((l) => l.href).join(', ')}]` : ''}`); }
};

// ---- RELEASE (album with a tracklist + an era) ----
const relEntity = (await db.from('albums').select('id').eq('group_id', SPACE).not('era_id', 'is', null).order('id').limit(1)).data?.[0]?.id as number | undefined;
const relPage = await pickPage('album', relEntity);
check('release: a seeded album page exists', !!relPage, String(relPage?.slug));
if (relPage) {
  const secs = await buildFactRail(db, relPage, now);
  show('RELEASE', secs);
  check('release Type is sourced', !!rowOf(secs, 'rel_type')?.dd);
  check('release Released is a real date', /\d{4}/.test(rowOf(secs, 'rel_released')?.dd ?? ''), rowOf(secs, 'rel_released')?.dd);
  check('release Region is sourced (albums.region)', !!rowOf(secs, 'rel_region')?.dd, rowOf(secs, 'rel_region')?.dd);
  check('release Tracks is AUTO (computed track count) + locked', rowOf(secs, 'rel_tracks')?.auto === true && Number(rowOf(secs, 'rel_tracks')?.dd) > 0, rowOf(secs, 'rel_tracks')?.dd);
  check('release Era links to the era tree page', !!rowOf(secs, 'rel_era')?.href, rowOf(secs, 'rel_era')?.href);
  check('release Primary artist links to the space home', rowOf(secs, 'rel_artist')?.href === '/verse/bts', rowOf(secs, 'rel_artist')?.href);
  check('release: Type is EDITABLE (A2 override reaches it)', rowOf(secs, 'rel_type')?.editable === true);
  const idx = await railGrantsIndex(db, 'album', relPage.entity_id);
  check('release railGrantsIndex = TRUE (has a tracklist)', idx === true, String(idx));
  // A2 override + fail-closed clamp on a linked/auto key
  const ov = clampBlocks({ version: 1, blocks: [], factOverrides: { fields: { rel_type: 'Studio album', rel_tracks: '999', rel_era: 'HACK' } } }).body.factOverrides;
  check('clamp KEEPS the editable override (rel_type)', ov?.fields?.rel_type === 'Studio album', JSON.stringify(ov?.fields));
  check('clamp DROPS the AUTO key (rel_tracks) + the LINKED key (rel_era)', ov?.fields?.rel_tracks === undefined && ov?.fields?.rel_era === undefined, JSON.stringify(ov?.fields));
  const secsOv = await buildFactRail(db, relPage, now, ov);
  check('override applied: Type shows the edit + is marked edited', rowOf(secsOv, 'rel_type')?.dd === 'Studio album' && rowOf(secsOv, 'rel_type')?.edited === true);
  check('override blocked: Tracks STILL the computed count (hack never applied)', rowOf(secsOv, 'rel_tracks')?.dd !== '999');
}

// ---- TRACK (a song on a BTS album) ----
const trkEntity = relPage ? (await db.from('album_tracks').select('id').eq('album_id', relPage.entity_id!).order('position').limit(1)).data?.[0]?.id as number | undefined : undefined;
const trkPage = await pickPage('track', trkEntity);
check('\ntrack: a seeded track page exists', !!trkPage, String(trkPage?.slug));
if (trkPage) {
  const secs = await buildFactRail(db, trkPage, now);
  show('TRACK', secs);
  check('track Album row links to the album tree page', !!(rowOf(secs, 'trk_album')?.href || rowOf(secs, 'trk_album')?.links?.length), JSON.stringify(rowOf(secs, 'trk_album')?.links ?? rowOf(secs, 'trk_album')?.href));
  check('track Track number is sourced', !!rowOf(secs, 'trk_no')?.dd);
  const idx = await railGrantsIndex(db, 'track', trkPage.entity_id);
  check('track railGrantsIndex = FALSE (conservative stub-until-body)', idx === false, String(idx));
}

// ---- ERA (a chapter with releases) ----
const eraEntity = (await db.from('albums').select('era_id').eq('group_id', SPACE).not('era_id', 'is', null).limit(1)).data?.[0]?.era_id as number | undefined;
const eraPage = await pickPage('era', eraEntity);
check('\nera: a seeded era page exists', !!eraPage, String(eraPage?.slug));
if (eraPage) {
  const secs = await buildFactRail(db, eraPage, now);
  show('ERA', secs);
  check('era Years is sourced', /\d{4}/.test(rowOf(secs, 'era_years')?.dd ?? ''), rowOf(secs, 'era_years')?.dd);
  check('era Releases is AUTO (computed count) + carries a linked list', rowOf(secs, 'era_releases')?.auto === true && Number(rowOf(secs, 'era_releases')?.dd) > 0 && !!rowOf(secs, 'era_releases')?.links?.length, rowOf(secs, 'era_releases')?.dd);
  const idx = await railGrantsIndex(db, 'era', eraPage.entity_id);
  check('era railGrantsIndex = TRUE (has releases)', idx === true, String(idx));
}

// ---- AWARD (a BTS award) ----
const awdPage = await pickPage('award');
check('\naward: a seeded award page exists', !!awdPage, String(awdPage?.slug));
if (awdPage) {
  const secs = await buildFactRail(db, awdPage, now);
  show('AWARD', secs);
  check('award Result is sourced (won/nominated)', /won|nominated/i.test(rowOf(secs, 'awd_result')?.dd ?? ''), rowOf(secs, 'awd_result')?.dd);
  check('award Recipient links (member page or the space home)', !!rowOf(secs, 'awd_recipient')?.href, rowOf(secs, 'awd_recipient')?.href);
  const idx = await railGrantsIndex(db, 'award', awdPage.entity_id);
  check('award railGrantsIndex = FALSE (conservative stub-until-body)', idx === false, String(idx));
}

// no computed/linked key leaked into the editable allowlist
const bad = ['born', 'years', 'rel_tracks', 'era_releases', 'rel_era', 'rel_artist', 'trk_album', 'era_prev', 'era_next', 'awd_recipient'].filter((k) => (EDITABLE_FACT_KEYS as readonly string[]).includes(k));
check('\nEDITABLE_FACT_KEYS excludes every computed + linked key', bad.length === 0, bad.join(', ') || 'clean');

console.log(`\nPhase 1 (four non-idol rails): ${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
