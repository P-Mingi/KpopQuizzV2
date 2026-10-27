// Run O1, lane Q0a: the frozen data source and the write guard of parity.sh.
// Loaded into every Node process of a parity build and of its two servers with
//   NODE_OPTIONS="--import <this file>"  O1_FREEZE_DIR=<store>  O1_FREEZE_TARGET=<Supabase origin>
// It wraps globalThis.fetch before Next.js patches it (Next wraps this wrapper), so every server read of the app goes
// through it, and only requests to O1_FREEZE_TARGET are touched:
//   1. Write guard. A request that could write is refused with a 403 and logged in <store>/refused.log, before it
//      leaves the machine: any non-GET to /rest/v1/<table>, an RPC (/rest/v1/rpc/<fn>) whose SQL definitions are
//      not all read-only (lib rpcVerdict below), anything on /auth/v1, /storage/v1, /realtime/v1, /functions/v1,
//      /graphql/v1 that is not a GET. A GET on /rest/v1 is a read by construction (PostgREST).
//   2. Freeze. The first answer to a read (method, URL, body, Accept, Prefer, Range and a hash of the key headers)
//      is stored in <store>/<key>.json; every later identical read, in any process, is answered from the store. The
//      base build runs first and records, so the head build and both servers render the same database state, and a
//      recheck run replays it. ISO timestamps in the URL and the body are masked in the key (a "last 7 days" filter
//      computed a few minutes later reads the same rows). Concurrent first reads of one key wait for one fetch
//      (a mkdir lock per key). The store holds response bodies of anonymous and service reads: it lives in
//      KPQ/cache/parity/ (outside the repository) and is removed with its run unless --keep.
//   3. Strict (O1_FREEZE_STRICT=1, the gate's crawl of the kept parity build): a request with another method than GET
//      or HEAD to any origin that is not this machine is refused and logged too, so a page outside the write-audited
//      URL list cannot post anything anywhere (a webhook, a ping, a mail API).
//   4. Offline (O1_FREEZE_OFFLINE=1): a read that is not in the store, and any other Supabase request, is answered
//      503 locally and logged in <store>/offline.log, never sent: the kept build is served on its frozen state only,
//      with no production read at all (tests of the gate plumbing).
// No value of a header is ever written: the key holds a sha256 of the auth headers, the log holds method and path.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { rpcVerdict } from './rpc-verdict.mjs';

const DIR = process.env.O1_FREEZE_DIR;
const TARGET = (process.env.O1_FREEZE_TARGET || '').replace(/\/+$/, '');
const STRICT = process.env.O1_FREEZE_STRICT === '1';
const OFFLINE = process.env.O1_FREEZE_OFFLINE === '1';

/** This machine: loopback addresses and the *.localhost names of the three dev hosts. */
export function isLocal(url) {
  try {
    const h = new URL(url).hostname.replace(/^\[|\]$/g, '');
    return h === 'localhost' || h.endsWith('.localhost') || h === '::1' || /^127\./.test(h);
  } catch {
    return false;
  }
}

export function maskVolatile(s) {
  return s.replace(/\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?/g, '<ts>');
}
function decode(u) { try { return decodeURIComponent(u); } catch { return u; } }

/** 'allow' | 'freeze' | reason string (refused). */
export function classify(method, pathname) {
  const m = method.toUpperCase();
  if (pathname.startsWith('/rest/v1/rpc/')) {
    const fn = pathname.slice('/rest/v1/rpc/'.length).split(/[/?]/)[0];
    const v = rpcVerdict(fn);
    return v.verdict === 'reads' ? 'freeze' : `rpc ${fn} (${v.verdict}${v.why ? `: ${v.why}` : ''})`;
  }
  if (pathname.startsWith('/rest/v1/')) return m === 'GET' || m === 'HEAD' ? 'freeze' : `${m} on a table`;
  if (/^\/(auth|storage|realtime|functions|graphql)\/v1\//.test(pathname)) return m === 'GET' || m === 'HEAD' ? 'allow' : `${m} on ${pathname.split('/')[1]}`;
  return m === 'GET' || m === 'HEAD' ? 'allow' : `${m} on ${pathname}`;
}

function headerOf(input, init, name) {
  const h = init?.headers ?? (input instanceof Request ? input.headers : undefined);
  if (!h) return '';
  if (h instanceof Headers) return h.get(name) ?? '';
  if (Array.isArray(h)) return (h.find(([k]) => k.toLowerCase() === name) ?? [])[1] ?? '';
  for (const [k, v] of Object.entries(h)) if (k.toLowerCase() === name) return String(v);
  return '';
}

export function keyOf(method, url, body, input, init) {
  const u = new URL(url);
  const auth = crypto.createHash('sha256').update(`${headerOf(input, init, 'apikey')}\n${headerOf(input, init, 'authorization')}`).digest('hex').slice(0, 16);
  const parts = [
    method.toUpperCase(), maskVolatile(decode(u.pathname + u.search)), maskVolatile(typeof body === 'string' ? body : ''),
    headerOf(input, init, 'accept'), headerOf(input, init, 'prefer'), headerOf(input, init, 'range'), auth,
  ];
  return crypto.createHash('sha256').update(parts.join('\n')).digest('hex');
}

const PHASE = process.env.O1_FREEZE_PHASE || 'run';
function log(file, line) { try { fs.appendFileSync(path.join(DIR, file), `${PHASE} ${line}\n`); } catch { /* the store may be gone after a run */ } }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const KEEP_HEADERS = ['content-type', 'content-range', 'preference-applied'];

function refusedResponse() {
  return new Response(JSON.stringify({ code: 'O1RO', message: 'parity: refused, the parity run never writes', details: null, hint: null }),
    { status: 403, headers: { 'content-type': 'application/json' } });
}

function offlineResponse() {
  return new Response(JSON.stringify({ code: 'O1OFF', message: 'parity: offline replay, not in the frozen state', details: null, hint: null }),
    { status: 503, headers: { 'content-type': 'application/json' } });
}

async function stored(file) {
  const s = JSON.parse(fs.readFileSync(file, 'utf8'));
  return new Response(s.status === 204 || s.status === 304 ? null : s.body, { status: s.status, headers: s.headers });
}

export function install(orig = globalThis.fetch) {
  if (!DIR || !TARGET || globalThis.__o1FreezeInstalled) return false;
  fs.mkdirSync(DIR, { recursive: true });
  globalThis.__o1FreezeInstalled = true;
  globalThis.fetch = async function o1FreezeFetch(input, init) {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input?.url;
    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
    if (!url || !url.startsWith(TARGET + '/')) {
      if (STRICT && url && method !== 'GET' && method !== 'HEAD' && !isLocal(url)) {
        const u = new URL(url);
        log('refused.log', `${method} ${u.origin}${u.pathname} strict: not a read`);
        return refusedResponse();
      }
      return orig(input, init);
    }
    const pathname = new URL(url).pathname;
    const c = classify(method, pathname);
    if (c === 'allow') {
      if (OFFLINE) { log('offline.log', `${method} ${pathname}`); return offlineResponse(); }
      return orig(input, init);
    }
    if (c !== 'freeze') {
      log('refused.log', `${method} ${pathname} ${c}`);
      return refusedResponse();
    }
    const body = init?.body;
    if (body != null && typeof body !== 'string') {
      if (OFFLINE) { log('offline.log', `${method} ${pathname} non-string body`); return offlineResponse(); }
      log('passthrough.log', `${method} ${pathname} non-string body`);
      return orig(input, init);
    }
    const key = keyOf(method, url, body, input, init);
    const file = path.join(DIR, `${key}.json`); const lock = path.join(DIR, `${key}.lock`);
    let haveLock = false; // a lock left by a killed process is waited for 60 s, then ignored
    for (let waited = 0; waited <= 60_000 && !haveLock; waited += 50) {
      if (fs.existsSync(file)) { log('hits.log', `${method} ${pathname}`); return stored(file); }
      try { fs.mkdirSync(lock); haveLock = true; } catch { await sleep(50); }
    }
    try {
      if (fs.existsSync(file)) return stored(file);
      if (OFFLINE) { log('offline.log', `${method} ${pathname}`); return offlineResponse(); }
      let res;
      try { res = await orig(input, init); } catch (e) { log('errors.log', `${method} ${pathname} ${e?.cause?.code ?? e?.name ?? 'error'}`); throw e; }
      const text = await res.text();
      const headers = {}; for (const h of KEEP_HEADERS) { const v = res.headers.get(h); if (v != null) headers[h] = v; }
      if (res.status < 500) { // a server error is not frozen: the next reader tries again
        const tmp = `${file}.${process.pid}.tmp`;
        fs.writeFileSync(tmp, JSON.stringify({ status: res.status, headers, body: text, path: pathname }));
        fs.renameSync(tmp, file);
      }
      log('misses.log', `${method} ${pathname} ${res.status}`);
      return new Response(res.status === 204 || res.status === 304 ? null : text, { status: res.status, headers });
    } finally {
      if (haveLock) { try { fs.rmdirSync(lock); } catch { /* already gone */ } }
    }
  };
  return true;
}

install();
