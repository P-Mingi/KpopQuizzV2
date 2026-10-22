#!/usr/bin/env node
// Owner test tool 2, the helper behind scripts/o1-tools/signin-link.sh. Not meant to be run by hand.
//   mint  --who <key|email> --site kpop|anime|hub --origin <site url> --port <helper port> --fixtures <json> --kpq <dir>
//         (run under scripts/o1/env.sh dev: it holds the service role key for the length of the command only)
//   serve --port <helper port> --state <file>     the small local server that consumes a link (started by mint, detached)
//   stop  --state <file>
//   vercel --who <key|email> --site kpop|anime|hub --fixtures <json>     (under env.sh dev) prints the --vercel link, no local server
//
// How a link works. mint asks Supabase's admin API (generateLink, type magiclink, no email sent) for a one-time token of
// the fixture account and hands the token to the local server, which keeps it in memory only. The printed link is
//   http://<site>.localhost:<helper port>/s/<random id>
// It carries no Supabase token. Opening it, the server (once, within 10 minutes, on the host <site>.localhost) verifies
// the token with @supabase/ssr (verifyOtp, the way the apps' own routes do), writes the session cookies exactly as
// @supabase/ssr writes them and redirects to the site (<site>.localhost:<site port>). Cookies ignore ports, so the site
// receives them. The server never holds the service role key and stops by itself a minute after its last link is gone.
import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import http from 'node:http';
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROD_REF = 'rdkgouofytwfdpbxbzio';
const TTL_MS = 10 * 60 * 1000;
const SITES = ['kpop', 'anime', 'hub'];

const argv = process.argv.slice(2);
const cmd = argv.shift();
const opt = {};
for (let i = 0; i < argv.length; i += 2) opt[argv[i].replace(/^--/, '')] = argv[i + 1];

function fail(msg, code = 1) { process.stderr.write(`signin-link: ${msg}\n`); process.exit(code); }

async function lib(name) {
  const req = createRequire(path.resolve(HERE, '../../apps/quiz/package.json'));
  const ns = await import(pathToFileURL(req.resolve(name)).href);
  return ns.default && ns.createClient === undefined && ns.createServerClient === undefined ? ns.default : ns;
}

function readState(file) {
  try {
    const o = {};
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) { const m = line.match(/^([A-Z]+)=(.*)$/); if (m) o[m[1]] = m[2]; }
    return o.PID && o.PORT && o.SECRET ? o : null;
  } catch { return null; }
}
function isHelper(pid) {
  try { process.kill(Number(pid), 0); } catch { return false; }
  return /signin-helper/.test(spawnSync('ps', ['-p', String(pid), '-o', 'command='], { encoding: 'utf8' }).stdout || '');
}

function request(port, method, urlPath, headers, body) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path: urlPath, method, headers, timeout: 4000 }, (res) => {
      let data = ''; res.on('data', (c) => { data += c; }); res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject); req.on('timeout', () => req.destroy(new Error('timeout')));
    if (body) req.write(body);
    req.end();
  });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The shared part of mint and vercel: only o1-dev, only a confirmed fixture account, a one-time token from the admin API.
async function adminToken() {
  const env = process.env;
  // Only o1-dev: the same checks as scripts/o1/env.sh and dev-up.sh, again, because this command holds the service role.
  const ref = env.O1_BRANCH_REF || '';
  const url = (env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
  if (env.O1_ENV !== 'dev' || env.O1_BRANCH !== 'o1-dev' || !ref || ref === PROD_REF || url !== `https://${ref}.supabase.co`
      || [url, ref, env.O1_DB_URL || ''].some((v) => v.includes(PROD_REF))) fail('refused, the environment is not o1-dev', 5);
  const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY; const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!ANON || !SERVICE) fail('the o1-dev settings are incomplete', 5);

  let fx;
  try { fx = JSON.parse(fs.readFileSync(opt.fixtures, 'utf8')); } catch { fail('cannot read docs/o1/fixtures-dev.json', 4); }
  if (fx.branch !== 'o1-dev') fail('docs/o1/fixtures-dev.json is not the o1-dev list', 5);
  const who = String(opt.who || '').trim().toLowerCase();
  const user = (fx.users || []).find((u) => String(u.key).toLowerCase() === who || String(u.email).toLowerCase() === who);
  if (!user) fail('refused: not a fixture account of docs/o1/fixtures-dev.json (use a key such as kpop_only, dual, anime_new, or a fixture email)', 4);
  if (user.confirmed === false) fail(`refused: ${user.key} is an unconfirmed-email fixture; a sign-in link would confirm its email and break the fixture`, 4);

  const { createClient } = await lib('@supabase/supabase-js');
  const admin = createClient(url, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
  // Look the account up first: generateLink would create an account for an unknown email.
  const found = await admin.auth.admin.getUserById(user.id);
  if (found.error || !found.data?.user || String(found.data.user.email || '').toLowerCase() !== String(user.email).toLowerCase()) {
    fail(`refused: ${user.key} is not on this database (run the fixtures script)`, 4);
  }
  const link = await admin.auth.admin.generateLink({ type: 'magiclink', email: user.email });
  const tokenHash = link.data?.properties?.hashed_token;
  if (link.error || !tokenHash || link.data?.user?.id !== user.id) fail('could not make a sign-in link for that account', 3);
  return { url, ANON, user, tokenHash };
}

// ------------------------------------------------------------------------------------------------------------------
if (cmd === 'stop') {
  const st = readState(opt.state);
  if (st && isHelper(st.PID)) { try { process.kill(Number(st.PID), 'SIGTERM'); } catch { /* gone */ } }
  try { fs.rmSync(opt.state, { force: true }); } catch { /* none */ }
  process.stdout.write('signin helper stopped\n');
  process.exit(0);
}

// ------------------------------------------------------------------------------------------------------------------
if (cmd === 'serve') {
  const port = Number(opt.port); const stateFile = opt.state;
  const { createServerClient } = await lib('@supabase/ssr');
  const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL; const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!URL_ || !ANON) fail('serve: the Supabase settings are missing', 5);
  const secret = crypto.randomBytes(24).toString('hex');
  const links = new Map(); // id -> { tokenHash, site, origin, userId, username, expires }
  let last = Date.now();
  const log = (m) => process.stdout.write(`${new Date().toISOString()} ${m}\n`);

  const cookieHeader = (name, value, o = {}) => {
    const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${o.path || '/'}`];
    if (!value) parts.push('Max-Age=0'); else if (typeof o.maxAge === 'number') parts.push(`Max-Age=${Math.floor(o.maxAge)}`);
    const ss = String(o.sameSite || 'lax').toLowerCase(); parts.push(`SameSite=${ss[0].toUpperCase()}${ss.slice(1)}`);
    if (o.httpOnly) parts.push('HttpOnly');
    if (o.secure) parts.push('Secure');
    return parts.join('; ');
  };
  const send = (res, status, text, extra = {}) => {
    res.writeHead(status, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store', 'referrer-policy': 'no-referrer', ...extra });
    res.end(text + '\n');
  };

  const server = http.createServer(async (req, res) => {
    last = Date.now();
    try {
      const host = String(req.headers.host || '').split(':')[0].toLowerCase();
      const u = new URL(req.url || '/', 'http://x');
      if (req.method === 'GET' && u.pathname === '/_ping') return send(res, 200, 'ok');
      if (req.method === 'POST' && u.pathname === '/_mint') {
        const given = String(req.headers['x-o1-secret'] || '');
        const ok = given.length === secret.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(secret));
        if (!ok || req.headers.origin) return send(res, 403, 'forbidden');
        let raw = ''; for await (const c of req) { raw += c; if (raw.length > 8192) return send(res, 413, 'too large'); }
        const b = JSON.parse(raw);
        if (!SITES.includes(b.site) || !b.tokenHash || !b.origin || !b.userId) return send(res, 400, 'bad request');
        const id = crypto.randomBytes(24).toString('hex');
        links.set(id, { tokenHash: b.tokenHash, site: b.site, origin: String(b.origin).replace(/\/+$/, ''), userId: b.userId, username: b.username || '', expires: Date.now() + Math.min(TTL_MS, Math.max(5000, Number(b.ttlMs) || TTL_MS)) });
        return send(res, 200, JSON.stringify({ id }));
      }
      const m = req.method === 'GET' && u.pathname.match(/^\/s\/([0-9a-f]{48})$/);
      if (!m) return send(res, 404, 'not found');
      const rec = links.get(m[1]);
      if (!rec || rec.expires < Date.now()) { links.delete(m[1]); return send(res, 410, 'This sign-in link was already used or has expired. Run signin-link.sh again.'); }
      if (host !== `${rec.site}.localhost`) return send(res, 404, 'not found'); // the cookie would land on another host: keep the link for the right one
      links.delete(m[1]); // one time: gone before anything else happens
      const jar = new Map();
      const ssr = createServerClient(URL_, ANON, {
        cookies: {
          getAll: () => [...jar].map(([name, c]) => ({ name, value: c.value })),
          setAll: (list) => { for (const c of list) jar.set(c.name, { value: c.value, options: c.options || {} }); },
        },
      });
      const out = await ssr.auth.verifyOtp({ type: 'email', token_hash: rec.tokenHash });
      if (out.error || out.data?.user?.id !== rec.userId || jar.size === 0) {
        log(`link for ${rec.site}/${rec.username}: sign-in failed (${out.error?.message || 'no session'})`);
        return send(res, 502, 'Sign-in failed. Run signin-link.sh again.');
      }
      log(`link for ${rec.site}/${rec.username}: consumed`);
      const cookies = [...jar].map(([name, c]) => cookieHeader(name, c.value, c.options));
      res.writeHead(302, { location: `${rec.origin}/`, 'set-cookie': cookies, 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' });
      res.end();
    } catch (e) {
      log(`error ${String(e?.message || e).slice(0, 120)}`);
      send(res, 500, 'error');
    }
  });
  server.on('error', (e) => { if (e.code === 'EADDRINUSE') process.exit(0); log(`server error ${e.code}`); process.exit(1); });
  const cleanup = () => { try { const st = readState(stateFile); if (st && st.PID === String(process.pid)) fs.rmSync(stateFile, { force: true }); } catch { /* none */ } };
  process.on('SIGTERM', () => { cleanup(); process.exit(0); });
  process.on('SIGINT', () => { cleanup(); process.exit(0); });
  server.listen(port, '127.0.0.1', () => {
    fs.writeFileSync(stateFile, `PID=${process.pid}\nPORT=${port}\nSECRET=${secret}\n`, { mode: 0o600 });
    fs.chmodSync(stateFile, 0o600);
    log(`listening on 127.0.0.1:${port}`);
  });
  setInterval(() => {
    const now = Date.now();
    for (const [id, r] of links) if (r.expires < now) { links.delete(id); last = now; } // the minute of grace starts when the last link is gone
    if (links.size === 0 && now - last > 60_000) { log('idle, stopping'); cleanup(); process.exit(0); }
  }, 5000);
} else if (cmd === 'mint') {
  // ----------------------------------------------------------------------------------------------------------------
  const site = opt.site;
  if (!SITES.includes(site)) fail(`site must be one of ${SITES.join(', ')}`, 2);
  const { url, ANON, user, tokenHash } = await adminToken();
  const env = process.env;

  // The local server: running already, or started now (detached, without the service role).
  const stateFile = path.join(opt.kpq, 'logs', 'dev-up', 'signin.state');
  fs.mkdirSync(path.dirname(stateFile), { recursive: true });
  const port = Number(opt.port);
  let st = readState(stateFile);
  const ping = async (p) => { try { return (await request(p, 'GET', '/_ping', {})).status === 200; } catch { return false; } };
  if (st && !(isHelper(st.PID) && await ping(Number(st.PORT)))) { fs.rmSync(stateFile, { force: true }); st = null; }
  if (st && Number(st.PORT) !== port) fail(`the sign-in helper already runs on port ${st.PORT}; run signin-link.sh --stop first`, 3);
  if (!st) {
    const logFd = fs.openSync(path.join(opt.kpq, 'logs', 'dev-up', 'signin.log'), 'a');
    const childEnv = { PATH: env.PATH, HOME: env.HOME, NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_ANON_KEY: ANON };
    const child = spawn(process.execPath, [fileURLToPath(import.meta.url), 'serve', '--port', String(port), '--state', stateFile],
      { detached: true, stdio: ['ignore', logFd, logFd], env: childEnv });
    child.unref();
    for (let i = 0; i < 60 && !st; i++) { await sleep(250); const s = readState(stateFile); if (s && await ping(Number(s.PORT))) st = s; }
    if (!st) fail(`the sign-in helper did not start on port ${port} (is it busy? log ${path.join(opt.kpq, 'logs', 'dev-up', 'signin.log')})`, 3);
  }
  // O1_SIGNIN_TTL_S shortens the life of a link (5 to 600 s) for tests; it can never lengthen it.
  const body = JSON.stringify({ tokenHash, site, origin: opt.origin, userId: user.id, username: user.username, ttlMs: Number(env.O1_SIGNIN_TTL_S) * 1000 || undefined });
  const r = await request(Number(st.PORT), 'POST', '/_mint', { 'x-o1-secret': st.SECRET, 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) }, body);
  let id; try { id = JSON.parse(r.body).id; } catch { /* below */ }
  if (r.status !== 200 || !id) fail('the sign-in helper refused the link', 3);
  process.stdout.write(`http://${site}.localhost:${st.PORT}/s/${id}\n`);
  process.exit(0);
} else if (cmd === 'vercel') {
  // ----------------------------------------------------------------------------------------------------------------
  // No local server: the link is the Supabase token itself, for /auth/confirm of the Vercel test address (signin-urls.mjs).
  const site = opt.site;
  if (!SITES.includes(site)) fail(`site must be one of ${SITES.join(', ')}`, 2);
  const { tokenHash } = await adminToken();
  const { vercelLink } = await import('./signin-urls.mjs');
  process.stdout.write(`${vercelLink(site, tokenHash)}\n`);
  process.exit(0);
} else {
  fail('usage: signin-helper.mjs mint|serve|stop|vercel (see signin-link.sh)', 2);
}
