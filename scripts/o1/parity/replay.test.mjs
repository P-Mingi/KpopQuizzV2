// Run O1, lane Q0a: tests of the recorded base side (node --test scripts/o1/parity/).
import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';

import { NOT_RECORDED, record, replayServer } from './replay.mjs';

const listen = (srv) => new Promise((r) => srv.listen(0, '127.0.0.1', () => r(`http://127.0.0.1:${srv.address().port}`)));
const get = async (base, p) => {
  const r = await fetch(base + p, { redirect: 'manual' });
  return { status: r.status, location: r.headers.get('location'), type: r.headers.get('content-type'), body: await r.text() };
};

test('record then replay: pages, redirects and the stylesheets they link answer as the origin did', async () => {
  const pages = {
    '/': [200, { 'content-type': 'text/html; charset=utf-8' }, '<link rel="stylesheet" href="/_next/static/chunks/a.css"/><link rel="stylesheet" href="https://fonts.example/x.css"/><p>Café 🎵</p>'],
    '/q/x': [500, { 'content-type': 'text/html' }, '<link rel="stylesheet" href="/_next/static/chunks/a.css"/><link rel="stylesheet" href="/api/ux-v1/a0/styles?v=1"/>'],
    '/daily': [307, { location: '/daily/2026-10-18' }, ''],
    '/_next/static/chunks/a.css': [200, { 'content-type': 'text/css' }, '.a{color:red}'],
    '/api/ux-v1/a0/styles?v=1': [200, { 'content-type': 'text/css' }, '.ux{color:#fff}'],
  };
  const hits = [];
  const origin = http.createServer((req, res) => {
    hits.push(req.url);
    const p = pages[req.url];
    if (!p) { res.writeHead(404); res.end('no'); return; }
    res.writeHead(p[0], p[1]); res.end(p[2]);
  });
  const o = await listen(origin);
  const rec = await record(o, ['/', '/q/x', '/daily']);
  origin.close();
  // each stylesheet once, the external one never
  assert.deepEqual(hits, ['/', '/q/x', '/daily', '/_next/static/chunks/a.css', '/api/ux-v1/a0/styles?v=1']);
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
