# Prompt 7: Daily Challenge

## Overview

Same 10 songs for everyone, resets at midnight KST. One play per day per player. Global daily leaderboard. This is the #1 retention mechanic.

---

## Step 1: Daily Challenge Generation

### Cron job or on-demand generation

Create an API route that generates today's challenge if it doesn't exist yet:

```typescript
// src/app/api/daily/route.ts

export async function GET() {
  const supabase = createServiceClient();
  const today = getTodayKST(); // YYYY-MM-DD in KST timezone

  // Check if today's challenge exists
  let { data: challenge } = await supabase
    .from('daily_challenges')
    .select('*')
    .eq('date', today)
    .single();

  if (!challenge) {
    // Generate today's challenge
    challenge = await generateDailyChallenge(supabase, today);
  }

  // Get play count for today
  const { count: playCount } = await supabase
    .from('daily_challenge_plays')
    .select('id', { count: 'exact', head: true })
    .eq('challenge_id', challenge.id);

  // Get average score
  const { data: avgData } = await supabase
    .from('daily_challenge_plays')
    .select('score')
    .eq('challenge_id', challenge.id);

  const avgScore = avgData && avgData.length > 0
    ? Math.round(avgData.reduce((s, p) => s + p.score, 0) / avgData.length)
    : 0;

  return NextResponse.json({
    challenge: {
      id: challenge.id,
      date: challenge.date,
      song_count: challenge.song_ids.length,
      clip_duration: challenge.clip_duration,
    },
    stats: {
      play_count: playCount ?? 0,
      avg_score: avgScore,
    },
  });
}
```

### Generate function

```typescript
async function generateDailyChallenge(supabase: any, date: string) {
  // Get all active songs with chorus timestamp
  const { data: allSongs } = await supabase
    .from('blind_test_songs')
    .select('id, group_id, gender')
    .eq('status', 'active')
    .not('clip_chorus', 'is', null);

  if (!allSongs || allSongs.length < 10) throw new Error('Not enough songs');

  // Get song IDs used in the last 7 daily challenges to avoid repeats
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const { data: recentDailies } = await supabase
    .from('daily_challenges')
    .select('song_ids')
    .gte('date', weekAgo.toISOString().split('T')[0]);

  const recentSongIds = new Set((recentDailies ?? []).flatMap(d => d.song_ids));

  // Filter out recently used songs
  let pool = allSongs.filter(s => !recentSongIds.has(s.id));
  if (pool.length < 10) pool = allSongs; // fallback if not enough fresh songs

  // Ensure variety: max 2 songs per group
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const selected: typeof pool = [];
  const groupCount: Record<string, number> = {};

  for (const song of shuffled) {
    const gid = song.group_id || 'none';
    if ((groupCount[gid] || 0) >= 2) continue;
    selected.push(song);
    groupCount[gid] = (groupCount[gid] || 0) + 1;
    if (selected.length >= 10) break;
  }

  // Ensure mix: at least some GG and BG representation
  // (best effort — don't block if not possible)

  const songIds = selected.map(s => s.id);

  const { data: challenge } = await supabase
    .from('daily_challenges')
    .insert({
      date,
      song_ids: songIds,
      clip_point: 'chorus',
      clip_duration: 10,
    })
    .select()
    .single();

  return challenge;
}
```

### KST timezone helper

```typescript
function getTodayKST(): string {
  const now = new Date();
  // KST is UTC+9
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().split('T')[0];
}
```

---

## Step 2: Daily Play API

### `POST /api/daily/generate`

Returns the song data for today's challenge (same as regular generate but uses fixed song IDs):

```typescript
export async function POST() {
  const session = await getSession();
  const supabase = createServerClient();
  const today = getTodayKST();

  const { data: challenge } = await supabase
    .from('daily_challenges')
    .select('*')
    .eq('date', today)
    .single();

  if (!challenge) return NextResponse.json({ error: 'No daily challenge' }, { status: 404 });

  // Check if player already played
  if (session?.user?.id) {
    const { data: existing } = await supabase
      .from('daily_challenge_plays')
      .select('id')
      .eq('player_id', session.user.id)
      .eq('challenge_id', challenge.id)
      .single();

    if (existing) return NextResponse.json({ error: 'Already played today', played: true }, { status: 400 });
  }

  // Fetch the songs in the fixed order
  const { data: songs } = await supabase
    .from('blind_test_songs')
    .select('id, title, artist, youtube_id, wrong_answers, clip_chorus, group_id, generation, gender')
    .in('id', challenge.song_ids)
    .eq('status', 'active');

  // Maintain the order from challenge.song_ids
  const ordered = challenge.song_ids
    .map(id => songs?.find(s => s.id === id))
    .filter(Boolean);

  // Build round with question types (same logic as regular generate)
  const round = await buildRound(ordered, 'chorus', challenge.clip_duration, supabase);

  return NextResponse.json({
    challenge_id: challenge.id,
    mode_id: 'daily',
    mode_title: "Today's challenge",
    clip_duration: challenge.clip_duration,
    songs: round,
  });
}
```

### `POST /api/daily/record`

Records the daily challenge play. One attempt only.

```typescript
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Must be logged in for daily' }, { status: 401 });

  const body = await req.json();
  const supabase = createServiceClient();

  // Verify one-play-per-day
  const { data: existing } = await supabase
    .from('daily_challenge_plays')
    .select('id')
    .eq('player_id', session.user.id)
    .eq('challenge_id', body.challenge_id)
    .single();

  if (existing) return NextResponse.json({ error: 'Already played' }, { status: 400 });

  // Record the daily play
  await supabase.from('daily_challenge_plays').insert({
    player_id: session.user.id,
    challenge_id: body.challenge_id,
    score: body.score,
    correct: body.correct,
    total_time: body.total_time,
    songs: body.songs,
  });

  // Also record as a regular play for XP/mastery
  await supabase.rpc('record_bt_play', {
    p_player_id: session.user.id,
    p_mode_id: 'daily',
    p_score: body.score,
    p_correct: body.correct,
    p_total: body.total,
    p_total_time: body.total_time,
    p_best_combo: body.best_combo,
    p_songs: body.songs,
    p_xp_earned: body.xp_earned,
    p_group_mastery_updates: body.group_mastery_updates,
  });

  // Get player's rank for today
  const { data: allPlays } = await supabase
    .from('daily_challenge_plays')
    .select('player_id, score')
    .eq('challenge_id', body.challenge_id)
    .order('score', { ascending: false });

  const rank = (allPlays ?? []).findIndex(p => p.player_id === session.user.id) + 1;

  return NextResponse.json({ success: true, rank, total_players: allPlays?.length ?? 0 });
}
```

---

## Step 3: Daily Challenge Page — `/daily`

```tsx
// src/app/(main)/daily/page.tsx

export default async function DailyPage() {
  const session = await getSession();
  const player = session ? await getPlayerProfile(session.user.id) : null;

  const dailyRes = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/daily`);
  const { challenge, stats } = await dailyRes.json();

  // Check if player has played today
  const played = player ? await hasPlayedDaily(player.id, challenge.id) : false;
  const playerResult = played ? await getDailyResult(player.id, challenge.id) : null;

  // Get today's leaderboard
  const leaderboard = await getDailyLeaderboard(challenge.id, 20);

  return (
    <div className="px-5 pt-5 pb-8">
      <p className="text-xl font-semibold mb-1">Daily challenge</p>
      <p className="text-[13px] text-text-secondary mb-5">
        {challenge.date} · {stats.play_count} players today
      </p>

      {!played ? (
        // Show play button
        <div className="text-center mb-6">
          <p className="text-sm text-text-secondary mb-4">
            10 songs. One shot. Same songs for everyone.
          </p>
          <Link href="/play/daily"
            className="inline-block px-8 py-3.5 rounded-[14px] bg-pink-400 text-bg-primary text-sm font-semibold">
            Play today's challenge
          </Link>
          {!player && (
            <p className="text-xs text-text-tertiary mt-3">
              Sign in to play the daily challenge
            </p>
          )}
        </div>
      ) : (
        // Show player's result
        <div className="mb-6 p-4 rounded-2xl bg-bg-secondary border border-border-default text-center">
          <p className="text-3xl font-semibold">{playerResult.correct}/10</p>
          <p className="text-sm text-text-secondary mt-1">{playerResult.score} pts · Rank #{playerResult.rank}</p>
        </div>
      )}

      {/* Today's leaderboard */}
      <SectionLabel>Today's ranking</SectionLabel>
      <DailyLeaderboard entries={leaderboard} currentPlayerId={player?.id} />
    </div>
  );
}
```

### Daily-specific gameplay rules

When playing the daily challenge:
- Songs are in a FIXED order (same for everyone)
- No "play again" button on results — you only get one shot
- Results show your rank among all players who played today
- Results show average score for comparison
- Must be logged in to play (anonymous users see "Sign in to play")

---

## Step 4: Daily Play in the Game Component

The `BlindTestGame` component (Prompt 3) needs to handle the `daily` mode specially:

```typescript
// In BlindTestGame:
const isDaily = mode.id === 'daily';

// Use different generate endpoint
const generateUrl = isDaily ? '/api/daily/generate' : '/api/play/generate';

// Use different record endpoint
const recordUrl = isDaily ? '/api/daily/record' : '/api/play/record';

// On results screen for daily:
// - No "Play again" button
// - Show rank: "You ranked #47 out of 482 players"
// - Show "See full leaderboard" link to /daily
```

---

## What NOT To Do

- Do NOT let a player play the daily challenge twice — enforce server-side with UNIQUE constraint
- Do NOT let anonymous users play the daily — must be logged in (this drives signups)
- Do NOT randomize song order for daily — everyone gets the same order
- Do NOT show "Play again" on daily results — it's a one-shot game
- Do NOT generate the daily challenge in the player's local timezone — use KST (Korean Standard Time)
- Do NOT use songs from the last 7 days' dailies — keep it fresh
