import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pick a Username | KpopQuizz',
  robots: { index: false, follow: false },
};

interface OnboardingLayoutProps {
  children: React.ReactNode;
}

export default function OnboardingLayout({ children }: OnboardingLayoutProps): React.ReactElement {
  return <>{children}</>;
}
