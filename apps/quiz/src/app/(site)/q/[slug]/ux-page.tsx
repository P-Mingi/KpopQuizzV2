import { P4QuizPage } from '@/components/quiz/ux-v1/quiz-page';
import { safeFetch } from '@/lib/error-handling';
import { getGroupArticleLinks } from '@/lib/articles/group-links';
import { groupPhotoUrl } from '@/lib/ux-v1/a0/group-photos';
import { averagePct } from '@/lib/ux-v1/p4/engine';
import {
  getP4Creator, getP4GroupPlaylist, getP4GroupQuizCount, getP4HallOfFame, relaxedRunsLive,
} from '@/lib/ux-v1/p4/queries';

import type { BreadcrumbItem } from '@/components/ui/breadcrumbs';
import type { QuizCardData, QuizWithGroup } from '@/lib/db/types';
import type { InThisQuizData } from '@/lib/quiz/in-this-quiz';
import type { P4ReviewQuestion } from '@/components/quiz/ux-v1/quiz-page';
import type { P4RunQuiz } from '@/components/quiz/ux-v1/run-context';

// UX v11 render of /q/[slug] (P4). Called by page.tsx only when NEXT_PUBLIC_UX_V1 is
// on, AFTER the page computed everything today's render uses (quiz, intro, stats,
// related, trivia, fact, social counts, the JSON-LD objects): those are passed in
// unchanged, so the SEO text and structured data are the same objects. The extra
// reads here are v11-only, public, cached at the stats TTL, and fail soft.

const MAX_PROMPT = 160;

interface Args {
  quiz: QuizWithGroup;
  questionCount: number;
  intro: string;
  introAvg: number | null;
  perQuestionScore: boolean;
  extraStats: { fastestTimeSeconds: number | null; perfectScoreCount: number; passingPlays: number; totalPlaysWithScore: number };
  passRate: number | null;
  seoQuestions: P4ReviewQuestion[];
  related: QuizCardData[];
  triviaAvailable: boolean;
  dykFact: { fact: string; category?: string | null } | null;
  social: { comments: number; reactions: number };
  inThisQuiz: InThisQuizData | null;
  creatorNote: string | null;
  breadcrumbItems: BreadcrumbItem[];
  quizJsonLd: Record<string, unknown>;
}

export async function renderUxQuizPage(a: Args): Promise<React.ReactElement> {
  const { quiz } = a;
  const creatorId = (quiz as { creator_id?: string }).creator_id ?? null;
  const relaxedLive = await safeFetch(relaxedRunsLive(), false, '[q/[slug] ux] relaxedLive');
  const [hof, creator, groupQuizCount, playlist] = await Promise.all([
    safeFetch(getP4HallOfFame(quiz.id, 5, relaxedLive), [], '[q/[slug] ux] hallOfFame'),
    creatorId ? safeFetch(getP4Creator(creatorId), null, '[q/[slug] ux] creator') : Promise.resolve(null),
    safeFetch(getP4GroupQuizCount(quiz.group_id), null, '[q/[slug] ux] groupQuizCount'),
    safeFetch(getP4GroupPlaylist(quiz.group_slug), null, '[q/[slug] ux] playlist'),
  ]);

  const groupPhoto = groupPhotoUrl(quiz.group_slug);
  const cover = quiz.cover_image_url ?? groupPhoto;
  const settings = quiz.settings ?? { timer: true, timer_seconds: 15, shuffle: false, show_answers: true };
  const prompts = a.seoQuestions
    .map((q) => (typeof q.question === 'string' ? q.question.trim() : ''))
    .filter((s) => s.length > 0)
    .slice(0, 3)
    .map((s) => (s.length > MAX_PROMPT ? `${s.slice(0, MAX_PROMPT - 3).trimEnd()}...` : s));

  const run: P4RunQuiz = {
    id: quiz.id,
    slug: quiz.slug,
    title: quiz.title,
    quizType: quiz.quiz_type,
    difficulty: quiz.difficulty,
    questionCount: a.questionCount,
    playCount: quiz.play_count,
    likeCount: quiz.like_count ?? 0,
    groupName: quiz.group_name,
    groupSlug: quiz.group_slug,
    photo: cover,
    groupPhoto,
    creatorUsername: quiz.creator_username,
    averagePct: averagePct(quiz.total_score_sum, quiz.total_completions, a.questionCount, quiz.quiz_type),
    timerOn: Boolean(settings.timer),
    timerSeconds: settings.timer_seconds || 15,
    relaxedLive,
    commentCount: a.social.comments,
    keepPlaying: a.related
      .filter((r) => r.group_slug === quiz.group_slug)
      .slice(0, 3)
      .map((r) => ({ slug: r.slug, title: r.title, quizType: r.quiz_type, difficulty: r.difficulty, plays: r.play_count, photo: groupPhotoUrl(r.group_slug) ?? r.cover_image_url })),
    playlist,
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: a.breadcrumbItems.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.label,
      ...(item.href ? { item: `https://kpopquiz.org${item.href}` } : {}),
    })),
  };

  return (
    <P4QuizPage
      run={run}
      quiz={{
        id: quiz.id,
        slug: quiz.slug,
        title: quiz.title,
        quizType: quiz.quiz_type,
        difficulty: quiz.difficulty,
        questionCount: a.questionCount,
        playCount: quiz.play_count,
        groupName: quiz.group_name,
        groupSlug: quiz.group_slug,
        creatorId,
        creatorUsername: quiz.creator_username,
        creatorXp: quiz.creator_xp ?? 0,
        creatorAvatarUrl: quiz.creator_avatar_url,
        cover,
      }}
      crumbs={a.breadcrumbItems}
      breadcrumbJsonLd={breadcrumbJsonLd}
      quizJsonLd={a.quizJsonLd}
      intro={a.intro}
      creatorNote={a.creatorNote}
      introAvg={a.introAvg}
      perQuestionScore={a.perQuestionScore}
      extra={{ fastestTimeSeconds: a.extraStats.fastestTimeSeconds, perfectScoreCount: a.extraStats.perfectScoreCount }}
      passRate={a.passRate}
      counts={{ likes: quiz.like_count ?? 0, reactions: a.social.reactions, comments: a.social.comments }}
      inThisQuiz={a.inThisQuiz}
      prompts={prompts}
      review={a.seoQuestions}
      dyk={a.dykFact}
      triviaAvailable={a.triviaAvailable}
      fandomName={quiz.fandom_name}
      hof={hof}
      related={a.related}
      groupQuizCount={groupQuizCount}
      articleLinks={getGroupArticleLinks(quiz.group_slug).map((l) => ({ slug: l.slug, label: l.label }))}
      creator={creator}
    />
  );
}
