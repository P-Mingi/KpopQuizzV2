import Link from 'next/link';

export function ArticleBody(): React.ReactElement {
  return (
    <>
      <p className="art-lead">
        BTS have one of the deepest discographies in K-pop: seven members, 17
        albums across Korean and Japanese releases, and a blind test catalog of 29
        songs on kpopquiz.org. That scale is exactly why BTS quizzes are among the
        hardest on the platform, with 30 fan-made quizzes and over 8,800 plays.
        This guide breaks the catalog into eras so you can study it, then test
        every one.
      </p>

      <h2 id="members">Who are the members of BTS?</h2>
      <p>
        BTS have seven members: RM, Jin, Suga, J-Hope, Jimin, V, and Jungkook.
        Knowing each member and their solo work is the foundation for the harder
        quizzes, which often test who released or wrote a given track.
      </p>
      <ul>
        <li><strong>RM</strong> &ndash; leader, main rapper</li>
        <li><strong>Jin</strong> &ndash; vocalist, eldest member</li>
        <li><strong>Suga</strong> &ndash; rapper, producer (solo: Agust D)</li>
        <li><strong>J-Hope</strong> &ndash; rapper, dancer, solo artist</li>
        <li><strong>Jimin</strong> &ndash; vocalist, lead dancer</li>
        <li><strong>V</strong> &ndash; vocalist, visual</li>
        <li><strong>Jungkook</strong> &ndash; main vocalist, youngest member</li>
      </ul>

      <h2 id="discography-overview">BTS discography at a glance</h2>
      <p>
        The numbers below come from the kpopquiz.org database. BTS have 17 albums
        (Korean studio albums, EPs, Japanese albums, and a soundtrack). The blind
        test draws from 29 songs across these releases.
      </p>
      <div className="art-table-wrap">
        <table className="art-table">
          <thead>
            <tr><th>Stat</th><th>Count</th></tr>
          </thead>
          <tbody>
            <tr><td>Korean studio albums</td><td>5</td></tr>
            <tr><td>Korean EPs</td><td>6</td></tr>
            <tr><td>Japanese albums</td><td>4</td></tr>
            <tr><td>Other (soundtrack, special)</td><td>2</td></tr>
            <tr><td>Total albums in catalog</td><td>17</td></tr>
            <tr><td>Blind test songs</td><td>29</td></tr>
            <tr><td>Quizzes on platform</td><td>30</td></tr>
          </tbody>
        </table>
      </div>

      <h2 id="why-hard">Why is the BTS discography so hard to quiz on?</h2>
      <p>
        Two reasons: volume and depth. Across 17 albums, quiz creators can pull
        from a huge pool of B-sides, intros, and skits. On top of that sit the BTS
        Universe storyline and every member&apos;s solo catalog, which multiply the
        trivia surface area. The 29-song blind test alone covers songs from the
        school trilogy through the most recent releases.
      </p>
      <p className="art-highlight">
        <strong>Study tip:</strong> learn the catalog era by era. Each BTS era has
        a distinct production style, so anchoring songs to their era is the
        fastest way to narrow an answer.
      </p>

      <h2 id="school-trilogy">School Trilogy era (2013 - 2014)</h2>
      <p>
        BTS debuted as a hip-hop-focused act on Big Hit Entertainment. Their
        earliest releases center on school life, youth rebellion, and growing
        pains. The production leans heavily on rap, making these tracks easy to
        distinguish from later eras in a blind test.
      </p>
      <div className="art-table-wrap">
        <table className="art-table">
          <thead>
            <tr><th>Album</th><th>Type</th><th>Release</th></tr>
          </thead>
          <tbody>
            <tr><td>O!RUL8,2?</td><td>EP</td><td>September 2013</td></tr>
            <tr><td>Skool Luv Affair</td><td>EP</td><td>February 2014</td></tr>
            <tr><td>DARK&amp;WILD</td><td>Album</td><td>August 2014</td></tr>
          </tbody>
        </table>
      </div>

      <h2 id="hyyh-era">The Most Beautiful Moment in Life (2015 - 2016)</h2>
      <p>
        The HYYH (Hwa Yang Yeon Hwa) era marks BTS&apos;s shift from pure hip-hop
        toward emotional pop and cinematic storytelling. This is when the BTS
        Universe narrative starts, so quizzes from this era often test both music
        and lore.
      </p>
      <div className="art-table-wrap">
        <table className="art-table">
          <thead>
            <tr><th>Album</th><th>Type</th><th>Release</th></tr>
          </thead>
          <tbody>
            <tr><td>&#54868;&#50577;&#50672;&#54868; pt.1</td><td>EP</td><td>April 2015</td></tr>
            <tr><td>&#54868;&#50577;&#50672;&#54868; pt.2</td><td>EP</td><td>November 2015</td></tr>
            <tr><td>WINGS</td><td>Album</td><td>October 2016</td></tr>
          </tbody>
        </table>
      </div>

      <h2 id="love-yourself">Love Yourself era (2017 - 2018)</h2>
      <p>
        The Love Yourself trilogy propelled BTS into global stardom. The sound
        broadened into pop, EDM, and R&amp;B, and the albums charted worldwide.
        &quot;DNA&quot; and &quot;Fake Love&quot; are among the most-tested blind
        test songs on the platform.
      </p>
      <div className="art-table-wrap">
        <table className="art-table">
          <thead>
            <tr><th>Album</th><th>Type</th><th>Release</th></tr>
          </thead>
          <tbody>
            <tr><td>LOVE YOURSELF &#25215; &apos;Her&apos;</td><td>EP</td><td>September 2017</td></tr>
            <tr><td>LOVE YOURSELF &#36681; &apos;Tear&apos;</td><td>Album</td><td>May 2018</td></tr>
          </tbody>
        </table>
      </div>

      <h2 id="map-of-the-soul">Map of the Soul era (2019 - 2020)</h2>
      <p>
        The Map of the Soul era draws on Jungian psychology. MAP OF THE SOUL : 7
        became BTS&apos;s longest album with 20 tracks, including sub-unit songs
        that quiz creators love to test. BE closed the Korean studio album run
        with a pandemic-era introspective record.
      </p>
      <div className="art-table-wrap">
        <table className="art-table">
          <thead>
            <tr><th>Album</th><th>Type</th><th>Release</th></tr>
          </thead>
          <tbody>
            <tr><td>MAP OF THE SOUL : PERSONA</td><td>EP</td><td>April 2019</td></tr>
            <tr><td>MAP OF THE SOUL : 7</td><td>Album</td><td>February 2020</td></tr>
            <tr><td>BE</td><td>Album</td><td>November 2020</td></tr>
          </tbody>
        </table>
      </div>

      <h2 id="return">Return era (2025+)</h2>
      <p>
        After military service, BTS released ARIRANG in March 2026. The album
        marks their return as a full group.
      </p>
      <div className="art-table-wrap">
        <table className="art-table">
          <thead>
            <tr><th>Album</th><th>Type</th><th>Release</th></tr>
          </thead>
          <tbody>
            <tr><td>ARIRANG</td><td>Album</td><td>March 2026</td></tr>
          </tbody>
        </table>
      </div>

      <h2 id="japanese-albums">Japanese releases</h2>
      <p>
        BTS also released four Japanese-market albums. Some quiz creators pull
        from these, particularly the Japanese versions of Korean title tracks.
      </p>
      <div className="art-table-wrap">
        <table className="art-table">
          <thead>
            <tr><th>Album</th><th>Release</th></tr>
          </thead>
          <tbody>
            <tr><td>WAKE UP</td><td>December 2014</td></tr>
            <tr><td>YOUTH</td><td>September 2016</td></tr>
            <tr><td>FACE YOURSELF</td><td>April 2018</td></tr>
            <tr><td>MAP OF THE SOUL : 7 ~ THE JOURNEY ~</td><td>July 2020</td></tr>
          </tbody>
        </table>
      </div>

      <h2 id="test">Where can I test my BTS knowledge?</h2>
      <p>
        The BTS quiz hub has 30 fan-made quizzes for every level, from member
        basics to B-side deep cuts. The BTS blind test covers 29 songs to test
        your ear, or see how ARMY stack up against BLINK in the BTS vs BLACKPINK
        comparison.
      </p>
      <div className="art-cta-inline">
        <Link href="/bts-quiz" className="art-cta-btn">BTS quizzes</Link>
        <Link href="/articles/bts-vs-blackpink-quiz" className="art-cta-btn art-cta-secondary">BTS vs BLACKPINK</Link>
      </div>
    </>
  );
}
