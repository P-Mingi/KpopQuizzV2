// Run O1, lane Q0a: tests of the recorded sides (node --test scripts/o1/parity/).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { NOT_RECORDED, RECORD_UA, record, replayServer } from './replay.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

const listen = (srv) => new Promise((r) => srv.listen(0, '127.0.0.1', () => r(`http://127.0.0.1:${srv.address().port}`)));
const get = async (base, p) => {
  const r = await fetch(base + p, { redirect: 'manual' });
  return { status: r.status, location: r.headers.get('location'), type: r.headers.get('content-type'), body: await r.text() };
};

test('record then replay: pages, redirects and the stylesheets they link answer as the origin did', async () => {
  const pages = {
    '/': [200, { 'content-type': 'text/html; charset=utf-8' }, '<link rel="stylesheet" href="/_next/static/chunks/a.css"/><link rel="stylesheet" href="https://fonts.example/x.css"/><p>Café \u{1F3B5}</p>'],
    '/q/x': [500, { 'content-type': 'text/html' }, '<link rel="stylesheet" href="/_next/static/chunks/a.css"/><link rel="stylesheet" href="/api/ux-v1/a0/styles?v=1"/>'],
    '/daily': [307, { location: '/daily/2026-10-18' }, ''],
    '/_next/static/chunks/a.css': [200, { 'content-type': 'text/css' }, '.a{color:red}'],
    '/api/ux-v1/a0/styles?v=1': [200, { 'content-type': 'text/css' }, '.ux{color:#fff}'],
  };
  const hits = [];
  const agents = new Set();
  const origin = http.createServer((req, res) => {
    hits.push(req.url);
    agents.add(req.headers['user-agent']);
    const p = pages[req.url];
    if (!p) { res.writeHead(404); res.end('no'); return; }
    res.writeHead(p[0], p[1]); res.end(p[2]);
  });
  const o = await listen(origin);
  const rec = await record(o, ['/', '/q/x', '/daily']);
  origin.close();
  // each stylesheet once, the external one never
  assert.deepEqual(hits, ['/', '/q/x', '/daily', '/_next/static/chunks/a.css', '/api/ux-v1/a0/styles?v=1']);
  // every read with the one header both sides are recorded with (D52)
  assert.deepEqual([...agents], [RECORD_UA]);
  const replay = replayServer(JSON.parse(JSON.stringify(rec)));
  const r = await listen(replay);
  try {
    for (const p of Object.keys(pages)) {
      const x = await get(r, p);
      assert.equal(x.status, pages[p][0], p);
      assert.equal(x.body, pages[p][2], p);
      assert.equal(x.location, pages[p][1].location ?? null, p);
      if (pages[p][1]['content-type']) assert.equal(x.type, pages[p][1]['content-type'], p);
    }
    // anything else is a visible 404, never a guess
    const miss = await get(r, '/about');
    assert.equal(miss.status, 404);
    assert.match(miss.body, new RegExp(NOT_RECORDED));
    const post = await fetch(`${r}/`, { method: 'POST', body: 'x' });
    assert.equal(post.status, 404);
  } finally { replay.close(); }
});

test('the record header gets blocking metadata from the installed Next, as an HTML-limited crawler does (D52)', () => {
  // The Next of apps/quiz, the one parity builds and serves with.
  const req = createRequire(path.join(REPO, 'apps/quiz/package.json'));
  const { shouldServeStreamingMetadata } = req('next/dist/server/lib/streaming-metadata.js');
  const { getBotType } = req('next/dist/shared/lib/router/utils/is-bot.js');
  // Metadata in the head, never in a streamed Suspense boundary, for a page rendered at request time.
  assert.equal(shouldServeStreamingMetadata(RECORD_UA, undefined), false);
  // An HTML-limited bot, not the DOM bot (Googlebot), which Next would treat otherwise once PPR is on.
  assert.equal(getBotType(RECORD_UA), 'html');
  // The headers parity read with before D52 stream it: the race of request 23.
  for (const ua of ['ux11-flag-off-diff', 'o1-parity-record', 'o1-parity-compare']) assert.equal(shouldServeStreamingMetadata(ua, undefined), true, ua);
  // The app sets no list of its own (next.config.ts htmlLimitedBots would replace Next's); if one appears, this
  // header must be checked against it.
  // Nor partial prerendering: with it on, Next renders every bot request in full instead of serving the prerendered
  // page, and parity would no longer read what a browser is served for those pages.
  const config = fs.readFileSync(path.join(REPO, 'apps/quiz/next.config.ts'), 'utf8');
  assert.doesNotMatch(config, /htmlLimitedBots/);
  assert.doesNotMatch(config, /cacheComponents|\bppr\b/);
});
