import Link from 'next/link';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin | KpopQuiz',
  robots: { index: false },
};

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps): React.ReactElement {
  return (
    <div
      className="relative px-4"
      style={{
        width: 'min(1024px, calc(100vw - 32px))',
        left: '50%',
        transform: 'translateX(-50%)',
      }}
    >
      <nav className="flex items-center gap-4 py-3 border-b border-default mb-4 text-sm overflow-x-auto">
        <Link href="/admin" className="font-medium text-primary hover:text-accent-hover whitespace-nowrap">Dashboard</Link>
        <Link href="/admin/quiz-bank" className="text-secondary hover:text-primary whitespace-nowrap">Quiz Bank</Link>
        <Link href="/admin/pinterest" className="text-secondary hover:text-primary whitespace-nowrap">Pinterest</Link>
        <Link href="/admin/quiz/search" className="text-secondary hover:text-primary whitespace-nowrap">Edit Quizzes</Link>
        <Link href="/admin/this-or-that" className="text-secondary hover:text-primary whitespace-nowrap">This or That</Link>
        <Link href="/admin/cards" className="text-secondary hover:text-primary whitespace-nowrap">Cards</Link>
        <Link href="/battle" className="text-secondary hover:text-primary whitespace-nowrap" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          Battle
          <span style={{ fontSize: 8, fontWeight: 800, padding: '1px 4px', borderRadius: 3, background: 'var(--accent)', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5 }}>BETA</span>
        </Link>
      </nav>
      {children}
    </div>
  );
}
