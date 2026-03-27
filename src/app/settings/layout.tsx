import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Settings | KpopQuizz',
  robots: { index: false },
};

interface SettingsLayoutProps {
  children: React.ReactNode;
}

export default function SettingsLayout({ children }: SettingsLayoutProps): React.ReactElement {
  return <>{children}</>;
}
