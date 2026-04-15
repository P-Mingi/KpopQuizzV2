export default function PartyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-primary">
      {children}
    </div>
  );
}
