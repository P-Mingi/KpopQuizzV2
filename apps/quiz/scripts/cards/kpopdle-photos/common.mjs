// common.mjs: the few helpers of kpopdle-photos.mjs (moved from out/otaku-refs-tool/common.mjs, lot 3 DLE). No secret is ever printed or written.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PAGE_ROWS, fetchRetry, readAllRows } from '../card-files.mjs';

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

/** Every row of a read, page by page (readAllRows of ../card-files.mjs, lot CPUB-RETRY): limit 1000 and an offset, until a page has fewer
 *  than 1000 rows; `query` orders the rows on a unique key, so the pages neither skip nor repeat a row. The first page asks Prefer:
 *  count=exact, and the rows read must be that total (a server that answers fewer rows a page, a row added during the read: an error, before
 *  any write). Each page is tried again on a passing error (fetchRetry: a read is idempotent); a refusal (401, 403, 404, ...) is not tried
 *  again. `sleep` (tests) replaces the wait between two tries. */
export async function restAll(cfg, table, query, { sleep } = {}) {
  const { rows } = await readAllRows(async (offset, first) => {
    const res = await fetchRetry(() => fetch(`${cfg.url}/rest/v1/${table}?${query}&limit=${PAGE_ROWS}&offset=${offset}`, {
      headers: serviceHeaders(cfg.serviceKey, first ? { Prefer: 'count=exact' } : {}),
    }), { sleep });
    if (!res.ok) throw new Error(`read ${table}: HTTP ${res.status}`);
    return res;
  }, `read ${table}`);
  return rows;
}
