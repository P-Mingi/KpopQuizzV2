import { getTopCreatorsThisWeek, getTopCreatorsAllTime, getTopPlayersByXp } from '@/lib/db/queries/profiles';
import { getAllGroups } from '@/lib/db/queries/groups';
import { getRisingCreators, getActiveFansByGroup, getCommunityStats } from '@/lib/db/queries/community';
import { safeFetch } from '@/lib/error-handling';
import { formatCount } from '@/lib/utils';
import { PersonCard, type PersonCardData } from '@/components/profile/person-card';
import { Mascot } from '@/components/ui/mascot';
import { CountUp } from '@/components/ui/count-up';
import { ActivityTicker } from '@/components/home/activity-ticker';
import { YourStanding } from '@/components/community/your-standing';
import { ByFandomFans } from '@/components/community/by-fandom-fans';
import { TopCreatorsTabs, type RankedPerson } from '@/components/community/top-creators-tabs';

import type { Metadata } from 'next';

// ISR: the community hub serves cached HTML between hits. Public sections are
// baked here; personal bits (Your standing, follow buttons) are client islands,
// so the page stays static/ISR + crawlable.
export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Community',
  description: 'Discover K-pop quiz creators, rising stars, and active fans on kpopquiz.org. Follow fans, find your fandom, and see who is climbing.',
  openGraph: { title: 'Community | KpopQuiz', description: 'Discover creators, rising stars, and active fans on kpopquiz.org.', url: '/leaderboard' },
  twitter: { card: 'summary_large_image' },
  alternates: {
    canonical: '/leaderboard',
    languages: { en: '/leaderboard', 'pt-BR': '/pt/leaderboard', 'x-default': '/leaderboard' },
  },
};

const MIN_BOARD = 4; // a board with fewer entries hides itself (no sad rankings)

const card: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 14, marginBottom: 12,
};
const seclab: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--txt3)', margin: 0,
};

// Single-source PersonCard hydration: carry the M1.26 flair so top-creators +
// legends rows match rising / by-fandom / Hall of Fame (which already render it).
function profToPerson(p: {
  username: string; avatar_url: string | null; avatar_bg: string; avatar_text: string;
  xp: number; follower_count: number;
  name_accent: string | null; name_font: string | null; pinned_badge_id: string | null;
  avatar_kind: string | null; avatar_ref: string | null; bias: string | null;
}): PersonCardData {
  return {
    username: p.username, avatarUrl: p.avatar_url, avatarBg: p.avatar_bg, avatarText: p.avatar_text,
    xp: p.xp ?? 0, followerCount: p.follower_count ?? 0,
    nameAccent: p.name_accent, nameFont: p.name_font, bias: p.bias,
    pinnedBadgeId: p.pinned_badge_id,
    avatarKind: (p.avatar_kind as PersonCardData['avatarKind']) ?? 'photo', avatarRef: p.avatar_ref,
  };
}

function PersonRow({ person, stat, showFollow }: { person: PersonCardData; stat?: string; showFollow?: boolean }): React.ReactElement {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '8px 0' }}>
      <div style={{ flex: 1, minWidth: 0 }}><PersonCard person={person} compact showFollow={showFollow ?? false} /></div>
      {stat && <span style={{ flexShrink: 0, width: 52, textAlign: 'right', fontSize: 12, fontWeight: 700, color: 'var(--brand)', fontVariantNumeric: 'tabular-nums' }}>{stat}</span>}
    </div>
  );
}

export default async function CommunityPage(): Promise<React.ReactElement> {
  const [rising, weekRaw, allTimeRaw, legendsRaw, groups, stats] = await Promise.all([
    safeFetch(getRisingCreators(8), [], '[community] rising'),
    safeFetch(getTopCreatorsThisWeek(8), [], '[community] week'),
    safeFetch(getTopCreatorsAllTime(8), [], '[community] allTime'),
    safeFetch(getTopPlayersByXp(8), [], '[community] legends'),
    safeFetch(getAllGroups(), [], '[community] groups'),
    safeFetch(getCommunityStats(), { totalPlays: 0, totalQuizzes: 0, groups: 0 }, '[community] stats'),
  ]);

  const week: RankedPerson[] = weekRaw.map((c) => ({ person: profToPerson(c), stat: `${formatCount(c.weekly_plays)} plays` }));
  const allTime: RankedPerson[] = allTimeRaw.map((c) => ({ person: profToPerson(c), stat: `${formatCount(c.total_plays_received)} plays` }));
  const legends: PersonCardData[] = legendsRaw.map(profToPerson);

  // By-fandom: a few popular groups for the chips, default = the most active one,
  // its fans baked at ISR time so the section is crawlable + the page stays static.
  const chipGroups = [...groups].sort((a, b) => b.quiz_count - a.quiz_count).slice(0, 6).map((g) => ({ slug: g.slug, name: g.name, color: g.display_color }));
  const defaultGroup = chipGroups[0]?.slug ?? '';
  const initialFans = defaultGroup ? await safeFetch(getActiveFansByGroup(defaultGroup, 8), [], '[community] fans') : [];

  const showRising = rising.length >= MIN_BOARD;
  const showTop = week.length >= MIN_BOARD || allTime.length >= MIN_BOARD;
  const showLegends = legends.length >= MIN_BOARD;

  return (
    <div style={{ paddingTop: 16, paddingBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <h1 className="font-display" style={{ fontSize: 'clamp(24px, 5vw, 34px)', fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.05, margin: 0 }}>Community</h1>
          <p style={{ fontSize: 13, color: 'var(--txt2)', marginTop: 6 }}>Discover fans, creators, and rising stars.</p>
        </div>
        <Mascot variant="celebrate" size={56} />
      </div>

      {/* Your standing (personal client island) */}
      <YourStanding />

      {/* Rising creators (discovery) */}
      {showRising && (
        <div style={card}>
          <p style={seclab}>Rising creators</p>
          <p style={{ fontSize: 11.5, color: 'var(--txt2)', margin: '4px 0 8px' }}>Gaining the most new followers this week.</p>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {rising.map((r) => (
              <div key={r.person.username} style={{ borderTop: '1px solid var(--border)' }}>
                <PersonRow person={r.person} stat={`+${formatCount(r.newFollowers)}`} showFollow />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top creators (week / all-time tabs, client toggle over baked data) */}
      {showTop && <TopCreatorsTabs week={week} allTime={allTime} />}

      {/* By fandom (default baked; chips switch client-side) */}
      {chipGroups.length > 0 && <ByFandomFans groups={chipGroups} initialGroup={defaultGroup} initialFans={initialFans} />}

      {/* Legends (showcase) */}
      {showLegends && (
        <div style={card}>
          <p style={seclab}>Legends</p>
          <p style={{ fontSize: 11.5, color: 'var(--txt2)', margin: '4px 0 8px' }}>The highest Fan Levels in the community.</p>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {legends.map((p) => (
              <div key={p.username} style={{ borderTop: '1px solid var(--border)' }}>
                <PersonRow person={p} stat={`${formatCount(p.xp)} XP`} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Community pulse: live ticker (liveness-gated) + collective stats */}
      <div style={card}>
        <p style={{ ...seclab, marginBottom: 10 }}>Community pulse</p>
        <ActivityTicker />
        <div style={{ display: 'flex', gap: 10 }}>
          <PulseStat value={stats.totalPlays} label="total plays" />
          <PulseStat value={stats.totalQuizzes} label="quizzes" />
          <PulseStat value={stats.groups} label="groups" />
        </div>
      </div>
    </div>
  );
}

function PulseStat({ value, label }: { value: number; label: string }): React.ReactElement {
  return (
    <div style={{ flex: 1, background: 'var(--surface-alt)', borderRadius: 10, padding: 10 }}>
      <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--txt1)', fontVariantNumeric: 'tabular-nums' }}>
        <CountUp value={value} compact />
      </div>
      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--txt3)', marginTop: 2 }}>{label}</div>
    </div>
  );
}
