// IndexNow (SEO indexation, audit v2). Bing is our #1 search referrer and
// IndexNow lets us push changed URLs to Bing/Yandex/Seznam the instant they
// change instead of waiting for a crawl. Standard protocol, no SEO risk: it
// only asks engines to (re)crawl URLs we own. The key is published at
// https://kpopquiz.org/<KEY>.txt (public/ file) which proves ownership.

const KEY = '4b2f9a7ce8d1465fb0a3e6c95d47128a';
const HOST = 'kpopquiz.org';
const ORIGIN = `https://${HOST}`;
const ENDPOINT = 'https://api.indexnow.org/indexnow';
const BATCH = 10000; // IndexNow hard limit per request

function toAbsolute(pathOrUrl: string): string {
  return pathOrUrl.startsWith('http') ? pathOrUrl : `${ORIGIN}${pathOrUrl}`;
}

/**
 * Submit one or more URLs (absolute or root-relative paths) to IndexNow.
 * Fire-and-forget and fully swallowed: indexing is a hint, never worth failing
 * a user action (publish) or a deploy over. Batches to the 10k-per-call limit.
 */
export async function pingIndexNow(pathsOrUrls: string[]): Promise<{ submitted: number; batches: number }> {
  const urls = [...new Set(pathsOrUrls.map(toAbsolute))];
  if (urls.length === 0) return { submitted: 0, batches: 0 };

  let batches = 0;
  for (let i = 0; i < urls.length; i += BATCH) {
    const urlList = urls.slice(i, i + BATCH);
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `${ORIGIN}/${KEY}.txt`, urlList }),
      });
      if (!res.ok) console.warn(`[indexnow] batch ${batches} returned ${res.status}`);
    } catch (err) {
      console.warn('[indexnow] batch failed:', err);
    }
    batches += 1;
  }
  return { submitted: urls.length, batches };
}

/** Pull every <loc> from the live sitemap for a full-site resubmit on deploy. */
export async function sitemapUrls(): Promise<string[]> {
  const res = await fetch(`${ORIGIN}/sitemap.xml`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`sitemap fetch ${res.status}`);
  const xml = await res.text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]!.trim()).filter(Boolean);
}
