import Link from 'next/link';

export function Sidebar() {
  return (
    <div className="sticky top-5 space-y-4">
      <SidebarLeaderboard />
      <SidebarStats />
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

      {/* Period tabs */}
      <div className="flex bg-bg-primary rounded-lg overflow-hidden mb-3">
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

      {/* Placeholder */}
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

function SidebarStats() {
  return (
    <div className="bg-bg-secondary rounded-2xl p-4 border border-border-default shadow-card">
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-tertiary mb-3">
        Stats
      </p>
      <div className="space-y-2">
        {[
          { label: 'Songs', value: '600+' },
          { label: 'Groups', value: '45+' },
          { label: 'Modes', value: '20+' },
          { label: 'Players today', value: '0' },
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
        {['2nd gen', '3rd gen', '4th gen'].map((era) => (
          <Link
            key={era}
            href={`/play/${era.replace(' ', '-')}`}
            className="block px-3 py-2 bg-bg-primary rounded-lg text-sm font-medium hover:bg-bg-tertiary transition-colors"
          >
            {era}
          </Link>
        ))}
      </div>
    </div>
  );
}
