import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In | KpopQuiz',
  robots: { index: false, follow: true },
};

interface LoginLayoutProps {
  children: React.ReactNode;
}

export default function LoginLayout({ children }: LoginLayoutProps): React.ReactElement {
  return <>{children}</>;
}
