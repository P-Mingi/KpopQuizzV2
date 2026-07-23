import Link from 'next/link';

export function ArticleBody(): React.ReactElement {
  return (
    <>
      <p className="art-lead">
        K-pop is usually split into five generations, each spanning roughly five
        to eight years. The group you first fell for places you on that timeline:
        2nd gen for the Wonder Girls and Big Bang era, 3rd gen for BTS and TWICE,
        4th gen for aespa and Stray Kids, and 5th gen for the newest debuts. Here
        is the timeline, with a quiz to test where you really started.
      </p>

      <h2 id="timeline">What are the K-pop generations, by year?</h2>
      <p>
        Generation boundaries are approximate and fans debate the edges, but the
        broad ranges below are widely accepted. Use them to find your starting
        era.
      </p>
      <div className="art-table-wrap">
        <table className="art-table">
          <thead>
            <tr><th>Generation</th><th>Approx. years</th><th>Era markers</th></tr>
          </thead>
          <tbody>
            <tr><td>1st gen</td><td>1996 - 2003</td><td>H.O.T., S.E.S., the idol template begins</td></tr>
            <tr><td>2nd gen</td><td>2004 - 2011</td><td>Big Bang, Girls&apos; Generation, global YouTube reach</td></tr>
            <tr><td>3rd gen</td><td>2012 - 2017</td><td>BTS, TWICE, EXO, worldwide breakthrough</td></tr>
            <tr><td>4th gen</td><td>2018 - 2022</td><td>aespa, Stray Kids, ATEEZ, self-producing acts</td></tr>
            <tr><td>5th gen</td><td>2023 - present</td><td>the newest debuts and rookie fandoms</td></tr>
          </tbody>
        </table>
      </div>

      <h2 id="which-gen">How do I know which K-pop generation I started in?</h2>
      <p>
        Think about the first group whose comeback you followed in real time, not
        one you discovered later. That group&apos;s generation is your entry
        point. Many fans are surprised to learn their favorite is a generation
        older or newer than they assumed.
      </p>
      <p className="art-highlight">
        <strong>Fan fact:</strong> the generation you start in tends to shape your
        taste for years, but most long-term fans end up following groups across
        two or three generations.
      </p>

      <h2 id="test">How can I test my K-pop era knowledge?</h2>
      <p>
        The blind test lets you filter by generation, so you can play only the
        era you grew up on or challenge yourself on the others. For a deeper dive
        into how the generations are defined, read the full generations guide.
      </p>
      <div className="art-cta-inline">
        <Link href="/blindtest" className="art-cta-btn">Play by generation</Link>
        <Link href="/articles/kpop-generations-explained" className="art-cta-btn art-cta-secondary">Generations explained</Link>
      </div>
    </>
  );
}
