// common.mjs: the few helpers of kpopdle-photos.mjs (moved from out/otaku-refs-tool/common.mjs, lot 3 DLE). No secret is ever printed or written.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
// apps/quiz/scripts/cards/kpopdle-photos -> the repo folder
export const REPO = path.resolve(SCRIPT_DIR, '..', '..', '..', '..', '..');

export const PRODUCTION_URL = 'https://rdkgouofytwfdpbxbzio.supabase.co';

/** The project URL (production, or OTAKU_SUPABASE_URL) and the service key (environment ONLY). */
export async function loadConfig() {
  let url;
  // The production project of the sites (public address). The repo's .env files are not read: they can point at a dev or an old
  // project. Another project only if OTAKU_SUPABASE_URL is set in the terminal.
  url = process.env.OTAKU_SUPABASE_URL || PRODUCTION_URL;
  console.log(`Project: ${new URL(url).host}`);
  return { url: url.replace(/\/+$/, ''), serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || null };
}

export function serviceHeaders(key, extra = {}) {
  return { apikey: key, Authorization: `Bearer ${key}`, ...extra };
}

export async function restAll(cfg, table, query) {
  const rows = [];
  for (let offset = 0; ; offset += 1000) {
    const res = await fetch(`${cfg.url}/rest/v1/${table}?${query}&limit=1000&offset=${offset}`, { headers: serviceHeaders(cfg.serviceKey) });
    if (!res.ok) throw new Error(`read ${table}: HTTP ${res.status}`);
    const page = await res.json();
    rows.push(...page);
    if (page.length < 1000) return rows;
  }
}
