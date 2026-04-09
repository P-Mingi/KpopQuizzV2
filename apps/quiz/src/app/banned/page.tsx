import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Account Suspended | KpopQuiz',
  robots: { index: false, follow: false },
};

export default function BannedPage(): React.ReactElement {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-lg font-medium text-primary mb-2">
          Your account has been suspended.
        </h1>
        <p className="text-sm text-secondary">
          If you think this is a mistake, contact us at support@kpopquiz.org
        </p>
      </div>
    </div>
  );
}
