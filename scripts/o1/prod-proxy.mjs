#!/usr/bin/env node
// Run O1: read-only proxy in front of the production Supabase, for parity builds and servers (owner, 2026-10-18/19).
//   node scripts/o1/prod-proxy.mjs --port 4031 --env <file with NEXT_PUBLIC_SUPABASE_URL and the two keys> --log <jsonl>
// Builds and servers get only http://127.0.0.1:<port> and the stand-in keys o1-proxy-anon / o1-proxy-service; the proxy
// swaps them for the real keys on the way out, so neither the production URL nor a real key reaches them.
// Passes GET and HEAD, and POST /rest/v1/rpc/<name> for the 22 STABLE or IMMUTABLE functions only. Everything else
// (other POST, PATCH, PUT, DELETE, auth writes, storage uploads, realtime upgrades) gets 403 and one log line.
import http from 'node:http';
import fs from 'node:fs';

export const READ_RPC = new Set(['bt_fans_today', 'bt_runs_admin_stats', 'calc_mastery_level', 'calc_player_level',
  'check_byeol_eligibility', 'get_daily_bt_leaderboard', 'get_fandom_war_map', 'get_fandom_war_map_v12', 'get_quiz_rank',
  'get_quiz_rank_for_score', 'get_quiz_rank_for_score_v12', 'get_quiz_rank_v12', 'get_today_stats',
  'get_weekly_leaderboard', 'is_editorial', 'live_topic_open', 'name_all_round_stats', 'quiz_comment_like_counts',
  'ranked_ladder', 'ranked_player_standing', 'ranked_standings', 'verse_name_recognition']);
export const STAND_IN = { anon: 'o1-proxy-anon', service: 'o1-proxy-service' };

export function allowed(method, path) {
  if (method === 'GET' || method === 'HEAD') return true;
  const m = /^\/rest\/v1\/rpc\/([a-z0-9_]+)\/?(\?.*)?$/.exec(path);
  return method === 'POST' && !!m && READ_RPC.has(m[1]);
}

function readEnv(file) {
  const env = {};
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const i = line.indexOf('=');
    if (i > 0) env[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
  return env;
}

export function startProxy({ port = 0, upstream, anonKey, serviceKey, log }) {
  const swap = (v) => (v || '').replaceAll(STAND_IN.service, serviceKey).replaceAll(STAND_IN.anon, anonKey);
  const block = (req, res) => {
    if (log) fs.appendFileSync(log, JSON.stringify({ t: new Date().toISOString(), method: req.method, path: req.url }) + '\n');
    res.writeHead(403, { 'content-type': 'text/plain' }); res.end('o1 read-only proxy: refused\n');
  };
  const server = http.createServer(async (req, res) => {
    if (!allowed(req.method, req.url)) return block(req, res);
    const headers = {};
    for (const [k, v] of Object.entries(req.headers)) {
      if (['host', 'connection', 'content-length', 'accept-encoding'].includes(k)) continue;
      headers[k] = k === 'apikey' || k === 'authorization' ? swap(v) : v;
    }
    const chunks = []; for await (const c of req) chunks.push(c);
    try {
      const r = await fetch(upstream + req.url, { method: req.method, headers,
        body: req.method === 'POST' ? Buffer.concat(chunks) : undefined });
      const out = {}; r.headers.forEach((v, k) => { if (!['content-encoding', 'content-length', 'transfer-encoding'].includes(k)) out[k] = v; });
      res.writeHead(r.status, out); res.end(req.method === 'HEAD' ? undefined : Buffer.from(await r.arrayBuffer()));
    } catch (e) { res.writeHead(502, { 'content-type': 'text/plain' }); res.end('o1 proxy: upstream unreachable\n'); }
  });
  server.on('upgrade', (req, socket) => { block(req, { writeHead() {}, end() {} }); socket.end('HTTP/1.1 403 Forbidden\r\n\r\n'); });
  return new Promise((ok) => server.listen(port, '127.0.0.1', () => ok(server)));
}

if (process.argv[1] && process.argv[1].endsWith('prod-proxy.mjs')) {
  const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };
  const env = readEnv(arg('--env'));
  const upstream = (env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
  if (!/^https:\/\//.test(upstream) || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY || !env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('prod-proxy: the env file lacks the URL or a key'); process.exit(4);
  }
  const s = await startProxy({ port: Number(arg('--port') || 4031), upstream, log: arg('--log'),
    anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY, serviceKey: env.SUPABASE_SERVICE_ROLE_KEY });
  console.log(`prod-proxy: listening on 127.0.0.1:${s.address().port} (read only)`);
}
