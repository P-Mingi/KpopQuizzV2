import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin | KpopQuizz',
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
      {children}
    </div>
  );
}
