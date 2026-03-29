import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="pt-5 pb-8">
      <div className="mb-5">
        <p className="text-xl font-semibold">K-pop blind test</p>
        <p className="text-[13px] text-text-secondary mt-0.5">How well do you REALLY know K-pop?</p>
      </div>

      {/* Daily challenge card */}
      <div className="mb-6 p-4 rounded-2xl border relative overflow-hidden" style={{ background: 'linear-gradient(135deg, var(--daily-card-from), var(--daily-card-to))', borderColor: 'var(--daily-card-border)' }}>
        <div className="absolute top-3 right-4 w-8 h-8 rounded-full bg-pink-50 flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 1L9.5 6.5L15 8L9.5 9.5L8 15L6.5 9.5L1 8L6.5 6.5L8 1Z" fill="var(--pink-400)"/>
          </svg>
        </div>
        <p className="text-[15px] font-semibold mb-0.5">Today&apos;s challenge</p>
        <p className="text-xs text-text-secondary mb-3">
          10 songs everyone plays. One shot. How do you rank?
        </p>
        <div className="inline-block px-5 py-2.5 rounded-xl bg-pink-400 text-bg-primary text-[13px] font-semibold">
          Coming soon
        </div>
      </div>

      {/* Pick your challenge */}
      <SectionLabel>Pick your challenge</SectionLabel>

      {/* Desktop: grid, Mobile: horizontal scroll */}
      <div className="hidden md:grid md:grid-cols-3 gap-2.5 mb-7">
        {['Classic', 'Intro', 'Speed'].map((mode) => (
          <ModeCard key={mode} title={mode} />
        ))}
      </div>
      <div className="md:hidden flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4 mb-7">
        {['Classic', 'Intro', 'Speed'].map((mode) => (
          <ModeCardMobile key={mode} title={mode} />
        ))}
      </div>

      {/* Special modes */}
      <SectionLabel>Special modes</SectionLabel>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 mb-7">
        {['Girl groups', 'Boy groups', 'Title tracks', 'Recent hits', '4th gen GG', 'Random'].map((mode) => (
          <div key={mode} className="rounded-xl overflow-hidden border border-border-default bg-bg-secondary hover:border-border-hover transition-colors">
            <div className="h-12 bg-bg-tertiary" />
            <div className="p-2.5">
              <p className="text-[13px] font-medium">{mode}</p>
              <p className="text-[10px] text-text-tertiary">Coming soon</p>
            </div>
          </div>
        ))}
      </div>

      {/* Leaderboard -- mobile only (sidebar shows it on desktop) */}
      <div className="md:hidden">
        <SectionLabel>Leaderboard</SectionLabel>
        <div className="rounded-[14px] bg-bg-secondary border border-border-default overflow-hidden mb-4">
          <div className="py-6 text-center">
            <p className="text-xs text-text-tertiary">No plays yet</p>
            <p className="text-[10px] text-text-ghost mt-0.5">Be the first to set a score</p>
          </div>
        </div>
      </div>

      {/* Sign up CTA */}
      <div className="text-center mt-8 pt-6 border-t border-border-default">
        <p className="text-sm font-medium mb-2">Ready to play?</p>
        <Link
          href="/login"
          className="inline-block px-6 py-3 rounded-[14px] bg-pink-400 text-bg-primary text-sm font-semibold"
        >
          Sign in to start
        </Link>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-tertiary mb-2.5">
      {children}
    </p>
  );
}

function ModeCard({ title }: { title: string }) {
  return (
    <div className="rounded-[14px] overflow-hidden bg-bg-secondary border border-border-default hover:border-border-hover transition-colors">
      <div className="h-14 bg-bg-tertiary" />
      <div className="p-2.5">
        <p className="text-[13px] font-medium">{title}</p>
        <p className="text-[10px] text-text-tertiary">Coming soon</p>
      </div>
    </div>
  );
}

function ModeCardMobile({ title }: { title: string }) {
  return (
    <div className="w-[130px] flex-shrink-0 rounded-[14px] overflow-hidden bg-bg-secondary border border-border-default">
      <div className="h-14 bg-bg-tertiary" />
      <div className="p-2.5">
        <p className="text-[13px] font-medium">{title}</p>
        <p className="text-[10px] text-text-tertiary">Coming soon</p>
      </div>
    </div>
  );
}
