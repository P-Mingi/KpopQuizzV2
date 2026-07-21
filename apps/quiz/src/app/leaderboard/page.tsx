import { getTopCreatorsThisWeek, getTopCreatorsAllTime, getTopPlayersByXp } from '@/lib/db/queries/profiles';
import { getRisingCreators, getCommunityStats, getTodayStats, getHappeningNow, getFandomWarMap } from '@/lib/db/queries/community';
import { safeFetch } from '@/lib/error-handling';
import { formatCount } from '@/lib/utils';
import type { PersonCardData } from '@/components/profile/person-card';
import { Mascot } from '@/components/ui/mascot';
import { CountUp } from '@/components/ui/count-up';
import { ActivityTicker } from '@/components/home/activity-ticker';
import { YourStanding } from '@/components/community/your-standing';
import { HallOfFame, type HofRow, type HofTab } from '@/components/community/hall-of-fame';
import { TodayStrip } from '@/components/community/today-strip';
import { HappeningNow } from '@/components/community/happening-now';
import { DailyRitual } from '@/components/community/daily-ritual';
import { FandomWarMap } from '@/components/community/fandom-war-map';
import { getQuizOfTheDay } from '@/lib/db/queries/quizzes';
import { getGameOfTheDay } from '@/lib/db/queries/game-of-the-day';

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

export default async function CommunityPage(): Promise<React.ReactElement> {
  const [rising, weekRaw, allTimeRaw, legendsRaw, stats, today, feed] = await Promise.all([
    safeFetch(getRisingCreators(8), [], '[community] rising'),
    safeFetch(getTopCreatorsThisWeek(8), [], '[community] week'),
    safeFetch(getTopCreatorsAllTime(8), [], '[community] allTime'),
    safeFetch(getTopPlayersByXp(8), [], '[community] legends'),
    safeFetch(getCommunityStats(), { totalPlays: 0, totalQuizzes: 0, groups: 0 }, '[community] stats'),
    safeFetch(getTodayStats(), { playsToday: 0, quizzesToday: 0, mastersToday: 0, hotGroup: null }, '[community] today'),
    safeFetch(getHappeningNow(12), { events: [], recentCount: 0 }, '[community] feed'),
  ]);

  // Daily ritual (F1.3) + war map (F1.7), baked at ISR in parallel.
  const [qotd, gotd, warMap] = await Promise.all([
    safeFetch(getQuizOfTheDay(), null, '[community] qotd'),
    safeFetch(getGameOfTheDay(), null, '[community] gotd'),
    safeFetch(getFandomWarMap(30), [], '[community] warMap'),
  ]);

  // F1.9 - Hall of Fame: four tabs over ISR-baked data. Each tab hides itself
  // below MIN_BOARD inside the component; the card hides when none qualify.
  const hofTabs: HofTab[] = [
    { key: 'rising', label: 'Rising', showFollow: true, rows: rising.map((r): HofRow => ({ person: r.person, stat: `+${formatCount(r.newFollowers)}` })) },
    { key: 'week', label: 'This week', rows: weekRaw.map((c): HofRow => ({ person: profToPerson(c), stat: `${formatCount(c.weekly_plays)} plays` })) },
    { key: 'all', label: 'All time', rows: allTimeRaw.map((c): HofRow => ({ person: profToPerson(c), stat: `${formatCount(c.total_plays_received)} plays` })) },
    { key: 'legends', label: 'Legends', rows: legendsRaw.map((c): HofRow => ({ person: profToPerson(c), stat: `${formatCount(c.xp)} XP` })) },
  ];

  return (
    <div style={{ paddingTop: 16, paddingBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <h1 className="font-display" style={{ fontSize: 'clamp(24px, 5vw, 34px)', fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.05, margin: 0 }}>Community</h1>
          <p style={{ fontSize: 13, color: 'var(--txt2)', marginTop: 6 }}>Discover fans, creators, and rising stars.</p>
        </div>
        <Mascot variant="celebrate" size={56} />
      </div>

      {/* F1.2 - Today in numbers, directly under the H1 (hides when all zero) */}
      <TodayStrip stats={today} />

      {/* Your standing (personal client island) */}
      <YourStanding />

      {/* F1.1 - Happening now feed (liveness-gated) */}
      <HappeningNow events={feed.events} recentCount={feed.recentCount} />

      {/* F1.3 - Daily ritual: quiz + game of the day (client island) */}
      <DailyRitual quiz={qotd} game={gotd} />

      {/* F1.7 - Fandom war map (replaces ByFandomFans as the belonging surface) */}
      <FandomWarMap entries={warMap} />

      {/* F1.9 - Hall of Fame: rising / week / all-time / legends in one tabbed card */}
      <HallOfFame tabs={hofTabs} />

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
