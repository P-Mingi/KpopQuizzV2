import Link from 'next/link';

import { GroupLogo } from '@/components/ui/group-logo';
import { PersonCard } from '@/components/profile/person-card';
import { formatCount } from '@/lib/utils';
import { getInitials } from '@/lib/name-all-utils';
import type { Group } from '@/lib/db/types';
import type { GroupNameAllGame, GroupFanKnowledge, GroupMvPulse, GroupComeback } from '@/lib/db/queries/group-hub';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function monthLabel(ymd: string): string {
  const [y, m] = ymd.split('-');
  return `${MONTHS[Number(m) - 1] ?? ''} ${y}`.trim();
}
function realFandom(group: Group): string | null {
  const f = (group.fandom_name ?? '').trim();
  return f && !PLACEHOLDER_FANDOMS.has(f.toLowerCase()) ? f : null;
}

// Workstream G2 - visible hub sections (hero, play row, members strip). All are
// server components (no client hooks) so the group route's render mode is
// unchanged, and each gates on real data (thin groups still look intentional).

const PLACEHOLDER_FANDOMS = new Set(['fan', '']);

export function GroupHubHero({
  group,
  memberCount,
  warRank,
}: {
  group: Group;
  memberCount: number | null;
  warRank: { rank: number; delta: number | null } | null;
}): React.ReactElement {
  const fandom = (group.fandom_name ?? '').trim();
  const showFandom = fandom.length > 0 && !PLACEHOLDER_FANDOMS.has(fandom.toLowerCase());
  const meta: string[] = [];
  if (group.generation) meta.push(group.generation);
  if (memberCount && memberCount > 0) meta.push(`${memberCount} members`);
  meta.push(`${formatCount(group.quiz_count)} quizzes`);
  meta.push(`${formatCount(group.total_plays)} plays`);

  return (
    <div className="ghub-hero mt-4">
      <GroupLogo
        groupName={group.name}
        logoUrl={group.logo_url}
        displayColor={group.display_color}
        textColor={group.text_color}
        size={68}
      />
      <div className="ghub-hero-main">
        <p className="ghub-hero-name" style={{ color: group.display_color }}>{group.name}</p>
        <p className="ghub-hero-meta">{meta.join(' · ')}</p>
        {showFandom && <p className="ghub-hero-fandom">Home of {fandom}</p>}
        {warRank && (
          <Link href="/leaderboard#fandom-war" className="ghub-hero-rank">
            #{warRank.rank} fandom this week
            {typeof warRank.delta === 'number' && warRank.delta !== 0 && (
              <span className={warRank.delta > 0 ? 'ghub-rank-up' : 'ghub-rank-down'}>
                {warRank.delta > 0 ? ' ▲' : ' ▼'}{Math.abs(warRank.delta)}%
              </span>
            )}
          </Link>
        )}
      </div>
    </div>
  );
}

interface PlayTile {
  href: string;
  title: string;
  sub: string;
  icon: React.ReactNode;
  tint: string;
}

const ICON_QUIZ = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 5v14l11-7z" /></svg>;
const ICON_BLIND = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>;
const ICON_NAME = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2" /><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10" /></svg>;
const ICON_MATCH = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /><path d="m17 11 1.5 1.5L21 10" /></svg>;

export function GroupPlayRow({
  group,
  topQuizSlug,
  blindtest,
  nameAll,
  hasPersonality,
}: {
  group: Group;
  topQuizSlug: string | null;
  blindtest: { qualifies: boolean; songs: number };
  nameAll: GroupNameAllGame | null;
  hasPersonality: boolean;
}): React.ReactElement {
  const tiles: PlayTile[] = [];
  // Quiz CTA always. Play the top quiz, or create one when the group has none.
  tiles.push(
    topQuizSlug
      ? { href: `/q/${topQuizSlug}`, title: `${group.quiz_count} quizzes`, sub: 'Play the group quizzes', icon: ICON_QUIZ, tint: '--brand' }
      : { href: `/create?group=${group.slug}`, title: 'Make the first quiz', sub: 'No quizzes yet', icon: ICON_QUIZ, tint: '--brand' },
  );
  if (blindtest.qualifies) {
    tiles.push({ href: `/blindtest/group-${group.slug}`, title: 'Blind test', sub: `${blindtest.songs} songs`, icon: ICON_BLIND, tint: '--blind' });
  }
  if (nameAll) {
    tiles.push({ href: `/games/name-all/${nameAll.slug}`, title: 'Name all members', sub: `${nameAll.count} to name`, icon: ICON_NAME, tint: '--nam' });
  }
  if (hasPersonality) {
    tiles.push({ href: `/which-${group.slug}-member-are-you`, title: 'Which member are you?', sub: '10 questions, 1 result', icon: ICON_MATCH, tint: '--tot' });
  }

  return (
    <div id="ghub-play" className="ghub-playrow mt-5" role="list" aria-label={`Ways to play ${group.name}`}>
      {tiles.map((t) => (
        <Link key={t.href} href={t.href} className="ghub-tile" role="listitem" style={{ ['--ghub-tint' as string]: `var(${t.tint})` }}>
          <span className="ghub-tile-icon" aria-hidden="true">{t.icon}</span>
          <span className="ghub-tile-title">{t.title}</span>
          <span className="ghub-tile-sub">{t.sub}</span>
        </Link>
      ))}
    </div>
  );
}

export function GroupMembersStrip({
  group,
  nameAll,
}: {
  group: Group;
  nameAll: GroupNameAllGame;
}): React.ReactElement {
  return (
    <section className="mt-8" aria-label={`${group.name} members`}>
      <p className="sec-label" style={{ marginBottom: 12 }}>The members</p>
      <div className="ghub-members">
        {nameAll.members.map((m) => (
          <Link key={m.name} href={`/games/name-all/${nameAll.slug}`} className="ghub-member" aria-label={`Name all ${group.name} members`}>
            {m.photoUrl ? (
              <img className="ghub-member-face" src={m.photoUrl} alt="" loading="lazy" />
            ) : (
              <span className="ghub-member-face ghub-member-mono" style={{ background: group.display_color, color: group.text_color }} aria-hidden="true">
                {getInitials(m.name)}
              </span>
            )}
            <span className="ghub-member-name">{m.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function GroupFanKnowledgeSection({
  group,
  data,
}: {
  group: Group;
  data: GroupFanKnowledge;
}): React.ReactElement | null {
  const showMastered = data.masteredCount >= 3;
  const showAccuracy = data.avgAccuracy != null;
  const showFans = data.topFans.length >= 3;
  if (!showMastered && !showAccuracy && !showFans) return null;

  const fandom = realFandom(group);
  const masteredNoun = fandom ? `${fandom}s` : 'fans';

  return (
    <section className="mt-8" aria-label={`${group.name} fan knowledge`}>
      <p className="sec-label" style={{ marginBottom: 12 }}>Fan knowledge</p>
      {(showMastered || showAccuracy) && (
        <div className="ghub-fk-stats">
          {showMastered && (
            <div className="ghub-fk-stat">
              <strong>{data.masteredCount}</strong>
              <span>{masteredNoun} mastered {group.name}</span>
            </div>
          )}
          {showAccuracy && (
            <div className="ghub-fk-stat">
              <strong>{Math.round((data.avgAccuracy as number) * 100)}%</strong>
              <span>average accuracy</span>
            </div>
          )}
        </div>
      )}
      {showFans && (
        <div className="ghub-fk-fans">
          <p className="ghub-fk-fans-label">Top {group.name} fans</p>
          {data.topFans.map((f) => (
            <div key={f.person.username} className="ghub-fk-fan">
              <PersonCard person={f.person} compact showFollow={false} />
              <span className="ghub-fk-acc">{Math.round(f.accuracy * 100)}%</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function GroupMvPulseSection({
  group,
  data,
}: {
  group: Group;
  data: GroupMvPulse;
}): React.ReactElement {
  return (
    <section className="mt-8" aria-label={`${group.name} MV pulse`}>
      <p className="sec-label" style={{ marginBottom: 12 }}>MV pulse</p>
      <div className="ghub-mv">
        <span className="ghub-mv-num">+{data.viewsGained.toLocaleString('en-US')}</span>
        <span className="ghub-mv-lbl">
          views this week across {data.mvCount} tracked MV{data.mvCount > 1 ? 's' : ''}
        </span>
        <span className="ghub-mv-since">Tracked since {monthLabel(data.trackedSince)}</span>
      </div>
    </section>
  );
}

export function GroupComebackBanner({
  group,
  comeback,
}: {
  group: Group;
  comeback: GroupComeback;
}): React.ReactElement {
  return (
    <Link href="#ghub-play" className="ghub-comeback mt-2" aria-label={`${group.name} comeback: ${comeback.title}`}>
      <span className="ghub-comeback-tag">Comeback</span>
      <span className="ghub-comeback-body">
        <span className="ghub-comeback-title">{comeback.title}</span>
        <span className="ghub-comeback-sub">{comeback.artist} · new {comeback.kind}. Play {group.name} now</span>
      </span>
      <span className="ghub-comeback-arrow" aria-hidden="true">&rarr;</span>
    </Link>
  );
}
