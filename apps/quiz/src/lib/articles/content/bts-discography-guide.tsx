import Link from 'next/link';

export function ArticleBody(): React.ReactElement {
  return (
    <>
      <p className="art-lead">
        BTS have one of the deepest discographies in K-pop: seven members, nine
        Korean studio albums, Japanese releases, mixtapes and solo projects add
        up to more than 200 songs. That scale is exactly why BTS quizzes are among
        the hardest on kpopquiz.org. This guide breaks the catalog into eras so
        you can study it, then test every one.
      </p>

      <h2 id="members">Who are the members of BTS?</h2>
      <p>
        BTS have seven members. Knowing each one, plus their solo work, is the
        foundation for the harder quizzes, which often test who released or wrote
        a given track.
      </p>
      <ul>
        <li><strong>RM</strong></li>
        <li><strong>Jin</strong></li>
        <li><strong>Suga</strong></li>
        <li><strong>J-Hope</strong></li>
        <li><strong>Jimin</strong></li>
        <li><strong>V</strong></li>
        <li><strong>Jungkook</strong></li>
      </ul>

      <h2 id="why-hard">Why is the BTS discography so hard to quiz on?</h2>
      <p>
        Two reasons: volume and depth. With more than 200 songs across nine Korean
        studio albums plus Japanese releases and mixtapes, quiz creators can pull
        from a huge pool of B-sides, intros and skits. On top of that sit the BTS
        Universe storyline and every member&apos;s solo catalog, which multiply
        the trivia surface area.
      </p>
      <p className="art-highlight">
        <strong>Study tip:</strong> learn the catalog era by era. Each BTS era has
        a distinct production style, so anchoring songs to their era is the
        fastest way to narrow an answer.
      </p>

      <h2 id="by-era">How should I study BTS by era?</h2>
      <p>
        Break the catalog into recognizable chapters rather than one flat list.
        The debut and school-trilogy years, the coming-of-age era, the
        genre-expanding Love Yourself run, the reflective Map of the Soul era, and
        the members&apos; solo projects each have their own sound. Master one
        chapter at a time before you attempt a full-discography quiz.
      </p>

      <h2 id="test">Where can I test my BTS knowledge?</h2>
      <p>
        The BTS quiz hub has fan-made quizzes for every level, from member basics
        to B-side deep cuts. Pair it with the BTS blind test to test your ear, or
        see how ARMY stack up against BLINK.
      </p>
      <div className="art-cta-inline">
        <Link href="/bts-quiz" className="art-cta-btn">BTS quizzes</Link>
        <Link href="/articles/bts-vs-blackpink-quiz" className="art-cta-btn art-cta-secondary">BTS vs BLACKPINK</Link>
      </div>
    </>
  );
}
