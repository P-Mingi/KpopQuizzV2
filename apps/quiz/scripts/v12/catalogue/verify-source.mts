// Check that each cited public page really carries the words its citation relies on (read-only
// HTTP GETs). Input: a JSON list of { deezer_track_id, artist, title, outlet, url, needle }.
//   npx tsx scripts/v12/catalogue/verify-source.mts <list.json> [report.md] [topic] [verified.json]
// `topic` is a word the page must also contain (default "tiktok"; "-" for none). `verified.json`
// receives the entries that passed. Prints one line per entry with the text as served (tags
// stripped), or MISSING.
//
// The needle is matched on letters and digits only (case, spacing, quote style and link markup
// do not matter), so a phrase copied from a page survives the page's formatting.
// A kpop.fandom.com page is read through that wiki's own MediaWiki API (its HTML answers 403 to
// a script); the text checked is the article's wikitext.
import { readFileSync, writeFileSync } from 'node:fs';

interface Entry { deezer_track_id: number; artist: string; title: string; outlet: string; url: string; needle: string }
const [file, out, topicArg, verifiedOut] = process.argv.slice(2);
const TOPIC = (topicArg ?? 'tiktok').toLowerCase();
if (!file) { console.error('usage: verify-source.mts <list.json> [report.md] [topic] [verified.json]'); process.exit(2); }
const entries = JSON.parse(readFileSync(file, 'utf8')) as Entry[];
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

const clean = (html: string): string => html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ')
  .replace(/&#39;|&apos;|&#x27;|&#039;|&#8217;|&#8216;|&rsquo;|&lsquo;/g, "'").replace(/&quot;|&#8220;|&#8221;|&ldquo;|&rdquo;/g, '"').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
  .replace(/[‘’]/g, "'").replace(/[“”″]/g, '"').replace(/[\u2013\u2014]|&#8211;|&#8212;|&mdash;|&ndash;/g, '-').replace(/\s+/g, ' ');
const squash = (s: string): string => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');

const pages = new Map<string, { status: number; text: string }>();
async function page(url: string): Promise<{ status: number; text: string }> {
  if (!pages.has(url)) {
    try {
      const fandom = url.match(/^https:\/\/kpop\.fandom\.com\/wiki\/(.+)$/);
      if (fandom) {
        const res = await fetch(`https://kpop.fandom.com/api.php?action=parse&page=${fandom[1]}&prop=wikitext&format=json`, { headers: { 'user-agent': UA } });
        const body = (await res.json()) as { parse?: { wikitext?: { '*': string } } };
        const wt = body.parse?.wikitext?.['*'] ?? '';
        pages.set(url, { status: wt ? res.status : 404, text: clean(wt.replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1').replace(/'{2,}/g, '')) });
      } else {
        const res = await fetch(url, { headers: { 'user-agent': UA, accept: 'text/html' }, redirect: 'follow' });
        pages.set(url, { status: res.status, text: clean(await res.text()) });
      }
    } catch (e) { pages.set(url, { status: 0, text: `fetch failed: ${String(e)}` }); }
  }
  return pages.get(url)!;
}

/** Where the needle sits in the text, comparing letters and digits only; -1 when absent. */
function find(text: string, needle: string): number {
  const n = squash(needle);
  if (!n) return -1;
  // Map each kept character of the squashed text back to its index in the original.
  const map: number[] = [];
  let sq = '';
  for (let i = 0; i < text.length; i++) { const c = squash(text[i]!); if (c) { sq += c; for (let k = 0; k < c.length; k++) map.push(i); } }
  const at = sq.indexOf(n);
  return at < 0 ? -1 : map[at]!;
}

const lines: string[] = ['| Deezer id | Act, song or fact | Source | HTTP | Words found on the page |', '|---|---|---|---|---|'];
const verified: Entry[] = [];
for (const e of entries) {
  const p = await page(e.url);
  const i = find(p.text, e.needle);
  const topic = TOPIC === '-' || p.text.toLowerCase().includes(TOPIC);
  const ok = i >= 0 && topic && p.status === 200;
  if (ok) verified.push(e);
  const ctx = i < 0 ? `MISSING: ${e.needle}` : `${topic ? '' : `(no "${TOPIC}" on the page) `}${p.text.slice(Math.max(0, i - 110), i + e.needle.length + 120).replace(/\|/g, '/').trim()}`;
  lines.push(`| ${e.deezer_track_id || ''} | ${e.artist}, ${e.title} | [${e.outlet}](${e.url}) | ${p.status} | ${ctx} |`);
}
lines.push('', `Confirmed on the live page: ${verified.length} of ${entries.length}.`);
console.log(lines.join('\n'));
if (out) writeFileSync(out, lines.join('\n') + '\n');
if (verifiedOut) writeFileSync(verifiedOut, JSON.stringify(verified, null, 1) + '\n');
