import Link from 'next/link';
import { notFound } from 'next/navigation';

import { BoardRows, PersonAvatar, Podium } from '@/components/leaderboard/ux-v1/board';
import { BadgeMedal } from '@/components/ux-v1/badge-medal';
import { UxButton } from '@/components/ux-v1/button';
import { Icon } from '@/components/ux-v1/icon';
import { UxPage } from '@/components/ux-v1/page';
import { PersonName } from '@/components/ux-v1/person-name';
import { SectionHeader } from '@/components/ux-v1/section-header';
import { BOARD_RULES, CREATOR_TIERS } from '@/lib/creators/board';
import { getCreatorsPage } from '@/lib/creators/data';
import { safeFetch } from '@/lib/error-handling';
import { comma } from '@/lib/ux-v1/p9/format';
import { isUxV12 } from '@/lib/ux-v12';

import { CreatorsPin } from './pin';
import { CreatorsTabs } from './tabs';

import type { PodiumItem, RowItem } from '@/components/leaderboard/ux-v1/board';
import type { CreatorCard, CreatorsPageData } from '@/lib/creators/data';
import type { Metadata } from 'next';

// /creators (V12 G8, SYSTEM.md 5.4, prototype view `creators`): the creators
// board. This month and all time, plays from unique players (own plays and
// editorial accounts out), rising creator per fandom, the rules as they are
// counted, the creator tiers. Server component, static/ISR; the viewer's own row
// is a client island. noindex (run rule 6) and outside the sitemap.
// Flag off: 404 (the middleware already sends the path to / before that).

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Top quiz creators',
  description: 'The fans who make the K-pop quizzes everyone plays, this month and all time.',
  robots: { index: false, follow: true },
  alternates: { canonical: '/creators' },
};

const UNIT = <small className="p9-unit"> plays</small>;

function podiumItems(rows: CreatorCard[]): PodiumItem[] {
  return rows.map((r) => ({
    key: r.username,
    rank: r.rank,
    avatar: <PersonAvatar avatar={r.avatar} name={r.username} size="pod" />,
    title: <PersonName name={r.username} accent={r.accent} font={r.font} href={r.href} showBias={false} className="p9-link" />,
    sub: r.sub,
    value: <>{comma(r.plays)}{UNIT}</>,
  }));
}

function rowItems(rows: CreatorCard[]): RowItem[] {
  return rows.map((r) => ({
    key: r.username,
    rank: r.rank,
    avatar: <PersonAvatar avatar={r.avatar} name={r.username} size="row" />,
    name: <PersonName name={r.username} accent={r.accent} font={r.font} bias={r.bias} href={r.href} className="p9-link" />,
    sub: r.sub,
    value: <>{comma(r.plays)}{UNIT}</>,
  }));
}

function Board({ rows, label, empty }: { rows: CreatorCard[]; label: string; empty: string }): React.ReactElement {
  if (rows.length === 0) return <p className="ux-muted g8-cr-empty">{empty}</p>;
  // The podium needs three creators; a shorter board is plain rows.
  const podium = rows.length >= 3 ? rows.slice(0, 3) : [];
  return (
    <div className="p9-board g8-cr-board">
      <Podium items={podiumItems(podium)} label={`Top 3 creators, ${label}`} />
      <BoardRows items={rowItems(rows.slice(podium.length))} top label={`Creators, ${label}`} />
    </div>
  );
}

export default async function CreatorsPage(): Promise<React.ReactElement> {
  if (!isUxV12()) notFound();
  const data = await safeFetch<CreatorsPageData | null>(getCreatorsPage(), null, '[creators] page', 20_000);

  return (
    <UxPage width="wide" className="g8-cr">
      <header className="ux-ph">
        <span className="ux-kicker"><Icon name="pen" />Creators</span>
        <h1>Top quiz creators</h1>
        <p>Fans who make the quizzes everyone plays. Resets on the 1st of each month.</p>
      </header>

      <div className="g8-cbgrid">
        <div className="g8-cb-main">
          {data ? (
            <CreatorsTabs
              month={(
                <>
                  <h2 className="ux-sr">Creators, plays in {data.monthLabel}</h2>
                  <Board rows={data.month} label="this month" empty={`No play counted yet in ${data.monthLabel}. The board fills as fans play.`} />
                  <CreatorsPin period="month" />
                </>
              )}
              all={(
                <>
                  <h2 className="ux-sr">Creators, plays of all time</h2>
                  <Board rows={data.all} label="all time" empty="No play counted yet." />
                  <CreatorsPin period="all" />
                </>
              )}
            />
          ) : (
            <p className="ux-muted g8-cr-empty" data-state="unavailable">The board could not load. Try again in a moment.</p>
          )}

          {data && data.rising.length > 0 ? (
            <section className="ux-sec g8-rising-sec" aria-labelledby="g8-rise-h">
              <SectionHeader id="g8-rise-h" title="Rising in each fandom" icon="flame" sub="Most plays on a first quiz this month" />
              <ul className="g8-rising">
                {data.rising.map((r) => (
                  <li key={`${r.fandom}:${r.username}`} className="g8-rz">
                    <small>{r.fandom}</small>
                    <b><Link href={r.href} prefetch={false}>{r.username}</Link></b>
                    <span><Link href={r.quizHref} prefetch={false}>{r.quizTitle}</Link> · {comma(r.plays)} {r.plays === 1 ? 'play' : 'plays'}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <aside className="g8-cb-side" aria-label="How the creators board works">
          <section className="g8-rules" aria-labelledby="g8-rules-h">
            <h2 id="g8-rules-h">How the board counts</h2>
            <ol>
              {BOARD_RULES.map((r) => <li key={r}>{r}</li>)}
            </ol>
          </section>
          <section className="g8-rules" aria-labelledby="g8-tiers-h">
            <h2 id="g8-tiers-h">Creator badges</h2>
            <ul className="g8-tiers">
              {CREATOR_TIERS.map((t) => (
                <li key={t.id}>
                  <BadgeMedal id={t.id} earned size={32} />
                  <span><b>{t.name}</b><span className="ux-muted">{t.line}</span></span>
                </li>
              ))}
            </ul>
          </section>
          <UxButton href="/create" size="lg" icon="plus" block className="g8-cb-cta">Create a quiz</UxButton>
          <p className="g8-cb-back"><Link href="/leaderboard#creators" className="ux-lnk">Back to the leaderboard</Link></p>
        </aside>
      </div>
    </UxPage>
  );
}
