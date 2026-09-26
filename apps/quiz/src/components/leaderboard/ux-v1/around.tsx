import Link from 'next/link';

import { UxAvatar } from '@/components/ux-v1/avatar';
import { BadgeMedal } from '@/components/ux-v1/badge-medal';
import { UxLink } from '@/components/ux-v1/button';
import { Icon } from '@/components/ux-v1/icon';
import { Panel } from '@/components/ux-v1/panel';
import { PersonName } from '@/components/ux-v1/person-name';
import { SectionHeader } from '@/components/ux-v1/section-header';
import { comma, playsLabel } from '@/lib/ux-v1/p9/format';

import { GroupAvatar } from './board';

import type { AroundData, AroundPerson } from '@/lib/ux-v1/p9/data';

// "Around the community": the rest of what the live /leaderboard serves today
// (components/community/community-content.tsx: today's numbers, the daily quiz and
// blindtest, Happening now, Fresh quizzes, the comments wall, Badge watch), in the
// v11 rail-panel style (bordered panels, .hn rows). It keeps every link of the live
// page (COMMON done-when 5: a lost internal link is a blocker) with the live data,
// sizes and floors; each panel hides below its floor like the live one.

function Who({ p }: { p: AroundPerson }): React.ReactElement {
  return <PersonName name={p.username} accent={p.accent} font={p.font} href={p.href} showBias={false} />;
}

function Ava({ p }: { p: AroundPerson }): React.ReactElement {
  return <UxAvatar name={p.username} src={p.avatar.src} bg={p.avatar.bg} fg={p.avatar.fg} size={28} className="p9-hn-ava" />;
}

function Tile({ icon }: { icon: 'zap' | 'music' | 'user' }): React.ReactElement {
  return <span className="p9-tile" aria-hidden="true"><Icon name={icon} size="sm" /></span>;
}

function TodayPanel({ today, qotd }: Pick<AroundData, 'today' | 'qotd'>): React.ReactElement {
  const counts = today
    ? [
      today.plays > 0 ? `${comma(today.plays)} ${today.plays === 1 ? 'play' : 'plays'} today` : null,
      today.quizzes > 0 ? `${comma(today.quizzes)} ${today.quizzes === 1 ? 'quiz' : 'quizzes'} made` : null,
      today.masters > 0 ? `${comma(today.masters)} ${today.masters === 1 ? 'group' : 'groups'} mastered` : null,
    ].filter(Boolean).join(' · ')
    : '';
  return (
    <Panel title="Today" icon="cal" aside="resets at 00:00 UTC" sub={counts || undefined} className="p9-panel">
      <div className="ux-rows p9-hns">
        {qotd ? (
          <div className="p9-hn">
            <Tile icon="zap" />
            <span className="p9-hn-b">
              <Link href={qotd.href} className="p9-hn-t">{qotd.title}</Link>
              <span className="p9-tm">{qotd.note}</span>
            </span>
          </div>
        ) : null}
        <div className="p9-hn">
          <Tile icon="music" />
          <span className="p9-hn-b">
            <Link href="/blindtest?daily=true" className="p9-hn-t">Name that K-pop song</Link>
            <span className="p9-tm">Blindtest of the day</span>
          </span>
        </div>
        {today?.hot ? (
          <div className="p9-hn">
            <GroupAvatar photo={today.hot.photo} initials={today.hot.initials} size="sm" />
            <span className="p9-hn-b">
              <Link href={today.hot.href} className="p9-hn-t">{today.hot.name}</Link>
              <span className="p9-tm">Hottest group today</span>
            </span>
          </div>
        ) : null}
      </div>
      {today ? <p className="p9-panel-f"><UxLink href="/stats" icon="arrow">See the full K-pop fan data</UxLink></p> : null}
    </Panel>
  );
}

function HappeningPanel({ rows }: { rows: AroundData['happening'] }): React.ReactElement | null {
  if (!rows.length) return null;
  return (
    <Panel title={<><span className="p9-live" aria-hidden="true" />Happening now</>} aside="live" className="p9-panel">
      <div className="ux-rows p9-hns">
        {rows.map((e) => (
          <div key={e.id} className="p9-hn">
            {/* An anonymous event has no identity: a neutral glyph, never a made-up avatar. */}
            {e.person ? <Ava p={e.person} /> : <Tile icon="user" />}
            <span className="p9-hn-b">
              <span>
                {e.person ? <Who p={e.person} /> : <b className="ux-who">{e.name}</b>}{' '}
                {e.href ? <Link href={e.href} className="p9-hn-l">{e.phrase}</Link> : <span>{e.phrase}</span>}
              </span>
              <span className="p9-tm">{e.ago === 'just now' ? 'just now' : `${e.ago} ago`}</span>
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function FreshPanel({ rows }: { rows: AroundData['fresh'] }): React.ReactElement | null {
  if (!rows.length) return null;
  return (
    <Panel title="Fresh quizzes" icon="star" aside="last 30 days" className="p9-panel">
      <div className="ux-rows p9-hns">
        {rows.map((q) => (
          <div key={q.id} className="p9-hn">
            <span className="p9-hn-b">
              <Link href={q.href} className="p9-hn-t">{q.title}</Link>
              <span className="p9-tm">{q.group} · by {q.by} · {playsLabel(q.plays)}</span>
            </span>
          </div>
        ))}
      </div>
      <p className="p9-panel-f"><UxLink href="/create" icon="plus">Make your own quiz</UxLink></p>
    </Panel>
  );
}

function CommentsPanel({ rows }: { rows: AroundData['comments'] }): React.ReactElement | null {
  if (!rows.length) return null;
  return (
    <Panel title="Latest comments" icon="msg" className="p9-panel">
      <div className="ux-rows p9-hns">
        {rows.map((c) => (
          <div key={c.id} className="p9-hn">
            <Ava p={c.person} />
            <span className="p9-hn-b">
              <span><Who p={c.person} /> on <Link href={c.quizHref} className="p9-hn-l">{c.quizTitle}</Link></span>
              <span className="p9-quote">{c.content}</span>
              <span className="p9-tm">{[c.score, c.ago === 'just now' ? 'just now' : `${c.ago} ago`].filter(Boolean).join(' · ')}</span>
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function BadgesPanel({ rows }: { rows: AroundData['badges'] }): React.ReactElement | null {
  if (!rows.length) return null;
  return (
    <Panel title="Badge watch" icon="medal" aside="last 30 days" className="p9-panel">
      <div className="ux-rows p9-hns">
        {rows.map((b) => (
          <div key={b.id} className="p9-hn">
            <BadgeMedal id={b.badgeId} earned size={32} className="p9-hn-medal" />
            <span className="p9-hn-b">
              <b className="p9-hn-bn">{b.badgeName}</b>
              <span className="p9-tm"><Who p={b.person} /> · {b.ago === 'just now' ? 'just now' : `${b.ago} ago`}</span>
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

export function AroundCommunity({ data }: { data: AroundData }): React.ReactElement {
  return (
    <section className="ux-sec p9-around" aria-labelledby="p9-around-h">
      <SectionHeader id="p9-around-h" title="Around the community" icon="users" />
      <div className="p9-around-grid">
        <TodayPanel today={data.today} qotd={data.qotd} />
        <HappeningPanel rows={data.happening} />
        <FreshPanel rows={data.fresh} />
        <CommentsPanel rows={data.comments} />
        <BadgesPanel rows={data.badges} />
      </div>
    </section>
  );
}
