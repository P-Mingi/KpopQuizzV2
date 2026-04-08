import '@/styles/globals.css';

import { ThemeProvider } from '@/components/theme-provider';

import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'K-pop Blind Test - How Well Do You REALLY Know K-pop?',
  description: 'The ultimate K-pop song guessing game. 600+ songs, 45+ groups, daily challenges, leaderboards. Free forever.',
  manifest: '/manifest.json',
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
          <div className="mx-auto min-h-screen w-full max-w-[960px]">
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
