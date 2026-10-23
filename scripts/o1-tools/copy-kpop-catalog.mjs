#!/usr/bin/env node
// Run O1, Q0b: copy the PUBLIC K-pop catalog of production into the o1-dev database branch.
//   scripts/o1-tools/copy-kpop-catalog.sh [--dry-run] [--refresh]      (the wrapper starts and stops the read-only proxy)
//   scripts/o1/env.sh dev -- node scripts/o1-tools/copy-kpop-catalog.mjs --proxy http://127.0.0.1:<port> [--dry-run] [--refresh]
//
// Reading: GET only, through the read-only proxy (scripts/o1/prod-proxy.mjs) with the stand-in anon key o1-proxy-anon, which the
//   proxy swaps for the real anon key: row level security limits this script to what a visitor of kpopquiz.org sees. The script
//   knows no production URL and no production key, and never uses the stand-in service key.
// Writing: only o1-dev, with the o1-dev settings that scripts/o1/env.sh dev provides (it refuses anything else); this script
//   checks them again and refuses any other target.
// Copied: the catalog the home page, the group hubs (/verse/<group>), the quiz pages and the blind test read (see TABLES).
// Never copied: profiles, plays, scores, comments, likes, follows, reports, notifications, sessions, accounts, anything with a person.
//   Every creator, author or reviewer reference becomes the kpop system account; a guard aborts before any write when a row still
//   holds the id of a production profile.
// Group ids: o1-dev already holds the anime groups under the same small integers, so a production group id P becomes P + 1000 on
//   o1-dev (a group whose slug o1-dev already has for site kpop keeps that id: general-kpop). Every column that holds a group id is
//   remapped. Other tables keep their production primary keys (o1-dev has no row in them), except entity_sources (shared with the
//   anime lane): its ids are assigned by o1-dev and rows are matched by their natural key.
// Idempotent: a row whose primary key is already on o1-dev is left alone (insert with on_conflict do nothing), so a second run
//   writes nothing; --refresh upserts every row instead (merge-duplicates). site_id is 'kpop' wherever the column exists.
// Prints counts per table only, never a key, a URL or a row.
import process from 'node:process';

const PROD_REF = 'rdkgouofytwfdpbxbzio';
const SYSTEM = '00000000-0000-0000-0000-000000000001'; // kpop system account (sites.system_user_id of kpop), exists on o1-dev
const STAND_IN_ANON = 'o1-proxy-anon';
const GROUP_OFFSET = 1000;
const PAGE = 1000;

const argv = process.argv.slice(2);
const DRY = argv.includes('--dry-run');
const REFRESH = argv.includes('--refresh');
const pi = argv.indexOf('--proxy');
const PROXY = (pi >= 0 ? argv[pi + 1] : process.env.O1_CATALOG_PROXY || '').replace(/\/$/, '');
const die = (m, c = 2) => { console.error('copy-kpop-catalog: ' + m); process.exit(c); };

// ---- targets: production only through the local proxy, writes only to o1-dev
if (!/^http:\/\/127\.0\.0\.1:\d{2,5}$/.test(PROXY)) die('--proxy must be http://127.0.0.1:<port> (the read-only proxy)');
const DEV_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
const DEV_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const REF = process.env.O1_BRANCH_REF || '';
if (process.env.O1_ENV !== 'dev' || process.env.O1_BRANCH !== 'o1-dev' || !REF) die('refused: run it through scripts/o1/env.sh dev (the target must be o1-dev)', 5);
if (DEV_URL !== `https://${REF}.supabase.co`) die('refused: the URL is not the o1-dev branch', 5);
if ([DEV_URL, REF, process.env.O1_DB_URL || ''].some((v) => v.includes(PROD_REF)) || REF === PROD_REF) die('refused: a production reference', 5);
if (!DEV_KEY || DEV_KEY === STAND_IN_ANON || DEV_KEY.startsWith('o1-proxy')) die('refused: no o1-dev service key', 5);
try { // a Supabase key names its project: it must be the branch
  const claim = JSON.parse(Buffer.from(DEV_KEY.split('.')[1], 'base64url').toString('utf8'));
  if (claim.ref && claim.ref !== REF) die('refused: the key belongs to another project', 5);
} catch { /* not a JWT: the URL check above stands */ }

// ---- the two clients
async function req(label, url, init, tries = 3) {
  let last = '';
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, init);
      if (r.status >= 500 && i < tries - 1) { last = String(r.status); await new Promise((o) => setTimeout(o, 600 * (i + 1))); continue; }
      return r;
    } catch (e) { last = e.code || 'network'; await new Promise((o) => setTimeout(o, 600 * (i + 1))); }
  }
  die(`${label} unreachable (${last})`, 3);
}
const prodHeaders = { apikey: STAND_IN_ANON, authorization: 'Bearer ' + STAND_IN_ANON };
async function prodGet(path) { // GET only
  const r = await req('proxy', PROXY + '/rest/v1/' + path, { method: 'GET', headers: prodHeaders });
  if (!r.ok) die(`production read ${path.split('?')[0]} answered ${r.status}`, 3);
  return r.json();
}
const devHeaders = { apikey: DEV_KEY, authorization: 'Bearer ' + DEV_KEY };
async function devGet(path) {
  const r = await req('o1-dev', DEV_URL + '/rest/v1/' + path, { method: 'GET', headers: devHeaders });
  if (!r.ok) die(`o1-dev read ${path.split('?')[0]} answered ${r.status}`, 3);
  return r.json();
}
async function devCount(path) {
  const r = await req('o1-dev', DEV_URL + '/rest/v1/' + path, { method: 'HEAD', headers: { ...devHeaders, Prefer: 'count=exact' } });
  const m = /\/(\d+)$/.exec(r.headers.get('content-range') || '');
  return m ? Number(m[1]) : -1;
}
async function devWrite(table, rows, onConflict) {
  const prefer = `${REFRESH ? 'resolution=merge-duplicates' : 'resolution=ignore-duplicates'},return=minimal`;
  const url = `${DEV_URL}/rest/v1/${table}` + (onConflict ? `?on_conflict=${onConflict}` : '');
  const r = await req('o1-dev', url, { method: 'POST', headers: { ...devHeaders, 'content-type': 'application/json', Prefer: prefer }, body: JSON.stringify(rows) }, 1);
  if (!r.ok) {
    let e = {}; try { e = await r.json(); } catch { /* no body */ }
    die(`write to ${table} refused by o1-dev: ${r.status} ${e.code || ''} ${String(e.message || '').slice(0, 160)}`, 6);
  }
}
async function pagedAll(getter, table, select, filter, order) {
  const out = [];
  for (let off = 0; ; off += PAGE) {
    const j = await getter(`${table}?select=${select}${filter ? '&' + filter : ''}&order=${order}&limit=${PAGE}&offset=${off}`);
    out.push(...j);
    if (j.length < PAGE) return out;
  }
}

// ---- the catalog, in foreign key order.
//   pk       primary key columns (after remapping)
//   filter   PostgREST filter added to the visitor's read (published content only)
//   site     site_id is set to 'kpop'
//   groupCols columns that hold a group id (remapped)
//   fks      [column, referenced table]: a missing target nulls the column when o1-dev allows it, else the row is dropped
//   users    columns holding a person (creator, author, reviewer): replaced by the system account when set
//   nulls    columns emptied (lock owners, review pointers into tables that are not copied)
//   self     self-referencing column (parents are written first)
//   entity   [typeColumn, idColumn]: a group entity id is remapped
const TABLES = [
  { t: 'groups', pk: ['id'], site: true, groupCols: ['id'] },
  { t: 'group_units', pk: ['id'], groupCols: ['parent_group_id'], fks: [['parent_group_id', 'groups']] },
  { t: 'idols', pk: ['id'], groupCols: ['group_id'], fks: [['group_id', 'groups'], ['unit_id', 'group_units']], users: ['created_by'] },
  { t: 'eras', pk: ['id'], groupCols: ['group_id'], fks: [['group_id', 'groups']] },
  { t: 'albums', pk: ['id'], groupCols: ['group_id'], fks: [['group_id', 'groups'], ['unit_id', 'group_units'], ['era_id', 'eras']] },
  { t: 'songs', pk: ['id'], site: true, groupCols: ['group_id'], fks: [['group_id', 'groups']] },
  { t: 'album_tracks', pk: ['id'], fks: [['album_id', 'albums'], ['song_id', 'songs']] },
  { t: 'awards', pk: ['id'], groupCols: ['group_id'], fks: [['group_id', 'groups'], ['idol_id', 'idols']] },
  { t: 'photocards', pk: ['id'], groupCols: ['group_id'], fks: [['group_id', 'groups'], ['idol_id', 'idols'], ['album_id', 'albums']], users: ['created_by'] },
  { t: 'collectibles', pk: ['id'], groupCols: ['group_id'], fks: [['group_id', 'groups']], users: ['created_by'] },
  { t: 'entity_sources', pk: [], natural: ['entity_type', 'entity_id', 'field', 'source', 'source_ref'], entity: ['entity_type', 'entity_id'] },
  { t: 'verse_aliases', pk: ['id'], groupCols: ['group_id'], fks: [['group_id', 'groups']] },
  { t: 'space_tags', pk: ['id'], groupCols: ['space_id'], fks: [['space_id', 'groups']] },
  { t: 'pages', pk: ['id'], groupCols: ['space_id'], fks: [['space_id', 'groups']], users: ['created_by'], self: 'parent_id' },
  { t: 'page_tags', pk: ['page_id', 'tag_id'], fks: [['page_id', 'pages'], ['tag_id', 'space_tags']] },
  { t: 'nav_menus', pk: ['space_id'], groupCols: ['space_id'], fks: [['space_id', 'groups']] },
  { t: 'verse_pages', pk: ['id'], groupCols: ['group_id'], fks: [['group_id', 'groups']], users: ['created_by'], self: 'parent_page_id' },
  { t: 'verse_content', pk: ['id'], nulls: ['current_revision_id', 'locked_by'], entity: ['entity_type', 'entity_id'] },
  { t: 'verse_spaces', pk: ['group_id'], groupCols: ['group_id'], fks: [['group_id', 'groups']] },
  { t: 'verse_essays', pk: ['id'], site: true, groupCols: ['group_id'], fks: [['group_id', 'groups']], users: ['author', 'reviewed_by'], nulls: ['series_id'], filter: 'status=eq.published' },
  { t: 'quizzes', pk: ['id'], site: true, filter: 'status=eq.published', groupCols: ['group_id'], fks: [['group_id', 'groups']], users: ['creator_id'] },
  { t: 'qotd_log', pk: ['id'], site: true, fks: [['quiz_id', 'quizzes']], drop: true },
  { t: 'games', pk: ['id'], site: true, filter: 'status=eq.published', groupCols: ['group_id'], fks: [['group_id', 'groups']], users: ['creator_id'] },
  { t: 'blind_test_songs', pk: ['id'], groupCols: ['group_id'], fks: [['group_id', 'groups']] },
  { t: 'daily_blindtests', pk: ['date'] },
  { t: 'trivia', pk: ['id'], site: true, filter: 'status=eq.published', groupCols: ['group_id'], fks: [['group_id', 'groups']], users: ['created_by'] },
  { t: 'tot_categories', pk: ['id'] },
  { t: 'tot_items', pk: ['id'], fks: [['category_id', 'tot_categories']], drop: true },
  { t: 'personality_profiles', pk: ['id'], site: true, groupCols: ['group_id'], fks: [['group_id', 'groups']] },
  { t: 'personality_questions', pk: ['id'], site: true },
  { t: 'debate_questions', pk: ['id'] },
  { t: 'daily_debates', pk: ['date'], fks: [['question_id', 'debate_questions']], drop: true },
  { t: 'badge_definitions', pk: ['id'], site: true },
  { t: 'mv_tracking', pk: ['id'], groupCols: ['group_id'], fks: [['group_id', 'groups']] },
  { t: 'mv_snapshots', pk: ['id'], fks: [['mv_id', 'mv_tracking']], drop: true },
  { t: 'comebacks', pk: ['id'], groupCols: ['group_id'], fks: [['group_id', 'groups']] },
];

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g;
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[A-Za-z]{2,}/;
const IGNORE_DIFF = /(^|_)(updated_at|created_at)$|_count$|^total_plays$/;
const keyOf = (row, cols) => cols.map((c) => String(row[c])).join('|');

async function main() {
  console.log(`copy-kpop-catalog: ${DRY ? 'dry run' : 'run'}${REFRESH ? ' (refresh)' : ''}, target o1-dev`);
  // o1-dev: shape of the tables and the system account
  const openapi = await (await req('o1-dev', DEV_URL + '/rest/v1/', { method: 'GET', headers: devHeaders })).json();
  const defs = openapi.definitions || {};
  const sys = await devGet(`profiles?select=id&id=eq.${SYSTEM}`);
  if (sys.length !== 1) die('the kpop system account has no profile on o1-dev', 4);

  // production profile ids: kept in memory for the leak guard only, never written or printed
  const profIds = new Set((await pagedAll(prodGet, 'profiles', 'id', '', 'id')).map((r) => r.id));
  profIds.delete(SYSTEM);

  // group id map: production id -> o1-dev id
  const devKpopGroups = await devGet('groups?select=id,slug&site_id=eq.kpop&limit=1000');
  const devBySlug = new Map(devKpopGroups.map((g) => [g.slug, g.id]));
  const groupMap = new Map();

  const keys = {}; // table -> Set of primary keys (as strings) that are, or will be, on o1-dev
  const plan = []; // { cfg, rows, read, dropped }
  const warnings = {};
  const leaks = {};
  for (const cfg of TABLES) {
    const t = cfg.t;
    const def = defs[t];
    if (!def) die(`o1-dev has no table ${t}`, 4);
    const devCols = new Set(Object.keys(def.properties));
    const notNull = new Set(def.required || []);
    const prod = await pagedAll(prodGet, t, '*', cfg.filter || '', (cfg.pk.length ? cfg.pk : ['id']).join(','));
    const read = prod.length;
    if (t === 'groups') {
      for (const g of prod) groupMap.set(g.id, devBySlug.has(g.slug) ? devBySlug.get(g.slug) : g.id + GROUP_OFFSET);
    }
    const uuidCols = new Set(Object.entries(def.properties).filter(([, p]) => p.format === 'uuid').map(([c]) => c));
    const allowedUuid = new Set([...cfg.pk, ...(cfg.users || []), ...(cfg.fks || []).map((f) => f[0]), ...(cfg.nulls || [])]);
    let rows = [];
    let dropped = 0;
    for (const src of prod) {
      const row = {};
      for (const [c, v] of Object.entries(src)) if (devCols.has(c)) row[c] = v;
      for (const c of cfg.groupCols || []) if (row[c] != null) { if (!groupMap.has(row[c])) { row.__drop = true; } else row[c] = groupMap.get(row[c]); }
      for (const c of cfg.users || []) if (row[c] != null) row[c] = SYSTEM;
      for (const c of cfg.nulls || []) if (c in row) row[c] = null;
      if (cfg.entity) {
        const [tc, ic] = cfg.entity;
        if (row[tc] === 'group' && row[ic] != null) {
          const pg = Number(row[ic]);
          if (groupMap.has(pg)) row[ic] = String(groupMap.get(pg)); else row.__drop = true;
        }
      }
      if (cfg.site) row.site_id = 'kpop';
      if (t === 'entity_sources') delete row.id;
      rows.push(row);
    }
    // foreign keys to tables of this catalog
    rows = rows.filter((row) => {
      if (row.__drop) { dropped++; return false; }
      for (const [c, ref] of cfg.fks || []) {
        if (row[c] == null) continue;
        const target = ref === 'groups' ? null : keys[ref];
        const present = ref === 'groups' ? [...groupMap.values()].includes(row[c]) : target && target.has(String(row[c]));
        if (!present) {
          if (!notNull.has(c)) row[c] = null;
          else { dropped++; return false; }
        }
      }
      return true;
    });
    // parents first
    if (cfg.self) {
      const have = new Set(rows.map((r) => String(r.id)));
      for (const r of rows) if (r[cfg.self] != null && !have.has(String(r[cfg.self]))) r[cfg.self] = null;
      const done = new Set(); const ordered = []; let left = rows.slice();
      while (left.length) {
        const next = left.filter((r) => r[cfg.self] == null || done.has(String(r[cfg.self])));
        if (!next.length) die(`${t}: a cycle in ${cfg.self}`, 3);
        for (const r of next) { ordered.push(r); done.add(String(r.id)); }
        left = left.filter((r) => !next.includes(r));
      }
      rows = ordered;
    }
    // unmapped person columns, profile ids, email-like text
    for (const c of uuidCols) {
      if (allowedUuid.has(c)) continue;
      if (rows.some((r) => r[c] != null)) die(`${t}.${c} holds a uuid this script does not map; refusing`, 7);
    }
    for (const r of rows) {
      for (const [c, v] of Object.entries(r)) {
        if (v == null || typeof v === 'number' || typeof v === 'boolean') continue;
        const s = typeof v === 'string' ? v : JSON.stringify(v);
        const m = s.match(UUID);
        if (m && m.some((u) => profIds.has(u))) leaks[`${t}.${c}`] = (leaks[`${t}.${c}`] || 0) + 1;
        if (EMAIL.test(s)) warnings[`${t}.${c}`] = (warnings[`${t}.${c}`] || 0) + 1;
      }
    }
    keys[t] = new Set(cfg.pk.length ? rows.map((r) => keyOf(r, cfg.pk)) : []);
    plan.push({ cfg, rows, read, dropped });
  }
  if (Object.keys(leaks).length) die(`refused: ${Object.keys(leaks).length} column(s) still hold a production profile id (${Object.keys(leaks).join(', ')}); nothing written`, 7);
  const mail = Object.keys(warnings);
  if (mail.length) die(`refused: email-like text in ${mail.join(', ')} (${mail.map((k) => warnings[k]).join(', ')} rows); nothing written`, 7);
  console.log(`guard: no production profile id and no email-like text in ${plan.reduce((n, p) => n + p.rows.length, 0)} outgoing rows`);

  // o1-dev: what is already there
  const result = [];
  for (const p of plan) {
    const { cfg, rows } = p;
    const t = cfg.t;
    let existing = new Set();
    let fresh = rows;
    if (cfg.natural) { // entity_sources: natural key, ids belong to o1-dev
      const types = [...new Set(rows.map((r) => r.entity_type))];
      const have = new Set();
      for (const et of types) {
        const dev = await pagedAll(devGet, t, 'entity_type,entity_id,field,source,source_ref', `entity_type=eq.${et}`, 'id');
        for (const d of dev) have.add(keyOf(d, cfg.natural));
      }
      // an entity type that anime owns (character, series) never appears here: the visitor's read only holds kpop entities
      existing = have;
      fresh = rows.filter((r) => !have.has(keyOf(r, cfg.natural)));
      p.existing = rows.length - fresh.length;
    } else {
      const dev = await pagedAll(devGet, t, '*', '', cfg.pk.join(','));
      const ours = new Map(rows.map((r) => [keyOf(r, cfg.pk), r]));
      let clash = 0;
      for (const d of dev) {
        const k = keyOf(d, cfg.pk);
        const o = ours.get(k);
        if (!o) continue;
        existing.add(k);
        if (t === 'groups') { if (d.slug !== o.slug || d.site_id !== 'kpop') clash++; continue; }
        if (cfg.site) { if (d.site_id !== 'kpop') clash++; continue; }
        for (const c of Object.keys(o)) if (!IGNORE_DIFF.test(c) && JSON.stringify(d[c]) !== JSON.stringify(o[c])) { clash++; break; }
      }
      if (clash) die(`${t}: ${clash} primary key(s) already hold a different row on o1-dev; nothing written for it`, 8);
      fresh = REFRESH ? rows : rows.filter((r) => !existing.has(keyOf(r, cfg.pk)));
      p.existing = existing.size;
    }
    p.fresh = fresh;
  }

  // writes, in foreign key order
  for (const p of plan) {
    const { cfg, fresh } = p;
    if (DRY || !fresh.length) continue;
    const onConflict = cfg.pk.length ? cfg.pk.join(',') : undefined;
    let batch = []; let bytes = 0;
    const flush = async () => { if (batch.length) await devWrite(cfg.t, batch, onConflict); batch = []; bytes = 0; };
    for (const r of fresh) {
      const s = JSON.stringify(r).length;
      if (batch.length >= 500 || (bytes + s > 700000 && batch.length)) await flush();
      batch.push(r); bytes += s;
    }
    await flush();
  }

  // counts
  const pad = (s, n) => String(s).padEnd(n);
  console.log(pad('table', 24) + pad('read', 8) + pad('dropped', 9) + pad('to_write', 10) + pad('present', 9) + (DRY ? '' : 'on_dev'));
  for (const p of plan) {
    const t = p.cfg.t;
    let onDev = '';
    if (!DRY) {
      const scope = defs[t].properties.site_id ? '&site_id=eq.kpop'
        : p.cfg.natural ? `&entity_type=in.(${[...new Set(p.rows.map((r) => r.entity_type))].join(',')})` : '';
      onDev = await devCount(`${t}?select=*${scope}`);
    }
    console.log(pad(t, 24) + pad(p.read, 8) + pad(p.dropped, 9) + pad(p.fresh.length, 10) + pad(p.existing, 9) + onDev);
    result.push({ t, read: p.read, dropped: p.dropped, written: DRY ? 0 : p.fresh.length, present: p.existing, onDev });
  }
  const total = result.reduce((n, r) => n + (DRY ? 0 : r.written), 0);
  console.log(`copy-kpop-catalog: ${DRY ? 'dry run, nothing written' : `${total} row(s) written to o1-dev`}`);
}
main().catch((e) => die('failed: ' + String((e && (e.code || e.message)) || 'error').slice(0, 120), 1));
