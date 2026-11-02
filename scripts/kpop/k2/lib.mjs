// Lot K2 shared helpers: polite cached HTTP (Wikidata, MusicBrainz, English Wikipedia) and small text tools.
// Cache: ~/kpq-o1/k2-cache (never committed). One generic User-Agent, no personal data, no secrets.
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const CACHE_DIR = process.env.K2_CACHE || path.join(os.homedir(), 'kpq-o1', 'k2-cache');
export const USER_AGENT = 'KpopQuizDataLot/1.0 (+https://kpopquiz.org/contact)';
export const WD_API = 'https://www.wikidata.org/w/api.php';
export const WP_API = 'https://en.wikipedia.org/w/api.php';
export const MB_API = 'https://musicbrainz.org/ws/2';
export const SPARQL = 'https://query.wikidata.org/sparql';
const GAP = { wd: 350, wp: 250, mb: 1150, sparql: 1500 };
const last = { wd: 0, wp: 0, mb: 0, sparql: 0 };
export const stats = { fetched: 0, cached: 0 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// One cached GET. A 404 is a normal answer (cached too, body null).
export async function getJson(url, kind, headers = {}) {
  const key = createHash('sha1').update(url).digest('hex');
  const dir = path.join(CACHE_DIR, kind);
  const file = path.join(dir, `${key}.json`);
  if (existsSync(file)) { stats.cached++; return JSON.parse(await readFile(file, 'utf8')); }
  await mkdir(dir, { recursive: true });
  for (let attempt = 0; ; attempt++) {
    const wait = last[kind] + GAP[kind] - Date.now();
    if (wait > 0) await sleep(wait);
    last[kind] = Date.now();
    let res;
    try { res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json', ...headers } }); }
    catch (e) { if (attempt < 5) { await sleep(3000 * (attempt + 1)); continue; } throw e; }
    if (res.ok || res.status === 404) {
      const body = res.status === 404 ? null : await res.json();
      const entry = { url, status: res.status, fetched_at: new Date().toISOString(), body };
      await writeFile(file, JSON.stringify(entry));
      stats.fetched++;
      return entry;
    }
    if ((res.status === 429 || res.status === 503 || res.status === 502 || res.status === 504) && attempt < 6) {
      const retry = Math.min(90, Number(res.headers.get('retry-after')) || 6 * (attempt + 1));
      console.log(`[${kind}] ${res.status}, waiting ${retry} s`);
      await sleep(retry * 1000);
      continue;
    }
    throw new Error(`${kind} ${res.status} for ${url}`);
  }
}

export const qs = (o) => Object.entries(o).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
export const wd = (params) => getJson(`${WD_API}?${qs({ format: 'json', ...params })}`, 'wd');
export const wp = (params) => getJson(`${WP_API}?${qs({ format: 'json', formatversion: 2, ...params })}`, 'wp');
export const mb = (p, params = {}) => getJson(`${MB_API}/${p}?${qs({ fmt: 'json', ...params })}`, 'mb');
export const sparql = (query) => getJson(`${SPARQL}?${qs({ query, format: 'json' })}`, 'sparql', { Accept: 'application/sparql-results+json' });

// Text tools
export const norm = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').normalize('NFC').toLowerCase().replace(/[^a-z0-9\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/g, '');
// The owner's rule: no em dash, no en dash anywhere in what is written.
export const clean = (s) => (s == null ? s : String(s).replace(/[\u2013\u2014]/g, '-'));
export const todayIso = () => process.env.K2_TODAY || new Date().toISOString().slice(0, 10);
export function adultCutoff(today = todayIso()) {   // born on or before this date = 18 or older on `today`
  const [y, m, d] = today.split('-').map(Number);
  const dt = new Date(Date.UTC(y - 18, m - 1, d));
  return dt.toISOString().slice(0, 10);
}
export const isAdult = (birth, today = todayIso()) => !!birth && birth <= adultCutoff(today);
export const chunk = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
