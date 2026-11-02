// Run O1, lot P2 (CR-024): a local stand-in for the Supabase of the hub, so the pages /otakudle, /otakudle/one-piece and /otakudle/dragon-ball can be looked at with real data.
// PGlite (Postgres in WebAssembly) holds the real files 011, 018, 019, 023, 024 and the launch files L04, L13 and L15 (the characters and their facts as they will be on launch day);
// a small HTTP server answers the calls of supabase-js the pages make: POST /rest/v1/rpc/{dle_day,dle_pool,dle_guess,dle_give_up} as the anon role, GET /rest/v1/groups, and an empty list for
// the picture views. Nothing leaves the machine and no remote database is touched. For the preview only, the two series games are switched on with a smaller minimum pool (10, the launch
// value is 40 and 30: L14 refuses to open a game under it, and the facts of L15 hold 13 Dragon Ball targets until L04 is regenerated) and Otakudle with its own. GET /__target?game=... gives the answer of the day to the capture script and exists only here.
//   cd apps/quiz && npx tsx e2e/o1/P2/serve-preview.run.ts [port]      (default port 54399)
import { createServer } from 'node:http';

import { rpcAs, seedFixtureIdols } from '../../../src/lib/dle/game-fixture';
import { afterJ4, afterSessionG, applyLaunchFiles } from '../../../src/lib/dle/otakudle-fixture';
import { MIGRATIONS, readMigration } from '../../../src/lib/dle/pglite-harness';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { Fixtures } from '../P5/rest-fixtures';

const PORT = Number(process.argv[2] ?? 54399);
const EPOCH = new Date(Date.now() - 3 * 86_400_000).toISOString().slice(0, 10);

const db = await afterSessionG();
await db.exec(readMigration('024-dle-series-games.sql'));
await afterJ4(db);
await db.exec(readMigration('024-dle-series-games.sql'));
await applyLaunchFiles(db);
await db.exec(readFileSync(path.join(MIGRATIONS, 'launch', 'L15-A2-series-games.sql'), 'utf8'));
await db.exec(`update public.dle_games set min_pool = 10 where id in ('otakudle', 'otakudle-one-piece', 'otakudle-dragon-ball')`);
// P5 (CR-025): Kpopdle Idol is on too, for the pages that link to it (its result, the kpopquiz.org home, the group pages, the end of a K-pop quiz).
await seedFixtureIdols(db);
await db.exec(`update public.dle_games set min_pool = 2, no_repeat_days = 5 where id = 'kpopdle-idol'`);
for (const g of ['kpopdle-idol', 'otakudle', 'otakudle-one-piece', 'otakudle-dragon-ball']) await db.query(`select public.dle_activate($1, $2::date, 0.5)`, [g, EPOCH]);
await db.exec('grant select on public.groups to anon, authenticated');
// P5 (CR-025): the rows of the K-pop and anime pages (groups, quizzes, songs, series) for the screenshots of kpopquiz.org and OtakuQuiz, from e2e/o1/P5/rest-fixtures.ts.
const poolOf = (await rpcAs(db, 'dle_pool', { p_game: 'kpopdle-idol' })).data as { entities: { name: string; attrs: Record<string, { v?: unknown; p?: string[] }> }[] };
const animeNames = (await db.query<{ name: string }>(`select name from public.groups where site_id = 'anime' order by slug`)).rows.map((r) => r.name);
const fixtures = new Fixtures(poolOf.entities, animeNames);
console.log('preview database ready; epoch', EPOCH, '; K-pop groups', fixtures.kpopGroups.length, '; anime series', animeNames.join(', '));

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'apikey, authorization, content-type, x-client-info, prefer, range, accept-profile, content-profile, x-supabase-api-version',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-expose-headers': 'content-range',
};

createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  const send = (status: number, body: unknown, extra: Record<string, string> = {}): void => {
    res.writeHead(status, { 'content-type': 'application/json', ...CORS, ...extra });
    res.end(JSON.stringify(body));
  };
  if (process.env.P5_LOG_REQUESTS) console.log(req.method, req.url);
  if (req.method === 'OPTIONS') { res.writeHead(204, CORS); res.end(); return; }
  let raw = '';
  req.on('data', (c) => { raw += c; });
  req.on('end', async () => {
    try {
      if (url.pathname.startsWith('/rest/v1/rpc/') && req.method === 'POST') {
        const fn = url.pathname.slice('/rest/v1/rpc/'.length);
        if (!['dle_day', 'dle_pool', 'dle_guess', 'dle_give_up'].includes(fn)) return send(404, { message: `no function ${fn}` });
        const r = await rpcAs(db, fn, raw ? (JSON.parse(raw) as Record<string, unknown>) : {});
        return r.error ? send(400, { message: r.error.message, code: 'P0001', details: null, hint: null }) : send(200, r.data);
      }
      if (url.pathname === '/__seen') return send(200, Object.fromEntries(fixtures.seen));
      if (url.pathname.startsWith('/rest/v1/') && !url.pathname.startsWith('/rest/v1/rpc/')) {
        const rows = fixtures.rows(url.pathname.slice('/rest/v1/'.length), url.searchParams);
        if (rows) {
          const range = /^(\d+)-(\d+)$/.exec(String(req.headers.range ?? ''));
          const page = range ? rows.slice(Number(range[1]), Number(range[2]) + 1) : rows;
          const cr = { 'content-range': `${page.length ? `${range ? range[1] : 0}-${(range ? Number(range[1]) : 0) + page.length - 1}` : '*'}/${rows.length}` };
          if (/pgrst\.object/.test(String(req.headers.accept ?? ''))) {
            return page.length === 1 ? send(200, page[0], cr) : send(406, { code: 'PGRST116', details: `The result contains ${page.length} rows`, hint: null, message: 'JSON object requested, multiple (or no) rows returned' }, cr);
          }
          return req.method === 'HEAD' ? (res.writeHead(200, { ...CORS, ...cr }), res.end()) : send(200, page, cr);
        }
      }
      if (url.pathname === '/__target') {
        const game = url.searchParams.get('game') ?? '';
        const { rows } = await db.query<{ id: string; name: string }>(
          `select e.entity_id as id, e.name from public.dle_entities e where e.game_id = $1 and e.entity_id = public.dle_target($1, (now() at time zone 'utc')::date)`, [game]);
        return send(200, rows[0] ?? null);
      }
      if (url.pathname.startsWith('/rest/v1/')) return send(200, [], { 'content-range': '*/0' });
      return send(404, { message: 'not found' });
    } catch (e) {
      return send(500, { message: (e as Error).message });
    }
  });
}).listen(PORT, '127.0.0.1', () => console.log(`preview supabase on http://127.0.0.1:${PORT}`));
