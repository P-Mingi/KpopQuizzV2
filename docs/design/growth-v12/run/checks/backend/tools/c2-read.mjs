// C2 (V12 backend checker): read-only access to the production database through
// PostgREST with the service role. Only GET and HEAD are ever sent; any other
// method throws before a request leaves. Values of the env are never printed.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(here, '../../../../../../..');
const ENV_FILE = path.join(ROOT, 'apps/quiz/.env.local');

function parseEnv(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = /^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m) out[m[1]] = (m[2] ?? '').replace(/^(['"])(.*)\1$/, '$2');
  }
  return out;
}

const E = parseEnv(ENV_FILE);
export const env = {
  url: E.NEXT_PUBLIC_SUPABASE_URL,
  anon: E.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  service: E.SUPABASE_SERVICE_ROLE_KEY,
  testUser: E.UX_V1_TEST_USER_ID,
};
if (!env.url || !env.service) throw new Error('missing supabase env (names only: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)');

function headers(extra = {}) {
  return { apikey: env.service, Authorization: `Bearer ${env.service}`, ...extra };
}

async function send(method, p, extra) {
  if (method !== 'GET' && method !== 'HEAD') throw new Error(`refused: ${method} is not read-only`);
  return fetch(`${env.url}/rest/v1/${p}`, { method, headers: headers(extra) });
}

/** Exact row count of a table (or a filtered view of it). null + status when it does not exist. */
export async function count(table, filter = '') {
  const res = await send('HEAD', `${table}?select=*${filter ? `&${filter}` : ''}`, { Prefer: 'count=exact', Range: '0-0' });
  const cr = res.headers.get('content-range');
  if (!res.ok && res.status !== 206) return { table, count: null, status: res.status };
  return { table, count: cr ? Number(cr.split('/')[1]) : null, status: res.status };
}

/** GET rows. Returns { status, body }. */
export async function rows(p) {
  const res = await send('GET', p);
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, body };
}

/** Does a table or view exist for PostgREST? (404 / PGRST205 = no) */
export async function exists(table) {
  const r = await rows(`${table}?select=*&limit=0`);
  return { table, exists: r.status === 200, status: r.status, code: r.body?.code ?? null };
}
