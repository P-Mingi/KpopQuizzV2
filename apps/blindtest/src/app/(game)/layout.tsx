export default function GameLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen relative">
      {/* Decorative bg -- desktop only */}
      <div className="hidden md:block fixed inset-0 -z-10 bg-bg-primary">
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 50%, var(--pink-400), transparent 50%), radial-gradient(circle at 80% 50%, var(--pink-400), transparent 50%)',
          }}
        />
      </div>

      <div className="max-w-[500px] mx-auto min-h-screen">
        {children}
      </div>
    </div>
  );
}
