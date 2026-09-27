#!/usr/bin/env node
// C3: a tiny local reverse proxy that gzips text responses the upstream sent uncompressed
// (the v11 stylesheet route under `next start`), as Vercel's edge does. Node built-ins only.
//   node gzip-proxy.mjs --port 4213 --upstream http://localhost:3021
import http from 'node:http';
import zlib from 'node:zlib';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const PORT = Number(opt('--port', '4213'));
const UP = new URL(opt('--upstream', 'http://localhost:3021'));

http.createServer((req, res) => {
  const up = http.request({ host: UP.hostname, port: UP.port, path: req.url, method: req.method, headers: { ...req.headers, host: UP.host } }, (r) => {
    const type = String(r.headers['content-type'] ?? '');
    const wantsGzip = /gzip/.test(String(req.headers['accept-encoding'] ?? ''));
    if (!r.headers['content-encoding'] && wantsGzip && /text\/|javascript|json|svg/.test(type)) {
      const h = { ...r.headers, 'content-encoding': 'gzip' };
      delete h['content-length'];
      res.writeHead(r.statusCode ?? 200, h);
      r.pipe(zlib.createGzip()).pipe(res);
    } else {
      res.writeHead(r.statusCode ?? 200, r.headers);
      r.pipe(res);
    }
  });
  up.on('error', () => { res.writeHead(502); res.end(); });
  req.pipe(up);
}).listen(PORT, () => process.stdout.write(`gzip proxy :${PORT} -> ${UP.href}\n`));
