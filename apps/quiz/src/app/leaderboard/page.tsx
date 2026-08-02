import { getTopCreatorsThisWeek, getTopCreatorsAllTime, getTopPlayersByXp } from '@/lib/db/queries/profiles';
import { getRisingCreators, getCommunityStats, getTodayStats, getHappeningNow, getFandomWarMap, getLatestBadgeEarns, getCommunityComments, getHotMatchups } from '@/lib/db/queries/community';
import { safeFetch } from '@/lib/error-handling';
import { formatCount } from '@/lib/utils';
import type { PersonCardData } from '@/components/profile/person-card';
import { Mascot } from '@/components/ui/mascot';
import { CountUp } from '@/components/ui/count-up';
import { ActivityTicker } from '@/components/home/activity-ticker';
import { YourStanding, type FandomRank, type WeeklyStanding } from '@/components/community/your-standing';
import { HallOfFame, type HofRow, type HofTab } from '@/components/community/hall-of-fame';
import { TodayStrip } from '@/components/community/today-strip';
import { HappeningNow } from '@/components/community/happening-now';
import { DailyRitual } from '@/components/community/daily-ritual';
import { FandomWarMap } from '@/components/community/fandom-war-map';
import { CommunityPicks } from '@/components/community/community-picks';
import { FreshQuizzes } from '@/components/community/fresh-quizzes';
import { HotMatchups } from '@/components/community/hot-matchups';
import { getNewQuizzes } from '@/lib/db/queries/quizzes';
import { BadgeShowcase } from '@/components/community/badge-showcase';
import { DailyDebate } from '@/components/community/daily-debate';
import { getDailyDebate } from '@/lib/db/queries/debate';
import { getQuizOfTheDay } from '@/lib/db/queries/quizzes';
import { CrossSpaceFeed } from '@/components/verse/presentation/cross-space-feed';
import { CommunityCrossPromo } from '@/components/verse/community-cross-promo';

import type { Metadata } from 'next';

// ISR: the community hub serves cached HTML between hits. Public sections are
// baked here; personal bits (Your standing, follow buttons) are client islands,
// so the page stays static/ISR + crawlable.
export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Community',
  description: 'See which K-pop fandom is winning the week on the fandom war map, watch the live feed of what fans are playing right now, and follow the top creators on kpopquiz.org.',
  openGraph: { title: 'Community | KpopQuiz', description: 'The fandom war map, a live feed of what fans are playing, and the top creators on kpopquiz.org.', url: '/leaderboard' },
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
    safeFetch(getHappeningNow(5), { events: [], recentCount: 0 }, '[community] feed'),
  ]);

  // Daily ritual (F1.3) + war map (F1.7) + badge watch (F1.8) + daily debate
  // (F2b B3), baked at ISR in parallel.
  const [qotd, warMap, badgeEarns, debate, comments, fresh, matchups] = await Promise.all([
    safeFetch(getQuizOfTheDay(), null, '[community] qotd'),
    safeFetch(getFandomWarMap(30), [], '[community] warMap'),
    safeFetch(getLatestBadgeEarns(6), [], '[community] badgeEarns'),
    safeFetch(getDailyDebate(), null, '[community] debate'),
    safeFetch(getCommunityComments(8), [], '[community] comments'),
    safeFetch(getNewQuizzes(0, 6), [], '[community] fresh'),
    safeFetch(getHotMatchups(5), [], '[community] matchups'),
  ]);

  // F1.10 - Your standing v2 extras, baked here and matched per-viewer in the
  // island. fandomRanks lets it show "{GROUP} is #N this week"; weeklyBoard is
  // the REAL creator board (not padded) for the "N more plays to pass" nudge.
  const fandomRanks: FandomRank[] = warMap.map((g, i) => ({ slug: g.slug, name: g.name, rank: i + 1, delta: g.delta }));
  const weeklyBoard: WeeklyStanding[] = weekRaw.map((c) => ({ username: c.username, plays: c.weekly_plays }));

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

      {/* F1.10 - Your standing v2 (personal client island; extras baked as props) */}
      <YourStanding fandomRanks={fandomRanks} weeklyBoard={weeklyBoard} />

      {/* F2b B3 - Daily Debate, the conversation centerpiece (hides when no debate) */}
      {debate && <DailyDebate debate={debate} />}

      {/* F1.1 - Happening now feed (liveness-gated) */}
      <HappeningNow events={feed.events} recentCount={feed.recentCount} />

      {/* V-COMM-3 - the cross-promo strip (your spaces / claim a space) + the
          cross-space Verse feed (opted-in spaces only, min-gated), alongside the
          Play-world events: one community, two products. */}
      <CommunityCrossPromo />
      <CrossSpaceFeed />

      {/* F1.3 - Daily ritual: quiz + blindtest of the day (client island) */}
      <DailyRitual quiz={qotd} />

      {/* F1.7 - Fandom war map (replaces ByFandomFans as the belonging surface) */}
      <FandomWarMap entries={warMap} />

      {/* F2b B4 - Community picks: the comments wall (hides under 4 comments) */}
      <CommunityPicks comments={comments} />

      {/* F2b B5 - Fresh quizzes shelf (hides under 3 in the last 30 days) */}
      <FreshQuizzes quizzes={fresh} nowMs={Date.now()} />

      {/* F2b B6 - This week's matchups (duel fallback; battles are anonymous) */}
      <HotMatchups matchups={matchups} />

      {/* F1.9 - Hall of Fame: rising / week / all-time / legends in one tabbed card */}
      <HallOfFame tabs={hofTabs} />

      {/* F1.8 - Badge watch: latest earns shelf (hides below 3) */}
      <BadgeShowcase earns={badgeEarns} />

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
