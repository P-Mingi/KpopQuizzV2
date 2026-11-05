// node --test scripts/anime/images/   (in-memory projects only: no network, no credentials)
import test from 'node:test';
import assert from 'node:assert/strict';
import { assertDifferentProjects, applyPlan, assetProblems, blockedCount, buildPlan, describePlan, entityProblems, main, parseArgs, path2x, refOf } from './promote.mjs';

/** An in-memory project: rows of entity_images and the files of the bucket. */
function project(ref, rows = [], files = {}) {
  const state = { rows: rows.map((r) => ({ ...r })), files: new Map(Object.entries(files).map(([k, v]) => [k, Buffer.from(v)])), writes: [] };
  return {
    state, ref,
    async listRows() { return state.rows.map((r) => ({ ...r })); },
    async download(p) { return state.files.get(p) ?? null; },
    async upload(p, buf) { state.writes.push(['file', p]); state.files.set(p, Buffer.from(buf)); },
    async upsertRows(rows) {
      state.writes.push(['rows', rows.length]);
      for (const r of rows) {
        const i = state.rows.findIndex((x) => x.site_id === r.site_id && x.kind === r.kind && x.slug === r.slug);
        if (i >= 0) state.rows[i] = { ...state.rows[i], ...r }; else state.rows.push({ id: state.rows.length + 1, ...r });
      }
    },
  };
}
const row = (slug, over = {}) => ({ id: 1, site_id: 'anime', kind: 'series', slug, path: `anime/series/${slug}/aaaa.webp`, width: 736, height: 981, focal_x: 50, focal_y: 50, source_url: 'https://s.test/p', author: 'A', license: 'cc0', license_note: null, created_by: 'dev-user', created_at: '2026-10-26T10:00:00Z', updated_at: '2026-10-26T10:00:00Z', ...over });
const filesOf = (slug, body = 'x') => ({ [`anime/series/${slug}/aaaa.webp`]: `${body}-1`, [`anime/series/${slug}/aaaa-2x.webp`]: `${body}-2` });

test('a dry run prints the plan and writes nothing', async () => {
  const src = project('devref', [row('death-note'), row('one-piece')], { ...filesOf('death-note'), ...filesOf('one-piece') });
  const tgt = project('prodref');
  const plan = await buildPlan(src, tgt);
  assert.deepEqual(plan.rows.map((r) => r.action), ['insert', 'insert']);
  assert.deepEqual(plan.files.map((f) => f.action), ['copy', 'copy', 'copy', 'copy']);
  const lines = describePlan(plan, { apply: false, sourceRef: 'devref', targetRef: 'prodref' });
  assert.match(lines[0], /^DRY RUN promote entity-images: devref -> prodref/);
  assert.match(lines[1], /2 insert, 0 update, 0 identical, 0 only on the target/);
  assert.match(lines[2], /4 copy, 0 overwrite, 0 identical/);
  assert.deepEqual(tgt.state.writes, []);
  assert.equal(tgt.state.rows.length, 0);
});

test('main is a dry run unless --apply is given, and never writes in a dry run', async () => {
  const src = project('devref', [row('death-note')], filesOf('death-note'));
  const tgt = project('prodref');
  const env = { PROMOTE_SOURCE_URL: 'https://devref.supabase.co', PROMOTE_SOURCE_SERVICE_KEY: 'k1', PROMOTE_TARGET_URL: 'https://prodref.supabase.co', PROMOTE_TARGET_SERVICE_KEY: 'k2' };
  const adapter = async (url) => (url.includes('devref') ? src : tgt);
  const dry = await main([], env, { adapter });
  assert.match(dry.lines[0], /^DRY RUN/);
  assert.deepEqual(tgt.state.writes, []);
  assert.ok(!dry.lines.join('\n').includes('k1') && !dry.lines.join('\n').includes('k2'));
  const real = await main(['--apply'], env, { adapter });
  assert.match(real.lines[0], /^APPLY/);
  assert.equal(tgt.state.rows.length, 1);
  assert.equal(tgt.state.files.size, 2);
});

test('apply copies the files first, then the rows, and does not carry created_by', async () => {
  const src = project('devref', [row('death-note')], filesOf('death-note'));
  const tgt = project('prodref');
  await applyPlan(await buildPlan(src, tgt), src, tgt);
  assert.deepEqual(tgt.state.writes.map((w) => w[0]), ['file', 'file', 'rows']);
  assert.equal(tgt.state.rows[0].created_by, null);
  assert.equal(tgt.state.rows[0].path, 'anime/series/death-note/aaaa.webp');
  assert.equal(tgt.state.files.get(path2x('anime/series/death-note/aaaa.webp')).toString(), 'x-2');
});

test('a second run changes nothing: identical files are skipped by hash and identical rows are left alone', async () => {
  const src = project('devref', [row('death-note')], filesOf('death-note'));
  const tgt = project('prodref');
  await applyPlan(await buildPlan(src, tgt), src, tgt);
  tgt.state.writes.length = 0;
  const plan = await buildPlan(src, tgt);
  assert.deepEqual(plan.rows.map((r) => r.action), ['identical']);
  assert.deepEqual(plan.files.map((f) => f.action), ['identical', 'identical']);
  const done = await applyPlan(plan, src, tgt);
  assert.deepEqual(done, { files: 0, rows: 0 });
  assert.deepEqual(tgt.state.writes, []);
});

test('a changed focal point updates the row only; a different file under the same name is overwritten', async () => {
  const src = project('devref', [row('death-note', { focal_x: 20, focal_y: 70 })], filesOf('death-note'));
  const tgt = project('prodref', [row('death-note', { created_by: null })], filesOf('death-note'));
  let plan = await buildPlan(src, tgt);
  assert.deepEqual(plan.rows.map((r) => r.action), ['update']);
  assert.deepEqual(plan.files.map((f) => f.action), ['identical', 'identical']);
  await applyPlan(plan, src, tgt);
  assert.equal(tgt.state.rows[0].focal_x, 20);
  assert.deepEqual(tgt.state.writes.map((w) => w[0]), ['rows']);
  tgt.state.files.set('anime/series/death-note/aaaa.webp', Buffer.from('tampered'));
  plan = await buildPlan(src, tgt);
  assert.deepEqual(plan.files.map((f) => f.action), ['overwrite', 'identical']);
});

test('rows that exist only on the target are kept, never deleted', async () => {
  const src = project('devref', [row('death-note')], filesOf('death-note'));
  const tgt = project('prodref', [row('naruto')], filesOf('naruto'));
  const plan = await buildPlan(src, tgt);
  assert.equal(plan.keptRows, 1);
  await applyPlan(plan, src, tgt);
  assert.deepEqual(tgt.state.rows.map((r) => r.slug).sort(), ['death-note', 'naruto']);
});

test('refuses when source and target are the same project', async () => {
  assert.throws(() => assertDifferentProjects('https://abc.supabase.co', 'https://abc.supabase.co/'), /same project/);
  assert.throws(() => assertDifferentProjects('https://abc.supabase.co', 'https://ABC.supabase.co'), /same project/);
  assert.throws(() => assertDifferentProjects('https://abc.supabase.co', 'https://abc.supabase.in'), /same project/);
  assertDifferentProjects('https://abc.supabase.co', 'https://xyz.supabase.co');
  assert.equal(refOf('https://abc.supabase.co'), 'abc');
  const env = { PROMOTE_SOURCE_URL: 'https://abc.supabase.co', PROMOTE_SOURCE_SERVICE_KEY: 'k', PROMOTE_TARGET_URL: 'https://abc.supabase.co', PROMOTE_TARGET_SERVICE_KEY: 'k' };
  await assert.rejects(main(['--apply'], env, { adapter: async () => { throw new Error('must not connect'); } }), /same project/);
});

test('credentials come from the environment only: missing ones stop the run before any connection', async () => {
  const never = { adapter: async () => { throw new Error('must not connect'); } };
  await assert.rejects(main([], { PROMOTE_TARGET_URL: 'https://p.supabase.co', PROMOTE_TARGET_SERVICE_KEY: 'k' }, never), /source credentials missing/);
  await assert.rejects(main([], { PROMOTE_SOURCE_URL: 'https://d.supabase.co', PROMOTE_SOURCE_SERVICE_KEY: 'k' }, never), /target credentials missing/);
  await assert.rejects(main([], { NEXT_PUBLIC_SUPABASE_URL: 'https://d.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'k' }, never), /target credentials missing/);
});

test('the source defaults to the variables env.sh exports', async () => {
  const src = project('devref', [row('death-note')], filesOf('death-note'));
  const tgt = project('prodref');
  const env = { NEXT_PUBLIC_SUPABASE_URL: 'https://devref.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'k1', PROMOTE_TARGET_URL: 'https://prodref.supabase.co', PROMOTE_TARGET_SERVICE_KEY: 'k2' };
  const out = await main([], env, { adapter: async (url) => (url.includes('devref') ? src : tgt) });
  assert.match(out.lines[1], /1 insert/);
});

test('refuses a source row that points to a missing file, or to an unsafe path or slug', async () => {
  const tgt = project('prodref');
  await assert.rejects(buildPlan(project('d', [row('death-note')], {}), tgt), /not in the source bucket/);
  await assert.rejects(buildPlan(project('d', [row('death-note', { path: '../../etc/passwd.webp' })], {}), tgt), /unsafe/);
  await assert.rejects(buildPlan(project('d', [row('Death Note')], {}), tgt), /unsafe/);
  await assert.rejects(buildPlan(project('d', [row('death-note', { kind: 'group' })], {}), tgt), /unsafe/);
});

test('only rows of the anime site are promoted', async () => {
  const src = project('d', [row('death-note'), row('bts', { site_id: 'kpop' })], filesOf('death-note'));
  const plan = await buildPlan(src, project('p'));
  assert.equal(plan.rows.length, 1);
});

test('arguments', () => {
  assert.deepEqual(parseArgs([]), { apply: false });
  assert.deepEqual(parseArgs(['--dry-run']), { apply: false });
  assert.deepEqual(parseArgs(['--apply']), { apply: true });
  assert.throws(() => parseArgs(['--apply', '--dry-run']), /exclude/);
  assert.throws(() => parseArgs(['--force']), /unknown argument/);
});

test('production is never the source', async () => {
  const env = { PROMOTE_SOURCE_URL: 'https://rdkgouofytwfdpbxbzio.supabase.co', PROMOTE_SOURCE_SERVICE_KEY: 'k', PROMOTE_TARGET_URL: 'https://zzz.supabase.co', PROMOTE_TARGET_SERVICE_KEY: 'k' };
  await assert.rejects(main([], env, { adapter: async () => { throw new Error('must not connect'); } }), /never the source/);
});

// ---------------------------------------------------------------------------------------------------------------------------------
// Full run: the extra columns and the 96 px file, kpop kinds mapped by a natural key, orphans, invalid rows, site assets.
// ---------------------------------------------------------------------------------------------------------------------------------

/** A project with entities (refs), site assets and capabilities, on top of the in-memory project above. */
function full(ref, { rows = [], files = {}, refs = {}, assets = [], caps = {} } = {}) {
  const p = project(ref, rows, files);
  const st = p.state;
  st.assets = assets.map((a, i) => ({ id: i + 1, ...a }));
  st.refs = { groups: [], series: [], characters: [], idols: [], agencies: [], ...refs };
  p.capabilities = async () => ({ extraColumns: true, agencies: true, assets: true, ...caps });
  p.listRefs = async () => JSON.parse(JSON.stringify(st.refs));
  p.listAssets = async () => (caps.assets === false ? null : st.assets.map((a) => ({ ...a })));
  p.insertAssets = async (list) => { st.writes.push(['assets-insert', list.length]); for (const a of list) st.assets.push({ id: st.assets.length + 1, ...a }); };
  p.updateAssets = async (list) => { st.writes.push(['assets-update', list.length]); for (const { id, ...f } of list) { const i = st.assets.findIndex((x) => x.id === id); st.assets[i] = { ...st.assets[i], ...f }; } };
  return p;
}
const kpopRow = (kind, slug, over = {}) => ({ id: 9, site_id: 'kpop', kind, slug, path: `kpop/${kind}/${slug}/bbbb.webp`, width: 400, height: 400, focal_x: 50, focal_y: 50, source_url: 'https://commons.test/f', author: 'A', license: 'cc_by', license_note: null, license_url: 'https://cc.test/by', commons_file: 'File:A.jpg', license_verified: true, thumb_path: `kpop/${kind}/${slug}/bbbb-96.webp`, created_by: 'dev-user', created_at: '2026-10-30T10:00:00Z', updated_at: '2026-10-30T10:00:00Z', ...over });
const kfiles = (kind, slug) => ({ [`kpop/${kind}/${slug}/bbbb.webp`]: 'a', [`kpop/${kind}/${slug}/bbbb-2x.webp`]: 'b', [`kpop/${kind}/${slug}/bbbb-96.webp`]: 'c' });
// o1-dev ids: group 5 = bts, idol 7 = Jimin of bts, agency 3 = HYBE. Production ids differ.
const devRefs = {
  groups: [{ id: 5, slug: 'bts', name: 'BTS', site_id: 'kpop' }, { id: 6, slug: 'twice', name: 'TWICE', site_id: 'kpop' }],
  idols: [{ id: 7, group_id: 5, name: 'Jimin' }, { id: 8, group_id: 6, name: 'Nayeon' }],
  agencies: [{ id: 3, slug: 'hybe', name: 'HYBE' }],
};
const prodRefs = {
  groups: [{ id: 41, slug: 'bts', name: 'BTS', site_id: 'kpop' }, { id: 42, slug: 'twice', name: 'TWICE', site_id: 'kpop' }],
  idols: [{ id: 901, group_id: 41, name: 'Jimin' }, { id: 902, group_id: 42, name: 'Nayeon' }],
  agencies: [{ id: 12, slug: 'hybe', name: 'HYBE' }],
};

test('the thumbnail file and the extra columns are carried, and the row is written under the target id', async () => {
  const src = full('d', { rows: [kpopRow('idol', '7')], files: kfiles('idol', '7'), refs: devRefs });
  const tgt = full('p', { refs: prodRefs });
  const plan = await buildPlan(src, tgt);
  assert.equal(blockedCount(plan), 0);
  assert.deepEqual(plan.files.map((f) => f.path).sort(), ['kpop/idol/7/bbbb-2x.webp', 'kpop/idol/7/bbbb-96.webp', 'kpop/idol/7/bbbb.webp']);
  await applyPlan(plan, src, tgt);
  assert.deepEqual(tgt.state.writes.map((w) => w[0]), ['file', 'file', 'file', 'rows']);
  const r = tgt.state.rows[0];
  assert.equal(r.slug, '901');
  assert.equal(r.license_verified, true);
  assert.equal(r.thumb_path, 'kpop/idol/7/bbbb-96.webp');
  assert.equal(r.license_url, 'https://cc.test/by');
  assert.equal(r.commons_file, 'File:A.jpg');
  assert.equal(r.created_by, null);
  assert.equal(tgt.state.files.get('kpop/idol/7/bbbb-96.webp').toString(), 'c');
});

test('group and agency rows map by group slug and by agency name; a second run is identical', async () => {
  const src = full('d', { rows: [kpopRow('group', '5'), kpopRow('agency', '3')], files: { ...kfiles('group', '5'), ...kfiles('agency', '3') }, refs: devRefs });
  const tgt = full('p', { refs: prodRefs });
  await applyPlan(await buildPlan(src, tgt), src, tgt);
  assert.deepEqual(tgt.state.rows.map((r) => `${r.kind}:${r.slug}`).sort(), ['agency:12', 'group:41']);
  tgt.state.writes.length = 0;
  const again = await buildPlan(src, tgt);
  assert.deepEqual(again.rows.map((r) => r.action), ['identical', 'identical']);
  assert.deepEqual(await applyPlan(again, src, tgt), { files: 0, rows: 0 });
  assert.deepEqual(tgt.state.writes, []);
});

test('an entity missing in the target, or ambiguous on either side, is unmapped and never copied blind', async () => {
  const src = full('d', {
    rows: [kpopRow('idol', '7'), kpopRow('idol', '8'), kpopRow('group', '5'), kpopRow('agency', '3'), kpopRow('idol', '99')],
    files: { ...kfiles('idol', '7'), ...kfiles('idol', '8'), ...kfiles('group', '5'), ...kfiles('agency', '3'), ...kfiles('idol', '99') },
    refs: devRefs,
  });
  const tgt = full('p', { refs: {
    groups: [{ id: 41, slug: 'bts', name: 'BTS', site_id: 'kpop' }, { id: 42, slug: 'twice', name: 'TWICE', site_id: 'kpop' }],
    idols: [{ id: 901, group_id: 41, name: 'Jimin' }, { id: 903, group_id: 41, name: 'Jimin' }],
    agencies: [],
  } });
  const plan = await buildPlan(src, tgt);
  assert.deepEqual(plan.rows.map((r) => `${r.row.kind}:${r.row.slug}`), ['group:41'], 'the group maps by its slug, the others do not');
  const why = Object.fromEntries(plan.unmapped.map((u) => [`${u.kind}${u.slug}`, u.reason]));
  assert.match(why.idol7, /ambiguous: 2 idols named Jimin/);
  assert.match(why.idol8, /no idol named Nayeon/);
  assert.match(why.agency3, /no agency named HYBE/);
  assert.match(why.idol99, /orphan row in the source/);
  assert.equal(blockedCount(plan), 4);
  assert.equal(plan.files.length, 3, 'only the files of the mapped row');
  // a name that matches by case or by space only is not a match
  const loose = full('p2', { refs: { ...prodRefs, idols: [{ id: 901, group_id: 41, name: 'jimin ' }] } });
  assert.equal((await buildPlan(full('d2', { rows: [kpopRow('idol', '7')], files: kfiles('idol', '7'), refs: devRefs }), loose)).unmapped.length, 1);
});

test('a target group with the same slug on another site does not count', async () => {
  const src = full('d', { rows: [kpopRow('group', '5')], files: kfiles('group', '5'), refs: devRefs });
  const tgt = full('p', { refs: { ...prodRefs, groups: [{ id: 41, slug: 'bts', name: 'BTS', site_id: 'anime' }] } });
  const plan = await buildPlan(src, tgt);
  assert.match(plan.unmapped[0].reason, /no kpop group with the slug bts/);
});

test('apply refuses a plan with an unmapped or invalid row, unless --skip-unmapped, and then lists what it skipped', async () => {
  const bad = kpopRow('group', '6', { license: 'cc_by', author: null });
  const src = full('d', { rows: [kpopRow('group', '5'), kpopRow('idol', '99'), bad], files: { ...kfiles('group', '5'), ...kfiles('idol', '99'), ...kfiles('group', '6') }, refs: devRefs });
  const tgt = full('p', { refs: prodRefs });
  const plan = await buildPlan(src, tgt);
  assert.equal(plan.rows.length, 1);
  assert.equal(plan.invalid.length, 1);
  assert.match(plan.invalid[0].problems.join(), /need an author/);
  assert.equal(plan.unmapped.length, 1);
  await assert.rejects(applyPlan(plan, src, tgt), /unmapped, ambiguous or invalid/);
  assert.deepEqual(tgt.state.writes, [], 'nothing is written by a refused apply');
  const done = await applyPlan(plan, src, tgt, { skipUnmapped: true });
  assert.equal(done.rows, 1);
  assert.equal(done.skipped.length, 2);
  // the invalid and the unmapped rows never reached the target, nor their files
  assert.ok(![...tgt.state.files.keys()].some((k) => k.includes('/6/') || k.includes('/99/')));
  // main: refused without the flag (the plan is attached), written with it
  const env = { PROMOTE_SOURCE_URL: 'https://devref.supabase.co', PROMOTE_SOURCE_SERVICE_KEY: 'k1', PROMOTE_TARGET_URL: 'https://prodref.supabase.co', PROMOTE_TARGET_SERVICE_KEY: 'k2' };
  const t2 = full('p', { refs: prodRefs });
  const adapter = async (url) => (url.includes('devref') ? src : t2);
  await assert.rejects(main(['--apply'], env, { adapter }), (e) => /nothing was written/.test(e.message) && e.lines.some((l) => /BLOCKED/.test(l)));
  assert.deepEqual(t2.state.writes, []);
  const ok = await main(['--apply', '--skip-unmapped'], env, { adapter });
  assert.ok(ok.lines.some((l) => /skipped \(not written\) \(2\)/.test(l)));
  assert.equal(t2.state.rows.length, 1);
  const dry = await main([], env, { adapter });
  assert.ok(dry.lines.some((l) => /^BLOCKED/.test(l)));
  assert.ok(dry.lines.some((l) => /unmapped rows \(not copied\) \(1\)/.test(l)));
  assert.ok(dry.lines.some((l) => /invalid rows \(not copied\) \(1\)/.test(l)));
  assert.ok(!dry.lines.join('\n').includes('k1') && !dry.lines.join('\n').includes('k2'));
});

test('an anime row whose series or character is unknown in the target is unmapped, not an orphan row', async () => {
  const chr = row('death-note/light', { kind: 'character', path: 'anime/character/light/cccc.webp' });
  const src = full('d', { rows: [row('death-note'), row('naruto'), chr], files: { ...filesOf('death-note'), ...filesOf('naruto'), 'anime/character/light/cccc.webp': 'x', 'anime/character/light/cccc-2x.webp': 'y' } });
  const tgt = full('p', { refs: { groups: [{ id: 1, slug: 'death-note', name: 'Death Note', site_id: 'anime' }], series: [{ group_id: 1 }], characters: [] } });
  const plan = await buildPlan(src, tgt);
  assert.deepEqual(plan.rows.map((r) => r.row.slug), ['death-note']);
  const why = Object.fromEntries(plan.unmapped.map((u) => [u.slug, u.reason]));
  assert.match(why.naruto, /series naruto does not exist in the target/);
  assert.match(why['death-note/light'], /character light of death-note does not exist/);
});

test('the rows that exist only in the target are reported by name, per site and kind, and never deleted', async () => {
  const src = full('d', { rows: [kpopRow('group', '5')], files: kfiles('group', '5'), refs: devRefs });
  const tgt = full('p', { refs: prodRefs, rows: [kpopRow('idol', '902', { id: 3 }), row('naruto')], files: { ...kfiles('idol', '902'), ...filesOf('naruto') } });
  const plan = await buildPlan(src, tgt);
  assert.equal(plan.keptRows, 2);
  assert.deepEqual(plan.kept.map((k) => k.label).sort(), ['idol Nayeon (twice)', 'naruto']);
  const text = describePlan(plan, { apply: false, sourceRef: 'd', targetRef: 'p' }).join('\n');
  assert.match(text, /only on the target \(kept, never deleted\) \(2\)/);
  assert.match(text, /kpop idol idol Nayeon \(twice\)/);
  assert.match(text, /kpop group: 1 insert/);
  await applyPlan(plan, src, tgt);
  assert.equal(tgt.state.rows.length, 3);
});

test('a target built before 019 and 022 cannot take the new columns or the kpop kinds: reported, never half written', async () => {
  const animeRefs = { groups: [{ id: 1, slug: 'death-note', name: 'DN', site_id: 'anime' }, { id: 2, slug: 'one-piece', name: 'OP', site_id: 'anime' }], series: [{ group_id: 1 }, { group_id: 2 }] };
  const old = full('p', { refs: { ...prodRefs, ...animeRefs }, caps: { extraColumns: false, agencies: false, assets: false } });
  const src = full('d', { rows: [kpopRow('group', '5'), row('death-note', { license_verified: true, thumb_path: 'anime/series/death-note/aaaa-96.webp' }), row('one-piece')], files: { ...kfiles('group', '5'), ...filesOf('death-note'), 'anime/series/death-note/aaaa-96.webp': 't', ...filesOf('one-piece') }, refs: devRefs });
  const plan = await buildPlan(src, old);
  assert.equal(plan.writeExtra, false);
  assert.match(plan.unmapped[0].reason, /022 is not applied/);
  assert.match(plan.invalid[0].problems.join(), /no column/);
  assert.deepEqual(plan.rows.map((r) => r.row.slug), ['one-piece']);
  assert.ok(plan.schemaNotes.length >= 2);
  await applyPlan(plan, src, old, { skipUnmapped: true });
  assert.ok(!('thumb_path' in old.state.rows[0]) && !('license_verified' in old.state.rows[0]), 'old columns only');
});

test('site assets: carried by (key, created_at), live-version changes are reported, drafts and history are kept', async () => {
  const asset = (over = {}) => ({ key: 'banner:kpopdle', type: 'banner', page: 'kpopdle', settings: { focal_y: 40, focal_x: 10 }, path: 'hub/banner/kpopdle/h1-1920.webp', mid_path: 'hub/banner/kpopdle/h1-400m.webp', thumb_path: 'hub/banner/kpopdle/h1-96t.webp', width: 1920, height: 600, source_url: 'https://s.test/p', author: 'A', license: 'cc0', license_note: null, license_verified: true, published_at: '2026-10-30T10:00:00Z', retired_at: null, created_by: 'dev-user', created_at: '2026-10-30T09:00:00Z', updated_at: '2026-10-30T09:00:00Z', ...over });
  const files = { 'hub/banner/kpopdle/h1-1920.webp': '1', 'hub/banner/kpopdle/h1-400m.webp': '2', 'hub/banner/kpopdle/h1-96t.webp': '3' };
  const icon = asset({ key: 'icon:k-idol', type: 'icon', page: 'home', path: null, mid_path: null, thumb_path: null, width: null, height: null, source_url: null, author: null, license: null, license_verified: false, created_at: '2026-10-30T09:30:00Z' });
  const draft = asset({ path: 'hub/banner/kpopdle/h2-1920.webp', mid_path: null, thumb_path: 'hub/banner/kpopdle/h2-96t.webp', license_verified: false, published_at: null, created_at: '2026-10-31T09:00:00Z' });
  const src = full('d', { assets: [asset(), icon, draft], files: { ...files, 'hub/banner/kpopdle/h2-1920.webp': '4', 'hub/banner/kpopdle/h2-96t.webp': '5' } });
  const tgt = full('p');
  const plan = await buildPlan(src, tgt);
  assert.deepEqual(plan.assets.rows.map((r) => r.action), ['insert', 'insert', 'insert']);
  assert.equal(plan.files.length, 5);
  assert.deepEqual(plan.assets.liveChanges.map((c) => c.key).sort(), ['banner:kpopdle', 'icon:k-idol']);
  const done = await applyPlan(plan, src, tgt);
  assert.equal(done.assets, 3);
  assert.equal(tgt.state.assets.length, 3);
  assert.equal(tgt.state.assets[0].created_by, null);
  assert.deepEqual(tgt.state.writes.map((w) => w[0]).slice(-2), ['file', 'assets-insert'], 'files first, then the asset rows');
  // second run: identical (settings compared by value, not by key order), nothing written
  src.state.assets[0].settings = { focal_x: 10, focal_y: 40 };
  tgt.state.writes.length = 0;
  const again = await buildPlan(src, tgt);
  assert.deepEqual(again.assets.rows.map((r) => r.action), ['identical', 'identical', 'identical']);
  assert.deepEqual(await applyPlan(again, src, tgt), { files: 0, rows: 0 });
  assert.deepEqual(tgt.state.writes, []);
  // a retired version on the source updates the matched target row (by id), without a second copy
  src.state.assets[2].retired_at = '2026-11-01T00:00:00Z';
  const upd = await buildPlan(src, tgt);
  assert.deepEqual(upd.assets.rows.map((r) => r.action), ['identical', 'identical', 'update']);
  await applyPlan(upd, src, tgt);
  assert.equal(tgt.state.assets.length, 3);
  assert.equal(tgt.state.assets[2].retired_at, '2026-11-01T00:00:00Z');
  // a version that exists only on the target is kept and counted
  tgt.state.assets.push({ id: 10, ...asset({ key: 'banner:other', created_at: '2026-10-01T00:00:00Z', path: 'hub/banner/other/z-1920.webp' }) });
  assert.equal((await buildPlan(src, tgt)).assets.kept, 1);
});

test('site assets: a duplicate version key, a key the target has with a later live version, and a target without 022', async () => {
  const a = { key: 'banner:x', type: 'banner', page: 'x', settings: {}, path: 'hub/banner/x/a-1920.webp', mid_path: null, thumb_path: null, width: 1920, height: 600, source_url: 'https://s.test/p', author: 'A', license: 'cc0', license_note: null, license_verified: true, published_at: '2026-10-30T10:00:00Z', retired_at: null, created_at: '2026-10-30T09:00:00Z', updated_at: '2026-10-30T09:00:00Z' };
  const files = { 'hub/banner/x/a-1920.webp': '1' };
  const dup = full('d', { assets: [a, { ...a, path: 'hub/banner/x/a-1920.webp' }], files });
  const p1 = await buildPlan(dup, full('p'));
  assert.equal(p1.assets.unmapped.length, 2);
  assert.match(p1.assets.unmapped[0].reason, /share one created_at/);
  const live = full('p', { assets: [{ ...a, path: 'hub/banner/x/zz-1920.webp', created_at: '2026-10-29T09:00:00Z', published_at: '2026-10-29T10:00:00Z' }] });
  const p2 = await buildPlan(full('d', { assets: [a], files }), live);
  assert.equal(p2.assets.liveChanges[0].from, 'hub/banner/x/zz-1920.webp');
  assert.equal(p2.assets.liveChanges[0].to, 'hub/banner/x/a-1920.webp');
  const p3 = await buildPlan(full('d', { assets: [a], files }), full('p', { caps: { assets: false } }));
  assert.equal(p3.assets.unmapped.length, 1);
  assert.match(p3.assets.unmapped[0].reason, /022 is not applied/);
  await assert.rejects(buildPlan(full('d', { assets: [{ ...a, path: '../x.webp' }], files }), full('p')), /unsafe path/);
});

test('the SQL check rules, client side', () => {
  const ok = kpopRow('idol', '7');
  assert.deepEqual(entityProblems(ok, 'idol'), []);
  const bad = (over, kind = 'idol') => entityProblems(kpopRow(kind, '7', over), kind).join('|');
  assert.match(bad({ width: 0 }), /width/);
  assert.match(bad({ focal_x: 120 }), /focal_x/);
  assert.match(bad({ license: 'mit' }), /license is not/);
  assert.match(bad({ license: 'other', license_note: null }), /needs a license_note/);
  assert.match(bad({ license_verified: true, thumb_path: null }), /96 px/);
  assert.match(bad({ source_url: 'http://x.test/p' }), /must be https/);
  assert.equal(entityProblems(row('death-note', { source_url: 'http://x.test/p' }), 'series').length, 0);
  assert.match(bad({ license_url: 'http://x.test' }), /license_url/);
  assert.match(bad({ commons_file: 'A.jpg' }), /commons_file/);
  assert.match(bad({ author: ' ' }), /author/);
  assert.match(entityProblems(row('death-note/light'), 'series').join(), /no \//);
  assert.match(entityProblems(row('death-note', { kind: 'character' }), 'character').join(), /<series>/);
  assert.match(assetProblems({ key: 'k', type: 'sticker', page: 'p', settings: {}, path: 'a.webp', width: 1, height: 1, author: 'A', license: 'cc0', source_url: 'https://x.test', license_verified: true }).join(), /icon or a sticker/);
  assert.match(assetProblems({ key: 'k', type: 'banner', page: 'p', settings: {}, path: 'a.webp', width: 1, height: 1, author: 'A', license: 'cc0', source_url: 'https://x.test', license_verified: false, published_at: '2026-01-01' }).join(), /needs license_verified/);
  assert.match(assetProblems({ key: 'k', type: 'banner', page: 'p', settings: {}, path: null }).join(), /only an icon/);
});

test('arguments: --skip-unmapped', () => {
  assert.deepEqual(parseArgs(['--apply', '--skip-unmapped']), { apply: true, skipUnmapped: true });
  assert.deepEqual(parseArgs(['--skip-unmapped']), { apply: false, skipUnmapped: true });
});

test('a kpop row of kind series, or a row of another site, is not carried by this script', async () => {
  const src = full('d', { rows: [row('death-note'), row('bts', { site_id: 'kpop' }), row('x', { site_id: 'hub' })], files: filesOf('death-note') });
  const plan = await buildPlan(src, full('p', { refs: { groups: [{ id: 1, slug: 'death-note', name: 'DN', site_id: 'anime' }], series: [{ group_id: 1 }] } }));
  assert.equal(plan.rows.length, 1);
  assert.equal(plan.ignored, 2);
});

test('a target row whose source row is invalid is not reported as only on the target', async () => {
  const refs = { groups: [{ id: 1, slug: 'death-note', name: 'DN', site_id: 'anime' }], series: [{ group_id: 1 }] };
  const src = full('d', { rows: [row('death-note', { license: 'cc_by', author: null })], files: filesOf('death-note') });
  const tgt = full('p', { refs, rows: [row('death-note')], files: filesOf('death-note') });
  const plan = await buildPlan(src, tgt);
  assert.equal(plan.invalid.length, 1);
  assert.equal(plan.keptRows, 0);
});
