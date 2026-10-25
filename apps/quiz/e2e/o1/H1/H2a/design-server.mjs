// Run O1, lot H2a: serves docs/o1/design/fanquiz-hub/ with the stand-in support.js (dc-support.js) so the design renders in a browser.
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DESIGN = join(HERE, '..', '..', '..', '..', '..', '..', 'docs', 'o1', 'design', 'fanquiz-hub');

export function startDesignServer(port = 0) {
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    const name = url.pathname === '/support.js' ? null : url.pathname.slice(1);
    const file = name === null ? join(HERE, 'dc-support.js') : join(DESIGN, name);
    if (!existsSync(file) || !file.startsWith(name === null ? HERE : DESIGN)) { res.writeHead(404); res.end('not found'); return; }
    const type = file.endsWith('.js') ? 'text/javascript' : file.endsWith('.json') ? 'application/json' : 'text/html; charset=utf-8';
    res.writeHead(200, { 'content-type': type });
    res.end(readFileSync(file));
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve({ server, port: server.address().port })));
}
