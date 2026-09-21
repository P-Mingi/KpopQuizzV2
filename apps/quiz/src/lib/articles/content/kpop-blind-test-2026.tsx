import Link from 'next/link';

export function ArticleBody(): React.ReactElement {
  return (
    <>
      <p className="art-lead">
        A K-pop blind test plays a short audio clip and asks you to name the song or the artist from
        sound alone. The 2026 version is the same game pointed at this year: the catalog leans on the
        groups dominating right now, from the rookies breaking out to the third-gen acts still filling
        charts, mixed with the all-time hits every fan is expected to know. This guide covers what a
        2026 blind test actually tests, which groups you will hear, and how to go from guessing to
        naming a track in the first two seconds.
      </p>

      <h2 id="what-is-it">What is a 2026 K-pop blind test?</h2>
      <p>
        It is a listening game, not a lyrics or trivia quiz. You hear roughly ten seconds of a song
        with no title, no video and no words on screen, then pick the right answer from four choices
        before the clock runs out. A round is ten clips, and your score is how many you name
        correctly. Because you are working from audio only, it rewards a different memory than a
        multiple-choice quiz does: melody, production and vocal tone rather than facts and dates.
      </p>
      <p>
        The 2026 framing matters because the pool shifts with the year. Comeback season keeps adding
        fresh title tracks, and a current blind test weights toward what is actually charting and
        being talked about now, so a clip you would have missed last year is suddenly one everyone is
        expected to catch. That is what makes a dated blind test worth returning to: the questions
        move even when your knowledge does not.
      </p>
      <div className="art-cta-inline">
        <Link href="/blindtest" className="art-cta-btn">Play the K-pop blind test</Link>
      </div>

      <h2 id="which-groups">Which groups will you hear in a 2026 blind test?</h2>
      <p>
        The pool spans every generation, but a current test leans on the acts carrying 2026. Among
        the fifth-generation rookies, groups like Cortis, ILLIT and BABYMONSTER have moved fast from
        debut to daily rotation, which is exactly why their songs now show up in a fresh blind test
        the way established acts do. Getting a rookie clip right is often the difference between a good
        score and a great one, because most players have logged fewer listens on a new group.
      </p>
      <p>
        Above them sit the fourth-generation heavyweights, aespa, IVE, LE SSERAFIM, ENHYPEN, ITZY and
        NewJeans, whose title tracks are some of the most-streamed clips in any round. And the
        third-generation catalog is still the backbone of the game: BTS, BLACKPINK, TWICE, SEVENTEEN
        and EXO have the deepest discographies, so their questions range from obvious lead
        singles to b-sides that separate casual listeners from serious fans.
      </p>
      <p className="art-highlight">
        <strong>Tip:</strong> if a clip stumps you, listen for the production era before the melody.
        A song's drum sound and mixing place it in a generation almost instantly, which narrows four
        choices down to one or two before you have even recognised the tune.
      </p>

      <h2 id="how-to-win">How do you win a K-pop blind test?</h2>
      <p>
        Recognition speed is the whole game, and it is trainable. The players who top the leaderboard
        are not guessing luckier; they have learned the first two seconds of a song rather than the
        chorus. Intros are the most distinctive part of a track and the part a clip is most likely to
        open on, so an ear trained on intros answers before slower players have reached the hook.
      </p>
      <ol>
        <li>Learn intros, not choruses: the opening bars are what a clip usually plays and what your rivals overlook.</li>
        <li>Play one group at a time first, so a roster is solid before you attempt the mixed all-K-pop round.</li>
        <li>Do not skip b-sides. Title tracks are easy points; the album tracks are where scores are won or lost.</li>
        <li>When you miss one, replay the reveal and fix the sound in memory before moving on.</li>
        <li>Come back to the same playlist a few days later, because spacing is what turns recall into reflex.</li>
      </ol>
      <p>
        The by-group mode is the fastest way to build that muscle. Narrowing the pool to a single
        group lets you drill its catalog until every intro is instant, and the general skill
        accumulates as a side effect of doing that group by group rather than trying to improve at
        "K-pop" in the abstract.
      </p>

      <h2 id="by-group">Can you play the blind test for just one group?</h2>
      <p>
        Yes. Any group with enough songs in the catalog gets its own playlist, so you can spend a
        round entirely inside BTS, BLACKPINK, Stray Kids or a rookie you are still learning. Single
        group mode is both the better practice tool and the more forgiving warm-up, since you are only
        ever choosing between songs you have a real chance of knowing.
      </p>
      <div className="art-cta-inline">
        <Link href="/blindtest" className="art-cta-btn">Pick a group and play</Link>
        <Link href="/cortis-quiz" className="art-cta-btn art-cta-secondary">Cortis quiz</Link>
      </div>

      <h2 id="where">Where can I play the 2026 K-pop blind test?</h2>
      <p>
        The blind test page is the fastest route in: pick All K-pop for the full mixed round, a
        generation to narrow the era, or a single group to drill. It is free, needs no account, and a
        round starts the moment you hit play. If you want the underlying technique in more depth, the
        companion guide on recognising any song in ten seconds breaks the skill down further.
      </p>
      <div className="art-cta-inline">
        <Link href="/blindtest" className="art-cta-btn">Start the blind test</Link>
        <Link href="/articles/kpop-blind-test-guide" className="art-cta-btn art-cta-secondary">How to recognise any song</Link>
      </div>
    </>
  );
}
