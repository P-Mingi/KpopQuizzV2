import { notFound } from 'next/navigation';

import { jsonLdScript } from '@/lib/verse/jsonld';
import Link from 'next/link';

import { getQuizBySlug, getQuizzesByGroup, getBrowseQuizzes } from '@/lib/db/queries/quizzes';
import { getQuizExtraStats } from '@/lib/db/queries/plays';
import { RANKING_UNLOCK_VOTES } from '@/lib/db/queries/duels';
import { hasTriviaPage } from '@/lib/db/queries/trivia';
import { getOverriddenFacts } from '@/lib/trivia/facts';
import { getStoredGroupTrivia } from '@/lib/trivia/stored-facts';
import { normalizeFactKey } from '@/lib/trivia/fact-key';
import { stableIndex } from '@/lib/trivia/pick-fact';
import { getQuizHallOfFame } from '@/lib/db/queries/community';
import { countOpenRunsForQuiz } from '@/lib/db/queries/open-runs';
import { OpenRunsBlock } from '@/components/group/open-runs-block';
import { getQuizSocialCounts } from '@/lib/db/queries/quiz-social';
import { QuizPlayer } from '@/components/quiz/quiz-player';
import { QuizOwnerActions } from '@/components/quiz/quiz-owner-actions';
import { QuizHallOfFame } from '@/components/quiz/quiz-hall-of-fame';
import { QuizStatsBlock } from '@/components/quiz/quiz-stats-block';
import { AboutQuizDrawer } from '@/components/quiz/about-quiz-drawer';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { safeFetch } from '@/lib/error-handling';
import { getGroupArticleLinks } from '@/lib/articles/group-links';
import { scoreIsPerQuestion } from '@/lib/quiz/scoring';
import { buildInThisQuiz } from '@/lib/quiz/in-this-quiz';
import { sanitizeCreatorNote } from '@/lib/quiz/creator-note';

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

  // SEO indexguard PART 4: the creator's own note (unique, human) beats the template
  // description when present. Re-sanitized on read (defense in depth + old rows), and
  // trimmed to a meta-friendly length (Google truncates ~155).
  const creatorNote = sanitizeCreatorNote(quiz.settings?.creator_note);
  // CTR sprint W1: the template used to name the GROUP but never the quiz itself,
  // so two different quizzes in the same group with the same difficulty, question
  // count, creator, play count and average rendered a byte-identical description
  // (check:metadata-dupes caught 2 such pairs live). Leading with the quiz's own
  // title makes it vary by construction, and it is better copy: the searcher sees
  // what this specific quiz is about.
  const templateDescription = `${quiz.title}: a ${quiz.difficulty} ${questionLen}-question K-pop quiz on ${quiz.group_name}, made by ${quiz.creator_username}.${
    avgScore !== null
      ? ` ${quiz.play_count.toLocaleString('en-US')} fans have played it, scoring ${avgScore}% on average.`
      : ` Played by ${quiz.play_count.toLocaleString('en-US')} fans.`
  } Can you beat them?`;
  const description = creatorNote
    ? (creatorNote.length > 155 ? `${creatorNote.slice(0, 152).trimEnd()}...` : creatorNote)
    : templateDescription;

  // Unique, descriptive <title>: "<Quiz Title> - <N> questions" (layout template
  // appends " | KpopQuiz"). Distinct per quiz so Google stops sampling templates.
  // Bing flagged long titles: keep the rendered <title> (core + " | KpopQuiz")
  // under ~60 chars. Add the question count only when it fits; truncate a very
  // long user title rather than overflow.
  // CTR sprint W1: head-truncation collided. Quiz titles in this catalogue are
  // routinely distinguished by their LAST few words ("... girl groups" vs
  // "... boy groups", "... artists (2)"), so cutting the tail off made two
  // different quizzes render one identical title. Ellipsize the MIDDLE instead:
  // the head keeps the keyword, the tail keeps what makes this quiz distinct.
  const countSuffix = ` · ${questionLen} questions`;
  const titleRoom = 49 - countSuffix.length;
  const TAIL = 12;
  const titleCore = quiz.title.length <= titleRoom
    ? quiz.title
    : `${quiz.title.slice(0, titleRoom - 3 - TAIL).trimEnd()}...${quiz.title.slice(-TAIL).trimStart()}`;
  const title = `${titleCore}${countSuffix}`;
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
  const seoQuestions = (quiz.questions as Array<{
    question?: string;
    options?: string[];
    fun_fact?: string;
    clues?: string[];
    correct?: number | boolean;
  }>) ?? [];

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
  const scoresUnlocked = plays >= RANKING_UNLOCK_VOTES;
  const introAvg = perQuestionScore && scoresUnlocked && questionCount > 0 && quiz.total_completions > 0
    ? Math.round((quiz.total_score_sum / quiz.total_completions) / questionCount * 100)
    : null;
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
    socialProof = introAvg !== null
      ? `${plays.toLocaleString('en-US')} fans have taken it, averaging ${introAvg}%. Think you can beat that?`
      : `${plays.toLocaleString('en-US')} fans have already tried it.`;
  } else {
    // Branch D: popular quiz - vary the framing by score profile.
    // R5: no editorial. State the perfect-count figure without judgement.
    // C4: falls through to the generic arm when perQuestionScore is false,
    // since introAvg and introPerfCount are both suppressed for those types.
    if (introPerfCount > 0 && introAvg !== null && introAvg < 60) {
      socialProof = `${plays.toLocaleString('en-US')} fans have battled it (avg ${introAvg}%), and ${introPerfCount.toLocaleString('en-US')} have scored perfect. Join them?`;
    } else if (introAvg !== null) {
      socialProof = `${plays.toLocaleString('en-US')} fans have taken it, averaging ${introAvg}%. See where you land.`;
    } else {
      socialProof = `${plays.toLocaleString('en-US')} fans have played it.`;
    }
  }
  const intro = `${base} ${socialProof}`;

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

  // SEO-4 (O3) + SEO-5 (B): ONE real fact, distinct + stable per quiz, for the inline
  // "Did you know?" card. The pool merges the DERIVED group fun-facts (getOverriddenFacts,
  // React-cache()'d so it dedupes with hasTriviaPage above) with the entity-level STORED
  // trivia (migration 149, sourced + covenant-checked), deduped by the shared fact key
  // (derived wins on a tie). One fact is then picked stably; 0 in both -> nothing.
  const [derivedFacts, storedFacts] = await Promise.all([
    safeFetch(getOverriddenFacts(quiz.group_id, quiz.group_slug), [], '[q/[slug]] dykFacts'),
    safeFetch(getStoredGroupTrivia(quiz.group_id), [], '[q/[slug]] storedTrivia'),
  ]);
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
  const hallOfFame = await safeFetch(getQuizHallOfFame(quiz.id, 10), [], '[q/[slug]] hallOfFame');
  // W2b C2 - ONE page-level query for the whole leaderboard (3 bounded reads,
  // constant in the number of rows). A per-row lookup would be N+1.
  const openRunCount = await safeFetch(countOpenRunsForQuiz(quiz.id), 0, '[q/[slug]] countOpenRunsForQuiz');

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

  const inThisQuiz = buildInThisQuiz(quiz);
  const creatorNote = sanitizeCreatorNote(quiz.settings?.creator_note);

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
      <p className="text-sm text-secondary leading-relaxed mt-6 max-w-2xl">{intro}</p>

      {/* SEO indexguard PART 3 - cold-start "In this quiz" block. Crawlable, unique by
          construction (derived only from THIS quiz's data), spoiler-safe (prompts only).
          It sits BELOW the QuizPlayer, so the play CTA stays above the fold. */}
      {inThisQuiz && (
        <section className="mt-4 max-w-2xl" aria-label="In this quiz">
          <h2 className="text-sm font-semibold text-primary">In this quiz</h2>
          <p className="text-sm text-secondary mt-1">
            {inThisQuiz.contextLine}. {inThisQuiz.topicsLine.charAt(0).toUpperCase() + inThisQuiz.topicsLine.slice(1)}.
          </p>
          {inThisQuiz.sampleQuestions.length > 0 && (
            <>
              <p className="text-xs text-tertiary mt-2">A taste of the questions (no answers):</p>
              <ul className="text-sm text-secondary mt-1 list-disc pl-5 space-y-1">
                {inThisQuiz.sampleQuestions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

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

      {/* W2b C2-REDESIGN - one identity-free block. Per-row matching by username
          cannot work while the leaderboard is anonymous (the biggest quiz on the site
          has ZERO named players in its top 10), so the supply is surfaced for the
          quiz as a whole. Real count, live, paginated; renders nothing at zero. */}
      <OpenRunsBlock
        subject="this quiz"
        count={openRunCount}
        href={`/battle?open=quiz:${quiz.id}&utm_source=quiz&utm_medium=internal&utm_campaign=open_runs`}
      />

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
                  <a href={`/articles/${link.slug}`} className="quiz-article-link">
                    {link.label}
                  </a>
                </li>
              ))}
              <li>
                <a href={`/${quiz.group_slug}-quiz`} className="quiz-article-link">
                  All {quiz.group_name} quizzes
                </a>
              </li>
            </ul>
          </section>
        );
      })()}
      </AboutQuizDrawer>

      {/* QA class 4: quiz.title (user-authored) escaped at the sink.
          SEO-3 Step 4: enriched Quiz JSON-LD.
          - `about`: MusicGroup (correct type for K-pop groups)
          - `assesses`: group name (what the quiz measures knowledge of)
          - `educationalLevel`: difficulty (real value from quiz row)
          - `hasPart`: Question array with `name` only, no suggestedAnswer
            (structured question inventory without exposing correct answers)
          - `interactionStatistic`: play count + a second counter for
            completions when total_completions > 0
          - Multiple crawlable stats already inline in DOM via QuizStatsBlock.
      */}
      {jsonLdScript({
        '@context': 'https://schema.org',
        '@type': 'Quiz',
        name: quiz.title,
        description: `A ${quiz.group_name} quiz created by ${quiz.creator_username} on KpopQuiz`,
        educationalAlignment: {
          '@type': 'AlignmentObject',
          alignmentType: 'educationalSubject',
          targetName: 'K-pop',
        },
        educationalLevel: quiz.difficulty,
        assesses: quiz.group_name,
        keywords: `${quiz.group_name}, K-pop, ${quiz.difficulty} quiz`,
        author: {
          '@type': 'Person',
          name: quiz.creator_username,
          url: `https://kpopquiz.org/u/${quiz.creator_username}`,
        },
        dateCreated: quiz.created_at,
        dateModified: quiz.updated_at,
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
          '@type': 'MusicGroup',
          name: quiz.group_name,
          url: `https://kpopquiz.org/${quiz.group_slug}-quiz`,
        },
        hasPart: seoQuestions
          .map((q) => q.question)
          .filter((text): text is string => typeof text === 'string' && text.length > 0)
          .map((text) => ({ '@type': 'Question', name: text })),
        numberOfQuestions: questionCount,
        inLanguage: 'en',
        url: `https://kpopquiz.org/q/${quiz.slug}`,
      })}
      {/* BreadcrumbList JSON-LD is emitted by <Breadcrumbs> above (Home › Group › Quiz). */}
    </div>
  );
}
