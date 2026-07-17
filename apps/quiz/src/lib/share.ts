import { REDDIT_SUBREDDIT } from '@kpopquiz/shared/social-links';

/** Generate a tracked share link via the API. Returns the share code. */
async function getShareCode(quizId: string, platform: string): Promise<string | null> {
  try {
    const res = await fetch('/api/share/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quizId, platform }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.shareCode as string;
  } catch {
    return null;
  }
}

/** Build a tracked share URL, falling back to direct quiz URL if generation fails. */
async function getShareUrl(quizId: string, slug: string, platform: string): Promise<string> {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const shareCode = await getShareCode(quizId, platform);
  if (shareCode) {
    return `${origin}/s/${shareCode}`;
  }
  // Fallback: direct quiz URL with UTM
  return `${origin}/q/${slug}?utm_source=${platform}&utm_medium=social&utm_campaign=quiz_share`;
}

// L2 - share a Fan Level level-up. Uses the Web Share API when available, else
// copies the line + link. The home link carries level-up UTM, and the level-up
// OG card (/api/og/level-up) renders the shareable image.
// M1.5 - share the public passport (acquisition). The link points to the public
// /u/<username> profile (which renders the /api/og/passport card), tagged with a
// per-platform utm_source and utm_medium=passport-card. Public data only.
export type SharePlatform = 'native' | 'copy' | 'twitter' | 'reddit' | 'discord';

export async function sharePassport(username: string, platform: SharePlatform): Promise<'shared' | 'copied' | 'opened' | 'failed'> {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://kpopquiz.org';
  const link = (src: string) => `${origin}/u/${username}?utm_source=${src}&utm_medium=passport-card`;
  const text = 'My K-pop passport on kpopquiz.org';

  if (platform === 'twitter') {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link('twitter'))}`, '_blank', 'noopener');
    return 'opened';
  }
  if (platform === 'reddit') {
    window.open(`https://www.reddit.com/submit?url=${encodeURIComponent(link('reddit'))}&title=${encodeURIComponent(text)}`, '_blank', 'noopener');
    return 'opened';
  }
  if (platform === 'native' && typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ title: 'My K-pop passport', text, url: link('share') });
      return 'shared';
    } catch {
      return 'failed';
    }
  }
  try {
    await navigator.clipboard.writeText(link(platform === 'discord' ? 'discord' : 'copy'));
    return 'copied';
  } catch {
    return 'failed';
  }
}

// Download the rendered passport card PNG.
export async function downloadPassportCard(username: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/og/passport/${username}`);
    if (!res.ok) return false;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${username}-kpop-passport.png`;
    a.click();
    URL.revokeObjectURL(url);
    return true;
  } catch {
    return false;
  }
}

export async function shareLevelUp(title: string, level: number): Promise<'shared' | 'copied' | 'failed'> {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://kpopquiz.org';
  const url = `${origin}/?utm_source=levelup&utm_medium=social&utm_campaign=level_up`;
  const text = `I reached ${title} (Level ${level}) on kpopquiz.org`;
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ title: 'Level up!', text, url });
      return 'shared';
    } catch {
      return 'failed'; // user cancelled
    }
  }
  try {
    await navigator.clipboard.writeText(`${text} ${url}`);
    return 'copied';
  } catch {
    return 'failed';
  }
}

export async function shareToReddit(_quizId: string, slug: string, quizTitle: string) {
  // §7 - Reddit post title = quiz name only (r/Kpop_Verse context makes the
  // source implicit; the promo suffix reads as spam).
  //
  // Reddit-specific: skip UTM + the /s/<code> tracking redirect. Reddit's
  // automod/anti-spam flags UTM-tagged URLs and tracking redirects and
  // collapses them into text posts (no rich OG preview card). Submit the
  // clean canonical /q/<slug> URL so Reddit fetches the OG image directly
  // and renders the link post with the big card. We lose Reddit-attributed
  // share tracking - acceptable trade-off for the rich preview.
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://kpopquiz.org';
  const shareUrl = `${origin}/q/${slug}`;
  const shareText = quizTitle;

  window.open(
    `https://www.reddit.com/r/${REDDIT_SUBREDDIT}/submit?type=link&url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareText)}`,
    '_blank',
    'noopener,noreferrer',
  );
}

export async function shareToTwitter(quizId: string, slug: string, quizTitle: string, score?: string) {
  const shareUrl = await getShareUrl(quizId, slug, 'twitter');
  const scoreText = score ? `I got ${score} on "${quizTitle}"` : `Check out "${quizTitle}"`;
  const shareText = `${scoreText} on KpopQuiz - can you beat me?`;

  window.open(
    `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
    '_blank',
    'noopener,noreferrer',
  );
}

export async function copyShareLink(quizId: string, slug: string): Promise<boolean> {
  const shareUrl = await getShareUrl(quizId, slug, 'link');
  try {
    await navigator.clipboard.writeText(shareUrl);
    return true;
  } catch {
    return false;
  }
}

// K3 - Discord has no web share intent, so we copy the tracked link
// (utm_source=discord) for the user to paste into a channel.
export async function shareToDiscord(quizId: string, slug: string): Promise<boolean> {
  const shareUrl = await getShareUrl(quizId, slug, 'discord');
  try {
    await navigator.clipboard.writeText(shareUrl);
    return true;
  } catch {
    return false;
  }
}
