import Link from 'next/link';
import { createServiceRoleClient } from '@kpopquiz/shared/supabase/server';
import { PlayerStatsCard } from '@/components/home/player-stats-card';

async function fetchStats() {
  try {
    const supabase = createServiceRoleClient();
    const { count: totalSongs } = await supabase
      .from('songs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active');
    const { count: totalPlays } = await supabase
      .from('bt_game_results')
      .select('id', { count: 'exact', head: true });
    return { totalSongs: totalSongs ?? 0, totalPlays: totalPlays ?? 0 };
  } catch {
    return { totalSongs: 0, totalPlays: 0 };
  }
}

export async function Sidebar() {
  const stats = await fetchStats();

  return (
    <div className="sticky top-5 space-y-4">
      <PlayerStatsCard />
      <SidebarLeaderboard />
      <SidebarStats totalSongs={stats.totalSongs} totalPlays={stats.totalPlays} />
    </div>
  );
}

function SidebarLeaderboard() {
  return (
    <div className="bg-surface rounded-2xl p-4 border border-default shadow-card">
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-tertiary mb-3">
        Leaderboard
      </p>
      <div className="flex bg-elevated rounded-lg overflow-hidden mb-3">
        <button className="flex-1 py-1.5 text-[10px] font-medium text-accent border-b-[1.5px] border-accent">
          Today
        </button>
        <button className="flex-1 py-1.5 text-[10px] font-medium text-tertiary">
          Weekly
        </button>
        <button className="flex-1 py-1.5 text-[10px] font-medium text-tertiary">
          All
        </button>
      </div>
      <div className="py-4 text-center">
        <p className="text-xs text-tertiary">No plays yet</p>
        <p className="text-[10px] text-ghost mt-0.5">Be the first to set a score</p>
      </div>
      <Link href="/leaderboard" className="block text-center text-[11px] text-tertiary mt-2 hover:text-secondary">
        View full leaderboard
      </Link>
    </div>
  );
}

function SidebarStats({ totalSongs, totalPlays }: { totalSongs: number; totalPlays: number }) {
  return (
    <div className="bg-surface rounded-2xl p-4 border border-default shadow-card">
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-tertiary mb-3">
        Stats
      </p>
      <div className="space-y-2">
        {[
          { label: 'Songs', value: totalSongs > 0 ? totalSongs.toLocaleString() : '20,000+' },
          { label: 'Artists', value: '240+' },
          { label: 'Total plays', value: totalPlays.toLocaleString() },
        ].map((s) => (
          <div key={s.label} className="flex justify-between text-sm">
            <span className="text-secondary">{s.label}</span>
            <span className="font-medium">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
