export default function ChallengeLayout({ children }: { children: React.ReactNode }) {
  // Same structure as (game)/layout.tsx so GamePlayer's flex-1 children have
  // a full-height flex parent on both mobile and desktop.
  return (
    <div className="min-h-[100dvh] bg-primary relative">
      <div className="hidden md:block fixed inset-0 -z-10 bg-primary">
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 50%, var(--accent), transparent 50%), radial-gradient(circle at 80% 50%, var(--accent), transparent 50%)',
          }}
        />
      </div>

      <div className="max-w-[440px] md:max-w-none mx-auto min-h-[100dvh] flex flex-col">
        {children}
      </div>
    </div>
  );
}
