import { notFound } from 'next/navigation';

import { getQuizBySlug } from '@/lib/db/queries/quizzes';
import { getPassRate } from '@/lib/db/queries/plays';
import { QuizPlayer } from '@/components/quiz/quiz-player';

import type { Metadata } from 'next';

interface QuizPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: QuizPageProps): Promise<Metadata> {
  const { slug } = await params;
  const quiz = await getQuizBySlug(slug);

  if (!quiz) {
    return { title: 'Quiz Not Found' };
  }

  const questionLen = (quiz.questions as unknown[]).length;
  const avgScore = quiz.total_completions > 0 && questionLen > 0
    ? Math.round((quiz.total_score_sum / quiz.total_completions) / questionLen * 100)
    : null;

  const description = avgScore !== null
    ? `Play this ${quiz.group_name} quiz by ${quiz.creator_username}. ${quiz.play_count.toLocaleString('en-US')} fans have played - average score is ${avgScore}%. Can you do better?`
    : `Play this ${quiz.group_name} quiz by ${quiz.creator_username}. Test how well you really know ${quiz.group_name}!`;

  const ogImageUrl = `/api/og/${slug}`;

  return {
    title: quiz.title,
    description,
    openGraph: {
      title: `${quiz.title} | KpopQuizz`,
      description,
      url: `/q/${slug}`,
      type: 'article',
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: quiz.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${quiz.title} | KpopQuizz`,
      description,
      images: [ogImageUrl],
    },
    alternates: { canonical: `/q/${slug}` },
  };
}

export default async function QuizPage({ params }: QuizPageProps): Promise<React.ReactElement> {
  const { slug } = await params;
  const quiz = await getQuizBySlug(slug);

  if (!quiz) notFound();

  const questionCount = (quiz.questions as unknown[]).length;
  const passRate = quiz.total_completions > 0
    ? await getPassRate(quiz.id, questionCount)
    : null;

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
    fandomName: quiz.fandom_name,
    creatorUsername: quiz.creator_username,
    creatorAvatarUrl: quiz.creator_avatar_url,
    creatorAvatarBg: quiz.creator_avatar_bg,
    creatorAvatarText: quiz.creator_avatar_text,
    passRate,
    likeCount: quiz.like_count ?? 0,
  };

  return (
    <div className="py-6">
      <QuizPlayer quiz={quizIntro} />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Quiz',
            name: quiz.title,
            description: `A ${quiz.group_name} quiz created by ${quiz.creator_username} on KpopQuizz`,
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
          }),
        }}
      />
    </div>
  );
}
