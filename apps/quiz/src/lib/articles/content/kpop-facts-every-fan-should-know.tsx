import Link from 'next/link';

export function ArticleBody(): React.ReactElement {
  return (
    <>
      <p className="art-lead">
        Here are 40 K-pop facts every fan should know, each one verifiable against
        public record or the group data on kpopquiz.org. They cover debut years,
        member counts, fandom names, company affiliations and a few chart firsts.
        No rumors and no gossip, just the reference facts that come up again and
        again in quizzes.
      </p>

      <h2 id="debuts">When did the biggest K-pop groups debut?</h2>
      <p>
        Debut year is the most-tested K-pop fact because it fixes a group in its
        generation. These 17 debut years are settled public record, from the 2nd
        generation through the newest 4th-generation acts.
      </p>
      <ol>
        <li>Big Bang debuted in 2006.</li>
        <li>Girls&apos; Generation debuted in 2007.</li>
        <li>EXO debuted in 2012.</li>
        <li>BTS debuted in 2013.</li>
        <li>Red Velvet debuted in 2014.</li>
        <li>TWICE debuted in 2015.</li>
        <li>SEVENTEEN debuted in 2015.</li>
        <li>BLACKPINK debuted in 2016.</li>
        <li>Stray Kids debuted in 2018.</li>
        <li>ATEEZ debuted in 2018.</li>
        <li>ITZY debuted in 2019.</li>
        <li>TOMORROW X TOGETHER debuted in 2019.</li>
        <li>aespa debuted in 2020.</li>
        <li>ENHYPEN debuted in 2020.</li>
        <li>IVE debuted in 2021.</li>
        <li>NewJeans debuted in 2022.</li>
        <li>LE SSERAFIM debuted in 2022.</li>
      </ol>

      <h2 id="members">How many members does each K-pop group have?</h2>
      <p>
        Member count decides how hard a group is to memorize and is a staple of
        quiz rounds. These counts match the rosters used across kpopquiz.org.
      </p>
      <ol start={18}>
        <li>SEVENTEEN has 13 members, the largest lineup among major active groups.</li>
        <li>TWICE has 9 members.</li>
        <li>BTS has 7 members.</li>
        <li>Stray Kids has 8 members.</li>
        <li>ATEEZ has 8 members.</li>
        <li>BLACKPINK and aespa each have 4 members.</li>
        <li>NewJeans, ITZY and LE SSERAFIM each have 5 members, and IVE has 6.</li>
      </ol>

      <h2 id="fandoms">What are the K-pop fandom names?</h2>
      <p>
        Every K-pop group names its fandom, and knowing them is a quick way to
        prove you follow the group. These are the official fandom names.
      </p>
      <ol start={25}>
        <li>BTS&apos;s fandom is called ARMY.</li>
        <li>BLACKPINK&apos;s fandom is called BLINK.</li>
        <li>TWICE&apos;s fandom is called ONCE.</li>
        <li>Stray Kids&apos; fandom is called STAY.</li>
        <li>ATEEZ&apos;s fandom is called ATINY.</li>
        <li>SEVENTEEN&apos;s fandom is called CARAT.</li>
        <li>NewJeans&apos; fandom is called Bunnies, and aespa&apos;s is MY.</li>
      </ol>

      <h2 id="companies">Which companies do the big K-pop groups belong to?</h2>
      <p>
        Company affiliation shapes a group&apos;s sound and lineage. The four
        largest K-pop companies are SM, JYP, YG and HYBE, and here is where the
        major groups sit.
      </p>
      <ol start={32}>
        <li>BTS, TOMORROW X TOGETHER, ENHYPEN, LE SSERAFIM and NewJeans all release under HYBE labels.</li>
        <li>TWICE, Stray Kids and ITZY are JYP Entertainment groups.</li>
        <li>BLACKPINK debuted under YG Entertainment.</li>
        <li>aespa and Red Velvet are SM Entertainment groups.</li>
      </ol>

      <h2 id="records">What K-pop records and firsts should every fan know?</h2>
      <p>
        A few milestone firsts define K-pop&apos;s global rise and come up
        constantly in trivia. Each of these is documented public record.
      </p>
      <ol start={36}>
        <li>PSY&apos;s Gangnam Style was the first YouTube video to pass one billion views, in 2012.</li>
        <li>BTS&apos;s Dynamite was the group&apos;s first Billboard Hot 100 number-one single, in 2020.</li>
        <li>BLACKPINK were the first K-pop act to headline Coachella, in 2023.</li>
      </ol>

      <h2 id="structure">K-pop group structure facts</h2>
      <p>
        Two structural facts that trip up newer fans and reward those who know the
        groups well.
      </p>
      <ol start={39}>
        <li>SEVENTEEN is organized into three official units: hip-hop, vocal and performance.</li>
        <li>Stray Kids&apos; in-house production team is called 3RACHA.</li>
      </ol>

      <h2 id="test">Where can I test these K-pop facts?</h2>
      <p>
        Facts stick when you use them. Put these to the test in a group quiz, a
        blind test, or read the full breakdown of how the K-pop generations are
        defined.
      </p>
      <div className="art-cta-inline">
        <Link href="/quizzes" className="art-cta-btn">Browse all quizzes</Link>
        <Link href="/articles/kpop-generations-explained" className="art-cta-btn art-cta-secondary">Generations explained</Link>
      </div>
    </>
  );
}
