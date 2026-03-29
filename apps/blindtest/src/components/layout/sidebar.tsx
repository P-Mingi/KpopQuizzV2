import Link from 'next/link';
import { createServerClient } from '@kpopquiz/shared/supabase/server';

async function fetchStats() {
  try {
    const supabase = await createServerClient();
    const { count: totalSongs } = await supabase
      .from('blind_test_songs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active');
    const { count: totalPlays } = await supabase
      .from('bt_plays')
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
      <SidebarLeaderboard />
      <SidebarStats totalSongs={stats.totalSongs} totalPlays={stats.totalPlays} />
      <SidebarEra />
    </div>
  );
}

function SidebarLeaderboard() {
  return (
    <div className="bg-bg-secondary rounded-2xl p-4 border border-border-default shadow-card">
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-tertiary mb-3">
        Leaderboard
      </p>
      <div className="flex bg-bg-tertiary rounded-lg overflow-hidden mb-3">
        <button className="flex-1 py-1.5 text-[10px] font-medium text-pink-400 border-b-[1.5px] border-pink-400">
          Today
        </button>
        <button className="flex-1 py-1.5 text-[10px] font-medium text-text-tertiary">
          Weekly
        </button>
        <button className="flex-1 py-1.5 text-[10px] font-medium text-text-tertiary">
          All
        </button>
      </div>
      <div className="py-4 text-center">
        <p className="text-xs text-text-tertiary">No plays yet</p>
        <p className="text-[10px] text-text-ghost mt-0.5">Be the first to set a score</p>
      </div>
      <Link href="/leaderboard" className="block text-center text-[11px] text-text-tertiary mt-2 hover:text-text-secondary">
        View full leaderboard
      </Link>
    </div>
  );
}

function SidebarStats({ totalSongs, totalPlays }: { totalSongs: number; totalPlays: number }) {
  return (
    <div className="bg-bg-secondary rounded-2xl p-4 border border-border-default shadow-card">
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-tertiary mb-3">
        Stats
      </p>
      <div className="space-y-2">
        {[
          { label: 'Songs', value: totalSongs > 0 ? `${totalSongs}` : '600+' },
          { label: 'Groups', value: '45+' },
          { label: 'Total plays', value: totalPlays.toLocaleString() },
        ].map((s) => (
          <div key={s.label} className="flex justify-between text-sm">
            <span className="text-text-secondary">{s.label}</span>
            <span className="font-medium">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SidebarEra() {
  return (
    <div className="bg-bg-secondary rounded-2xl p-4 border border-border-default shadow-card">
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-tertiary mb-3">
        By era
      </p>
      <div className="space-y-1.5">
        {[
          { label: '2nd gen', id: '2nd-gen' },
          { label: '3rd gen', id: '3rd-gen' },
          { label: '4th gen', id: '4th-gen' },
        ].map((era) => (
          <Link
            key={era.id}
            href={`/play/${era.id}`}
            className="block px-3 py-2 bg-bg-tertiary rounded-lg text-sm font-medium hover:bg-border-default transition-colors"
          >
            {era.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
