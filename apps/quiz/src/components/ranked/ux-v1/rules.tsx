import { Icon } from '@/components/ux-v1/icon';
import { UxRow } from '@/components/ux-v1/panel';
import { DAILY_RUN_LIMIT, DIFFICULTY_MIX, ARTIST_ROUNDS, SONG_ROUNDS } from '@/lib/ranked/constants';
import { comma } from '@/lib/ranked/view';
import { maxRunPoints } from '@/lib/ranked/scoring';

// "How ranked works" and "Season rewards" (prototype #ranked, copy verbatim; the
// numbers come from the engine's constants so the page and the engine cannot
// drift). Server-rendered, crawlable collapse (native <details>, content in the
// HTML), first item open like the prototype.

const ITEMS: Array<{ title: string; body: React.ReactNode }> = [
  {
    title: 'A ranked run',
    body: (
      <>
        Ten songs drawn by the server from the whole pool: <b>{DIFFICULTY_MIX.easy} easy, {DIFFICULTY_MIX.medium} medium and {DIFFICULTY_MIX.hard} hard</b>, based on how often fans get them right. {SONG_ROUNDS} song rounds and {ARTIST_ROUNDS} artist rounds, 10-second clips, no skip, no playlist choice. Everyone plays by the same rules.
      </>
    ),
  },
  {
    title: 'Points per song',
    body: (
      <>
        <b>100</b> for a right answer, plus up to <b>100</b> for speed: full bonus under 2 seconds, nothing at 10. Then your combo multiplies it: x1.0, +0.1 for each right answer in a row, up to x2.0. A miss resets the combo. A perfect fast run is about {comma(maxRunPoints())} points.
      </>
    ),
  },
  {
    title: 'Season score',
    body: (
      <>
        Your season score is the total of your <b>5 best runs</b>. A new run counts only if it beats your fifth best, so your score never goes down. Ties are broken by average answer speed.
      </>
    ),
  },
  {
    title: 'Seasons and placement',
    body: (
      <>
        A season lasts 8 weeks. When it ends you keep your rank title and XP, your season score starts again, and your first 5 runs place you. You get a badge for your final tier.
      </>
    ),
  },
  {
    title: 'Fair play',
    body: (
      <>
        Songs and clip timings come from the server, and answer times are measured from the moment the clip starts. You can play {DAILY_RUN_LIMIT} ranked runs a day. If you quit, the run is recorded with the songs you answered.
      </>
    ),
  },
  {
    title: 'Rank title and ranked tier',
    body: (
      <>
        Your rank title (Trainee, Rookie, Debut, Idol, Star, Superstar, Legend) comes from all the blindtest XP you have ever earned and never goes down. Your ranked tier is for this season only.
      </>
    ),
  },
];

export function HowRankedWorks(): React.ReactElement {
  return (
    <section className="ux-sec p7-sec" aria-labelledby="p7-how-h">
      <h2 id="p7-how-h" className="ux-h2 p7-h2 p7-h2-how">How ranked works</h2>
      {ITEMS.map((it, i) => (
        <details key={it.title} className="p7-acc" open={i === 0}>
          <summary>{it.title}<Icon name="chev" /></summary>
          <div className="p7-ab">{it.body}</div>
        </details>
      ))}
    </section>
  );
}

export function SeasonRewards(): React.ReactElement {
  return (
    <section className="ux-sec p7-sec" aria-labelledby="p7-rew-h">
      <h2 id="p7-rew-h" className="ux-h2 p7-h2 p7-h2-rew">Season rewards</h2>
      <div className="ux-rows p7-rew">
        <UxRow lead={<Icon name="medal" />} title="A season badge" sub="Your final tier, on your passport for good" />
        <UxRow lead={<Icon name="trophy" />} title="Double fandom war points" sub="Every ranked run counts twice for your fandom" />
        <UxRow lead={<Icon name="star" />} title="Your tier colour on your name" sub="From Diamond and up" />
      </div>
    </section>
  );
}
