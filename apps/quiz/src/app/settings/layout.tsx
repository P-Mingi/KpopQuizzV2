import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Settings | KpopQuiz',
  robots: { index: false, follow: true },
};

interface SettingsLayoutProps {
  children: React.ReactNode;
}

export default function SettingsLayout({ children }: SettingsLayoutProps): React.ReactElement {
  return <>{children}</>;
}
