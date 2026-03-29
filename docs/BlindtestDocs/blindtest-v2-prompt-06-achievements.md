# Prompt 6: Achievement / Badge System

## Overview

Achievements are badges that players earn by hitting milestones. They show on the player's profile. Achievements are checked after every play — if a condition is met and the player doesn't already have the badge, it's awarded.

---

## Step 1: Achievement Definitions

Already defined in Prompt 2's `src/lib/achievements.ts`. This prompt builds the checker and display.

### Achievement Categories

| Category | Color | Examples |
|----------|-------|---------|
| skill | gold / green | Perfect Ear, Speed Demon, Lightning Strike, Combo King |
| fandom | pink | ARMY Certified (BTS Lv.5), BLINK Certified (BP Lv.5), etc. |
| dedication | gold / default | Multi-stan, Week Warrior, Monthly Devotion, Song Collector |

### Fandom badges — auto-generated

For every group, when a player reaches mastery level 5, they earn the "{Fandom name} Certified" badge. These are NOT hardcoded — they generate based on the groups table:

```typescript
export function getFandomAchievementId(groupSlug: string): string {
  return `fandom_${groupSlug}`;
}

export function getFandomAchievementName(groupName: string, fandomName?: string): string {
  return fandomName ? `${fandomName} Certified` : `${groupName} Lv.5`;
}
```

---

## Step 2: Achievement Checker

After every play is recorded, check all achievement conditions:

```typescript
// src/lib/achievement-checker.ts

export async function checkAchievements(
  playerId: string,
  latestPlay: PlayRecord,
  playerStats: PlayerStats,
  masteries: GroupMastery[],
  existingAchievements: string[],
  supabase: any
): Promise<string[]> {
  const newAchievements: string[] = [];

  function award(id: string) {
    if (!existingAchievements.includes(id) && !newAchievements.includes(id)) {
      newAchievements.push(id);
    }
  }

  // ── Skill badges ──
  if (latestPlay.correct === latestPlay.total && latestPlay.total >= 5) {
    award('perfect_ear');
  }
  if (latestPlay.mode_id === 'speed-round' && latestPlay.correct === latestPlay.total) {
    award('speed_demon');
  }
  const hasLightning = latestPlay.songs.some(s => s.correct && s.time < 1);
  if (hasLightning) award('lightning_strike');

  if (latestPlay.best_combo >= 10) award('combo_king');

  const allUnder3 = latestPlay.songs.every(s => s.correct && s.time < 3);
  if (allUnder3 && latestPlay.correct === latestPlay.total) award('no_mercy');

  // ── Fandom badges (mastery level 5+) ──
  for (const m of masteries) {
    if (m.mastery_level >= 5) {
      const fandomId = getFandomAchievementId(m.groups.slug);
      award(fandomId);
    }
  }

  // ── Dedication badges ──
  const masteryAt3Plus = masteries.filter(m => m.mastery_level >= 3).length;
  if (masteryAt3Plus >= 5) award('multi_stan');

  if (playerStats.current_streak >= 7) award('week_warrior');
  if (playerStats.current_streak >= 30) award('monthly_devotion');
  if (playerStats.current_streak >= 100) award('centurion');

  // Song collector — count unique songs correctly guessed
  // This requires querying all past plays — expensive, so only check at milestones
  if (playerStats.total_songs_correct >= 100) award('song_collector_100');
  if (playerStats.total_songs_correct >= 500) award('song_collector_500');
  if (playerStats.total_songs_correct >= 1000) award('song_collector_1000');

  // Daily challenge badges
  const { count: dailyCount } = await supabase
    .from('daily_challenge_plays')
    .select('id', { count: 'exact', head: true })
    .eq('player_id', playerId);
  if ((dailyCount ?? 0) >= 1) award('daily_first');
  if ((dailyCount ?? 0) >= 10) award('daily_10');
  if ((dailyCount ?? 0) >= 50) award('daily_50');

  // ── Insert new achievements ──
  if (newAchievements.length > 0) {
    await supabase.from('player_achievements').insert(
      newAchievements.map(id => ({ player_id: playerId, achievement_id: id }))
    );
  }

  return newAchievements;
}
```

### Call the checker after recording a play

In the `/api/play/record` route, after `record_bt_play` completes, call `checkAchievements`.

Return newly earned achievements in the API response so the client can show a celebration:

```typescript
// In the record API response:
return NextResponse.json({
  success: true,
  new_achievements: newlyEarned, // e.g., ['perfect_ear', 'fandom_bts']
});
```

---

## Step 3: Achievement Display

### On the results screen — new badge popup

When the API returns new achievements, show a brief celebration on the results screen:

```tsx
{newAchievements.length > 0 && (
  <div className="mb-4 p-3 rounded-xl bg-pink-50 border border-pink-100">
    <p className="text-xs font-semibold text-pink-400 mb-2">New badge earned!</p>
    {newAchievements.map(id => {
      const achievement = getAchievementById(id);
      return (
        <div key={id} className="flex items-center gap-2 py-1">
          <AchievementBadge achievement={achievement} size="sm" />
          <span className="text-xs text-text-primary">{achievement.name}</span>
        </div>
      );
    })}
  </div>
)}
```

### On the profile page — badge grid

```tsx
function BadgeGrid({ earned, all }: { earned: string[]; all: Achievement[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {all.map(a => {
        const isEarned = earned.includes(a.id);
        const colorMap = {
          gold: isEarned ? 'bg-streak-bg border-[rgba(239,159,39,0.25)] text-streak' : '',
          pink: isEarned ? 'bg-pink-50 border-pink-100 text-pink-400' : '',
          green: isEarned ? 'bg-[rgba(151,196,89,0.1)] border-[rgba(151,196,89,0.25)] text-correct' : '',
          default: isEarned ? 'bg-bg-tertiary border-border-hover text-text-primary' : '',
        };
        return (
          <span key={a.id} className={`text-[11px] font-medium px-3 py-1.5 rounded-[10px] border ${
            isEarned ? colorMap[a.color] : 'bg-transparent border-border-default text-text-ghost'
          }`}>
            {a.name}
          </span>
        );
      })}
    </div>
  );
}
```

Locked badges show with ghost text and dashed-style border. Earned badges show with their category color.

---

## What NOT To Do

- Do NOT check achievements on every API call — only after play/record
- Do NOT let anonymous players earn achievements
- Do NOT hardcode fandom badge names — generate from groups table
- Do NOT show a celebration popup for already-earned badges
- Do NOT query all past plays for every achievement check — use aggregate stats from the players table
