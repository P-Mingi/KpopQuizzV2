import Link from 'next/link';

import { atLeast, getPublicStatsOrNull } from '@/lib/stats/site-stats';

// SEO Mission 1 (owner, 2026-10-14; rulebook section 12.5): a comparison that includes our
// own site says so first, shows its criteria, and does not rank us first by default. Every
// listed site was checked live on 2026-10-14. Removed: Kpop-Quiz.com (the domain did not
// resolve) and QuizUp (offline since 24 March 2021). Our counts are live.

const CHECKED = '14 October 2026';

export async function ArticleBody(): Promise<React.ReactElement> {
  const stats = await getPublicStatsOrNull();
  return (
    <>
      <p className="art-lead">
        We run kpopquiz.org, so we are not neutral. This page compares free places to play K-pop
        quizzes in 2026 on plain criteria: what you can play, who writes the quizzes, whether you
        can make your own, and what it costs. Every site below was checked live on {CHECKED}.
      </p>

      <h2 id="comparison-table">Which K-pop quiz sites did we compare?</h2>
      <p>Three sites with free K-pop quizzes that were online when we checked. The table lists facts, not a ranking.</p>
      <div className="art-table-wrap">
        <table className="art-table">
          <thead>
            <tr>
              <th>Site</th>
              <th>What you can play</th>
              <th>Who writes the quizzes</th>
              <th>Make your own?</th>
              <th>Cost</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>kpopquiz.org</strong> (our site)</td>
              <td>Fan-made quizzes in five formats, a blind test, Name them all, Which member are you, live quiz rooms</td>
              <td>Fans, plus a few accounts labelled Team</td>
              <td>Yes, with a free account</td>
              <td>Free</td>
            </tr>
            <tr>
              <td><strong>Sporcle</strong> (K-pop tag)</td>
              <td>Timed quizzes where you type the answers, on many topics including K-pop</td>
              <td>Its users</td>
              <td>Yes</td>
              <td>Free, with ads</td>
            </tr>
            <tr>
              <td><strong>Soompi</strong> (quizzes)</td>
              <td>Personality and knowledge quizzes published as articles</td>
              <td>Soompi</td>
              <td>No</td>
              <td>Free</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 id="kpopquiz-org">What can you play on kpopquiz.org?</h2>
      <p>
        Quizzes written by fans, in five formats (multiple choice, pictures, odd one out, true or
        false, guess from clues), plus a blind test where you name a song from a short clip, Name
        them all games, Which member are you quizzes, and live rooms where friends play together
        on their phones.{' '}
        {stats
          ? `On ${CHECKED} it had ${atLeast(stats.quizzes)} published quizzes about ${atLeast(stats.groupsWithQuizzes)} groups, and a blind test of ${atLeast(stats.songs)} songs.`
          : null}
      </p>
      <div className="art-cta-inline">
        <Link href="/quizzes" className="art-cta-btn">Browse quizzes</Link>
        <Link href="/blindtest" className="art-cta-btn art-cta-secondary">Try the blind test</Link>
      </div>

      <h2 id="sporcle">What is Sporcle like for K-pop?</h2>
      <p>
        Sporcle is a general quiz site with a long history. Its users publish quizzes on every
        topic, and its <a href="https://www.sporcle.com/games/tags/kpop">K-pop tag</a> collects the
        K-pop ones. Most are timed and you type the answers, which tests recall rather than
        recognition. Quality varies because anyone can publish.
      </p>

      <h2 id="soompi">What are Soompi quizzes?</h2>
      <p>
        Soompi, an English-language K-pop news site, publishes{' '}
        <a href="https://www.soompi.com/category/quizzes">quizzes</a> as articles, mostly
        personality quizzes. You read and answer them like an article; there is no quiz creation.
      </p>

      <h2 id="gone">Which K-pop quiz sites are no longer available?</h2>
      <p>
        QuizUp, the multiplayer trivia app, shut down: its servers went offline on 24 March 2021
        (<a href="https://en.wikipedia.org/wiki/QuizUp">Wikipedia</a>). We also removed Kpop-Quiz.com
        from this comparison: on {CHECKED} its domain did not resolve.
      </p>

      <h2 id="what-to-look-for">What makes a good K-pop quiz site?</h2>
      <p>
        Look at group coverage (does it include your favorite groups?), quiz formats (audio,
        pictures, text), freshness (are new quizzes added?), community features (leaderboards,
        making your own quizzes) and how many ads you see. Audio blind tests and picture quizzes
        test different skills than text trivia, so a mix keeps things interesting.
      </p>

      <h2 id="which-to-pick">Which one should you pick?</h2>
      <p>
        It depends on how you like to play. For timed recall quizzes on many topics, Sporcle. For
        a light personality quiz between news reads, Soompi. For K-pop quizzes made by fans, a song
        blind test and games to play with friends, kpopquiz.org. All three are free to try.
      </p>
    </>
  );
}
