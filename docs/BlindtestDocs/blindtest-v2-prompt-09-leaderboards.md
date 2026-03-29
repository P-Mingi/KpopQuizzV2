# Prompt 9: Leaderboards

## Overview

Leaderboards drive competition. Four tabs: Today, Weekly, All Time, and per-mode. Leaderboards are computed from the `bt_plays` and `daily_challenge_plays` tables.

---

## Step 1: Leaderboard Page — `/leaderboard`

```tsx
// src/app/(main)/leaderboard/page.tsx
'use client';

export default function LeaderboardPage() {
  const [tab, setTab] = useState<'today' | 'weekly' | 'alltime'>('today');
  const [modeFilter, setModeFilter] = useState<string | null>(null);

  return (
    <div className="px-5 pt-5 pb-8">
      <p className="text-xl font-semibold mb-4">Leaderboard</p>

      {/* Period tabs */}
      <div className="flex gap-0 bg-bg-secondary rounded-xl overflow-hidden mb-4">
        {(['today', 'weekly', 'alltime'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
              tab === t ? 'text-pink-400 bg-bg-tertiary' : 'text-text-tertiary'
            }`}>
            {t === 'today' ? 'Today' : t === 'weekly' ? 'This week' : 'All time'}
          </button>
        ))}
      </div>

      {/* Optional mode filter */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide mb-4 -mx-5 px-5">
        <button onClick={() => setModeFilter(null)}
          className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-medium ${
            !modeFilter ? 'bg-pink-400 text-bg-primary' : 'bg-bg-secondary text-text-secondary'
          }`}>
          All modes
        </button>
        {['classic', 'intro-challenge', 'speed-round', 'daily'].map(mode => (
          <button key={mode} onClick={() => setModeFilter(mode)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-medium ${
              modeFilter === mode ? 'bg-pink-400 text-bg-primary' : 'bg-bg-secondary text-text-secondary'
            }`}>
            {formatModeName(mode)}
          </button>
        ))}
      </div>

      {/* Leaderboard entries */}
      <LeaderboardList tab={tab} modeFilter={modeFilter} />
    </div>
  );
}
```

---

## Step 2: Leaderboard API

### `GET /api/leaderboard?period=today&mode=classic&limit=50`

```typescript
// src/app/api/leaderboard/route.ts

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const period = searchParams.get('period') || 'today';
  const mode = searchParams.get('mode') || null;
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

  const supabase = createServerClient();

  let query;

  if (period === 'today') {
    const today = new Date().toISOString().split('T')[0];
    query = supabase
      .from('bt_plays')
      .select('player_id, score, players!inner(username, avatar_bg, avatar_text, level)')
      .gte('created_at', today + 'T00:00:00Z')
      .not('player_id', 'is', null)
      .order('score', { ascending: false })
      .limit(limit);
  } else if (period === 'weekly') {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    // Aggregate total points per player this week
    query = supabase.rpc('get_weekly_leaderboard', { p_limit: limit });
  } else {
    // All time — read from players table directly
    query = supabase
      .from('players')
      .select('id, username, avatar_bg, avatar_text, level, total_points')
      .order('total_points', { ascending: false })
      .limit(limit);
  }

  if (mode) {
    query = query.eq('mode_id', mode);
  }

  const { data, error } = await query;

  return NextResponse.json({ entries: data ?? [], period, mode });
}
```

### Weekly leaderboard aggregation function

```sql
CREATE OR REPLACE FUNCTION public.get_weekly_leaderboard(p_limit INTEGER DEFAULT 50)
RETURNS TABLE(player_id UUID, username TEXT, avatar_bg TEXT, avatar_text TEXT, level INTEGER, total_points BIGINT, games_played BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.player_id,
    pl.username,
    pl.avatar_bg,
    pl.avatar_text,
    pl.level,
    SUM(p.score)::BIGINT as total_points,
    COUNT(p.id)::BIGINT as games_played
  FROM bt_plays p
  JOIN players pl ON p.player_id = pl.id
  WHERE p.created_at >= CURRENT_DATE - INTERVAL '7 days'
    AND p.player_id IS NOT NULL
  GROUP BY p.player_id, pl.username, pl.avatar_bg, pl.avatar_text, pl.level
  ORDER BY total_points DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;
```

---

## Step 3: Leaderboard List Component

```tsx
function LeaderboardList({ tab, modeFilter }: Props) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const { player } = usePlayer(); // custom hook for current player

  useEffect(() => {
    setLoading(true);
    fetch(`/api/leaderboard?period=${tab}${modeFilter ? `&mode=${modeFilter}` : ''}`)
      .then(r => r.json())
      .then(data => { setEntries(data.entries); setLoading(false); });
  }, [tab, modeFilter]);

  if (loading) return <LeaderboardSkeleton />;

  return (
    <div className="rounded-[14px] bg-bg-secondary border border-border-default overflow-hidden">
      {entries.map((entry, i) => {
        const isMe = entry.player_id === player?.id || entry.id === player?.id;
        return (
          <Link key={entry.player_id || entry.id} href={`/player/${entry.username}`}
            className={`flex items-center gap-2.5 px-3.5 py-3 border-b border-border-default last:border-b-0 ${
              isMe ? 'bg-pink-50' : ''
            }`}>
            <span className={`text-xs font-semibold w-6 text-center ${
              i === 0 ? 'text-streak' : i === 1 ? 'text-text-secondary' : i === 2 ? 'text-[#D85A30]' : 'text-text-tertiary'
            }`}>
              {i + 1}
            </span>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold"
              style={{ backgroundColor: entry.avatar_bg || '#ED93B1', color: entry.avatar_text || '#0D0D0F' }}>
              {entry.username?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-medium truncate block">
                {entry.username} {isMe && <span className="text-text-tertiary font-normal">(you)</span>}
              </span>
              <span className="text-[10px] text-text-tertiary">Lv.{entry.level}</span>
            </div>
            <span className="text-xs font-medium text-pink-400">
              {(entry.total_points || entry.score || 0).toLocaleString()} pts
            </span>
          </Link>
        );
      })}

      {entries.length === 0 && (
        <div className="py-8 text-center">
          <p className="text-sm text-text-tertiary">No plays yet</p>
          <p className="text-xs text-text-ghost mt-1">Be the first to set a score</p>
        </div>
      )}
    </div>
  );
}
```

### Rank indicators

| Rank | Style |
|------|-------|
| #1 | Gold text (#EF9F27) |
| #2 | Silver text (#B4B2A9) |
| #3 | Bronze text (#D85A30) |
| #4+ | Gray text (text-tertiary) |
| You | Row highlighted with pink-50 bg |

---

## Step 4: Per-Mode Leaderboard

Each mode page (or results screen) shows a mini leaderboard for that specific mode:

```typescript
// Fetch top 10 for a specific mode
const { data } = await supabase
  .from('bt_plays')
  .select('player_id, score, players!inner(username, level)')
  .eq('mode_id', modeId)
  .not('player_id', 'is', null)
  .order('score', { ascending: false })
  .limit(10);
```

---

## What NOT To Do

- Do NOT show anonymous plays in leaderboards — only logged-in players
- Do NOT compute all-time leaderboard by aggregating bt_plays — use players.total_points directly
- Do NOT show more than 50 entries per page — paginate if needed later
- Do NOT make leaderboard a real-time subscription — fetch on page load is fine for MVP
- Do NOT mix daily challenge scores with regular mode scores — they're different tables
