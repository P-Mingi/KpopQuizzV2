// Bunnyverse Cards: the Commons I/O shared by scripts/cards/verify-photos.mts (lot 3) and scripts/cards/verify-harvest.mts (lot 6): the public
// API only, ten titles a request, one request a second, a User-Agent naming the project. Never run by a test (no network in tests).
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { CommonsInfo } from '../../src/lib/cards/photo-checks';

export const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
export const UA = 'BunnyverseCards/1.0 (https://bunnyverse.org; hello@kpopquiz.org)';
export const API = 'https://commons.wikimedia.org/w/api.php';

const sleep = (ms: number) => new Promise((ok) => setTimeout(ok, ms));
let last = 0;
export async function api(params: Record<string, string>): Promise<any> {
  const wait = last + 1000 - Date.now();
  if (wait > 0) await sleep(wait);
  last = Date.now();
  const url = `${API}?${new URLSearchParams({ format: 'json', formatversion: '2', maxlag: '5', ...params })}`;
  for (let attempt = 0; attempt < 5; attempt++) {
    const r = await fetch(url, { headers: { 'User-Agent': UA } });
    if (r.status === 429 || r.status >= 500) { await sleep(5000 * (attempt + 1)); continue; }
    if (!r.ok) throw new Error(`Commons API ${r.status}`);
    const j = await r.json();
    if (j.error?.code === 'maxlag') { await sleep(5000 * (attempt + 1)); continue; }
    return j;
  }
  throw new Error('Commons API: too many retries');
}

export async function commonsInfo(titles: string[]): Promise<Map<string, CommonsInfo>> {
  const out = new Map<string, CommonsInfo>();
  for (let i = 0; i < titles.length; i += 10) {
    const batch = titles.slice(i, i + 10);
    const acc = new Map<string, CommonsInfo>();
    const alias = new Map<string, string>();
    let cont: Record<string, string> = {};
    for (;;) {
      const j = await api({
        action: 'query', titles: batch.join('|'), redirects: '1', prop: 'imageinfo|categories|templates',
        iiprop: 'url|size|sha1|mime|extmetadata', iiextmetadatafilter: 'Artist|LicenseShortName|LicenseUrl|DateTimeOriginal',
        cllimit: 'max', tllimit: 'max', tlnamespace: '10', ...cont,
      });
      for (const n of j.query?.normalized ?? []) alias.set(n.from, n.to);
      for (const n of j.query?.redirects ?? []) alias.set(n.from, n.to);
      for (const pg of j.query?.pages ?? []) {
        const cur: CommonsInfo = acc.get(pg.title) ?? {
          title: pg.title, missing: !!pg.missing, url: null, width: 0, height: 0, sha1: null, mime: null, artist: null, artistUrl: null,
          licence: null, licenceUrl: null, dateOriginal: null, categories: [], templates: [],
        };
        const ii = pg.imageinfo?.[0];
        if (ii) {
          const md = ii.extmetadata ?? {};
          Object.assign(cur, {
            url: ii.url ?? null, width: ii.width ?? 0, height: ii.height ?? 0, sha1: ii.sha1 ?? null, mime: ii.mime ?? null,
            artist: md.Artist?.value ?? null, licence: md.LicenseShortName?.value ?? null, licenceUrl: md.LicenseUrl?.value ?? null,
            dateOriginal: md.DateTimeOriginal?.value ?? null,
          });
        }
        for (const c of pg.categories ?? []) cur.categories.push(c.title);
        for (const t of pg.templates ?? []) cur.templates.push(t.title);
        acc.set(pg.title, cur);
      }
      if (!j.continue) break;
      cont = j.continue;
    }
    for (const t of batch) {
      const to = alias.get(alias.get(t) ?? t) ?? alias.get(t) ?? t;
      const info = acc.get(to) ?? acc.get(t);
      if (info) out.set(t, info);
      else out.set(t, { title: t, missing: true, url: null, width: 0, height: 0, sha1: null, mime: null, artist: null, artistUrl: null, licence: null, licenceUrl: null, dateOriginal: null, categories: [], templates: [] });
    }
  }
  return out;
}

export const fileOfPage = (page: string): string | null => {
  const m = /\/wiki\/File:(.+)$/.exec(page);
  return m ? decodeURIComponent(m[1]!).replace(/_/g, ' ') : null;
};

export function arg(name: string): string | null {
  const i = process.argv.indexOf(name);
  return i > 0 ? (process.argv[i + 1] ?? null) : null;
}
export const outsideRepo = (f: string): boolean => !path.resolve(f).startsWith(REPO + path.sep);
