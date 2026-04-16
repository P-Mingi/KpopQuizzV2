import Link from 'next/link';
import { createServiceRoleClient } from '@kpopquiz/shared/supabase/server';
import { REDDIT_URL, REDDIT_LABEL } from '@kpopquiz/shared/social-links';
import { PlayerStatsCard } from '@/components/home/player-stats-card';
import { LobbyDaily } from '@/components/lobby/lobby-daily';

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
      <LobbyDaily />
      <PlayerStatsCard />
      <SidebarLeaderboard />
      <SidebarStats totalSongs={stats.totalSongs} totalPlays={stats.totalPlays} />
      <SidebarCommunity />
    </div>
  );
}

function SidebarCommunity() {
  return (
    <a
      href={REDDIT_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-surface rounded-2xl p-4 border border-default shadow-card hover:border-accent transition-colors"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-tertiary mb-2">
        Community
      </p>
      <div className="flex items-center gap-2">
        <svg width="18" height="18" viewBox="0 0 20 20" fill="#FF4500" aria-hidden="true">
          <path d="M10 0C4.478 0 0 4.478 0 10s4.478 10 10 10 10-4.478 10-10S15.522 0 10 0zm5.49 10.354a1.55 1.55 0 0 1 .01.175c0 2.677-3.117 4.847-6.962 4.847-3.845 0-6.962-2.17-6.962-4.847 0-.06.003-.12.01-.175a1.178 1.178 0 0 1-.315-.806 1.19 1.19 0 0 1 2.024-.843c.98-.629 2.315-1.032 3.797-1.078l.748-3.295a.24.24 0 0 1 .285-.18l2.321.487a.83.83 0 1 1-.083.475l-2.07-.435-.664 2.923c1.457.06 2.768.462 3.736 1.082a1.19 1.19 0 1 1 1.709 1.648 4.626 4.626 0 0 1 .01.175c0 .002 0 .005-.001.007a1.19 1.19 0 0 1-.594-.978zm-9.028 0a.595.595 0 1 0 1.19 0 .595.595 0 0 0-1.19 0zm5.283 1.658c-.493.493-1.55.668-1.757.668-.208 0-1.27-.178-1.758-.668a.196.196 0 0 0-.277.277c.62.62 1.799.84 2.035.84.237 0 1.41-.22 2.034-.84a.196.196 0 0 0-.277-.277zm-.11-1.063a.595.595 0 1 0 1.19 0 .595.595 0 0 0-1.19 0z" />
        </svg>
        <div className="flex-1">
          <p className="text-xs font-medium text-primary">{REDDIT_LABEL}</p>
          <p className="text-[10px] text-tertiary">Share scores, find new playlists</p>
        </div>
      </div>
    </a>
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
