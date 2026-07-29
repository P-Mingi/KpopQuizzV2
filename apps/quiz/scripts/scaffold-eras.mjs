// W3K.1 follow-up: auto-scaffold eras from album release clusters.
//
// Clusters each group's albums by release-date gap (45-day threshold): tight
// same-cycle releases (repackage / regional variant / commentary) merge into one
// era; distinct title-track comebacks stay separate. Every row is scaffolded:true
// so curators refine boundaries / names / concept / colour later.
//
// Idempotent: upserts on (group_id, name) and reassigns album.era_id, so re-running
// after new releases land just extends the set. Run: node apps/quiz/scripts/scaffold-eras.mjs
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = Object.fromEntries(
  fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n').filter((l) => l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; })
);
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const GAP_DAYS = 45;
const PALETTE = ['#E8556F', '#F08A4B', '#EABF3E', '#6FBF73', '#3FB6B2', '#4F8FE0', '#7A6FD1', '#C56FD1', '#D16F9B', '#8A94A6'];
const DAY = 86400000;

function slugify(s, used) {
  const base = s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 76) || 'era';
  let slug = base, n = 2;
  while (used.has(slug)) slug = `${base}-${n++}`.slice(0, 80);
  used.add(slug);
  return slug;
}

const { data: groups } = await db.from('groups').select('id, name, slug').order('id');
const { data: albums } = await db.from('albums').select('id, group_id, title, release_date, type')
  .not('release_date', 'is', null).order('group_id').order('release_date');

const byGroup = new Map();
for (const a of albums) { if (!byGroup.has(a.group_id)) byGroup.set(a.group_id, []); byGroup.get(a.group_id).push(a); }

let totalEras = 0, totalAssigned = 0;
const report = [];

for (const g of groups) {
  const list = byGroup.get(g.id) || [];
  if (list.length === 0) continue;

  const clusters = [];
  let cur = [list[0]];
  for (let i = 1; i < list.length; i++) {
    const gap = (new Date(list[i].release_date) - new Date(list[i - 1].release_date)) / DAY;
    if (gap > GAP_DAYS) { clusters.push(cur); cur = [list[i]]; } else cur.push(list[i]);
  }
  clusters.push(cur);

  const usedNames = new Set(), usedSlugs = new Set();
  const eraRows = clusters.map((c, idx) => {
    const anchor = c[0];
    let name = anchor.title.trim().slice(0, 120);
    if (usedNames.has(name)) name = `${name} (${anchor.release_date.slice(0, 4)})`.slice(0, 120);
    if (usedNames.has(name)) name = `${name} #${idx + 1}`.slice(0, 120);
    usedNames.add(name);
    return {
      group_id: g.id, name, slug: slugify(name, usedSlugs),
      period_start: c[0].release_date, period_end: c.length > 1 ? c[c.length - 1].release_date : null,
      color: PALETTE[idx % PALETTE.length], ord: idx, scaffolded: true,
      _albumIds: c.map((a) => a.id),
    };
  });

  const { data: upserted, error: upErr } = await db.from('eras')
    .upsert(eraRows.map(({ _albumIds, ...r }) => r), { onConflict: 'group_id,name' })
    .select('id, name');
  if (upErr) { console.error(`  ${g.name}: era upsert failed:`, upErr.message); continue; }
  const idByName = new Map(upserted.map((e) => [e.name, e.id]));

  for (const row of eraRows) {
    const eraId = idByName.get(row.name);
    if (!eraId) continue;
    const { error: aErr } = await db.from('albums').update({ era_id: eraId }).in('id', row._albumIds);
    if (aErr) { console.error(`  ${g.name}/${row.name}: assign failed:`, aErr.message); continue; }
    totalAssigned += row._albumIds.length;
  }
  totalEras += eraRows.length;
  report.push({ group: g.name, albums: list.length, eras: eraRows.length, rows: eraRows });
}

report.sort((a, b) => b.albums - a.albums);
console.log(`\n=== SCAFFOLD COMPLETE ===`);
console.log(`groups with eras: ${report.length} | eras created: ${totalEras} | albums assigned: ${totalAssigned}/${albums.length}`);
console.log(`\ngroup`.padEnd(24), 'albums', 'eras');
for (const r of report.slice(0, 16)) console.log(r.group.padEnd(24), String(r.albums).padStart(6), String(r.eras).padStart(4));
const merges = report.flatMap((r) => r.rows.filter((e) => e._albumIds.length > 1)).length;
console.log(`\nmulti-album eras (merged variants/repackages): ${merges} | single-album eras: ${totalEras - merges}`);
