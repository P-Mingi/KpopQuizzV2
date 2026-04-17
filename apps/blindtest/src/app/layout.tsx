import '@/styles/globals.css';

import { ThemeProvider } from '@/components/theme-provider';

import type { Metadata, Viewport } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kpopblindtest.com';
const SITE_NAME = 'K-pop Blindtest';
const SITE_TITLE = 'K-pop Blindtest - Can You Name That Song?';
const SITE_DESCRIPTION =
  'Test your K-pop knowledge. 22,000+ songs from 230+ artists including BTS, BLACKPINK, aespa, NewJeans, LE SSERAFIM and more. Quick play, challenge mode, daily challenge. Free forever.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  manifest: '/manifest.json',
  openGraph: {
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Prevent theme flash; runs before React hydrates. */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            try {
              var saved = localStorage.getItem('kbt-theme');
              var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
              var theme = saved || (prefersDark ? 'dark' : 'light');
              document.documentElement.classList.add(theme);
            } catch (_) {
              document.documentElement.classList.add('dark');
            }
          })();
        `}} />
      </head>
      <body className="min-h-screen bg-primary text-primary antialiased transition-colors">
        <ThemeProvider>
          <div className="mx-auto min-h-screen w-full">
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
