import { NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';
import { getQuizBySlug } from '@/lib/db/queries/quizzes';
import { postQuizImageToReddit } from '@/lib/reddit-api';

import type { NextRequest } from 'next/server';

// Subreddit names: 2-21 chars, letters/numbers/underscores only.
const SUBREDDIT_RE = /^[a-zA-Z0-9_]{2,21}$/;

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Must be signed in to prevent bot-spam of the bot.
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in to share' }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { slug, subreddit, title } = (body ?? {}) as Record<string, unknown>;

  if (typeof slug !== 'string' || !slug) {
    return NextResponse.json({ error: 'slug required' }, { status: 400 });
  }
  if (typeof subreddit !== 'string' || !SUBREDDIT_RE.test(subreddit)) {
    return NextResponse.json({ error: 'Invalid subreddit name' }, { status: 400 });
  }

  // Verify the quiz exists and is published.
  const quiz = await getQuizBySlug(slug).catch(() => null);
  if (!quiz) return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });

  // Fetch the OG card from our own image generation endpoint.
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kpopquiz.org';
  const ogRes = await fetch(`${origin}/api/og/${slug}`, {
    headers: { 'User-Agent': 'kpopquiz-internal' },
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null);

  if (!ogRes?.ok) {
    return NextResponse.json({ error: 'Failed to generate share card' }, { status: 500 });
  }

  const imageBytes = new Uint8Array(await ogRes.arrayBuffer());
  const postTitle = (typeof title === 'string' && title.trim()
    ? title.trim()
    : quiz.title
  ).slice(0, 300);

  try {
    const postUrl = await postQuizImageToReddit({
      subreddit,
      title: postTitle,
      imageBytes,
      quizUrl: `${origin}/q/${slug}`,
    });
    return NextResponse.json({ postUrl });
  } catch (err) {
    const msg = (err as Error).message ?? 'Failed to post';
    console.error('[reddit-image] post failed:', msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
