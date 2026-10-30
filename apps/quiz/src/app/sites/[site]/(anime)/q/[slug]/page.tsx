// Run O1 twin (rule 18) of apps/quiz/src/app/(site)/q/[slug]/page.tsx, rows 6, 7, 8: copied by scripts/o1/twins-codemod.mjs; kpop modules imported, not copied.
import { SITE, SITE_ID as O1_SITE_ID } from '@/lib/site/registry';
import { forSite } from '@/lib/site/scope';
import { notFound } from 'next/navigation';

import { jsonLdScript } from '@/lib/verse/jsonld';
import Link from 'next/link';

import { getQuizBySlug, getQuizzesByGroup, getBrowseQuizzes, getQuizCardsBySlugs } from '@/lib/db/queries/quizzes';
import { getHubQuizzes } from '@/lib/ux-v1/p3/data';
import { seriesSiblings } from '@/lib/seo/quiz-series';
import { getQuizExtraStats } from '@/lib/db/queries/plays';
import { RANKING_UNLOCK_VOTES } from '@/lib/constants';
import { normalizeFactKey } from '@/lib/trivia/fact-key';
import { stableIndex } from '@/lib/trivia/pick-fact';
import { getQuizHallOfFame } from '@/lib/db/queries/community';
import { getQuizSocialCounts } from '@/lib/db/queries/quiz-social';
import { getQuizExplanations } from '@/lib/db/queries/quiz-explanations';
import { buildAnswerRows, questionsJsonLd } from '@/lib/quiz/answers';
import { AboutQuizDrawer, QuizPlayer } from '@/components/quiz/legacy-islands';
import { QuizOwnerActions } from '@/components/quiz/quiz-owner-actions';
import { QuizHallOfFame } from '@/components/quiz/quiz-hall-of-fame';
import { QuizStatsBlock } from '@/components/quiz/quiz-stats-block';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { isNextInternalError, safeFetch } from '@/lib/error-handling';
import { getGroupArticleLinks } from '@/lib/articles/group-links';
import { scoreIsPerQuestion } from '@/lib/quiz/scoring';
import { averageText, quizAverage } from '@/lib/quiz/quiz-average';
import { buildInThisQuiz } from '@/lib/quiz/in-this-quiz';
import { sanitizeCreatorNote } from '@/lib/quiz/creator-note';
import { UX_V1 } from '@/lib/ux-v1';
import { renderUxQuizPage } from '@/app/(site)/q/[slug]/ux-page';
import { SpoilerGate } from '@/components/spoilers/spoiler-gate';
import { getSeriesHub } from '@/lib/anime/series';
import { arcName, hasTriviaPage as seriesHasTrivia, quizSpoilerLevel, shieldArcs, uniqueFacts } from '@/lib/anime/series-model';
import { maskTaggedQuestions, withoutTaggedQuestions } from '@/lib/anime/spoilers';

import { quizDescription, quizTitle } from '@/lib/seo/quiz-meta';

import type { Metadata } from 'next';
import type { BreadcrumbItem } from '@/components/ui/breadcrumbs';
import type { QuestionSpoiler } from '@/lib/anime/types';
import type { TriviaFact } from '@/lib/trivia/types';

// Bunnyverse: this build's base path, inlined by Next at build time ('' on kpop and hub, so the code is today's; '/anime' on the anime build).
const BASE_PATH = process.env.__NEXT_ROUTER_BASEPATH || '';

// ISR: cached HTML revalidates hourly. The TOP_PRERENDER most-played slugs
// pre-render at build time so Googlebot hits cold-cache static HTML with
// zero DB queries - direct relief for the crawl wave that saturates the
// NANO instance. Anything outside the top N still works via on-demand ISR
// (Next caches on first request, served from cache thereafter).
export const revalidate = 3600;
const TOP_PRERENDER = 1000;
// Run O1: the build params list only the slugs of this build's site (forSite), never the kpop catalog.
async function siteStaticParams(): Promise<Array<{ slug: string }>> {
  // Fail-soft: if the DB is saturated at build time, fall back to [] (every
  // slug becomes on-demand ISR like before). A degraded build is better
  // than a failed build.
  try {
    const { createPublicReadClient } = await import('@/lib/supabase/server');
    const supabase = createPublicReadClient();
    const BUILD_QUERY_TIMEOUT_MS = 10000;
    const sentinel = Symbol('top-slugs-timeout');
    const raced = await Promise.race([
      forSite(supabase
        .from('quizzes')
        .select('slug'), O1_SITE_ID)
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

/**
 * The quiz row, or a true 404 when no published quiz has this slug. SEO (owner, 2026-10-13):
 * at request time a failed or slow read THROWS instead of falling back to null. With the null
 * fallback a database blip became a cached "not found" (noindex) for an hour on a real,
 * indexed quiz; thrown, the render fails uncached and ISR keeps serving the last good page.
 *
 * At build (the TOP_PRERENDER pages) a throw fails the whole deploy: a CI build died on one
 * slow read (2026-10-14). There the read gets 25 s and one retry, and if it still fails the
 * page falls back to the 404 it had before this change, which ISR replaces within the hour.
 */
const BUILDING = process.env.NEXT_PHASE === 'phase-production-build';
async function quizOr404(slug: string): Promise<NonNullable<Awaited<ReturnType<typeof getQuizBySlug>>>> {
  const TIMEOUT = Symbol('timeout');
  const read = (ms: number): Promise<Awaited<ReturnType<typeof getQuizBySlug>> | typeof TIMEOUT> => Promise.race([
    getQuizBySlug(slug),
    new Promise<typeof TIMEOUT>((resolve) => setTimeout(() => resolve(TIMEOUT), ms)),
  ]);
  if (BUILDING) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const quiz = await read(25000);
        if (quiz === TIMEOUT) continue;
        if (!quiz) notFound();
        return quiz;
      } catch (err) {
        if (isNextInternalError(err)) throw err;
      }
    }
    console.warn(`[q/[slug]] build: the quiz read failed twice for ${slug}; on-demand ISR re-renders it`);
    notFound();
  }
  const quiz = await read(8000);
  if (quiz === TIMEOUT) throw new Error(`[q/[slug]] getQuizBySlug timed out for ${slug}`);
  if (!quiz) notFound();
  return quiz;
}

export async function generateMetadata({ params }: QuizPageProps): Promise<Metadata> {
  const { slug } = await params;
  const quiz = await quizOr404(slug);

  const questionLen = (quiz.questions as unknown[]).length;
  const average = quizAverage({ total_score_sum: quiz.total_score_sum, total_completions: quiz.total_completions, question_count: questionLen, quiz_type: quiz.quiz_type });

  // SEO indexguard PART 4 + 2026-10-13: the creator's note when it says something, else a
  // sentence from the quiz's real data; the title never cut inside a word (lib/seo/quiz-meta.ts).
  const creatorNote = sanitizeCreatorNote(quiz.settings?.creator_note);
  const description = quizDescription({
    title: quiz.title, difficulty: quiz.difficulty, questionCount: questionLen, groupName: quiz.group_name,
    creator: quiz.creator_username, plays: quiz.play_count, average: average ? averageText(average) : null, creatorNote: creatorNote ?? null,
  });
  const title = quizTitle(quiz.title, questionLen);
  const ogImageUrl = `/api/og/${slug}`;

  return {
    title,
    description,
    openGraph: {
      title: `${title} | OtakuQuiz`,
      description,
      url: `/q/${slug}`,
      type: 'article',
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: quiz.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | OtakuQuiz`,
      description,
      images: [ogImageUrl],
    },
    alternates: { canonical: `/q/${slug}` },
  };
}

export default async function QuizPage({ params }: QuizPageProps): Promise<React.ReactElement> {
  const { slug } = await params;
  const quiz = await quizOr404(slug);

  const questionCount = (quiz.questions as unknown[]).length;

  // A5: the series of the quiz (arcs, stored level, sourced facts). Read-through cache shared with the series hub; a
  // failed read leaves the page without the shield rather than failing it.
  const hub = await safeFetch(getSeriesHub(quiz.group_slug), null, '[q/[slug]] getSeriesHub');
  const taggedQuestions = (quiz.questions as Array<{ spoiler?: QuestionSpoiler }>) ?? [];
  const spoilerLevel = quizSpoilerLevel(hub, quiz.slug, taggedQuestions);

  // SEO-3 U1: extra stats not on the quiz row (fastest time, perfect scores,
  // passing count, total plays-table rows). Only fetched when there is at
  // least one play - saves a DB round trip on brand-new quizzes.
  //
  // C3: pass rate is derived from what this call already returns
  // (passingPlays / totalPlaysWithScore), so we do NOT also call
  // getPassRate here. Two fewer round trips per render and the pass rate
  // is mathematically guaranteed to share its denominator with the Plays
  // cell. Leave getPassRate in place for its other callers.
  const extraStats = quiz.play_count > 0
    ? await safeFetch(
        getQuizExtraStats(quiz.id, questionCount),
        { fastestTimeSeconds: null, perfectScoreCount: 0, passingPlays: 0, totalPlaysWithScore: 0 },
        '[q/[slug]] getQuizExtraStats',
      )
    : { fastestTimeSeconds: null, perfectScoreCount: 0, passingPlays: 0, totalPlaysWithScore: 0 };

  const passRate = extraStats.totalPlaysWithScore > 0
    ? Math.round((extraStats.passingPlays / extraStats.totalPlaysWithScore) * 100)
    : null;

  // SEO Fix 1: spoiler-safe question list rendered into the server HTML so the
  // unique quiz content (questions, options, fun facts) is crawlable. The
  // `correct` index is deliberately NOT read or rendered here - options are
  // listed plainly so the answer is never given away in the markup.
  // A5: a question tagged with an arc above 0 never reaches the HTML or the JSON-LD, so it is dropped here.
  const seoQuestions = withoutTaggedQuestions((quiz.questions as Array<{
    question?: string;
    options?: string[];
    fun_fact?: string;
    clues?: string[];
    correct?: number | boolean;
    spoiler?: QuestionSpoiler;
  }>) ?? []);

  // SEO-3 U2: dynamic intro with variation branches. Sentence STRUCTURE
  // changes with data availability so pages do not read identical.
  //
  // R3: the plays TABLE is the source of truth. Use extra.totalPlaysWithScore
  // when it is available; fall back to quiz.play_count (the counter row) when
  // the extra query was skipped or degraded. The stats block quotes the same
  // number, so the page reads consistently top to bottom.
  //
  // C2: gate on the same base as the display (plays), using the shared
  // RANKING_UNLOCK_VOTES constant. Zero numeric literals for the threshold.
  //
  // C4: score-derived metrics only render for quiz types where `score` is
  // per-question (perfect run == qcount). guess_from_clues awards multiple
  // points per question by speed, so its avg %, pass rate, and perfect
  // count are all meaningless under the qcount model. The same predicate
  // gates the stats block below.
  const perQuestionScore = scoreIsPerQuestion(quiz.quiz_type);
  const plays =
    extraStats.totalPlaysWithScore > 0
      ? extraStats.totalPlaysWithScore
      : quiz.play_count;
  // One average for the whole page (owner, 2026-10-28): from 30 completed plays, per-question scoring
  // only, always written with its denominator (lib/quiz/quiz-average.ts, rulebook 4.3 exception).
  const pageAverage = quizAverage({ total_score_sum: quiz.total_score_sum, total_completions: quiz.total_completions, question_count: questionCount, quiz_type: quiz.quiz_type });
  const introAvg = pageAverage?.pct ?? null;
  // C4: perfect count is only meaningful when a perfect run == qcount;
  // otherwise the underlying rows do not match "perfect" as a user reads it.
  const introPerfCount = perQuestionScore ? extraStats.perfectScoreCount : 0;
  const base = `Test your ${quiz.group_name} knowledge with this ${quiz.difficulty} ${questionCount}-question quiz by ${quiz.creator_username}.`;
  let socialProof: string;
  if (plays === 0) {
    // Branch A: brand new
    socialProof = 'Be one of the first to take it on and set the score to beat.';
  } else if (plays < RANKING_UNLOCK_VOTES) {
    // Branch B: honest smallness - never fake community activity
    socialProof = `${plays.toLocaleString('en-US')} ${plays === 1 ? 'player has' : 'players have'} tried it so far.`;
  } else if (plays < 1000) {
    // Branch C: standard social proof (avg is gated by threshold-30 above
    // AND by perQuestionScore below)
    socialProof = pageAverage
      ? `${plays.toLocaleString('en-US')} fans have taken it (${averageText(pageAverage)}). Think you can beat that?`
      : `${plays.toLocaleString('en-US')} fans have already tried it.`;
  } else {
    // Branch D: popular quiz - vary the framing by score profile.
    // R5: no editorial. State the perfect-count figure without judgement.
    // C4: falls through to the generic arm when perQuestionScore is false,
    // since introAvg and introPerfCount are both suppressed for those types.
    if (introPerfCount > 0 && pageAverage && pageAverage.pct < 60) {
      socialProof = `${plays.toLocaleString('en-US')} fans have battled it (${averageText(pageAverage)}), and ${introPerfCount.toLocaleString('en-US')} have scored perfect. Join them?`;
    } else if (pageAverage) {
      socialProof = `${plays.toLocaleString('en-US')} fans have taken it (${averageText(pageAverage)}). See where you land.`;
    } else {
      socialProof = `${plays.toLocaleString('en-US')} fans have played it.`;
    }
  }
  const intro = `${base} ${socialProof}`;

  // SEO Fix 3: related quizzes - same group first (by plays), topped up with
  // popular quizzes so every quiz page exposes 4-6 crawlable <a href> links.
  // SEO (2026-10-13): half most played, half newest. Every quiz page of a group then links
  // the group's newest quizzes, so a new quiz is reached from pages Google already knows
  // (with the most played only, every page of a group showed the same six cards).
  // SEO phase 1, PR 12: up to 3 quizzes of the same series intent first (lib/seo/quiz-series.ts, titles of the
  // series' published quizzes), so a new quiz is linked from its siblings on its first render.
  const siblings = seriesSiblings(quiz, await safeFetch(getHubQuizzes(quiz.group_id), [], '[q/[slug]] group published'), { name: quiz.group_name, fandom: quiz.fandom_name }, 3);
  const leadCards = siblings.length > 0 ? await safeFetch(getQuizCardsBySlugs(siblings), [], '[q/[slug]] series related') : [];
  const [sameGroup, newestInGroup] = await Promise.all([
    safeFetch(getQuizzesByGroup(quiz.group_id, 'popular', 0, 8), [], '[q/[slug]] related sameGroup'),
    safeFetch(getQuizzesByGroup(quiz.group_id, 'newest', 0, 8), [], '[q/[slug]] related newest'),
  ]);
  const related: typeof sameGroup = [...leadCards];
  {
    const seen = new Set<string>([quiz.id, ...leadCards.map((q) => q.id)]);
    const popularPick = sameGroup.filter((q) => !seen.has(q.id));
    const newestPick = newestInGroup.filter((q) => !seen.has(q.id));
    for (let i = 0; related.length < 6 && (i < popularPick.length || i < newestPick.length); i++) {
      for (const q of [popularPick[i], newestPick[i]]) {
        if (q && !seen.has(q.id) && related.length < 6) { related.push(q); seen.add(q.id); }
      }
    }
  }
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
  // trivia page (>= TRIVIA_MIN_FACTS facts post-override), so ineligible groups link nowhere.
  const triviaAvailable = hub ? seriesHasTrivia(hub.trivia) : false;

  // SEO-4 (O3) + SEO-5 (B): ONE real fact, distinct + stable per quiz, for the inline
  // "Did you know?" card. The pool merges the DERIVED group fun-facts (getOverriddenFacts,
  // React-cache()'d so it dedupes with hasTriviaPage above) with the entity-level STORED
  // trivia (migration 149, sourced + covenant-checked), deduped by the shared fact key
  // (derived wins on a tie). One fact is then picked stably; 0 in both -> nothing.
  // A5: the facts of the group's quizzes are not used here (a tagged question's fun fact is a spoiler); the pool is the
  // series' stored, sourced facts.
  const derivedFacts: TriviaFact[] = [];
  const storedFacts: TriviaFact[] = hub
    ? uniqueFacts(hub.trivia).map((f) => ({ fact: f.fact, category: f.category, sourceQuizTitle: '', sourceQuizSlug: '' }))
    : [];
  const dykPool: typeof derivedFacts = [];
  const seenFactKeys = new Set<string>();
  for (const f of [...derivedFacts, ...storedFacts]) {
    const key = normalizeFactKey(f.fact);
    if (seenFactKeys.has(key)) continue;
    seenFactKeys.add(key);
    dykPool.push(f);
  }
  const dykFact = dykPool.length ? dykPool[stableIndex(quiz.id, dykPool.length)] : null;

  // M1.19 - per-quiz hall of fame (top scorers), ISR-baked + crawlable.
  // (UX v11 reads its own board, without relaxed runs: skip this read when the flag is on.)
  const hallOfFame = UX_V1 ? [] : await safeFetch(getQuizHallOfFame(quiz.id, 10), [], '[q/[slug]] hallOfFame');
  // W2b C2 - ONE page-level query for the whole leaderboard (3 bounded reads,
  // constant in the number of rows). A per-row lookup would be N+1.

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

  const inThisQuiz = buildInThisQuiz({ ...quiz, questions: maskTaggedQuestions(taggedQuestions) as typeof quiz.questions });
  const creatorNote = sanitizeCreatorNote(quiz.settings?.creator_note);

  // Shared by both renders so the flag-on page emits the same breadcrumb trail and
  // the same Quiz JSON-LD object as today (SEO lock: H1, intro, JSON-LD unchanged).
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Home', href: '/' },
    { label: `${quiz.group_name} Quiz`, href: `/${quiz.group_slug}-quiz` },
    { label: quiz.title },
  ];
  // QA class 4: quiz.title (user-authored) escaped at the sink.
  // SEO-3 Step 4: enriched Quiz JSON-LD.
  // - `about`: MusicGroup (correct type for K-pop groups)
  // - `assesses`: group name (what the quiz measures knowledge of)
  // - `educationalLevel`: difficulty (real value from quiz row)
  // - `hasPart`: Question array with `name` only, no suggestedAnswer
  //   (structured question inventory without exposing correct answers)
  // - `interactionStatistic`: play count + a second counter for
  //   completions when total_completions > 0
  // - Multiple crawlable stats already inline in DOM via QuizStatsBlock.
  const quizJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Quiz',
    name: quiz.title,
    description: `A ${quiz.group_name} quiz created by ${quiz.creator_username} on OtakuQuiz`,
    educationalAlignment: {
      '@type': 'AlignmentObject',
      alignmentType: 'educationalSubject',
      targetName: 'anime',
    },
    educationalLevel: quiz.difficulty,
    assesses: quiz.group_name,
    keywords: `${quiz.group_name}, anime, ${quiz.difficulty} quiz`,
    author: {
      '@type': 'Person',
      name: quiz.creator_username,
      url: `${SITE.url}/u/${quiz.creator_username}`,
    },
    dateCreated: quiz.created_at,
    // Not updated_at: record_play bumps it on every play (a play is not an edit).
    dateModified: quiz.created_at,
    interactionStatistic: [
      {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/PlayAction',
        userInteractionCount: quiz.play_count,
      },
      ...(quiz.total_completions > 0
        ? [
            {
              '@type': 'InteractionCounter',
              interactionType: 'https://schema.org/CompleteAction',
              userInteractionCount: quiz.total_completions,
            },
          ]
        : []),
      ...(quiz.like_count && quiz.like_count > 0
        ? [
            {
              '@type': 'InteractionCounter',
              interactionType: 'https://schema.org/LikeAction',
              userInteractionCount: quiz.like_count,
            },
          ]
        : []),
    ],
    about: {
      '@type': 'TVSeries',
      name: quiz.group_name,
      url: `${SITE.url}/${quiz.group_slug}-quiz`,
    },
    hasPart: seoQuestions
      .map((q) => q.question)
      .filter((text): text is string => typeof text === 'string' && text.length > 0)
      .map((text) => ({ '@type': 'Question', name: text })),
    numberOfQuestions: questionCount,
    inLanguage: quiz.language && /^[a-z]{2}$/.test(quiz.language) ? quiz.language : 'en',
    url: `${SITE.url}/q/${quiz.slug}`,
  };

  // A5: the interstitial and the shield, for a quiz whose level is above 0.
  const gate = hub && spoilerLevel.arcOrd > 0 ? (
    <SpoilerGate
      seriesSlug={hub.group.slug}
      groupId={hub.group.id}
      name={hub.group.name}
      level={{ arc: spoilerLevel.arcOrd, scope: spoilerLevel.scope }}
      arcName={arcName(hub.arcs, spoilerLevel.arcOrd)}
      arcs={shieldArcs(hub.arcs)}
    />
  ) : undefined;

  // UX v11 (P4): the redesigned quiz page, game and results, behind the flag. Same
  // H1, intro paragraph, question list, links and JSON-LD; server rendered like today.
  if (UX_V1) {
    // Answers & explanations (SEO phase 1): the same arc 0 questions as the questions block, with
    // their index in quiz.questions (the key of quiz_explanations); the JSON-LD carries the same answers.
    const shown = withoutTaggedQuestions(((quiz.questions as Array<{ question?: string; options?: string[]; correct?: number | boolean; fun_fact?: string; spoiler?: QuestionSpoiler }>) ?? [])
      .map((q, qIndex) => ({ q, qIndex, spoiler: q.spoiler })));
    const answers = buildAnswerRows(shown, await safeFetch(getQuizExplanations(quiz.id), [], '[q/[slug]] explanations'));
    return renderUxQuizPage({
      quiz,
      // Fusion A5: main's page takes the shown title; the anime H1 stays the stored title until the SEO lot of the quiz pages.
      heading: quiz.title,
      questionCount,
      intro,
      introAvg,
      perQuestionScore,
      extraStats,
      passRate,
      seoQuestions,
      related,
      triviaAvailable,
      dykFact: dykFact ? { fact: dykFact.fact, category: dykFact.category } : null,
      social,
      inThisQuiz,
      creatorNote: creatorNote ?? null,
      breadcrumbItems,
      quizJsonLd: { ...quizJsonLd, hasPart: questionsJsonLd(shown, answers) },
      answers,
      origin: SITE.url,
      ...(gate ? { gate } : {}),
    });
  }

  return (
    <div className="py-4 md:py-6">
      <Breadcrumbs
        items={breadcrumbItems}
      />

      <QuizPlayer quiz={quizIntro} />

      {/* Owner / admin actions (Edit, Delete, Remove). Renders nothing for
          everyone else - client island so the page shell stays cacheable. */}
      <QuizOwnerActions quizId={quiz.id} creatorId={quizIntro.creatorId} />

      {/* UI-1 zone 5 - every server-rendered SEO block below the player now
          lives inside one "About this quiz" drawer. Server renders it OPEN, so
          the crawler and a cold visitor get all of it exactly as before; it
          only collapses client-side for a visitor who has just played. Not one
          crawlable string is edited, reworded or removed here: the drawer is a
          container, its children are byte-identical to what shipped before. */}
      <AboutQuizDrawer
        title="About this quiz"
        summary="Stats, leaderboard, the questions, and more"
      >
      {/* SEO indexguard PART 4 - the creator's own note, a crawlable human intro
          under the title (unique per page). Sanitized at write + read. */}
      {creatorNote && (
        <p className="text-[15px] text-primary leading-relaxed mt-6 max-w-2xl font-medium">{creatorNote}</p>
      )}

      {/* SEO Fix 2 - unique server-rendered intro paragraph (crawlable lead text). */}
      <p className="quiz-about-lead mt-6">{intro}</p>

      {/* SEO indexguard PART 3 - cold-start "In this quiz" block. Crawlable, unique by
          construction (derived only from THIS quiz's data), spoiler-safe (prompts only).
          It sits BELOW the QuizPlayer, so the play CTA stays above the fold.
          UI-1 polish: carded, same tokens as the rest; the text is unchanged. */}
      {inThisQuiz && (
        <section className="quiz-inthis" aria-label="In this quiz">
          <h2 className="quiz-inthis-h">In this quiz</h2>
          <p className="quiz-inthis-sub">
            {inThisQuiz.contextLine}. {inThisQuiz.topicsLine.charAt(0).toUpperCase() + inThisQuiz.topicsLine.slice(1)}.
          </p>
          {inThisQuiz.sampleQuestions.length > 0 && (
            <>
              <p className="quiz-inthis-taste">A taste of the questions (no answers):</p>
              <ul className="quiz-inthis-qs">
                {inThisQuiz.sampleQuestions.map((q, i) => (
                  <li key={i}><span>{q}</span></li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      {/* SEO (audit v2) - crawlable engagement counts. The live reaction/comment
          widgets are a post-play client island; these counts render server-side. */}
      {(social.reactions > 0 || social.comments > 0 || quizIntro.likeCount > 0) && (
        <p className="quiz-about-counts">
          {[
            quizIntro.likeCount > 0 && `${quizIntro.likeCount.toLocaleString('en-US')} like${quizIntro.likeCount === 1 ? '' : 's'}`,
            social.reactions > 0 && `${social.reactions.toLocaleString('en-US')} reaction${social.reactions === 1 ? '' : 's'}`,
            social.comments > 0 && `${social.comments.toLocaleString('en-US')} comment${social.comments === 1 ? '' : 's'}`,
          ].filter(Boolean).join(' · ')}
        </p>
      )}

      {/* SEO-3 U1 - real per-quiz stats block. Crawlable numbers, threshold
          gates ranking-ish metrics (hidden below the shared unlock line).
          Renders nothing on zero-play quizzes. C4: quiz-type-aware -
          score-derived cells are suppressed for types where score is not
          per-question (guess_from_clues today). */}
      <QuizStatsBlock
        playCount={quiz.play_count}
        quizType={quiz.quiz_type}
        avgScorePercent={introAvg}
        passRatePercent={passRate}
        likeCount={quiz.like_count ?? 0}
        extra={extraStats}
      />

      {/* M1.19 - per-quiz Hall of Fame (public, ISR-baked; personal rank is an island) */}
      <QuizHallOfFame quizId={quiz.id} entries={hallOfFame} isClues={quiz.quiz_type === 'guess_from_clues'} />


      {/* SEO-4 (O3) - inline "Did you know?" card: ONE real fact, distinct per quiz.
          Shows a taste on the page itself; the trivia-entry below links to the full
          page. Honest emptiness: no fact -> nothing. */}
      {dykFact && (
        <aside className="quiz-dyk mt-6 max-w-2xl" aria-label="Did you know?">
          <span className="quiz-dyk-icon" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 1.5a5 5 0 00-3 9v1.75c0 .41.34.75.75.75h4.5c.41 0 .75-.34.75-.75V10.5a5 5 0 00-3-9z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
              <path d="M7 15.5h4M7.5 17h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </span>
          <div className="quiz-dyk-body">
            <span className="quiz-dyk-eyebrow">Did you know{dykFact.category ? ` · ${dykFact.category}` : ''}</span>
            <p className="quiz-dyk-fact">{dykFact.fact}</p>
          </div>
        </aside>
      )}

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
                <a href={`${BASE_PATH}/q/${rq.slug}`} className="related-quiz-link">
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

      {/* SEO-3 Step 3 - link back to enriched group articles when they exist.
          Extends the group-links.ts pattern that powers /[slug]-quiz pages.
          Passes link equity from every /q/* page to the /articles/ hub. */}
      {(() => {
        const articleLinks = getGroupArticleLinks(quiz.group_slug);
        if (articleLinks.length === 0) return null;
        return (
          <section className="related-quizzes" aria-label={`Read more about ${quiz.group_name}`}>
            <h2 className="related-quizzes-title">Read more about {quiz.group_name}</h2>
            <ul className="quiz-article-links">
              {articleLinks.map((link) => (
                <li key={link.slug}>
                  <a href={`${BASE_PATH}/articles/${link.slug}`} className="quiz-article-link">
                    {link.label}
                  </a>
                </li>
              ))}
              <li>
                <a href={`${BASE_PATH}/${quiz.group_slug}-quiz`} className="quiz-article-link">
                  All {quiz.group_name} quizzes
                </a>
              </li>
            </ul>
          </section>
        );
      })()}
      </AboutQuizDrawer>

      {/* QA class 4 / SEO-3 Step 4: the enriched Quiz JSON-LD (built above, shared
          with the UX v11 render so both emit the same object). */}
      {jsonLdScript(quizJsonLd)}
      {/* BreadcrumbList JSON-LD is emitted by <Breadcrumbs> above (Home › Group › Quiz). */}
    </div>
  );
}

// Run O1: a child of app/sites/[site] returns its params with the parent's site, and nothing on the kpop build
// (the [site] layout generates no site there and refuses params without one).
export async function generateStaticParams({ params }: { params?: { site?: string } } = {}): Promise<Array<Record<string, string>>> {
  if (O1_SITE_ID === 'kpop' || !params?.site) return [];
  return (await siteStaticParams()).map((p) => ({ ...p, site: params.site as string }));
}
