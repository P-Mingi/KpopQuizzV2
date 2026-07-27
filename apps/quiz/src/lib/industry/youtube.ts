// Workstream T1.5: YouTube Data API v3 client for the daily MV view-count
// snapshot. Official API (needs YOUTUBE_API_KEY), no scraping. Batches up to 50
// video ids per call (videos.list costs 1 quota unit/call, 10k/day free), so
// ~30 tracked MVs is one call. Throws on any API failure so the cron can
// fail-soft + alert. The API key is read from env and NEVER logged (it rides in
// the URL, so error messages carry only status + response body, never the URL).

export interface ViewCountResult {
  views: Map<string, number>; // video_id -> cumulative views
  missing: string[]; // ids the API returned no stats for (deleted/private/bad id)
}

export function hasYouTubeKey(): boolean {
  return !!process.env.YOUTUBE_API_KEY;
}

export async function fetchViewCounts(videoIds: string[]): Promise<ViewCountResult> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error('YOUTUBE_API_KEY not set');

  const views = new Map<string, number>();
  const seen = new Set<string>();

  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    const url = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${batch.join(',')}&maxResults=50&key=${key}`;
    const r = await fetch(url);
    if (!r.ok) {
      const body = await r.text().catch(() => '');
      throw new Error(`YouTube API ${r.status}: ${body.slice(0, 200)}`); // no URL (would leak the key)
    }
    const json = (await r.json()) as { items?: Array<{ id?: string; statistics?: { viewCount?: string } }> };
    for (const item of json.items ?? []) {
      const v = Number(item.statistics?.viewCount);
      if (item.id && Number.isFinite(v)) {
        views.set(item.id, v);
        seen.add(item.id);
      }
    }
  }

  return { views, missing: videoIds.filter((id) => !seen.has(id)) };
}
