// Workstream T1.5: Spotify Web API client for the weekly follower snapshot.
// Official API via the Client Credentials flow (needs SPOTIFY_CLIENT_ID +
// SPOTIFY_CLIENT_SECRET), no scraping. Batches up to 50 artist ids per call.
// Throws on any failure so the cron can fail-soft + alert. Credentials are read
// from env and NEVER logged.

export interface FollowerResult {
  followers: Map<string, number>; // spotify_artist_id -> follower total
  missing: string[];
}

export function hasSpotifyCreds(): boolean {
  return !!(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET);
}

async function getToken(): Promise<string> {
  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!id || !secret) throw new Error('SPOTIFY_CLIENT_ID/SECRET not set');
  const r = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64'),
    },
    body: 'grant_type=client_credentials',
  });
  if (!r.ok) throw new Error(`Spotify token ${r.status}`);
  const json = (await r.json()) as { access_token?: string };
  if (!json.access_token) throw new Error('Spotify token response missing access_token');
  return json.access_token;
}

export async function fetchFollowers(artistIds: string[]): Promise<FollowerResult> {
  const token = await getToken();
  const followers = new Map<string, number>();
  const seen = new Set<string>();

  for (let i = 0; i < artistIds.length; i += 50) {
    const batch = artistIds.slice(i, i + 50);
    const r = await fetch(`https://api.spotify.com/v1/artists?ids=${batch.join(',')}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) {
      const body = await r.text().catch(() => '');
      throw new Error(`Spotify artists ${r.status}: ${body.slice(0, 200)}`);
    }
    const json = (await r.json()) as { artists?: Array<{ id?: string; followers?: { total?: number } }> };
    for (const a of json.artists ?? []) {
      const f = Number(a?.followers?.total);
      if (a?.id && Number.isFinite(f)) {
        followers.set(a.id, f);
        seen.add(a.id);
      }
    }
  }

  return { followers, missing: artistIds.filter((id) => !seen.has(id)) };
}
