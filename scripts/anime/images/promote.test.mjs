// node --test scripts/anime/images/   (in-memory projects only: no network, no credentials)
import test from 'node:test';
import assert from 'node:assert/strict';
import { assertDifferentProjects, applyPlan, buildPlan, describePlan, main, parseArgs, path2x, refOf } from './promote.mjs';

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
