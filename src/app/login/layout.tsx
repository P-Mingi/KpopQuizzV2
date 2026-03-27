import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In | KpopQuizz',
  robots: { index: false, follow: false },
};

interface LoginLayoutProps {
  children: React.ReactNode;
}

export default function LoginLayout({ children }: LoginLayoutProps): React.ReactElement {
  return <>{children}</>;
}
