import Link from 'next/link';

import { UxLink } from '@/components/ux-v1/button';
import { generationLabel, renderableRows, resolveSource } from '@/lib/hubs/hub-plus';
import { GROUP_MIN_ATTEMPTS, LEVEL_BANDS, LEVEL_LABEL, LEVEL_MIN_ATTEMPTS, monthYear } from '@/lib/hubs/hub-scores';
import { groupByTopic } from '@/lib/hubs/topics';

import type { HubPlus } from '@/lib/hubs/hub-plus';
import type { PooledScore, RankedQuiz, ScoredQuizRow } from '@/lib/hubs/hub-scores';
import type { ResolvedSource } from '@/lib/hubs/facts/types';

// SEO Mission 2, part B: the extra sections of a strengthened group hub (lib/hubs/hub-plus.ts).
// Server components; every word and number is in the HTML. They read only what hub.tsx already
// read (the published quizzes, the playable songs, the group row) plus the versioned fact and
// Wikidata files, so they add no database work. Each section hides below its floor.

const num = (n: number): string => n.toLocaleString('en-US');

function Sources({ sources }: { sources: ResolvedSource[] }): React.ReactElement {
  return (
    <span className="p3x-src">
      {sources.map((s, i) => (
        <span key={s.url}>
          {i > 0 ? ', ' : null}
          <a href={s.url} rel="noopener noreferrer" target="_blank">{s.label}</a>
        </span>
      ))}
    </span>
  );
}

interface TopProps {
  name: string;
  slug: string;
  quizzes: Array<ScoredQuizRow & { slug: string; title: string }>;
  ranked: RankedQuiz[];
  belowFloor: number;
  songs: number;
}

/** "Pick a {Group} quiz by level", "{Group} quizzes by topic", "Guess the {Group} song", "Newest {Group} quizzes". */
export function HubPlusTop({ name, slug, quizzes, ranked, belowFloor, songs }: TopProps): React.ReactElement | null {
  if (quizzes.length === 0) return null;
  const rankedBySlug = new Map(ranked.map((r) => [r.quiz.slug, r]));
  const topics = groupByTopic(quizzes);
  const easiest = ranked[0] ?? null;
  const hardest = ranked.length > 1 ? ranked[ranked.length - 1]! : null;
  const newest = [...quizzes].sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0)).slice(0, 5);
  const guessQuizzes = quizzes.filter((q) => /\bguess\b/i.test(q.title) && /\b(songs?|mvs?|music videos?)\b/i.test(q.title));

  return (
    <>
      <section className="ux-sec p3x" aria-labelledby="p3x-level-h">
        <h2 id="p3x-level-h" className="ux-h2">Pick a {name} quiz by level</h2>
        {easiest && hardest ? (
          <p className="p3x-lede">
            By fan scores, the easiest {name} quiz is <Link href={`/q/${easiest.quiz.slug}`}>{easiest.quiz.title}</Link> ({easiest.avg}% average over {num(easiest.attempts)} attempts) and the hardest is <Link href={`/q/${hardest.quiz.slug}`}>{hardest.quiz.title}</Link> ({hardest.avg}% over {num(hardest.attempts)} attempts).
          </p>
        ) : null}
        <p className="p3x-note">
          Levels come from how fans actually score, not from the creator&apos;s label. Easy: fans average {LEVEL_BANDS.easyFrom}% or more. Medium: {LEVEL_BANDS.mediumFrom}% to {LEVEL_BANDS.easyFrom - 1}%. Hard: under {LEVEL_BANDS.mediumFrom}%. A quiz is ranked once it has {LEVEL_MIN_ATTEMPTS} attempts.
        </p>
        {ranked.length > 0 ? (
          <div className="p3x-tablewrap">
            <table className="p3x-table">
              <caption className="ux-sr">{name} quizzes ranked by average fan score, easiest first</caption>
              <thead>
                <tr><th scope="col">Level</th><th scope="col">Quiz</th><th scope="col" className="is-num">Average</th><th scope="col" className="is-num">Attempts</th></tr>
              </thead>
              <tbody>
                {ranked.map((r) => (
                  <tr key={r.quiz.slug}>
                    <td><span className={`p3x-lvl is-${r.level}`}>{LEVEL_LABEL[r.level]}</span></td>
                    <td><Link href={`/q/${r.quiz.slug}`}>{r.quiz.title}</Link></td>
                    <td className="is-num">{r.avg}%</td>
                    <td className="is-num">{num(r.attempts)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="p3x-note">Not enough data yet: no {name} quiz has {LEVEL_MIN_ATTEMPTS} attempts so far.</p>
        )}
        {ranked.length > 0 && belowFloor > 0 ? (
          <p className="p3x-note">{belowFloor} more {name} {belowFloor === 1 ? 'quiz has' : 'quizzes have'} fewer than {LEVEL_MIN_ATTEMPTS} attempts and {belowFloor === 1 ? 'is' : 'are'} not ranked yet.</p>
        ) : null}
      </section>

      {topics.length > 1 ? (
        <section className="ux-sec p3x" aria-labelledby="p3x-topic-h">
          <h2 id="p3x-topic-h" className="ux-h2">{name} quizzes by topic</h2>
          <p className="p3x-lede">The {num(quizzes.length)} {name} quizzes sorted by what their titles cover: {topics.map((t) => t.label.toLowerCase()).join(', ')}.</p>
          <div className="p3x-topics">
            {topics.map((t) => (
              <div key={t.topic} className="p3x-topic">
                <h3>{t.label}</h3>
                <ul>
                  {t.quizzes.map((q) => {
                    const r = rankedBySlug.get(q.slug);
                    return (
                      <li key={q.slug}>
                        <Link href={`/q/${q.slug}`}>{q.title}</Link>
                        {r ? <span className="p3x-meta"> · {LEVEL_LABEL[r.level]}, {r.avg}% average</span> : null}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {songs > 0 || guessQuizzes.length > 0 ? (
        <section className="ux-sec p3x" aria-labelledby="p3x-song-h">
          <h2 id="p3x-song-h" className="ux-h2">Guess the {name} song</h2>
          {songs > 0 ? (
            <p className="p3x-lede">
              Play the <Link href={`/blindtest/group-${slug}`}>{name} blind test</Link>: hear a short clip and name the song. {num(songs)} {name} {songs === 1 ? 'song is' : 'songs are'} in the blind test today.
            </p>
          ) : null}
          {guessQuizzes.length > 0 ? (
            <ul className="p3x-list">
              {guessQuizzes.map((q) => <li key={q.slug}><Link href={`/q/${q.slug}`}>{q.title}</Link></li>)}
            </ul>
          ) : null}
          <p className="p3x-note">More artists: <UxLink href="/guess-the-kpop-song">Guess the K-pop song</UxLink></p>
        </section>
      ) : null}

      <section className="ux-sec p3x" aria-labelledby="p3x-new-h">
        <h2 id="p3x-new-h" className="ux-h2">Newest {name} quizzes</h2>
        <ul className="p3x-list p3x-dated">
          {newest.map((q) => (
            <li key={q.slug}>
              <Link href={`/q/${q.slug}`}>{q.title}</Link>
              <time dateTime={q.created_at.slice(0, 10)}>{new Date(q.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}</time>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

interface FactsProps {
  name: string;
  plus: HubPlus;
  /** groups.generation, the one field every page reads (rulebook 5.6). */
  generation: string | null;
  pooled: PooledScore;
  ranked: RankedQuiz[];
  /** When the numbers were read (ISO). */
  asOf: string;
}

/** "{Group} in 30 seconds" (sourced facts) and "How fans score on {Group} quizzes" (measured). */
export function HubPlusFacts({ name, plus, generation, pooled, ranked, asOf }: FactsProps): React.ReactElement {
  const facts = plus.facts;
  const rows = renderableRows(facts);
  const gen = generationLabel(generation);
  const genSources = facts.generation.sources.map((s) => resolveSource(facts.slug, s)).filter((s): s is ResolvedSource => s !== null);
  const showGen = Boolean(gen) && facts.generation.confidence === 'consensus' && genSources.length > 0;
  const members = facts.members
    .map((m) => ({ ...m, src: resolveSource(facts.slug, m.source) }))
    .filter((m): m is typeof m & { src: ResolvedSource } => m.src !== null);
  const checked = new Date(`${facts.checkedAt}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const levels = { easy: 0, medium: 0, hard: 0 };
  for (const r of ranked) levels[r.level] += 1;
  const asOfMonth = monthYear(asOf);
  const since = monthYear(pooled.since);

  return (
    <>
      {rows.length > 0 ? (
        <section className="ux-sec p3x" aria-labelledby="p3x-30-h">
          <h2 id="p3x-30-h" className="ux-h2">{name} in 30 seconds</h2>
          <p className="p3x-lede">{facts.summary}</p>
          <div className="p3x-tablewrap">
            <table className="p3x-table">
              <caption className="ux-sr">{name} key facts with their sources</caption>
              <thead><tr><th scope="col">Fact</th><th scope="col">{name}</th><th scope="col">Sources</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.key}><th scope="row">{r.label}</th><td>{r.value}</td><td><Sources sources={r.sources} /></td></tr>
                ))}
                {showGen ? (
                  <tr>
                    <th scope="row">Generation</th>
                    <td><Link href="/articles/kpop-generations-explained">{gen}</Link></td>
                    <td><Sources sources={genSources} /></td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          {members.length > 0 ? (
            <div className="p3x-tablewrap">
              <table className="p3x-table">
                <caption className="ux-sr">{name} members and their public roles</caption>
                <thead><tr><th scope="col">Stage name</th><th scope="col">Public role</th><th scope="col">Source</th></tr></thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.stageName}><th scope="row">{m.stageName}</th><td>{m.role}</td><td><Sources sources={[m.src]} /></td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          <p className="p3x-note">Sources checked on {checked}. How we source facts: <UxLink href="/editorial-policy">editorial policy</UxLink>.</p>
        </section>
      ) : null}

      <section className="ux-sec p3x" aria-labelledby="p3x-score-h">
        <h2 id="p3x-score-h" className="ux-h2">How fans score on {name} quizzes</h2>
        {pooled.avg !== null && asOfMonth ? (
          <p className="p3x-lede">
            Fans average <b>{pooled.avg}%</b> on {name} quizzes, over <b>{num(pooled.attempts)}</b> scored attempts on {num(pooled.quizzes)} {pooled.quizzes === 1 ? 'quiz' : 'quizzes'}{since ? `, since ${since}` : ''} (as of {asOfMonth}).
          </p>
        ) : (
          <p className="p3x-lede">Not enough data yet: {name} quizzes have fewer than {GROUP_MIN_ATTEMPTS} scored attempts so far.</p>
        )}
        {ranked.length > 0 ? (
          <p className="p3x-note">
            Of the {num(ranked.length)} {name} {ranked.length === 1 ? 'quiz' : 'quizzes'} with {LEVEL_MIN_ATTEMPTS} or more attempts, {levels.easy} {levels.easy === 1 ? 'is' : 'are'} easy, {levels.medium} medium and {levels.hard} hard by fan scores.
          </p>
        ) : null}
        <p className="p3x-note">
          How we measure: the average is every point scored divided by every point possible, so a long quiz counts more than a short one, the method of the <UxLink href="/data/knowledge-report-2026">K-pop Knowledge Report 2026</UxLink>. A quiz needs {LEVEL_MIN_ATTEMPTS} attempts to be ranked and the {name} figure needs {GROUP_MIN_ATTEMPTS}.
        </p>
      </section>
    </>
  );
}
