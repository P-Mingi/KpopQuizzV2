import { LocaleProvider } from '@/lib/i18n/locale-context';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  robots: { index: true, follow: true },
};

interface PtLayoutProps {
  children: React.ReactNode;
}

export default function PtLayout({ children }: PtLayoutProps): React.ReactElement {
  return (
    <LocaleProvider locale="pt">
      {/* Sets lang synchronously during HTML parsing - before first paint. Same
          pattern as THEME_SCRIPT in the root layout. suppressHydrationWarning
          on <html> covers any React hydration mismatch. */}
      <script dangerouslySetInnerHTML={{ __html: "document.documentElement.lang='pt-BR';" }} />
      {children}
    </LocaleProvider>
  );
}
