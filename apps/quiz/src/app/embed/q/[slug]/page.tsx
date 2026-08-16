import { notFound } from 'next/navigation';

import { getQuizBySlug } from '@/lib/db/queries/quizzes';
import { safeFetch } from '@/lib/error-handling';
import { QuizPlayer } from '@/components/quiz/quiz-player';
import { EmbedResizer } from '@/components/embed/embed-resizer';

import type { Metadata } from 'next';

// W4 - the embeddable quiz widget (docs/WIDGET-EMBED-SPEC.md).
//
// WHY THIS EXISTS: the domain rating is 1/100 on ~1 backlink while the site already
// earns ~571K Bing impressions. We are a strong page on a weightless domain, and
// authority compounds over months, so the cost of starting late is permanent. This is
// the one authority lever that needs nobody's permission to build.
//
// THE SEO FACT THIS ROUTE CANNOT FORGET: an <iframe src> passes almost no link equity.
// The backlink that counts is the visible <a> the paste snippet renders in the
// PARTNER's DOM, outside the iframe. This page is the payload; the snippet carries the
// link. A widget shipped without that link is a traffic toy, not an authority lever.
//
// ISR + prerendered top slugs, same pattern as /q/[slug]: embeds get crawled at volume
// and the database is small, so a cold per-hit query is not an option.
export const revalidate = 3600;
const TOP_PRERENDER = 200;

export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  try {
    const { createPublicReadClient } = await import('@/lib/supabase/server');
    const supabase = createPublicReadClient();
    const { data } = await supabase
      .from('quizzes')
      .select('slug')
      .eq('status', 'published')
      .order('play_count', { ascending: false })
      .limit(TOP_PRERENDER);
    return (data ?? []).map((row: { slug: string }) => ({ slug: row.slug }));
  } catch {
    // A degraded build beats a failed one: everything falls back to on-demand ISR.
    return [];
  }
}

interface EmbedPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: EmbedPageProps): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: 'K-pop quiz',
    // NOINDEX, FOLLOW. Every embed URL duplicates a real quiz page, so it must never
    // compete with /q/[slug] in the index. The canonical points at the real page, and
    // this route is deliberately absent from the sitemap (check:indexability would
    // fail on a sitemap-vs-noindex contradiction, which is exactly the bug it exists
    // to catch).
    robots: { index: false, follow: true },
    alternates: { canonical: `https://kpopquiz.org/q/${slug}` },
  };
}

export default async function EmbedQuizPage({ params }: EmbedPageProps): Promise<React.ReactElement> {
  const { slug } = await params;
  const quiz = await safeFetch(getQuizBySlug(slug), null, '[embed/q/[slug]] getQuizBySlug');
  if (!quiz) notFound();

  const questionCount = (quiz.questions as unknown[]).length;
  const passRate = quiz.total_completions > 0 && questionCount > 0
    ? Math.round((quiz.total_score_sum / quiz.total_completions / questionCount) * 100)
    : null;

  // The SAME player the real page uses. Reused rather than forked so the two cannot
  // drift apart, and so the end-of-quiz challenge block (W2) comes along for free:
  // that is the loop this widget is meant to serve, acquisition into our battle flow.
  const quizIntro = {
    id: quiz.id,
    title: quiz.title,
    slug: quiz.slug,
    quizType: quiz.quiz_type,
    difficulty: quiz.difficulty,
    playCount: quiz.play_count,
    totalCompletions: quiz.total_completions,
    totalScoreSum: quiz.total_score_sum,
    questionCount,
    groupName: quiz.group_name,
    groupSlug: quiz.group_slug,
    displayColor: quiz.display_color,
    textColor: quiz.text_color,
    logoUrl: quiz.logo_url,
    coverImageUrl: quiz.cover_image_url ?? null,
    fandomName: quiz.fandom_name,
    creatorId: (quiz as { creator_id?: string }).creator_id ?? null,
    creatorUsername: quiz.creator_username,
    creatorXp: (quiz as { creator_xp?: number | null }).creator_xp ?? null,
    creatorAvatarUrl: quiz.creator_avatar_url,
    creatorAvatarBg: quiz.creator_avatar_bg,
    creatorAvatarText: quiz.creator_avatar_text,
    passRate,
    likeCount: quiz.like_count ?? 0,
  };

  return (
    <div className="embed-page">
      <QuizPlayer quiz={quizIntro} />

      {/* The in-frame credit. Secondary to the snippet's visible link (which is the
          one that carries equity), but it means a framed quiz always says where it
          came from, even if a partner strips the wrapper. */}
      <p className="embed-credit">
        <a
          href={`https://kpopquiz.org/q/${quiz.slug}?utm_source=embed&utm_medium=iframe&utm_campaign=widget`}
          target="_blank"
          rel="noopener"
        >
          Play the full quiz on kpopquiz.org
        </a>
      </p>

      <EmbedResizer />
    </div>
  );
}
