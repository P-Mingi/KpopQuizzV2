import Link from 'next/link';

export function ArticleBody(): React.ReactElement {
  return (
    <>
      <p className="art-lead">
        Every group playlist in the kpopquiz.org blind test draws from the same
        18 curated songs, so difficulty comes down to how recognizable a
        group&apos;s catalog is, not how big it is. Groups with hook-driven,
        heavily streamed title tracks are the easiest to guess. Groups with deep,
        similar-sounding eras are the hardest. Here is a practical ranking.
      </p>

      <h2 id="easiest">Which group blind tests are the easiest?</h2>
      <p>
        The easiest playlists belong to groups whose biggest songs are instantly
        recognizable from the first few seconds. If you have heard K-pop on the
        radio or on social media, you have almost certainly heard these.
      </p>
      <ol>
        <li><strong>BLACKPINK</strong> - massive, hook-forward title tracks that are hard to miss.</li>
        <li><strong>NewJeans</strong> - a consistent, breezy sound that is easy to place.</li>
        <li><strong>TWICE</strong> - bright, sing-along choruses across a long career.</li>
        <li><strong>BTS</strong> - globally famous singles that most players recognize fast.</li>
      </ol>

      <h2 id="medium">Which group blind tests are medium difficulty?</h2>
      <p>
        Mid-tier playlists mix well-known singles with B-sides that sound alike.
        You will guess the hits quickly but need real familiarity for the deeper
        cuts.
      </p>
      <ol>
        <li><strong>Stray Kids</strong> - genre-shifting production rewards close listening.</li>
        <li><strong>aespa</strong> - bold concepts vary from era to era.</li>
        <li><strong>ITZY</strong> and <strong>IVE</strong> - strong hooks, but several tracks share a palette.</li>
      </ol>

      <h2 id="hardest">Which group blind tests are the hardest?</h2>
      <p>
        The hardest playlists come from groups with dense catalogs or a
        cinematic, similar-sounding house style, where B-sides blur together
        without deep fandom knowledge.
      </p>
      <ol>
        <li><strong>ATEEZ</strong> - long-running concept eras and bold, similar textures.</li>
        <li><strong>SEVENTEEN</strong> - a huge catalog with many self-produced B-sides.</li>
        <li><strong>Red Velvet</strong> - two distinct sides, sweet and experimental, that trip up casual fans.</li>
      </ol>
      <p className="art-highlight">
        <strong>Tip:</strong> if a group feels too hard, learn its title tracks
        era by era first. Each era usually has a distinct production style that
        narrows the answer.
      </p>

      <h2 id="how-to-play">How do I play a group blind test?</h2>
      <p>
        Open the blind test, pick a group from the playlist selector, and guess
        each song or artist from a short clip. You can also play the all-groups
        mix or filter by generation if you want a broader challenge.
      </p>
      <div className="art-cta-inline">
        <Link href="/blindtest" className="art-cta-btn">Play the blind test</Link>
        <Link href="/blackpink-quiz" className="art-cta-btn art-cta-secondary">Start with BLACKPINK</Link>
      </div>
    </>
  );
}
