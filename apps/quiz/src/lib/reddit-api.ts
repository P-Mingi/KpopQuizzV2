// Server-only. Never import from client components.
// Credentials live exclusively in env vars and never leave the server.

const REDDIT_OAUTH = 'https://oauth.reddit.com';
const REDDIT_TOKEN_URL = 'https://www.reddit.com/api/v1/access_token';
const USER_AGENT = 'kpopquiz.org/1.0 (by /u/KpopQuizBot)';

async function getBotToken(): Promise<string> {
  const id = process.env.REDDIT_CLIENT_ID;
  const secret = process.env.REDDIT_CLIENT_SECRET;
  const user = process.env.REDDIT_BOT_USERNAME;
  const pass = process.env.REDDIT_BOT_PASSWORD;
  if (!id || !secret || !user || !pass) throw new Error('Reddit credentials not configured');

  const creds = Buffer.from(`${id}:${secret}`).toString('base64');
  const res = await fetch(REDDIT_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${creds}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': USER_AGENT,
    },
    body: new URLSearchParams({
      grant_type: 'password',
      username: user,
      password: pass,
      scope: 'submit',
    }),
  });
  if (!res.ok) throw new Error(`Reddit auth ${res.status}`);
  const data = await res.json() as { access_token?: string; error?: string };
  if (!data.access_token) throw new Error(`Reddit token: ${data.error ?? 'no token'}`);
  return data.access_token;
}

async function uploadImageAsset(bytes: Uint8Array, token: string): Promise<string> {
  // Step 1: request upload lease from Reddit
  const leaseRes = await fetch(`${REDDIT_OAUTH}/api/media/asset.json`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': USER_AGENT,
    },
    body: new URLSearchParams({ filepath: 'quiz-card.png', mimetype: 'image/png' }),
  });
  if (!leaseRes.ok) throw new Error(`Media lease ${leaseRes.status}`);

  const lease = await leaseRes.json() as {
    asset: { asset_id: string };
    upload_lease: { action: string; fields: Array<{ name: string; value: string }> };
  };

  const { asset_id } = lease.asset;
  const { action: s3Url, fields } = lease.upload_lease;

  // Step 2: upload binary to S3
  const form = new FormData();
  for (const f of fields) form.append(f.name, f.value);
  form.append('file', new Blob([bytes.buffer as ArrayBuffer], { type: 'image/png' }), 'quiz-card.png');

  const s3Res = await fetch(s3Url, { method: 'POST', body: form });
  if (s3Res.status !== 201 && s3Res.status !== 204 && !s3Res.ok) {
    throw new Error(`S3 upload ${s3Res.status}`);
  }

  return `https://i.redd.it/${asset_id}`;
}

interface RedditPostResult {
  postUrl: string;
  postName: string;
}

async function submitLinkPost(
  subreddit: string,
  title: string,
  url: string,
  token: string,
): Promise<RedditPostResult> {
  const res = await fetch(`${REDDIT_OAUTH}/api/submit`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': USER_AGENT,
    },
    body: new URLSearchParams({
      sr: subreddit,
      kind: 'link',
      title,
      url,
      resubmit: 'true',
      nsfw: 'false',
      spoiler: 'false',
    }),
  });

  const data = await res.json() as {
    json?: { data?: { url?: string; name?: string }; errors?: string[][] };
  };

  const errors = data.json?.errors;
  if (errors?.length) throw new Error(errors[0]?.join(': ') ?? 'Reddit submit error');

  return {
    postUrl: data.json?.data?.url ?? `https://www.reddit.com/r/${subreddit}`,
    postName: data.json?.data?.name ?? '',
  };
}

async function addComment(postName: string, text: string, token: string): Promise<void> {
  await fetch(`${REDDIT_OAUTH}/api/comment`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': USER_AGENT,
    },
    body: new URLSearchParams({ thing_id: postName, text }),
  });
}

/**
 * Upload `imageBytes` to Reddit media, submit an image link post to `subreddit`,
 * and pin the quiz URL as the first comment. Returns the new post's URL.
 */
export async function postQuizImageToReddit(opts: {
  subreddit: string;
  title: string;
  imageBytes: Uint8Array;
  quizUrl: string;
}): Promise<string> {
  const { subreddit, title, imageBytes, quizUrl } = opts;
  const token = await getBotToken();
  const imageUrl = await uploadImageAsset(imageBytes, token);
  const { postUrl, postName } = await submitLinkPost(subreddit, title, imageUrl, token);
  if (postName) {
    await addComment(postName, `Take the quiz: ${quizUrl}`, token).catch(() => {});
  }
  return postUrl;
}
