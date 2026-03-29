# Prompt 8: Profile Page + Shareable Cards

## Overview

The profile page is the player's identity — level, mastery bars, badges, recent games. It must be screenshot-worthy because K-pop fans WILL share their profiles.

**The profile MUST match the dark-mode prototype exactly.**

---

## Step 1: Profile Page — `/profile`

### Own profile (logged in)

```tsx
// src/app/(main)/profile/page.tsx

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const data = await fetchPlayerData(session.user.id);
  return <ProfileView {...data} isOwnProfile={true} />;
}
```

### Public profile — `/player/[username]`

```tsx
// src/app/(main)/player/[username]/page.tsx

export default async function PublicProfilePage({ params }: { params: { username: string } }) {
  const session = await getSession();
  const player = await getPlayerByUsername(params.username);
  if (!player) return notFound();

  const data = await fetchPlayerData(player.id);
  return <ProfileView {...data} isOwnProfile={session?.user?.id === player.id} />;
}
```

### Shared ProfileView component

```tsx
// src/components/profile/profile-view.tsx

function ProfileView({ player, masteries, achievements, recentPlays, isOwnProfile }: Props) {
  return (
    <div className="px-5 pt-7 pb-8">
      {/* Header */}
      <div className="text-center mb-5">
        <div className="w-16 h-16 rounded-full bg-pink-400 flex items-center justify-center text-2xl font-semibold text-bg-primary mx-auto mb-2.5">
          {player.username.charAt(0).toUpperCase()}
        </div>
        <p className="text-lg font-semibold">{player.username}</p>
        <p className="text-[13px] text-pink-400 font-medium mt-0.5">
          Level {player.level} · {player.xp.toLocaleString()} XP
        </p>
        {player.current_streak > 0 && (
          <div className="inline-flex items-center gap-1 mt-2 px-3 py-1 rounded-[10px] bg-streak-bg text-streak text-xs font-medium">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1C6 1 3 4 3 7C3 8.7 4.3 10 6 10C7.7 10 9 8.7 9 7C9 4 6 1 6 1Z" fill="#EF9F27"/>
            </svg>
            {player.current_streak}-day streak
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="flex gap-px mb-5 bg-border-default rounded-[14px] overflow-hidden">
        <div className="flex-1 py-3.5 text-center bg-bg-secondary">
          <p className="text-lg font-semibold">{player.total_songs_correct.toLocaleString()}</p>
          <p className="text-[10px] text-text-tertiary mt-0.5">songs guessed</p>
        </div>
        <div className="flex-1 py-3.5 text-center bg-bg-secondary">
          <p className="text-lg font-semibold">
            {player.total_songs_played > 0 ? Math.round(player.total_songs_correct / player.total_songs_played * 100) : 0}%
          </p>
          <p className="text-[10px] text-text-tertiary mt-0.5">accuracy</p>
        </div>
        <div className="flex-1 py-3.5 text-center bg-bg-secondary">
          <p className="text-lg font-semibold">{player.best_combo}x</p>
          <p className="text-[10px] text-text-tertiary mt-0.5">best combo</p>
        </div>
      </div>

      {/* Group mastery */}
      {masteries.length > 0 && (
        <>
          <SectionLabel>Group mastery</SectionLabel>
          <div className="mb-5">
            {masteries.slice(0, 5).map(m => (
              <div key={m.group_id} className="flex items-center gap-2.5 mb-2">
                <span className="text-[13px] font-medium min-w-[90px]">{m.groups.name}</span>
                <div className="flex-1 h-1.5 bg-border-default rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-pink-400"
                    style={{ width: `${getMasteryProgress(m.mastery_xp) * 100}%` }} />
                </div>
                <span className="text-[11px] font-semibold text-pink-400 min-w-[36px] text-right">
                  Lv.{m.mastery_level}
                </span>
              </div>
            ))}
            {masteries.length > 5 && (
              <button className="text-[11px] text-text-ghost mt-1">
                +{masteries.length - 5} more groups
              </button>
            )}
          </div>
        </>
      )}

      {/* Badges */}
      <SectionLabel>Badges</SectionLabel>
      <BadgeGrid earned={achievements.map(a => a.achievement_id)} />

      {/* Recent games */}
      {recentPlays.length > 0 && (
        <>
          <SectionLabel className="mt-5">Recent games</SectionLabel>
          <div className="space-y-1.5 mb-5">
            {recentPlays.slice(0, 5).map(play => (
              <div key={play.id} className="flex items-center gap-3 p-3 bg-bg-secondary rounded-xl">
                <div className="flex-1">
                  <div className="flex justify-between">
                    <span className="text-xs font-medium">{formatModeName(play.mode_id)}</span>
                    <span className="text-xs font-medium text-correct">{play.correct}/{play.total}</span>
                  </div>
                  <div className="flex justify-between mt-0.5">
                    <span className="text-[11px] text-text-tertiary">{play.score.toLocaleString()} pts</span>
                    <span className="text-[10px] text-text-ghost">{formatTimeAgo(play.created_at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Share button */}
      <button onClick={() => shareProfile(player)}
        className="w-full py-3.5 rounded-[14px] bg-pink-400 text-bg-primary text-sm font-semibold mb-3">
        Share profile
      </button>

      {/* Settings (own profile only) */}
      {isOwnProfile && (
        <Link href="/settings" className="block text-center text-xs text-text-tertiary">
          Settings
        </Link>
      )}
    </div>
  );
}
```

---

## Step 2: Shareable OG Image — Profile Card

### `GET /api/og/profile/[username]`

Generate a 1200x630 OG image showing the player's identity:

```tsx
// src/app/api/og/profile/[username]/route.tsx
import { ImageResponse } from '@vercel/og';

export async function GET(req: Request, { params }: { params: { username: string } }) {
  const player = await getPlayerByUsername(params.username);
  if (!player) return new Response('Not found', { status: 404 });

  const masteries = await getTopMasteries(player.id, 3);

  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
        background: '#0D0D0F', color: '#E8E6E0', padding: '60px',
        fontFamily: 'sans-serif',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '40px' }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%', background: '#ED93B1',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '32px', fontWeight: 700, color: '#0D0D0F',
          }}>
            {player.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <p style={{ fontSize: '32px', fontWeight: 600, margin: 0 }}>{player.username}</p>
            <p style={{ fontSize: '18px', color: '#ED93B1', margin: '4px 0 0' }}>
              Level {player.level} · {player.xp.toLocaleString()} XP
            </p>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: '32px', marginBottom: '40px' }}>
          <div>
            <p style={{ fontSize: '36px', fontWeight: 600, margin: 0 }}>{player.total_songs_correct.toLocaleString()}</p>
            <p style={{ fontSize: '14px', color: '#7A786E', margin: 0 }}>songs guessed</p>
          </div>
          <div>
            <p style={{ fontSize: '36px', fontWeight: 600, margin: 0 }}>
              {Math.round(player.total_songs_correct / Math.max(player.total_songs_played, 1) * 100)}%
            </p>
            <p style={{ fontSize: '14px', color: '#7A786E', margin: 0 }}>accuracy</p>
          </div>
        </div>

        {/* Mastery bars */}
        {masteries.map(m => (
          <div key={m.group_id} style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
            <span style={{ fontSize: '16px', fontWeight: 500, width: '120px' }}>{m.groups.name}</span>
            <div style={{ flex: 1, height: '8px', background: '#1E1E24', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: '4px', background: '#ED93B1', width: `${getMasteryProgress(m.mastery_xp) * 100}%` }} />
            </div>
            <span style={{ fontSize: '14px', color: '#ED93B1', fontWeight: 600 }}>Lv.{m.mastery_level}</span>
          </div>
        ))}

        {/* Watermark */}
        <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between' }}>
          <p style={{ fontSize: '14px', color: '#5A584E' }}>kpopblindtest.com</p>
          {player.current_streak > 0 && (
            <p style={{ fontSize: '14px', color: '#EF9F27' }}>{player.current_streak}-day streak</p>
          )}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
```

### Share function

```typescript
async function shareProfile(player: Player) {
  const url = `${window.location.origin}/player/${player.username}`;

  if (navigator.share) {
    await navigator.share({
      title: `${player.username} — K-pop Blind Test`,
      text: `Level ${player.level} · ${player.total_songs_correct} songs guessed · ${Math.round(player.total_songs_correct / Math.max(player.total_songs_played, 1) * 100)}% accuracy`,
      url,
    });
  } else {
    await navigator.clipboard.writeText(url);
    // Show toast: "Link copied"
  }
}
```

---

## Step 3: Shareable OG Image — Game Result

### `GET /api/og/result?score=8&total=10&points=1085&mode=Classic`

```tsx
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const score = searchParams.get('score') || '0';
  const total = searchParams.get('total') || '10';
  const points = searchParams.get('points') || '0';
  const mode = searchParams.get('mode') || 'Classic';

  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: '#0D0D0F', color: '#E8E6E0', fontFamily: 'sans-serif',
      }}>
        <p style={{ fontSize: '16px', color: '#7A786E', margin: '0 0 8px' }}>{mode} mode</p>
        <p style={{ fontSize: '72px', fontWeight: 700, margin: 0 }}>{score}/{total}</p>
        <p style={{ fontSize: '24px', color: '#ED93B1', margin: '8px 0 0' }}>{parseInt(points).toLocaleString()} pts</p>
        <p style={{ fontSize: '20px', color: '#7A786E', margin: '32px 0 0' }}>Can you beat this?</p>
        <p style={{ fontSize: '16px', color: '#5A584E', margin: '8px 0 0' }}>kpopblindtest.com</p>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
```

---

## Step 4: OpenGraph Metadata

On the public profile page:

```typescript
export async function generateMetadata({ params }): Promise<Metadata> {
  const player = await getPlayerByUsername(params.username);
  if (!player) return {};

  const accuracy = Math.round(player.total_songs_correct / Math.max(player.total_songs_played, 1) * 100);

  return {
    title: `${player.username} — K-pop Blind Test Profile`,
    description: `Level ${player.level} · ${player.total_songs_correct} songs guessed · ${accuracy}% accuracy`,
    openGraph: {
      images: [{ url: `/api/og/profile/${player.username}`, width: 1200, height: 630 }],
    },
  };
}
```

---

## What NOT To Do

- Do NOT use any purple in the profile or OG images — pink (#ED93B1) only
- Do NOT show mastery bars for groups the player hasn't played (mastery_xp = 0)
- Do NOT show more than 5 mastery bars initially — collapse the rest behind "show more"
- Do NOT forget the `@vercel/og` package in dependencies
- Do NOT make the OG image too busy — keep it clean with just the key stats
