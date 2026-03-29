# Prompt 5: Progression — XP, Levels, Group Mastery, Streaks

## Overview

Wire up the progression systems that make players come back. XP and levels are global. Group mastery is per-group. Streaks are daily. All data is computed server-side and stored in the `players` and `player_group_mastery` tables (created in Prompt 2).

---

## Step 1: XP Earning Rules

XP is earned at the end of each game. Calculated client-side for instant display, then confirmed server-side when the play is recorded.

```typescript
// src/lib/progression.ts

export function calculateXPEarned(answers: SongAnswer[]): number {
  let xp = 0;
  const correct = answers.filter(a => a.correct && !a.skipped);
  const total = answers.filter(a => !a.skipped);

  xp += correct.length * 10;                                       // +10 per correct
  xp += correct.filter(a => a.time < 2).length * 5;                // +5 bonus for lightning answers
  if (correct.length === total.length && total.length >= 5) xp += 50;  // +50 for perfect round
  // First play of the day bonus is handled server-side (streak update)

  return xp;
}
```

### Player Level Thresholds

Stored as a database function (`calc_player_level` from Prompt 2). Also available client-side:

```typescript
export const LEVEL_THRESHOLDS = [
  { level: 1, xp: 0 },
  { level: 2, xp: 100 },
  { level: 3, xp: 250 },
  { level: 4, xp: 500 },
  { level: 5, xp: 1000 },
  { level: 6, xp: 1750 },
  { level: 7, xp: 2750 },
  { level: 8, xp: 4000 },
  { level: 9, xp: 5500 },
  { level: 10, xp: 7500 },
  { level: 12, xp: 12000 },
  { level: 15, xp: 20000 },
  { level: 20, xp: 40000 },
  { level: 25, xp: 70000 },
  { level: 30, xp: 110000 },
  { level: 40, xp: 200000 },
  { level: 50, xp: 500000 },
];

export function getLevel(xp: number): number {
  let level = 1;
  for (const t of LEVEL_THRESHOLDS) {
    if (xp >= t.xp) level = t.level;
    else break;
  }
  return level;
}

export function getXPForNextLevel(xp: number): { current: number; needed: number; progress: number } {
  const currentLevel = getLevel(xp);
  const currentThreshold = LEVEL_THRESHOLDS.find(t => t.level === currentLevel)?.xp ?? 0;
  const nextThreshold = LEVEL_THRESHOLDS.find(t => t.level > currentLevel)?.xp ?? currentThreshold;
  const progress = nextThreshold > currentThreshold
    ? (xp - currentThreshold) / (nextThreshold - currentThreshold)
    : 1;
  return { current: xp - currentThreshold, needed: nextThreshold - currentThreshold, progress: Math.min(progress, 1) };
}
```

---

## Step 2: Group Mastery

Every correct answer earns mastery XP for the song's group. This happens in the `record_bt_play` database function (Prompt 2).

```typescript
// Client-side: calculate mastery XP to send to the API
export function calculateGroupMasteryUpdates(answers: SongAnswer[], songs: RoundSong[]): GroupMasteryUpdate[] {
  const map: Record<string, number> = {};

  for (const answer of answers) {
    if (!answer.correct || answer.skipped) continue;
    const song = songs.find(s => s.song_id === answer.song_id);
    if (!song?.group_id) continue;

    const xp = answer.time < 2 ? 15 : 10; // +15 for fast, +10 for normal
    map[song.group_id] = (map[song.group_id] || 0) + xp;
  }

  return Object.entries(map).map(([group_id, mastery_xp]) => ({ group_id, mastery_xp }));
}
```

### Mastery Level Thresholds (client-side mirror)

```typescript
export const MASTERY_THRESHOLDS = [
  { level: 1, xp: 0 },
  { level: 2, xp: 50 },
  { level: 3, xp: 150 },
  { level: 4, xp: 350 },
  { level: 5, xp: 700 },
  { level: 6, xp: 1200 },
  { level: 7, xp: 2000 },
  { level: 8, xp: 3500 },
  { level: 9, xp: 6000 },
  { level: 10, xp: 10000 },
];

export function getMasteryLevel(xp: number): number {
  let level = 1;
  for (const t of MASTERY_THRESHOLDS) {
    if (xp >= t.xp) level = t.level;
    else break;
  }
  return level;
}

export function getMasteryProgress(xp: number): number {
  const level = getMasteryLevel(xp);
  const current = MASTERY_THRESHOLDS.find(t => t.level === level)?.xp ?? 0;
  const next = MASTERY_THRESHOLDS.find(t => t.level === level + 1)?.xp;
  if (!next) return 1;
  return (xp - current) / (next - current);
}
```

### Mastery display on results screen

After a game, show which groups you earned mastery XP for:

```tsx
{groupMasteryUpdates.length > 0 && (
  <div className="mt-4">
    <p className="text-xs font-medium text-text-tertiary mb-2">Group mastery earned</p>
    {groupMasteryUpdates.map(update => (
      <div key={update.group_id} className="flex items-center gap-2.5 py-1.5">
        <span className="text-xs min-w-[80px]">{update.group_name}</span>
        <div className="flex-1 h-1 bg-border-default rounded-full">
          <div className="h-1 rounded-full bg-pink-400" style={{ width: `${update.progress * 100}%` }} />
        </div>
        <span className="text-[11px] text-pink-400">Lv.{update.mastery_level}</span>
      </div>
    ))}
  </div>
)}
```

---

## Step 3: Streak System

The streak updates when a play is recorded. Logic is in the `update_player_streak` database function (Prompt 2).

### Client-side streak display

In the TopNav, show the streak count with a fire icon:

```tsx
{player.current_streak > 0 && (
  <span className="text-xs text-streak font-medium flex items-center gap-1">
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M6 1C6 1 3 4 3 7C3 8.7 4.3 10 6 10C7.7 10 9 8.7 9 7C9 4 6 1 6 1Z" fill="#EF9F27"/>
    </svg>
    {player.current_streak}d
  </span>
)}
```

### Streak bonus XP

Streaks of 14+ days earn a 1.2x XP multiplier. Streaks of 30+ days earn 1.5x.

```typescript
export function getStreakMultiplier(streak: number): number {
  if (streak >= 30) return 1.5;
  if (streak >= 14) return 1.2;
  return 1.0;
}
```

Apply this multiplier to the XP earned per game in the record_bt_play function. Update the database function:

```sql
-- Inside record_bt_play, after calculating base XP:
DECLARE
  streak_mult FLOAT;
BEGIN
  SELECT current_streak INTO cur_streak FROM players WHERE id = p_player_id;
  IF cur_streak >= 30 THEN streak_mult := 1.5;
  ELSIF cur_streak >= 14 THEN streak_mult := 1.2;
  ELSE streak_mult := 1.0;
  END IF;

  p_xp_earned := ROUND(p_xp_earned * streak_mult);
END;
```

---

## Step 4: API — Get Player Stats

### `GET /api/player/me`

Returns the current player's full stats including mastery levels.

```typescript
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  const supabase = createServerClient();

  const { data: player } = await supabase
    .from('players')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 });

  const { data: masteries } = await supabase
    .from('player_group_mastery')
    .select('*, groups!inner(name, slug, display_color)')
    .eq('player_id', session.user.id)
    .order('mastery_xp', { ascending: false });

  const { data: achievements } = await supabase
    .from('player_achievements')
    .select('achievement_id, earned_at')
    .eq('player_id', session.user.id);

  const { data: recentPlays } = await supabase
    .from('bt_plays')
    .select('mode_id, score, correct, total, created_at')
    .eq('player_id', session.user.id)
    .order('created_at', { ascending: false })
    .limit(10);

  return NextResponse.json({
    player,
    masteries: masteries ?? [],
    achievements: achievements ?? [],
    recent_plays: recentPlays ?? [],
  });
}
```

---

## What NOT To Do

- Do NOT calculate XP client-side only — server must validate and apply
- Do NOT let anonymous players earn XP or mastery — only logged-in players
- Do NOT show streak multiplier if streak < 14 — it's not active yet
- Do NOT forget to update mastery_level when mastery_xp changes (use calc_mastery_level)
- Do NOT store mastery for groups that don't exist in the groups table
