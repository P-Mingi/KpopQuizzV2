// Home v3 (2026-10-29, Home.dc.html): the block under the rows, in the server HTML: "What is Bunnyverse?" (the answer block of the page, SEO
// rule 3.1) and the table of the daily games. It says only what is true today: the Burrow, Kpopdle and Otakudle and how they work appear
// once the Burrow is open (lib/site/hub/daily-guess.ts); the quiz and the blind test of the day take their numbers from today's data (the
// question count of the two quizzes when they agree, the songs and seconds of the set), and a row whose game has no data is left out.
import { ht } from '@/lib/site/hub/copy';

import type { HomeToday } from '@/lib/site/hub/home-types';

/** The question count both quizzes of the day share, or null (no quiz, or two different counts). */
function sharedQuestions(today: HomeToday | null): number | null {
  const counts = [...new Set((today?.quizzes ?? []).map((q) => q.questions))];
  return counts.length === 1 && counts[0]! > 0 ? counts[0]! : null;
}

export function HomeSeo({ today, burrow }: { today: HomeToday | null; burrow: boolean }): React.ReactElement {
  const questions = sharedQuestions(today);
  const bt = today?.blindtest ?? null;
  const rows: Array<[string, string]> = [
    ...(burrow ? [[ht('hp.today.kpopdle'), ht('hp.seo.kpopdle')], [ht('hp.today.otakudle'), ht('hp.seo.otakudle')]] as Array<[string, string]> : []),
    ...(today && today.quizzes.length > 0 ? [[ht('hp.seo.qotd'), questions ? ht('hp.seo.qotdCount', { questions }) : ht('hp.seo.qotdWhat')]] as Array<[string, string]> : []),
    ...(bt ? [[ht('hp.seo.bt'), ht('hp.seo.btWhat', { songs: bt.songs, seconds: bt.seconds })]] as Array<[string, string]> : []),
  ];
  return (
    <section aria-labelledby="what-h" className="hub-h2-seo">
      <div className="hub-h2-seo-text">
        <h2 id="what-h" className="hub-h2-h2">{ht('hp.seo.title')}</h2>
        <p className="hub-h2-seo-p">{burrow ? ht('hp.seo.whatBurrow') : ht('hp.seo.what')}</p>
        {burrow ? (
          <>
            <h3 className="hub-h2-seo-h3">{ht('hp.seo.howTitle')}</h3>
            <p className="hub-h2-seo-p">{ht('hp.seo.how')}</p>
          </>
        ) : null}
      </div>
      {rows.length > 0 ? (
        <div className="hub-h2-seo-wrap">
          <table className="hub-h2-seo-table">
            <caption className="hub-h2-sr">{ht('hp.seo.caption')}</caption>
            <thead><tr><th scope="col">{ht('hp.seo.colGame')}</th><th scope="col">{ht('hp.seo.colGuess')}</th></tr></thead>
            <tbody>{rows.map(([game, what]) => <tr key={game}><td className="hub-h2-seo-game">{game}</td><td>{what}</td></tr>)}</tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
