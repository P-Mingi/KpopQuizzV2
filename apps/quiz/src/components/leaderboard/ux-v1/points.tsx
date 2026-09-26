import { Icon } from '@/components/ux-v1/icon';

import type { CreatorsView } from '@/lib/ux-v1/p9/data';

// "How points work" (prototype #leaderboard section.sec: h2 + three native
// <details>). DESIGN-SPEC 13.5: the prototype's rules are illustrative, the copy
// must be the real ones. Each sentence below was checked in the code that makes
// the numbers (the sources are named in the P9 report, section 4):
//   war      get_fandom_war_map (mig 107) + getFandomWarMap (1 h cache)
//   players  profiles.xp, /api/quiz/[id]/play, /api/daily/complete, /api/quiz/create
//   creators profiles.total_plays_received (record_play), getTopCreatorsThisWeek, get_rising_creators

function Acc({ title, children }: { title: string; children: React.ReactNode }): React.ReactElement {
  return (
    <details className="p9-acc">
      <summary>{title}<Icon name="chev" /></summary>
      <div className="p9-ab">{children}</div>
    </details>
  );
}

export function HowPoints({ creatorViews }: { creatorViews: CreatorsView[] }): React.ReactElement {
  const week = creatorViews.includes('week');
  const rising = creatorViews.includes('rising');
  return (
    <section className="ux-sec p9-how" aria-labelledby="p9-how-h">
      <h2 className="ux-h2 p9-how-h" id="p9-how-h">How points work</h2>
      <Acc title="Fandom war points">
        {/* explicit space: SWC drops the leading space of a multi-line JSX text that holds an entity */}
        Every finished quiz about a group adds <b>1 point</b>{' '}to that group&apos;s fandom, whoever plays it, guests and
        replays included. The board counts the <b>last 7 days</b> and updates every hour; the change is against the 7 days
        before. General K-pop quizzes and blindtests do not count. Your main group, set in Settings, is the fandom pinned
        under the board.
      </Acc>
      <Acc title="Player points">
        Players are ranked by <b>all-time XP</b>, the XP that sets your level on your passport. Finishing a quiz for the
        first time earns <b>10 XP</b>, <b>5 more</b> at 70% or better and <b>15 more</b> for a perfect score (replays earn
        none). Your daily streak, publishing quizzes and plays of your quizzes by other fans earn XP too.
      </Acc>
      <Acc title="Creator points">
        Creators are ranked by the <b>plays their quizzes have received</b> since they joined: every finished play counts,
        guests included.
        {week ? <> <b>This week</b> counts the plays of the quizzes they published in the last 7 days.</> : null}
        {rising ? <> <b>Rising</b> counts new followers in the last 7 days.</> : null}
        {' '}Your pinned row is your all-time standing.
      </Acc>
    </section>
  );
}
