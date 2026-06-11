import { notFound } from 'next/navigation';

import { getQuizBySlug } from '@/lib/db/queries/quizzes';
import { getPassRate } from '@/lib/db/queries/plays';
import { QuizPlayer } from '@/components/quiz/quiz-player';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { safeFetch } from '@/lib/error-handling';

import type { Metadata } from 'next';

// ISR: revalidate the cached HTML hourly (SEO Fix 1).
// NOTE: today the shared <TopNav> calls auth.getUser() (reads cookies), so every
// route still renders dynamically (SSR) and this window is dormant. The SEO win
// here is that the quiz questions are server-rendered into the HTML regardless.
// `generateStaticParams` is intentionally omitted: it conflicts with the
// cookie-reading layout at build time (see the group landing page note).
export const revalidate = 3600;

interface QuizPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: QuizPageProps): Promise<Metadata> {
  const { slug } = await params;
  const quiz = await safeFetch(getQuizBySlug(slug), null, '[q/[slug] metadata] getQuizBySlug');

  if (!quiz) {
    return { title: 'Quiz Not Found' };
  }

  const questionLen = (quiz.questions as unknown[]).length;
  const avgScore = quiz.total_completions > 0 && questionLen > 0
    ? Math.round((quiz.total_score_sum / quiz.total_completions) / questionLen * 100)
    : null;

  const description = `Test your ${quiz.group_name} knowledge with this ${quiz.difficulty} ${questionLen}-question quiz by ${quiz.creator_username}.${
    avgScore !== null
      ? ` ${quiz.play_count.toLocaleString('en-US')} fans have played — average score ${avgScore}%.`
      : ` Played by ${quiz.play_count.toLocaleString('en-US')} fans.`
  } Can you beat them?`;

  // Unique, descriptive <title>: "<Quiz Title> — <N> questions" (layout template
  // appends " | KpopQuiz"). Distinct per quiz so Google stops sampling templates.
  const title = `${quiz.title} — ${questionLen} questions`;
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
  // `correct` index is deliberately NOT read or rendered here — options are
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
      ? `${quiz.play_count.toLocaleString('en-US')} fans have already taken it, scoring ${introAvg}% on average — think you can beat that?`
      : 'Be one of the first to take it on and set the score to beat.'
  }`;

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
    creatorUsername: quiz.creator_username,
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

      {/* SEO Fix 2 — unique server-rendered intro paragraph (crawlable lead text). */}
      <p className="text-sm text-secondary leading-relaxed mt-6 max-w-2xl">{intro}</p>

      {/* SEO Fix 1 — server-rendered, crawlable review of every question.
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
                        {options.map((opt, j) => (
                          <li key={j}>{opt}</li>
                        ))}
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
