import { notFound } from 'next/navigation';
import Link from 'next/link';

import { getQuizBySlug, getQuizzesByGroup, getBrowseQuizzes } from '@/lib/db/queries/quizzes';
import { getPassRate } from '@/lib/db/queries/plays';
import { hasTriviaPage } from '@/lib/db/queries/trivia';
import { getQuizHallOfFame } from '@/lib/db/queries/community';
import { getQuizSocialCounts } from '@/lib/db/queries/quiz-social';
import { QuizPlayer } from '@/components/quiz/quiz-player';
import { QuizOwnerActions } from '@/components/quiz/quiz-owner-actions';
import { QuizHallOfFame } from '@/components/quiz/quiz-hall-of-fame';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { safeFetch } from '@/lib/error-handling';

import type { Metadata } from 'next';

// ISR: cached HTML revalidates hourly. The TOP_PRERENDER most-played slugs
// pre-render at build time so Googlebot hits cold-cache static HTML with
// zero DB queries - direct relief for the crawl wave that saturates the
// NANO instance. Anything outside the top N still works via on-demand ISR
// (Next caches on first request, served from cache thereafter).
export const revalidate = 3600;
const TOP_PRERENDER = 1000;
export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  // Fail-soft: if the DB is saturated at build time, fall back to [] (every
  // slug becomes on-demand ISR like before). A degraded build is better
  // than a failed build.
  try {
    const { createPublicReadClient } = await import('@/lib/supabase/server');
    const supabase = createPublicReadClient();
    const BUILD_QUERY_TIMEOUT_MS = 10000;
    const sentinel = Symbol('top-slugs-timeout');
    const raced = await Promise.race([
      supabase
        .from('quizzes')
        .select('slug')
        .eq('status', 'published')
        .order('play_count', { ascending: false })
        .limit(TOP_PRERENDER),
      new Promise<typeof sentinel>((resolve) =>
        setTimeout(() => resolve(sentinel), BUILD_QUERY_TIMEOUT_MS),
      ),
    ]);
    if (raced === sentinel) {
      console.warn('[q/[slug]] generateStaticParams timed out - on-demand ISR only for this build');
      return [];
    }
    const data = (raced as { data: Array<{ slug: string }> | null }).data;
    return (data ?? []).map((row) => ({ slug: row.slug }));
  } catch (err) {
    console.warn('[q/[slug]] generateStaticParams failed:', (err as Error)?.message ?? err);
    return [];
  }
}

interface QuizPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: QuizPageProps): Promise<Metadata> {
  const { slug } = await params;
  const quiz = await safeFetch(getQuizBySlug(slug), null, '[q/[slug] metadata] getQuizBySlug');

  if (!quiz) notFound();

  const questionLen = (quiz.questions as unknown[]).length;
  const avgScore = quiz.total_completions > 0 && questionLen > 0
    ? Math.round((quiz.total_score_sum / quiz.total_completions) / questionLen * 100)
    : null;

  const description = `Test your ${quiz.group_name} knowledge with this ${quiz.difficulty} ${questionLen}-question quiz by ${quiz.creator_username}.${
    avgScore !== null
      ? ` ${quiz.play_count.toLocaleString('en-US')} fans have played it, scoring ${avgScore}% on average.`
      : ` Played by ${quiz.play_count.toLocaleString('en-US')} fans.`
  } Can you beat them?`;

  // Unique, descriptive <title>: "<Quiz Title> - <N> questions" (layout template
  // appends " | KpopQuiz"). Distinct per quiz so Google stops sampling templates.
  // Bing flagged long titles: keep the rendered <title> (core + " | KpopQuiz")
  // under ~60 chars. Add the question count only when it fits; truncate a very
  // long user title rather than overflow.
  const withCount = `${quiz.title} · ${questionLen} questions`;
  const title = withCount.length <= 49
    ? withCount
    : quiz.title.length <= 49
      ? quiz.title
      : `${quiz.title.slice(0, 48).trimEnd()}...`;
  const ogImageUrl = `/api/og/${slug}`;

  return {
    title,
    description,
    openGraph: {
      title: `${title} | KpopQuiz`,
      description,
      url: `/q/${slug}`,
      type: 'article',
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: quiz.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | KpopQuiz`,
      description,
      images: [ogImageUrl],
    },
    alternates: { canonical: `/q/${slug}` },
  };
}

export default async function QuizPage({ params }: QuizPageProps): Promise<React.ReactElement> {
  const { slug } = await params;
  const quiz = await safeFetch(getQuizBySlug(slug), null, '[q/[slug]] getQuizBySlug');

  if (!quiz) notFound();

  const questionCount = (quiz.questions as unknown[]).length;
  const passRate = quiz.total_completions > 0
    ? await safeFetch(getPassRate(quiz.id, questionCount), null, '[q/[slug]] getPassRate')
    : null;

  // SEO Fix 1: spoiler-safe question list rendered into the server HTML so the
  // unique quiz content (questions, options, fun facts) is crawlable. The
  // `correct` index is deliberately NOT read or rendered here - options are
  // listed plainly so the answer is never given away in the markup.
  const seoQuestions = (quiz.questions as Array<{
    question?: string;
    options?: string[];
    fun_fact?: string;
    clues?: string[];
    correct?: number | boolean;
  }>) ?? [];

  // SEO Fix 2: unique, server-rendered intro paragraph generated from this
  // quiz's metadata (group, difficulty, question count, author + social proof).
  const introAvg = quiz.total_completions > 0 && questionCount > 0
    ? Math.round((quiz.total_score_sum / quiz.total_completions) / questionCount * 100)
    : null;
  const intro = `Test your ${quiz.group_name} knowledge with this ${quiz.difficulty} ${questionCount}-question quiz by ${quiz.creator_username}. ${
    introAvg !== null
      ? `${quiz.play_count.toLocaleString('en-US')} fans have already taken it, scoring ${introAvg}% on average. Think you can beat that?`
      : 'Be one of the first to take it on and set the score to beat.'
  }`;

  // SEO Fix 3: related quizzes - same group first (by plays), topped up with
  // popular quizzes so every quiz page exposes 4-6 crawlable <a href> links.
  const sameGroup = await safeFetch(
    getQuizzesByGroup(quiz.group_id, 'popular', 0, 8),
    [],
    '[q/[slug]] related sameGroup',
  );
  const related = sameGroup.filter((q) => q.id !== quiz.id).slice(0, 6);
  if (related.length < 4) {
    const popular = await safeFetch(
      getBrowseQuizzes({ sort: 'most_played', offset: 0, limit: 12 }),
      [],
      '[q/[slug]] related popular',
    );
    const have = new Set<string>([quiz.id, ...related.map((q) => q.id)]);
    for (const q of popular) {
      if (related.length >= 6) break;
      if (!have.has(q.id)) {
        related.push(q);
        have.add(q.id);
      }
    }
  }

  // Conditional trivia entry point: only shown when this group actually has a
  // trivia page (>=12 facts post-override), so ineligible groups link nowhere.
  const triviaAvailable = await safeFetch(
    hasTriviaPage(quiz.group_id, quiz.group_slug),
    false,
    '[q/[slug]] hasTriviaPage',
  );

  // M1.19 - per-quiz hall of fame (top scorers), ISR-baked + crawlable.
  const hallOfFame = await safeFetch(getQuizHallOfFame(quiz.id, 10), [], '[q/[slug]] hallOfFame');

  // SEO (audit v2): crawlable reactions + comments counts (the live widgets are
  // a client island shown post-play, so the COUNTS render into the server HTML).
  const social = await safeFetch(
    getQuizSocialCounts(quiz.id),
    { comments: 0, reactions: 0 },
    '[q/[slug]] social',
  );

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
    <div className="py-4 md:py-6">
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: `${quiz.group_name} Quiz`, href: `/${quiz.group_slug}-quiz` },
          { label: quiz.title },
        ]}
      />

      <QuizPlayer quiz={quizIntro} />

      {/* Owner / admin actions (Edit, Delete, Remove). Renders nothing for
          everyone else - client island so the page shell stays cacheable. */}
      <QuizOwnerActions quizId={quiz.id} creatorId={quizIntro.creatorId} />

      {/* SEO Fix 2 - unique server-rendered intro paragraph (crawlable lead text). */}
      <p className="text-sm text-secondary leading-relaxed mt-6 max-w-2xl">{intro}</p>

      {/* SEO (audit v2) - crawlable engagement counts. The live reaction/comment
          widgets are a post-play client island; these counts render server-side. */}
      {(social.reactions > 0 || social.comments > 0 || quizIntro.likeCount > 0) && (
        <p className="text-xs text-tertiary mt-2 max-w-2xl">
          {[
            quizIntro.likeCount > 0 && `${quizIntro.likeCount.toLocaleString('en-US')} like${quizIntro.likeCount === 1 ? '' : 's'}`,
            social.reactions > 0 && `${social.reactions.toLocaleString('en-US')} reaction${social.reactions === 1 ? '' : 's'}`,
            social.comments > 0 && `${social.comments.toLocaleString('en-US')} comment${social.comments === 1 ? '' : 's'}`,
          ].filter(Boolean).join(' · ')}
        </p>
      )}

      {/* M1.19 - per-quiz Hall of Fame (public, ISR-baked; personal rank is an island) */}
      <QuizHallOfFame quizId={quiz.id} entries={hallOfFame} />

      {/* J3 - entry point: learn the group's trivia before playing (conditional). */}
      {triviaAvailable && (
        <Link href={`/${quiz.group_slug}-trivia`} className="trivia-entry mt-6 max-w-2xl">
          <span className="trivia-entry-icon">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M3 4A1.5 1.5 0 014.5 2.5H9V14H4.5A1.5 1.5 0 003 15.5V4z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
              <path d="M15 4A1.5 1.5 0 0013.5 2.5H9V14h4.5A1.5 1.5 0 0115 15.5V4z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="trivia-entry-text">
            <span className="trivia-entry-title">Learn before you play: {quiz.group_name} trivia</span>
            <span className="trivia-entry-sub">Fun facts even hardcore {quiz.fandom_name}s might not know</span>
          </span>
          <svg className="trivia-entry-arrow" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      )}

      {/* SEO Fix 1 - server-rendered, crawlable review of every question.
          Spoiler-safe: options are listed plainly with NO correct answer marked. */}
      {seoQuestions.length > 0 && (
        <details className="quiz-review">
          <summary className="quiz-review-summary">
            Show the {seoQuestions.length} questions in this quiz
          </summary>
          <div className="quiz-review-body">
            <p className="quiz-review-note">
              A preview of every question in this {quiz.group_name} quiz. The correct
              answers are revealed only when you play.
            </p>
            <ol className="quiz-review-list">
              {seoQuestions.map((q, i) => {
                const options =
                  q.options && q.options.length > 0
                    ? q.options
                    : typeof q.correct === 'boolean'
                      ? ['True', 'False']
                      : [];
                return (
                  <li key={i} className="quiz-review-item">
                    <p className="quiz-review-q">{q.question}</p>
                    {q.clues && q.clues.length > 0 && (
                      <ul className="quiz-review-clues">
                        {q.clues.map((c, j) => (
                          <li key={j}>{c}</li>
                        ))}
                      </ul>
                    )}
                    {options.length > 0 && (
                      <ul className="quiz-review-options">
                        {options.map((opt, j) => {
                          // Image-option quiz types store { label, image_url }
                          // instead of plain strings. Render the label so React
                          // doesn't crash trying to render the object directly.
                          const text =
                            typeof opt === 'string'
                              ? opt
                              : (opt as { label?: string })?.label ?? '';
                          return <li key={j}>{text}</li>;
                        })}
                      </ul>
                    )}
                    {q.fun_fact && (
                      <p className="quiz-review-fact">
                        <span>Fun fact:</span> {q.fun_fact}
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        </details>
      )}

      {/* SEO Fix 3 - related quizzes: real crawlable <a href> links. */}
      {related.length > 0 && (
        <section className="related-quizzes" aria-label="Related quizzes">
          <h2 className="related-quizzes-title">More quizzes to play</h2>
          <ul className="related-quizzes-list">
            {related.map((rq) => (
              <li key={rq.id}>
                <a href={`/q/${rq.slug}`} className="related-quiz-link">
                  <span className="related-quiz-name">{rq.title}</span>
                  <span className="related-quiz-meta">
                    {rq.group_name} · {rq.play_count.toLocaleString('en-US')} plays
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Quiz',
            name: quiz.title,
            description: `A ${quiz.group_name} quiz created by ${quiz.creator_username} on KpopQuiz`,
            educationalAlignment: {
              '@type': 'AlignmentObject',
              alignmentType: 'educationalSubject',
              targetName: 'K-pop',
            },
            author: {
              '@type': 'Person',
              name: quiz.creator_username,
              url: `https://kpopquiz.org/u/${quiz.creator_username}`,
            },
            dateCreated: quiz.created_at,
            dateModified: quiz.updated_at,
            interactionStatistic: {
              '@type': 'InteractionCounter',
              interactionType: 'https://schema.org/PlayAction',
              userInteractionCount: quiz.play_count,
            },
            about: {
              '@type': 'Thing',
              name: quiz.group_name,
            },
            numberOfQuestions: questionCount,
            inLanguage: 'en',
            url: `https://kpopquiz.org/q/${quiz.slug}`,
          }),
        }}
      />
      {/* BreadcrumbList JSON-LD is emitted by <Breadcrumbs> above (Home › Group › Quiz). */}
    </div>
  );
}
