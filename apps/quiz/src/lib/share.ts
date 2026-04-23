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

export async function shareToReddit(quizId: string, slug: string, quizTitle: string) {
  const shareUrl = await getShareUrl(quizId, slug, 'reddit');
  const shareText = `${quizTitle} - free K-pop quiz on kpopquiz.org`;

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
