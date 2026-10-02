// Check that each cited public page really carries the words its citation relies on, and that
// the page talks about TikTok (read-only HTTP GETs). Input: a JSON list of
// { deezer_track_id, artist, title, outlet, url, needle }.
//   npx tsx scripts/v12/catalogue/verify-source.mts scripts/v12/catalogue/data/tiktok-viral.json [report.md]
// Prints one line per entry with the sentence as served (tags stripped), or MISSING.
import { readFileSync, writeFileSync } from 'node:fs';

interface Entry { deezer_track_id: number; artist: string; title: string; outlet: string; url: string; needle: string }
const [file, out] = process.argv.slice(2);
if (!file) { console.error('usage: verify-source.mts <list.json> [report.md]'); process.exit(2); }
const entries = JSON.parse(readFileSync(file, 'utf8')) as Entry[];

const pages = new Map<string, { status: number; text: string }>();
async function page(url: string): Promise<{ status: number; text: string }> {
  if (!pages.has(url)) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36', accept: 'text/html' }, redirect: 'follow' });
      const html = await res.text();
      const text = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ')
        .replace(/&#39;|&apos;|&#x27;|&#039;|&rsquo;|&lsquo;/g, "'").replace(/&quot;|&ldquo;|&rdquo;/g, '"').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
        .replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/\s+/g, ' ');
      pages.set(url, { status: res.status, text });
    } catch (e) { pages.set(url, { status: 0, text: `fetch failed: ${String(e)}` }); }
  }
  return pages.get(url)!;
}

const lines: string[] = ['| Deezer id | Song | Source | HTTP | TikTok on page | Words found on the page |', '|---|---|---|---|---|---|'];
let ok = 0;
for (const e of entries) {
  const p = await page(e.url);
  const lower = p.text.toLowerCase();
  const i = lower.indexOf(e.needle.toLowerCase());
  const tiktok = lower.includes('tiktok');
  const ctx = i < 0 ? 'MISSING' : p.text.slice(Math.max(0, i - 110), i + e.needle.length + 110).replace(/\|/g, '/').trim();
  if (i >= 0 && tiktok && p.status === 200) ok++;
  lines.push(`| ${e.deezer_track_id} | ${e.artist}, ${e.title} | [${e.outlet}](${e.url}) | ${p.status} | ${tiktok ? 'yes' : 'NO'} | ${ctx} |`);
}
lines.push('', `Confirmed (HTTP 200, the song is named, the page is about TikTok): ${ok} of ${entries.length}.`);
console.log(lines.join('\n'));
if (out) writeFileSync(out, lines.join('\n') + '\n');
