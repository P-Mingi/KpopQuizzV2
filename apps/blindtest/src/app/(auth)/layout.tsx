import { TopNav } from '@/components/layout/top-nav';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopNav />
      <main className="max-w-[430px] mx-auto">
        {children}
      </main>
    </>
  );
}
