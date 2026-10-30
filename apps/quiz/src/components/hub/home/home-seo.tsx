// Home v3 (2026-10-29, Home.dc.html): the block under the rows, in the server HTML: "What is Bunnyverse?" (the answer block of the page, SEO
// rule 3.1) and the table of the daily games. It says only what is true today: the Burrow, Kpopdle and Otakudle and how they work appear
// once the Burrow is open (lib/site/hub/daily-guess.ts); the quiz and the blind test of the day take their numbers from today's data, and a
// row whose game has no data is left out.
// Review fix: the answer is built from today's data too. Its daily sentence names the quizzes of the day, the blind test and the debate
// only when today has them (no sentence with none of them), and one more true sentence joins when the block would be under 40 words, so
// it stays between 40 and 60. The quiz of the day row says "N questions on each site" only when both sites have a quiz of the day with
// that count; otherwise it gives the count of each site, or says which site has a quiz.
import { ht } from '@/lib/site/hub/copy';

import { siteName } from './home-names';

import type { HomeToday } from '@/lib/site/hub/home-types';

/** SEO rule 3.1: the answer block has 40 to 60 words. */
export const ANSWER_MIN_WORDS = 40;

/** "a", "a and b", "a, b and c". */
function andList(items: readonly string[]): string {
  return items.length > 1 ? `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}` : (items[0] ?? '');
}

const words = (text: string): number => text.split(/\s+/).filter(Boolean).length;

/** The daily sentence: what today really has (the quizzes of the day, the K-pop blind test, the debate), or null with none of them. */
function daySentence(today: HomeToday | null): string | null {
  if (!today) return null;
  const sites = today.quizzes.map((q) => q.site);
  const both = sites.includes('kpop') && sites.includes('anime');
  const items = [
    ...(both ? [ht('hp.seo.dayQuizzes')] : sites.length === 1 ? [ht('hp.seo.dayQuiz', { name: siteName(sites[0]!) })] : []),
    ...(today.blindtest?.site === 'kpop' ? [ht('hp.seo.dayBt')] : []),
    ...(today.debate ? [ht('hp.seo.dayDebate')] : []),
  ];
  return items.length > 0 ? ht('hp.seo.day', { list: andList(items) }) : null;
}

/** "What is Bunnyverse?": the answer block, from today's data, between 40 and 60 words. */
export function whatIsText(today: HomeToday | null, burrow: boolean): string {
  const head = [burrow ? ht('hp.seo.whatIsBurrow') : ht('hp.seo.whatIs'), burrow ? ht('hp.seo.hostsBurrow') : ht('hp.seo.hosts')];
  const day = daySentence(today);
  const parts = [...head, ...(day ? [day] : []), ht('hp.seo.pass')];
  if (words(parts.join(' ')) < ANSWER_MIN_WORDS) parts.splice(parts.length - 1, 0, ht('hp.seo.links'));
  return parts.join(' ');
}

/** The quiz of the day row: the shared count only when both sites have a quiz of the day with that count; else each site's own. */
export function qotdText(today: HomeToday | null): string | null {
  const quizzes = today?.quizzes ?? [];
  if (quizzes.length === 0) return null;
  const kpop = quizzes.find((q) => q.site === 'kpop');
  const anime = quizzes.find((q) => q.site === 'anime');
  if (kpop && anime && kpop.questions > 0 && kpop.questions === anime.questions) return ht('hp.seo.qotdCount', { questions: kpop.questions });
  const counted = quizzes.filter((q) => q.questions > 0).map((q) => ht('hp.seo.qotdSite', { questions: q.questions, name: siteName(q.site) }));
  if (counted.length > 0) return andList(counted);
  return kpop && anime ? ht('hp.seo.qotdWhat') : ht('hp.seo.qotdWhatOne', { name: siteName(quizzes[0]!.site) });
}

export function HomeSeo({ today, burrow }: { today: HomeToday | null; burrow: boolean }): React.ReactElement {
  const qotd = qotdText(today);
  const bt = today?.blindtest ?? null;
  const rows: Array<[string, string]> = [
    ...(burrow ? [[ht('hp.today.kpopdle'), ht('hp.seo.kpopdle')], [ht('hp.today.otakudle'), ht('hp.seo.otakudle')]] as Array<[string, string]> : []),
    ...(qotd ? [[ht('hp.seo.qotd'), qotd]] as Array<[string, string]> : []),
    ...(bt ? [[ht('hp.seo.bt'), ht('hp.seo.btWhat', { songs: bt.songs, seconds: bt.seconds })]] as Array<[string, string]> : []),
  ];
  return (
    <section aria-labelledby="what-h" className="hub-h2-seo">
      <div className="hub-h2-seo-text">
        <h2 id="what-h" className="hub-h2-h2">{ht('hp.seo.title')}</h2>
        <p className="hub-h2-seo-p">{whatIsText(today, burrow)}</p>
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
