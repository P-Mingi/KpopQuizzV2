export default function GameLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-full h-screen overflow-hidden">
      {children}
    </div>
  );
}
