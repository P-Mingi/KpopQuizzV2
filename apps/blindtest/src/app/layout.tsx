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
        {/* Prevent theme flash -- runs before React hydrates */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            var theme = localStorage.getItem('kbt-theme') || 'light';
            document.documentElement.setAttribute('data-theme', theme);
          })();
        `}} />
      </head>
      <body className="min-h-screen bg-bg-primary text-text-primary font-sans antialiased transition-colors">
        <ThemeProvider>
          <div className="mx-auto min-h-screen w-full max-w-[960px]">
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
