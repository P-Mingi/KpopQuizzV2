# Prompt 4: Mode System + Home Page

## Overview

Build the home page (the first screen players see) and the mode selection system. The home page is a dashboard — personalized for logged-in users, inviting for anonymous visitors.

**The home page MUST match the dark-mode prototype exactly: #0D0D0F background, pink accents (#ED93B1), phone-shaped 430px max-width layout.**

---

## Step 1: Mode Configuration

The mode system is already defined in Prompt 3's `blind-test-modes.ts`. This prompt uses it to build the UI.

### MVP Modes (no verse, no bridge)

**Difficulty modes** (category: 'difficulty'):
- `classic` — 10s chorus, 10 songs, easy
- `intro-challenge` — 5s intro, 10 songs, medium
- `speed-round` — 5s chorus, 20 songs, hard

**Era modes** (category: 'era'):
- `2nd-gen` — chorus, generation=2nd
- `3rd-gen` — chorus, generation=3rd
- `4th-gen` — chorus, generation=4th

**Group modes** (category: 'group'):
- Auto-generated from database. Any group with 5+ songs with `clip_chorus` set gets a mode.
- ID format: `group-{slug}` (e.g., `group-bts`, `group-blackpink`)

**Special modes** (category: 'special'):
- `girl-groups` — gender=gg, chorus
- `boy-groups` — gender=bg, chorus
- `solo-artists` — gender IN (solo_female, solo_male), chorus
- `title-tracks` — is_title_track=true, chorus
- `b-sides` — is_title_track=false, chorus
- `recent-hits` — year>=2024, chorus
- `kpop-legends` — year<=2017, chorus
- `4th-gen-gg` — generation=4th, gender=gg, chorus
- `4th-gen-bg` — generation=4th, gender=bg, chorus
- `random-all` — no filter, chorus

**NOT in MVP**: verse-only, bridge-or-break (these require clip_verse/clip_bridge timestamps which most songs don't have yet). Remove them from the modes config for now.

---

## Step 2: Modes API

### `GET /api/modes`

Returns all modes grouped by category with song availability counts.

```typescript
// src/app/api/modes/route.ts
import { NextResponse } from 'next/server';
import { STATIC_MODES, MIN_SONGS_FOR_GROUP_MODE, buildGroupMode } from '@/lib/blind-test-modes';
import { createServerClient } from '@/lib/supabase-server';

export const revalidate = 60; // cache for 60 seconds

export async function GET() {
  const supabase = createServerClient();

  // Count songs per filter for static modes
  const staticModes = await Promise.all(
    STATIC_MODES.map(async (mode) => {
      const count = await countSongsForMode(supabase, mode);
      return { ...mode, song_count_available: count, available: count >= mode.song_count };
    })
  );

  // Dynamic group modes
  const { data: songsByGroup } = await supabase
    .from('blind_test_songs')
    .select('group_id, groups!inner(name, slug)')
    .eq('status', 'active')
    .not('clip_chorus', 'is', null);

  const groupCounts: Record<string, { name: string; slug: string; count: number }> = {};
  for (const row of songsByGroup ?? []) {
    const slug = row.groups?.slug;
    if (!slug) continue;
    if (!groupCounts[slug]) groupCounts[slug] = { name: row.groups.name, slug, count: 0 };
    groupCounts[slug].count++;
  }

  const groupModes = Object.values(groupCounts)
    .filter(g => g.count >= MIN_SONGS_FOR_GROUP_MODE)
    .sort((a, b) => b.count - a.count)
    .map(g => {
      const mode = buildGroupMode({ name: g.name, slug: g.slug, song_count: g.count });
      return { ...mode, song_count_available: g.count, available: g.count >= mode.song_count };
    });

  // Get 4 random thumbnail youtube_ids per mode for mosaic display
  // (batch query to avoid N+1)
  const { data: allActiveSongs } = await supabase
    .from('blind_test_songs')
    .select('youtube_id, group_id, generation, gender')
    .eq('status', 'active')
    .not('clip_chorus', 'is', null);

  function getThumbnails(filter: any, count = 4): string[] {
    let pool = allActiveSongs ?? [];
    if (filter.group_slug) {
      const groupSlug = filter.group_slug;
      const gid = songsByGroup?.find(s => s.groups?.slug === groupSlug)?.group_id;
      if (gid) pool = pool.filter(s => s.group_id === gid);
    }
    if (filter.gender) pool = pool.filter(s => s.gender === filter.gender);
    if (filter.generation) pool = pool.filter(s => s.generation === filter.generation);
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count).map(s => s.youtube_id);
  }

  // Attach thumbnails to each mode
  const addThumbs = (modes: any[]) => modes.map(m => ({
    ...m,
    thumbnails: getThumbnails(m.filter || {}, m.category === 'group' ? 2 : 4),
  }));

  // Stats
  const totalSongs = allActiveSongs?.length ?? 0;
  const { count: totalPlays } = await supabase
    .from('bt_plays')
    .select('id', { count: 'exact', head: true });

  const allModes = [...staticModes, ...groupModes];

  return NextResponse.json({
    modes: {
      difficulty: addThumbs(staticModes.filter(m => m.category === 'difficulty')),
      group: addThumbs(groupModes),
      era: addThumbs(staticModes.filter(m => m.category === 'era')),
      special: addThumbs(staticModes.filter(m => m.category === 'special')),
    },
    stats: {
      total_songs: totalSongs,
      total_plays: totalPlays ?? 0,
      available_modes: allModes.filter(m => m.available).length,
    },
  });
}
```

---

## Step 3: Home Page — `src/app/(main)/page.tsx`

### Data Fetching

The home page is a server component that fetches modes, player stats, and daily challenge info.

```tsx
export default async function HomePage() {
  const session = await getSession();
  const player = session ? await getPlayerProfile(session.user.id) : null;

  // Fetch modes
  const modesRes = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/modes`, { next: { revalidate: 60 } });
  const { modes, stats } = await modesRes.json();

  // Fetch today's daily challenge info
  const daily = await getDailyChallenge();
  const dailyPlayCount = await getDailyPlayCount(daily?.id);
  const playerPlayedDaily = player ? await hasPlayerPlayedDaily(player.id, daily?.id) : false;

  // Fetch leaderboard (top 5 for home page preview)
  const topPlayers = await getTopPlayers(5, 'weekly');

  return (
    <div className="px-5 pt-5 pb-8">
      {/* Greeting */}
      {player ? (
        <div className="mb-5">
          <p className="text-xl font-semibold">Hey {player.username}</p>
          <p className="text-[13px] text-text-secondary mt-0.5">Ready to play?</p>
        </div>
      ) : (
        <div className="mb-5">
          <p className="text-xl font-semibold">K-pop blind test</p>
          <p className="text-[13px] text-text-secondary mt-0.5">How well do you REALLY know K-pop?</p>
        </div>
      )}

      {/* Daily challenge card */}
      <DailyChallengeCard
        daily={daily}
        playCount={dailyPlayCount}
        played={playerPlayedDaily}
      />

      {/* Section: Pick your challenge */}
      <SectionLabel>Pick your challenge</SectionLabel>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-5 px-5 mb-7">
        {modes.difficulty.map((m: any) => (
          <DifficultyModeCard key={m.id} mode={m} />
        ))}
      </div>

      {/* Section: By group */}
      {modes.group.length > 0 && (
        <>
          <SectionLabel>By group</SectionLabel>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-5 px-5 mb-7">
            {modes.group.map((m: any) => (
              <GroupModeCard key={m.id} mode={m} />
            ))}
          </div>
        </>
      )}

      {/* Section: By era */}
      <SectionLabel>By era</SectionLabel>
      <div className="grid grid-cols-3 gap-2 mb-7">
        {modes.era.map((m: any) => (
          <EraModeCard key={m.id} mode={m} />
        ))}
      </div>

      {/* Section: Special modes */}
      <SectionLabel>Special modes</SectionLabel>
      <div className="grid grid-cols-2 gap-2 mb-7">
        {modes.special.filter((m: any) => m.available || m.song_count_available > 0).map((m: any) => (
          <SpecialModeCard key={m.id} mode={m} />
        ))}
      </div>

      {/* Your stats (logged in only) */}
      {player && (
        <>
          <SectionLabel>Your stats</SectionLabel>
          <PlayerStatsCard player={player} />
        </>
      )}

      {/* Leaderboard preview */}
      <SectionLabel>Leaderboard</SectionLabel>
      <LeaderboardPreview players={topPlayers} currentPlayerId={player?.id} />
    </div>
  );
}
```

---

## Step 4: Components

### Section Label

```tsx
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-tertiary mb-2.5">
      {children}
    </p>
  );
}
```

### Daily Challenge Card

```tsx
function DailyChallengeCard({ daily, playCount, played }: Props) {
  return (
    <Link href="/daily">
      <div className="mb-6 p-4 rounded-2xl bg-gradient-to-br from-[#1E1028] to-bg-secondary border border-[#2A2030] relative overflow-hidden">
        {/* Sparkle icon */}
        <div className="absolute top-3 right-4 w-8 h-8 rounded-full bg-pink-50 flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 1L9.5 6.5L15 8L9.5 9.5L8 15L6.5 9.5L1 8L6.5 6.5L8 1Z" fill="#ED93B1"/>
          </svg>
        </div>

        <p className="text-[15px] font-semibold mb-0.5">Today's challenge</p>
        <p className="text-xs text-text-secondary mb-3">
          10 songs everyone plays. One shot. How do you rank?
        </p>
        <div className="flex gap-4 mb-3">
          <span className="text-[11px] text-pink-400">{playCount} played today</span>
        </div>
        <div className="inline-block px-5 py-2.5 rounded-xl bg-pink-400 text-bg-primary text-[13px] font-semibold">
          {played ? 'See results' : 'Play daily'}
        </div>
      </div>
    </Link>
  );
}
```

### Difficulty Mode Card (scrollable, 130px wide)

```tsx
function DifficultyModeCard({ mode }: { mode: any }) {
  const isAvailable = mode.available;
  const isHard = mode.difficulty === 'hard' || mode.difficulty === 'expert';

  return (
    <Link href={isAvailable ? `/play/${mode.id}` : '#'} className={!isAvailable ? 'pointer-events-none' : ''}>
      <div className={`w-[130px] flex-shrink-0 rounded-[14px] overflow-hidden bg-bg-secondary border border-border-default transition-colors ${
        isAvailable ? 'hover:border-border-hover' : 'opacity-40'
      }`}>
        {isHard ? (
          <div className="h-14 bg-bg-primary flex items-center justify-center gap-[2px]">
            {[12, 22, 30, 18, 8].map((h, i) => (
              <div key={i} className="w-[3px] rounded-sm bg-wrong" style={{ height: h }} />
            ))}
          </div>
        ) : (
          <div className="h-14 flex overflow-hidden">
            {(mode.thumbnails || []).slice(0, 2).map((ytId: string, i: number) => (
              <img key={i} src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`}
                alt="" className="flex-1 object-cover min-w-0" />
            ))}
          </div>
        )}
        <div className="p-2.5">
          <DifficultyBadge difficulty={mode.difficulty} />
          <p className="text-[13px] font-medium mt-1">{mode.title}</p>
          <p className="text-[10px] text-text-tertiary">{mode.clip_duration}s · {mode.song_count} songs</p>
        </div>
      </div>
    </Link>
  );
}
```

### Group Mode Card (scrollable, 130px wide)

```tsx
function GroupModeCard({ mode }: { mode: any }) {
  return (
    <Link href={mode.available ? `/play/${mode.id}` : '#'} className={!mode.available ? 'pointer-events-none' : ''}>
      <div className={`w-[130px] flex-shrink-0 rounded-xl overflow-hidden bg-bg-secondary border border-border-default ${
        mode.available ? 'hover:border-border-hover' : 'opacity-40'
      }`}>
        <div className="h-14 flex overflow-hidden">
          {(mode.thumbnails || []).slice(0, 2).map((ytId: string, i: number) => (
            <img key={i} src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`}
              alt="" className="flex-1 object-cover min-w-0" />
          ))}
        </div>
        <div className="p-2.5">
          <p className="text-[13px] font-medium">{mode.title}</p>
          <p className="text-[10px] text-text-tertiary">{mode.song_count_available} songs</p>
        </div>
      </div>
    </Link>
  );
}
```

### Era Mode Card (grid, 3 columns)

```tsx
function EraModeCard({ mode }: { mode: any }) {
  return (
    <Link href={mode.available ? `/play/${mode.id}` : '#'}>
      <div className={`rounded-xl p-3 border border-border-default bg-bg-secondary ${
        mode.available ? 'hover:border-border-hover' : 'opacity-40'
      }`}>
        <p className="text-[13px] font-medium">{mode.title}</p>
        <p className="text-[10px] text-text-tertiary mt-0.5">{mode.song_count_available} songs</p>
      </div>
    </Link>
  );
}
```

### Special Mode Card (grid, 2 columns)

```tsx
function SpecialModeCard({ mode }: { mode: any }) {
  const isHard = mode.difficulty === 'hard';
  return (
    <Link href={mode.available ? `/play/${mode.id}` : '#'}>
      <div className={`rounded-xl overflow-hidden border border-border-default bg-bg-secondary ${
        mode.available ? 'hover:border-border-hover' : 'opacity-40'
      }`}>
        {isHard ? (
          <div className="h-12 bg-bg-primary flex items-center justify-center gap-[2px]">
            {[10, 18, 26, 16, 8].map((h, i) => (
              <div key={i} className="w-[3px] rounded-sm bg-wrong" style={{ height: h }} />
            ))}
          </div>
        ) : (
          <div className="h-12 flex overflow-hidden">
            {(mode.thumbnails || []).slice(0, 4).map((ytId: string, i: number) => (
              <img key={i} src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`}
                alt="" className="flex-1 object-cover min-w-0" />
            ))}
          </div>
        )}
        <div className="p-2.5">
          <DifficultyBadge difficulty={mode.difficulty} />
          <p className="text-[13px] font-medium mt-1">{mode.title}</p>
          <p className="text-[10px] text-text-tertiary line-clamp-1">
            {mode.available ? mode.description : `Coming soon (${mode.song_count_available}/${mode.song_count})`}
          </p>
        </div>
      </div>
    </Link>
  );
}
```

### Difficulty Badge

```tsx
function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const styles = {
    easy: 'bg-[rgba(151,196,89,0.15)] text-correct',
    medium: 'bg-[rgba(239,159,39,0.15)] text-streak',
    hard: 'bg-[rgba(226,75,74,0.15)] text-wrong',
    expert: 'bg-[rgba(226,75,74,0.15)] text-wrong',
  };
  return (
    <span className={`text-[9px] font-semibold px-1.5 py-px rounded-md ${styles[difficulty] || styles.easy}`}>
      {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
    </span>
  );
}
```

### Player Stats Card (logged in only)

```tsx
function PlayerStatsCard({ player }: { player: Player }) {
  return (
    <div className="p-3.5 rounded-[14px] bg-bg-secondary border border-border-default mb-7">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-full bg-pink-400 flex items-center justify-center text-sm font-semibold text-bg-primary">
          {player.username.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-[13px] font-medium">
            Level {player.level} <span className="text-text-tertiary font-normal">· {player.xp.toLocaleString()} XP</span>
          </p>
          <p className="text-[11px] text-text-tertiary">
            {player.total_songs_correct.toLocaleString()} songs · {player.total_songs_played > 0 ? Math.round(player.total_songs_correct / player.total_songs_played * 100) : 0}% accuracy
          </p>
        </div>
      </div>
      {/* Top mastery chips */}
      <TopMasteryChips playerId={player.id} />
    </div>
  );
}
```

### Leaderboard Preview

```tsx
function LeaderboardPreview({ players, currentPlayerId }: Props) {
  return (
    <div className="rounded-[14px] bg-bg-secondary border border-border-default overflow-hidden mb-4">
      {/* Tabs */}
      <div className="flex border-b border-border-default">
        <button className="flex-1 py-2.5 text-[11px] font-medium text-pink-400 border-b-2 border-pink-400">Today</button>
        <button className="flex-1 py-2.5 text-[11px] font-medium text-text-tertiary">Weekly</button>
        <button className="flex-1 py-2.5 text-[11px] font-medium text-text-tertiary">All time</button>
      </div>
      {/* Rows */}
      {players.map((p, i) => (
        <div key={p.id} className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-border-default last:border-b-0">
          <span className={`text-xs font-semibold w-5 ${i === 0 ? 'text-streak' : i === 1 ? 'text-text-secondary' : i === 2 ? 'text-[#D85A30]' : 'text-text-tertiary'}`}>
            {i + 1}
          </span>
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold"
            style={{ backgroundColor: p.avatar_bg, color: p.avatar_text }}>
            {p.username.charAt(0).toUpperCase()}
          </div>
          <span className="flex-1 text-xs font-medium">
            {p.username}
            {p.id === currentPlayerId && <span className="text-text-tertiary font-normal"> (you)</span>}
          </span>
          <span className="text-xs font-medium text-pink-400">{p.total_points.toLocaleString()}</span>
        </div>
      ))}
      <Link href="/leaderboard" className="block text-center py-2.5 text-[11px] text-text-tertiary">
        View full leaderboard
      </Link>
    </div>
  );
}
```

---

## What NOT To Do

- Do NOT include verse-only or bridge modes in MVP — remove from modes config
- Do NOT make mode cards as a vertical list — difficulty and group modes scroll HORIZONTALLY
- Do NOT forget to show thumbnails on mode cards — they make people want to click
- Do NOT show modes with 0 available songs — hide them completely
- Do NOT use purple anywhere — pink (#ED93B1) only
- Do NOT fetch mode data on every navigation — cache with revalidate: 60
