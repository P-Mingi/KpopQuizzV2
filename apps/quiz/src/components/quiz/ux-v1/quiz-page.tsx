import Image from 'next/image';
import Link from 'next/link';

import { UxAvatar } from '@/components/ux-v1/avatar';
import { UxLink } from '@/components/ux-v1/button';
import { Icon } from '@/components/ux-v1/icon';
import { UxPage } from '@/components/ux-v1/page';
import { UxBox } from '@/components/ux-v1/panel';
import { BiasTag, PersonName } from '@/components/ux-v1/person-name';
import { SectionHeader } from '@/components/ux-v1/section-header';
import { TextCard, TextCardGrid } from '@/components/ux-v1/text-card';
import { QuizOwnerActions } from '@/components/quiz/quiz-owner-actions';
import { getLevelInfo } from '@/lib/constants';
import { isUxV12 } from '@/lib/ux-v12';
import { formatCount } from '@/lib/utils';
import { jsonLdScript } from '@/lib/verse/jsonld';
import { QUIZ_TYPE_ICON, QUIZ_TYPE_LABEL } from '@/lib/ux-v1/a0/icons';
import { formatDuration } from '@/lib/ux-v1/p4/engine';
import { aboutMinutes, cardAverage } from '@/lib/ux-v1/p4/format';
import { averageText } from '@/lib/quiz/quiz-average';

// client islands through code-split loaders (flag-off pages never download them)
import { P4Follow, P4HofMine, P4ReportButton, P4Run, P4StartActions, P4StickyStart } from './islands';

import type { AnswerRow } from '@/lib/quiz/answers';
import type { QuizCardData, QuizType } from '@/lib/db/types';
import type { P4Creator, P4HofRow } from '@/lib/ux-v1/p4/queries';
import type { P4RunQuiz } from './run-context';

const LEVEL: Record<string, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

export interface P4ReviewQuestion {
  question?: string;
  options?: unknown[];
  fun_fact?: string;
  clues?: string[];
  correct?: number | boolean;
}

export interface P4QuizPageProps {
  run: P4RunQuiz;
  quiz: {
    id: string;
    slug: string;
    title: string;
    /**
     * The H1 when it differs from the creator's title (SEO Mission 2: a generic "{group} quiz"
     * gets a qualifier from its content, lib/seo/quiz-meta.ts); the creator's title then shows
     * as the subtitle. Absent = the creator's title is the H1, as before.
     */
    heading?: string;
    quizType: QuizType;
    difficulty: string;
    questionCount: number;
    playCount: number;
    groupName: string;
    groupSlug: string;
    creatorId: string | null;
    creatorUsername: string;
    creatorXp: number;
    creatorAvatarUrl: string | null;
    /** next/image source of the cover (quiz cover, else the group photo), null = typographic cover */
    cover: string | null;
  };
  /** the page's Breadcrumbs items, kept identical (BreadcrumbList JSON-LD) */
  crumbs: Array<{ label: string; href?: string }>;
  breadcrumbJsonLd: Record<string, unknown>;
  quizJsonLd: Record<string, unknown>;
  /** the SEO intro paragraph, byte for byte the legacy one */
  intro: string;
  creatorNote: string | null;
  /** gated like the intro (unlock threshold, per-question types) */
  introAvg: number | null;
  /** Completed plays behind introAvg, written beside it ("average of N completed plays"). */
  introAvgOf?: number | null;
  perQuestionScore: boolean;
  extra: { fastestTimeSeconds: number | null; perfectScoreCount: number };
  passRate: number | null;
  counts: { likes: number; reactions: number; comments: number };
  inThisQuiz: { contextLine: string; topicsLine: string } | null;
  prompts: string[];
  review: P4ReviewQuestion[];
  /** Answers & explanations at the bottom of the page (SEO phase 1); null or empty: no block. */
  answers?: AnswerRow[] | null;
  dyk: { fact: string; category?: string | null } | null;
  triviaAvailable: boolean;
  fandomName: string;
  hof: P4HofRow[];
  related: QuizCardData[];
  /** A General K-pop quiz on a theme page (SEO phase 1, PR 16b): the "More" header names and links that page. */
  moreFrom?: { title: string; href: string; count: number };
  groupQuizCount: number | null;
  articleLinks: Array<{ slug: string; label: string }>;
  creator: P4Creator | null;
  /** A site's own block above the start buttons (the anime spoiler interstitial). Default: none. */
  gate?: React.ReactNode;
  /** SEO Mission 3, part F.1: the public "Embed this quiz" island, passed in by the route. */
  embedAction?: React.ReactNode;
}

/**
 * /q/[slug] under NEXT_PUBLIC_UX_V1 (DESIGN-SPEC 16.7 "Quiz page (720)", 17.4, 17.11;
 * prototype #quiz). Server rendered (ISR, the route's revalidate): every crawlable
 * block of today's page is in this HTML (H1, the intro paragraph, the question list,
 * the fact, trivia / related / article links, both JSON-LD blocks), laid out as the
 * prototype. The run (game, results) is the P4Run client island around it.
 */
export function P4QuizPage(p: P4QuizPageProps): React.ReactElement {
  const q = p.quiz;
  const lv = getLevelInfo(p.creator?.xp ?? q.creatorXp);
  // v12 F5a: an editorial (team) account carries the Team badge and no level (SYSTEM.md 5.6)
  const team = p.creator?.team === true && isUxV12();
  const perfect = p.perQuestionScore && p.extra.perfectScoreCount > 0 ? p.extra.perfectScoreCount : 0;
  const fastest = p.perQuestionScore && p.extra.fastestTimeSeconds !== null ? formatDuration(p.extra.fastestTimeSeconds) : null;
  const hofMeta = [perfect > 0 ? `${perfect.toLocaleString('en-US')} perfect ${perfect === 1 ? 'score' : 'scores'}` : null, fastest ? `fastest ${fastest}` : null].filter(Boolean).join(' · ');
  const top = p.hof.slice(0, 5);
  const moreSameGroup = p.related.length > 0 && p.related.every((r) => r.group_slug === q.groupSlug);
  const countsLine = [
    p.passRate !== null && p.perQuestionScore ? `Pass rate ${p.passRate}%` : null,
    p.counts.likes > 0 ? `${p.counts.likes.toLocaleString('en-US')} like${p.counts.likes === 1 ? '' : 's'}` : null,
    p.counts.reactions > 0 ? `${p.counts.reactions.toLocaleString('en-US')} reaction${p.counts.reactions === 1 ? '' : 's'}` : null,
    p.counts.comments > 0 ? `${p.counts.comments.toLocaleString('en-US')} comment${p.counts.comments === 1 ? '' : 's'}` : null,
  ].filter(Boolean).join(' · ');
  const rest = Math.max(0, q.questionCount - p.prompts.length);
  const hasAnswers = (p.answers?.length ?? 0) > 0;
  // One text node, so a page without the answers block keeps exactly today's tree (owner wording, 2026-10-28).
  const reviewNote = hasAnswers
    ? ' quiz. Try it first. Answers and explanations are at the bottom of the page (spoilers).'
    : ' quiz. The correct answers are revealed only when you play.';

  return (
    <UxPage width="full" padded={false} className="p4-page">
      {jsonLdScript(p.breadcrumbJsonLd)}
      <P4Run quiz={p.run}>
        <div className="ux-col ux-pg p4-intro">
          <nav className="ux-crumb p4-crumb" aria-label="Breadcrumb">
            {p.crumbs.map((c, i) => (
              <span key={i} className={c.href ? undefined : 'p4-crumb-cur'}>
                {i > 0 ? <span aria-hidden="true" className="p4-sep">/</span> : null}
                {c.href ? <Link href={c.href}>{c.label}</Link> : <span aria-current="page">{c.label}</span>}
              </span>
            ))}
          </nav>

          {/* The cover is the LCP element of /q/: fetchPriority high starts its preload and img at high
              priority (preload alone does not), and sizes follows the 20 px side gutters on phones. */}
          <div className="p4-cover">
            {q.cover ? (
              <Image className="p4-cover-img" src={q.cover} alt={`${q.title} - ${q.groupName || 'K-pop'} quiz`} fill preload fetchPriority="high" sizes="(max-width: 760px) calc(100vw - 40px), 720px" />
            ) : (
              <span className="ux-fbn"><Icon name={QUIZ_TYPE_ICON[q.quizType] ?? 't-classic'} />{q.groupName}</span>
            )}
          </div>

          <h1 className="p4-title">{q.heading ?? q.title}</h1>
          {q.heading && q.heading !== q.title ? <p className="p4-subtitle">{q.title}</p> : null}
          <div className="p4-meta">
            <span><Icon name={QUIZ_TYPE_ICON[q.quizType] ?? 't-classic'} />{QUIZ_TYPE_LABEL[q.quizType] ?? 'Classic'}</span>
            <span>{LEVEL[q.difficulty] ?? q.difficulty}</span>
            <span className="ux-num">{q.questionCount} {q.questionCount === 1 ? 'question' : 'questions'}</span>
            <span>{aboutMinutes(q.questionCount, p.run.timerOn, p.run.timerSeconds)}</span>
            <span className="ux-num">{q.playCount.toLocaleString('en-US')} plays</span>
            {p.introAvg !== null && p.introAvgOf ? <span className="ux-num">{averageText({ pct: p.introAvg, completions: p.introAvgOf })}</span> : null}
          </div>
          <div className="p4-author">
            <UxAvatar name={q.creatorUsername} src={p.creator?.avatarUrl ?? q.creatorAvatarUrl} size={28} team={team} />
            {team
              ? <span>by <PersonName name={q.creatorUsername} className="p4-handle" href={`/u/${q.creatorUsername}`} isTeam /></span>
              : <span>by <Link className="p4-handle" href={`/u/${q.creatorUsername}`}>{q.creatorUsername}</Link> · Lv {lv.level} {lv.name}</span>}
            <P4Follow username={q.creatorUsername} />
          </div>

          {p.gate ? <>{p.gate}<P4StartActions /></> : <P4StartActions />}

          <section className="ux-sec" aria-labelledby="p4-hof-h">
            <div className="p4-hof-h">
              <h2 className="ux-h2" id="p4-hof-h">Hall of fame</h2>
              {hofMeta ? <small>{hofMeta}</small> : null}
            </div>
            {top.length > 0 ? (
              <div className="ux-rows">
                {top.map((h, i) => (
                  <div className="p4-hrow" key={i}>
                    <span className="p4-rk">{i + 1}</span>
                    <UxAvatar name={h.person?.username ?? '?'} src={h.person?.avatarUrl ?? null} />
                    {h.person ? (
                      <>
                        <span className="p4-nm"><PersonName name={h.person.username} accent={h.person.accent} font={h.person.font} href={`/u/${h.person.username}`} showBias={false} /></span>
                        <BiasTag bias={h.person.bias} accent={h.person.accent} />
                      </>
                    ) : <span className="p4-nm is-guest">someone</span>}
                    <span className="p4-sc">{h.score}/{h.total * (q.quizType === 'guess_from_clues' ? 3 : 1)}</span>
                    <span className="p4-tm">{h.timeSeconds !== null && h.timeSeconds >= 0 ? formatDuration(h.timeSeconds) : ''}</span>
                  </div>
                ))}
              </div>
            ) : null}
            <P4HofMine />
          </section>

          {p.dyk || p.triviaAvailable ? (
            <section className="ux-sec p4-dyk" aria-label="Did you know?">
              <Icon name="bulb" />
              <div>
                {p.dyk ? (
                  <>
                    <span className="p4-lab2">Did you know</span>
                    <p>{p.dyk.fact}</p>
                  </>
                ) : null}
                {p.triviaAvailable ? (
                  <UxLink href={`/${q.groupSlug}-trivia`} icon="arrow">Learn before you play: {q.groupName} trivia</UxLink>
                ) : null}
              </div>
            </section>
          ) : null}

          <UxBox className="ux-sec p4-about" label="About this quiz">
            <h2 className="ux-h2">About this quiz</h2>
            <div className="p4-prose">
              <p>{p.intro}</p>
              {p.creatorNote ? <p>{p.creatorNote}</p> : null}
              {countsLine ? <p className="p4-counts">{countsLine}</p> : null}
            </div>
          </UxBox>

          {p.prompts.length > 0 ? (
            <section className="ux-sec" aria-labelledby="p4-inthis-h">
              <h2 className="ux-h2 p4-h2-tight" id="p4-inthis-h">In this quiz</h2>
              <div className="p4-qrows">
                {p.prompts.map((t, i) => (
                  <div className="p4-qrow" key={i}><span className="p4-n">{i + 1}</span><p>{t}</p></div>
                ))}
                {rest > 0 ? <div className="p4-qrow"><span className="p4-n" /><p className="ux-muted">{rest === 1 ? 'One more question.' : `${rest} more questions.`}</p></div> : null}
              </div>
              {p.review.length > 0 ? (
                <details className="p4-acc p4-review">
                  <summary>Show the {p.review.length} questions in this quiz<Icon name="chev" /></summary>
                  <div className="p4-ab">
                    <p>
                      A preview of every question in this {q.groupName}{reviewNote}
                      {p.inThisQuiz ? ` ${p.inThisQuiz.contextLine}. ${p.inThisQuiz.topicsLine.charAt(0).toUpperCase()}${p.inThisQuiz.topicsLine.slice(1)}.` : ''}
                    </p>
                    <ol>
                      {p.review.map((r, i) => {
                        const opts = r.options && r.options.length > 0 ? r.options : typeof r.correct === 'boolean' ? ['True', 'False'] : [];
                        return (
                          <li key={i}>
                            <p><b>{i + 1}.</b> {r.question}</p>
                            {r.clues && r.clues.length > 0 ? <ul>{r.clues.map((c, j) => <li key={j}>{c}</li>)}</ul> : null}
                            {opts.length > 0 ? (
                              <ul>{opts.map((o, j) => <li key={j}>{typeof o === 'string' ? o : (o as { label?: string })?.label ?? ''}</li>)}</ul>
                            ) : null}
                            {r.fun_fact ? <p className="p4-fun"><b>Fun fact:</b> {r.fun_fact}</p> : null}
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                </details>
              ) : null}
            </section>
          ) : null}

          {p.related.length > 0 ? (
            <section className="ux-sec" aria-labelledby="p4-more-h">
              <SectionHeader
                id="p4-more-h"
                title={p.moreFrom ? p.moreFrom.title : moreSameGroup ? `More ${q.groupName} quizzes` : 'More quizzes to play'}
                {...(p.moreFrom
                  ? { action: { href: p.moreFrom.href, label: `All ${p.moreFrom.count.toLocaleString('en-US')}` } }
                  : moreSameGroup && p.groupQuizCount !== null && p.groupQuizCount > 0 ? { action: { href: `/${q.groupSlug}-quiz`, label: `All ${p.groupQuizCount.toLocaleString('en-US')}` } } : {})}
              />
              <TextCardGrid className="p4-more-grid">
                {p.related.map((r) => (
                  <TextCard key={r.id} href={`/q/${r.slug}`} title={r.title} quizType={r.quiz_type} difficulty={r.difficulty} plays={r.play_count} averagePct={cardAverage(r)} titleAs="h3" />
                ))}
              </TextCardGrid>
              {p.articleLinks.length > 0 ? (
                <nav className="p4-reads" aria-label={`Read more about ${q.groupName}`}>
                  <span className="ux-muted">Read more about {q.groupName}:</span>
                  {p.articleLinks.map((l) => <UxLink key={l.slug} href={`/articles/${l.slug}`}>{l.label}</UxLink>)}
                  <UxLink href={`/${q.groupSlug}-quiz`}>All {q.groupName} quizzes</UxLink>
                </nav>
              ) : null}
            </section>
          ) : null}

          <section className="ux-sec p4-madeby-sec" aria-label="Made by">
            <div className="p4-madeby">
              <UxAvatar name={q.creatorUsername} src={p.creator?.avatarUrl ?? q.creatorAvatarUrl} size={40} team={team} />
              {team && p.creator ? (
                <div>
                  <PersonName name={q.creatorUsername} className="p4-handle" href={`/u/${q.creatorUsername}`} isTeam />
                  <div>{`${p.creator.quizzes.toLocaleString('en-US')} ${p.creator.quizzes === 1 ? 'quiz' : 'quizzes'} · ${formatCount(p.creator.playsReceived)} plays`}</div>
                </div>
              ) : (
              <div>
                <Link className="p4-handle" href={`/u/${q.creatorUsername}`}>{q.creatorUsername}</Link>
                <div>
                  Lv {lv.level} {lv.name}
                  {p.creator ? ` · ${p.creator.quizzes.toLocaleString('en-US')} ${p.creator.quizzes === 1 ? 'quiz' : 'quizzes'} · ${formatCount(p.creator.playsReceived)} plays` : ''}
                </div>
              </div>
              )}
            </div>
            {/* SEO Mission 3, part F.1: the public embed generator sits beside Report. */}
            <div className="p4-madeby-acts">
              {p.embedAction ?? null}
              <P4ReportButton quizId={q.id} withIcon />
            </div>
          </section>
          {hasAnswers ? (
            <section className="ux-sec" aria-label="Answers and explanations">
              <details className="p4-acc p4-review">
                <summary>Answers &amp; explanations<Icon name="chev" /></summary>
                <div className="p4-ab">
                  <p>Spoilers: the right answer to each question of this {q.groupName} quiz, with its explanation and source when we have one.</p>
                  <ol>
                    {(p.answers ?? []).map((a) => (
                      <li key={a.qIndex}>
                        <p><b>{a.n}.</b> {a.question}</p>
                        <p><b>Answer:</b> {a.answer}</p>
                        {a.explanation?.kind === 'verified' ? (
                          <p className="p4-fun">{a.explanation.text} <a href={a.explanation.sourceUrl} rel="nofollow noopener" target="_blank">Source</a></p>
                        ) : a.explanation?.kind === 'fun_fact' ? (
                          <p className="p4-fun"><b>Fun fact:</b> {a.explanation.text}</p>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                </div>
              </details>
            </section>
          ) : null}
          <div className="p4-owner"><QuizOwnerActions quizId={q.id} creatorId={q.creatorId} /></div>
        </div>
        <P4StickyStart />
      </P4Run>
      {jsonLdScript(p.quizJsonLd)}
    </UxPage>
  );
}
