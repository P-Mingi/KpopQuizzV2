// Run O1, lot H2a: a fake database for the signed-in screenshots, on 127.0.0.1 only. It answers the three reads of the hub home
// (the user, the profile, the memberships) for one made-up fan and nothing else; no real service, no network, no key.
//   node apps/quiz/e2e/o1/H1/H2a/fake-supabase.mjs <port>      prints the session cookie to give the browser: NAME=VALUE
// Start the hub server with NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:<port> (any anon key text).
import { createServer } from 'node:http';

const port = Number(process.argv[2] ?? 54399);
const ID = '00000000-0000-4000-8000-0000000000aa';
const user = { id: ID, aud: 'authenticated', role: 'authenticated', email: 'sample@example.test', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
const profile = { id: ID, username: 'mingi', xp: 90000, display_name: 'mingi', avatar_url: null, daily_streak: 6, last_daily_date: null };
const memberships = [
  { site_id: 'kpop', xp: null, activated_at: '2026-01-01T00:00:00Z', banned_at: null },
  { site_id: 'anime', xp: 3000, activated_at: '2026-10-01T00:00:00Z', banned_at: null },
];
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const token = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: ID, aud: 'authenticated', role: 'authenticated', exp: 4102444800 })}.sig`;
const session = { access_token: token, token_type: 'bearer', expires_in: 3600, expires_at: 4102444800, refresh_token: 'fake-refresh', user };

createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (process.env.FAKE_LOG) console.error(req.method, url.pathname);
  const json = (body, status = 200) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
  if (url.pathname === '/auth/v1/user') return json(user);
  if (url.pathname === '/rest/v1/profiles') return json((req.headers.accept ?? '').includes('vnd.pgrst.object') ? profile : [profile]);
  if (url.pathname === '/rest/v1/world_memberships') return json(memberships);
  return json([]);
}).listen(port, '127.0.0.1', () => {
  // @supabase/ssr names the cookie after the first label of the host: sb-127-auth-token for 127.0.0.1
  console.log(`sb-127-auth-token=base64-${Buffer.from(JSON.stringify(session)).toString('base64url')}`);
});
