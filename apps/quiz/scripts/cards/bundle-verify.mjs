// KpopCards, PR #231: the text of docs/pending-migrations/cards/ALL-verify.sql, written by bundle-sql.mjs. ONE read-only SELECT with one
// row per `-- Verify:` line of the 15 files (in file order) and a last row TOUT_OK, columns fichier, controle, attendu, obtenu, ok.
//
// Rules of the statement:
//   - it reads only. Every function it calls is a built-in that reads, or one of the files' functions whose body (and the body of every
//     function it calls) has no insert, update, delete or lock in any branch: cards_wallet (110), cards_week_progress (105),
//     cards_prefs_get (107). cards_catalog_append(true) (114) is NOT called (its write branch inserts, updates and locks): APPEND_PREVIEW
//     below computes the same answer with a plain query.
//   - it runs on the database before the bundle too (TOUT_OK false then): an object that only the bundle creates (a table, a column, a
//     function) is read through query_to_xml, a built-in that runs a query given as text, inside a CASE that first checks the object
//     exists (to_regclass, to_regprocedure, pg_attribute). The value travels hex-encoded, so no XML escaping can change it.
//   - where a Verify line compares with a NOTICE of its file, the expected value is computed from the database and the file's own list
//     (copied below by the generator), never a number measured on a test database. Where a later file of the bundle changes what an
//     earlier line reads (103 rebuilds the catalog of 102, 110 drops cards_apply_pack of 104), the row checks the state after the bundle
//     and its controle says so.

const LADDER = "array['C', 'U', 'R', 'SR', 'UR', 'L']";
const ZERO = "'00000000-0000-0000-0000-000000000000'::uuid";
const AT = "'2026-11-12 10:00+00'::timestamptz";

/** A SQL string literal. */
export const lit = (s) => `'${String(s).replace(/'/g, "''")}'`;
const val = (v) => (v === null || v === undefined ? 'null' : typeof v === 'number' || typeof v === 'boolean' ? String(v) : typeof v === 'object' ? v.raw : lit(v));

/** SQL booleans: an object of the bundle exists. */
const tbl = (name) => `to_regclass('public.${name}') is not null`;
const col = (t, c) => `exists (select 1 from pg_attribute where attrelid = to_regclass('public.${t}') and attname = '${c}' and attnum > 0 and not attisdropped)`;
const fn = (sig) => `to_regprocedure('public.${sig}') is not null`;

/** A scalar SQL expression run only when `need` holds (null otherwise), through query_to_xml, so the statement parses on any database. */
export function dyn(need, expr) {
  if (expr.includes('$q$')) throw new Error('dyn: the expression holds $q$');
  const inner = `select encode(convert_to((${expr})::text, 'UTF8'), 'hex') as v`;
  return `case when ${need} then convert_from(decode(substring(query_to_xml($q$${inner}$q$, true, false, '')::text from '<v>([0-9a-f]*)</v>'), 'hex'), 'UTF8') end`;
}

/** The number of public functions with these names. */
const nproc = (names) => `(select count(*)::text from pg_proc where pronamespace = 'public'::regnamespace and proname in (${names.map(lit).join(', ')}))`;
/** "name count, ..." for these function names. */
const proccount = (names) => `(select coalesce(string_agg(proname || ' ' || n, ', ' order by proname), '') from (select proname, count(*) as n from pg_proc
     where pronamespace = 'public'::regnamespace and proname in (${names.map(lit).join(', ')}) group by proname) z)`;
/** true when anon or authenticated can execute a public function whose name matches. */
const browserExec = (where) => `(select bool_or(has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))::text
     from pg_proc p where p.pronamespace = 'public'::regnamespace and ${where})`;
const rlsTables = (names) => `(select count(*)::text from pg_tables where schemaname = 'public' and tablename in (${names.map(lit).join(', ')}) and rowsecurity)`;
const browserGrants = (names, roles = ['anon', 'authenticated']) => `(select count(*)::text from information_schema.role_table_grants
     where table_schema = 'public' and table_name in (${names.map(lit).join(', ')}) and grantee in (${roles.map(lit).join(', ')}))`;
const privOn = (role, sig) => `case when ${fn(sig)} then has_function_privilege('${role}', to_regprocedure('public.${sig}'), 'execute')::text end`;
const rowCount = (t) => dyn(tbl(t), `select count(*) from public.${t}`);
/** "1, N, N" for a contiguous catalog of N cards, "-, -, 0" for an empty one. */
const contiguous = (n) => `(select case when x.n = 0 then '-, -, 0' else '1, ' || x.n || ', ' || x.n end from (select (${n})::bigint as n) x)`;
const minMaxCount = `(select coalesce(min(card_no)::text, '-') || ', ' || coalesce(max(card_no)::text, '-') || ', ' || count(*) from public.cards_catalog)`;
const pairsApart = dyn(col('cards_catalog', 'part'), `select count(*) from public.cards_catalog a join public.cards_catalog b on b.entity_id = a.entity_id and b.rarity = a.rarity and b.part = 2
     where a.part = 1 and b.card_no <> a.card_no + 1`);
const WALLET = 'cards_wallet(uuid,timestamptz,integer,integer,integer)';
const wallet = (key) => dyn(fn(WALLET), `coalesce(public.cards_wallet(${ZERO}, ${AT}) ->> '${key}', 'null')`);

// The crop window of a photo (cards_build_catalog of 103, cards_catalog_append of 114): 5.5:8.5 for a person, 11:8.5 for a group's pair.
const cw = (p, grp) => `floor(least(${p}.source_width::numeric, ${p}.source_height::numeric * (case when ${grp} then 11 else 5.5 end) / 8.5))::integer`;

/** The cards cards_build_catalog() (103) makes from the photos in the database: n live photos (at most 6) open the n lowest editions
 *  from 2 photos, Full Art needs a photo with an honest 2x, a group card is a pair. */
export const LADDER_TOTAL = `(select coalesce(sum(case when z.n < 2 then 0 when z.n = 6 and not z.full_any then 5 else z.n end * case when z.kind = 'group' then 2 else 1 end), 0)
     from (select e.id, e.kind, least(count(*), 6) as n,
                  bool_or(case when e.kind = 'group' then w.cw / 2 >= 640 else w.cw >= 640 end) as full_any
             from public.cards_entities e
             join public.cards_photos p on p.entity_id = e.id and p.status in ('auto', 'approved') and p.source_width is not null and p.source_height is not null
             cross join lateral (select ${cw('p', "e.kind = 'group'")} as cw) w
            where e.kind in ('idol', 'group')
            group by e.id, e.kind) z)`;

/** The answer of cards_catalog_append(true) - 'by_rarity' (114), computed with a plain query: the same subjects, the same ranking of the
 *  unused live photos, the same free editions, Full Art and Stage picks, so the same cards, subjects, waiting and not_shown counts. */
export const APPEND_PREVIEW = `(with ent as (
       select en.id, en.kind = 'group' as grp from public.cards_entities en
        where en.kind in ('idol', 'group') and exists (select 1 from public.cards_photos p where p.entity_id = en.id)),
     have as (
       select e.id, coalesce(array_agg(distinct c.rarity) filter (where c.rarity is not null), '{}') as have,
              coalesce(array_agg(c.photo_id) filter (where c.photo_id is not null), '{}') as used
         from ent e left join public.cards_catalog c on c.entity_id = e.id group by e.id),
     u as (
       select p.entity_id as id, p.id as pid, p.stage, (p.storage_path is not null or p.source_path is not null) as shown,
              case when e.grp then w.cw / 2 >= 640 else w.cw >= 640 end as full_ok,
              row_number() over (partition by p.entity_id order by coalesce(p.quality, 3) desc, w.cw desc, p.event_date desc nulls last, p.slot) as rk
         from public.cards_photos p join ent e on e.id = p.entity_id join have h on h.id = e.id
         cross join lateral (select ${cw('p', 'e.grp')} as cw) w
        where p.status in ('auto', 'approved') and p.source_width is not null and p.source_height is not null and not (p.id = any (h.used))),
     s as (
       select e.id, e.grp, cardinality(h.have) > 0 as in_,
              array(select t.r from unnest(${LADDER}) with ordinality as t(r, o) where not (t.r = any (h.have)) order by t.o) as missing,
              (select count(*) from u where u.id = e.id)::integer as nu
         from ent e join have h on h.id = e.id),
     k as (select s.*, least(s.nu, cardinality(s.missing)) as k from s),
     o as (
       select k.*, (select x.pid from u x where x.id = k.id and x.full_ok order by x.rk limit 1) as best_full
         from k where not (k.k = 0 or (not k.in_ and k.k < 2))),
     op as (
       select o.id, o.grp, o.in_,
              case when 'L' = any (o.missing[1:o.k]) and o.best_full is null then array_remove(o.missing[1:o.k], 'L') else o.missing[1:o.k] end as open_,
              case when 'L' = any (o.missing[1:o.k]) then o.best_full end as lpick
         from o),
     sp as (
       select op.*, case when 'U' = any (op.open_) then
                (select x.pid from u x where x.id = op.id and x.stage and x.pid is distinct from op.lpick order by x.rk desc limit 1) end as upick
         from op where cardinality(op.open_) > 0),
     picks as (
       select sp.id, sp.grp, x.pid from sp cross join lateral (
         select sp.lpick as pid where sp.lpick is not null
         union all select sp.upick where sp.upick is not null
         union all select r.pid from (select y.pid, row_number() over (order by y.rk) as rn from u y
                                       where y.id = sp.id and y.pid is distinct from sp.lpick and y.pid is distinct from sp.upick) r
                    where r.rn <= cardinality(sp.open_) - (sp.lpick is not null)::integer - (sp.upick is not null)::integer) x),
     t as (
       select coalesce(sum(cardinality(sp.open_) * case when sp.grp then 2 else 1 end), 0)::integer as cards, count(*)::integer as subjects,
              (count(*) filter (where not sp.in_))::integer as new_subjects, (count(*) filter (where sp.in_))::integer as extended_subjects
         from sp)
     select jsonb_build_object('dry_run', true, 'cards', t.cards, 'subjects', t.subjects, 'new_subjects', t.new_subjects,
              'extended_subjects', t.extended_subjects,
              'waiting', (select count(*) from k where not k.in_ and k.k < 2),
              'from_no', case when t.cards > 0 then (select coalesce(max(card_no), 0) from public.cards_catalog) + 1 end,
              'to_no', case when t.cards > 0 then (select coalesce(max(card_no), 0) from public.cards_catalog) + t.cards end,
              'not_shown', (select coalesce(sum(case when pk.grp then 2 else 1 end), 0) from picks pk join u on u.pid = pk.pid where not u.shown))::text
       from t)`;

/** What the preview must answer right after the bundle: 103 has just put every usable live photo on a card, so nothing to add; the
 *  subjects with fewer than 2 live photos wait. */
const APPEND_AFTER_BUNDLE = `(select jsonb_build_object('dry_run', true, 'cards', 0, 'subjects', 0, 'new_subjects', 0, 'extended_subjects', 0,
       'waiting', count(*) filter (where z.n < 2), 'from_no', null, 'to_no', null, 'not_shown', 0)::text
     from (select en.id, (select count(*) from public.cards_photos p where p.entity_id = en.id and p.status in ('auto', 'approved')
                            and p.source_width is not null and p.source_height is not null) as n
             from public.cards_entities en
            where en.kind in ('idol', 'group') and exists (select 1 from public.cards_photos p where p.entity_id = en.id)) z)`;

// ---------- the lists of the files ----------

function literal(sql, tag) {
  const open = `$${tag}$[`;
  const a = sql.indexOf(open);
  const b = sql.indexOf(`]$${tag}$`, a);
  if (a < 0 || b < 0) throw new Error(`no $${tag}$ literal`);
  return JSON.parse(sql.slice(a + open.length - 1, b + 1));
}
/** The text of the Verify lines of a file, with their 1-based line numbers. */
export function verifyLines(sql) {
  return sql.split('\n').map((t, i) => ({ line: i + 1, text: t })).filter((x) => x.text.startsWith('-- Verify:'));
}
const arrayOf = (line) => {
  const m = /array\[([^\]]*)\]/.exec(line);
  if (!m) throw new Error(`no array in ${line}`);
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
};
const valuesCte = (name, cols, rows) => {
  if (!rows.length) throw new Error(`${name}: no rows`);
  return `${name} (${cols.join(', ')}) as (values\n    ${rows.map((r) => `(${r.map(val).join(', ')})`).join(',\n    ')})`;
};

/** The lists the checks read, from the files themselves. */
export function lists(read) {
  const f099 = read('099-idols-members.sql');
  const f099b = read('099b-idols-returning.sql');
  const f102 = read('102-catalog-rebuild.sql');
  const f103 = read('103-catalog-photos.sql');
  const f111 = read('111-group-types.sql');
  const m099 = literal(f099, 'members');
  const m099b = literal(f099b, 'members');
  const s103 = literal(f103, 'subjects');
  const v102 = verifyLines(f102);
  const age = arrayOf(v102[4].text);
  const lot1 = arrayOf(v102[5].text);
  const owner = new Map();
  for (const s of s103) for (const p of s.photos) if (p.source_path) owner.set(p.source_path, s.slug);
  const g111 = [...f111.matchAll(/\('(group:[a-z0-9-]+)', '(girl|boy|mixed)'/g)].map((m) => [m[1], m[2]]);
  return {
    l099: m099.flatMap((s) => s.members.map((m, pos) => [s.slug, s.kind, pos, m.name, m.qid, m.active])),
    l099b: m099b.flatMap((s) => s.members.map((m) => [s.slug, m.name])),
    l103: s103.map((s) => [s.slug, s.kind, s.end_year,
      ...['approved', 'auto', 'pending'].map((st) => s.photos.filter((p) => p.status === st).length)]),
    lot1: lot1.map((slug, pos) => [pos, slug, owner.get(`images/group-photos/${slug}.jpg`) ?? null]),
    age102: age.map((id, pos) => [pos, id]),
    l111: g111,
  };
}

// ---------- the checks, in file order ----------

const DLE = "to_regclass('public.dle_src_kpop_idol') is not null";
const statusList = (from) => `(select coalesce(string_agg(st || ' ' || n, ', ' order by st), '') from (${from}) z where n > 0)`;

/** file -> [{ line, label, expect, got }]: each Verify line of the file, in order (bundle-sql.mjs refuses a missing or extra one). */
export const CHECKS = {
  '099-idols-members.sql': [
    { line: 22, label: 'rows of 099 = the members of its list whose subject had no active member (the "N rows added" notice)',
      expect: '(select count(*)::text from x099)',
      got: "(select count(*)::text from public.idols where review_reason like '099-idols-members%')" },
    { line: 23, label: 'one line per subject added, slug active count (former members of loossemble, miss-a, purple-kiss, sistar)',
      expect: "(select coalesce(string_agg(slug || ' ' || active || ' ' || n, ', ' order by slug, active), '') from (select slug, active, count(*) as n from x099 group by slug, active) z)",
      got: `(select coalesce(string_agg(slug || ' ' || active || ' ' || n, ', ' order by slug, active), '') from (select g.slug, i.active, count(*) as n
     from public.idols i join public.groups g on g.id = i.group_id where i.review_reason like '099-idols-members%' group by g.slug, i.active) z)` },
    { line: 24, label: 'active rows of 099 out of the Kpopdle wait', expect: "'0'",
      got: "(select count(*)::text from public.idols where review_reason like '099-idols-members%' and active and not needs_review)" },
    { line: 25, label: 'rows of 099 in the Kpopdle source view', expect: `case when ${DLE} then '0' else 'no view dle_src_kpop_idol' end`,
      got: `coalesce(${dyn(DLE, "select count(*) from public.dle_src_kpop_idol s join public.idols i on i.id::text = s.entity_id where i.review_reason like '099-idols-members%'")}, 'no view dle_src_kpop_idol')` },
  ],
  '102-catalog-rebuild.sql': [
    { line: 26, label: 'cards owned', expect: "'0'", got: '(select count(*)::text from public.cards_owned)' },
    { line: 27, label: 'cards per part (after 103: each subject in packs has one card per open edition, a group a pair; open = 6 minus its lock reasons)',
      expect: `(select format('0: %s, 1: %s, 2: %s', coalesce(sum(o) filter (where kind = 'idol'), 0), coalesce(sum(o) filter (where kind = 'group'), 0),
       coalesce(sum(o) filter (where kind = 'group'), 0))
     from (select e.kind, 6 - (select count(*) from jsonb_object_keys(e.lock_reasons) k where k = any (${LADDER})) as o
             from public.cards_entities e
            where e.kind in ('idol', 'group') and e.active and exists (select 1 from public.cards_photos p where p.entity_id = e.id)) z)`,
      got: dyn(col('cards_catalog', 'part'), "select format('0: %s, 1: %s, 2: %s', count(*) filter (where part = 0), count(*) filter (where part = 1), count(*) filter (where part = 2)) from public.cards_catalog") },
    { line: 28, label: 'numbers 1 to N, contiguous', expect: contiguous('select count(*) from public.cards_catalog'), got: minMaxCount },
    { line: 29, label: 'pairs without consecutive numbers', expect: "'0'", got: pairsApart },
    { line: 30, label: 'subjects the age rule of 102 leaves out that have an entity (after the bundle: only those 103 brings back with newer photos, resolved now)',
      expect: "(select coalesce(string_agg(a.id, ', ' order by a.pos), '') from age102 a where a.id in (select id from e103))",
      got: "(select coalesce(string_agg(a.id, ', ' order by a.pos), '') from age102 a where exists (select 1 from public.cards_entities e where e.id = a.id))" },
    { line: 31, label: 'slugs without their October photo (after the bundle: the slugs whose 103 subject is out or carries no such photo)',
      expect: "(select coalesce(string_agg(l.slug, ', ' order by l.pos), '') from lot1 l where not exists (select 1 from r103 r where r.slug = l.subject and r.reason is null))",
      got: "(select coalesce(string_agg(l.slug, ', ' order by l.pos), '') from lot1 l where not exists (select 1 from public.cards_photos p where p.source_path = 'images/group-photos/' || l.slug || '.jpg'))" },
  ],
  '099b-idols-returning.sql': [
    { line: 17, label: 'rows of 099b = the members of its list whose group had no active member (the "N rows added" notice)',
      expect: '(select count(*)::text from x099b)',
      got: "(select count(*)::text from public.idols where review_reason like '099b-idols-returning%')" },
    { line: 18, label: 'active rows of 099b out of the Kpopdle wait', expect: "'0'",
      got: "(select count(*)::text from public.idols where review_reason like '099b-idols-returning%' and active and not needs_review)" },
    { line: 19, label: 'one line per group added, slug count',
      expect: "(select coalesce(string_agg(slug || ' ' || n, ', ' order by slug), '') from (select slug, count(*) as n from x099b group by slug) z)",
      got: `(select coalesce(string_agg(slug || ' ' || n, ', ' order by slug), '') from (select g.slug, count(*) as n from public.idols i join public.groups g on g.id = i.group_id
     where i.review_reason like '099b-idols-returning%' group by g.slug) z)` },
  ],
  '103-catalog-photos.sql': [
    { line: 28, label: 'cards owned', expect: "'0'", got: '(select count(*)::text from public.cards_owned)' },
    { line: 29, label: 'numbers 1 to N, contiguous, N = the cards of the edition rule on the live photos (the notice "... N cards")',
      expect: contiguous(LADDER_TOTAL), got: minMaxCount },
    { line: 30, label: 'photos on two editions', expect: "'0'",
      got: '(select count(*)::text from (select entity_id, photo_id from public.cards_catalog group by entity_id, photo_id having count(distinct rarity) > 1) x)' },
    { line: 31, label: 'cards on a photo that is not live', expect: "'0'",
      got: "(select count(*)::text from public.cards_catalog c join public.cards_photos p on p.id = c.photo_id where p.status not in ('auto', 'approved'))" },
    { line: 32, label: 'subjects with fewer than 2 editions', expect: "'0'",
      got: '(select count(*)::text from (select entity_id from public.cards_catalog group by entity_id having count(distinct rarity) < 2) x)' },
    { line: 33, label: 'pairs without consecutive numbers', expect: "'0'", got: pairsApart },
    { line: 34, label: 'photos by status = the photos of the file of the subjects resolved now (the notice "photos ...")',
      expect: statusList(`select 'approved' as st, sum(approved) as n from r103 where reason is null
       union all select 'auto', sum(auto) from r103 where reason is null union all select 'pending', sum(pending) from r103 where reason is null`),
      got: statusList('select status as st, count(*) as n from public.cards_photos group by status') },
  ],
  '104-economy.sql': [
    { line: 45, label: 'its 7 functions', expect: "'7'",
      got: nproc(['cards_pity_count', 'cards_pity_pool', 'cards_focus_used', 'cards_craft', 'cards_wish', 'cards_ad_grant', 'cards_recent_packs']) },
    { line: 46, label: 'one cards_roll and one cards_wallet (cards_apply_pack is dropped by 110, its line 43)',
      expect: "'cards_roll 1, cards_wallet 1'", got: proccount(['cards_roll', 'cards_wallet', 'cards_apply_pack']) },
    { line: 47, label: 'a cards function a browser role can execute', expect: "'false'", got: browserExec("p.proname like 'cards\\_%'") },
    { line: 48, label: 'row level security on cards_crafts and cards_wishlist', expect: "'2'", got: rlsTables(['cards_crafts', 'cards_wishlist']) },
    { line: 49, label: 'browser grants on them', expect: "'0'", got: browserGrants(['cards_crafts', 'cards_wishlist']) },
    { line: 50, label: 'the 5 new columns', expect: "'5'",
      got: `(select count(*)::text from information_schema.columns where table_schema = 'public' and ((table_name = 'cards_wallets' and column_name = 'timer_today')
     or (table_name = 'cards_packs' and column_name in ('focus', 'new_count')) or (table_name = 'cards_owned' and column_name in ('first_pack_no', 'first_source'))))` },
    { line: 51, label: 'timer packs left of an empty wallet (cards_wallet, read only)', expect: "'40'", got: wallet('timer_left') },
    { line: 52, label: 'packs left to the Gold guarantee (30 once a Gold card is in packs, null before: cards_pity_pool read inline)',
      expect: `case when exists (select 1 from public.cards_catalog c join public.cards_entities e on e.id = c.entity_id where c.rarity = 'UR' and c.in_packs and e.active) then '30' else 'null' end`,
      got: wallet('pity_left') },
    { line: 53, label: 'owned rows with a first pack (nothing backfilled)', expect: "'0'",
      got: dyn(`${col('cards_owned', 'first_pack_no')} and ${col('cards_owned', 'first_source')}`, 'select count(*) from public.cards_owned where first_pack_no is not null or first_source is not null') },
  ],
  '105-goals.sql': [
    { line: 33, label: 'its 5 functions', expect: "'5'", got: nproc(['cards_goals_progress', 'cards_week_progress', 'cards_missions', 'cards_claim', 'cards_idem_gc']) },
    { line: 34, label: 'a cards function a browser role can execute', expect: "'false'", got: browserExec("p.proname like 'cards\\_%'") },
    { line: 35, label: 'row level security on its 4 tables', expect: "'4'", got: rlsTables(['cards_sets_claimed', 'cards_week_claims', 'cards_idem', 'cards_audit']) },
    { line: 36, label: 'browser grants on them', expect: "'0'", got: browserGrants(['cards_sets_claimed', 'cards_week_claims', 'cards_idem', 'cards_audit']) },
    { line: 37, label: 'the stack check allows 500', expect: "'true'",
      got: "(select (pg_get_constraintdef(oid) like '%500%')::text from pg_constraint where conname = 'cards_wallets_stock_check' and conrelid = to_regclass('public.cards_wallets'))" },
    { line: 38, label: 'the week of 2026-11-12 starts on (cards_week_progress, read only)', expect: "'2026-11-09'",
      got: dyn(fn('cards_week_progress(uuid,timestamptz)'), `coalesce(public.cards_week_progress(${ZERO}, ${AT}) ->> 'week_start', 'null')`) },
    { line: 39, label: 'sets claimed', expect: "'0'", got: rowCount('cards_sets_claimed') },
  ],
  '106-demo.sql': [
    { line: 22, label: 'the table cards_demo_claims', expect: "'1'",
      got: "(select count(*)::text from information_schema.tables where table_schema = 'public' and table_name = 'cards_demo_claims')" },
    { line: 23, label: 'its row level security', expect: "'true'", got: "(select relrowsecurity::text from pg_class where oid = to_regclass('public.cards_demo_claims'))" },
    { line: 24, label: 'browser and PUBLIC grants on it', expect: "'0'", got: browserGrants(['cards_demo_claims'], ['anon', 'authenticated', 'PUBLIC']) },
    { line: 25, label: 'service_role executes cards_demo_claim', expect: "'true'", got: privOn('service_role', 'cards_demo_claim(uuid,text,integer[],text,text,timestamptz)') },
    { line: 26, label: 'anon or authenticated executes cards_demo_claim', expect: "'false'",
      got: `case when ${fn('cards_demo_claim(uuid,text,integer[],text,text,timestamptz)')} then (has_function_privilege('anon', to_regprocedure('public.cards_demo_claim(uuid,text,integer[],text,text,timestamptz)'), 'execute')
     or has_function_privilege('authenticated', to_regprocedure('public.cards_demo_claim(uuid,text,integer[],text,text,timestamptz)'), 'execute'))::text end` },
    { line: 27, label: 'demo claims', expect: "'0'", got: rowCount('cards_demo_claims') },
  ],
  '107-prefs.sql': [
    { line: 12, label: 'its 2 functions', expect: "'2'", got: nproc(['cards_prefs_get', 'cards_prefs_set']) },
    { line: 13, label: 'row level security on cards_prefs', expect: "'1'", got: rlsTables(['cards_prefs']) },
    { line: 14, label: 'browser grants on it', expect: "'0'", got: browserGrants(['cards_prefs']) },
    { line: 15, label: 'a prefs function a browser role can execute', expect: "'false'", got: browserExec("p.proname like 'cards\\_prefs%'") },
    { line: 16, label: 'the theme of a player without prefs (cards_prefs_get, read only)', expect: "'all'",
      got: dyn(fn('cards_prefs_get(uuid)'), `coalesce(public.cards_prefs_get(${ZERO}) ->> 'theme', 'null')`) },
  ],
  '108-push.sql': [
    { line: 21, label: 'the table cards_push_subs', expect: "'1'",
      got: "(select count(*)::text from information_schema.tables where table_schema = 'public' and table_name = 'cards_push_subs')" },
    { line: 22, label: 'its row level security', expect: "'true'", got: "(select relrowsecurity::text from pg_class where oid = to_regclass('public.cards_push_subs'))" },
    { line: 23, label: 'browser grants on it', expect: "'0'", got: browserGrants(['cards_push_subs']) },
    { line: 24, label: 'policies on it', expect: "'0'", got: "(select count(*)::text from pg_policies where schemaname = 'public' and tablename = 'cards_push_subs')" },
    { line: 25, label: 'its 5 functions', expect: "'5'", got: "(select count(*)::text from pg_proc where pronamespace = 'public'::regnamespace and proname like 'cards\\_push\\_%')" },
    { line: 26, label: 'a push function a browser role can execute', expect: "'false'", got: browserExec("p.proname like 'cards\\_push\\_%'") },
    { line: 27, label: 'service_role executes every push function', expect: "'true'",
      got: "(select bool_and(has_function_privilege('service_role', p.oid, 'execute'))::text from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'cards\\_push\\_%')" },
    { line: 28, label: 'push subscriptions', expect: "'0'", got: rowCount('cards_push_subs') },
  ],
  '110-core.sql': [
    { line: 41, label: 'its 10 new functions', expect: "'10'",
      got: nproc(['cards_theme_of', 'cards_in_pool', 'cards_pool_has', 'cards_daily_group', 'cards_open', 'cards_recycle', 'cards_lock', 'cards_seen', 'cards_still_there', 'cards_player']) },
    { line: 42, label: 'one of each replaced function', expect: "'cards_ad_grant 1, cards_craft 1, cards_open 1, cards_pity_count 1, cards_roll 1, cards_wallet 1'",
      got: proccount(['cards_roll', 'cards_wallet', 'cards_pity_count', 'cards_craft', 'cards_ad_grant', 'cards_open']) },
    { line: 43, label: 'cards_apply_pack', expect: "'0'", got: nproc(['cards_apply_pack']) },
    { line: 44, label: 'a cards function a browser role can execute', expect: "'false'", got: browserExec("p.proname like 'cards\\_%'") },
    { line: 45, label: 'row level security on cards_group_types', expect: "'1'", got: rlsTables(['cards_group_types']) },
    { line: 46, label: 'the stack cap of an empty wallet (cards_wallet, read only)', expect: "'10'", got: wallet('cap') },
    { line: 47, label: 'wallets whose pack count differs from their packs', expect: "'0'",
      got: dyn(col('cards_wallets', 'packs_opened'), 'select count(*) from public.cards_wallets where packs_opened <> (select count(*) from public.cards_packs p where p.user_id = cards_wallets.user_id)') },
  ],
  '111-group-types.sql': [
    { line: 14, label: 'groups by type = the groups of its list that are in cards_entities',
      expect: "(select coalesce(string_agg(gender || ' ' || n, ', ' order by gender), '') from (select t.gender, count(*) as n from l111 t join public.cards_entities e on e.id = t.id and e.kind = 'group' group by t.gender) z)",
      got: dyn(tbl('cards_group_types'), "select coalesce(string_agg(gender || ' ' || n, ', ' order by gender), '') from (select gender, count(*) as n from public.cards_group_types group by gender) z") },
    { line: 15, label: 'type rows without their group entity', expect: "'0'",
      got: dyn(tbl('cards_group_types'), "select count(*) from public.cards_group_types t where not exists (select 1 from public.cards_entities e where e.id = t.entity_id and e.kind = 'group')") },
    { line: 16, label: 'type rows without two different sources', expect: "'0'",
      got: dyn(tbl('cards_group_types'), 'select count(*) from public.cards_group_types where length(source_a) = 0 or length(source_b) = 0 or source_a = source_b') },
  ],
  '112-social.sql': [
    { line: 22, label: 'its 7 functions', expect: "'7'",
      got: nproc(['cards_friend_code_new', 'cards_friend_redeem', 'cards_friend_remove', 'cards_friends', 'cards_profile_of', 'cards_profile', 'cards_ranking']) },
    { line: 23, label: 'a cards function a browser role can execute', expect: "'false'", got: browserExec("p.proname like 'cards\\_%'") },
    { line: 24, label: 'row level security on its 2 tables', expect: "'2'", got: rlsTables(['cards_friend_codes', 'cards_friends']) },
    { line: 25, label: 'browser grants on them', expect: "'0'", got: browserGrants(['cards_friend_codes', 'cards_friends']) },
  ],
  '113-moment.sql': [
    { line: 13, label: 'the column cards_photos.event_precision', expect: "'1'",
      got: "(select count(*)::text from information_schema.columns where table_schema = 'public' and table_name = 'cards_photos' and column_name = 'event_precision')" },
    { line: 14, label: 'cards_moment', expect: "'1'", got: nproc(['cards_moment']) },
    { line: 15, label: 'a browser role executes cards_moment', expect: "'false'", got: browserExec("p.proname = 'cards_moment'") },
  ],
  '114-catalog-append.sql': [
    { line: 22, label: 'cards_catalog_append', expect: "'1'", got: nproc(['cards_catalog_append']) },
    { line: 23, label: 'anon or authenticated executes it', expect: "'false'",
      got: `case when ${fn('cards_catalog_append(boolean)')} then (has_function_privilege('anon', to_regprocedure('public.cards_catalog_append(boolean)'), 'execute')
     or has_function_privilege('authenticated', to_regprocedure('public.cards_catalog_append(boolean)'), 'execute'))::text end` },
    { line: 24, label: 'service_role executes it', expect: "'true'", got: privOn('service_role', 'cards_catalog_append(boolean)') },
    { line: 25, label: 'security definer with search_path public', expect: "'true'",
      got: "(select (prosecdef and proconfig = array['search_path=public'])::text from pg_proc where pronamespace = 'public'::regnamespace and proname = 'cards_catalog_append')" },
    { line: 26, label: "the preview, by_rarity left out: nothing to add right after the bundle (not called: the same answer by a plain query)",
      expect: APPEND_AFTER_BUNDLE, got: dyn(fn('cards_catalog_append(boolean)'), APPEND_PREVIEW) },
    { line: 27, label: 'numbers 1 to N, contiguous, the N of 103 (this file adds no card)', expect: contiguous(LADDER_TOTAL), got: minMaxCount },
  ],
  '115-quiz-of-day-bonus.sql': [
    { line: 31, label: "the sources the check of cards_bonus_earned lists", expect: "'quiz, kpopdle, quiz_of_day'",
      got: `(select string_agg(m.w[1], ', ' order by m.o) from pg_constraint c cross join lateral regexp_matches(pg_get_constraintdef(c.oid), '''([a-z_]+)''', 'g') with ordinality as m(w, o)
     where c.conname = 'cards_bonus_earned_source_check' and c.conrelid = to_regclass('public.cards_bonus_earned'))` },
    { line: 32, label: 'the index of one quiz of the day row a Paris day', expect: "'1'",
      got: "(select count(*)::text from pg_indexes where schemaname = 'public' and indexname = 'cards_bonus_earned_quiz_day_key')" },
    { line: 33, label: 'cards_bonus_record and cards_bonus_sync', expect: "'2'", got: nproc(['cards_bonus_record', 'cards_bonus_sync']) },
    { line: 34, label: 'a browser role executes one of them', expect: "'false'", got: browserExec("p.proname in ('cards_bonus_record', 'cards_bonus_sync')") },
    { line: 35, label: 'service_role executes both', expect: "'true'",
      got: "(select bool_and(has_function_privilege('service_role', p.oid, 'execute'))::text from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname in ('cards_bonus_record', 'cards_bonus_sync'))" },
    { line: 36, label: 'cards_bonus_sync is security definer with search_path public', expect: "'true'",
      got: "(select (prosecdef and 'search_path=public' = any (proconfig))::text from pg_proc where pronamespace = 'public'::regnamespace and proname = 'cards_bonus_sync')" },
    { line: 37, label: 'the cards_bonus_record in place reads the quiz of the day', expect: "'true'",
      got: "(select (prosrc like '%is_quiz_of_the_day%')::text from pg_proc where pronamespace = 'public'::regnamespace and proname = 'cards_bonus_record')" },
  ],
};

// The members 099 and 099b insert, by their rules, read from the database now. A row of one of these two files is not "already there":
// the soloists come first in 099's list, so no row 099 writes can stop a later subject of the same run, and 099b runs after 099.
const SHARED = `
r103 as (
  -- the subjects of 103, resolved now by the rule of 102 and 103 (public.groups, public.idols, decision 17): reason null = in
  select s.slug, s.kind, s.end_year, s.approved, s.auto, s.pending,
         case
           when g.id is null then 'no_groups_row'
           when s.kind = 'group' then (
             select case when count(*) = 0 then case when s.end_year is not null then 'no_member' else 'no_active_member' end
                         when count(x.birth_date) < count(*) then 'unknown_birth_date'
                         when count(*) filter (where x.birth_date <= (current_date - interval '18 years')::date) < count(*) then 'minor_member' end
               from public.idols x where x.group_id = g.id and (x.active or s.end_year is not null))
           else (
             select case when p.n > 1 then 'ambiguous' when p.n = 0 then 'no_idol_row' when p.bd is null then 'unknown_birth_date'
                         when p.bd > (current_date - interval '18 years')::date then 'minor' end
               from (select case when own.n > 0 then own.n else oth.n end as n, case when own.n > 0 then own.bd else oth.bd end as bd
                       from (select count(*) as n, max(x.birth_date) as bd from public.idols x where x.group_id = g.id and x.active) own,
                            (select count(*) as n, max(x.birth_date) as bd from public.idols x
                              where x.group_id <> g.id and x.active and lower(btrim(x.name)) = lower(btrim(g.name))) oth) p)
         end as reason,
         -- the group line of a person whose idols row sits in another group
         case when s.kind = 'idol' and g.id is not null and not exists (select 1 from public.idols x where x.group_id = g.id and x.active) then
           (select gl.slug from public.idols x join public.groups gl on gl.id = x.group_id
             where x.group_id <> g.id and x.active and lower(btrim(x.name)) = lower(btrim(g.name)) limit 1) end as line
    from l103 s left join public.groups g on g.slug = s.slug),
e103 (id) as (
  -- the entities 103 writes: the subjects in, and the group lines of the people in
  select case when kind = 'group' then 'group:' else 'idol:' end || slug from r103 where reason is null
  union select 'group:' || line from r103 where reason is null and line is not null),
x099 as (
  select m.slug, m.name, m.active
    from l099 m join public.groups g on g.slug = m.slug
   where not exists (select 1 from public.idols x where x.group_id = g.id and x.active
                       and coalesce(x.review_reason, '') not like '099-idols-members%' and coalesce(x.review_reason, '') not like '099b-idols-returning%')
     and not (m.kind = 'idol' and exists (
           select 1 from l099 f join public.idols x on x.active and x.group_id <> g.id
            where f.slug = m.slug and f.pos = 0
              and coalesce(x.review_reason, '') not like '099-idols-members%' and coalesce(x.review_reason, '') not like '099b-idols-returning%'
              and (lower(btrim(x.name)) = lower(btrim(f.name)) or x.wikidata_qid = f.qid)))
     and not exists (select 1 from public.idols x where x.group_id = g.id and x.name = m.name
                       and coalesce(x.review_reason, '') not like '099-idols-members%' and coalesce(x.review_reason, '') not like '099b-idols-returning%')),
x099b as (
  select m.slug, m.name
    from l099b m join public.groups g on g.slug = m.slug
   where not exists (select 1 from public.idols x where x.group_id = g.id and x.active and coalesce(x.review_reason, '') not like '099b-idols-returning%')
     and not exists (select 1 from public.idols x where x.group_id = g.id and x.name = m.name and coalesce(x.review_reason, '') not like '099b-idols-returning%'))`;

/** ALL-verify.sql. `read(name)` returns a file of docs/pending-migrations/cards; `order` the 15 files in bundle order. */
export function buildVerify(read, order) {
  const L = lists(read);
  const rows = [];
  for (const f of order) {
    const file = `${f}.sql`;
    const want = verifyLines(read(file)).map((v) => v.line);
    const checks = CHECKS[file] ?? [];
    const have = checks.map((c) => c.line);
    if (JSON.stringify(want) !== JSON.stringify(have)) {
      throw new Error(`ALL-verify: ${file} has Verify lines ${want.join(',')}, the checks cover ${have.join(',')}`);
    }
    for (const c of checks) rows.push({ file, ...c });
  }
  const extra = Object.keys(CHECKS).filter((f) => !order.includes(f.replace(/\.sql$/, '')));
  if (extra.length) throw new Error(`ALL-verify: checks for files outside the bundle: ${extra.join(', ')}`);
  const n = rows.length;
  const body = rows.map((r, i) => `  select ${i + 1} as n, ${lit(r.file)} as fichier, ${lit(`line ${r.line}: ${r.label}`)} as controle, a as attendu, o as obtenu, coalesce(a = o, false) as ok
    from (select ${r.expect} as a,
                 ${r.got} as o) x`).join('\n  union all\n');
  const header = [
    '-- ALL-verify.sql: the checks of ALL-099-115.sql, in ONE read-only SELECT (generated by apps/quiz/scripts/cards/bundle-sql.mjs, do not edit)',
    '--',
    `-- What:   one row per \`-- Verify:\` line of the 15 files (${n} lines, in the order of the bundle and of each file), then a last row`,
    '--         whose controle is TOUT_OK: ok is true only when every row is ok. Columns: fichier, controle (the line of the file and what it',
    '--         checks), attendu (expected), obtenu (found), ok.',
    '-- How:    Supabase SQL Editor: paste the whole file, Run, right after ALL-099-115.sql. It writes nothing: it is one SELECT; it calls no',
    '--         function that writes (cards_wallet, cards_week_progress and cards_prefs_get only read, in every branch; cards_catalog_append is',
    '--         not called, a plain query gives its preview). It also runs inside a read-only transaction:',
    '--         PGOPTIONS="-c default_transaction_read_only=on" psql "$SUPABASE_DB_URL" -X -v ON_ERROR_STOP=1 -f docs/pending-migrations/cards/ALL-verify.sql',
    '--         Before the bundle (or after ALL-rollback.sql) it runs too and answers TOUT_OK false.',
    '-- Expected values: computed from the database and from the lists of the files (copied below), never a count measured on a test',
    '--         database: rows of 099 and 099b = the members of their lists whose group had no active member; the subjects of 103 resolved',
    '--         now by the apply-time rule (decision 17); the cards of the edition rule on the live photos. Where a later file changes what an',
    '--         earlier line reads (103 rebuilds the catalog of 102, 110 drops cards_apply_pack of 104), the row checks the state after the',
    '--         bundle and its controle says so. A photo the owner had refused or removed before the bundle stays out of 103, so it would show',
    '--         as a difference in the photo rows of 102 line 31 and 103 line 34.',
    '',
  ].join('\n');
  return `${header}with
${valuesCte('l099', ['slug', 'kind', 'pos', 'name', 'qid', 'active'], L.l099)},
${valuesCte('l099b', ['slug', 'name'], L.l099b)},
${valuesCte('l103', ['slug', 'kind', 'end_year', 'approved', 'auto', 'pending'], L.l103.map((r) => [r[0], r[1], r[2] === null ? { raw: 'null::integer' } : r[2], r[3], r[4], r[5]]))},
${valuesCte('lot1', ['pos', 'slug', 'subject'], L.lot1)},
${valuesCte('age102', ['pos', 'id'], L.age102)},
${valuesCte('l111', ['id', 'gender'], L.l111)},${SHARED},
checks as (
${body}
)
select fichier, controle, attendu, obtenu, ok from (
  select n, fichier, controle, attendu, obtenu, ok from checks
  union all
  select ${n + 1}, 'ALL-099-115.sql', 'TOUT_OK', 'true', coalesce(bool_and(ok) and count(*) = ${n}, false)::text, coalesce(bool_and(ok) and count(*) = ${n}, false) from checks
) r
order by n;
`;
}
