// Run O1: offline test of the read-only proxy. No byte leaves the machine: the upstream is a local fake that records
// every request it receives.   node scripts/o1/prod-proxy.test.mjs   (exit 0 = every case as expected)
import http from 'node:http';
import { startProxy, STAND_IN } from './prod-proxy.mjs';

const seen = [];
const fake = http.createServer((req, res) => { seen.push({ m: req.method, p: req.url, key: req.headers.apikey }); res.writeHead(200, { 'content-type': 'application/json' }); res.end('[]'); });
await new Promise((ok) => fake.listen(0, '127.0.0.1', ok));
const proxy = await startProxy({ upstream: `http://127.0.0.1:${fake.address().port}`, anonKey: 'REAL-ANON', serviceKey: 'REAL-SERVICE' });
const base = `http://127.0.0.1:${proxy.address().port}`;
const call = (method, path) => fetch(base + path, { method, headers: { apikey: STAND_IN.service, authorization: `Bearer ${STAND_IN.service}` }, body: method === 'GET' || method === 'HEAD' ? undefined : '{}' });

const cases = [
  ['POST', '/rest/v1/rpc/ensure_daily_quiz', 403, false],
  ['POST', '/rest/v1/rpc/tier_list_bump_view', 403, false],
  ['PATCH', '/rest/v1/profiles?id=eq.x', 403, false],
  ['DELETE', '/rest/v1/quizzes?id=eq.x', 403, false],
  ['POST', '/rest/v1/plays', 403, false],
  ['POST', '/auth/v1/signup', 403, false],
  ['POST', '/storage/v1/object/avatars/x.png', 403, false],
  ['GET', '/rest/v1/groups?select=slug', 200, true],
  ['HEAD', '/rest/v1/quizzes?select=id', 200, true],
  ['POST', '/rest/v1/rpc/get_today_stats', 200, true],
];
let bad = 0;
for (const [m, p, want, reaches] of cases) {
  const before = seen.length;
  const r = await call(m, p);
  const reached = seen.length > before;
  const ok = r.status === want && reached === reaches && (!reached || seen.at(-1).key === 'REAL-SERVICE');
  if (!ok) bad++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${m} ${p} -> ${r.status}${reached ? ' (reached upstream with the real key swapped in)' : ' (never left the proxy)'}`);
}
proxy.close(); fake.close();
console.log(bad ? `prod-proxy test: ${bad} FAILED` : `prod-proxy test: ${cases.length} cases ok`);
process.exit(bad ? 1 : 0);
