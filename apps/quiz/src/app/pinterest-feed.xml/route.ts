// Pinterest "Publication automatique" (auto-publish from an RSS feed) is tied to
// a claimed domain, so the feed has to live on kpopquiz.org even though the pin
// images and the feed body are generated offline
// (scripts/generate-question-pins.mts) and stored in the public
// pinterest-question-pins bucket. This handler proxies that stored feed so the
// URL you give Pinterest is https://kpopquiz.org/pinterest-feed.xml.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://rdkgouofytwfdpbxbzio.supabase.co';
const FEED_SOURCE = `${SUPABASE_URL}/storage/v1/object/public/pinterest-question-pins/feed.xml`;

export const revalidate = 3600; // refresh from storage hourly

export async function GET(): Promise<Response> {
  try {
    const res = await fetch(FEED_SOURCE, { next: { revalidate: 3600 } });
    if (!res.ok) return new Response('feed unavailable', { status: 502 });
    const xml = await res.text();
    return new Response(xml, {
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch {
    return new Response('feed unavailable', { status: 502 });
  }
}
