import Link from 'next/link';

export function ArticleBody(): React.ReactElement {
  return (
    <>
      <p className="art-lead">
        BTS and BLACKPINK are the two biggest names in K-pop, but which fandom
        actually knows their group better? We compared real quiz scores, hardest
        questions, and fandom engagement data from kpopquiz.org to find out. The
        results might surprise you.
      </p>

      <h2 id="head-to-head">Head-to-Head Comparison</h2>
      <p>
        Both groups have dedicated fanbases (ARMY for BTS, BLINK for BLACKPINK)
        that pride themselves on deep knowledge. But quizzes reveal real
        differences in what fans know and where they struggle. Here is how the
        two fandoms stack up across key metrics on kpopquiz.org.
      </p>
      <div className="art-table-wrap">
        <table className="art-table">
          <thead>
            <tr>
              <th>Metric</th>
              <th>BTS</th>
              <th>BLACKPINK</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Total quizzes available</td>
              <td>40+</td>
              <td>25+</td>
            </tr>
            <tr>
              <td>Blind test songs</td>
              <td>200+</td>
              <td>80+</td>
            </tr>
            <tr>
              <td>Members to memorize</td>
              <td>7</td>
              <td>4</td>
            </tr>
            <tr>
              <td>Discography depth</td>
              <td>9 Korean albums, 3 Japanese</td>
              <td>2 Korean albums, 1 Japanese</td>
            </tr>
            <tr>
              <td>Hardest quiz category</td>
              <td>B-side deep cuts</td>
              <td>Solo project details</td>
            </tr>
            <tr>
              <td>Average quiz difficulty</td>
              <td>Medium-Hard</td>
              <td>Easy-Medium</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 id="why-bts-harder">Why BTS Quizzes Tend to Be Harder</h2>
      <p>
        BTS has a significantly larger discography, with over 200 songs spanning
        nine Korean studio albums, mixtapes, and Japanese releases. This means
        quiz creators can pull from a much deeper pool of B-sides, intros, and
        skits that casual fans might not recognize.
      </p>
      <p>
        The group&apos;s lore (the BTS Universe storyline), solo projects (each
        member has released solo albums or mixtapes), and extensive variety show
        appearances also create a massive trivia surface area. Hardcore ARMY
        thrive on these details, but they make BTS quizzes intimidating for
        newer fans.
      </p>

      <h2 id="blackpink-challenge">The BLACKPINK Challenge</h2>
      <p>
        BLACKPINK quizzes are generally more accessible because the group has a
        smaller discography and four members instead of seven. But do not
        underestimate the difficulty: BLACKPINK fans are tested on solo projects
        (Lisa&apos;s LALISA, Jennie&apos;s SOLO, Rose&apos;s -R-, Jisoo&apos;s
        ME), fashion and brand partnerships, variety show moments, and
        BLACKPINK&apos;s record-breaking YouTube achievements.
      </p>
      <p>
        The hardest BLACKPINK questions tend to involve specific dates, concert
        setlist orders, and details from their pre-debut training period.
      </p>

      <h2 id="blind-test">Blind Test: Which Songs Are Harder to Guess?</h2>
      <p>
        In the K-pop blind test, both groups present unique challenges. BTS songs
        can be tricky because of the sheer volume: telling apart similar-era
        B-sides requires deep listening. BLACKPINK songs are fewer but fans
        sometimes confuse solo tracks with group tracks, especially when the
        musical style overlaps.
      </p>
      <p className="art-highlight">
        <strong>Pro tip:</strong> BTS fans who struggle with B-sides should focus
        on album-specific sounds. Each BTS era has a distinct production style
        that helps narrow down the answer.
      </p>
      <div className="art-cta-inline">
        <Link href="/blindtest" className="art-cta-btn">Try the blind test</Link>
      </div>

      <h2 id="which-fandom">Which Fandom Knows More?</h2>
      <p>
        Based on quiz completion data, both fandoms show deep knowledge of their
        group, but the playing field is not even. BTS fans face harder questions
        on average because there is simply more material to know. BLACKPINK fans
        tend to score higher on percentage-based metrics, but the questions they
        face are generally less obscure.
      </p>
      <p>
        The real answer: both fandoms know their group extremely well. The
        difference is not knowledge depth but knowledge breadth. ARMY needs to
        cover more ground; BLINK needs to know every detail of a smaller catalog.
      </p>

      <h2 id="try-both">Test Yourself: Take Both Quizzes</h2>
      <p>
        The only way to settle this is to try both. Take the BTS quiz and the
        BLACKPINK quiz back to back and see which one you score higher on. Share
        your results and challenge the other fandom.
      </p>
      <div className="art-cta-inline">
        <Link href="/bts-quiz" className="art-cta-btn">BTS quiz</Link>
        <Link href="/blackpink-quiz" className="art-cta-btn art-cta-secondary">BLACKPINK quiz</Link>
      </div>
    </>
  );
}
