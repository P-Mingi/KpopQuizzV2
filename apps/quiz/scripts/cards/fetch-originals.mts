// Bunnyverse Cards (integrator review, 2026-11-12): the Commons ORIGINAL of each of the same 59 photos (same Commons page),
// read from the Commons API: the full-size file address, its width and height, its sha1 and its licence today. No new
// search: the titles come from docs/design/growth-v12/run/group-photos.json. Two requests of 50 titles at most, one at a
// time, with a User-Agent naming the project. Writes docs/design/cards/data/originals.json; prints any licence that no
// longer matches the recorded one (such a photo must not be cut into cards until the owner checks it).
//   ../../node_modules/.bin/tsx scripts/cards/fetch-originals.mts
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const UA = 'BunnyverseCards/1.0 (https://bunnyverse.org; hello@kpopquiz.org)';

interface Row { slug: string; commons_page: string; file: string; license: string }
export interface Original {
  slug: string; page: string; file: string; url: string; width: number; height: number; mime: string; sha1: string;
  licence: string; licenceRecorded: string; licenceMatches: boolean;
}

/** "CC BY-SA 4.0" and "cc-by-sa-4.0" compare equal. */
export const sameLicence = (a: string, b: string): boolean => a.toLowerCase().replace(/[^a-z0-9.]/g, '') === b.toLowerCase().replace(/[^a-z0-9.]/g, '');

async function main(): Promise<void> {
  const rows = JSON.parse(readFileSync(path.join(REPO, 'docs/design/growth-v12/run/group-photos.json'), 'utf8')) as Row[];
  const byTitle = new Map<string, Row>();
  for (const r of rows) byTitle.set(`File:${decodeURIComponent(r.commons_page.split('/wiki/File:')[1]!).replace(/_/g, ' ')}`, r);
  const titles = [...byTitle.keys()];
  const out: Original[] = [];
  for (let i = 0; i < titles.length; i += 50) {
    const batch = titles.slice(i, i + 50);
    const q = new URLSearchParams({
      action: 'query', format: 'json', formatversion: '2', maxlag: '5', prop: 'imageinfo',
      iiprop: 'url|size|mime|sha1|extmetadata', iiextmetadatafilter: 'LicenseShortName', titles: batch.join('|'),
    });
    const res = await fetch(`https://commons.wikimedia.org/w/api.php?${q}`, { headers: { 'User-Agent': UA } });
    if (!res.ok) throw new Error(`Commons API: HTTP ${res.status}`);
    const j = (await res.json()) as { query: { normalized?: { from: string; to: string }[]; pages: { title: string; missing?: boolean; imageinfo?: { url: string; width: number; height: number; mime: string; sha1: string; extmetadata?: { LicenseShortName?: { value: string } } }[] }[] } };
    const norm = new Map((j.query.normalized ?? []).map((n) => [n.to, n.from]));
    for (const p of j.query.pages) {
      const r = byTitle.get(p.title) ?? byTitle.get(norm.get(p.title) ?? '');
      if (!r) throw new Error(`unexpected title ${p.title}`);
      const ii = p.imageinfo?.[0];
      if (p.missing || !ii) throw new Error(`${r.slug}: the Commons file is gone (${p.title})`);
      const licence = ii.extmetadata?.LicenseShortName?.value ?? '';
      out.push({ slug: r.slug, page: r.commons_page, file: r.file, url: ii.url, width: ii.width, height: ii.height, mime: ii.mime, sha1: ii.sha1,
        licence, licenceRecorded: r.license, licenceMatches: sameLicence(licence, r.license) });
    }
    if (i + 50 < titles.length) await new Promise((ok) => setTimeout(ok, 1500));
  }
  out.sort((a, b) => a.slug.localeCompare(b.slug));
  if (out.length !== rows.length) throw new Error(`${out.length} originals for ${rows.length} photos`);
  writeFileSync(path.join(REPO, 'docs/design/cards/data/originals.json'), `${JSON.stringify(out, null, 2)}\n`);
  const changed = out.filter((o) => !o.licenceMatches);
  console.log(`originals: ${out.length}; licence changed on Commons: ${changed.length}${changed.length ? ` (${changed.map((o) => `${o.slug}: ${o.licenceRecorded} -> ${o.licence}`).join(', ')})` : ''}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
