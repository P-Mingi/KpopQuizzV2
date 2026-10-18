#!/usr/bin/env node
// Run O1, lane Q0a: the recorded sides of a parity run (scripts/o1/parity.sh, report D50 and D52).
// Both sides are built and served at one path (o1-parity-build), so the base server and the head server cannot run at
// the same time. The base server runs first and this script records, with GET and no redirect follow, everything the
// comparison will ask of a side: every URL of the list, and every same-origin stylesheet those pages link. Then the
// base server stops, the head build takes the path and is recorded the same way, and two record servers answer as
// side A and side B. The data both servers render is the same frozen state (freeze-hook.mjs), so recording one side
// after the other does not let data drift in; what is recorded is the status, the Location header, the Content-Type
// and the body, which is all flag-off-diff.mjs and compare.mjs read. A request for anything not recorded answers 404
// with a body naming it, so it can only make a page DIFFERENT, never hide one.
// Both sides are read with one request header, RECORD_UA, which Next 16 treats as an HTML-limited crawler (D52): a page
// rendered at request time then gets its metadata blocking in the head, as Bingbot, Applebot or a link preview get
// it, instead of in a Suspense boundary streamed after the head ("Next.Metadata"), which lands before or after the
// shell flush depending on timing alone (request 23). Prerendered pages are served from the build's cache whatever
// the header. Nothing in the response is rewritten.
//   node scripts/o1/parity/replay.mjs record --from <server url> --urls <list> --out <file.json>
//   node scripts/o1/parity/replay.mjs serve --record <file.json> --port <port>
// Exit 0, 1 on a failed read while recording, 2 on a usage error.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { isLocalHref, readList, stylesheetHrefs } from './compare.mjs';

export const NOT_RECORDED = 'o1 parity replay: not recorded';
// Matched by Next's HTML_LIMITED_BOT_UA_RE ("Slurp") and not by its DOM-bot pattern (Googlebot); replay.test.mjs
// checks both against the installed Next, and that next.config.ts sets no htmlLimitedBots of its own.
export const RECORD_UA = 'o1-parity-record (html-limited crawler view, as Slurp)';

async function read(base, p) {
  const r = await fetch(base + p, { redirect: 'manual', headers: { 'user-agent': RECORD_UA } });
  return { status: r.status, location: r.headers.get('location'), contentType: r.headers.get('content-type'), body: await r.text() };
}

/** Record every page of the list, then every same-origin stylesheet they link, from one server. */
export async function record(base, pages) {
  const out = {};
  for (const p of pages) out[p] = await read(base, p);
  const sheets = [];
  for (const p of pages) for (const h of stylesheetHrefs(out[p].body)) if (isLocalHref(h) && !(h in out) && !sheets.includes(h)) sheets.push(h);
  for (const h of sheets) out[h] = await read(base, h);
  return out;
}

/** An HTTP server answering each recorded path exactly as recorded. */
export function replayServer(rec) {
  return http.createServer((req, res) => {
    const r = Object.prototype.hasOwnProperty.call(rec, req.url) ? rec[req.url] : null;
    if (!r || req.method !== 'GET') { res.writeHead(404, { 'content-type': 'text/plain' }); res.end(`${NOT_RECORDED}: ${req.method} ${req.url}\n`); return; }
    const h = {};
    if (r.location !== null) h.location = r.location;
    if (r.contentType !== null) h['content-type'] = r.contentType;
    res.writeHead(r.status, h);
    res.end(r.body);
  });
}

async function main() {
  const [mode, ...args] = process.argv.slice(2);
  const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
  if (mode === 'record' && opt('--from') && opt('--urls') && opt('--out')) {
    try {
      const rec = await record(opt('--from'), readList(fs.readFileSync(opt('--urls'), 'utf8')));
      fs.writeFileSync(opt('--out'), JSON.stringify(rec));
      process.stdout.write(`recorded ${Object.keys(rec).length} responses\n`);
      process.exit(0);
    } catch (e) { process.stderr.write(`replay: record failed: ${e.message}\n`); process.exit(1); }
  }
  if (mode === 'serve' && opt('--record') && opt('--port')) {
    const rec = JSON.parse(fs.readFileSync(opt('--record'), 'utf8'));
    replayServer(rec).listen(Number(opt('--port')), '127.0.0.1');
    return;
  }
  process.stderr.write('usage: replay.mjs record --from <url> --urls <list> --out <file> | serve --record <file> --port <port>\n');
  process.exit(2);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
