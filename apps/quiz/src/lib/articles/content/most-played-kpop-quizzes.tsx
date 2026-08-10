import Link from 'next/link';

import { getMostPlayedQuizzes30d } from '@/lib/db/queries/stats';

// Data-entangled: the ranking is counted live from the plays table over the trailing 30 days.
// No hardcoded titles or counts; if the window is too quiet the page says so instead of inventing.
export async function ArticleBody(): Promise<React.ReactElement> {
  const top = await getMostPlayedQuizzes30d(10);
  const nf = (n: number): string => n.toLocaleString('en-US');
  const leader = top[0] ?? null;
  // the distinct groups appearing in the live top ten, for honest "who is leading" prose + links.
  const groups: { name: string; slug: string }[] = [];
  for (const q of top) if (q.groupSlug && !groups.some((g) => g.slug === q.groupSlug)) groups.push({ name: q.groupName, slug: q.groupSlug });

  return (
    <>
      <p className="art-lead">
        These are the most-played K-pop quizzes on kpopquiz.org over the trailing thirty days,
        counted directly from real plays rather than chosen by an editor. The ranking moves week to
        week as fandoms rally, rookies debut and old favourites resurface, so treat it as a live
        snapshot of what people are actually playing right now, not an all-time list.
      </p>

      <h2 id="most-played">What are the most-played K-pop quizzes this month?</h2>
      {top.length > 0 ? (
        <>
          <p>
            Here are the ten quizzes with the most completed plays in the last thirty days.
            {leader ? <> The current leader is <Link href={`/q/${leader.slug}`}>{leader.title}</Link> with {nf(leader.plays)} plays in the window.</> : null} Activity
            spreads across hundreds of quizzes every month, so a place in this top ten is genuinely
            competitive rather than a default.
          </p>
          <ol>
            {top.map((q) => (
              <li key={q.slug}>
                <strong><Link href={`/q/${q.slug}`}>{q.title}</Link></strong> ({q.groupName}) - {nf(q.plays)} plays
              </li>
            ))}
          </ol>
        </>
      ) : (
        <p>
          The trailing thirty-day window is too quiet to rank right now, so there is nothing honest
          to list here yet. The full library and the live stats page are the better view until play
          activity picks back up.
        </p>
      )}

      <h2 id="what-it-shows">What does the most-played list tell you?</h2>
      <p>
        Two patterns show up almost every month. The first is that group-specific challenge quizzes
        travel furthest, because a pass-or-fail framing gives a fandom something to rally around and
        share. A quiz that dares you to prove yourself gets passed between friends in a way that a
        neutral trivia set never does. The second is that broad, cross-group quizzes pull players
        from every fandom at once instead of one, which is why format questions like matching groups
        to their labels or ordering debuts by year keep reappearing near the top.
      </p>
      <p>
        There is also a size effect worth naming honestly. Bigger fandoms have more people available
        to play, so their quizzes start with an advantage that has nothing to do with quality. That
        is why a smaller or newer group appearing high in this list is genuinely notable: it means
        an unusually high share of that fandom is playing, not simply that the fandom is large.
      </p>
      {groups.length > 0 ? (
        <p className="art-highlight">
          <strong>Leading this window:</strong> {groups.slice(0, 5).map((g) => g.name).join(', ')}. If a group
          you follow is missing, playing its quizzes is literally how it climbs.
        </p>
      ) : null}

      <h2 id="play-the-top">Where can I play the most-played quizzes?</h2>
      <p>
        Every title above links straight to the quiz, so the fastest route is simply to start at the
        top and work down. If you would rather stay inside one fandom, each group has its own hub
        that lists that group&apos;s most popular quizzes first, which is usually the better path if
        you want to build up a streak on familiar material before facing a mixed-group challenge.
      </p>
      {groups.length > 0 ? (
        <div className="art-cta-inline">
          {groups.slice(0, 2).map((g, i) => (
            <Link key={g.slug} href={`/${g.slug}-quiz`} className={i === 0 ? 'art-cta-btn' : 'art-cta-btn art-cta-secondary'}>
              {g.name} quizzes
            </Link>
          ))}
        </div>
      ) : null}

      <h2 id="how-counted">How is this ranking counted?</h2>
      <p>
        Each entry counts completed plays recorded in the last thirty days for quizzes that are
        currently published. Repeat plays by the same person count, because replaying a quiz is a
        real signal of how much a fandom likes it, and excluding them would quietly punish the
        quizzes people enjoy most. Quizzes that have since been unpublished are skipped rather than
        listed as dead links, so the ranking you see is always playable.
      </p>
      <p>
        Nothing here is weighted, boosted or editorially adjusted. That means the list is sometimes
        lopsided, with one very active fandom taking several slots at once. We leave it that way on
        purpose: a chart that has been smoothed until it looks balanced is no longer telling you
        what people did, and this page is only useful if it reports the month as it actually
        happened.
      </p>

      <h2 id="live-data">How current are these numbers?</h2>
      <p>
        The window is always the last thirty days relative to when this page was refreshed, so it
        follows the calendar rather than being pinned to a fixed date. For the wider view, including
        the current hardest and easiest quizzes by real average score, the stats page carries the
        full set of live figures.
      </p>
      <div className="art-cta-inline">
        <Link href="/quizzes" className="art-cta-btn">Browse all quizzes</Link>
        <Link href="/stats" className="art-cta-btn art-cta-secondary">Live stats</Link>
      </div>
    </>
  );
}
